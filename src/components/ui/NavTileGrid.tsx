"use client";

import { usePathname } from "next/navigation";

import { NavTile, type NavTileItem } from "@/components/ui/NavTile";
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

export type NavTileSectionConfig = {
  id?: string;
  title: string;
  items: NavTileItem[];
};

type Props = {
  sections: NavTileSectionConfig[];
  className?: string;
  onNavigate?: () => void;
};

export function NavTileGrid({ sections, className, onNavigate }: Props) {
  const pathname = usePathname() || "/";
  const allHrefs = sections.flatMap((s) => s.items.map((i) => i.href));
  const activeHref = longestMatchingHref(pathname, allHrefs);

  return (
    <div className={cn("space-y-8", className)}>
      {sections.map((section) => (
        <section key={section.id ?? section.title} className="space-y-3">
          <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-fix-text-muted">
            {section.title}
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {section.items.map((item) => (
              <NavTile
                key={item.href}
                item={item}
                active={activeHref === item.href}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
