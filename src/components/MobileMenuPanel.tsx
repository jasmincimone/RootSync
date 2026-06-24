"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { MenuAccountLink } from "@/components/MenuAccountLink";
import { PLATFORM_NAV_LINKS } from "@/config/platformNav";

type Props = { onClose: () => void; closeHref?: string };

export function MobileMenuPanel({ onClose, closeHref }: Props) {
  return (
    <aside className="flex h-full w-1/4 min-w-[280px] max-w-[400px] flex-col border-r border-fix-border/15 bg-fix-surface">
      <div className="flex flex-1 flex-col overflow-y-auto py-6 pl-6 pr-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-fix-heading">Menu</h2>
          {closeHref ? (
            <Link
              href={closeHref}
              className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-fix-text-muted hover:bg-fix-bg-muted hover:text-fix-heading"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Close
            </Link>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-fix-text-muted hover:bg-fix-bg-muted hover:text-fix-heading"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Close
            </button>
          )}
        </div>

        <nav className="mt-6 flex-1" aria-label="Main navigation">
          <section className="mb-6">
            <MenuAccountLink onNavigate={onClose} />
          </section>

          <section className="mb-6">
            <Link
              href="/"
              onClick={onClose}
              className="block rounded-xl border border-fix-border/15 bg-fix-bg-muted px-3 py-2.5 text-sm font-semibold text-fix-heading hover:bg-fix-bg-muted/80"
            >
              Home
            </Link>
            <Link
              href="/rootsync"
              onClick={onClose}
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
                    onClick={onClose}
                    className="block rounded-xl px-3 py-2 text-sm font-medium text-fix-link hover:bg-fix-bg-muted hover:text-fix-link-hover active:bg-fix-bg-muted active:text-fix-link-hover"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </nav>
      </div>
    </aside>
  );
}
