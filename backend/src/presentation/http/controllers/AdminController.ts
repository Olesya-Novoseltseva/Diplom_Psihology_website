import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import type { AdminService } from "../../../application/services/AdminService.js";
import { UnauthorizedError } from "../../../domain/errors/HttpError.js";

const categorySchema = z.enum(["QUIET", "FOOD", "STUDY", "RELAX", "SERVICE", "OTHER"]);
const markerSchema = z.object({
  buildingId: z.string().uuid().nullable().optional(),
  category: categorySchema,
  title: z.string().trim().min(1),
  description: z.string().nullable().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
  floorLabel: z.string().nullable().optional(),
  roomLabel: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});
const markerPatchSchema = markerSchema.partial();

const questionSchema = z.object({
  text: z.string().trim().min(1),
  min: z.number().int().min(0).default(0),
  max: z.number().int().min(1).default(3),
  reverseScore: z.boolean().optional(),
});
const surveySchema = z.object({
  key: z.string().trim().min(2).regex(/^[a-z0-9_-]+$/),
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  sharedOptionLabels: z.array(z.string()).optional(),
  scoreBands: z.array(z.unknown()).optional(),
  questions: z.array(questionSchema).min(1),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

const sectionSchema = z.object({
  heading: z.string().trim().min(1),
  paragraphs: z.array(z.string()).min(1),
  bullets: z.array(z.string()).optional(),
});
const selfHelpSchema = z.object({
  slug: z.string().trim().min(2).regex(/^[a-z0-9_-]+$/),
  title: z.string().trim().min(1),
  summary: z.string().trim().min(1),
  disclaimer: z.string().trim().min(1),
  categories: z.array(z.string()).optional(),
  sections: z.array(sectionSchema).min(1),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

const uploadSchema = z.object({
  kind: z.enum(["campus", "selfhelp", "map"]).default("campus"),
  filename: z.string().trim().min(1),
  dataUrl: z.string().min(20),
});

const campusPlanSchema = z.object({
  imageUrl: z.string().trim().min(1),
  title: z.string().trim().optional(),
});

export class AdminController {
  constructor(private readonly admin: AdminService) {}

  listMarkers = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.json({ markers: await this.admin.listMarkers() });
    } catch (e) {
      next(e);
    }
  };

  createMarker = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const adminId = req.auth?.userId;
      if (!adminId) throw new UnauthorizedError("Требуется авторизация");
      res.status(201).json({ marker: await this.admin.createMarker(adminId, markerSchema.parse(req.body)) });
    } catch (e) {
      next(e);
    }
  };

  updateMarker = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const adminId = req.auth?.userId;
      if (!adminId) throw new UnauthorizedError("Требуется авторизация");
      res.json({ marker: await this.admin.updateMarker(adminId, req.params.id, markerPatchSchema.parse(req.body)) });
    } catch (e) {
      next(e);
    }
  };

  deleteMarker = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const adminId = req.auth?.userId;
      if (!adminId) throw new UnauthorizedError("Требуется авторизация");
      res.json({ marker: await this.admin.deleteMarker(adminId, req.params.id) });
    } catch (e) {
      next(e);
    }
  };

  setCampusPlan = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = campusPlanSchema.parse(req.body);
      const row = await this.admin.setDefaultCampusPlan(body.imageUrl, body.title);
      res.status(201).json({ plan: { id: row.id, imageUrl: row.imageUrl, title: row.title } });
    } catch (e) {
      next(e);
    }
  };

  listSurveys = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.json({ surveys: await this.admin.listSurveys() });
    } catch (e) {
      next(e);
    }
  };

  createSurvey = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.status(201).json({ survey: await this.admin.createSurvey(surveySchema.parse(req.body)) });
    } catch (e) {
      next(e);
    }
  };

  updateSurvey = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.json({ survey: await this.admin.updateSurvey(req.params.id, surveySchema.partial().parse(req.body)) });
    } catch (e) {
      next(e);
    }
  };

  deleteSurvey = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.json({ survey: await this.admin.deleteSurvey(req.params.id) });
    } catch (e) {
      next(e);
    }
  };

  listSelfHelp = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.json({ topics: await this.admin.listSelfHelpTopics() });
    } catch (e) {
      next(e);
    }
  };

  createSelfHelp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.status(201).json({ topic: await this.admin.createSelfHelpTopic(selfHelpSchema.parse(req.body)) });
    } catch (e) {
      next(e);
    }
  };

  updateSelfHelp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.json({ topic: await this.admin.updateSelfHelpTopic(req.params.id, selfHelpSchema.partial().parse(req.body)) });
    } catch (e) {
      next(e);
    }
  };

  deleteSelfHelp = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.json({ topic: await this.admin.deleteSelfHelpTopic(req.params.id) });
    } catch (e) {
      next(e);
    }
  };

  upload = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = uploadSchema.parse(req.body);
      res.status(201).json(await this.admin.saveDataUrlUpload(body.kind, body.filename, body.dataUrl));
    } catch (e) {
      next(e);
    }
  };
}
