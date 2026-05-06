import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import type { SurveyService } from "../../../application/services/SurveyService.js";
import { UnauthorizedError } from "../../../domain/errors/HttpError.js";

const submitBodySchema = z.object({
  answers: z.array(z.number()),
});

export class SurveyController {
  constructor(private readonly surveys: SurveyService) {}

  catalog = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.json({ surveys: this.surveys.catalog() });
    } catch (e) {
      next(e);
    }
  };

  definition = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.json(this.surveys.definition(req.params.surveyKey));
    } catch (e) {
      next(e);
    }
  };

  submit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.auth?.userId;
      if (!userId) throw new UnauthorizedError("Требуется авторизация");
      const body = submitBodySchema.parse(req.body);
      const result = await this.surveys.submit(userId, req.params.surveyKey, body.answers);
      res.status(201).json(result);
    } catch (e) {
      next(e);
    }
  };

  history = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.auth?.userId;
      if (!userId) throw new UnauthorizedError("Требуется авторизация");
      const result = await this.surveys.history(userId, req.params.surveyKey);
      res.json(result);
    } catch (e) {
      next(e);
    }
  };
}
