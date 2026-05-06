export {};

declare global {
  namespace Express {
    interface Request {
      auth?: {
        userId: string;
        email: string;
      };
    }

    interface Locals {
      requestId?: string;
    }
  }
}
