"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CreditCard, Smartphone, Nfc } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FormFeedback } from "@/components/ui/FormFeedback";
import { formatPrice } from "@/lib/format";

type Mode = "counter" | "terminal";

export function VendorPosClient() {
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>("counter");
  const [dollars, setDollars] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);
  const [connectAccountId, setConnectAccountId] = useState<string | null>(null);
  const [terminalNote, setTerminalNote] = useState<string | null>(null);

  const amountCents = useMemo(() => {
    const n = Number.parseFloat(dollars);
    if (!Number.isFinite(n) || n <= 0) return null;
    return Math.round(n * 100);
  }, [dollars]);

  useEffect(() => {
    const paid = searchParams.get("paid");
    const orderId = searchParams.get("orderId");
    const sessionId = searchParams.get("session_id");
    if (paid === "1" && orderId) {
      setLastOrderId(orderId);
      setSuccess("Checking payment…");
      void (async () => {
        try {
          const qs = new URLSearchParams({ orderId });
          if (sessionId) qs.set("session_id", sessionId);
          const res = await fetch(`/api/vendor/pos/status?${qs}`);
          const data = (await res.json().catch(() => ({}))) as {
            order?: { status?: string; totalCents?: number };
            error?: string;
          };
          if (!res.ok) {
            setError(data.error || "Could not confirm payment.");
            setSuccess(null);
            return;
          }
          if (data.order?.status === "paid") {
            setSuccess(
              `Payment received${
                data.order.totalCents != null ? ` · ${formatPrice(data.order.totalCents)}` : ""
              }. Funds transfer to your connected Stripe account.`,
            );
          } else {
            setSuccess("Checkout finished — waiting for Stripe to confirm. Refresh in a moment.");
          }
        } catch {
          setError("Could not confirm payment status.");
          setSuccess(null);
        }
      })();
    }
    if (searchParams.get("canceled") === "1") {
      setError("Checkout canceled — no charge was made.");
    }
  }, [searchParams]);

  async function startCounterCheckout() {
    if (amountCents == null) {
      setError("Enter an amount of at least $0.50.");
      return;
    }
    setBusy(true);
    setError(null);
    setSuccess(null);
    setCheckoutUrl(null);
    try {
      const res = await fetch("/api/vendor/pos/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountCents, description: description.trim() || undefined }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        checkoutUrl?: string;
        orderId?: string;
        connectAccountId?: string;
      };
      if (!res.ok || !data.checkoutUrl) {
        setError(data.error || "Could not start checkout.");
        return;
      }
      setCheckoutUrl(data.checkoutUrl);
      setLastOrderId(data.orderId ?? null);
      setConnectAccountId(data.connectAccountId ?? null);
      // Open pay sheet for customer on this device
      window.location.href = data.checkoutUrl;
    } catch {
      setError("Could not start checkout.");
    } finally {
      setBusy(false);
    }
  }

  async function prepareTerminalCharge() {
    if (amountCents == null) {
      setError("Enter an amount of at least $0.50.");
      return;
    }
    setBusy(true);
    setError(null);
    setSuccess(null);
    setTerminalNote(null);
    try {
      const [tokenRes, intentRes] = await Promise.all([
        fetch("/api/vendor/pos/connection-token", { method: "POST" }),
        fetch("/api/vendor/pos/terminal-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amountCents, description: description.trim() || undefined }),
        }),
      ]);
      const tokenData = (await tokenRes.json().catch(() => ({}))) as {
        error?: string;
        locationId?: string;
        connectAccountId?: string;
        note?: string;
      };
      const intentData = (await intentRes.json().catch(() => ({}))) as {
        error?: string;
        orderId?: string;
        paymentIntentId?: string;
        connectAccountId?: string;
      };
      if (!tokenRes.ok) {
        setError(tokenData.error || "Could not create Terminal connection token.");
        return;
      }
      if (!intentRes.ok) {
        setError(intentData.error || "Could not create Terminal PaymentIntent.");
        return;
      }
      setLastOrderId(intentData.orderId ?? null);
      setConnectAccountId(intentData.connectAccountId || tokenData.connectAccountId || null);
      setTerminalNote(
        [
          `PaymentIntent ${intentData.paymentIntentId} ready for your connected account.`,
          tokenData.locationId ? `Platform Terminal location: ${tokenData.locationId}` : null,
          tokenData.note,
          "The Stripe Reader M2 cannot be driven from a web browser (Bluetooth). Use Counter checkout on this phone/tablet today, or a Terminal SDK mobile app for the M2.",
        ]
          .filter(Boolean)
          .join(" "),
      );
      setSuccess("Terminal PaymentIntent created. Use a Terminal SDK app with the M2 to collect the card.");
    } catch {
      setError("Could not prepare Terminal charge.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-fix-heading">Take a payment</h1>
        <p className="mt-2 text-sm text-fix-text-muted">
          Money lands on RootSync&apos;s platform Stripe, then transfers to your connected account
          (same model as Discover checkout).
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={mode === "counter" ? "cta" : "secondary"}
          onClick={() => setMode("counter")}
        >
          <Smartphone className="mr-1.5 h-4 w-4" aria-hidden />
          Counter (phone / tablet)
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === "terminal" ? "cta" : "secondary"}
          onClick={() => setMode("terminal")}
        >
          <Nfc className="mr-1.5 h-4 w-4" aria-hidden />
          Card reader (M2)
        </Button>
      </div>

      <Card className="space-y-4 p-5">
        <div>
          <label htmlFor="pos-amount" className="block text-sm font-medium text-fix-heading">
            Amount (USD)
          </label>
          <input
            id="pos-amount"
            type="number"
            min={0.5}
            step="0.01"
            inputMode="decimal"
            value={dollars}
            onChange={(e) => setDollars(e.target.value)}
            placeholder="25.00"
            className="mt-1 w-full rounded-lg border border-fix-border/20 bg-fix-surface px-3 py-2 text-lg text-fix-text"
          />
        </div>
        <div>
          <label htmlFor="pos-desc" className="block text-sm font-medium text-fix-heading">
            Description (optional)
          </label>
          <input
            id="pos-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Market day · sprouts kit"
            className="mt-1 w-full rounded-lg border border-fix-border/20 bg-fix-surface px-3 py-2 text-sm text-fix-text"
          />
        </div>

        {mode === "counter" ? (
          <div className="space-y-3">
            <p className="text-xs text-fix-text-muted">
              Opens Stripe Checkout on this device — hand it to the customer for card / Apple Pay /
              Google Pay. Available now; no M2 required.
            </p>
            <Button
              type="button"
              variant="cta"
              className="w-full justify-center"
              disabled={busy}
              onClick={() => void startCounterCheckout()}
            >
              <CreditCard className="mr-1.5 h-4 w-4" aria-hidden />
              {busy ? "Starting…" : "Charge on this device"}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-fix-text-muted">
              The M2 needs the RootSync Terminal companion app (Bluetooth). See{" "}
              <code className="text-fix-heading">apps/terminal-pos/README.md</code>. This button
              still creates the PaymentIntent + connection token used by that app.
            </p>
            <Button
              type="button"
              variant="cta"
              className="w-full justify-center"
              disabled={busy}
              onClick={() => void prepareTerminalCharge()}
            >
              {busy ? "Preparing…" : "Prepare M2 / Terminal charge"}
            </Button>
          </div>
        )}
      </Card>

      <FormFeedback success={success} error={error} />

      {connectAccountId ? (
        <p className="text-xs text-fix-text-muted">
          Connected account: <span className="font-mono text-fix-heading">{connectAccountId}</span>
        </p>
      ) : null}
      {lastOrderId ? (
        <p className="text-xs text-fix-text-muted">
          Order: <span className="font-mono">{lastOrderId}</span>
          {" · "}
          <a href="/account/vendor/orders" className="text-fix-link hover:underline">
            Orders received
          </a>
        </p>
      ) : null}
      {checkoutUrl && !busy ? (
        <p className="break-all text-xs text-fix-text-muted">
          Checkout link:{" "}
          <a href={checkoutUrl} className="text-fix-link hover:underline">
            {checkoutUrl}
          </a>
        </p>
      ) : null}
      {terminalNote ? (
        <Card className="border-fix-border/20 bg-fix-bg-muted/40 p-4 text-xs leading-relaxed text-fix-text-muted">
          {terminalNote}
        </Card>
      ) : null}
    </div>
  );
}
