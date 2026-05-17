import prisma                from "../../lib/prisma";
import { sendEscalationEmail,
         sendCheckinReminderEmail } from "../notifications/email.service";
import { logAudit }              from "../admin/admin.service";
import { differenceInDays }      from "date-fns";

// ─────────────────────────────────────────────────────────
// RULE CRUD
// ─────────────────────────────────────────────────────────

export const getRules = async () => {
  return prisma.escalationRule.findMany({
    orderBy:  { created_at: "desc" },
    include:  { _count: { select: { logs: true } } },
  });
};

export const createRule = async (data: {
  name:           string;
  trigger_type:   string;
  days_threshold: number;
  notify_level:   string;
  adminId:        string;
}) => {
  const rule = await prisma.escalationRule.create({
    data: {
      name:           data.name,
      trigger_type:   data.trigger_type,
      days_threshold: data.days_threshold,
      notify_level:   data.notify_level,
      created_by:     data.adminId,
    },
  });

  await logAudit("ESCALATION_RULE_CREATED", data.adminId, rule.id, "EscalationRule", {
    name:           data.name,
    trigger_type:   data.trigger_type,
    days_threshold: data.days_threshold,
  });

  return rule;
};

export const updateRule = async (
  ruleId:  string,
  updates: Partial<{ name: string; days_threshold: number; notify_level: string; is_active: boolean }>,
  adminId: string
) => {
  const rule = await prisma.escalationRule.update({
    where: { id: ruleId },
    data:  { ...updates, updated_at: new Date() },
  });
  await logAudit("ESCALATION_RULE_UPDATED", adminId, ruleId, "EscalationRule", updates);
  return rule;
};

export const deleteRule = async (ruleId: string, adminId: string) => {
  await prisma.escalationRule.delete({ where: { id: ruleId } });
  await logAudit("ESCALATION_RULE_DELETED", adminId, ruleId, "EscalationRule", {});
  return { success: true };
};

// ─────────────────────────────────────────────────────────
// ESCALATION LOGS
// ─────────────────────────────────────────────────────────

export const getLogs = async (filters: {
  resolved?:   boolean;
  employeeId?: string;
  page?:       number;
  limit?:      number;
}) => {
  const page  = filters.page  ?? 1;
  const limit = filters.limit ?? 20;
  const skip  = (page - 1) * limit;

  const where: any = {};
  if (filters.resolved   !== undefined) where.resolved    = filters.resolved;
  if (filters.employeeId)               where.employee_id = filters.employeeId;

  const [logs, total] = await Promise.all([
    prisma.escalationLog.findMany({
      where,
      skip, take: limit,
      orderBy: { created_at: "desc" },
      include: {
        employee: { select: { name: true, email: true } },
        rule:     { select: { name: true, trigger_type: true } },
      },
    }),
    prisma.escalationLog.count({ where }),
  ]);

  return { logs, total, page, pages: Math.ceil(total / limit) };
};

export const resolveLog = async (
  logId:   string,
  adminId: string,
  notes?:  string
) => {
  return prisma.escalationLog.update({
    where: { id: logId },
    data: {
      resolved:    true,
      resolved_at: new Date(),
      resolved_by: adminId,
      notes:       notes ?? "Resolved by admin",
    },
  });
};

// ─────────────────────────────────────────────────────────
// CORE ESCALATION CHECKER — called by cron daily
// ─────────────────────────────────────────────────────────

export const runEscalationChecker = async () => {
  console.log("🔄 Running escalation checker —", new Date().toISOString());

  const activeRules = await prisma.escalationRule.findMany({
    where: { is_active: true },
  });

  const cycle = await prisma.goalCycle.findFirst({
    where: { is_active: true },
  });
  if (!cycle) {
    console.log("⚠️  No active cycle — skipping escalation check");
    return;
  }

  const now = new Date();

  for (const rule of activeRules) {
    try {
      switch (rule.trigger_type) {

        // ── 1. Goal not submitted ─────────────────────────
        case "goal_not_submitted": {
          const draftSheets = await prisma.goalSheet.findMany({
            where: {
              cycle_id: cycle.id,
              status:   "DRAFT",
            },
            include: {
              employee: {
                include: { manager: true },
              },
            },
          });

          for (const sheet of draftSheets) {
            const daysSinceCycleOpen = differenceInDays(
              now,
              new Date(cycle.start_date)
            );

            if (daysSinceCycleOpen < rule.days_threshold) continue;

            // Check if already escalated at this level today
            const alreadyLogged = await prisma.escalationLog.findFirst({
              where: {
                rule_id:      rule.id,
                employee_id:  sheet.employee_id,
                trigger_type: rule.trigger_type,
                resolved:     false,
                created_at: {
                  gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
                },
              },
            });
            if (alreadyLogged) continue;

            const notifyUser = rule.notify_level === "employee"
              ? sheet.employee
              : sheet.employee.manager;

            if (!notifyUser) continue;

            // Send email
            await sendEscalationEmail({
              to:           notifyUser.email,
              toName:       notifyUser.name,
              employeeName: sheet.employee.name,
              trigger:      "Goal sheet not submitted",
              daysPassed:   daysSinceCycleOpen,
              level:        rule.notify_level as "manager" | "hr",
            });

            // Log it
            await prisma.escalationLog.create({
              data: {
                rule_id:      rule.id,
                employee_id:  sheet.employee_id,
                notified_to:  notifyUser.id,
                trigger_type: rule.trigger_type,
                days_passed:  daysSinceCycleOpen,
              },
            });

            console.log(
              `📧 Escalation sent: ${sheet.employee.name} — goal not submitted (${daysSinceCycleOpen}d)`
            );
          }
          break;
        }

        // ── 2. Goal not approved ──────────────────────────
        case "goal_not_approved": {
          const submittedSheets = await prisma.goalSheet.findMany({
            where: {
              cycle_id:     cycle.id,
              status:       "SUBMITTED",
              submitted_at: { not: null },
            },
            include: {
              employee: {
                include: { manager: true },
              },
            },
          });

          for (const sheet of submittedSheets) {
            if (!sheet.submitted_at) continue;

            const daysSinceSubmit = differenceInDays(
              now,
              new Date(sheet.submitted_at)
            );

            if (daysSinceSubmit < rule.days_threshold) continue;

            const alreadyLogged = await prisma.escalationLog.findFirst({
              where: {
                rule_id:      rule.id,
                employee_id:  sheet.employee_id,
                trigger_type: rule.trigger_type,
                resolved:     false,
                created_at: {
                  gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
                },
              },
            });
            if (alreadyLogged) continue;

            const notifyUser = sheet.employee.manager;
            if (!notifyUser) continue;

            await sendEscalationEmail({
              to:           notifyUser.email,
              toName:       notifyUser.name,
              employeeName: sheet.employee.name,
              trigger:      "Goal sheet not approved",
              daysPassed:   daysSinceSubmit,
              level:        "manager",
            });

            await prisma.escalationLog.create({
              data: {
                rule_id:      rule.id,
                employee_id:  sheet.employee_id,
                notified_to:  notifyUser.id,
                trigger_type: rule.trigger_type,
                days_passed:  daysSinceSubmit,
              },
            });

            console.log(
              `📧 Escalation sent: ${sheet.employee.name} — not approved (${daysSinceSubmit}d)`
            );
          }
          break;
        }

        // ── 3. Check-in missed ────────────────────────────
        case "checkin_missed": {
          // Find active check-in window
          const activeWindow = await prisma.checkInWindow.findFirst({
            where: {
              opens_at:  { lte: now },
              closes_at: { gte: now },
            },
          });
          if (!activeWindow) break;

          const daysLeft = differenceInDays(
            new Date(activeWindow.closes_at),
            now
          );

          // Only escalate if within threshold days of closing
          if (daysLeft > rule.days_threshold) break;

          // Find employees who haven't logged any achievement
          const approvedSheets = await prisma.goalSheet.findMany({
            where: {
              cycle_id: cycle.id,
              status:   "APPROVED",
            },
            include: {
              employee: {
                include: { manager: true },
              },
              goals: {
                include: {
                  achievements: {
                    where: { window_id: activeWindow.id },
                  },
                },
              },
            },
          });

          for (const sheet of approvedSheets) {
            const hasCheckedIn = sheet.goals.some(
              (g: any) => g.achievements.length > 0
            );
            if (hasCheckedIn) continue;

            const alreadyLogged = await prisma.escalationLog.findFirst({
              where: {
                rule_id:      rule.id,
                employee_id:  sheet.employee_id,
                trigger_type: rule.trigger_type,
                resolved:     false,
                created_at: {
                  gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
                },
              },
            });
            if (alreadyLogged) continue;

            // Send reminder to employee
            await sendCheckinReminderEmail({
              employeeEmail: sheet.employee.email,
              employeeName:  sheet.employee.name,
              quarter:       activeWindow.period,
              windowCloses:  new Date(activeWindow.closes_at),
              daysLeft,
            });

            // If notify_level is manager → also notify manager
            if (rule.notify_level === "manager" && sheet.employee.manager) {
              await sendEscalationEmail({
                to:           sheet.employee.manager.email,
                toName:       sheet.employee.manager.name,
                employeeName: sheet.employee.name,
                trigger:      `${activeWindow.period} check-in not completed`,
                daysPassed:   rule.days_threshold - daysLeft,
                level:        "manager",
              });
            }

            await prisma.escalationLog.create({
              data: {
                rule_id:      rule.id,
                employee_id:  sheet.employee_id,
                notified_to:  sheet.employee_id,
                trigger_type: rule.trigger_type,
                days_passed:  rule.days_threshold - daysLeft,
              },
            });

            console.log(
              `📧 Check-in reminder: ${sheet.employee.name} — ${daysLeft}d left`
            );
          }
          break;
        }
      }
    } catch (err) {
      console.error(`❌ Error processing rule ${rule.name}:`, err);
    }
  }

  console.log("✅ Escalation checker complete");
};
