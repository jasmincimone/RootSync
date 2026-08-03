"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";

import { Container } from "@/components/Container";
import { ListingImage } from "@/components/ListingImage";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import {
  SEED_PACK_GROW_GUIDE_PATH,
  type SeedPackGrowGuide,
} from "@/config/seedPackGrowGuides";

export type SeedGuideCard = SeedPackGrowGuide & { resolvedImageUrl: string | null };

type Props = {
  seeds: SeedGuideCard[];
  listingHref: string | null;
};

function SeedGuideCardButton({
  seed,
  open,
  onToggle,
}: {
  seed: SeedGuideCard;
  open: boolean;
  onToggle: () => void;
}) {
  const panelId = useId();

  return (
    <Card className="h-full overflow-hidden p-0">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
        className="flex w-full items-start gap-3 p-4 text-left sm:p-5"
      >
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-fix-border/15 bg-fix-bg-muted">
          {seed.resolvedImageUrl ? (
            <ListingImage src={seed.resolvedImageUrl} alt="" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-lg text-fix-border">
              ◇
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-sm font-semibold text-fix-heading sm:text-base">{seed.name}</h2>
            <ChevronDown
              className={cn(
                "mt-0.5 h-5 w-5 shrink-0 text-fix-text-muted transition-transform",
                open && "rotate-180",
              )}
              aria-hidden
            />
          </div>
          <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-fix-text-muted">
            {seed.summary}
          </p>
          <p className="mt-2 text-xs font-medium text-fix-link">
            {open ? "Hide growing guide" : "Open growing guide"}
          </p>
        </div>
      </button>

      {open ? (
        <div
          id={panelId}
          className="space-y-4 border-t border-fix-border/15 bg-fix-bg-muted/30 px-4 py-4 sm:px-5 sm:py-5"
        >
          <GuideBlock title="Sow" body={seed.sow} />
          <GuideBlock title="Light" body={seed.light} />
          <GuideBlock title="Water" body={seed.water} />
          <GuideBlock title="Harvest" body={seed.harvest} />
          {seed.tips.length > 0 ? (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-fix-text-muted">
                Tips
              </h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-fix-text">
                {seed.tips.map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}

function GuideBlock({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-fix-text-muted">
        {title}
      </h3>
      <p className="mt-1.5 text-sm leading-relaxed text-fix-text">{body}</p>
    </div>
  );
}

export function SeedPackGrowGuideClient({ seeds, listingHref }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-fix-bg-muted/40">
      <div className="border-b border-fix-border/15 bg-gradient-to-b from-forest/10 via-fix-surface to-fix-bg-muted/40">
        <Container className="py-10 sm:py-14">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-forest">
            The Fix Urban Roots
          </p>
          <h1 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-fix-heading sm:text-4xl">
            Seed pack grow guides
          </h1>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-fix-text-muted">
            Tap a seed type for sowing, light, water, and harvest tips. Beginner-friendly guidance for
            your Mix &amp; Match Seed Packs.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {listingHref ? (
              <ButtonLink href={listingHref} variant="cta" size="md">
                Shop Mix &amp; Match Seed Packs
              </ButtonLink>
            ) : null}
            <ButtonLink href="/signup" variant="secondary" size="md">
              Join RootSync
            </ButtonLink>
          </div>
        </Container>
      </div>

      <Container className="py-8 sm:py-10">
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {seeds.map((seed) => (
            <li key={seed.id}>
              <SeedGuideCardButton
                seed={seed}
                open={openId === seed.id}
                onToggle={() => setOpenId((current) => (current === seed.id ? null : seed.id))}
              />
            </li>
          ))}
        </ul>

        <p className="mt-10 text-center text-sm text-fix-text-muted">
          Questions at the booth? Ask The Fix Urban Roots team — or{" "}
          <Link href="/signup" className="font-medium text-fix-link hover:text-fix-link-hover">
            create a RootSync account
          </Link>{" "}
          to stay in the loop.
        </p>
        <p className="mt-2 text-center text-xs text-fix-text-muted">
          Share this page: rootsync.io{SEED_PACK_GROW_GUIDE_PATH}
        </p>
      </Container>
    </div>
  );
}
