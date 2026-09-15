import { describe, expect, it, beforeAll } from "vitest";

beforeAll(() => {
  process.env.JWT_SECRET = "test-secret-for-unit-tests";
});

describe("jwt sign/verify", () => {
  it("round-trips a valid token", async () => {
    const { signToken, verifyToken } = await import("../src/auth/jwt.js");
    const token = signToken({ userId: "user_1", email: "a@example.com" });
    const payload = verifyToken(token);
    expect(payload?.userId).toBe("user_1");
    expect(payload?.email).toBe("a@example.com");
  });

  it("rejects a garbage token", async () => {
    const { verifyToken } = await import("../src/auth/jwt.js");
    expect(verifyToken("not-a-real-token")).toBeNull();
  });

  it("rejects a token signed with a different secret", async () => {
    const jwt = await import("jsonwebtoken");
    const bad = jwt.default.sign({ userId: "x", email: "x@example.com" }, "wrong-secret");
    const { verifyToken } = await import("../src/auth/jwt.js");
    expect(verifyToken(bad)).toBeNull();
  });
});
