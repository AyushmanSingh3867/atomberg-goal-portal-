import { UomType, UomDirection } from '@prisma/client';

interface GoalForScoring {
  uom_type: UomType;
  uom_direction: UomDirection;
  target_value: string;
}

/**
 * Computes a progress score (0–100) based on UoM type and direction.
 *
 * Min type (higher is better):  score = (achievement / target) × 100
 * Max type (lower is better):   score = (target / achievement) × 100
 * Timeline:                     on/before deadline → 100%, late → proportional penalty
 * Zero-based:                   achievement === 0 → 100%, else 0%
 */
export function computeProgressScore(
  goal: GoalForScoring,
  achievementValue: string
): number {
  const target = parseFloat(goal.target_value);
  const actual = parseFloat(achievementValue);

  switch (goal.uom_type) {
    case 'NUMERIC':
    case 'PERCENTAGE': {
      if (isNaN(target) || target === 0) return 0;
      if (isNaN(actual)) return 0;

      if (goal.uom_direction === 'MIN') {
        // Higher achievement = higher score (e.g. Sales Revenue)
        return Math.min(Math.round((actual / target) * 100 * 100) / 100, 100);
      } else {
        // Lower achievement = higher score (e.g. TAT, Cost)
        if (actual === 0) return 100;
        return Math.min(Math.round((target / actual) * 100 * 100) / 100, 100);
      }
    }

    case 'TIMELINE': {
      // Compare completion date vs deadline
      const deadline = new Date(goal.target_value);
      const completed = new Date(achievementValue);

      if (isNaN(deadline.getTime()) || isNaN(completed.getTime())) return 0;

      if (completed <= deadline) {
        return 100;
      } else {
        // Proportional penalty: how many days late relative to the total duration
        const totalDays = Math.max(1, Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
        const daysLate = Math.ceil((completed.getTime() - deadline.getTime()) / (1000 * 60 * 60 * 24));
        const penalty = Math.min(daysLate / Math.max(totalDays, 1), 1);
        return Math.max(Math.round((1 - penalty) * 100), 0);
      }
    }

    case 'ZERO_BASED': {
      // Binary: zero incidents = perfect, any incident = zero score
      if (isNaN(actual)) return 0;
      return actual === 0 ? 100 : 0;
    }

    default:
      return 0;
  }
}

/**
 * Computes the overall weighted sheet score for a given check-in window.
 * Formula: Σ(goalScore × goalWeightage) / 100
 */
export function computeOverallScore(
  goalScores: { progress_score: number | null; weightage: number }[]
): number {
  const total = goalScores.reduce((sum, g) => {
    const score = g.progress_score ?? 0;
    return sum + (score * g.weightage);
  }, 0);

  return Math.round((total / 100) * 100) / 100;
}
