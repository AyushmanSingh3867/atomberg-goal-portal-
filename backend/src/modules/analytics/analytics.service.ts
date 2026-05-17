import prisma from "../../lib/prisma";

// ─── 1. Quarter-on-Quarter Trends ────────────────────────
export const getQoQTrends = async (filters: {
  cycleId?:      string;
  departmentId?: string;
  managerId?:    string;
}) => {
  const cycle = filters.cycleId
    ? await prisma.goalCycle.findUnique({ where: { id: filters.cycleId } })
    : await prisma.goalCycle.findFirst({ where: { is_active: true } });

  if (!cycle) throw new Error("No active cycle found");

  const userWhere: any = {};
  if (filters.departmentId) userWhere.department_id = filters.departmentId;
  if (filters.managerId)    userWhere.manager_id    = filters.managerId;

  const sheets = await prisma.goalSheet.findMany({
    where: { cycle_id: cycle.id, employee: userWhere },
    include: {
      employee: {
        include: { department: true, manager: { select: { name: true } } },
      },
      goals: {
        include: {
          achievements: { include: { window: true } },
        },
      },
    },
  });

  // Build per-employee QoQ data
  const employeeData = sheets.map((sheet) => {
    const quarterScores: Record<string, number> = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 };
    const quarterCounts: Record<string, number> = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 };

    sheet.goals.forEach((goal) => {
      goal.achievements.forEach((ach: any) => {
        const q = ach.window?.quarter;
        if (q && quarterScores[q] !== undefined) {
          quarterScores[q] += (ach.progress_score * goal.weightage) / 100;
          quarterCounts[q]++;
        }
      });
    });

    return {
      employeeId:   sheet.employee.id,
      employeeName: sheet.employee.name,
      department:   sheet.employee.department?.name ?? "—",
      manager:      sheet.employee.manager?.name ?? "—",
      scores: {
        Q1: Math.round(quarterScores.Q1 * 10) / 10,
        Q2: Math.round(quarterScores.Q2 * 10) / 10,
        Q3: Math.round(quarterScores.Q3 * 10) / 10,
        Q4: Math.round(quarterScores.Q4 * 10) / 10,
      },
    };
  });

  // Team averages per quarter
  const teamAvg = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 };
  if (employeeData.length > 0) {
    (["Q1", "Q2", "Q3", "Q4"] as const).forEach((q) => {
      const nonZero = employeeData.filter((e) => e.scores[q] > 0);
      teamAvg[q] = nonZero.length > 0
        ? Math.round((nonZero.reduce((s, e) => s + e.scores[q], 0) / nonZero.length) * 10) / 10
        : 0;
    });
  }

  return { cycle, employeeData, teamAvg };
};

// ─── 2. Goal Distribution ─────────────────────────────────
export const getGoalDistribution = async (cycleId?: string) => {
  const cycle = cycleId
    ? await prisma.goalCycle.findUnique({ where: { id: cycleId } })
    : await prisma.goalCycle.findFirst({ where: { is_active: true } });

  if (!cycle) throw new Error("No active cycle found");

  const goals = await prisma.goal.findMany({
    where:   { goalSheet: { cycle_id: cycle.id } },
    include: {
      thrustArea:   true,
      goalSheet:    true,
      achievements: true,
    },
  });

  // By Thrust Area
  const byThrustArea: Record<string, { name: string; count: number; avgScore: number; totalScore: number }> = {};
  goals.forEach((g) => {
    const key = g.thrust_area_id;
    if (!byThrustArea[key]) {
      byThrustArea[key] = { name: g.thrustArea.name, count: 0, avgScore: 0, totalScore: 0 };
    }
    byThrustArea[key].count++;
    const latestAch = g.achievements[g.achievements.length - 1];
    if (latestAch) byThrustArea[key].totalScore += latestAch.progress_score ?? 0;
  });
  Object.values(byThrustArea).forEach((t) => {
    t.avgScore = t.count > 0 ? Math.round(t.totalScore / t.count) : 0;
  });

  // By UoM type
  const byUom: Record<string, number> = {};
  goals.forEach((g) => {
    byUom[g.uom_type] = (byUom[g.uom_type] ?? 0) + 1;
  });

  // By status
  const byStatus: Record<string, number> = {
    DRAFT: 0, SUBMITTED: 0, APPROVED: 0, RETURNED: 0,
  };
  goals.forEach((g) => {
    const s = g.goalSheet.status;
    if (byStatus[s] !== undefined) byStatus[s]++;
  });

  return {
    cycle,
    byThrustArea: Object.values(byThrustArea),
    byUom: Object.entries(byUom).map(([type, count]) => ({ type, count })),
    byStatus: Object.entries(byStatus).map(([status, count]) => ({ status, count })),
    totalGoals: goals.length,
  };
};

// ─── 3. Heatmap Data ──────────────────────────────────────
export const getHeatmapData = async (cycleId?: string) => {
  const cycle = cycleId
    ? await prisma.goalCycle.findUnique({ where: { id: cycleId } })
    : await prisma.goalCycle.findFirst({ where: { is_active: true } });

  if (!cycle) throw new Error("No active cycle found");

  const sheets = await prisma.goalSheet.findMany({
    where:   { cycle_id: cycle.id },
    include: {
      employee: { select: { id: true, name: true } },
      goals: {
        include: {
          achievements: { include: { window: true } },
        },
      },
    },
  });

  const rows = sheets.map((sheet) => {
    const quarters: Record<string, number> = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 };

    sheet.goals.forEach((goal) => {
      goal.achievements.forEach((ach: any) => {
        const q = ach.window?.quarter;
        if (q) quarters[q] += ((ach.progress_score ?? 0) * goal.weightage) / 100;
      });
    });

    return {
      employeeId:   sheet.employee.id,
      employeeName: sheet.employee.name,
      Q1: Math.round(quarters.Q1),
      Q2: Math.round(quarters.Q2),
      Q3: Math.round(quarters.Q3),
      Q4: Math.round(quarters.Q4),
    };
  });

  return { cycle, rows };
};

// ─── 4. Manager Effectiveness ─────────────────────────────
export const getManagerEffectiveness = async (cycleId?: string) => {
  const cycle = cycleId
    ? await prisma.goalCycle.findUnique({ where: { id: cycleId } })
    : await prisma.goalCycle.findFirst({ where: { is_active: true } });

  if (!cycle) throw new Error("No active cycle found");

  const managers = await prisma.user.findMany({
    where: { role: "MANAGER" },
    include: {
      employees: {
        include: {
          goalSheets: {
            where: { cycle_id: cycle.id },
            include: {
              goals: {
                include: { achievements: true },
              },
            },
          },
        },
      },
    },
  });

  const data = managers.map((mgr) => {
    const teamSheets = mgr.employees.flatMap((e) => e.goalSheets);
    const total      = teamSheets.length;
    const approved   = teamSheets.filter((s) => s.status === "APPROVED").length;

    // Avg days to approve
    const approvedSheets = teamSheets.filter(
      (s) => s.status === "APPROVED" && s.submitted_at && s.approved_at
    );
    const avgDaysToApprove = approvedSheets.length > 0
      ? Math.round(
          approvedSheets.reduce((sum, s) => {
            const diff = new Date(s.approved_at!).getTime() - new Date(s.submitted_at!).getTime();
            return sum + diff / (1000 * 60 * 60 * 24);
          }, 0) / approvedSheets.length
        )
      : null;

    // Check-in completion
    const allGoals     = teamSheets.flatMap((s) => s.goals);
    const goalsWithAch = allGoals.filter((g) => g.achievements.length > 0);
    const checkinPct   = allGoals.length > 0
      ? Math.round((goalsWithAch.length / allGoals.length) * 100)
      : 0;

    // Team avg score
    let totalScore = 0; let scoreCount = 0;
    allGoals.forEach((g) => {
      g.achievements.forEach((a) => {
        totalScore += a.progress_score ?? 0; scoreCount++;
      });
    });
    const teamAvgScore = scoreCount > 0 ? Math.round(totalScore / scoreCount) : 0;

    return {
      managerId:       mgr.id,
      managerName:     mgr.name,
      teamSize:        mgr.employees.length,
      totalSheets:     total,
      approvedSheets:  approved,
      approvalRate:    total > 0 ? Math.round((approved / total) * 100) : 0,
      avgDaysToApprove,
      checkinPct,
      teamAvgScore,
    };
  });

  return { cycle, managers: data };
};
