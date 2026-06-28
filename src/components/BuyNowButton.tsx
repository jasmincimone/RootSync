"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

type Props = {
  listingId: string;
  label?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  fullWidth?: boolean;
  variantId?: string | null;
  disabled?: boolean;
};

export function BuyNowButton({
  listingId,
  label = "Buy now",
  size = "md",
  className,
  fullWidth = false,
  variantId = null,
  disabled = false,
}: Props) {
  const { data: session, status } = useSession();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEmail, setShowEmail] = useState(false);

  const sessionEmail = session?.user?.email?.trim() ?? "";
  const needsEmail = status !== "loading" && !sessionEmail;

  async function startCheckout(checkoutEmail: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/marketplace/listings/${listingId}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: checkoutEmail,
          ...(variantId ? { variantId } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Could not start checkout.");
      }
      if (typeof data.url !== "string" || !data.url) {
        throw new Error("Checkout URL missing from server.");
      }
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout failed.");
      setLoading(false);
    }
  }

  function handleClick() {
    if (needsEmail && !showEmail) {
      setShowEmail(true);
      return;
    }
    const checkoutEmail = sessionEmail || email.trim();
    if (!checkoutEmail) {
      setError("Enter your email to continue.");
      return;
    }
    void startCheckout(checkoutEmail);
  }

  return (
    <div className={cn(fullWidth && "w-full", className)}>
      {showEmail && needsEmail ? (
        <div className="mb-2">
          <label htmlFor={`buy-email-${listingId}`} className="sr-only">
            Email for checkout
          </label>
          <input
            id={`buy-email-${listingId}`}
            type="email"
            autoComplete="email"
            placeholder="Email for receipt"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-fix-border/20 bg-fix-surface px-3 py-2 text-sm text-fix-text"
          />
        </div>
      ) : null}
      {error ? <p className="mb-2 text-xs text-bark">{error}</p> : null}
      <Button
        type="button"
        variant="cta"
        size={size}
        disabled={loading || status === "loading" || disabled}
        className={cn(fullWidth && "w-full")}
        onClick={handleClick}
      >
        {loading ? "Redirecting…" : showEmail && needsEmail ? "Continue to checkout" : label}
      </Button>
    </div>
  );
}
