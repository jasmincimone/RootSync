"use client";

import { cn } from "@/lib/cn";

type Props = {
  html: string;
  className?: string;
};

export function PulsePostContent({ html, className }: Props) {
  if (!html.trim()) return null;

  return (
    <div
      className={cn("pulse-post-content mt-3 text-sm leading-relaxed text-fix-text", className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
