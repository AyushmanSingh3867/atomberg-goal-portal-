import { create } from 'zustand';

export interface Goal {
  id: string;
  thrust_area_id: string;
  title: string;
  description: string;
  uom_type: 'NUMERIC' | 'PERCENTAGE' | 'TIMELINE' | 'ZERO_BASED';
  target_value: string;
  weightage: number;
}

interface GoalState {
  goals: Goal[];
  cycleId: string | null;
  addGoal: (goal: Goal) => void;
  updateGoal: (id: string, updatedGoal: Partial<Goal>) => void;
  removeGoal: (id: string) => void;
  setCycleId: (id: string) => void;
  getTotalWeightage: () => number;
  clearGoals: () => void;
}

export const useGoalStore = create<GoalState>((set, get) => ({
  goals: [],
  cycleId: null,
  
  addGoal: (goal) => set((state) => ({ goals: [...state.goals, goal] })),
  
  updateGoal: (id, updatedGoal) => set((state) => ({
    goals: state.goals.map((g) => g.id === id ? { ...g, ...updatedGoal } : g)
  })),
  
  removeGoal: (id) => set((state) => ({
    goals: state.goals.filter((g) => g.id !== id)
  })),
  
  setCycleId: (id) => set({ cycleId: id }),
  
  getTotalWeightage: () => {
    return get().goals.reduce((sum, goal) => sum + goal.weightage, 0);
  },
  
  clearGoals: () => set({ goals: [], cycleId: null }),
}));
