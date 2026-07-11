import { DISCOVER_BASE } from "@/config/discoverPaths";
import { accountNavTitleForPath } from "@/config/accountNav";
import { safeCallbackPath } from "@/lib/safeCallbackPath";

export const DISCOVER_RESULTS_RETURN_KEY = "tfc_discover_results";

const DISCOVER_DETAIL_PATH = /^\/discover\/(vendors|listings|directory)\//;
const VENDOR_PROFILE_PATH = /^\/discover\/vendors\/[^/]+$/;
const DIRECTORY_DETAIL_PATH = /^\/discover\/directory\/[^/]+$/;
const MEMBER_PROFILE_PATH = /^\/members\/[^/]+$/;
const SHOP_PATH = /^\/shops\/[^/]+$/;
const ACCOUNT_PATH = /^\/account(\/|$)/;

function pathnameOf(path: string): string {
  return (path.split("#")[0] ?? path).split("?")[0] || path;
}

function isDiscoverResultsPath(path: string): boolean {
  if (!path.startsWith(DISCOVER_BASE)) return false;
  return !DISCOVER_DETAIL_PATH.test(pathnameOf(path));
}

/** Validates a return path for Discover search results (not a detail page). */
export function safeDiscoverResultsPath(raw: string | null | undefined): string | null {
  const path = safeCallbackPath(raw, "");
  if (!path || path === "/") return null;
  if (!isDiscoverResultsPath(path)) return null;
  return path;
}

/**
 * Safe in-app return targets for Discover detail pages (listing, vendor, directory).
 * Includes search results, vendor/member profiles, shops, directory details, and account hubs.
 */
export function safeDiscoverReturnPath(raw: string | null | undefined): string | null {
  const path = safeCallbackPath(raw, "");
  if (!path || path === "/") return null;

  const pathname = pathnameOf(path);

  if (isDiscoverResultsPath(path)) return path;
  if (VENDOR_PROFILE_PATH.test(pathname)) return path;
  if (DIRECTORY_DETAIL_PATH.test(pathname)) return path;
  if (MEMBER_PROFILE_PATH.test(pathname)) return path;
  if (SHOP_PATH.test(pathname)) return path;
  if (ACCOUNT_PATH.test(pathname)) return path;

  return null;
}

export function withDiscoverReturnTo(detailHref: string, returnHref: string): string {
  const safeReturn = safeDiscoverReturnPath(returnHref);
  if (!safeReturn) return detailHref;
  const url = new URL(detailHref, "http://local");
  url.searchParams.set("returnTo", safeReturn);
  return `${url.pathname}${url.search}`;
}

export function rememberDiscoverResults(path: string): void {
  if (typeof window === "undefined") return;
  if (!isDiscoverResultsPath(path)) return;
  try {
    sessionStorage.setItem(DISCOVER_RESULTS_RETURN_KEY, path);
  } catch {
    // private mode / quota
  }
}

export function readStoredDiscoverResults(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = sessionStorage.getItem(DISCOVER_RESULTS_RETURN_KEY);
    return stored ? safeDiscoverResultsPath(stored) : null;
  } catch {
    return null;
  }
}

export type DiscoverBackLinkOptions = {
  /** When returnTo is this listing's vendor profile, use the vendor display name. */
  profileName?: string | null;
  /** Canonical vendor path for the listing being viewed (e.g. /discover/vendors/acme). */
  currentVendorPath?: string | null;
};

export type DiscoverBackLink = {
  href: string;
  /** Short label for sticky chrome (ArrowLeft + label). */
  backLabel: string;
  /** Full label for bottom / text links. */
  label: string;
};

function backLabelsForPath(
  path: string,
  options?: DiscoverBackLinkOptions,
): Pick<DiscoverBackLink, "backLabel" | "label"> {
  const pathname = pathnameOf(path);
  const currentVendor = options?.currentVendorPath
    ? pathnameOf(options.currentVendorPath)
    : null;
  const profileName = options?.profileName?.trim();

  if (VENDOR_PROFILE_PATH.test(pathname)) {
    const name =
      currentVendor && pathname === currentVendor && profileName ? profileName : "profile";
    const backLabel = name === "profile" ? "Profile" : name;
    return { backLabel, label: `Back to ${name}` };
  }

  if (MEMBER_PROFILE_PATH.test(pathname)) {
    return { backLabel: "Profile", label: "Back to profile" };
  }

  if (DIRECTORY_DETAIL_PATH.test(pathname)) {
    return { backLabel: "Directory", label: "Back to directory" };
  }

  if (SHOP_PATH.test(pathname)) {
    return { backLabel: "Shop", label: "Back to shop" };
  }

  if (ACCOUNT_PATH.test(pathname)) {
    const title = accountNavTitleForPath(pathname) ?? "Account";
    return { backLabel: title, label: `Back to ${title}` };
  }

  if (isDiscoverResultsPath(path)) {
    const hasQuery = path.includes("?");
    if (hasQuery) {
      return { backLabel: "Results", label: "Back to results" };
    }
    return { backLabel: "Discover", label: "Back to Discover" };
  }

  return { backLabel: "Discover", label: "Back to Discover" };
}

export function resolveDiscoverBackLink(
  returnToParam?: string | null,
  options?: DiscoverBackLinkOptions,
): DiscoverBackLink {
  const fromParam = safeDiscoverReturnPath(returnToParam);
  if (fromParam) {
    const labels = backLabelsForPath(fromParam, options);
    return { href: fromParam, ...labels };
  }
  return {
    href: DISCOVER_BASE,
    backLabel: "Discover",
    label: "Back to Discover",
  };
}
