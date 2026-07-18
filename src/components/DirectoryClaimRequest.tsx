"use client";

import { useState } from "react";

import { Button, ButtonLink } from "@/components/ui/Button";
import { DIRECTORY_CLAIM_STATUS } from "@/lib/roles";

type Props = {
  directoryListingId: string;
  claimStatus: string;
  claimRequestedByUserId?: string | null;
  currentUserId?: string | null;
  signedIn: boolean;
};

export function DirectoryClaimRequest({
  directoryListingId,
  claimStatus: initialStatus,
  claimRequestedByUserId = null,
  currentUserId = null,
  signedIn,
}: Props) {
  const [claimStatus, setClaimStatus] = useState(initialStatus);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function requestClaim() {
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/directory/claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ directoryListingId }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error ?? "Could not submit your claim request.");
        return;
      }
      setClaimStatus(DIRECTORY_CLAIM_STATUS.PENDING);
    } catch {
      setError("Could not submit your claim request.");
    } finally {
      setPending(false);
    }
  }

  const isOwnRejected =
    claimStatus === DIRECTORY_CLAIM_STATUS.REJECTED &&
    Boolean(currentUserId) &&
    claimRequestedByUserId === currentUserId;

  if (claimStatus === DIRECTORY_CLAIM_STATUS.PENDING) {
    return (
      <div className="mt-4 rounded-xl border border-amber/30 bg-amber/10 p-3">
        <p className="text-sm font-medium text-fix-heading">Claim under review</p>
        <p className="mt-1 text-xs text-fix-text-muted">
          RootSync will verify ownership before connecting this listing to a Vendor profile. Check
          Vendor hub for status updates.
        </p>
      </div>
    );
  }

  if (claimStatus === DIRECTORY_CLAIM_STATUS.CLAIMED) return null;

  if (isOwnRejected) {
    return (
      <div className="mt-4 space-y-3">
        <div className="rounded-xl border border-red-200 bg-red-50 p-3">
          <p className="text-sm font-medium text-fix-heading">Claim denied</p>
          <p className="mt-1 text-xs text-fix-text-muted">
            Your request for this listing was not approved. You can update your Vendor profile and
            request again, or contact support if you believe this was a mistake.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="w-full"
          disabled={pending}
          onClick={() => void requestClaim()}
        >
          {pending ? "Submitting…" : "Request again"}
        </Button>
        {error ? <p className="text-xs text-red-700">{error}</p> : null}
      </div>
    );
  }

  if (!signedIn) {
    const callbackUrl = `/discover/directory/${directoryListingId}`;
    return (
      <div className="mt-4">
        <ButtonLink
          href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
          variant="secondary"
          size="sm"
          className="w-full"
        >
          Sign in to request this listing
        </ButtonLink>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="w-full"
        disabled={pending}
        onClick={() => void requestClaim()}
      >
        {pending ? "Submitting…" : "Request this listing"}
      </Button>
      <p className="mt-2 text-xs text-fix-text-muted">
        Own this business? RootSync will review your request and connect it to an approved Vendor
        profile. Status shows in your Vendor hub.
      </p>
      <p className="mt-2 text-xs text-fix-text-muted">
        Not a Vendor yet?{" "}
        <a href="/account/vendor/apply" className="font-medium text-fix-link hover:text-fix-link-hover">
          Apply here
        </a>
        .
      </p>
      {error ? <p className="mt-2 text-xs text-red-700">{error}</p> : null}
    </div>
  );
}
