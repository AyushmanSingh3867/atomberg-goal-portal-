import { Router }     from "express";
import { authenticate, requireRole } from "../../middleware/auth";
import {
  exportCSVHandler,
  exportExcelHandler,
  getCompletionHandler,
  getReportTableHandler,
  getDepartmentHeatmapHandler,
} from "./reports.controller";

const router = Router();

router.use(authenticate);

// Table is accessible by everyone (filtered by email on frontend for employees)
router.get("/table",         getReportTableHandler);
router.get("/heatmap",       getDepartmentHeatmapHandler);

// Exports and Completion Dashboard are restricted to Manager/Admin
router.get("/export/csv",    requireRole("MANAGER", "ADMIN"), exportCSVHandler);
router.get("/export/excel",  requireRole("MANAGER", "ADMIN"), exportExcelHandler);
router.get("/completion",    requireRole("MANAGER", "ADMIN"), getCompletionHandler);

export default router;
