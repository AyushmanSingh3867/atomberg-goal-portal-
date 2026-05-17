import { Request, Response } from "express";
import { z }                 from "zod";
import {
  getRules, createRule, updateRule, deleteRule,
  getLogs,  resolveLog,
} from "./escalation.service";
import { triggerEscalationNow } from "./escalation.cron";

const RuleSchema = z.object({
  name:           z.string().min(1),
  trigger_type:   z.enum(["goal_not_submitted","goal_not_approved","checkin_missed"]),
  days_threshold: z.number().int().min(1).max(90),
  notify_level:   z.enum(["employee","manager","hr"]),
});

export const getRulesHandler = async (_req: Request, res: Response) => {
  const rules = await getRules();
  res.json({ rules });
};

export const createRuleHandler = async (req: Request, res: Response) => {
  const parsed = RuleSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ errors: parsed.error.issues });
  }
  try {
    const rule = await createRule({ ...parsed.data, adminId: (req as any).user!.userId });
    res.json({ success: true, rule });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const updateRuleHandler = async (req: Request, res: Response) => {
  try {
    const rule = await updateRule(req.params.id as string, req.body, (req as any).user!.userId);
    res.json({ success: true, rule });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const deleteRuleHandler = async (req: Request, res: Response) => {
  try {
    await deleteRule(req.params.id as string, (req as any).user!.userId);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const getLogsHandler = async (req: Request, res: Response) => {
  const resolved = req.query.resolved === "true"
    ? true : req.query.resolved === "false" ? false : undefined;
  const data = await getLogs({
    resolved,
    employeeId: req.query.employeeId as string,
    page:       Number(req.query.page)  || 1,
    limit:      Number(req.query.limit) || 20,
  });
  res.json(data);
};

export const resolveLogHandler = async (req: Request, res: Response) => {
  try {
    const log = await resolveLog(
      req.params.id as string,
      (req as any).user!.userId,
      req.body.notes
    );
    res.json({ success: true, log });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const triggerManualHandler = async (_req: Request, res: Response) => {
  try {
    await triggerEscalationNow();
    res.json({ success: true, message: "Escalation check completed" });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};
