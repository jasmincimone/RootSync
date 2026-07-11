"use client";

import { usePathname } from "next/navigation";

import {
  StickySubpageBar,
} from "@/components/account/StickySubpageBar";
import { subpageChromeForPath, type SubpageChromeConfig } from "@/lib/subpageChrome";

type Props = {
  children: React.ReactNode;
  /** Override path-based chrome (e.g. Stay Synced opened from Account). */
  chrome?: SubpageChromeConfig | null;
};

/**
 * Sticky account sub-header: back control + page title stay visible while scrolling
 * multi-step flows (listings wizard, Payment Hub, settings, etc.).
 */
export function AccountSubpageChrome({ children, chrome: chromeOverride }: Props) {
  const pathname = usePathname() || "/account";
  const chrome =
    chromeOverride !== undefined ? chromeOverride : subpageChromeForPath(pathname);

  if (!chrome) {
    return <>{children}</>;
  }

  return (
    <div>
      <StickySubpageBar
        backHref={chrome.backHref}
        backLabel={chrome.backLabel}
        title={chrome.title}
      />
      <div className="pt-6">{children}</div>
    </div>
  );
}
