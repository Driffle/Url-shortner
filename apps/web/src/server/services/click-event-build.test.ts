import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildClickEventEnvelope, visitorHash } from "@/server/services/click-event-build";
import { clickEventEnvelopeSchema } from "@/shared/validations/click-event";

process.env.DATABASE_URL =
  "postgresql://postgres:postgres@127.0.0.1:5432/driffle_links?schema=public";
process.env.NEXTAUTH_SECRET = "01234567890123456789012345678901";
process.env.REDIS_URL = "redis://127.0.0.1:6379";
process.env.REDIS_KEY_PREFIX = "dl";
process.env.NEXTAUTH_URL = "http://127.0.0.1:3000";
process.env.PUBLIC_APP_URL = "http://127.0.0.1:3000";
process.env.GOOGLE_CLIENT_ID = "test-client";
process.env.GOOGLE_CLIENT_SECRET = "test-secret";

describe("click-event-build", () => {
  it("builds a valid envelope with stable visitor hash for same day", () => {
    const at = new Date("2026-10-06T12:00:00.000Z");
    const a = buildClickEventEnvelope({
      linkId: "link1",
      ip: "1.2.3.4",
      userAgent: "Mozilla/5.0",
      referer: "https://google.com/search",
      countryCode: "de",
      at,
      eventId: "evt-1",
    });
    const b = buildClickEventEnvelope({
      linkId: "link1",
      ip: "1.2.3.4",
      userAgent: "Mozilla/5.0",
      referer: "https://google.com/search",
      countryCode: "de",
      at,
      eventId: "evt-2",
    });
    clickEventEnvelopeSchema.parse(a);
    assert.equal(a.visitorHash, b.visitorHash);
    assert.equal(a.referrerDomain, "google.com");
    assert.equal(a.deviceType, "desktop");
  });

  it("visitorHash changes when day bucket changes", () => {
    const h1 = visitorHash("1.1.1.1", "ua", "2026-10-06");
    const h2 = visitorHash("1.1.1.1", "ua", "2026-10-07");
    assert.notEqual(h1, h2);
  });
});
