import prisma from "./prisma";
import { createNotification } from "../modules/notifications/notifications.service";

export const scanAndTriggerEscalations = async () => {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // 1. Find employees who haven't submitted goals 7 days after cycle start
  const activeCycle = await prisma.goalCycle.findFirst({ where: { is_active: true } });
  if (activeCycle && activeCycle.start_date < weekAgo) {
     const unsubmittedSheets = await prisma.user.findMany({
       where: {
         role: 'EMPLOYEE',
         goalSheets: {
           none: { cycle_id: activeCycle.id }
         }
       }
     });

     for (const user of unsubmittedSheets) {
       // Check if already escalated
       // For demo, we just notify
       if (user.manager_id) {
         await createNotification(
           user.manager_id,
           "Submission Escalation (L1)",
           `${user.name} has not submitted goals 7 days after cycle start.`,
           "WARNING"
         );
       }
     }
  }

  // 2. Find goal sheets pending approval for > 7 days
  const pendingSheets = await prisma.goalSheet.findMany({
    where: {
      status: 'SUBMITTED',
      submitted_at: { lt: weekAgo }
    },
    include: {
      employee: {
        include: {
          manager: true
        }
      }
    }
  });

  for (const sheet of pendingSheets) {
    // Escalate to Manager's Manager (Skip Level)
    const skipManagerId = sheet.employee.manager?.manager_id;
    if (skipManagerId) {
      await createNotification(
        skipManagerId,
        "Approval Escalation (L2)",
        `Manager ${sheet.employee.manager?.name} has not approved ${sheet.employee.name}'s goals for 7 days.`,
        "DANGER"
      );
      
      // Create Escalation Record
      await prisma.escalation.create({
        data: {
          goal_sheet_id: sheet.id,
          level: 2,
          reason: "Approval delayed by > 7 days",
          status: "OPEN"
        }
      });
    }
  }
};
