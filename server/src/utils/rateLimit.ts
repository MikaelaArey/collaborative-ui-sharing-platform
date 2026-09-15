import type { NextFunction, Request, Response } from "express";

/**
 * Minimal in-memory fixed-window rate limiter. Fine for a single-process v1 deployment
 * (see docs/03-architecture.md for the multi-instance upgrade path).
 */
export function rateLimit(options: { windowMs: number; max: number; keyFn?: (req: Request) => string }) {
  const hits = new Map<string, { count: number; resetAt: number }>();

  return (req: Request, res: Response, next: NextFunction) => {
    const key = options.keyFn ? options.keyFn(req) : req.ip ?? "unknown";
    const now = Date.now();
    const entry = hits.get(key);

    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + options.windowMs });
      return next();
    }

    if (entry.count >= options.max) {
      res.status(429).json({ error: "Too many requests, please slow down." });
      return;
    }

    entry.count += 1;
    next();
  };
}

/** Simple token-bucket-ish limiter for use inside a long-lived WebSocket connection. */
export class ConnectionRateLimiter {
  private count = 0;
  private windowStart = Date.now();

  constructor(private readonly maxPerWindow: number, private readonly windowMs: number) {}

  allow(): boolean {
    const now = Date.now();
    if (now - this.windowStart > this.windowMs) {
      this.windowStart = now;
      this.count = 0;
    }
    this.count += 1;
    return this.count <= this.maxPerWindow;
  }
}
