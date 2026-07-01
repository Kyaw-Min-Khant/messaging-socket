import { createAuthMiddleware } from "@app/shared-auth";

// This service has no local user store — the JWT claims (userId/email/username)
// are attached to req.user directly, with no Redis/DB hydration step.
export const auth = createAuthMiddleware({ jwtSecret: process.env.JWT_SECRET! });
