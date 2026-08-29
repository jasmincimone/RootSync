import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { PulsePostMediaItem } from "@/config/pulsePostMedia";
import {
  PAGE_MEDIA_ID,
  addFunnelMedia,
  canMoveFunnelMedia,
  createDefaultFunnelPage,
  listFunnelMedia,
  moveFunnelMedia,
  parseFunnelPageContent,
} from "@/lib/growth/funnelPage";

function image(id: string): PulsePostMediaItem {
  return {
    id,
    type: "image",
    url: `/uploads/pulse-posts/${id}.jpg`,
    fileName: `${id}.jpg`,
  };
}

describe("moveFunnelMedia", () => {
  it("moves a file from the top of the page into the first section", () => {
    let page = createDefaultFunnelPage({ name: "Garden" });
    page = addFunnelMedia(page, image("one"));
    page = addFunnelMedia(page, image("two"));
    page = moveFunnelMedia(page, PAGE_MEDIA_ID, 1, 1);

    assert.deepEqual(page.media.map((item) => item.id), ["one"]);
    assert.deepEqual(page.sections[0].media.map((item) => item.id), ["two"]);
    assert.equal(listFunnelMedia(page)[1].locationLabel, "Hero 1");
  });

  it("lets a single file move down into the next section", () => {
    const page = addFunnelMedia(createDefaultFunnelPage({ name: "Garden" }), image("video"));
    assert.equal(canMoveFunnelMedia(page, PAGE_MEDIA_ID, 0, -1), false);
    assert.equal(canMoveFunnelMedia(page, PAGE_MEDIA_ID, 0, 1), true);

    const moved = moveFunnelMedia(page, PAGE_MEDIA_ID, 0, 1);
    assert.deepEqual(moved.media, []);
    assert.equal(moved.sections[0].media[0]?.id, "video");
  });

  it("moves a file up from a section back to the previous bucket", () => {
    let page = createDefaultFunnelPage({ name: "Garden" });
    const heroId = page.sections[0].id;
    page = addFunnelMedia(page, image("one"), heroId);
    page = moveFunnelMedia(page, heroId, 0, -1);

    assert.deepEqual(page.media.map((item) => item.id), ["one"]);
    assert.deepEqual(page.sections[0].media, []);
  });
});

describe("parseFunnelPageContent theme", () => {
  it("keeps a safe background image URL on the theme", () => {
    const page = parseFunnelPageContent({
      version: 1,
      theme: {
        background: "#F8F4EE",
        textColor: "#342a0f",
        fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
        accent: "#044730",
        backgroundImageUrl: "/uploads/pulse-posts/bg.jpg",
      },
      sections: [],
      ctaHref: "",
      media: [],
    });
    assert.equal(page.theme.backgroundImageUrl, "/uploads/pulse-posts/bg.jpg");
  });

  it("drops unsafe background image URLs", () => {
    const page = parseFunnelPageContent({
      version: 1,
      theme: {
        background: "#F8F4EE",
        textColor: "#342a0f",
        fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
        accent: "#044730",
        backgroundImageUrl: "javascript:alert(1)",
      },
      sections: [],
      ctaHref: "",
      media: [],
    });
    assert.equal(page.theme.backgroundImageUrl, null);
  });
});
