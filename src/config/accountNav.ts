import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BarChart3,
  Calendar,
  CalendarClock,
  CreditCard,
  Heart,
  LayoutDashboard,
  MessageSquare,
  Package,
  Settings,
  Shield,
  ShoppingBag,
  Sprout,
  Store,
  Tag,
  UserPlus,
  Users,
} from "lucide-react";

export type AccountNavItem = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  /** Span both columns on mobile grid */
  fullWidth?: boolean;
  /** Use Pulse brand icon in tile grids */
  usePulseIcon?: boolean;
};

export function accountNavItemToTile(item: AccountNavItem) {
  return {
    href: item.href,
    label: item.label,
    description: item.description,
    icon: item.icon,
    fullWidth: item.fullWidth,
    usePulseIcon: item.usePulseIcon,
  };
}

export type AccountNavSection = {
  id: string;
  title: string;
  items: AccountNavItem[];
};

export const ACCOUNT_MEMBER_NAV: AccountNavItem[] = [
  {
    href: "/account",
    label: "Overview",
    description: "Account summary",
    icon: LayoutDashboard,
  },
  {
    href: "/account/activity",
    label: "Activity",
    description: "Recent activity",
    icon: Activity,
  },
  {
    href: "/account/settings",
    label: "Account settings",
    description: "Manage your account",
    icon: Settings,
  },
  {
    href: "/account/orders",
    label: "Order history",
    description: "Track your orders",
    icon: ShoppingBag,
  },
  {
    href: "/account/bookings",
    label: "My bookings",
    description: "Bookings & appointments",
    icon: Calendar,
  },
  {
    href: "/messages/inbox?from=account",
    label: "Stay Synced",
    description: "Your conversations",
    icon: MessageSquare,
    fullWidth: true,
  },
];

export const ACCOUNT_VITALS_NAV: AccountNavItem[] = [
  {
    href: "/account/vitals",
    label: "Pulse overview",
    description: "Score, events & contribution",
    usePulseIcon: true,
    icon: Heart,
  },
  {
    href: "/account/pulses",
    label: "My Pulses",
    description: "Your posts on Pulse",
    usePulseIcon: true,
    icon: Heart,
  },
];

export const ACCOUNT_VENDOR_NAV: AccountNavItem[] = [
  {
    href: "/account/vendor",
    label: "Vendor dashboard",
    description: "Business overview",
    icon: BarChart3,
  },
  {
    href: "/account/vendor/payments",
    label: "Payment Hub",
    description: "Connect, payouts & storefront",
    icon: CreditCard,
  },
  {
    href: "/account/vendor/profile",
    label: "Vendor profile",
    description: "Manage your profile",
    icon: Store,
  },
  {
    href: "/account/vendor/listings",
    label: "My listings",
    description: "Manage your items",
    icon: Tag,
  },
  {
    href: "/account/vendor/orders",
    label: "Orders received",
    description: "Incoming orders",
    icon: Package,
  },
  {
    href: "/account/vendor/bookings",
    label: "Upcoming appointments",
    description: "Schedule & manage",
    icon: CalendarClock,
  },
];

export const ACCOUNT_GROWTH_NAV: AccountNavItem[] = [
  {
    href: "/account/growth",
    label: "GrowSpace",
    description: "Marketing & CRM hub",
    icon: Sprout,
    fullWidth: true,
  },
];

export const ACCOUNT_ADMIN_NAV: AccountNavItem[] = [
  {
    href: "/account/admin",
    label: "Admin overview",
    description: "Admin Hub home",
    icon: Shield,
  },
  {
    href: "/account/admin/pulse",
    label: "Pulse manager",
    description: "Weights, tiers & announcements",
    icon: Heart,
  },
  {
    href: "/account/admin/vendors",
    label: "Vendor requests",
    description: "Review applications",
    icon: Store,
  },
  {
    href: "/account/admin/users",
    label: "Users & roles",
    description: "Manage accounts",
    icon: Users,
  },
];

export const ACCOUNT_VENDOR_APPLY_NAV: AccountNavItem = {
  href: "/account/vendor/apply",
  label: "Become a vendor",
  description: "Sell on Discover",
  icon: UserPlus,
  fullWidth: true,
};

export const ACCOUNT_VENDOR_PENDING_NAV: AccountNavItem = {
  href: "/account/vendor",
  label: "Vendor application",
  description: "Application status",
  icon: Store,
  fullWidth: true,
};

/** Flat list for resolving page titles from pathname */
export const ALL_ACCOUNT_NAV_ITEMS: AccountNavItem[] = [
  ...ACCOUNT_MEMBER_NAV,
  ...ACCOUNT_VITALS_NAV,
  ...ACCOUNT_VENDOR_NAV,
  ...ACCOUNT_GROWTH_NAV,
  ...ACCOUNT_ADMIN_NAV,
  ACCOUNT_VENDOR_APPLY_NAV,
  ACCOUNT_VENDOR_PENDING_NAV,
];

const PATH_TITLE_OVERRIDES: { pattern: RegExp; label: string }[] = [
  { pattern: /^\/account\/vendor\/listings\/new$/, label: "New offering" },
  { pattern: /^\/account\/vendor\/listings\/[^/]+\/edit$/, label: "Edit offering" },
  { pattern: /^\/account\/orders\/[^/]+$/, label: "Order details" },
  { pattern: /^\/account\/pulses$/, label: "My Pulses" },
  { pattern: /^\/account\/vitals$/, label: "Pulse overview" },
  { pattern: /^\/account\/admin\/pulse$/, label: "Pulse manager" },
  { pattern: /^\/account\/admin\/sentry-test$/, label: "Sentry test" },
  { pattern: /^\/account\/community$/, label: "My Pulses" },
];

export function accountNavTitleForPath(pathname: string): string | null {
  const normalized = pathname.replace(/\/$/, "") || "/account";
  for (const { pattern, label } of PATH_TITLE_OVERRIDES) {
    if (pattern.test(normalized)) return label;
  }
  let best: AccountNavItem | null = null;
  for (const item of ALL_ACCOUNT_NAV_ITEMS) {
    const match = normalized === item.href || normalized.startsWith(`${item.href}/`);
    if (match && item.href.length > (best?.href.length ?? -1)) {
      best = item;
    }
  }
  return best?.label ?? null;
}
