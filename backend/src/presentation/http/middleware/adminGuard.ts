import type { NextFunction, Request, Response } from "express";
import { ForbiddenError, UnauthorizedError } from "../../../domain/errors/HttpError.js";

export function adminGuard(req: Request, _res: Response, next: NextFunction): void {
  try {
    if (!req.auth) {
      throw new UnauthorizedError("Требуется авторизация");
    }
    if (req.auth.role !== "ADMIN") {
      throw new ForbiddenError("Требуются права администратора");
    }
    next();
  } catch (e) {
    next(e);
  }
}
