import { Request, Response } from "express";
import { format } from "date-fns";
import {
  generateCSV,
  generateExcel,
  getCompletionDashboard,
  getReportData,
  getDepartmentHeatmap,
} from "./reports.service";

const getFilters = (query: any) => ({
  cycleId:      query.cycleId      as string | undefined,
  departmentId: query.departmentId as string | undefined,
  managerId:    query.managerId    as string | undefined,
  quarter:      query.quarter      as string | undefined,
});

export const getReportTableHandler = async (req: Request, res: Response) => {
  try {
    const data = await getReportData(getFilters(req.query));
    res.json(data);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const exportCSVHandler = async (req: Request, res: Response) => {
  try {
    const csv      = await generateCSV(getFilters(req.query));
    const filename = `achievement-report-${format(new Date(), "yyyy-MM-dd")}.csv`;
    res.setHeader("Content-Type",        "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const exportExcelHandler = async (req: Request, res: Response) => {
  try {
    const buffer   = await generateExcel(getFilters(req.query));
    const filename = `achievement-report-${format(new Date(), "yyyy-MM-dd")}.xlsx`;
    res.setHeader("Content-Type",        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length",      buffer.length);
    res.send(buffer);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const getCompletionHandler = async (_req: Request, res: Response) => {
  try {
    const data = await getCompletionDashboard();
    res.json(data);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const getDepartmentHeatmapHandler = async (_req: Request, res: Response) => {
  try {
    const data = await getDepartmentHeatmap();
    res.json(data);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};
