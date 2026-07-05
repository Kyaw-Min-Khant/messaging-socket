export interface JwtPayload {
  userId: string;
  email: string;
  username: string;
  avatar?: string;
}

export type AuthenticatedUser = JwtPayload & Record<string, unknown>;

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}
