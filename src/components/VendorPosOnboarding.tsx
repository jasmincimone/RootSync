"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ExternalLink } from "lucide-react";

import { Card } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

type Step = {
  id: string;
  title: string;
  description: string;
  href?: string;
  done: boolean;
  required: boolean;
};

type ReadinessPayload = {
  displayName?: string;
  counterReady?: boolean;
  terminalBackendReady?: boolean;
  steps?: Step[];
  terminalAppUrl?: string | null;
  error?: string;
};

/**
 * Self-serve POS onboarding — vendors can complete Counter without platform help.
 * M2 still needs the Terminal app install + their own Stripe Reader.
 */
export function VendorPosOnboarding() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ReadinessPayload | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/vendor/pos/readiness");
      const json = (await res.json().catch(() => ({}))) as ReadinessPayload;
      if (!res.ok) {
        setError(json.error || "Could not load POS setup status.");
        setData(null);
        return;
      }
      setData(json);
    } catch {
      setError("Could not load POS setup status.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <Card className="p-5 text-sm text-fix-text-muted">Checking your POS setup…</Card>
    );
  }

  if (error || !data?.steps) {
    return (
      <Card className="space-y-3 p-5">
        <p className="text-sm text-red-700">{error || "Unavailable"}</p>
        <button
          type="button"
          className="text-sm font-medium text-forest underline"
          onClick={() => void load()}
        >
          Retry
        </button>
      </Card>
    );
  }

  const steps = data.steps;
  const completed = steps.filter((s) => s.done).length;
  const appUrl = data.terminalAppUrl?.trim() || null;

  return (
    <Card className="space-y-5 border-forest/20 bg-forest/5 p-5">
      <div>
        <h2 className="text-base font-semibold text-fix-heading">POS setup guide</h2>
        <p className="mt-1 text-sm text-fix-text-muted">
          Follow these steps on your own. Counter checkout works in the browser as soon as Payment
          Hub is ready — no card reader required.
        </p>
        <p className="mt-2 text-xs font-medium text-fix-text-muted">
          {completed} of {steps.length} steps complete
          {data.counterReady ? " · Counter ready" : " · Counter blocked until Connect is ready"}
        </p>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-fix-bg-muted">
          <div
            className="h-full rounded-full bg-forest transition-all"
            style={{ width: `${steps.length ? (completed / steps.length) * 100 : 0}%` }}
          />
        </div>
      </div>

      <ol className="space-y-3">
        {steps.map((step, index) => (
          <li key={step.id}>
            {step.href ? (
              <Link
                href={step.href}
                className={cn(
                  "flex items-start gap-3 rounded-xl p-2 -mx-2 transition-colors hover:bg-fix-surface/80",
                  step.done && "opacity-70",
                )}
              >
                <StepIcon done={step.done} index={index} />
                <StepCopy step={step} />
              </Link>
            ) : (
              <div className={cn("flex items-start gap-3 p-2 -mx-2", step.done && "opacity-70")}>
                <StepIcon done={step.done} index={index} />
                <StepCopy step={step} />
              </div>
            )}
          </li>
        ))}
      </ol>

      <div id="m2-setup" className="scroll-mt-24 space-y-3 border-t border-fix-border/15 pt-4">
        <h3 className="text-sm font-semibold text-fix-heading">Stripe Reader M2 (optional)</h3>
        <p className="text-sm text-fix-text-muted">
          Full download, TestFlight, first-launch, and troubleshooting steps are on the install
          guide — not just this short list.
        </p>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href="/account/vendor/pos/install" variant="cta" size="sm">
            How to download &amp; install
          </ButtonLink>
          {appUrl ? (
            <ButtonLink href={appUrl} variant="secondary" size="sm" className="inline-flex">
              Get RootSync Terminal
              <ExternalLink className="ml-1.5 h-3.5 w-3.5" aria-hidden />
            </ButtonLink>
          ) : null}
        </div>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-fix-text-muted">
          <li>Buy a Stripe Reader M2 and charge it fully.</li>
          <li>
            Follow{" "}
            <Link href="/account/vendor/pos/install" className="font-medium text-forest underline">
              Install RootSync Terminal
            </Link>
            {appUrl ? (
              <>
                {" "}
                (or open{" "}
                <a
                  href={appUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-forest underline"
                >
                  the install link
                </a>
                )
              </>
            ) : (
              <> — use a TestFlight invite from RootSync if no public link yet</>
            )}
            .
          </li>
          <li>
            Open the app → API URL <code className="text-xs">https://rootsync.io</code> → sign in
            with the same vendor email/password you use here.
          </li>
          <li>
            Do <strong className="text-fix-heading">not</strong> pair the M2 in iPhone Settings →
            Bluetooth. Scan and connect only inside RootSync Terminal.
          </li>
          <li>
            First connect may install reader firmware (5–15 minutes). Keep the app open until it
            finishes.
          </li>
          <li>
            Use <strong className="text-fix-heading">Sync from Stripe</strong> or ACTIVE RootSync
            listings, then charge. Sales + receipts are on the Sales tab.
          </li>
        </ol>
        {!appUrl ? (
          <p className="text-xs text-fix-text-muted">
            When RootSync publishes a TestFlight or App Store link,{" "}
            <strong className="text-fix-heading">Get RootSync Terminal</strong> appears here. Until
            then, open the install guide and ask the team for a TestFlight invite — Counter checkout
            works without the app.
          </p>
        ) : null}
      </div>
    </Card>
  );
}

function StepIcon({ done, index }: { done: boolean; index: number }) {
  if (done) {
    return <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-forest" aria-hidden />;
  }
  return (
    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-fix-border/30 text-[0.65rem] font-semibold text-fix-text-muted">
      {index + 1}
    </span>
  );
}

function StepCopy({ step }: { step: Step }) {
  return (
    <span>
      <span className="block text-sm font-medium text-fix-heading">
        {step.title}
        {!step.required ? (
          <span className="ml-1.5 text-xs font-normal text-fix-text-muted">(optional)</span>
        ) : null}
      </span>
      <span className="mt-0.5 block text-xs text-fix-text-muted">{step.description}</span>
    </span>
  );
}
