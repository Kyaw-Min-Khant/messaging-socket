class CustomError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

class UnauthorizedError extends CustomError {
  constructor(message = "Unauthorized") {
    super(message, 401);
  }
}
class ValidationError extends CustomError {
  constructor(message = "Invalid request data") {
    super(message, 400);
  }
}

export { UnauthorizedError, CustomError, ValidationError };
