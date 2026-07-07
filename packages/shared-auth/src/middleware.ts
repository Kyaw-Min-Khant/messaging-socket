import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { verifyToken, extractTokenFromCookieHeader } from "./jwt";
import { AuthenticatedUser, JwtPayload } from "./types";

export interface AuthMiddlewareOptions {
  jwtSecret: string;
  /**
   * Optional hook for services that need to hydrate the claims into a full
   * user record (e.g. auth-service resolving from Redis/Mongo). Services with
   * no local user store (e.g. expense-service) omit this and get the raw
   * JWT claims attached to req.user directly.
   */
  resolveUser?: (payload: JwtPayload) => Promise<AuthenticatedUser | null>;
}

export function createAuthMiddleware(options: AuthMiddlewareOptions) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const cookieToken = (
        req as Request & { cookies?: Record<string, string> }
      ).cookies?.token;

      // Fallback: accept Bearer token from Authorization header (used by Swagger UI / API clients)
      const bearerToken = req.headers.authorization?.startsWith("Bearer ")
        ? req.headers.authorization.slice(7)
        : undefined;

      const token = cookieToken ?? bearerToken;

      if (!token) {
        return res.status(401).json({
          success: false,
          error: "Access denied. No token provided.",
        });
      }

      const decoded = verifyToken(token, options.jwtSecret);

      if (options.resolveUser) {
        const user = await options.resolveUser(decoded);
        if (!user) {
          return res
            .status(401)
            .json({ success: false, error: "User not found." });
        }
        req.user = user;
        return next();
      }

      req.user = decoded as AuthenticatedUser;
      return next();
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return res
          .status(401)
          .json({ success: false, error: "Token expired." });
      }
      if (error instanceof jwt.JsonWebTokenError) {
        return res
          .status(401)
          .json({ success: false, error: "Invalid token." });
      }
      return next(error);
    }
  };
}

export function createInternalAuthMiddleware(internalSecret: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const provided = req.header("x-internal-secret");
    if (!provided || provided !== internalSecret) {
      return res.status(403).json({ success: false, error: "Forbidden." });
    }
    return next();
  };
}

/**
 * Socket.IO handshake auth — reuses the same cookie-parsing + JWT verify
 * logic as the Express middleware above, so services no longer need a
 * second, drifted implementation of token extraction for real-time connections.
 */
export function verifySocketToken(
  handshake: { headers: { cookie?: string }; auth?: { token?: string } },
  jwtSecret: string,
): JwtPayload {
  const cookieToken = extractTokenFromCookieHeader(handshake.headers.cookie);
  const token = cookieToken ?? handshake.auth?.token;
  if (!token) {
    throw new Error("No token provided.");
  }
  return verifyToken(token, jwtSecret);
}
