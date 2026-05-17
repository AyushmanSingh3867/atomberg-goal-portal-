import express from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth';
import { logAudit } from '../modules/admin/admin.service';
import { createNotification } from '../modules/notifications/notifications.service';
import { sendGoalApprovedEmail, sendGoalReturnedEmail } from '../modules/notifications/email.service';
import { sendGoalApprovedTeamsCard, sendSharedGoalPushedTeamsCard } from '../modules/notifications/teams.service';

const router = express.Router();

// ─── GET /api/manager/pending-sheets ────────────────────
// Get all SUBMITTED goal sheets from direct reports
router.get('/pending-sheets', authenticate, requireRole('MANAGER', 'ADMIN'), async (req: AuthRequest, res) => {
  try {
    const managerId = req.user?.userId;
    if (!managerId) return res.status(401).json({ error: 'Unauthorized' });

    const pendingSheets = await prisma.goalSheet.findMany({
      where: {
        status: 'SUBMITTED',
        employee: { manager_id: managerId }
      },
      include: {
        employee: { select: { id: true, name: true, email: true, role: true } },
        cycle: { select: { id: true, name: true } },
        goals: {
          include: {
            thrustArea: { select: { id: true, name: true } }
          }
        }
      },
      orderBy: { submitted_at: 'desc' }
    });

    res.json({ sheets: pendingSheets });
  } catch (error) {
    console.error('Manager pending-sheets error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/manager/sheet/:id ─────────────────────────
// Get a single goal sheet with all goals (for detailed review)
router.get('/sheet/:id', authenticate, requireRole('MANAGER', 'ADMIN'), async (req: AuthRequest, res) => {
  try {
    const managerId = req.user?.userId;
    if (!managerId) return res.status(401).json({ error: 'Unauthorized' });
    const sheetId = req.params.id as string;
    const sheet = await prisma.goalSheet.findFirst({
      where: { 
        id: sheetId,
        ...(req.user?.role !== 'ADMIN' && { employee: { manager_id: managerId } })
      },
      include: {
        employee: { select: { id: true, name: true, email: true, role: true } },
        cycle: true,
        goals: {
          include: {
            thrustArea: { select: { id: true, name: true } },
            achievements: true
          }
        },
        checkInComments: {
          include: { window: true }
        }
      }
    });

    if (!sheet) return res.status(404).json({ error: 'Goal sheet not found' });

    res.json({ sheet });
  } catch (error) {
    console.error('Manager sheet error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/manager/approve/:sheetId ─────────────────
// Approve a submitted goal sheet → lock goals
router.post('/approve/:sheetId', authenticate, requireRole('MANAGER', 'ADMIN'), async (req: AuthRequest, res) => {
  try {
    const managerId = req.user?.userId;
    if (!managerId) return res.status(401).json({ error: 'Unauthorized' });

    const sheetId = req.params.sheetId as string;

    const sheet = await prisma.goalSheet.findFirst({
      where: { 
        id: sheetId,
        ...(req.user?.role !== 'ADMIN' && { employee: { manager_id: managerId } })
      },
      include: { employee: true, goals: true }
    });

    if (!sheet) return res.status(404).json({ error: 'Goal sheet not found' });
    if (sheet.status !== 'SUBMITTED') {
      return res.status(400).json({ error: `Cannot approve a sheet with status: ${sheet.status}` });
    }



    // Approve + lock goals in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const updatedSheet = await tx.goalSheet.update({
        where: { id: sheetId },
        data: {
          status: 'APPROVED',
          approved_at: new Date(),
          approved_by: managerId,
          rework_comment: null   // clear any previous rework comment
        }
      });

      // Lock all goals in this sheet (Goal Lock Logic)
      await tx.goal.updateMany({
        where: { goal_sheet_id: sheetId },
        data: {
          is_readonly_title: true,
          is_readonly_target: true
        }
      });

      return updatedSheet;
    });

    await logAudit("SHEET_APPROVED", managerId, sheetId, "GoalSheet", {
      employee_id:  sheet.employee_id,
      approved_at:  new Date().toISOString(),
      goals_count:  sheet.goals?.length ?? 0,
    });

    await createNotification(
      sheet.employee_id,
      "Goals Approved",
      "Your manager has approved your goals for this cycle.",
      "SUCCESS",
      "/"
    );

    const sheetWithCycle = await prisma.goalSheet.findUnique({
      where: { id: sheetId },
      include: { cycle: true }
    });

    if (sheetWithCycle) {
      await sendGoalApprovedEmail({
        employeeEmail: sheet.employee.email,
        employeeName:  sheet.employee.name,
        managerName:   "Your Manager",
        cycleName:     sheetWithCycle.cycle.name,
        sheetId,
      });

      await sendGoalApprovedTeamsCard({
        employeeName: sheet.employee.name,
        managerName:  "Manager",
        cycleName:    sheetWithCycle.cycle.name,
      });
    }

    res.json({ message: 'Goal sheet approved successfully', sheet: result });
  } catch (error) {
    console.error('Manager approve error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/manager/return/:sheetId ──────────────────
// Return a goal sheet for rework with a comment
const returnSchema = z.object({
  comment: z.string().min(5, 'Rework comment must be at least 5 characters')
});

router.post('/return/:sheetId', authenticate, requireRole('MANAGER', 'ADMIN'), async (req: AuthRequest, res) => {
  try {
    const managerId = req.user?.userId;
    if (!managerId) return res.status(401).json({ error: 'Unauthorized' });

    const { comment } = returnSchema.parse(req.body);
    const sheetId = req.params.sheetId as string;

    const sheet = await prisma.goalSheet.findFirst({
      where: { 
        id: sheetId,
        ...(req.user?.role !== 'ADMIN' && { employee: { manager_id: managerId } })
      },
      include: { employee: true }
    });

    if (!sheet) return res.status(404).json({ error: 'Goal sheet not found' });
    if (sheet.status !== 'SUBMITTED') {
      return res.status(400).json({ error: `Cannot return a sheet with status: ${sheet.status}` });
    }

    const result = await prisma.goalSheet.update({
      where: { id: sheetId },
      data: {
        status: 'RETURNED',
        rework_comment: comment
      }
    });

    await logAudit("SHEET_RETURNED", managerId, sheetId, "GoalSheet", {
      employee_id: sheet.employee_id,
      reason:      comment,
      returned_at: new Date().toISOString(),
    });

    await createNotification(
      sheet.employee_id,
      "Goals Returned",
      "Your goals have been returned for rework. Please check the comments.",
      "WARNING",
      "/"
    );

    const sheetWithCycle = await prisma.goalSheet.findUnique({
      where: { id: sheetId },
      include: { cycle: true }
    });

    if (sheetWithCycle) {
      await sendGoalReturnedEmail({
        employeeEmail:  sheet.employee.email,
        employeeName:   sheet.employee.name,
        managerName:    "Your Manager",
        cycleName:      sheetWithCycle.cycle.name,
        reworkComment:  comment,
        sheetId,
      });
    }

    res.json({ message: 'Goal sheet returned for rework', sheet: result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues });
    }
    console.error('Manager return error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/manager/shared-goals ─────────────────────
// Create a shared goal and assign to team members
const sharedGoalSchema = z.object({
  thrust_area_id: z.string().uuid(),
  title: z.string().min(3),
  description: z.string().optional(),
  uom_type: z.enum(['NUMERIC', 'PERCENTAGE', 'TIMELINE', 'ZERO_BASED']),
  uom_direction: z.enum(['MIN', 'MAX']).default('MIN'),
  target_value: z.string(),
  weightage: z.number().min(0).max(100),
  employee_ids: z.array(z.string().uuid()).min(1, 'Select at least one team member'),
  is_readonly_target: z.boolean().default(false)
});

router.post('/shared-goals', authenticate, requireRole('MANAGER', 'ADMIN'), async (req: AuthRequest, res) => {
  try {
    const managerId = req.user?.userId;
    if (!managerId) return res.status(401).json({ error: 'Unauthorized' });

    const data = sharedGoalSchema.parse(req.body);

    // Get active cycle
    const activeCycle = await prisma.goalCycle.findFirst({ where: { is_active: true } });
    if (!activeCycle) return res.status(400).json({ error: 'No active goal cycle found' });

    // Create shared goals for each selected employee
    const results = await prisma.$transaction(async (tx) => {
      const createdGoals: any[] = [];

      for (const employeeId of data.employee_ids) {
        // Find or create the employee's goal sheet for this cycle
        let sheet = await tx.goalSheet.findUnique({
          where: { employee_id_cycle_id: { employee_id: employeeId, cycle_id: activeCycle.id } }
        });

        if (!sheet) {
          sheet = await tx.goalSheet.create({
            data: {
              employee_id: employeeId,
              cycle_id: activeCycle.id,
              status: 'DRAFT'
            }
          });
        }

        // Create the shared goal in the employee's sheet
        const goal = await tx.goal.create({
          data: {
            goal_sheet_id: sheet.id,
            thrust_area_id: data.thrust_area_id,
            title: data.title,
            description: data.description,
            uom_type: data.uom_type,
            uom_direction: data.uom_direction,
            target_value: data.target_value,
            weightage: data.weightage,
            is_shared: true,
            is_readonly_title: true,  // shared goals can't have title changed
            is_readonly_target: data.is_readonly_target,
            // First created goal becomes the "primary"; subsequent ones reference it
            shared_from_goal_id: createdGoals.length > 0 ? createdGoals[0].id : undefined
          }
        });

        createdGoals.push(goal);
      }

      // Update the first goal's copies to all reference the primary
      if (createdGoals.length > 1) {
        const primaryId = createdGoals[0].id;
        for (let i = 1; i < createdGoals.length; i++) {
          await tx.goal.update({
            where: { id: createdGoals[i].id },
            data: { shared_from_goal_id: primaryId }
          });
        }
      }

      return createdGoals;
    });

    await logAudit("SHARED_GOAL_PUSHED", managerId, results[0].id, "Goal", {
      pushed_to:    data.employee_ids,
      goal_title:   data.title,
      pushed_at:    new Date().toISOString(),
    });

    await Promise.all(
      data.employee_ids.map(empId => createNotification(
        empId,
        "New Shared Goal",
        `Your manager has assigned a new shared goal: ${data.title}`,
        "INFO",
        "/"
      ))
    );

    res.status(201).json({
      message: `Shared goal assigned to ${data.employee_ids.length} team member(s)`,
      goals: results
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues });
    }
    console.error('Shared goals error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/manager/team-goals ────────────────────────
// Get all team members and their goal sheets (for dashboard)
router.get('/team-goals', authenticate, requireRole('MANAGER', 'ADMIN'), async (req: AuthRequest, res) => {
  try {
    const managerId = req.user?.userId;
    if (!managerId) return res.status(401).json({ error: 'Unauthorized' });

    const team = await prisma.user.findMany({
      where: { manager_id: managerId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        goalSheets: {
          include: {
            cycle: true,
            goals: {
              include: {
                thrustArea: true,
                achievements: true
              }
            },
            checkInComments: true
          }
        }
      }
    });

    res.json({ team });
  } catch (error) {
    console.error('Team goals error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
