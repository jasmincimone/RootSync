"use client";

import { cn } from "@/lib/cn";

export type ProfileSectionLink = {
  id: string;
  label: string;
};

type Props = {
  sections: ProfileSectionLink[];
  className?: string;
};

export function ProfileSectionNav({ sections, className }: Props) {
  if (sections.length === 0) return null;

  function scrollToSection(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <nav
      className={cn(
        "flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
      aria-label="Profile sections"
    >
      {sections.map((section) => (
        <button
          key={section.id}
          type="button"
          onClick={() => scrollToSection(section.id)}
          className="shrink-0 rounded-full bg-fix-bg-muted px-3 py-1.5 text-xs font-medium text-fix-text-muted transition-colors hover:bg-fix-bg-muted/80 hover:text-fix-heading focus:outline-none focus-visible:ring-2 focus-visible:ring-amber focus-visible:ring-offset-2"
        >
          {section.label}
        </button>
      ))}
    </nav>
  );
}
