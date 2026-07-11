#!/usr/bin/env node
/**
 * Brand icon PNGs from Syntha often ship with opaque black backgrounds (no alpha).
 * This script knocks out near-black pixels so icons render on warm UI plates.
 *
 * Usage: node scripts/process-brand-icons.mjs
 */
import fs from "node:fs";
import sharp from "sharp";

/** Explore / Pulse icons — knock out flat black plates behind artwork. */
const ICON_BLACK_THRESHOLD = 48;
/** RootSync infinity — only pure black hole fills; stroke is dark brown (~45–55). */
const SYMBOL_BLACK_THRESHOLD = 18;

const jobs = [
  {
    threshold: ICON_BLACK_THRESHOLD,
    files: [
      "public/images/platform/explore/icons/discover-marketplace-icon.png",
      "public/images/platform/explore/icons/rootsense-ai-icon.png",
      "public/images/platform/explore/icons/stay-synced-icon.png",
      "public/images/pulse/pulse-icon.png",
    ],
  },
  {
    threshold: SYMBOL_BLACK_THRESHOLD,
    files: [
      "public/images/brand/rootsync-platform-symbol.png",
      "public/rootsync-symbol.png",
    ],
  },
];

async function knockOutBlackBackground(file, threshold) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  for (let i = 0; i < data.length; i += channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (Math.max(r, g, b) <= threshold) {
      data[i + 3] = 0;
    }
  }
  const tmp = `${file}.tmp`;
  await sharp(data, { raw: { width, height, channels: 4 } }).png().toFile(tmp);
  fs.renameSync(tmp, file);
  console.log("processed", file, `(threshold ${threshold})`);
}

for (const job of jobs) {
  for (const file of job.files) {
    await knockOutBlackBackground(file, job.threshold);
  }
}
