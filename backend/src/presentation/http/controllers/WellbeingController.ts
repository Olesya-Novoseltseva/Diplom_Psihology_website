import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import type { WellbeingMetricsService } from "../../../application/services/WellbeingMetricsService.js";
import { BadRequestError, UnauthorizedError } from "../../../domain/errors/HttpError.js";

const rangeSchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});

function parseDate(raw: string | undefined): Date | undefined {
  if (!raw) return undefined;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) throw new BadRequestError("Некорректная дата");
  return d;
}

export class WellbeingController {
  constructor(private readonly wellbeing: WellbeingMetricsService) {}

  current = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.auth?.userId;
      if (!userId) throw new UnauthorizedError("Требуется авторизация");
      res.json({ snapshot: await this.wellbeing.current(userId), thresholds: this.wellbeing.getThresholds() });
    } catch (e) {
      next(e);
    }
  };

  daily = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.auth?.userId;
      if (!userId) throw new UnauthorizedError("Требуется авторизация");
      const q = rangeSchema.parse(req.query);
      res.json({ points: await this.wellbeing.daily(userId, parseDate(q.from), parseDate(q.to)) });
    } catch (e) {
      next(e);
    }
  };

  monthly = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.auth?.userId;
      if (!userId) throw new UnauthorizedError("Требуется авторизация");
      const q = rangeSchema.parse(req.query);
      res.json({ points: await this.wellbeing.monthly(userId, parseDate(q.from), parseDate(q.to)) });
    } catch (e) {
      next(e);
    }
  };
}
