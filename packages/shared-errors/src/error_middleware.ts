import { NextFunction, Request, Response } from "express";
import { CustomError } from "./custom_error_service";

export interface MappedError {
  statusCode: number;
  message: string;
}

export type OrmErrorMapper = (err: unknown) => MappedError | null;

/**
 * Base error handler shared by every service. Each service supplies its own
 * ORM-specific mapper (Mongoose CastError/ValidationError/11000 for
 * Mongo-backed services, Prisma P2002/P2025/P2003 for expense-service) so
 * the CustomError-handling contract stays identical everywhere.
 */
export function createErrorHandler(ormMapper?: OrmErrorMapper) {
  return (err: Error, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof CustomError) {
      return res.status(err.statusCode).json({
        success: false,
        message: err.message,
      });
    }

    if (ormMapper) {
      const mapped = ormMapper(err);
      if (mapped) {
        return res.status(mapped.statusCode).json({
          success: false,
          message: mapped.message,
        });
      }
    }

    console.error("UNHANDLED ERROR", err);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  };
}
