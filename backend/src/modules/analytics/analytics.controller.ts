import { Request, Response } from "express";
import {
  getQoQTrends,
  getGoalDistribution,
  getHeatmapData,
  getManagerEffectiveness,
} from "./analytics.service";

const getFilters = (q: any) => ({
  cycleId:      q.cycleId      as string | undefined,
  departmentId: q.departmentId as string | undefined,
  managerId:    q.managerId    as string | undefined,
});

export const getQoQTrendsHandler = async (req: Request, res: Response) => {
  try {
    const data = await getQoQTrends(getFilters(req.query));
    res.json(data);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const getDistributionHandler = async (req: Request, res: Response) => {
  try {
    const data = await getGoalDistribution(req.query.cycleId as string);
    res.json(data);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const getHeatmapHandler = async (req: Request, res: Response) => {
  try {
    const data = await getHeatmapData(req.query.cycleId as string);
    res.json(data);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const getManagerEffectivenessHandler = async (req: Request, res: Response) => {
  try {
    const data = await getManagerEffectiveness(req.query.cycleId as string);
    res.json(data);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};
