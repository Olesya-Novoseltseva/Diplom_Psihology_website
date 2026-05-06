import type { NextFunction, Request, Response } from "express";
import type { ITokenService } from "../../../domain/services/ITokenService.js";
import { UnauthorizedError } from "../../../domain/errors/HttpError.js";

export function createAuthGuard(tokenService: ITokenService) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const header = req.headers.authorization;
      if (!header?.startsWith("Bearer ")) {
        throw new UnauthorizedError("Требуется авторизация");
      }
      const raw = header.slice("Bearer ".length).trim();
      if (!raw) {
        throw new UnauthorizedError("Требуется авторизация");
      }
      const payload = tokenService.verify(raw);
      req.auth = { userId: payload.sub, email: payload.email };
      next();
    } catch (e) {
      next(e);
    }
  };
}
