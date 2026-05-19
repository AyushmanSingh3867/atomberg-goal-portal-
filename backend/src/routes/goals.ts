import express from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth';
import { logAudit } from '../modules/admin/admin.service';
import { createNotification } from '../modules/notifications/notifications.service';
import { sendGoalSubmittedEmail } from '../modules/notifications/email.service';
import { sendGoalSubmittedTeamsCard } from '../modules/notifications/teams.service';

const router = express.Router();

const updateGoalSchema = z.object({
  title: z.string().min(3).optional(),
  target_value: z.string().optional(),
  weightage: z.number().min(0).max(100).optional(),
});

// ─── PUT /api/goals/:id ──────────────────────────────────
// Update an existing goal (subject to readonly locks)
router.put('/:id', authenticate, requireRole('EMPLOYEE'), async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.userId;
    const goalId = req.params.id as string;
    const data = updateGoalSchema.parse(req.body);

    const goal = await prisma.goal.findFirst({
      where: { 
        id: goalId,
        goalSheet: { employee_id: userId }
      },
      include: { goalSheet: true }
    });

    if (!goal) return res.status(404).json({ error: 'Goal not found' });

    // Check locks
    if (data.title && goal.is_readonly_title) {
      return res.status(403).json({ error: 'Goal title is locked and cannot be edited' });
    }
    if (data.target_value && goal.is_readonly_target) {
      return res.status(403).json({ error: 'Goal target is locked and cannot be edited' });
    }

    // Capture old values for audit logging
    const changes: any = {};
    if (data.title && data.title !== goal.title) {
      changes.title = { old: goal.title, new: data.title };
    }
    if (data.target_value && data.target_value !== goal.target_value) {
      changes.target_value = { old: goal.target_value, new: data.target_value };
    }
    if (data.weightage && data.weightage !== goal.weightage) {
      changes.weightage = { old: goal.weightage, new: data.weightage };
    }

    const updatedGoal = await prisma.goal.update({
      where: { id: goalId },
      data
    });

    // Log only if this was a post-unlock edit
    if (Object.keys(changes).length > 0) {
      await logAudit("GOAL_UPDATED", userId!, goalId, "Goal", {
        before: {
          title:        goal.title,
          target_value: goal.target_value,
          weightage:    goal.weightage,
        },
        after: {
          title:        updatedGoal.title,
          target_value: updatedGoal.target_value,
          weightage:    updatedGoal.weightage,
        },
        updated_at: new Date().toISOString(),
      });
    }

    res.json({ message: 'Goal updated successfully', goal: updatedGoal });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues });
    }
    console.error('Update goal error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const goalSchema = z.object({
  thrust_area_id: z.string().uuid(),
  title: z.string().min(3),
  description: z.string().optional(),
  uom_type: z.enum(['NUMERIC', 'PERCENTAGE', 'TIMELINE', 'ZERO_BASED']),
  target_value: z.string(),
  weightage: z.number().min(0).max(100),
});

const submitGoalSheetSchema = z.object({
  cycle_id: z.string().uuid(),
  goals: z.array(goalSchema).min(1, 'At least one goal is required'),
});

// Get active goal cycles
router.get('/cycles/active', authenticate, async (req, res) => {
  try {
    const cycles = await prisma.goalCycle.findMany({
      where: { is_active: true }
    });
    res.json({ cycles });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get thrust areas
router.get('/thrust-areas', authenticate, async (req, res) => {
  try {
    const areas = await prisma.thrustArea.findMany();
    res.json({ thrustAreas: areas });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Submit a new goal sheet
router.post('/submit', authenticate, requireRole('EMPLOYEE'), async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { cycle_id, goals } = submitGoalSheetSchema.parse(req.body);

    // Validate weightage totals to 100
    const totalWeightage = goals.reduce((sum, goal) => sum + goal.weightage, 0);
    if (totalWeightage !== 100) {
      return res.status(400).json({ error: 'Total weightage of goals must equal 100%' });
    }

    // Check if goal sheet already exists
    const existingSheet = await prisma.goalSheet.findUnique({
      where: {
        employee_id_cycle_id: {
          employee_id: userId,
          cycle_id
        }
      }
    });

    if (existingSheet) {
      return res.status(400).json({ error: 'Goal sheet already exists for this cycle' });
    }

    // Create the goal sheet and goals in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const sheet = await tx.goalSheet.create({
        data: {
          employee_id: userId,
          cycle_id,
          status: 'SUBMITTED',
          submitted_at: new Date(),
        }
      });

      const createdGoals = await Promise.all(
        goals.map(goal => tx.goal.create({
          data: {
            goal_sheet_id: sheet.id,
            thrust_area_id: goal.thrust_area_id,
            title: goal.title,
            description: goal.description,
            uom_type: goal.uom_type,
            target_value: goal.target_value,
            weightage: goal.weightage,
          }
        }))
      );

      return { sheet, goals: createdGoals };
    });

    const user = await prisma.user.findUnique({ 
      where: { id: userId },
      include: { manager: true, goalSheets: { include: { goals: true } } }
    });
    
    if (user?.manager) {
      // In-app notification
      await createNotification(
        user.manager.id,
        "New Goals Submitted",
        `${user.name} has submitted their goals for review.`,
        "INFO",
        `/dashboard`
      );

      const cycleObj = await prisma.goalCycle.findUnique({
        where: { id: cycle_id }
      });
      const cycleNameVal = cycleObj?.name || "Goal Cycle";

      // Email notification (non-blocking)
      sendGoalSubmittedEmail({
        managerEmail: user.manager.email,
        managerName:  user.manager.name,
        employeeName: user.name,
        cycleName:    cycleNameVal,
        goalCount:    result.goals.length,
        sheetId:      result.sheet.id,
      }).catch(err => console.error("Email notification failed:", err));

      // Teams notification (non-blocking)
      sendGoalSubmittedTeamsCard({
        managerName:  user.manager.name,
        employeeName: user.name,
        cycleName:    cycleNameVal,
        goalCount:    result.goals.length,
        totalWeight:  100,
        sheetId:      result.sheet.id,
      }).catch(err => console.error("Teams notification failed:", err));
    }

    res.status(201).json({ message: 'Goal sheet submitted successfully', data: result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues });
    }
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
