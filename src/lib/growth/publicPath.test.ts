import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  resolveGrowthPublicSlug,
  suggestGrowthPublicSlug,
  validateGrowthPublicSlug,
  vendorCampaignPublicPath,
  vendorFunnelPublicPath,
} from "@/lib/growth/publicPath";

describe("growth publicPath", () => {
  it("suggests a slug from the funnel name", () => {
    assert.equal(suggestGrowthPublicSlug("Garden Consultation"), "garden-consultation");
  });

  it("fills a blank URL from the name", () => {
    const result = resolveGrowthPublicSlug("", "Are You Growing Your Own Food?");
    assert.deepEqual(result, { ok: true, slug: "are-you-growing-your-own-food" });
  });

  it("rejects reserved and cuid-shaped values", () => {
    assert.equal(validateGrowthPublicSlug("new").ok, false);
    assert.equal(validateGrowthPublicSlug("cm4xabcdefghijklmnopqrstuv").ok, false);
  });

  it("builds vendor-scoped funnel and campaign paths", () => {
    assert.equal(
      vendorFunnelPublicPath("urban-roots", "garden-consultation"),
      "/urban-roots/funnels/garden-consultation",
    );
    assert.equal(
      vendorCampaignPublicPath("urban-roots", "spring-sale"),
      "/urban-roots/campaigns/spring-sale",
    );
  });
});
