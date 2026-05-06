export type AuthTokenPayload = {
  sub: string;
  email: string;
};

export interface ITokenService {
  sign(payload: AuthTokenPayload): string;
  verify(token: string): AuthTokenPayload;
}
