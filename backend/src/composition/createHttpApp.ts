import express from "express";
import cors from "cors";
import type { AuthService } from "../application/services/AuthService.js";
import type { JournalService } from "../application/services/JournalService.js";
import type { SurveyService } from "../application/services/SurveyService.js";
import type { CampusService } from "../application/services/CampusService.js";
import type { ITokenService } from "../domain/services/ITokenService.js";
import type { ILogger } from "../infrastructure/logging/ILogger.js";
import type { AppEnv } from "../config/env.js";
import { AuthController } from "../presentation/http/controllers/AuthController.js";
import { JournalController } from "../presentation/http/controllers/JournalController.js";
import { SurveyController } from "../presentation/http/controllers/SurveyController.js";
import { CampusController } from "../presentation/http/controllers/CampusController.js";
import { createAuthRouter } from "../presentation/http/routes/authRoutes.js";
import { createJournalRouter } from "../presentation/http/routes/journalRoutes.js";
import { createSurveyRouter } from "../presentation/http/routes/surveyRoutes.js";
import { createCampusRouter } from "../presentation/http/routes/campusRoutes.js";
import { createHealthRouter } from "../presentation/http/routes/healthRoutes.js";
import { createErrorHandler } from "../presentation/http/middleware/errorHandler.js";
import { createRequestLogger } from "../presentation/http/middleware/requestLogger.js";

export type HttpAppDependencies = {
  env: AppEnv;
  logger: ILogger;
  authService: AuthService;
  journalService: JournalService;
  surveyService: SurveyService;
  campusService: CampusService;
  tokenService: ITokenService;
};

export function createHttpApp(deps: HttpAppDependencies) {
  const app = express();
  const authController = new AuthController(deps.authService);
  const journalController = new JournalController(deps.journalService);
  const surveyController = new SurveyController(deps.surveyService);
  const campusController = new CampusController(deps.campusService);

  app.use(
    cors({
      origin: deps.env.CORS_ORIGIN,
      credentials: true,
    }),
  );
  app.use(express.json());
  app.use(createRequestLogger(deps.logger));

  app.use("/api/health", createHealthRouter());
  app.use("/api/auth", createAuthRouter(authController, deps.tokenService));
  app.use("/api/journal", createJournalRouter(journalController, deps.tokenService));
  app.use("/api/surveys", createSurveyRouter(surveyController, deps.tokenService));
  app.use("/api/campus", createCampusRouter(campusController));

  app.use(createErrorHandler(deps.logger));

  return app;
}
