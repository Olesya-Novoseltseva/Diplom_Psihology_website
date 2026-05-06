export class HttpError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: string,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ConflictError extends HttpError {
  constructor(message: string) {
    super(message, 409, "CONFLICT");
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message: string) {
    super(message, 401, "UNAUTHORIZED");
  }
}

export class NotFoundError extends HttpError {
  constructor(message: string) {
    super(message, 404, "NOT_FOUND");
  }
}

export class BadRequestError extends HttpError {
  constructor(message: string) {
    super(message, 400, "BAD_REQUEST");
  }
}
