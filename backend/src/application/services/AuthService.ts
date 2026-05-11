import type { IUserRepository } from "../../domain/repositories/IUserRepository.js";
import type { IPasswordHasher } from "../../domain/services/IPasswordHasher.js";
import type { ITokenService } from "../../domain/services/ITokenService.js";
import type { PublicUser, UserRecord } from "../../domain/entities/user.types.js";
import type { LoginBody, RegisterBody } from "../dto/auth.schemas.js";
import { ConflictError, NotFoundError, UnauthorizedError } from "../../domain/errors/HttpError.js";

function toPublicUser(user: UserRecord): PublicUser {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  };
}

export type AuthResult = {
  user: PublicUser;
  token: string;
};

export class AuthService {
  constructor(
    private readonly users: IUserRepository,
    private readonly passwords: IPasswordHasher,
    private readonly tokens: ITokenService,
  ) {}

  async register(body: RegisterBody): Promise<AuthResult> {
    const normalizedEmail = body.email.toLowerCase();
    const existing = await this.users.findByEmail(normalizedEmail);
    if (existing) {
      throw new ConflictError("Пользователь с таким email уже зарегистрирован");
    }

    const passwordHash = await this.passwords.hash(body.password);
    const user = await this.users.create({
      email: normalizedEmail,
      passwordHash,
    });

    const token = this.tokens.sign({ sub: user.id, email: user.email, role: user.role });
    return { user: toPublicUser(user), token };
  }

  async login(body: LoginBody): Promise<AuthResult> {
    const normalizedEmail = body.email.toLowerCase();
    const user = await this.users.findByEmail(normalizedEmail);
    if (!user) {
      throw new UnauthorizedError("Неверный email или пароль");
    }

    const ok = await this.passwords.compare(body.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedError("Неверный email или пароль");
    }

    const token = this.tokens.sign({ sub: user.id, email: user.email, role: user.role });
    return { user: toPublicUser(user), token };
  }

  async getProfile(userId: string): Promise<PublicUser> {
    const user = await this.users.findById(userId);
    if (!user) {
      throw new NotFoundError("Пользователь не найден");
    }
    return toPublicUser(user);
  }
}
