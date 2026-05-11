import type { UserRecord } from "../entities/user.types.js";

export type CreateUserInput = {
  email: string;
  passwordHash: string;
  role?: "USER" | "ADMIN";
};

export interface IUserRepository {
  findByEmail(email: string): Promise<UserRecord | null>;
  findById(id: string): Promise<UserRecord | null>;
  create(input: CreateUserInput): Promise<UserRecord>;
}
