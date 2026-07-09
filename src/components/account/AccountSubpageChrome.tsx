"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { subpageChromeForPath } from "@/lib/subpageChrome";

export function AccountSubpageChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/account";
  const chrome = subpageChromeForPath(pathname);

  if (!chrome) {
    return <>{children}</>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={chrome.backHref}
          className="inline-flex items-center gap-1.5 rounded-full border border-fix-border/15 bg-fix-surface px-3 py-1.5 text-sm font-medium text-fix-text-muted shadow-soft transition-colors hover:bg-fix-bg-muted hover:text-fix-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fix-cta"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {chrome.backLabel}
        </Link>
        {chrome.title ? (
          <h2 className="text-lg font-semibold text-fix-heading">{chrome.title}</h2>
        ) : null}
      </div>
      {children}
    </div>
  );
}
