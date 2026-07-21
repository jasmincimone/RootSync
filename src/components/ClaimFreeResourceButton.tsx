"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

type Props = {
  listingId: string;
  variantId?: string | null;
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  disabled?: boolean;
};

/** Signed-in Members claim a $0 Resource — no Stripe. */
export function ClaimFreeResourceButton({
  listingId,
  variantId = null,
  size = "md",
  fullWidth = false,
  disabled = false,
}: Props) {
  const { status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function claim() {
    if (status === "unauthenticated") {
      router.push(`/login?callbackUrl=${encodeURIComponent(`/discover/listings/${listingId}`)}`);
      return;
    }
    if (status !== "authenticated") return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/marketplace/listings/${listingId}/claim-free`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId: variantId || undefined }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        downloadHref?: string;
        orderId?: string;
      };
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Could not start download.");
      }
      if (data.downloadHref) {
        window.location.href = data.downloadHref;
        return;
      }
      if (data.orderId) {
        router.push(`/account/orders/${data.orderId}`);
        return;
      }
      throw new Error("Download link missing.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start download.");
    } finally {
      setLoading(false);
    }
  }

  if (status === "unauthenticated") {
    return (
      <div className={cn("flex flex-col gap-2", fullWidth && "w-full")}>
        <Button
          type="button"
          variant="cta"
          size={size}
          className={fullWidth ? "w-full" : undefined}
          disabled={disabled}
          onClick={() =>
            router.push(`/login?callbackUrl=${encodeURIComponent(`/discover/listings/${listingId}`)}`)
          }
        >
          Sign in to download free
        </Button>
        <p className="text-xs text-fix-text-muted">
          Free Resources need a Member account.{" "}
          <Link href="/signup" className="font-medium text-fix-link hover:underline">
            Become a Member
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-2", fullWidth && "w-full")}>
      <Button
        type="button"
        variant="cta"
        size={size}
        className={fullWidth ? "w-full" : undefined}
        disabled={disabled || loading || status === "loading"}
        onClick={() => void claim()}
      >
        {loading ? "Preparing download…" : "Download free"}
      </Button>
      {error ? <p className="text-sm text-bark">{error}</p> : null}
    </div>
  );
}
