"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { cn } from "@/lib/cn";

type Feature = {
  id: string;
  title: string;
  href: string;
  iconSrc: string;
  description: string;
  comingSoon?: boolean;
  /** Tailwind grid placement for the 2×2 explorer layout */
  gridClass: string;
};

const FEATURES: Feature[] = [
  {
    id: "discover",
    title: "Discover",
    href: "/discover",
    iconSrc: "/images/platform/features/marketplace.png",
    description:
      "The primary way to find local opportunities — browse verified Vendors and Listings for Products, Services, Resources, and Events near you.",
    gridClass: "col-start-1 row-start-1",
  },
  {
    id: "rootsync-ai",
    title: "RootSync AI",
    href: "/rootsyncai",
    iconSrc: "/images/platform/features/rootsync-ai.png",
    description:
      "Guidance for growing, planning, and local living. Education creates confidence — learn first so you can participate with clarity.",
    gridClass: "col-start-2 row-start-1",
  },
  {
    id: "messages",
    title: "Messages",
    href: "/messages/inbox",
    iconSrc: "/images/platform/features/messages.png",
    description:
      "Private conversations between Members. Reach Vendors from Discover or connect with others through Community.",
    gridClass: "col-start-1 row-start-2",
  },
  {
    id: "community",
    title: "Community",
    href: "/community",
    iconSrc: "/images/platform/features/community.png",
    description:
      "Where Members ask questions, share knowledge, and support one another. Members and Vendors can post.",
    gridClass: "col-start-2 row-start-2",
  },
];

export function PlatformFeaturesExplorer() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = useMemo(
    () => FEATURES.find((feature) => feature.id === selectedId) ?? null,
    [selectedId],
  );

  useEffect(() => {
    if (!selectedId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId]);

  return (
    <div className="mt-10">
      <div className="relative rounded-3xl bg-fix-surface/70 p-1.5 sm:p-2 md:p-3">
        <div className="grid grid-cols-2 grid-rows-2 gap-2 sm:gap-3 md:gap-4">
          {FEATURES.map((feature) => (
            <button
              key={feature.id}
              type="button"
              onClick={() => setSelectedId(feature.id)}
              aria-label={`Open ${feature.title}`}
              className={cn(
                feature.gridClass,
                "group rounded-[18px] bg-[#f3f0ed] p-1.5 transition hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fix-cta focus-visible:ring-offset-2 sm:rounded-[22px] sm:p-2 md:rounded-[26px] md:p-2.5",
                selected?.id === feature.id && "ring-2 ring-fix-cta/60",
              )}
              aria-pressed={selected?.id === feature.id}
            >
              <Image
                src={feature.iconSrc}
                alt=""
                width={420}
                height={420}
                sizes="(max-width: 640px) 42vw, (max-width: 768px) 45vw, 50vw"
                className="mx-auto h-auto w-full max-w-[9rem] rounded-[14px] object-cover sm:max-w-[11rem] sm:rounded-[18px] md:max-w-none md:rounded-[22px]"
              />
            </button>
          ))}
        </div>

        {selected ? (
          <button
            type="button"
            aria-label="Close feature details"
            onClick={() => setSelectedId(null)}
            className="absolute inset-0 z-20 rounded-3xl bg-fix-surface/45 backdrop-blur-[2px]"
          >
            <span className="sr-only">Close</span>
          </button>
        ) : null}

        {selected ? (
          <div className="absolute inset-0 z-30 flex items-center justify-center p-3 sm:p-6">
            <Card
              className="relative w-full max-w-2xl p-5 sm:p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full text-fix-text-muted hover:bg-fix-bg-muted hover:text-fix-heading"
                aria-label="Close"
              >
                X
              </button>
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                <Image
                  src={selected.iconSrc}
                  alt={selected.title}
                  width={210}
                  height={210}
                  className="h-auto w-full max-w-[170px] rounded-2xl border border-fix-border/15 object-cover"
                />
                <div className="min-w-0 flex-1 pr-6 sm:pr-8">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xl font-semibold text-fix-heading">{selected.title}</h3>
                    {selected.comingSoon ? <StatusBadge label="Coming soon" tone="warning" /> : null}
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-fix-text-muted">
                    {selected.description}
                  </p>
                  <div className="mt-5">
                    <ButtonLink href={selected.href} variant="cta" size="md">
                      {selected.comingSoon ? `Preview ${selected.title}` : `Go to ${selected.title}`}
                    </ButtonLink>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        ) : null}
      </div>
      {!selected ? (
        <p className="mt-5 text-center text-sm text-fix-text-muted">
          Click any feature icon to open details.
        </p>
      ) : null}
    </div>
  );
}
