import { Router } from "express";
import type { AuthController } from "../controllers/AuthController.js";
import type { ITokenService } from "../../../domain/services/ITokenService.js";
import { createAuthGuard } from "../middleware/authGuard.js";

export function createAuthRouter(controller: AuthController, tokenService: ITokenService): Router {
  const router = Router();
  const guard = createAuthGuard(tokenService);

  router.post("/register", controller.register);
  router.post("/login", controller.login);
  router.get("/me", guard, controller.me);

  return router;
}
