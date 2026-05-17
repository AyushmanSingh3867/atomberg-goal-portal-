import { Router }       from "express";
import { authenticate } from "../../middleware/auth";
import { requireRole }  from "../../middleware/auth";
import {
  getRulesHandler,
  createRuleHandler,
  updateRuleHandler,
  deleteRuleHandler,
  getLogsHandler,
  resolveLogHandler,
  triggerManualHandler,
} from "./escalation.controller";

const router = Router();
router.use(authenticate);
router.use(requireRole("ADMIN"));

// Rules CRUD
router.get   ("/rules",           getRulesHandler);
router.post  ("/rules",           createRuleHandler);
router.put   ("/rules/:id",       updateRuleHandler);
router.delete("/rules/:id",       deleteRuleHandler);

// Logs
router.get   ("/logs",            getLogsHandler);
router.put   ("/logs/:id/resolve",resolveLogHandler);

// Manual trigger (for testing/demo)
router.post  ("/trigger",         triggerManualHandler);

export default router;
