/**
 * Mix & Match Seed Packs grow guides (The Fix Urban Roots).
 * Public page: /seed-pack-grow-guides
 * Images prefer the listing’s Seed Type option photos when labels match.
 * Culture notes adapted from Johnny’s Selected Seeds variety info for booth/QR use.
 */

export const SEED_PACK_LISTING_PUBLIC_SLUG = "seed-packs";
export const SEED_PACK_GROW_GUIDE_PATH = "/seed-pack-grow-guides";

export type SeedPackGrowGuide = {
  id: string;
  /** Labels that may appear on the listing option values */
  matchLabels: string[];
  name: string;
  summary: string;
  /** Fallback if listing has no option image yet */
  imageUrl?: string | null;
  sow: string;
  light: string;
  water: string;
  harvest: string;
  tips: string[];
};

export const SEED_PACK_GROW_GUIDES: SeedPackGrowGuide[] = [
  {
    id: "seychelles-pole-bean",
    matchLabels: [
      "Organic Seychelles Pole Green Bean",
      "Seychelles Pole Green Bean",
      "Seychelles",
      "Green Bean",
    ],
    name: "Seychelles Pole Green Bean",
    summary:
      "Early, vigorous organic pole snap bean (Phaseolus vulgaris). Easy-to-harvest clusters of dark green, stringless 5–6\" pods; AAS Winner. About 55 days to maturity.",
    sow: "Direct sow after soil is warmer than 60°F (16°C). Plant 1\" deep, 3\" apart in rows about 4' apart — or 4–6 seeds at the base of each pole. Provide a trellis; this is a climbing pole bean. A bean inoculant can help yields.",
    light: "Full sun.",
    water: "Keep soil evenly moist once plants are growing and flowering. Good airflow around foliage helps plants stay healthier.",
    harvest:
      "Harvest regularly to encourage new pod set. Pods are slow to develop seeds, which extends the picking window. Store harvested beans at about 40°F (5°C) and high humidity for 7–10 days.",
    tips: [
      "Requires trellising — set supports at planting.",
      "Intermediate resistance to anthracnose and some races of bean mosaic virus.",
      "In fall, remove or compost bean debris; rotate crops (ideally into corn or grain) to reduce disease pressure.",
      "Wider spacing helps leaves and soil dry — useful against white mold.",
    ],
  },
  {
    id: "sweet-thai-basil",
    matchLabels: ["Sweet Thai Basil", "Thai Basil", "Basil"],
    name: "Sweet Thai Basil",
    summary:
      "Authentic Thai basil (Ocimum basilicum) with spicy anise/clove flavor — “Horapha” / “Hun Que.” About 2\" green leaves, purple stems and blooms; plants 16–20\" tall. ~64 days.",
    sow: "Direct seed: sow ¼\" deep, 2–3 seeds per inch, rows 18\" apart; firm soil over seed. Final spacing 4–8\" apart. Or transplant: start indoors ~6 weeks before setting out at 70°F (21°C); move outdoors with 3–4 leaf sets. Germination typically 5–10 days at 65–70°F.",
    light: "Full sun.",
    water:
      "Needs moderately rich, moist soil and regular moisture all season. Not drought tolerant — heat stress and dry soil can damage plants.",
    harvest:
      "Begin light picking once plants are established (early morning is best). For a full cut, harvest just before flowering and cut plants 4–6\" above the ground for a second flush. Handle leaves gently — they bruise easily. Do not store below 50°F (10°C).",
    tips: [
      "Flowers are edible — intense spicy basil with clove and anise notes; great as a garnish.",
      "Use in any recipe that calls for basil, or to finish drinks, salads, soups, and desserts.",
      "If you used pelleted seed, keep soil consistently moist during germination and store unused pellets cool and dry.",
    ],
  },
  {
    id: "astro-arugula",
    matchLabels: ["Astro Arugula", "Astro Salad Arugula", "Arugula"],
    name: "Astro Salad Arugula",
    summary:
      "Early, heat-tolerant salad arugula (Eruca sativa). Less deeply lobed, more strap-shaped leaves than standard types. Baby leaves ~21 days; full size ~38 days.",
    sow: "Direct sow ⅛\" deep at about 5 seeds per inch, rows at least 2\" apart, from early spring onward. Usually germinates in 5–7 days. Sow every ~2 weeks until 2–3 weeks before frost for a continual supply.",
    light: "Full sun to part shade.",
    water:
      "Prefers fertile, well-drained soil (pH about 6.0–6.8). Keep beds evenly moist for tender leaves.",
    harvest:
      "Cut with a knife when leaves are about 3–6\", roughly 1\" above the soil (above the basal plate) so plants can regrow. Cut again in 5–14 days when leaves reach size. Flowers are edible — spicy and nutty — after flowering, leaves get sharper.",
    tips: [
      "Hardy enough for cool greenhouses and high tunnels from late-summer / early-fall sowings.",
      "Floating row cover from sowing day helps protect against flea beetles.",
      "Rotate crops and keep beds clean to reduce disease.",
    ],
  },
  {
    id: "buttercrunch-lettuce",
    matchLabels: ["Buttercrunch Lettuce", "Buttercrunch", "Lettuce"],
    name: "Buttercrunch Lettuce",
    summary:
      "Organic butterhead from Cornell stock seed (Lactuca sativa). Small open 6\" fan-shaped rosette; dark green leaves with a crisp, sweet yellow-blanching heart. Baby ~28 days; full size ~46 days.",
    sow: "Cool-weather crop — best at 60–65°F; germinates best below 70°F. Direct seed baby leaf: 4–6 seeds/inch, rows 2\"+ apart, cover lightly to ⅛\". For heads: transplant 3–4 weeks after sowing in trays; set butterheads about 10–12\" apart in rows 15–18\" apart. Succession sow every 2–3 weeks.",
    light: "Full sun in cool weather; use shade/mist when starting trays if temps climb above ~75°F.",
    water:
      "Keep seedbeds and young plants evenly moist. Dry soil should be watered to stay cool and moist for even germination.",
    harvest:
      "Heads: cut at the base (keep wrapper leaves for handling). Baby leaf: cut ~1\" above the growing point at about 3–4\" long; clear debris for cleaner regrowth. Cool promptly after harvest.",
    tips: [
      "High heat can cause thermal dormancy — aim for soil 60–68°F at germination when you can.",
      "Hardened transplants can take brief cold near 20°F (-6°C).",
      "Store cold (35–40°F) with high humidity; butterheads are more delicate than crisp types.",
      "MT0-30: seed lot tested with no lettuce mosaic virus found in a 30,000+ seed sample.",
    ],
  },
  {
    id: "parade-onion",
    matchLabels: ["Parade Onions", "Parade Organic Onion", "Onion", "Onions"],
    name: "Parade Bunching Onion",
    summary:
      "Organic bunching onion (Allium fistulosum) with bright white shanks (no bulbing) and dark green upright foliage — easy to harvest and clean. About 65 days from direct seed.",
    sow: "Direct seed early spring for summer, or July/August for fall and spring use. Sow ¼–½\" deep in 2–3\" wide bands, seeds about ¼\" apart; thin to ~1\" only if you want thicker stalks. Or transplant clusters from 72-cell trays 6–8\" apart in rows 18\" apart. Prefer soil pH 6.2–6.8.",
    light: "Full sun — keep beds cultivated so plants get maximum light.",
    water: "Keep evenly moist. Well-drained soil helps extra-hardy types overwinter where climate allows.",
    harvest:
      "Loosen with a fork, gather, wash, and cool promptly. Hold near freezing until you use or sell them.",
    tips: [
      "Hill soil 2–3 times during growth for longer blanched white shanks (or use a deep dibble transplant method).",
      "Days to maturity are from direct seeding — subtract about 10–15 days if transplanting.",
      "Very uniform, upright habit makes harvest and cleaning easier.",
    ],
  },
  {
    id: "bee-feed-mix",
    matchLabels: ["Bee Feed Flower Mix", "Bee Feed", "Flower Mix"],
    name: "Bee Feed Flower Mix",
    summary:
      "Low-maintenance blend of nectar and pollen flowers for honey bees, native bees, bumblebees, and other pollinators — mix of reseeding annuals and perennials. Germination often 10–28 days at 65–75°F.",
    sow: "Direct seed into a weed-free bed. Broadcast evenly, lightly rake, and gently tamp for seed-to-soil contact no deeper than ⅛\". Keep moist until established. Plant late spring, early summer, or late fall (for fall sowing, wait until soil is too cool to germinate — below ~40°F / 4.4°C).",
    light: "Full sun.",
    water:
      "Average, well-drained soil. Keep the seeded area moist to aid germination, then water as needed while plants establish.",
    harvest:
      "Grown for forage and beauty more than cutting — leave blooms for pollinators. Enjoy the long-season color show as different species flower.",
    tips: [
      "Heights vary by species (about 4–48\").",
      "A small packet (~500 seeds) can sow roughly 75–100' of row or 5–10 sq ft; use higher rates for denser color if weed control is limited.",
      "Blend may include favorites like anise hyssop, purple coneflower, California poppy, bergamot, sweet alyssum, and more (varieties can change with availability).",
      "Skip broad insecticides near the planting so bees can forage safely.",
    ],
  },
];

export function matchSeedGuideImage(
  guide: SeedPackGrowGuide,
  optionImages: Array<{ label: string; imageUrl: string | null }>,
): string | null {
  const normalizedOptions = optionImages.map((row) => ({
    label: row.label.trim().toLowerCase(),
    imageUrl: row.imageUrl?.trim() || null,
  }));
  for (const match of guide.matchLabels) {
    const key = match.trim().toLowerCase();
    const hit = normalizedOptions.find(
      (row) => row.label === key || row.label.includes(key) || key.includes(row.label),
    );
    if (hit?.imageUrl) return hit.imageUrl;
  }
  return guide.imageUrl?.trim() || null;
}
