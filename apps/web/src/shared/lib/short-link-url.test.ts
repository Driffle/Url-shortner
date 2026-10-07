import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { publicInstantShortUrl, publicShortUrl } from "./short-link-url";

describe("publicShortUrl", () => {
  it("uses request host when provided", () => {
    assert.equal(publicShortUrl("abc", "driffle.link"), "https://driffle.link/go/abc");
    assert.equal(
      publicShortUrl("abc", "shortly.driffle.net"),
      "https://shortly.driffle.net/go/abc",
    );
  });

  it("uses instant /r/ path", () => {
    assert.equal(publicInstantShortUrl("x", "driffle.link"), "https://driffle.link/r/x");
  });

  it("falls back to env host when request host omitted", () => {
    const prev = process.env.SHORT_LINK_HOST;
    process.env.SHORT_LINK_HOST = "fallback.example.com";
    try {
      assert.equal(publicShortUrl("s"), "https://fallback.example.com/go/s");
    } finally {
      if (prev === undefined) delete process.env.SHORT_LINK_HOST;
      else process.env.SHORT_LINK_HOST = prev;
    }
  });
});
