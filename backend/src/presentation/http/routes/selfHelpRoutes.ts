import { Router } from "express";
import type { SelfHelpController } from "../controllers/SelfHelpController.js";

export function createSelfHelpRouter(controller: SelfHelpController): Router {
  const router = Router();
  router.get("/topics", controller.list);
  router.get("/topics/:slug", controller.bySlug);
  return router;
}
