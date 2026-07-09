"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { MenuAccountLink } from "@/components/MenuAccountLink";
import { PlatformMenuLinks } from "@/components/PlatformMenuLinks";

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
            <PlatformMenuLinks onNavigate={onClose} />
          </section>
        </nav>
      </div>
    </aside>
  );
}
