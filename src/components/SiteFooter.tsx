import Link from "next/link";

import { Container } from "@/components/Container";

export function SiteFooter() {
  return (
    <footer className="border-t border-fix-border/15 bg-fix-bg-muted">
      <Container className="py-10">
        <div className="grid gap-10 md:grid-cols-2">
          <div>
            <div className="text-sm font-semibold text-fix-heading">RootSync</div>
            <p className="mt-2 text-sm text-fix-text-muted">
              Connecting what people make with the communities around them.
            </p>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-fix-text-muted">
              Platform
            </div>
            <div className="mt-3 grid gap-2">
              <Link href="/about" className="text-sm text-fix-link hover:text-fix-link-hover">
                About us
              </Link>
              <Link href="/marketplace" className="text-sm text-fix-link hover:text-fix-link-hover">
                Marketplace
              </Link>
              <Link href="/community" className="text-sm text-fix-link hover:text-fix-link-hover">
                Community
              </Link>
              <Link href="/rootsyncai" className="text-sm text-fix-link hover:text-fix-link-hover">
                RootSync (AI assistant)
              </Link>
              <Link href="/courses" className="text-sm text-fix-link hover:text-fix-link-hover">
                Courses
              </Link>
              <Link href="/downloads" className="text-sm text-fix-link hover:text-fix-link-hover">
                Downloads
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-fix-border/15 pt-6 text-xs text-fix-text-muted sm:flex-row sm:items-center sm:justify-between">
          <div>© 2026 The Fix Collective, LLC. powered by RootSync.io</div>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            <Link href="/about" className="hover:text-fix-heading">
              About us
            </Link>
            <Link href="/privacy" className="hover:text-fix-heading">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-fix-heading">
              Terms
            </Link>
            <Link href="/disclaimer" className="hover:text-fix-heading">
              Disclaimer
            </Link>
            <Link href="/ai-disclaimer" className="hover:text-fix-heading">
              AI disclaimer
            </Link>
            <Link href="/vendor-agreement" className="hover:text-fix-heading">
              Vendor agreement
            </Link>
            <Link href="/seller-terms" className="hover:text-fix-heading">
              Seller terms
            </Link>
          </div>
        </div>
      </Container>
    </footer>
  );
}
