import { describe, it, after, before } from "node:test";
import assert from "node:assert/strict";

describe("getRedis singleton", () => {
  before(() => {
    process.env.NODE_ENV = "production";
    process.env.DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:5432/driffle_links";
    process.env.REDIS_URL = process.env.REDIS_URL ?? "redis://127.0.0.1:6379";
    process.env.NEXTAUTH_URL = process.env.NEXTAUTH_URL ?? "http://127.0.0.1:3000";
    process.env.PUBLIC_APP_URL = process.env.PUBLIC_APP_URL ?? "http://127.0.0.1:3000";
    process.env.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET ?? "01234567890123456789012345678901";
  });

  it("returns the same client instance across calls in production", async () => {
    const { getRedis } = await import("@/server/redis/client");
    const a = getRedis();
    const b = getRedis();
    assert.equal(a, b);
  });

  after(async () => {
    const { getRedis } = await import("@/server/redis/client");
    try {
      getRedis().disconnect();
    } catch {
      // ignore
    }
  });
});
