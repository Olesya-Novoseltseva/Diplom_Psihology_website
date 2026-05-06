import { PrismaClient } from "@prisma/client";
import { loadEnv } from "../config/env.js";
import { AuthService } from "../application/services/AuthService.js";
import { JournalService } from "../application/services/JournalService.js";
import { SurveyService } from "../application/services/SurveyService.js";
import { CampusService } from "../application/services/CampusService.js";
import { BcryptPasswordHasher } from "../infrastructure/security/BcryptPasswordHasher.js";
import { JwtTokenService } from "../infrastructure/security/JwtTokenService.js";
import { PrismaUserRepository } from "../infrastructure/persistence/PrismaUserRepository.js";
import { PrismaJournalRepository } from "../infrastructure/persistence/PrismaJournalRepository.js";
import { PrismaSurveyAttemptRepository } from "../infrastructure/persistence/PrismaSurveyAttemptRepository.js";
import { PrismaCampusCatalogRepository } from "../infrastructure/persistence/PrismaCampusCatalogRepository.js";
import { createSentimentAnalyzer } from "../infrastructure/sentiment/createSentimentAnalyzer.js";
import { journalPolicyFromEnv } from "../config/journalPolicy.js";
import { createRootLogger } from "../infrastructure/logging/createRootLogger.js";
import type { ILogger } from "../infrastructure/logging/ILogger.js";
import { createHttpApp } from "./createHttpApp.js";

export type ApplicationContext = {
  prisma: PrismaClient;
  logger: ILogger;
  close: () => Promise<void>;
  app: ReturnType<typeof createHttpApp>;
  env: ReturnType<typeof loadEnv>;
};

export function createApplicationContext(): ApplicationContext {
  const logger = createRootLogger();
  const env = loadEnv();
  const prisma = new PrismaClient();

  const userRepository = new PrismaUserRepository(prisma);
  const passwordHasher = new BcryptPasswordHasher();
  const tokenService = new JwtTokenService(env.JWT_SECRET);
  const authService = new AuthService(userRepository, passwordHasher, tokenService);

  const journalRepository = new PrismaJournalRepository(prisma);
  const journalPolicy = journalPolicyFromEnv(env);
  const sentimentAnalyzer = createSentimentAnalyzer(env);
  const journalService = new JournalService(journalRepository, sentimentAnalyzer, journalPolicy);
  const surveyAttemptRepository = new PrismaSurveyAttemptRepository(prisma);
  const surveyService = new SurveyService(surveyAttemptRepository);
  const campusCatalogRepository = new PrismaCampusCatalogRepository(prisma);
  const campusService = new CampusService(campusCatalogRepository);

  const app = createHttpApp({
    env,
    logger,
    authService,
    journalService,
    surveyService,
    campusService,
    tokenService,
  });

  return {
    prisma,
    logger,
    env,
    app,
    close: async () => {
      await prisma.$disconnect();
    },
  };
}
