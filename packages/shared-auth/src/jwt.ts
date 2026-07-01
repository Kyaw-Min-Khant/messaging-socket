import jwt from "jsonwebtoken";
import { JwtPayload } from "./types";

export function verifyToken(token: string, secret: string): JwtPayload {
  return jwt.verify(token, secret) as JwtPayload;
}

export function extractTokenFromCookieHeader(
  cookieHeader: string | undefined,
): string | undefined {
  if (!cookieHeader) return undefined;
  const match = cookieHeader.match(/(?:^|;\s*)token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : undefined;
}
