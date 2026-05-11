import { Router } from "express";

export type HealthExtra = {
  sentimentProvider: "heuristic" | "openai";
};

export function createHealthRouter(extra?: () => HealthExtra): Router {
  const router = Router();

  router.get("/", (_req, res) => {
    const payload: { status: "ok" } & Partial<HealthExtra> = { status: "ok" };
    const x = extra?.();
    if (x) {
      payload.sentimentProvider = x.sentimentProvider;
    }
    res.status(200).json(payload);
  });

  return router;
}
