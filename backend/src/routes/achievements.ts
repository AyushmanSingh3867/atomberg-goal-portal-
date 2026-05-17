import express from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth';
import { computeProgressScore, computeOverallScore } from '../lib/scoreEngine';
import { syncSharedGoalAchievement } from '../lib/sharedGoalSync';

const router = express.Router();

// ─── GET /api/windows/active ────────────────────────────
// Get the currently open check-in window
router.get('/active', authenticate, async (req, res) => {
  try {
    const now = new Date();
    const activeWindow = await prisma.checkInWindow.findFirst({
      where: {
        is_active: true,
        opens_at: { lte: now },
        closes_at: { gte: now }
      },
      include: {
        cycle: { select: { id: true, name: true } }
      }
    });

    // Also return upcoming windows for display
    const allWindows = await prisma.checkInWindow.findMany({
      where: {
        cycle: { is_active: true }
      },
      include: {
        cycle: { select: { id: true, name: true } }
      },
      orderBy: { opens_at: 'asc' }
    });

    res.json({
      activeWindow,
      allWindows
    });
  } catch (error) {
    console.error('Active window error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/achievements/my/:windowId ─────────────────
// Get employee's achievements for a specific check-in window
router.get('/my/:windowId', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const windowId = req.params.windowId as string;

    // Get the employee's approved goal sheet
    const goalSheet = await prisma.goalSheet.findFirst({
      where: {
        employee_id: userId,
        status: 'APPROVED',
        cycle: { is_active: true }
      },
      include: {
        goals: {
          include: {
            thrustArea: { select: { id: true, name: true } },
            achievements: {
              where: { window_id: windowId }
            }
          }
        },
        checkInComments: {
          where: { window_id: windowId }
        },
        cycle: true
      }
    });

    if (!goalSheet) {
      return res.status(404).json({ error: 'No approved goal sheet found for the active cycle' });
    }

    // Compute overall score for this window
    const windowAchievements = goalSheet.goals.map((goal: any) => ({
      progress_score: goal.achievements[0]?.progress_score ?? null,
      weightage: goal.weightage
    }));

    const overallScore = computeOverallScore(windowAchievements);

    res.json({
      goalSheet,
      overallScore
    });
  } catch (error) {
    console.error('My achievements error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/achievements ─────────────────────────────
// Log a new achievement for a goal in the active window
const achievementSchema = z.object({
  goal_id: z.string().uuid(),
  window_id: z.string().uuid(),
  actual_value: z.string().min(1, 'Achievement value is required'),
  status: z.enum(['NOT_STARTED', 'ON_TRACK', 'COMPLETED']),
  employee_notes: z.string().optional()
});

router.post('/', authenticate, requireRole('EMPLOYEE'), async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const data = achievementSchema.parse(req.body);

    // Verify window is open (enforcement)
    const now = new Date();
    const window = await prisma.checkInWindow.findUnique({
      where: { id: data.window_id }
    });

    if (!window) return res.status(404).json({ error: 'Check-in window not found' });

    // Allow if window is active OR admin
    if (req.user?.role !== 'ADMIN') {
      if (!window.is_active || now < window.opens_at || now > window.closes_at) {
        return res.status(403).json({
          error: 'Check-in window is not currently open',
          opens_at: window.opens_at,
          closes_at: window.closes_at
        });
      }
    }

    // Verify the goal belongs to this employee
    const goal = await prisma.goal.findFirst({
      where: { 
        id: data.goal_id,
        goalSheet: { employee_id: userId }
      },
      include: {
        goalSheet: { select: { employee_id: true, status: true } }
      }
    });

    if (!goal) return res.status(404).json({ error: 'Goal not found or unauthorized' });
    if (goal.goalSheet.status !== 'APPROVED') {
      return res.status(400).json({ error: 'Goal sheet must be approved before logging achievements' });
    }

    // Compute progress score
    const progressScore = computeProgressScore(goal, data.actual_value);

    // Upsert achievement (create or update)
    const achievement = await prisma.achievement.upsert({
      where: {
        goal_id_window_id: {
          goal_id: data.goal_id,
          window_id: data.window_id
        }
      },
      create: {
        goal_id: data.goal_id,
        window_id: data.window_id,
        actual_value: data.actual_value,
        status: data.status,
        progress_score: progressScore,
        employee_notes: data.employee_notes
      },
      update: {
        actual_value: data.actual_value,
        status: data.status,
        progress_score: progressScore,
        employee_notes: data.employee_notes
      }
    });

    // Shared goal sync: if this is a shared goal, propagate to linked copies
    if (goal.is_shared && !goal.shared_from_goal_id) {
      // This is the primary shared goal — sync to all copies
      await syncSharedGoalAchievement(goal.id, data.actual_value, data.window_id, data.status);
    }

    res.json({
      message: 'Achievement logged successfully',
      achievement,
      progress_score: progressScore
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues });
    }
    console.error('Post achievement error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── PUT /api/achievements/:id ──────────────────────────
// Update an existing achievement
const updateAchievementSchema = z.object({
  actual_value: z.string().min(1).optional(),
  status: z.enum(['NOT_STARTED', 'ON_TRACK', 'COMPLETED']).optional(),
  employee_notes: z.string().optional()
});

router.put('/:id', authenticate, requireRole('EMPLOYEE'), async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const data = updateAchievementSchema.parse(req.body);
    const achievementId = req.params.id as string;

    const existing = await prisma.achievement.findFirst({
      where: { 
        id: achievementId,
        ...(req.user?.role !== 'ADMIN' && { goal: { goalSheet: { employee_id: userId } } })
      },
      include: {
        goal: {
          include: {
            goalSheet: { select: { employee_id: true } }
          }
        },
        window: true
      }
    });

    if (!existing) return res.status(404).json({ error: 'Achievement not found or unauthorized' });

    // Check window is still open
    const now = new Date();
    if (req.user?.role !== 'ADMIN') {
      if (!existing.window.is_active || now < existing.window.opens_at || now > existing.window.closes_at) {
        return res.status(403).json({ error: 'Check-in window is no longer open' });
      }
    }

    // Recompute score if actual_value changed
    const newActualValue = data.actual_value ?? existing.actual_value;
    const progressScore = computeProgressScore(existing.goal, newActualValue);

    const updated = await prisma.achievement.update({
      where: { id: achievementId },
      data: {
        actual_value: data.actual_value,
        status: data.status,
        progress_score: progressScore,
        employee_notes: data.employee_notes
      }
    });

    // Shared goal sync
    if (existing.goal.is_shared && !existing.goal.shared_from_goal_id && data.actual_value) {
      await syncSharedGoalAchievement(existing.goal.id, newActualValue, existing.window_id, data.status);
    }

    res.json({
      message: 'Achievement updated successfully',
      achievement: updated,
      progress_score: progressScore
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues });
    }
    console.error('Update achievement error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
