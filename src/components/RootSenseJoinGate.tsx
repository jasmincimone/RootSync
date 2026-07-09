"use client";

import Link from "next/link";
import { Store, UserPlus } from "lucide-react";
import { useEffect, useId } from "react";

import { LandingCtaStack } from "@/components/LandingCtaStack";
import { RoleCtaButton } from "@/components/RoleCtaButton";
import {
  MemberPricingSuffix,
  VendorPricingSuffix,
  VENDOR_STARTUP_PROMO_NOTICE,
} from "@/components/RoleCtaPricing";
import { Card } from "@/components/ui/Card";

import { ROOTSENSE_AI_HREF } from "@/config/rootsensePaths";

const RETURN_PATH = ROOTSENSE_AI_HREF;

type Props = {
  open: boolean;
  onClose: () => void;
};

export function RootSenseJoinGate({ open, onClose }: Props) {
  const headingId = useId();

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const memberHref = `/signup?callbackUrl=${encodeURIComponent(RETURN_PATH)}`;
  const vendorHref = `/signup?callbackUrl=${encodeURIComponent("/account/vendor/apply")}`;
  const loginHref = `/login?callbackUrl=${encodeURIComponent(RETURN_PATH)}`;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby={headingId}
    >
      <button
        type="button"
        className="absolute inset-0 bg-bark/60 backdrop-blur-sm"
        aria-label="Close"
        onClick={onClose}
      />
      <Card className="relative z-[101] w-full max-w-md border-fix-border/30 p-6 shadow-xl">
        <h2 id={headingId} className="text-xl font-semibold text-fix-heading">
          Join RootSync
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-fix-text-muted">
          RootSense AI is for members. Create a free account or apply as a vendor to start chatting
          with Rootie.
        </p>

        <LandingCtaStack className="mt-6">
          <RoleCtaButton
            role="member"
            href={memberHref}
            label="Become a Member"
            suffix={<MemberPricingSuffix />}
            icon={<UserPlus className="h-5 w-5" aria-hidden />}
            variant="cta"
            className="w-full uppercase tracking-wide"
          />
          <RoleCtaButton
            role="vendor"
            href={vendorHref}
            label="Become a Vendor"
            suffix={<VendorPricingSuffix asterisk />}
            contentLayout="stacked"
            centerInfoButton
            infoNotice={VENDOR_STARTUP_PROMO_NOTICE}
            icon={<Store className="h-5 w-5" aria-hidden />}
            variant="cta"
            className="w-full uppercase tracking-wide"
          />
        </LandingCtaStack>

        <p className="mt-5 text-center text-sm text-fix-text-muted">
          Already have an account?{" "}
          <Link href={loginHref} className="font-medium text-fix-link hover:text-fix-link-hover">
            Sign in
          </Link>
        </p>

        <button
          type="button"
          className="mt-4 w-full text-center text-sm font-medium text-fix-text-muted hover:text-fix-heading"
          onClick={onClose}
        >
          Continue browsing
        </button>
      </Card>
    </div>
  );
}
