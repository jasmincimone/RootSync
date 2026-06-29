"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { PLATFORM_NAV_LINKS } from "@/config/platformNav";
import { cn } from "@/lib/cn";

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function PlatformMenuLinks() {
  const pathname = usePathname() || "/";

  return (
    <ul className="grid gap-0.5">
      {PLATFORM_NAV_LINKS.filter((item) => item.href !== "/rootsync").map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm font-medium text-fix-link hover:bg-fix-bg-muted hover:text-fix-link-hover active:bg-fix-bg-muted active:text-fix-link-hover",
                active && "bg-fix-bg-muted text-fix-heading",
              )}
            >
              <span>{item.label}</span>
              {item.comingSoon ? (
                <span className="rounded-full bg-amber/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-espresso">
                  Soon
                </span>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
