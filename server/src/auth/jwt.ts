import jwt from "jsonwebtoken";
import { env } from "../env.js";

export interface AuthTokenPayload {
  userId: string;
  email: string;
}

const EXPIRES_IN = "7d";

export function signToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: EXPIRES_IN });
}

export function verifyToken(token: string): AuthTokenPayload | null {
  try {
    return jwt.verify(token, env.jwtSecret) as AuthTokenPayload;
  } catch {
    return null;
  }
}
