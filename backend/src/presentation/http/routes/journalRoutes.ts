import { Router } from "express";
import type { JournalController } from "../controllers/JournalController.js";
import type { ITokenService } from "../../../domain/services/ITokenService.js";
import { createAuthGuard } from "../middleware/authGuard.js";

export function createJournalRouter(controller: JournalController, tokenService: ITokenService): Router {
  const router = Router();
  const guard = createAuthGuard(tokenService);
  router.use(guard);
  router.post("/", controller.create);
  router.get("/", controller.list);
  return router;
}
