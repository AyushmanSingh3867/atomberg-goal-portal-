import prisma from '../../lib/prisma';
import ExcelJS      from "exceljs";
import { format }   from "date-fns";

// ── Fetch report data ─────────────────────────────────────
export const getReportData = async (filters: {
  cycleId?:      string;
  departmentId?: string;
  managerId?:    string;
  quarter?:      string;
}) => {
  const cycle = filters.cycleId
    ? await prisma.goalCycle.findUnique({ where: { id: filters.cycleId } })
    : await prisma.goalCycle.findFirst({ where: { is_active: true } });

  if (!cycle) throw new Error("No active cycle found");

  const userWhere: any = {};
  if (filters.departmentId) userWhere.department_id = filters.departmentId;
  if (filters.managerId)    userWhere.manager_id    = filters.managerId;

  const sheets = await prisma.goalSheet.findMany({
    where: {
      cycle_id: cycle.id,
      employee: userWhere,
    },
    include: {
      employee:   { include: { department: true } },
      goals: {
        include: {
          thrustArea:   true,
          achievements: {
            include: { window: true }
          },
        },
      },
    },
  });

  // Flatten to rows
  const rows: any[] = [];
  sheets.forEach((sheet) => {
    sheet.goals.forEach((goal) => {
      const q1 = goal.achievements.find((a: any) => a.window?.period === "Q1");
      const q2 = goal.achievements.find((a: any) => a.window?.period === "Q2");
      const q3 = goal.achievements.find((a: any) => a.window?.period === "Q3");
      const q4 = goal.achievements.find((a: any) => a.window?.period === "Q4_ANNUAL");

      let formattedTarget = goal.target_value;
      if (goal.uom_type === "TIMELINE" && goal.target_value) {
        try {
          formattedTarget = format(new Date(goal.target_value), "dd MMM yyyy");
        } catch {
          formattedTarget = goal.target_value;
        }
      }

      rows.push({
        employee:     sheet.employee.name,
        email:        sheet.employee.email,
        department:   sheet.employee.department?.name ?? "—",
        thrust_area:  goal.thrustArea.name,
        goal_title:   goal.title,
        uom_type:     goal.uom_type,
        target:       formattedTarget,
        weightage:    goal.weightage + "%",
        q1_achieved:  q1?.actual_value  ?? "—",
        q1_score:     q1?.progress_score != null ? q1.progress_score + "%" : "—",
        q2_achieved:  q2?.actual_value  ?? "—",
        q2_score:     q2?.progress_score != null ? q2.progress_score + "%" : "—",
        q3_achieved:  q3?.actual_value  ?? "—",
        q3_score:     q3?.progress_score != null ? q3.progress_score + "%" : "—",
        q4_achieved:  q4?.actual_value  ?? "—",
        q4_score:     q4?.progress_score != null ? q4.progress_score + "%" : "—",
        sheet_status: sheet.status,
      });
    });
  });

  return { cycle, rows };
};

// ── CSV Export ────────────────────────────────────────────
export const generateCSV = async (filters: any): Promise<string> => {
  const { rows } = await getReportData(filters);

  const headers = [
    "Employee", "Email", "Department", "Thrust Area", "Goal Title",
    "UoM", "Target", "Weightage",
    "Q1 Achieved", "Q1 Score",
    "Q2 Achieved", "Q2 Score",
    "Q3 Achieved", "Q3 Score",
    "Q4 Achieved", "Q4 Score",
    "Sheet Status",
  ];

  const csvLines = [
    headers.join(","),
    ...rows.map((r) =>
      [
        `"${r.employee}"`, `"${r.email}"`, `"${r.department}"`,
        `"${r.thrust_area}"`, `"${r.goal_title}"`, r.uom_type,
        `"${r.target}"`, r.weightage,
        r.q1_achieved, r.q1_score,
        r.q2_achieved, r.q2_score,
        r.q3_achieved, r.q3_score,
        r.q4_achieved, r.q4_score,
        r.sheet_status,
      ].join(",")
    ),
  ];

  return csvLines.join("\n");
};

// ── Excel Export (memory stream) ──────────────────────────
export const generateExcel = async (filters: any): Promise<Buffer> => {
  const { cycle, rows } = await getReportData(filters);

  const workbook  = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Achievement Report");

  // Metadata
  workbook.creator  = "Antigravity Portal";
  workbook.created  = new Date();
  worksheet.properties.defaultRowHeight = 20;

  // Header row
  const headers = [
    "Employee", "Email", "Department", "Thrust Area", "Goal Title",
    "UoM", "Target", "Weightage",
    "Q1 Achieved", "Q1 Score",
    "Q2 Achieved", "Q2 Score",
    "Q3 Achieved", "Q3 Score",
    "Q4 Achieved", "Q4 Score",
    "Sheet Status",
  ];

  const headerRow = worksheet.addRow(headers);

  // Style header
  headerRow.eachCell((cell) => {
    cell.font        = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    cell.fill        = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4F46E5" } };
    cell.alignment   = { horizontal: "center", vertical: "middle" };
    cell.border      = {
      bottom: { style: "thin", color: { argb: "FF818CF8" } },
    };
  });

  // Column widths
  worksheet.columns = [
    { width: 20 }, { width: 28 }, { width: 18 }, { width: 22 }, { width: 30 },
    { width: 12 }, { width: 14 }, { width: 12 },
    { width: 14 }, { width: 12 },
    { width: 14 }, { width: 12 },
    { width: 14 }, { width: 12 },
    { width: 14 }, { width: 12 },
    { width: 14 },
  ];

  // Data rows with alternating colors
  rows.forEach((r, i) => {
    const row = worksheet.addRow([
      r.employee, r.email, r.department, r.thrust_area, r.goal_title,
      r.uom_type, r.target, r.weightage,
      r.q1_achieved, r.q1_score,
      r.q2_achieved, r.q2_score,
      r.q3_achieved, r.q3_score,
      r.q4_achieved, r.q4_score,
      r.sheet_status,
    ]);

    const bgColor = i % 2 === 0 ? "FFF8F7FF" : "FFFFFFFF";
    row.eachCell((cell) => {
      cell.fill      = { type: "pattern", pattern: "solid", fgColor: { argb: bgColor } };
      cell.alignment = { vertical: "middle" };
    });

    // Color sheet status
    const statusCell = row.getCell(17);
    if (r.sheet_status === "APPROVED") {
      statusCell.font = { color: { argb: "FF16A34A" }, bold: true };
    } else if (r.sheet_status === "SUBMITTED") {
      statusCell.font = { color: { argb: "FF2563EB" }, bold: true };
    } else if (r.sheet_status === "RETURNED") {
      statusCell.font = { color: { argb: "FFD97706" }, bold: true };
    }
  });

  // Freeze top row
  worksheet.views = [{ state: "frozen", ySplit: 1 }];

  // Return as buffer (memory stream — no temp files)
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
};

// ── Completion Dashboard ──────────────────────────────────
export const getCompletionDashboard = async () => {
  const cycle = await prisma.goalCycle.findFirst({
    where: { is_active: true },
  });
  if (!cycle) return { cycle: null, summary: {}, employees: [] };

  const allSheets = await prisma.goalSheet.findMany({
    where:   { cycle_id: cycle.id },
    include: {
      employee: {
        include: {
          department: true,
          manager:    { select: { name: true } },
        },
      },
      goals: {
        include: { achievements: true },
      },
    },
  });

  const total     = allSheets.length;
  const approved  = allSheets.filter((s) => s.status === "APPROVED").length;
  const submitted = allSheets.filter((s) => s.status === "SUBMITTED" || s.status === "APPROVED").length;

  // Check-in completion — has at least 1 achievement logged
  const checkedIn = allSheets.filter((s) =>
    s.goals.some((g) => g.achievements.length > 0)
  ).length;

  // Per employee status
  const employees = allSheets.map((sheet) => {
    const goalsWithAchievement = sheet.goals.filter((g) => g.achievements.length > 0);
    const overallScore = sheet.goals.reduce((sum, g) => {
      const ach = g.achievements[0];
      return sum + (ach ? (ach.progress_score! * g.weightage) / 100 : 0);
    }, 0);

    return {
      id:          sheet.employee.id,
      name:        sheet.employee.name,
      email:       sheet.employee.email,
      department:  sheet.employee.department?.name ?? "—",
      manager:     sheet.employee.manager?.name ?? "—",
      sheetStatus: sheet.status,
      submittedAt: sheet.submitted_at,
      approvedAt:  sheet.approved_at,
      goalsTotal:  sheet.goals.length,
      goalsWithCheckin: goalsWithAchievement.length,
      checkinComplete:  goalsWithAchievement.length === sheet.goals.length,
      overallScore:     Math.round(overallScore * 10) / 10,
    };
  });

  return {
    cycle,
    summary: {
      total,
      submitted,       submitted_pct:  total ? Math.round((submitted  / total) * 100) : 0,
      approved,        approved_pct:   total ? Math.round((approved   / total) * 100) : 0,
      checkedIn,       checkin_pct:    total ? Math.round((checkedIn  / total) * 100) : 0,
    },
    employees,
    generated_at: new Date().toISOString(),
  };
};

export const getDepartmentHeatmap = async () => {
  const departments = await prisma.department.findMany({
    include: {
      users: {
        include: {
          goalSheets: {
            where: { cycle: { is_active: true } }
          }
        }
      }
    }
  });

  return departments.map(dept => {
    const totalEmployees = dept.users.filter(u => u.role === 'EMPLOYEE').length;
    const completedSheets = dept.users.filter(u => 
      u.goalSheets.some(s => s.status === 'APPROVED')
    ).length;
    
    const completionRate = totalEmployees > 0 
      ? Math.round((completedSheets / totalEmployees) * 100) 
      : 0;

    return {
      id: dept.id,
      name: dept.name,
      totalEmployees,
      completedSheets,
      completionRate,
      status: completionRate > 90 ? 'HEALTHY' : completionRate > 50 ? 'WARNING' : 'CRITICAL'
    };
  });
};
