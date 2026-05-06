import { Router } from "express";
import type { SurveyController } from "../controllers/SurveyController.js";
import type { ITokenService } from "../../../domain/services/ITokenService.js";
import { createAuthGuard } from "../middleware/authGuard.js";

export function createSurveyRouter(controller: SurveyController, tokenService: ITokenService): Router {
  const router = Router();
  const guard = createAuthGuard(tokenService);

  router.get("/", controller.catalog);
  router.use(guard);
  router.get("/:surveyKey/attempts", controller.history);
  router.post("/:surveyKey/attempts", controller.submit);
  router.get("/:surveyKey", controller.definition);

  return router;
}
