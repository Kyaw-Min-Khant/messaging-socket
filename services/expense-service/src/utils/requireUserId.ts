import { Request } from "express";
import { UnauthorizedError } from "@app/shared-errors";

export function requireUserId(req: Request): string {
  if (!req.user?.userId) {
    throw new UnauthorizedError("User not authenticated");
  }
  return req.user.userId;
}
