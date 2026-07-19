"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { BrandPngIcon } from "@/components/ui/BrandPngIcon";
import { PulseIcon } from "@/components/pulse/PulseIcon";
import { PLATFORM_PRIMARY_NAV_LINKS } from "@/config/platformNav";
import { platformNavIconByHref } from "@/config/platformExploreNav";
import { ROOTSENSE_AI_HREF, isRootSenseAiActive } from "@/config/rootsensePaths";
import { cn } from "@/lib/cn";

const SHORT_LABEL: Record<string, string> = {
  "/discover": "Discover",
  [ROOTSENSE_AI_HREF]: "RootSense",
  "/messages/inbox": "Synced",
  "/pulse": "Pulse",
};

function isActive(pathname: string, href: string) {
  if (href === "/pulse") {
    return pathname === "/pulse" || pathname.startsWith("/pulse/") || pathname.startsWith("/community");
  }
  if (href === ROOTSENSE_AI_HREF || isRootSenseAiActive(href)) {
    return isRootSenseAiActive(pathname);
  }
  if (href === "/messages/inbox") {
    return pathname.startsWith("/messages");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function shouldHide(pathname: string) {
  if (pathname === "/menu") return true;
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password")
  ) {
    return true;
  }
  return false;
}

/** Persistent four-pillar cue on small screens (desktop keeps header nav). */
export function MobilePillarNav() {
  const pathname = usePathname() || "/";
  if (shouldHide(pathname)) return null;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-fix-border/15 bg-fix-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm lg:hidden"
      aria-label="Platform pillars"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-4">
        {PLATFORM_PRIMARY_NAV_LINKS.map((item) => {
          const active = isActive(pathname, item.href);
          const label = SHORT_LABEL[item.href] ?? item.label;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 py-2 text-[11px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-fix-cta",
                  active ? "text-forest" : "text-fix-text-muted hover:text-fix-heading",
                )}
              >
                {item.usePulseIcon ? (
                  <PulseIcon size={20} alt="" className="shrink-0" />
                ) : platformNavIconByHref[item.href] ? (
                  <BrandPngIcon
                    src={platformNavIconByHref[item.href]}
                    size={20}
                    className="shrink-0"
                    alt=""
                  />
                ) : null}
                <span className="truncate">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
