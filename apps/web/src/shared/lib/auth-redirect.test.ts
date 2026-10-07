import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { authRedirectWithBase, publicOriginFromAppHost, resolveAuthRedirectUrl } from "./auth-redirect";

describe("authRedirectWithBase", () => {
  it("prefixes relative callback paths", () => {
    assert.equal(
      authRedirectWithBase("/dashboard", "https://driffle.link"),
      "https://driffle.link/dashboard",
    );
  });
});

describe("resolveAuthRedirectUrl multi-host", () => {
  it("uses request host instead of NEXTAUTH_URL base", () => {
    const prev = process.env.ALLOWED_APP_HOSTS;
    process.env.ALLOWED_APP_HOSTS = "shortly.driffle.net,driffle.link";
    try {
      assert.equal(
        resolveAuthRedirectUrl("/dashboard", "https://shortly.driffle.net", "driffle.link"),
        "https://driffle.link/dashboard",
      );
      assert.equal(publicOriginFromAppHost("driffle.link"), "https://driffle.link");
    } finally {
      if (prev === undefined) delete process.env.ALLOWED_APP_HOSTS;
      else process.env.ALLOWED_APP_HOSTS = prev;
    }
  });
});
