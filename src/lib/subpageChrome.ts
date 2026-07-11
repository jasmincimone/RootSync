import { accountNavTitleForPath } from "@/config/accountNav";
import {
  accountHubBackHref,
  accountHubForPath,
  ACCOUNT_HUB_LABELS,
} from "@/config/accountHubs";
import { growthNavItemForPath } from "@/config/growthNav";

export type SubpageChromeConfig = {
  backHref: string;
  backLabel: string;
  title: string | null;
};

function normalizePath(pathname: string): string {
  return pathname.replace(/\/$/, "") || "/account";
}

export function subpageChromeForPath(pathname: string): SubpageChromeConfig | null {
  const path = normalizePath(pathname);
  if (path === "/account") return null;

  const hub = accountHubForPath(path);
  if (hub) {
    if (path.startsWith("/account/admin/") && path !== "/account/admin") {
      return {
        backHref: "/account/admin",
        backLabel: "Admin Hub",
        title: accountNavTitleForPath(path),
      };
    }

    return {
      backHref: accountHubBackHref(hub),
      backLabel: ACCOUNT_HUB_LABELS[hub],
      title: accountNavTitleForPath(path) ?? growthNavItemForPath(path)?.label ?? null,
    };
  }

  return {
    backHref: "/account",
    backLabel: "Account",
    title: accountNavTitleForPath(path) ?? growthNavItemForPath(path)?.label ?? null,
  };
}
