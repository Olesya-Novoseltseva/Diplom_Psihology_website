import type { ApiClient } from "./ApiClient.js";

export type PublicUserDto = {
  id: string;
  email: string;
  createdAt: string;
};

export type AuthPayload = {
  user: PublicUserDto;
  token: string;
};

/**
 * Инкапсулирует вызовы REST API аутентификации (Single Responsibility).
 */
export class AuthApiService {
  constructor(private readonly http: ApiClient) {}

  register(email: string, password: string): Promise<AuthPayload> {
    return this.http.postJson<AuthPayload>("/api/auth/register", { email, password });
  }

  login(email: string, password: string): Promise<AuthPayload> {
    return this.http.postJson<AuthPayload>("/api/auth/login", { email, password });
  }

  me(): Promise<{ user: PublicUserDto }> {
    return this.http.getJson<{ user: PublicUserDto }>("/api/auth/me");
  }
}
