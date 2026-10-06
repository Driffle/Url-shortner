import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { clickIngestService } from "@/server/services/click-ingest.service";
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

describe("click-ingest.service legacy queue", () => {
  it("parses legacy queue JSON into envelope", () => {
    const raw = JSON.stringify({
      linkId: "link-abc",
      ip: "10.0.0.1",
      userAgent: "TestAgent/1.0",
      referer: "https://example.org/page",
      country: "US",
      at: "2026-10-06T08:00:00.000Z",
    });
    const env = clickIngestService.legacyQueueItemToEnvelope(raw);
    assert.ok(env);
    clickEventEnvelopeSchema.parse(env);
    assert.equal(env!.linkId, "link-abc");
    assert.equal(env!.referrerDomain, "example.org");
  });

  it("returns null for invalid legacy payload", () => {
    assert.equal(clickIngestService.legacyQueueItemToEnvelope("{not-json"), null);
  });
});
