import { DISCOVER_BASE } from "@/config/discoverPaths";
import { safeCallbackPath } from "@/lib/safeCallbackPath";

export const DISCOVER_RESULTS_RETURN_KEY = "tfc_discover_results";

const DISCOVER_DETAIL_PATH = /^\/discover\/(vendors|listings|directory)\//;

function isDiscoverResultsPath(path: string): boolean {
  if (!path.startsWith(DISCOVER_BASE)) return false;
  const pathname = path.split("#")[0] ?? path;
  return !DISCOVER_DETAIL_PATH.test(pathname);
}

/** Validates a return path for Discover search results (not a detail page). */
export function safeDiscoverResultsPath(raw: string | null | undefined): string | null {
  const path = safeCallbackPath(raw, "");
  if (!path || path === "/") return null;
  if (!isDiscoverResultsPath(path)) return null;
  return path;
}

export function withDiscoverReturnTo(detailHref: string, resultsHref: string): string {
  const safeResults = safeDiscoverResultsPath(resultsHref);
  if (!safeResults) return detailHref;
  const url = new URL(detailHref, "http://local");
  url.searchParams.set("returnTo", safeResults);
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

export function resolveDiscoverBackLink(returnToParam?: string | null): {
  href: string;
  label: string;
} {
  const fromParam = safeDiscoverResultsPath(returnToParam);
  if (fromParam) {
    return { href: fromParam, label: "← Back to results" };
  }
  return { href: DISCOVER_BASE, label: "← Back to Discover" };
}
