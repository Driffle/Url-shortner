import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  hostFromHeaderBag,
  isAllowedAppHost,
  normalizeAppHost,
  parseAllowedAppHosts,
} from "./app-host";
import { googleOAuthCallbackUrlForHost, isMultiHostOAuthEnabled } from "./google-oauth-callback";

describe("app-host", () => {
  it("normalizes host with scheme and port", () => {
    assert.equal(normalizeAppHost("https://Driffle.Link:443/path"), "driffle.link");
  });

  it("parses allowlist", () => {
    const set = parseAllowedAppHosts("shortly.driffle.net, driffle.link");
    assert.ok(set?.has("shortly.driffle.net"));
    assert.ok(set?.has("driffle.link"));
    assert.equal(isAllowedAppHost("driffle.link", set), true);
    assert.equal(isAllowedAppHost("evil.com", set), false);
  });

  it("reads x-forwarded-host first", () => {
    const h = hostFromHeaderBag((name) =>
      name === "x-forwarded-host" ? "driffle.link, shortly.driffle.net" : "ignored:8080",
    );
    assert.equal(h, "driffle.link");
  });
});

describe("google OAuth callback", () => {
  it("builds per-host callback URL", () => {
    assert.equal(
      googleOAuthCallbackUrlForHost("driffle.link"),
      "https://driffle.link/api/auth/google/callback",
    );
  });

  it("enables multi-host OAuth when allowlist set", () => {
    const prev = process.env.ALLOWED_APP_HOSTS;
    process.env.ALLOWED_APP_HOSTS = "a.example.com,b.example.com";
    try {
      assert.equal(isMultiHostOAuthEnabled(), true);
    } finally {
      if (prev === undefined) delete process.env.ALLOWED_APP_HOSTS;
      else process.env.ALLOWED_APP_HOSTS = prev;
    }
  });
});
