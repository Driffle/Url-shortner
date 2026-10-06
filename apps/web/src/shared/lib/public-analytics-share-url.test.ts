import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { publicAnalyticsSharePath, publicAnalyticsShareUrl } from "@/shared/lib/public-analytics-share-url";
import { resolveAnalyticsRange } from "@/shared/lib/analytics-date-range";

describe("publicAnalyticsShareUrl", () => {
  it("builds path with slug in URL segment only", () => {
    const range = resolveAnalyticsRange({ range: "7d" });
    assert.equal(range.ok, true);
    if (!range.ok) return;
    const path = publicAnalyticsSharePath("My-Slug", range.value);
    assert.match(path, /^\/share\/analytics\/my-slug\?range=7d$/);
    assert.doesNotMatch(path, /slug=/);
  });

  it("builds absolute share URL", () => {
    const range = resolveAnalyticsRange({ range: "30d" });
    assert.equal(range.ok, true);
    if (!range.ok) return;
    const url = publicAnalyticsShareUrl("abc", range.value, "https://shortly.driffle.net");
    assert.equal(url, "https://shortly.driffle.net/share/analytics/abc?range=30d");
  });
});
