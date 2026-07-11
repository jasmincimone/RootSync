"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";

import { ButtonLink } from "@/components/ui/Button";
import {
  readStoredDiscoverResults,
  resolveDiscoverBackLink,
  safeDiscoverReturnPath,
  type DiscoverBackLinkOptions,
} from "@/lib/discoverReturn";

type Props = {
  returnTo?: string | null;
  variant?: "link" | "button";
  className?: string;
} & DiscoverBackLinkOptions;

export function DiscoverDetailBackLink({
  returnTo,
  variant = "link",
  className,
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

  const { href, label } = resolveDiscoverBackLink(effectiveReturnTo, {
    profileName,
    currentVendorPath,
  });

  if (variant === "button") {
    return (
      <ButtonLink href={href} variant="ghost" size="sm" className={className}>
        <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
        {label}
      </ButtonLink>
    );
  }

  return (
    <Link
      href={href}
      className={
        className ??
        "inline-flex items-center gap-1.5 text-sm font-medium text-fix-link hover:text-fix-link-hover"
      }
    >
      <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
      {label}
    </Link>
  );
}
