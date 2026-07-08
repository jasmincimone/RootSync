import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const src =
  process.argv[2] ??
  path.join(
    process.env.HOME ?? "",
    ".cursor/projects/Users-jasmincimone-TheFixCollective/assets/RootSync.Symbol-b64c3c29-d7bf-4e4c-8212-5aa98665869a.png",
  );

const targets = ["public/rootsync-symbol.png"];

function isEdgeBlack(r, g, b) {
  return r <= 40 && g <= 40 && b <= 40;
}

function floodFillBackground(data, w, h) {
  const visited = new Uint8Array(w * h);
  const queue = [];

  const trySeed = (x, y) => {
    const idx = y * w + x;
    const i = idx * 4;
    if (isEdgeBlack(data[i], data[i + 1], data[i + 2])) queue.push(idx);
  };

  for (let x = 0; x < w; x++) {
    trySeed(x, 0);
    trySeed(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    trySeed(0, y);
    trySeed(w - 1, y);
  }

  while (queue.length) {
    const idx = queue.pop();
    if (visited[idx]) continue;
    visited[idx] = 1;
    const i = idx * 4;
    if (!isEdgeBlack(data[i], data[i + 1], data[i + 2])) continue;
    data[i + 3] = 0;
    const x = idx % w;
    const y = (idx - x) / w;
    if (x > 0) queue.push(idx - 1);
    if (x < w - 1) queue.push(idx + 1);
    if (y > 0) queue.push(idx - w);
    if (y < h - 1) queue.push(idx + w);
  }
}

async function processFile(out) {
  const meta = await sharp(src).metadata();
  const outPath = path.join(root, out);

  if (meta.hasAlpha) {
    await sharp(src).png({ compressionLevel: 9, palette: false, effort: 10 }).toFile(outPath);
    return;
  }

  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  floodFillBackground(data, info.width, info.height);
  await sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png({ compressionLevel: 9, palette: false, effort: 10 })
    .toFile(outPath);
}

for (const target of targets) {
  await processFile(target);
  console.log("wrote", target);
}
