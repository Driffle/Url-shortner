import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { assertSafeDestination, isDestinationHostBlocked } from "@/server/services/url-safety";

describe("url-safety", () => {
  it("allows public https destinations", () => {
    assert.doesNotThrow(() => assertSafeDestination("https://driffle.com/product/1"));
  });

  it("blocks localhost and private IPv4", () => {
    assert.throws(() => assertSafeDestination("http://127.0.0.1/admin"));
    assert.throws(() => assertSafeDestination("http://10.0.0.1/internal"));
    assert.throws(() => assertSafeDestination("http://192.168.1.1/"));
    assert.throws(() => assertSafeDestination("http://169.254.169.254/latest/meta-data"));
  });

  it("blocks IPv6 loopback and ULA", () => {
    assert.equal(isDestinationHostBlocked("::1"), true);
    assert.equal(isDestinationHostBlocked("fe80::1"), true);
    assert.equal(isDestinationHostBlocked("fd12:3456:789a:1::1"), true);
  });

  it("blocks metadata hostnames", () => {
    assert.throws(() => assertSafeDestination("http://metadata.google.internal/"));
  });

  it("rejects non-http(s) schemes and embedded credentials", () => {
    assert.throws(() => assertSafeDestination("file:///etc/passwd"));
    assert.throws(() => assertSafeDestination("https://user:pass@example.com/"));
  });
});
