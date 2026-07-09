"use client";

import { useState } from "react";

import { cn } from "@/lib/cn";

const FEATURES = [
  {
    id: "ask",
    title: "Ask Rootie",
    body: "Chat below for business ideas, community building, & sustainable living  — powered by RootSense AI.",
  },
  {
    id: "plans",
    title: "Personalized Plans",
    body: "Saves your context, goals, & preferences (with clear privacy controls).",
  },
  {
    id: "shop",
    title: "Shop-aware recommendations",
    body: "Suggests Discover marketplace listings, resources, & services found on RootSync.",
  },
] as const;

const cardBase =
  "rounded-2xl border border-fix-border/15 bg-fix-surface shadow-soft transition-colors hover:bg-fix-bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-fix-cta focus-visible:ring-offset-2 focus-visible:ring-offset-fix-bg";

export function RootSyncFeatureCards() {
  const [openId, setOpenId] = useState<string | null>(null);

  const active = openId
    ? FEATURES.find((f) => f.id === openId) ?? null
    : null;

  return (
    <div className="mt-8 w-full min-w-0">
      {active ? (
        <button
          type="button"
          className={cn(
            cardBase,
            "flex w-full min-w-0 flex-col items-center justify-center px-4 py-6 text-center sm:px-6 sm:py-8 sm:aspect-[3/1]",
          )}
          onClick={() => setOpenId(null)}
          aria-expanded
        >
          <span className="text-sm font-semibold text-fix-heading">
            {active.title}
          </span>
          <p className="mt-3 max-w-prose text-sm text-fix-text-muted">
            {active.body}
          </p>
        </button>
      ) : (
        <div
          className="flex w-full min-w-0 flex-row gap-2 sm:gap-4"
          role="group"
          aria-label="RootSense AI features"
        >
          {FEATURES.map((f) => (
            <button
              key={f.id}
              type="button"
              className={cn(
                cardBase,
                "flex aspect-square min-h-0 min-w-0 flex-1 flex-col items-center justify-center overflow-hidden px-1 py-2 text-center sm:px-4 sm:py-6",
              )}
              onClick={() => setOpenId(f.id)}
              aria-expanded={false}
            >
              <span className="line-clamp-4 text-[10px] font-semibold leading-tight text-fix-heading sm:text-sm sm:leading-snug">
                {f.title}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
