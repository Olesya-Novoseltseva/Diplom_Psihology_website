import { Router } from "express";
import type { CampusController } from "../controllers/CampusController.js";

export function createCampusRouter(controller: CampusController): Router {
  const router = Router();
  router.get("/markers", controller.markers);
  router.get("/buildings/:slug", controller.buildingBySlug);
  router.get("/buildings", controller.buildings);
  return router;
}
