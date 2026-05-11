import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { CampusService } from "../../../application/services/CampusService.js";
import { BadRequestError } from "../../../domain/errors/HttpError.js";

const markersQuerySchema = z.object({
  buildingId: z.string().uuid().optional(),
  category: z.string().optional(),
});

export class CampusController {
  constructor(private readonly campus: CampusService) {}

  planImage = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const row = await this.campus.planImage();
      res.json({ imageUrl: row?.imageUrl ?? null });
    } catch (e) {
      next(e);
    }
  };

  buildings = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const buildings = await this.campus.buildings();
      res.json({ buildings });
    } catch (e) {
      next(e);
    }
  };

  buildingBySlug = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const slug = req.params.slug;
      if (!slug) throw new BadRequestError("Не указан slug здания");
      const bundle = await this.campus.buildingBySlug(slug);
      res.json(bundle);
    } catch (e) {
      next(e);
    }
  };

  markers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const q = markersQuerySchema.parse(req.query);
      const category = CampusService.parseCategory(q.category);
      if (q.category && category === undefined) {
        throw new BadRequestError("Неизвестная категория маркера");
      }
      const markers = await this.campus.markers({ buildingId: q.buildingId, category });
      res.json({ markers });
    } catch (e) {
      next(e);
    }
  };
}
