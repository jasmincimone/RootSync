"use client";

import Link from "next/link";
import { useEffect, useId } from "react";

import { Button } from "@/components/ui/Button";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

type CheckoutAuthGateProps = {
  callbackUrl: string;
  onGuestContinue?: () => void;
  allowGuest?: boolean;
  guestLabel?: string;
  title?: string;
  description?: string;
  /** Panel on the page, or modal overlay */
  variant?: "inline" | "modal";
  open?: boolean;
  onClose?: () => void;
};

function GateContent({
  callbackUrl,
  onGuestContinue,
  allowGuest = true,
  guestLabel = "Checkout as guest",
  title = "Sign in or sign up for full RootSync features",
  description = "Keep orders, bookings, favorites, and messages in one place with a free account.",
  onClose,
}: Omit<CheckoutAuthGateProps, "variant" | "open">) {
  const loginHref = `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`;
  const signupHref = `/signup?callbackUrl=${encodeURIComponent(callbackUrl)}`;

  return (
    <>
      <h2 className="text-lg font-semibold text-fix-heading">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-fix-text-muted">{description}</p>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <ButtonLink href={loginHref} variant="cta" size="md" className="flex-1 justify-center">
          Sign in
        </ButtonLink>
        <ButtonLink href={signupHref} variant="secondary" size="md" className="flex-1 justify-center">
          Sign up
        </ButtonLink>
      </div>

      {allowGuest && onGuestContinue ? (
        <div className="mt-5 border-t border-fix-border/15 pt-5">
          <p className="text-sm text-fix-text-muted">No account? You can still continue.</p>
          <Button
            type="button"
            variant="ghost"
            size="md"
            className="mt-2 w-full justify-center text-fix-link hover:text-fix-link-hover"
            onClick={() => {
              onGuestContinue();
              onClose?.();
            }}
          >
            {guestLabel}
          </Button>
        </div>
      ) : null}

      {onClose ? (
        <button
          type="button"
          className="mt-4 w-full text-center text-sm font-medium text-fix-text-muted hover:text-fix-heading"
          onClick={onClose}
        >
          Cancel
        </button>
      ) : null}
    </>
  );
}

export function CheckoutAuthGate({
  variant = "inline",
  open = true,
  onClose,
  ...props
}: CheckoutAuthGateProps) {
  const headingId = useId();

  useEffect(() => {
    if (variant !== "modal" || !open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [variant, open]);

  useEffect(() => {
    if (variant !== "modal" || !open || !onClose) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [variant, open, onClose]);

  if (variant === "modal") {
    if (!open) return null;

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
          <div id={headingId}>
            <GateContent {...props} onClose={onClose} />
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-fix-border/15 bg-fix-bg-muted/50 p-6">
      <GateContent {...props} />
    </div>
  );
}
