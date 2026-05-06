import { describe, expect, it, vi } from "vitest";
import type { IUserRepository } from "../../domain/repositories/IUserRepository.js";
import type { IPasswordHasher } from "../../domain/services/IPasswordHasher.js";
import type { ITokenService } from "../../domain/services/ITokenService.js";
import { ConflictError, NotFoundError, UnauthorizedError } from "../../domain/errors/HttpError.js";
import { AuthService } from "./AuthService.js";

function createSut(overrides?: {
  users?: Partial<IUserRepository>;
  passwords?: Partial<IPasswordHasher>;
  tokens?: Partial<ITokenService>;
}) {
  const users: IUserRepository = {
    findByEmail: vi.fn().mockResolvedValue(null),
    findById: vi.fn().mockResolvedValue(null),
    create: vi.fn(),
    ...overrides?.users,
  };
  const passwords: IPasswordHasher = {
    hash: vi.fn().mockResolvedValue("hashed"),
    compare: vi.fn().mockResolvedValue(true),
    ...overrides?.passwords,
  };
  const tokens: ITokenService = {
    sign: vi.fn().mockReturnValue("jwt-token"),
    verify: vi.fn(),
    ...overrides?.tokens,
  };
  return { service: new AuthService(users, passwords, tokens), users, passwords, tokens };
}

describe("AuthService", () => {
  it("регистрирует пользователя и возвращает токен", async () => {
    const createdAt = new Date();
    const created = {
      id: "u1",
      email: "a@b.ru",
      passwordHash: "hashed",
      createdAt,
    };
    const { service, users, passwords, tokens } = createSut({
      users: {
        create: vi.fn().mockResolvedValue(created),
      },
    });

    const result = await service.register({ email: "A@B.RU", password: "password123" });

    expect(users.findByEmail).toHaveBeenCalledWith("a@b.ru");
    expect(passwords.hash).toHaveBeenCalledWith("password123");
    expect(users.create).toHaveBeenCalledWith({ email: "a@b.ru", passwordHash: "hashed" });
    expect(tokens.sign).toHaveBeenCalledWith({ sub: "u1", email: "a@b.ru" });
    expect(result.token).toBe("jwt-token");
    expect(result.user).toEqual({ id: "u1", email: "a@b.ru", createdAt });
  });

  it("при дубликате email выбрасывает ConflictError", async () => {
    const existing = {
      id: "u1",
      email: "a@b.ru",
      passwordHash: "x",
      createdAt: new Date(),
    };
    const { service } = createSut({
      users: {
        findByEmail: vi.fn().mockResolvedValue(existing),
      },
    });

    await expect(service.register({ email: "a@b.ru", password: "password123" })).rejects.toBeInstanceOf(
      ConflictError,
    );
  });

  it("при логине с неверным паролем выбрасывает UnauthorizedError", async () => {
    const user = {
      id: "u1",
      email: "a@b.ru",
      passwordHash: "hashed",
      createdAt: new Date(),
    };
    const { service } = createSut({
      users: { findByEmail: vi.fn().mockResolvedValue(user) },
      passwords: { compare: vi.fn().mockResolvedValue(false) },
    });

    await expect(service.login({ email: "a@b.ru", password: "wrong" })).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
  });

  it("возвращает профиль по id", async () => {
    const user = {
      id: "u1",
      email: "a@b.ru",
      passwordHash: "hashed",
      createdAt: new Date(),
    };
    const { service, users } = createSut({
      users: { findById: vi.fn().mockResolvedValue(user) },
    });

    const profile = await service.getProfile("u1");
    expect(users.findById).toHaveBeenCalledWith("u1");
    expect(profile).toEqual({ id: "u1", email: "a@b.ru", createdAt: user.createdAt });
  });

  it("если пользователь не найден — NotFoundError", async () => {
    const { service } = createSut();
    await expect(service.getProfile("missing")).rejects.toBeInstanceOf(NotFoundError);
  });
});
