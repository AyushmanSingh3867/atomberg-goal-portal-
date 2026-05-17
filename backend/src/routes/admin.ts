import express from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticate, AuthRequest, requireRole } from '../middleware/auth';

import { logAudit } from '../modules/admin/admin.service';
import { scanAndTriggerEscalations } from '../lib/escalation';

const router = express.Router();

// Enforce ADMIN role for all routes in this file
router.use(authenticate, requireRole('ADMIN'));

// Trigger Escalation Scan
router.post('/escalations/scan', async (req: AuthRequest, res) => {
  try {
    await scanAndTriggerEscalations();
    res.json({ message: 'Escalation scan completed successfully' });
  } catch (error) {
    console.error('Escalation scan error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get Escalations
router.get('/escalations', async (req: AuthRequest, res) => {
  try {
    const escalations = await prisma.escalation.findMany({
      include: {
        goalSheet: {
          include: {
            employee: { select: { name: true, department_id: true } }
          }
        }
      },
      orderBy: { escalated_at: 'desc' }
    });
    res.json(escalations);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch escalations' });
  }
});

// ─── POST /api/admin/cycles ─────────────────────────────
// Create a new goal cycle
const cycleSchema = z.object({
  name: z.string().min(2),
  start_date: z.string().datetime(),
  end_date: z.string().datetime(),
});

router.post('/cycles', async (req: AuthRequest, res) => {
  try {
    const adminId = req.user?.userId;
    if (!adminId) return res.status(401).json({ error: 'Unauthorized' });

    const data = cycleSchema.parse(req.body);

    const cycle = await prisma.goalCycle.create({
      data: {
        name: data.name,
        start_date: new Date(data.start_date),
        end_date: new Date(data.end_date),
        is_active: true // Auto-activate new cycle for now
      }
    });

    await logAudit("CYCLE_CREATED", adminId, cycle.id, "GoalCycle", {
      name: cycle.name,
      start_date: cycle.start_date
    });

    res.status(201).json({ message: 'Cycle created successfully', cycle });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.issues });
    }
    console.error('Admin create cycle error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── PUT /api/admin/goals/:id/unlock ────────────────────
// Unlock an approved goal for editing
router.put('/goals/:id/unlock', async (req: AuthRequest, res) => {
  try {
    const adminId = req.user?.userId;
    if (!adminId) return res.status(401).json({ error: 'Unauthorized' });

    const goalId = req.params.id as string;

    const goal = await prisma.goal.findUnique({
      where: { id: goalId },
      include: { goalSheet: true }
    });

    if (!goal) return res.status(404).json({ error: 'Goal not found' });

    const updatedGoal = await prisma.goal.update({
      where: { id: goalId },
      data: {
        is_readonly_title: false,
        is_readonly_target: false
      }
    });

    await logAudit("GOAL_UNLOCKED", adminId, goal.id, "Goal", {
      title: goal.title,
      employee_id: goal.goalSheet?.employee_id
    });

    res.json({ message: 'Goal unlocked successfully', goal: updatedGoal });
  } catch (error) {
    console.error('Admin unlock goal error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/admin/audit-logs ──────────────────────────
// View audit logs
router.get('/audit-logs', async (req: AuthRequest, res) => {
  try {
    const logs = await prisma.auditLog.findMany({
      include: {
        user: { select: { id: true, name: true, email: true } }
      },
      orderBy: { created_at: 'desc' },
      take: 100 // Limit for performance
    });

    res.json({ logs });
  } catch (error) {
    console.error('Admin audit logs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
