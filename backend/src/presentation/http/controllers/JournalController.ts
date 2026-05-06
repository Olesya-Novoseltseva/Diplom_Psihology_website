import type { NextFunction, Request, Response } from "express";
import { createJournalBodySchema, listJournalQuerySchema } from "../../../application/dto/journal.schemas.js";
import type { JournalService } from "../../../application/services/JournalService.js";
import { UnauthorizedError } from "../../../domain/errors/HttpError.js";

export class JournalController {
  constructor(private readonly journalService: JournalService) {}

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.auth?.userId;
      if (!userId) throw new UnauthorizedError("Требуется авторизация");
      const body = createJournalBodySchema.parse(req.body);
      const result = await this.journalService.addEntry(userId, body.content);
      res.status(201).json(result);
    } catch (e) {
      next(e);
    }
  };

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.auth?.userId;
      if (!userId) throw new UnauthorizedError("Требуется авторизация");
      const q = listJournalQuerySchema.parse(req.query);
      const entries = await this.journalService.list(userId, q.limit);
      res.status(200).json({ entries });
    } catch (e) {
      next(e);
    }
  };
}
