"use client";

import { useCallback, useEffect, useState } from "react";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FormFeedback } from "@/components/ui/FormFeedback";
import { CardListSkeleton } from "@/components/ui/LoadingSkeleton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { withDiscoverReturnTo } from "@/lib/discoverReturn";

type OnboardingState = {
  accountId: string;
  readyToProcessPayments: boolean;
  onboardingComplete: boolean;
  requirementsStatus: string;
  cardPaymentsStatus: string;
  payoutsStatus: string;
};

type SubscriptionState = {
  status: string | null;
  priceId: string | null;
  currentPeriodEnd: string | null;
};

type AccountResponse = {
  accountId: string | null;
  onboarding: OnboardingState | null;
  subscription?: SubscriptionState | null;
  message?: string;
  error?: string;
  hint?: string;
};

type Props = {
  /** Stripe onboarding return URL path (without origin). */
  returnPath?: string;
  /** Hide/show developer-only controls. */
  showDevControls?: boolean;
  /** Public Discover vendor page (canonical storefront with listings). */
  storefrontHref?: string;
};

/**
 * Vendor Payment Hub — Stripe Connect onboarding, external payment links,
 * connected-account products, and platform subscription billing.
 *
 * Status for Connect onboarding is always loaded live from Stripe (not cached in DB).
 */
export function VendorStripeConnectSetup({
  returnPath = "/account/vendor/payments",
  showDevControls = false,
  storefrontHref,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [status, setStatus] = useState<OnboardingState | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionState | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [displayName, setDisplayName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [existingAccountId, setExistingAccountId] = useState("");
  const [paymentLinkUrl, setPaymentLinkUrl] = useState("");
  const [paymentLinkSaving, setPaymentLinkSaving] = useState(false);
  const [paymentLinkMessage, setPaymentLinkMessage] = useState("");

  const [productName, setProductName] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [productPrice, setProductPrice] = useState("2500");
  const [productCurrency, setProductCurrency] = useState("usd");

  const loadPaymentLink = useCallback(async () => {
    try {
      const res = await fetch("/api/vendor/payments");
      const data = (await res.json().catch(() => ({}))) as {
        paymentLinkUrl?: string | null;
      };
      if (res.ok) {
        setPaymentLinkUrl(data.paymentLinkUrl ?? "");
      }
    } catch {
      // Non-blocking — Connect UI still works
    }
  }, []);

  const loadAccount = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/connect/account");
      const data = (await res.json()) as AccountResponse;
      if (!res.ok) {
        setError([data.error, data.hint].filter(Boolean).join(" ") || "Could not load payment account.");
        return;
      }
      setAccountId(data.accountId);
      setStatus(data.onboarding);
      setSubscription(data.subscription ?? null);
      if (data.message) setMessage(data.message);
    } catch {
      setError("Could not load payment account.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAccount();
    void loadPaymentLink();
  }, [loadAccount, loadPaymentLink]);

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
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        hint?: string;
        message?: string;
      };
      if (!res.ok) {
        setError([data.error, data.hint].filter(Boolean).join(" ") || "Could not link account.");
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

  async function savePaymentLink(nextUrl?: string) {
    const trimmed = (nextUrl !== undefined ? nextUrl : paymentLinkUrl).trim();
    setPaymentLinkSaving(true);
    setPaymentLinkMessage("");
    setError("");
    try {
      const res = await fetch("/api/vendor/payments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentLinkUrl: trimmed || null }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        paymentLinkUrl?: string | null;
      };
      if (!res.ok) {
        setError(data.error || "Could not save payment link.");
        return;
      }
      setPaymentLinkUrl(data.paymentLinkUrl ?? "");
      setPaymentLinkMessage(
        data.paymentLinkUrl ? "Payment link saved." : "Payment link removed.",
      );
    } catch {
      setError("Could not save payment link.");
    } finally {
      setPaymentLinkSaving(false);
    }
  }

  async function syncProductsFromStripe() {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/connect/products/sync", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        message?: string;
        imported?: number;
        updated?: number;
      };
      if (!res.ok) {
        setError(data.error || "Failed to sync products from Stripe.");
        return;
      }
      setMessage(
        data.message ||
          `Synced from Stripe Dashboard (${data.imported ?? 0} new, ${data.updated ?? 0} updated).`,
      );
    } catch {
      setError("Failed to sync products from Stripe.");
    } finally {
      setSaving(false);
    }
  }

  async function createProduct() {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/connect/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: productName,
          description: productDescription,
          priceInCents: Number.parseInt(productPrice, 10),
          currency: productCurrency,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        product?: { name?: string };
        listing?: { id?: string; title?: string };
      };
      if (!res.ok) {
        setError(data.error || "Failed to create product.");
        return;
      }
      setMessage(
        data.listing?.id
          ? `Created product and listing “${data.listing.title || data.product?.name || "Untitled"}”. Pulse logged when published.`
          : `Created product: ${data.product?.name || "Untitled"}`,
      );
      setProductName("");
      setProductDescription("");
    } catch {
      setError("Failed to create product.");
    } finally {
      setSaving(false);
    }
  }

  async function startSubscriptionCheckout() {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/connect/subscription/checkout", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error || "Failed to start subscription checkout.");
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Failed to start subscription checkout.");
    } finally {
      setSaving(false);
    }
  }

  async function openBillingPortal() {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/connect/subscription/portal", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error || "Failed to create portal session.");
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Failed to create portal session.");
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

      {/* 1) Connect account + live onboarding status + Stripe Dashboard */}
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
          Connect Stripe so RootSync can route Discover checkout and service bookings to you.
          Onboarding status is loaded live from Stripe each time you refresh.
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
            <div className="space-y-1 text-xs text-fix-text-muted">
              <p>
                Account: <span className="font-mono text-fix-heading">{accountId}</span>
              </p>
              <p>Onboarding complete: {status?.onboardingComplete ? "Yes" : "No"}</p>
              <p>Requirements: {status?.requirementsStatus || "n/a"}</p>
              <p>Card payments: {status?.cardPaymentsStatus || "n/a"}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="cta" size="sm" disabled={saving} onClick={() => void beginOnboarding()}>
                Onboard to collect payments
              </Button>
              <Button type="button" variant="secondary" size="sm" disabled={saving} onClick={() => void loadAccount()}>
                Refresh status
              </Button>
              {/* Full-dashboard Connect accounts manage payouts in Stripe Dashboard after onboarding. */}
              <a
                href="https://dashboard.stripe.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center justify-center rounded-full border border-fix-border/25 bg-fix-surface px-4 text-sm font-medium text-fix-link ring-1 ring-inset ring-fix-border/15 hover:bg-fix-bg-muted"
              >
                Open Stripe Dashboard
              </a>
              {storefrontHref ? (
                <a
                  href={withDiscoverReturnTo(storefrontHref, "/account/vendor/payments")}
                  className="inline-flex h-9 items-center justify-center rounded-full border border-fix-border/25 bg-fix-surface px-4 text-sm font-medium text-fix-link ring-1 ring-inset ring-fix-border/15 hover:bg-fix-bg-muted"
                >
                  Open storefront
                </a>
              ) : null}
            </div>
          </div>
        )}
      </Card>

      {/* 2) External payment link (Discover Buy now / Pay Link) */}
      <Card className="p-5">
        <h3 className="text-sm font-semibold text-fix-heading">Payment link</h3>
        <p className="mt-2 text-sm text-fix-text-muted">
          Add a Stripe Payment Link, PayPal checkout, or any external payment URL you already use. External links stay available for community vendors — those sales are off-platform (no RootSync fee). Prefer Connect Checkout when ready so the platform fee applies. When set, listing
          Buy now opens this link unless you also use Stripe Connect (then members see both options).
          You can still override per listing when editing an offering.
        </p>
        <div className="mt-4 grid gap-3 sm:max-w-xl">
          <input
            className="rounded-lg border border-fix-border/20 bg-fix-surface px-3 py-2 text-sm"
            type="url"
            inputMode="url"
            placeholder="https://buy.stripe.com/…"
            value={paymentLinkUrl}
            onChange={(e) => setPaymentLinkUrl(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="cta"
              size="sm"
              disabled={paymentLinkSaving}
              onClick={() => void savePaymentLink()}
            >
              Save payment link
            </Button>
            {paymentLinkUrl.trim() ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={paymentLinkSaving}
                onClick={() => {
                  setPaymentLinkUrl("");
                  void savePaymentLink("");
                }}
              >
                Clear
              </Button>
            ) : null}
          </div>
          {paymentLinkMessage ? (
            <p className="text-xs text-fix-text-muted">{paymentLinkMessage}</p>
          ) : null}
        </div>
      </Card>

      {/* 3) Create products on the connected account (Stripe-Account header) */}
      <Card className="p-5">
        <h3 className="text-sm font-semibold text-fix-heading">Products on your Stripe account</h3>
        <p className="mt-2 text-sm text-fix-text-muted">
          Create a product here (also adds a Discover listing), or create products in the Stripe
          Dashboard — then sync them into your offerings. Webhooks keep Dashboard changes in sync
          when configured.
        </p>
        <div className="mt-3">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={saving || !accountId}
            onClick={() => void syncProductsFromStripe()}
          >
            Sync products from Stripe Dashboard
          </Button>
        </div>
        <div className="mt-4 grid gap-2 sm:max-w-xl">
          <input
            className="rounded-lg border border-fix-border/20 bg-fix-surface px-3 py-2 text-sm"
            placeholder="Product name"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            disabled={!accountId}
          />
          <textarea
            className="rounded-lg border border-fix-border/20 bg-fix-surface px-3 py-2 text-sm"
            placeholder="Product description"
            value={productDescription}
            onChange={(e) => setProductDescription(e.target.value)}
            rows={3}
            disabled={!accountId}
          />
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              className="rounded-lg border border-fix-border/20 bg-fix-surface px-3 py-2 text-sm"
              placeholder="Price in cents (e.g. 2500)"
              value={productPrice}
              onChange={(e) => setProductPrice(e.target.value)}
              disabled={!accountId}
            />
            <input
              className="rounded-lg border border-fix-border/20 bg-fix-surface px-3 py-2 text-sm"
              placeholder="Currency (usd)"
              value={productCurrency}
              onChange={(e) => setProductCurrency(e.target.value)}
              disabled={!accountId}
            />
          </div>
          <Button
            type="button"
            variant="cta"
            size="sm"
            disabled={saving || !accountId || !productName.trim()}
            onClick={() => void createProduct()}
          >
            Create product on connected account
          </Button>
        </div>
      </Card>

      {/* 4) Platform subscription billed to the connected account (customer_account) */}
      <Card className="p-5">
        <h3 className="text-sm font-semibold text-fix-heading">Platform subscription</h3>
        <p className="mt-2 text-sm text-fix-text-muted">
          Optional RootSync plan billed to your connected account via{" "}
          <code className="text-fix-heading">customer_account</code>. Set a real recurring{" "}
          <code className="text-fix-heading">PRICE_ID</code> in the environment first.
        </p>
        {subscription?.status ? (
          <p className="mt-2 text-xs text-fix-text-muted">
            Status: <span className="font-medium text-fix-heading">{subscription.status}</span>
            {subscription.priceId ? ` · Price: ${subscription.priceId}` : ""}
            {subscription.currentPeriodEnd
              ? ` · Period ends: ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`
              : ""}
          </p>
        ) : (
          <p className="mt-2 text-xs text-fix-text-muted">No subscription on file yet.</p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            type="button"
            variant="cta"
            size="sm"
            disabled={saving || !accountId}
            onClick={() => void startSubscriptionCheckout()}
          >
            Start subscription checkout
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={saving || !accountId}
            onClick={() => void openBillingPortal()}
          >
            Open billing portal
          </Button>
        </div>
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
