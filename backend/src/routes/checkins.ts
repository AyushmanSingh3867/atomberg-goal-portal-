import express from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth';
import { computeOverallScore } from '../lib/scoreEngine';

const router = express.Router();

// ─── GET /api/checkins/team/:windowId ───────────────────
// Get all team members' achievements for a specific window
router.get('/team/:windowId', authenticate, requireRole('MANAGER', 'ADMIN'), async (req: AuthRequest, res) => {
  try {
    const managerId = req.user?.userId;
    if (!managerId) return res.status(401).json({ error: 'Unauthorized' });

    const windowId = req.params.windowId as string;

    const window = await prisma.checkInWindow.findUnique({
      where: { id: windowId },
      include: { cycle: true }
    });

    if (!window) return res.status(404).json({ error: 'Check-in window not found' });

    // Get all direct reports with their goals and achievements for this window
    const team = await prisma.user.findMany({
      where: { manager_id: managerId },
      select: {
        id: true,
        name: true,
        email: true,
        goalSheets: {
          where: {
            cycle_id: window.cycle_id,
            status: 'APPROVED'
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
            }
          }
        }
      }
    });

    // Compute overall scores for each team member
    const teamWithScores = team.map((member: any) => {
      const sheet = member.goalSheets[0]; // one sheet per cycle
      if (!sheet) return { ...member, overallScore: 0, hasSheet: false };

      const goalScores = sheet.goals.map((g: any) => ({
        progress_score: g.achievements[0]?.progress_score ?? null,
        weightage: g.weightage
      }));

      return {
        ...member,
        overallScore: computeOverallScore(goalScores),
        hasSheet: true
      };
    });

    res.json({ team: teamWithScores, window });
  } catch (error) {
    console.error('Team checkins error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/checkins/comment ─────────────────────────
// Add or update a structured check-in comment (per goalSheet per window)
const commentSchema = z.object({
  goal_sheet_id: z.string().uuid(),
  window_id: z.string().uuid(),
  comment: z.string().min(1, 'Comment cannot be empty')
});

router.post('/comment', authenticate, requireRole('MANAGER', 'ADMIN'), async (req: AuthRequest, res) => {
  try {
    const managerId = req.user?.userId;
    if (!managerId) return res.status(401).json({ error: 'Unauthorized' });

    const data = commentSchema.parse(req.body);

    // Verify the goal sheet exists and belongs to a direct report
    const sheet = await prisma.goalSheet.findFirst({
      where: { 
        id: data.goal_sheet_id,
        ...(req.user?.role !== 'ADMIN' && { employee: { manager_id: managerId } })
      },
      include: { employee: true }
    });

    if (!sheet) return res.status(404).json({ error: 'Goal sheet not found or unauthorized' });

    // Upsert the comment (one per sheet per window)
    const comment = await prisma.checkInComment.upsert({
      where: {
        goal_sheet_id_window_id: {
          goal_sheet_id: data.goal_sheet_id,
          window_id: data.window_id
        }
      },
      create: {
        goal_sheet_id: data.goal_sheet_id,
        window_id: data.window_id,
        manager_id: managerId,
        comment: data.comment
      },
      update: {
        comment: data.comment,
        manager_id: managerId
      }
    });

    res.json({ message: 'Check-in comment saved', comment });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues });
    }
    console.error('Comment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/checkins/comment/:sheetId/:windowId ───────
// Get a specific check-in comment
router.get('/comment/:sheetId/:windowId', authenticate, async (req: AuthRequest, res) => {
  try {
    const sheetId = req.params.sheetId as string;
    const windowId = req.params.windowId as string;

    const comment = await prisma.checkInComment.findUnique({
      where: {
        goal_sheet_id_window_id: {
          goal_sheet_id: sheetId,
          window_id: windowId
        }
      },
      include: {
        manager: { select: { id: true, name: true } }
      }
    });

    res.json({ comment: comment || null });
  } catch (error) {
    console.error('Get comment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
