import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { defaultCustomRangeIsoDates, resolveAnalyticsRange } from "@/shared/lib/analytics-date-range";

describe("resolveAnalyticsRange", () => {
  it("resolves 7d preset", () => {
    const r = resolveAnalyticsRange({ range: "7d" });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.value.preset, "7d");
    assert.equal(r.value.label, "Last 7 days");
  });

  it("rejects invalid custom without dates", () => {
    const r = resolveAnalyticsRange({ range: "custom" });
    assert.equal(r.ok, false);
  });

  it("accepts custom range", () => {
    const r = resolveAnalyticsRange({ range: "custom", from: "2026-10-01", to: "2026-10-06" });
    assert.equal(r.ok, true);
  });

  it("defaultCustomRangeIsoDates returns 30-day inclusive window", () => {
    const { from, to } = defaultCustomRangeIsoDates();
    assert.match(from, /^\d{4}-\d{2}-\d{2}$/);
    assert.match(to, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(from <= to);
  });
});
