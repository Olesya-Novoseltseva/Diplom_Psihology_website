import type { NextFunction, Request, Response } from "express";
import type { SelfHelpService } from "../../../application/services/SelfHelpService.js";
import { NotFoundError } from "../../../domain/errors/HttpError.js";

export class SelfHelpController {
  constructor(private readonly selfHelp: SelfHelpService) {}

  list = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.json({ topics: await this.selfHelp.list() });
    } catch (e) {
      next(e);
    }
  };

  bySlug = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const topic = await this.selfHelp.bySlug(req.params.slug);
      if (!topic) throw new NotFoundError("Техника не найдена");
      res.json({ topic });
    } catch (e) {
      next(e);
    }
  };
}
