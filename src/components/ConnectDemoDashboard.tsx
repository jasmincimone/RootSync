"use client";

import { useCallback, useEffect, useState } from "react";

import { Card } from "@/components/ui/Card";

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

export function ConnectDemoDashboard() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [status, setStatus] = useState<OnboardingState | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [displayName, setDisplayName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [existingAccountId, setExistingAccountId] = useState("");
  const [productName, setProductName] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [productPrice, setProductPrice] = useState("2500");
  const [productCurrency, setProductCurrency] = useState("usd");

  const loadAccount = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/connect/account");
      const data = (await res.json()) as AccountResponse;
      if (!res.ok) {
        setError(data.error || "Could not load connected account.");
        return;
      }
      setAccountId(data.accountId);
      setStatus(data.onboarding);
      if (data.message) setMessage(data.message);
    } catch {
      setError("Could not load connected account.");
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
      let data: {
        error?: string;
        message?: string;
        hint?: string;
        recoverableAccountId?: string;
      } = {};
      try {
        data = (await res.json()) as typeof data;
      } catch {
        const raw = await res.text().catch(() => "");
        setError(
          `Create account failed (HTTP ${res.status}). ${raw ? `Response: ${raw.slice(0, 220)}` : "Server response was not JSON."}`
        );
        return;
      }
      if (!res.ok) {
        const parts = [data.error, data.hint].filter((x): x is string => Boolean(x && x.trim()));
        setError(parts.length ? parts.join(" ") : `Create account failed (HTTP ${res.status}).`);
        if (typeof data.recoverableAccountId === "string") {
          setExistingAccountId(data.recoverableAccountId);
          setMessage("A Stripe account was created. Paste/link it below to recover local mapping.");
        }
        return;
      }
      setMessage("Connected account ready.");
      setDisplayName("");
      setContactEmail("");
      await loadAccount();
    } catch (err) {
      const errText =
        err instanceof Error ? `${err.name}: ${err.message}` : `Non-Error thrown: ${String(err)}`;
      setError(`Create request crashed before response. ${errText}`);
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
      let data: { error?: string; message?: string; hint?: string } = {};
      try {
        data = (await res.json()) as typeof data;
      } catch {
        setError(
          `Link failed (HTTP ${res.status}). The server response was not JSON — check the terminal / network tab.`
        );
        return;
      }
      if (!res.ok) {
        const parts = [data.error, data.hint].filter((x): x is string => Boolean(x && x.trim()));
        setError(parts.length ? parts.join(" ") : "Failed to link existing account.");
        return;
      }
      setMessage(data.message || "Connected account linked.");
      setExistingAccountId("");
      await loadAccount();
    } catch {
      setError("Failed to link existing account.");
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
        body: JSON.stringify({ returnPath: "/account/connect-demo" }),
      });
      let data: { url?: string; error?: string; hint?: string } = {};
      try {
        data = (await res.json()) as typeof data;
      } catch {
        setError(
          `Onboarding link failed (HTTP ${res.status}). Response was not JSON — see the Network tab or server terminal for the Stripe error.`
        );
        return;
      }
      const url = typeof data.url === "string" ? data.url : undefined;
      if (!res.ok || !url) {
        const parts = [data.error, data.hint].filter((x): x is string => Boolean(x && x.trim()));
        setError(parts.length ? parts.join(" ") : "Failed to create onboarding link.");
        return;
      }
      window.location.href = url;
    } catch {
      setError("Failed to create onboarding link.");
    } finally {
      setSaving(false);
    }
  }

  async function clearConnectMapping() {
    if (!confirm("Clear the saved Connect account for this user? You can create a new one after.")) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/connect/account", { method: "DELETE" });
      let data: { error?: string; message?: string } = {};
      try {
        data = (await res.json()) as typeof data;
      } catch {
        setError(`Clear failed (HTTP ${res.status}).`);
        return;
      }
      if (!res.ok) {
        setError(data.error || "Could not clear Connect mapping.");
        return;
      }
      setMessage(data.message || "Mapping cleared.");
      await loadAccount();
    } catch {
      setError("Could not clear Connect mapping.");
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
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create product.");
        return;
      }
      setMessage(`Created product: ${data?.product?.name || "Untitled"}`);
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
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error || "Failed to start subscription checkout.");
        return;
      }
      window.location.href = data.url as string;
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
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error || "Failed to create portal session.");
        return;
      }
      window.location.href = data.url as string;
    } catch {
      setError("Failed to create portal session.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {error ? <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p> : null}
      {message ? <p className="rounded-md border border-forest/40 bg-forest/10 px-3 py-2 text-sm text-fix-heading">{message}</p> : null}

      <Card className="p-5">
        <h3 className="text-sm font-semibold text-fix-heading">1) Connected account + onboarding</h3>
        {loading ? (
          <p className="mt-2 text-sm text-fix-text-muted">Loading...</p>
        ) : (
          <div className="mt-2 space-y-2 text-sm text-fix-text-muted">
            <p>Connected account ID: {accountId || "Not created yet"}</p>
            <p>Onboarding complete: {status ? (status.onboardingComplete ? "Yes" : "No") : "No account"}</p>
            <p>Requirements status: {status?.requirementsStatus || "n/a"}</p>
            <p>Card payments capability: {status?.cardPaymentsStatus || "n/a"}</p>
          </div>
        )}

        {!accountId ? (
          <div className="mt-4 grid gap-2 sm:max-w-lg">
            <input
              className="rounded-lg border border-fix-border/25 bg-fix-surface px-3 py-2 text-sm"
              placeholder="Display name (optional)"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
            <input
              className="rounded-lg border border-fix-border/25 bg-fix-surface px-3 py-2 text-sm"
              placeholder="Contact email (optional)"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
            />
            <button
              type="button"
              onClick={() => void createConnectedAccount()}
              disabled={saving}
              className="inline-flex h-10 items-center justify-center rounded-full bg-fix-cta px-4 text-sm font-medium text-fix-cta-foreground hover:opacity-90 disabled:opacity-50"
            >
              Create connected account
            </button>
            <div className="mt-2 rounded-lg border border-fix-border/20 bg-fix-bg-muted/40 p-3">
              <p className="text-xs text-fix-text-muted">
                Already created an account in Stripe but it is not linked here? Paste the <code>acct_...</code> id.
              </p>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <input
                  className="w-full rounded-lg border border-fix-border/25 bg-fix-surface px-3 py-2 text-sm"
                  placeholder="acct_..."
                  value={existingAccountId}
                  onChange={(e) => setExistingAccountId(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => void linkExistingAccount()}
                  disabled={saving || !existingAccountId.trim()}
                  className="inline-flex h-10 items-center justify-center rounded-full border border-fix-border/30 bg-fix-surface px-4 text-sm font-medium text-fix-heading hover:bg-fix-bg-muted disabled:opacity-50"
                >
                  Link existing account
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <p className="text-xs text-fix-text-muted">
              “Onboard” opens Stripe&apos;s hosted onboarding flow in this browser tab (not the Stripe Dashboard). Use
              the same port you use for this app (e.g. localhost:3001) so return URLs match.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void beginOnboarding()}
                disabled={saving}
                className="inline-flex h-10 items-center justify-center rounded-full bg-fix-cta px-4 text-sm font-medium text-fix-cta-foreground hover:opacity-90 disabled:opacity-50"
              >
                Onboard to collect payments
              </button>
              <button
                type="button"
                onClick={() => void loadAccount()}
                disabled={saving}
                className="inline-flex h-10 items-center justify-center rounded-full border border-fix-border/30 bg-fix-surface px-4 text-sm font-medium text-fix-heading hover:bg-fix-bg-muted disabled:opacity-50"
              >
                Refresh status
              </button>
              <a
                href={`/connect-store/${accountId}`}
                className="inline-flex h-10 items-center justify-center rounded-full border border-fix-border/30 bg-fix-surface px-4 text-sm font-medium text-fix-heading hover:bg-fix-bg-muted"
              >
                Open storefront page
              </a>
              {process.env.NODE_ENV === "development" ? (
                <button
                  type="button"
                  onClick={() => void clearConnectMapping()}
                  disabled={saving}
                  className="inline-flex h-10 items-center justify-center rounded-full border border-red-300/60 bg-red-50 px-4 text-sm font-medium text-red-900 hover:bg-red-100 disabled:opacity-50"
                >
                  Clear mapping (dev)
                </button>
              ) : null}
            </div>
          </div>
        )}
      </Card>

      <Card className="p-5">
        <h3 className="text-sm font-semibold text-fix-heading">2) Create product (on connected account)</h3>
        <p className="mt-2 text-sm text-fix-text-muted">
          This sends `stripeAccount` request options so product/price are created on the connected account.
        </p>
        <div className="mt-4 grid gap-2 sm:max-w-xl">
          <input
            className="rounded-lg border border-fix-border/25 bg-fix-surface px-3 py-2 text-sm"
            placeholder="Product name"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
          />
          <textarea
            className="rounded-lg border border-fix-border/25 bg-fix-surface px-3 py-2 text-sm"
            placeholder="Product description"
            value={productDescription}
            onChange={(e) => setProductDescription(e.target.value)}
            rows={3}
          />
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              className="rounded-lg border border-fix-border/25 bg-fix-surface px-3 py-2 text-sm"
              placeholder="Price in cents (e.g. 2500)"
              value={productPrice}
              onChange={(e) => setProductPrice(e.target.value)}
            />
            <input
              className="rounded-lg border border-fix-border/25 bg-fix-surface px-3 py-2 text-sm"
              placeholder="Currency (usd)"
              value={productCurrency}
              onChange={(e) => setProductCurrency(e.target.value)}
            />
          </div>
          <button
            type="button"
            disabled={saving || !accountId || !productName.trim()}
            onClick={() => void createProduct()}
            className="inline-flex h-10 items-center justify-center rounded-full bg-fix-cta px-4 text-sm font-medium text-fix-cta-foreground hover:opacity-90 disabled:opacity-50"
          >
            Create product on connected account
          </button>
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="text-sm font-semibold text-fix-heading">3) Subscription + billing portal (platform-level)</h3>
        <p className="mt-2 text-sm text-fix-text-muted">
          Uses connected account ID as `customer_account`. Set `PRICE_ID` in your env first.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={saving || !accountId}
            onClick={() => void startSubscriptionCheckout()}
            className="inline-flex h-10 items-center justify-center rounded-full bg-fix-cta px-4 text-sm font-medium text-fix-cta-foreground hover:opacity-90 disabled:opacity-50"
          >
            Start subscription checkout
          </button>
          <button
            type="button"
            disabled={saving || !accountId}
            onClick={() => void openBillingPortal()}
            className="inline-flex h-10 items-center justify-center rounded-full border border-fix-border/30 bg-fix-surface px-4 text-sm font-medium text-fix-heading hover:bg-fix-bg-muted disabled:opacity-50"
          >
            Open billing portal
          </button>
        </div>
      </Card>
    </div>
  );
}
