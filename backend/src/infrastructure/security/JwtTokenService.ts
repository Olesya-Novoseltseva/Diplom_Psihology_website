import jwt from "jsonwebtoken";
import type { AuthTokenPayload, ITokenService } from "../../domain/services/ITokenService.js";
import { UnauthorizedError } from "../../domain/errors/HttpError.js";

const DEFAULT_EXPIRES = "7d";

export class JwtTokenService implements ITokenService {
  constructor(private readonly secret: string) {}

  sign(payload: AuthTokenPayload): string {
    return jwt.sign(payload, this.secret, { expiresIn: DEFAULT_EXPIRES });
  }

  verify(token: string): AuthTokenPayload {
    try {
      const decoded = jwt.verify(token, this.secret);
      if (
        typeof decoded !== "object" ||
        decoded === null ||
        !("sub" in decoded) ||
        !("email" in decoded)
      ) {
        throw new UnauthorizedError("Неверный токен");
      }
      const sub = (decoded as { sub: unknown }).sub;
      const email = (decoded as { email: unknown }).email;
      const rawRole = (decoded as { role?: unknown }).role;
      if (typeof sub !== "string" || typeof email !== "string") {
        throw new UnauthorizedError("Неверный токен");
      }
      const role = rawRole === "ADMIN" ? "ADMIN" : "USER";
      return { sub, email, role };
    } catch {
      throw new UnauthorizedError("Неверный или просроченный токен");
    }
  }
}
