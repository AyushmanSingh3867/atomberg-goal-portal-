import prisma from './prisma';
import { computeProgressScore } from './scoreEngine';
import { GoalProgress } from '@prisma/client';

/**
 * Shared Goal Achievement Sync (Phase 2 Step 7)
 * 
 * When primary owner logs achievement for a shared goal,
 * all linked copies in other employees' sheets auto-update
 * with the same achievement value.
 */
export async function syncSharedGoalAchievement(
  primaryGoalId: string,
  achievementValue: string,
  windowId: string,
  status?: GoalProgress | string
): Promise<void> {
  try {
    // Find all goals that were copied from this primary goal
    const linkedGoals = await prisma.goal.findMany({
      where: { shared_from_goal_id: primaryGoalId }
    });

    if (linkedGoals.length === 0) return;

    // Update each linked goal's achievement
    for (const linked of linkedGoals) {
      const score = computeProgressScore(linked, achievementValue);

      await prisma.achievement.upsert({
        where: {
          goal_id_window_id: {
            goal_id: linked.id,
            window_id: windowId
          }
        },
        create: {
          goal_id: linked.id,
          window_id: windowId,
          actual_value: achievementValue,
          status: (status as GoalProgress) || 'ON_TRACK',
          progress_score: score
        },
        update: {
          actual_value: achievementValue,
          status: (status as GoalProgress) || undefined,
          progress_score: score
        }
      });
    }

    console.log(`Synced shared goal ${primaryGoalId} to ${linkedGoals.length} linked copies`);
  } catch (error) {
    console.error('Shared goal sync error:', error);
    // Don't throw — sync failure shouldn't block the primary achievement save
  }
}
