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
  "rounded-xl border border-fix-border/15 bg-fix-surface shadow-soft transition-colors hover:bg-fix-bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-fix-cta focus-visible:ring-offset-2 focus-visible:ring-offset-fix-bg";

export function RootSyncFeatureCards() {
  const [openId, setOpenId] = useState<string | null>(null);

  const active = openId
    ? FEATURES.find((f) => f.id === openId) ?? null
    : null;

  return (
    <div className="mx-auto mt-6 w-full max-w-3xl px-6 py-8 sm:mt-8 sm:px-10 sm:py-10">
      {active ? (
        <button
          type="button"
          className={cn(
            cardBase,
            "mx-auto flex w-full max-w-sm flex-col items-center justify-center px-5 py-5 text-center sm:max-w-md sm:px-6 sm:py-6",
          )}
          onClick={() => setOpenId(null)}
          aria-expanded
        >
          <span className="text-sm font-semibold text-fix-heading">
            {active.title}
          </span>
          <p className="mt-2 line-clamp-2 text-sm leading-snug text-fix-text-muted">
            {active.body}
          </p>
        </button>
      ) : (
        <div
          className="flex flex-wrap items-stretch justify-center gap-3 sm:gap-4"
          role="group"
          aria-label="RootSense AI features"
        >
          {FEATURES.map((f) => (
            <button
              key={f.id}
              type="button"
              className={cn(
                cardBase,
                "flex min-h-[5.5rem] flex-col items-center justify-center px-4 py-3.5 text-center sm:min-h-24 sm:px-5 sm:py-4",
                f.id === "shop" ? "w-[10rem] sm:w-[10.75rem]" : "w-[7.25rem] sm:w-28",
              )}
              onClick={() => setOpenId(f.id)}
              aria-expanded={false}
            >
              <span className="line-clamp-2 text-xs font-semibold leading-snug text-fix-heading sm:text-sm">
                {f.title}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
