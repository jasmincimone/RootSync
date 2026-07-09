export type GrowthNavItem = {
  href: string;
  label: string;
  description: string;
};

export const GROWTH_NAV_ITEMS: GrowthNavItem[] = [
  {
    href: "/account/growth",
    label: "Overview",
    description: "Your growth command center — KPIs, tasks, and next best actions.",
  },
  {
    href: "/account/growth/crm",
    label: "CRM",
    description: "Contacts, tags, notes, and relationship history.",
  },
  {
    href: "/account/growth/funnels",
    label: "Funnels",
    description: "Build and track marketing funnels from first touch to referral.",
  },
  {
    href: "/account/growth/campaigns",
    label: "Campaigns",
    description: "Email and outreach campaigns with performance tracking.",
  },
  {
    href: "/account/growth/landing-pages",
    label: "Landing Pages",
    description: "Create pages that convert visitors into community members.",
  },
  {
    href: "/account/growth/qr-campaigns",
    label: "QR Campaigns",
    description: "Track scans from events, packaging, booths, and print.",
  },
  {
    href: "/account/growth/newsletter",
    label: "Newsletter",
    description: "Subscribers, drafts, sequences, and engagement metrics.",
  },
  {
    href: "/account/growth/audience",
    label: "Audience",
    description: "Dynamic segments based on interests, purchases, and activity.",
  },
  {
    href: "/account/growth/events",
    label: "Events",
    description: "Per-event dashboards — InvestFest, markets, workshops, and more.",
  },
  {
    href: "/account/growth/consultations",
    label: "Consultations",
    description: "Pipeline from lead through proposal, project, and review.",
  },
  {
    href: "/account/growth/analytics",
    label: "Analytics",
    description: "Visitors, conversions, revenue, and trend charts.",
  },
  {
    href: "/account/growth/ai-marketing",
    label: "AI Marketing",
    description: "RootSync AI — generate campaigns, funnels, and recommendations.",
  },
];

export function growthNavItemForPath(pathname: string): GrowthNavItem | undefined {
  const normalized = pathname.replace(/\/$/, "") || "/account/growth";
  return GROWTH_NAV_ITEMS.find((item) => {
    if (item.href === "/account/growth") return normalized === "/account/growth";
    return normalized === item.href || normalized.startsWith(`${item.href}/`);
  });
}
