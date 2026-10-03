import { NextFunction, Request, RequestHandler, Response } from "express";

/** Forwards rejected promises to the error middleware. */
export const asyncHandler =
  (fn: (req: Request, res: Response) => Promise<unknown>): RequestHandler =>
  (req: Request, res: Response, next: NextFunction) => {
    fn(req, res).catch(next);
  };
