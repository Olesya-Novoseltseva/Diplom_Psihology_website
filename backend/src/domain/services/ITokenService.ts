export type AuthTokenPayload = {
  sub: string;
  email: string;
  role: "USER" | "ADMIN";
};

export interface ITokenService {
  sign(payload: AuthTokenPayload): string;
  verify(token: string): AuthTokenPayload;
}
