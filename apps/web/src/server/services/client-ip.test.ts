import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { clientIpFromHeaders } from "@/server/services/redirect-resolve.service";

describe("clientIpFromHeaders", () => {
  it("prefers cf-connecting-ip over x-forwarded-for", () => {
    const h = new Headers({
      "cf-connecting-ip": "203.0.113.10",
      "x-forwarded-for": "198.51.100.1, 10.0.0.1",
    });
    assert.equal(clientIpFromHeaders(h), "203.0.113.10");
  });

  it("falls back to first x-forwarded-for hop", () => {
    const h = new Headers({ "x-forwarded-for": "198.51.100.2, 10.0.0.1" });
    assert.equal(clientIpFromHeaders(h), "198.51.100.2");
  });
});
