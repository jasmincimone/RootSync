import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { wrapCampaignEmail, plainTextToCampaignHtml } from "@/lib/growth/campaignMessage";
import { absoluteCampaignUrl } from "@/lib/growth/campaignDestinations";
import {
  isHttpUrl,
  parseAudienceJson,
  withCampaignQuery,
  isCampaignObjective,
} from "@/lib/growth/campaignTypes";
import { defaultAudienceForObjective } from "@/lib/growth/campaignAudience";
import { GROWTH_CAMPAIGN_AUDIENCE, GROWTH_CONTACT_STATUS } from "@/lib/growth/roles";

describe("campaign types", () => {
  it("parses audience json and unique contact ids", () => {
    const parsed = parseAudienceJson({
      status: "CUSTOMER",
      contactIds: ["a", "a", "", 3],
    });
    assert.equal(parsed.status, "CUSTOMER");
    assert.deepEqual(parsed.contactIds, ["a"]);
  });

  it("accepts known objectives only", () => {
    assert.equal(isCampaignObjective("BOOKINGS"), true);
    assert.equal(isCampaignObjective("not-real"), false);
  });

  it("appends opaque campaign query params", () => {
    assert.equal(
      withCampaignQuery("https://example.com/funnel", "abc"),
      "https://example.com/funnel?rs_c=abc",
    );
  });

  it("validates http urls", () => {
    assert.equal(isHttpUrl("https://rootsync.io/x"), true);
    assert.equal(isHttpUrl("javascript:alert(1)"), false);
  });
});

describe("campaign audience defaults", () => {
  it("suggests customers for winback and leads for lead gen", () => {
    assert.deepEqual(defaultAudienceForObjective("WINBACK"), {
      audienceType: GROWTH_CAMPAIGN_AUDIENCE.STATUS,
      audienceJson: { status: GROWTH_CONTACT_STATUS.CUSTOMER },
    });
    assert.deepEqual(defaultAudienceForObjective("LEADS"), {
      audienceType: GROWTH_CAMPAIGN_AUDIENCE.STATUS,
      audienceJson: { status: GROWTH_CONTACT_STATUS.NEW_LEAD },
    });
  });
});

describe("campaign email wrap", () => {
  it("includes unsubscribe, CTA, and open pixel", () => {
    const html = wrapCampaignEmail({
      origin: "https://example.com",
      trackingToken: "token",
      subject: "Hello",
      previewText: "Preview",
      headline: "Headline",
      bodyHtml: "<p>Body</p>",
      ctaLabel: "Book now",
      clickUrl: "https://example.com/go",
      unsubscribeUrl: "https://example.com/u/token",
      openPixelUrl: "https://example.com/pixel.gif",
      senderName: "Urban Roots",
    });
    assert.match(html, /Book now/);
    assert.match(html, /Unsubscribe/);
    assert.match(html, /pixel\.gif/);
    assert.match(html, /Headline/);
  });

  it("turns plain text into paragraphs", () => {
    assert.equal(plainTextToCampaignHtml("Hi\n\nThere"), "<p>Hi</p><p>There</p>");
  });
});

describe("campaign destinations", () => {
  it("makes relative funnel paths absolute", () => {
    assert.equal(
      absoluteCampaignUrl("/garden/funnels/consult", "https://rootsync.io"),
      "https://rootsync.io/garden/funnels/consult",
    );
    assert.equal(
      absoluteCampaignUrl("https://example.com", "https://rootsync.io"),
      "https://example.com",
    );
  });
});
