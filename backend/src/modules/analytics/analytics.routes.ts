import { Router } from "express";
import { authenticate, requireRole } from "../../middleware/auth";
import {
  getQoQTrendsHandler,
  getDistributionHandler,
  getHeatmapHandler,
  getManagerEffectivenessHandler,
} from "./analytics.controller";

const router = Router();

router.use(authenticate);
router.use(requireRole("MANAGER", "ADMIN"));

router.get("/qoq-trends",           getQoQTrendsHandler);
router.get("/distribution",         getDistributionHandler);
router.get("/heatmap",              getHeatmapHandler);
router.get("/manager-effectiveness",getManagerEffectivenessHandler);

export default router;
