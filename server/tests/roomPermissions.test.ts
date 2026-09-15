import { describe, expect, it } from "vitest";
import { ConnectionRateLimiter } from "../src/utils/rateLimit.js";

/**
 * The real permission enforcement lives inside realtime/wsServer.ts (effectiveRole /
 * canMutateCanvas), exercised end-to-end via a live WebSocket connection rather than unit-tested
 * in isolation, per docs/05-security-and-permissions.md. These tests cover the rate limiter that
 * protects those code paths from abuse.
 */
describe("ConnectionRateLimiter", () => {
  it("allows messages up to the configured burst limit", () => {
    const limiter = new ConnectionRateLimiter(3, 1000);
    expect(limiter.allow()).toBe(true);
    expect(limiter.allow()).toBe(true);
    expect(limiter.allow()).toBe(true);
    expect(limiter.allow()).toBe(false);
  });

  it("resets the count once the window elapses", async () => {
    const limiter = new ConnectionRateLimiter(1, 20);
    expect(limiter.allow()).toBe(true);
    expect(limiter.allow()).toBe(false);
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(limiter.allow()).toBe(true);
  });
});
