import Link from "next/link";
import { Suspense } from "react";

import { MenuBackdropClose, MenuCloseButton } from "@/components/MenuCloseButton";
import { MenuAccountLink } from "@/components/MenuAccountLink";
import { MenuFeaturedVendors } from "@/components/MenuFeaturedVendors";
import { PLATFORM_NAV_LINKS } from "@/config/platformNav";

export const metadata = {
  title: "Menu",
  description: "Navigation menu for The Fix Collective",
};

function AccountLinkFallback() {
  return (
    <div
      className="rounded-xl border border-fix-border/15 bg-fix-bg-muted px-3 py-2.5 text-sm text-fix-text-muted"
      aria-hidden
    >
      …
    </div>
  );
}

function FeaturedVendorsFallback() {
  return (
    <div className="mb-6 border-t border-fix-border/15 pt-6 px-1 text-sm text-fix-text-muted">
      Loading vendors…
    </div>
  );
}

export default function MenuPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-row">
      <aside className="flex h-full min-h-0 w-[min(100%,400px)] min-w-[260px] shrink-0 flex-col overflow-y-auto border-r border-fix-border/15 bg-fix-surface sm:min-w-[280px]">
        <div className="flex min-h-0 flex-1 flex-col py-6 pl-6 pr-4">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold text-fix-heading">Menu</h1>
            <MenuCloseButton />
          </div>

          <nav className="mt-6 flex min-h-0 flex-1 flex-col" aria-label="Main navigation">
            <section className="mb-6">
              <Suspense fallback={<AccountLinkFallback />}>
                <MenuAccountLink />
              </Suspense>
            </section>

            <section className="mb-6">
              <Link
                href="/"
                className="block rounded-xl border border-fix-border/15 bg-fix-bg-muted px-3 py-2.5 text-sm font-semibold text-fix-heading hover:bg-fix-bg-muted/80"
              >
                Home
              </Link>
              <Link
                href="/rootsync"
                className="mt-2 block rounded-xl border border-fix-border/15 bg-fix-bg-muted px-3 py-2.5 text-sm font-semibold text-fix-heading hover:bg-fix-bg-muted/80"
              >
                RootSync
              </Link>
            </section>

            <section className="mb-6">
              <ul className="grid gap-0.5">
                {PLATFORM_NAV_LINKS.filter((item) => item.href !== "/rootsync").map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="block rounded-xl px-3 py-2 text-sm font-medium text-fix-link hover:bg-fix-bg-muted hover:text-fix-link-hover active:bg-fix-bg-muted active:text-fix-link-hover"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>

            <Suspense fallback={<FeaturedVendorsFallback />}>
              <MenuFeaturedVendors />
            </Suspense>

            <div className="mt-auto border-t border-fix-border/15 pt-6">
              <Link
                href="/about"
                className="block rounded-xl px-3 py-2 text-sm font-medium text-fix-link hover:bg-fix-bg-muted hover:text-fix-link-hover"
              >
                About us
              </Link>
            </div>
          </nav>
        </div>
      </aside>

      <MenuBackdropClose />
    </div>
  );
}
