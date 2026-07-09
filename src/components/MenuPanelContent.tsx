import Link from "next/link";
import { Suspense } from "react";

import { MenuAccountLink } from "@/components/MenuAccountLink";
import { MenuFeaturedVendors } from "@/components/MenuFeaturedVendors";
import { PlatformMenuLinks } from "@/components/PlatformMenuLinks";

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

export function MenuPanelContent() {
  return (
    <nav className="flex min-h-0 flex-1 flex-col" aria-label="Main navigation">
      <section className="mb-6">
        <Suspense fallback={<AccountLinkFallback />}>
          <MenuAccountLink />
        </Suspense>
      </section>

      <section className="mb-6">
        <PlatformMenuLinks />
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
  );
}
