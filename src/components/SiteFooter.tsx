import Link from "next/link";

import { Container } from "@/components/Container";
import { PLATFORM_FOOTER_LINKS } from "@/config/platformNav";
import { cn } from "@/lib/cn";

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
              {PLATFORM_FOOTER_LINKS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "inline-flex items-center gap-2 text-sm text-fix-link hover:text-fix-link-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-fix-cta focus-visible:rounded-sm",
                  )}
                >
                  {item.label}
                  {item.comingSoon ? (
                    <span className="rounded-full bg-amber/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-espresso">
                      Soon
                    </span>
                  ) : null}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-fix-border/15 pt-6 text-xs text-fix-text-muted sm:flex-row sm:items-center sm:justify-between">
          <div>© 2026 RootSync, Inc.</div>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            <Link href="/about" className="hover:text-fix-heading focus:outline-none focus-visible:ring-2 focus-visible:ring-fix-cta focus-visible:rounded-sm">
              About us
            </Link>
            <Link href="/privacy" className="hover:text-fix-heading focus:outline-none focus-visible:ring-2 focus-visible:ring-fix-cta focus-visible:rounded-sm">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-fix-heading focus:outline-none focus-visible:ring-2 focus-visible:ring-fix-cta focus-visible:rounded-sm">
              Terms
            </Link>
            <Link href="/disclaimer" className="hover:text-fix-heading focus:outline-none focus-visible:ring-2 focus-visible:ring-fix-cta focus-visible:rounded-sm">
              Disclaimer
            </Link>
            <Link href="/ai-disclaimer" className="hover:text-fix-heading focus:outline-none focus-visible:ring-2 focus-visible:ring-fix-cta focus-visible:rounded-sm">
              AI disclaimer
            </Link>
            <Link href="/vendor-agreement" className="hover:text-fix-heading focus:outline-none focus-visible:ring-2 focus-visible:ring-fix-cta focus-visible:rounded-sm">
              Vendor agreement
            </Link>
            <Link href="/seller-terms" className="hover:text-fix-heading focus:outline-none focus-visible:ring-2 focus-visible:ring-fix-cta focus-visible:rounded-sm">
              Seller terms
            </Link>
          </div>
        </div>
      </Container>
    </footer>
  );
}
