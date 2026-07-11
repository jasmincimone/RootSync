"use client";

import { useEffect, useState } from "react";

import { StickySubpageBar } from "@/components/account/StickySubpageBar";
import {
  readStoredDiscoverResults,
  resolveDiscoverBackLink,
  safeDiscoverReturnPath,
  type DiscoverBackLinkOptions,
} from "@/lib/discoverReturn";

type Props = {
  returnTo?: string | null;
  /** Listing / detail title shown in the sticky bar. */
  title?: string | null;
} & DiscoverBackLinkOptions;

/**
 * Sticky Discover detail chrome: back control + title stay visible while scrolling.
 * Prefers `returnTo` from the URL; falls back to remembered Discover results.
 */
export function DiscoverDetailTopBack({
  returnTo,
  title,
  profileName,
  currentVendorPath,
}: Props) {
  const [effectiveReturnTo, setEffectiveReturnTo] = useState(returnTo ?? null);

  useEffect(() => {
    if (safeDiscoverReturnPath(returnTo)) {
      setEffectiveReturnTo(returnTo ?? null);
      return;
    }
    setEffectiveReturnTo(readStoredDiscoverResults());
  }, [returnTo]);

  const { href, backLabel } = resolveDiscoverBackLink(effectiveReturnTo, {
    profileName,
    currentVendorPath,
  });

  return (
    <StickySubpageBar
      backHref={href}
      backLabel={backLabel}
      title={title ?? null}
      className="-mx-4 sm:-mx-6"
    />
  );
}
