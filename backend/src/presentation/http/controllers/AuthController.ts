import type { NextFunction, Request, Response } from "express";
import { loginBodySchema, registerBodySchema } from "../../../application/dto/auth.schemas.js";
import type { AuthService } from "../../../application/services/AuthService.js";

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = registerBodySchema.parse(req.body);
      const result = await this.authService.register(body);
      res.status(201).json(result);
    } catch (e) {
      next(e);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = loginBodySchema.parse(req.body);
      const result = await this.authService.login(body);
      res.status(200).json(result);
    } catch (e) {
      next(e);
    }
  };

  me = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.auth?.userId;
      if (!userId) {
        throw new Error("authGuard должен выставлять req.auth");
      }
      const user = await this.authService.getProfile(userId);
      res.status(200).json({ user });
    } catch (e) {
      next(e);
    }
  };
}
