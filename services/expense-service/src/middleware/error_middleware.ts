import { Prisma } from "@prisma/client";
import { createErrorHandler, MappedError } from "@app/shared-errors";

function mapPrismaError(err: unknown): MappedError | null {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") {
      const target = (err.meta?.target as string[] | undefined)?.join(", ") ?? "field";
      return { statusCode: 409, message: `${target} already exists.` };
    }
    if (err.code === "P2025") {
      return { statusCode: 404, message: "Record not found." };
    }
    if (err.code === "P2003") {
      return { statusCode: 400, message: "Invalid reference." };
    }
  }
  if (err instanceof Prisma.PrismaClientValidationError) {
    return { statusCode: 400, message: "Invalid request data." };
  }
  return null;
}

export const errorHandler = createErrorHandler(mapPrismaError);
