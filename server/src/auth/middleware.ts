import type { NextFunction, Request, Response } from "express";
import { verifyToken } from "./jwt.js";

export interface AuthedRequest extends Request {
  user?: { userId: string; email: string };
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;

  if (!token) {
    res.status(401).json({ error: "Missing bearer token." });
    return;
  }

  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: "Invalid or expired token." });
    return;
  }

  req.user = payload;
  next();
}
