import { Router } from "express";
import type { WellbeingController } from "../controllers/WellbeingController.js";
import type { ITokenService } from "../../../domain/services/ITokenService.js";
import { createAuthGuard } from "../middleware/authGuard.js";

export function createWellbeingRouter(controller: WellbeingController, tokenService: ITokenService): Router {
  const router = Router();
  router.use(createAuthGuard(tokenService));
  router.get("/current", controller.current);
  router.get("/daily", controller.daily);
  router.get("/monthly", controller.monthly);
  return router;
}
