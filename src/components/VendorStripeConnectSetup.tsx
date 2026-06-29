"use client";

import { useCallback, useEffect, useState } from "react";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FormFeedback } from "@/components/ui/FormFeedback";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { CardListSkeleton } from "@/components/ui/LoadingSkeleton";
import { StatusBadge } from "@/components/ui/StatusBadge";

type OnboardingState = {
  accountId: string;
  readyToProcessPayments: boolean;
  onboardingComplete: boolean;
  requirementsStatus: string;
  cardPaymentsStatus: string;
  payoutsStatus: string;
};

type AccountResponse = {
  accountId: string | null;
  onboarding: OnboardingState | null;
  message?: string;
  error?: string;
};

type Props = {
  /** Stripe onboarding return URL path (without origin). */
  returnPath?: string;
  /** Hide dev-only controls in production vendor UI. */
  showDevControls?: boolean;
};

export function VendorStripeConnectSetup({
  returnPath = "/account/vendor/payments",
  showDevControls = false,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [status, setStatus] = useState<OnboardingState | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [displayName, setDisplayName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [existingAccountId, setExistingAccountId] = useState("");

  const loadAccount = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/connect/account");
      const data = (await res.json()) as AccountResponse;
      if (!res.ok) {
        setError(data.error || "Could not load payment account.");
        return;
      }
      setAccountId(data.accountId);
      setStatus(data.onboarding);
      if (data.message) setMessage(data.message);
    } catch {
      setError("Could not load payment account.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAccount();
  }, [loadAccount]);

  async function createConnectedAccount() {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/connect/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, contactEmail }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        hint?: string;
        recoverableAccountId?: string;
      };
      if (!res.ok) {
        setError([data.error, data.hint].filter(Boolean).join(" ") || "Could not create account.");
        if (data.recoverableAccountId) setExistingAccountId(data.recoverableAccountId);
        return;
      }
      setMessage("Stripe account created. Complete onboarding to accept payments.");
      await loadAccount();
    } catch {
      setError("Could not create Stripe account.");
    } finally {
      setSaving(false);
    }
  }

  async function linkExistingAccount() {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/connect/account/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: existingAccountId }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
      if (!res.ok) {
        setError(data.error || "Could not link account.");
        return;
      }
      setMessage(data.message || "Account linked.");
      setExistingAccountId("");
      await loadAccount();
    } catch {
      setError("Could not link account.");
    } finally {
      setSaving(false);
    }
  }

  async function beginOnboarding() {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/connect/onboarding-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnPath }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
        hint?: string;
      };
      if (!res.ok || !data.url) {
        setError([data.error, data.hint].filter(Boolean).join(" ") || "Could not start onboarding.");
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Could not start onboarding.");
    } finally {
      setSaving(false);
    }
  }

  const paymentsReady =
    status?.readyToProcessPayments ||
    status?.onboardingComplete ||
    status?.cardPaymentsStatus === "active";

  return (
    <div className="space-y-4">
      <FormFeedback success={message || null} error={error || null} />

      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold text-fix-heading">Stripe Connect</h3>
          {loading ? null : paymentsReady ? (
            <StatusBadge label="Ready for checkout" tone="success" />
          ) : accountId ? (
            <StatusBadge label="Onboarding incomplete" tone="warning" />
          ) : (
            <StatusBadge label="Not connected" tone="neutral" />
          )}
        </div>
        <p className="mt-2 text-sm text-fix-text-muted">
          Connect your Stripe account so RootSync can route marketplace checkout and service booking
          payments to you. Platform fees are handled automatically.
        </p>

        {loading ? (
          <div className="mt-4">
            <CardListSkeleton count={1} />
          </div>
        ) : !accountId ? (
          <div className="mt-4 grid gap-3 sm:max-w-lg">
            <input
              className="rounded-lg border border-fix-border/20 bg-fix-surface px-3 py-2 text-sm"
              placeholder="Business display name (optional)"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
            <input
              className="rounded-lg border border-fix-border/20 bg-fix-surface px-3 py-2 text-sm"
              type="email"
              placeholder="Contact email (optional)"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
            />
            <Button type="button" variant="cta" size="sm" disabled={saving} onClick={() => void createConnectedAccount()}>
              Create Stripe account
            </Button>
            <div className="rounded-lg border border-fix-border/15 bg-fix-bg-muted/40 p-3">
              <p className="text-xs text-fix-text-muted">
                Already have a connected account? Paste your <code className="text-fix-heading">acct_…</code> id.
              </p>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <input
                  className="w-full rounded-lg border border-fix-border/20 bg-fix-surface px-3 py-2 text-sm"
                  placeholder="acct_..."
                  value={existingAccountId}
                  onChange={(e) => setExistingAccountId(e.target.value)}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={saving || !existingAccountId.trim()}
                  onClick={() => void linkExistingAccount()}
                >
                  Link account
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <p className="text-xs text-fix-text-muted">
              Account: <span className="font-mono text-fix-heading">{accountId}</span>
              {status?.requirementsStatus ? ` · Requirements: ${status.requirementsStatus}` : ""}
            </p>
            <div className="flex flex-wrap gap-2">
              {!paymentsReady ? (
                <Button type="button" variant="cta" size="sm" disabled={saving} onClick={() => void beginOnboarding()}>
                  Complete Stripe onboarding
                </Button>
              ) : null}
              <Button type="button" variant="secondary" size="sm" disabled={saving} onClick={() => void loadAccount()}>
                Refresh status
              </Button>
            </div>
          </div>
        )}
      </Card>

      <Card className="p-5">
        <h3 className="text-sm font-semibold text-fix-heading">Payment links (alternative)</h3>
        <p className="mt-2 text-sm text-fix-text-muted">
          Prefer not to use Connect yet? Add a Stripe Payment Link or external checkout URL on each
          offering when you create or edit a listing. Members can still discover you on the
          marketplace — checkout opens your link instead of built-in RootSync payments.
        </p>
        <p className="mt-2 text-xs text-fix-text-muted">
          Built-in checkout (recommended) requires Stripe Connect above. Payment links work without
          Connect but won&apos;t sync order history automatically.
        </p>
      </Card>

      {showDevControls && accountId ? (
        <Card className="border-red-200/50 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-bark">Developer</p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="mt-3"
            disabled={saving}
            onClick={() => {
              if (!confirm("Clear Stripe Connect mapping for this user?")) return;
              void fetch("/api/connect/account", { method: "DELETE" }).then(() => loadAccount());
            }}
          >
            Clear Connect mapping
          </Button>
        </Card>
      ) : null}
    </div>
  );
}
