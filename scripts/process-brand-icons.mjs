#!/usr/bin/env node
/**
 * Brand icon PNGs from Syntha often ship with opaque black backgrounds (no alpha).
 * This script knocks out near-black pixels so icons render on warm UI plates.
 *
 * Usage: node scripts/process-brand-icons.mjs
 */
import fs from "node:fs";
import sharp from "sharp";

const BLACK_THRESHOLD = 48;

const files = [
  "public/images/platform/explore/icons/discover-marketplace-icon.png",
  "public/images/platform/explore/icons/rootsense-ai-icon.png",
  "public/images/platform/explore/icons/stay-synced-icon.png",
  "public/images/pulse/pulse-icon.png",
];

async function knockOutBlackBackground(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  for (let i = 0; i < data.length; i += channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (r <= BLACK_THRESHOLD && g <= BLACK_THRESHOLD && b <= BLACK_THRESHOLD) {
      data[i + 3] = 0;
    }
  }
  const tmp = `${file}.tmp`;
  await sharp(data, { raw: { width, height, channels: 4 } }).png().toFile(tmp);
  fs.renameSync(tmp, file);
  console.log("processed", file);
}

for (const file of files) {
  await knockOutBlackBackground(file);
}
