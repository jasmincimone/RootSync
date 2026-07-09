"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { GROWTH_NAV_ITEMS } from "@/config/growthNav";
import { cn } from "@/lib/cn";

function longestMatchingHref(pathname: string, hrefs: string[]): string | null {
  let best: string | null = null;
  for (const href of hrefs) {
    const match = pathname === href || pathname.startsWith(`${href}/`);
    if (match && href.length > (best?.length ?? -1)) {
      best = href;
    }
  }
  return best;
}

export function GrowthSubNav() {
  const pathname = usePathname() || "/account/growth";
  const hrefs = GROWTH_NAV_ITEMS.map((i) => i.href);
  const activeHref = longestMatchingHref(pathname, hrefs);

  return (
    <nav
      className="flex gap-1 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      aria-label="Growth modules"
    >
      {GROWTH_NAV_ITEMS.map((item) => {
        const active = activeHref === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              active
                ? "bg-forest text-fix-primary-foreground"
                : "bg-fix-bg-muted text-fix-text-muted hover:bg-fix-bg-muted/80 hover:text-fix-heading",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
