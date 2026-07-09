export type AccountHubId = "vitals" | "member-hub" | "vendor-hub" | "growspace";

export const ACCOUNT_HUB_IDS: AccountHubId[] = [
  "vitals",
  "member-hub",
  "vendor-hub",
  "growspace",
];

export const ACCOUNT_HUB_LABELS: Record<AccountHubId, string> = {
  vitals: "Vitals",
  "member-hub": "Member Hub",
  "vendor-hub": "Vendor Hub",
  growspace: "GrowSpace",
};

export function accountHubBackHref(hubId: AccountHubId): string {
  return `/account?hub=${hubId}`;
}

export function isAccountHubId(value: string | null | undefined): value is AccountHubId {
  return ACCOUNT_HUB_IDS.includes(value as AccountHubId);
}

function normalizeAccountPath(pathname: string): string {
  return pathname.replace(/\/$/, "") || "/account";
}

function matchesPrefix(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(`${prefix}/`);
}

/** Parent hub for account subpages (used for back navigation). */
export function accountHubForPath(pathname: string): AccountHubId | null {
  const path = normalizeAccountPath(pathname);
  if (path === "/account") return null;

  if (matchesPrefix(path, "/account/vitals") || matchesPrefix(path, "/account/pulses")) {
    return "vitals";
  }

  if (
    matchesPrefix(path, "/account/settings") ||
    matchesPrefix(path, "/account/activity") ||
    matchesPrefix(path, "/account/orders") ||
    matchesPrefix(path, "/account/bookings") ||
    matchesPrefix(path, "/account/connect-demo") ||
    matchesPrefix(path, "/account/community") ||
    matchesPrefix(path, "/account/admin")
  ) {
    return "member-hub";
  }

  if (matchesPrefix(path, "/account/vendor")) {
    return "vendor-hub";
  }

  if (matchesPrefix(path, "/account/growth")) {
    return "growspace";
  }

  return null;
}
