export {};

declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: string;
        email: string;
        role: "USER" | "ADMIN";
      };
    }

    interface Locals {
      requestId?: string;
    }
  }
}
