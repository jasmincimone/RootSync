import { ROOTSENSE_AI_HREF } from "@/config/rootsensePaths";

/** RootSync landing page — explore menu cards and icons (Syntha assets). */
export type PlatformExploreItem = {
  id: string;
  title: string;
  tagline: string;
  description: string;
  href: string;
  menuCardSrc: string;
  iconSrc: string;
  /** Tailwind grid placement for the 2×2 explorer layout */
  gridClass: string;
};

export const PLATFORM_EXPLORE_ITEMS: PlatformExploreItem[] = [
  {
    id: "discover",
    title: "Discover Marketplace",
    tagline: "Find local. Grow together.",
    description:
      "The discovery engine for local living — find vendors, farmers, products, services, events, and opportunities near you.",
    href: "/discover",
    menuCardSrc: "/images/platform/explore/discover-marketplace-menu-card.png",
    iconSrc: "/images/platform/explore/icons/discover-marketplace-icon.png",
    gridClass: "col-start-1 row-start-1",
  },
  {
    id: "rootsync-ai",
    title: "RootSense AI",
    tagline: "Wiser decisions. Stronger roots.",
    description:
      "Meet Rootie — your conversational guide powered by RootSense AI. Get practical help growing food, building your business, and strengthening your community.",
    href: ROOTSENSE_AI_HREF,
    menuCardSrc: "/images/platform/explore/rootsync-ai-menu-card.png",
    iconSrc: "/images/platform/explore/icons/rootsync-ai-icon.png",
    gridClass: "col-start-2 row-start-1",
  },
  {
    id: "stay-synced",
    title: "Stay Synced",
    tagline: "Connect. Communicate. Grow.",
    description:
      "The relationship layer of RootSync — direct messages, vendor conversations, consultation chats, and notifications.",
    href: "/messages/inbox",
    menuCardSrc: "/images/platform/explore/stay-synced-menu-card.png",
    iconSrc: "/images/platform/explore/icons/stay-synced-icon.png",
    gridClass: "col-start-1 row-start-2",
  },
  {
    id: "pulse",
    title: "Pulse",
    tagline: "The heartbeat of RootSync.",
    description:
      "The living heartbeat of the ecosystem — harvests, questions, events, and community wins. Every post is a Pulse.",
    href: "/pulse",
    menuCardSrc: "/images/platform/explore/pulse-menu-card.png",
    iconSrc: "/images/pulse/pulse-icon.png",
    gridClass: "col-start-2 row-start-2",
  },
];

/** Site-wide RootSync mark (favicon, loader, featured sections). */
export const ROOTSYNC_SYMBOL_SRC = "/images/brand/rootsync-platform-symbol.png";
