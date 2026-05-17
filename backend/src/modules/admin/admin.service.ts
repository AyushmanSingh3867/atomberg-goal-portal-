import prisma from '../../lib/prisma';
import { format } from "date-fns";
import { sendCycleOpenedEmail } from "../notifications/email.service";

// ── Audit Logger ──────────────────────────────────────────
export const logAudit = async (
  action: string,
  performedBy: string,
  targetId?: string,
  targetType?: string,
  meta?: object
) => {
  return prisma.auditLog.create({
    data: {
      action,
      performed_by: performedBy,
      target_id:    targetId,
      target_type:  targetType,
      meta:         meta ?? {},
    },
  });
};

// ── Cycle Management ──────────────────────────────────────
export const createCycle = async (
  name: string,
  startDate: string,
  endDate: string,
  adminId: string
) => {
  await prisma.goalCycle.updateMany({
    data: { is_active: false },
  });

  const cycle = await prisma.goalCycle.create({
    data: {
      name,
      start_date: new Date(startDate),
      end_date:   new Date(endDate),
      is_active:  true,
    },
  });

  await logAudit("CYCLE_CREATED", adminId, cycle.id, "GoalCycle", {
    name,
    start_date: startDate,
    end_date:   endDate,
    created_at: new Date().toISOString(),
  });

  // Notify all employees
  const employees = await prisma.user.findMany({
    where: { role: "EMPLOYEE" },
  });

  // Send in batches of 10 to avoid overwhelming SMTP
  const batchSize = 10;
  for (let i = 0; i < employees.length; i += batchSize) {
    const batch = employees.slice(i, i + batchSize);
    await Promise.all(
      batch.map((emp) =>
        sendCycleOpenedEmail({
          employeeEmail: emp.email,
          employeeName:  emp.name,
          cycleName:     name,
          cycleEnd:      new Date(endDate),
        })
      )
    );
  }

  return cycle;
};

// ── Goal Unlock ───────────────────────────────────────────
export const unlockGoal = async (
  goalId: string,
  adminId: string,
  reason: string
) => {
  const goal = await prisma.goal.findUnique({
    where:   { id: goalId },
    include: { goalSheet: true },
  });
  if (!goal) throw new Error("Goal not found");
  if (goal.goalSheet.status !== "APPROVED") {
    throw new Error("Goal sheet is not approved/locked");
  }

  // Capture before state
  const beforeState = {
    title:        goal.title,
    target_value: goal.target_value,
    weightage:    goal.weightage,
    sheet_status: goal.goalSheet.status,
  };

  await prisma.goalSheet.update({
    where: { id: goal.goal_sheet_id },
    data:  { status: "DRAFT", approved_at: null, approved_by: null },
  });

  await logAudit("GOAL_UNLOCKED", adminId, goalId, "Goal", {
    reason,
    before: beforeState,
    unlocked_at: new Date().toISOString(),
  });

  return { success: true, message: "Goal sheet reverted to Draft" };
};

// ── Completion Rates ──────────────────────────────────────
export const getCompletionRates = async () => {
  const cycle = await prisma.goalCycle.findFirst({
    where: { is_active: true },
  });
  if (!cycle) return { cycle: null, stats: {} };

  const [total, approved, submitted, draft, returned] = await Promise.all([
    prisma.goalSheet.count({ where: { cycle_id: cycle.id } }),
    prisma.goalSheet.count({ where: { cycle_id: cycle.id, status: "APPROVED" } }),
    prisma.goalSheet.count({ where: { cycle_id: cycle.id, status: "SUBMITTED" } }),
    prisma.goalSheet.count({ where: { cycle_id: cycle.id, status: "DRAFT" } }),
    prisma.goalSheet.count({ where: { cycle_id: cycle.id, status: "RETURNED" } }),
  ]);

  return {
    cycle,
    stats: {
      total,
      approved,  approved_pct:  total ? Math.round((approved  / total) * 100) : 0,
      submitted, submitted_pct: total ? Math.round((submitted / total) * 100) : 0,
      draft,
      returned,
    },
  };
};

// ── Audit Logs ────────────────────────────────────────────
export const getAuditLogs = async (
  page = 1,
  limit = 50,
  action?: string,
  userId?: string
) => {
  const skip = (page - 1) * limit;
  const where: any = {};
  if (action) where.action = action;
  if (userId) where.performed_by = userId;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      skip, take: limit, where,
      orderBy: { created_at: "desc" },
      include: { user: { select: { name: true, email: true, role: true } } },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { logs, total, page, pages: Math.ceil(total / limit) };
};

// ── Update Org Hierarchy ──────────────────────────────────
export const updateUserManager = async (
  userId: string,
  newManagerId: string,
  adminId: string
) => {
  const updated = await prisma.user.update({
    where: { id: userId },
    data:  { manager_id: newManagerId },
  });
  await logAudit("ORG_HIERARCHY_UPDATED", adminId, userId, "User", {
    new_manager_id: newManagerId,
  });
  return updated;
};
