import { NextFunction, Request, Response } from "express";

/**
 * Rejects requests that did not arrive through the gateway.
 *
 * The monolith is `type: web` on Render (private services are not on the free
 * plan), so it has a public URL. This guard is what makes the gateway an
 * actual trust boundary rather than a convention. It authenticates the
 * *caller*, not the user — JWT verification still runs behind it.
 *
 * NOTE: duplicates createInternalAuthMiddleware in @app/shared-auth. The
 * monolith cannot import that package yet: its types.ts augments
 * Express.Request.user with a shape incompatible with src/types/index.ts, and
 * the root Dockerfile does not copy packages/. Consolidate in Phase 3, once
 * the Request.user augmentations are unified.
 */
export function createInternalOnly(internalSecret: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.header("x-internal-secret") === internalSecret) {
      return next();
    }
    return res.status(403).json({ success: false, error: "Forbidden." });
  };
}
