import { Router } from "express";
import type { AdminController } from "../controllers/AdminController.js";
import type { ITokenService } from "../../../domain/services/ITokenService.js";
import { createAuthGuard } from "../middleware/authGuard.js";
import { adminGuard } from "../middleware/adminGuard.js";

export function createAdminRouter(controller: AdminController, tokenService: ITokenService): Router {
  const router = Router();
  router.use(createAuthGuard(tokenService), adminGuard);

  router.get("/campus/markers", controller.listMarkers);
  router.post("/campus/markers", controller.createMarker);
  router.patch("/campus/markers/:id", controller.updateMarker);
  router.delete("/campus/markers/:id", controller.deleteMarker);
  router.post("/campus/plan-image", controller.setCampusPlan);

  router.post("/uploads", controller.upload);

  router.get("/surveys", controller.listSurveys);
  router.post("/surveys", controller.createSurvey);
  router.patch("/surveys/:id", controller.updateSurvey);
  router.delete("/surveys/:id", controller.deleteSurvey);

  router.get("/selfhelp/topics", controller.listSelfHelp);
  router.post("/selfhelp/topics", controller.createSelfHelp);
  router.patch("/selfhelp/topics/:id", controller.updateSelfHelp);
  router.delete("/selfhelp/topics/:id", controller.deleteSelfHelp);

  return router;
}
