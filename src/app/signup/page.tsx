"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { Container } from "@/components/Container";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FormFeedback } from "@/components/ui/FormFeedback";
import { LegalConsentModal } from "@/components/LegalConsentModal";
import { PASSWORD_POLICY_TEXT } from "@/lib/passwordPolicy";
import { safeCallbackPath } from "@/lib/safeCallbackPath";

export default function SignupPage() {
  const router = useRouter();
  const [returnTo, setReturnTo] = useState("/");
  const [legalStepDone, setLegalStepDone] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [agreeSmsTwoFactorTerms, setAgreeSmsTwoFactorTerms] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setReturnTo(safeCallbackPath(params.get("callbackUrl"), "/"));
  }, []);

  const loginHref =
    returnTo === "/"
      ? "/login"
      : `/login?callbackUrl=${encodeURIComponent(returnTo)}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!agreeSmsTwoFactorTerms) {
      setError("You must agree to SMS and two-factor authentication terms to create an account.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          name: name.trim() || undefined,
          agreeTerms: true,
          agreePrivacy: true,
          agreeSmsTwoFactorTerms: true,
          marketingOptIn,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Sign up failed.");
        setLoading(false);
        return;
      }
      setSuccess("Account created.");
      setLoading(false);
      window.setTimeout(() => {
        router.push(loginHref);
        router.refresh();
      }, 800);
    } catch {
      setError("Something went wrong. Check your connection and try again.");
      setLoading(false);
    }
  };

  const handleDeclineLegal = useCallback(() => {
    router.push(returnTo);
  }, [router, returnTo]);

  return (
    <Container className="py-12 sm:py-16">
      <LegalConsentModal
        open={!legalStepDone}
        onAccept={() => setLegalStepDone(true)}
        onDecline={handleDeclineLegal}
      />
      <div className="mx-auto max-w-md">
        <h1 className="text-2xl font-semibold tracking-tight text-fix-heading">Create account</h1>
        <p className="mt-1 text-sm text-fix-text-muted">
          Create an account to view order history and access purchased resources. You can add a phone number later in
          Account Settings to use SMS verification and SMS two-factor. New accounts use email verification codes at
          sign in by default.
        </p>
        {!legalStepDone ? (
          <div className="mt-6 space-y-4">
            <p className="text-sm text-fix-text-muted">
              Use the pop-up to review and agree to our Terms &amp; Conditions and Privacy Policy first.
            </p>
            <p className="text-center text-sm text-fix-text-muted">
              Already have an account?{" "}
              <Link href={loginHref} className="text-fix-link hover:text-fix-link-hover">
                Sign in
              </Link>
            </p>
          </div>
        ) : null}
        {legalStepDone ? (
        <Card className="mt-6 p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormFeedback success={success || null} error={error || null} />
            <div>
              <label htmlFor="signup-email" className="block text-sm font-medium text-fix-text">
                Email
              </label>
              <input
                id="signup-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-fix-border/20 bg-fix-surface px-3 py-2 text-fix-text focus:border-amber focus:outline-none focus:ring-1 focus:ring-amber"
              />
            </div>
            <div>
              <label htmlFor="signup-name" className="block text-sm font-medium text-fix-text">
                Name (optional)
              </label>
              <input
                id="signup-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-fix-border/20 bg-fix-surface px-3 py-2 text-fix-text focus:border-amber focus:outline-none focus:ring-1 focus:ring-amber"
              />
            </div>
            <div>
              <label htmlFor="signup-password" className="block text-sm font-medium text-fix-text">
                Password
              </label>
              <input
                id="signup-password"
                type="password"
                required
                minLength={12}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-fix-border/20 bg-fix-surface px-3 py-2 text-fix-text focus:border-amber focus:outline-none focus:ring-1 focus:ring-amber"
              />
              <p className="mt-0.5 text-xs text-fix-text-muted">{PASSWORD_POLICY_TEXT}</p>
            </div>

            <div className="rounded-lg border-2 border-amber/40 bg-amber/5 p-4">
              <p className="text-sm font-semibold text-fix-heading">Security &amp; communications</p>
              <p className="mt-1 text-xs text-fix-text-muted">
                Two-factor authentication (2FA) is optional—you can enable it in Account Settings after you add a phone.
                By checking the first box, you agree to the terms for future SMS when you turn those features on.
              </p>
              <div className="mt-3 space-y-3">
                <label className="flex cursor-pointer items-start gap-3 text-sm leading-snug text-fix-text">
                  <input
                    type="checkbox"
                    checked={agreeSmsTwoFactorTerms}
                    onChange={(e) => {
                      setAgreeSmsTwoFactorTerms(e.target.checked);
                      setError("");
                    }}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-fix-border/40 text-amber focus:ring-amber"
                    required
                  />
                  <span>
                    I agree to receive text messages from RootSync for <strong>account security</strong> and{" "}
                    <strong>two-factor authentication</strong> when I enable those features (including verification and
                    sign-in codes). Message and data rates may apply.{" "}
                    <span className="text-bark">(Required)</span>
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-3 text-sm leading-snug text-fix-text">
                  <input
                    type="checkbox"
                    checked={marketingOptIn}
                    onChange={(e) => {
                      setMarketingOptIn(e.target.checked);
                      setError("");
                    }}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-fix-border/40 text-amber focus:ring-amber"
                  />
                  <span>
                    I want to receive <strong>optional marketing, promotional, and educational</strong> emails and texts
                    from RootSync. I can unsubscribe or change this anytime in Account Settings.{" "}
                    <span className="text-fix-text-muted">(Optional)</span>
                  </span>
                </label>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading || !!success || !agreeSmsTwoFactorTerms}
              className="w-full"
              variant="primary"
              title={!agreeSmsTwoFactorTerms ? "Agree to SMS and security terms above" : undefined}
            >
              {loading ? "Creating account…" : "Create account"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-fix-text-muted">
            Already have an account?{" "}
            <Link href={loginHref} className="text-fix-link hover:text-fix-link-hover">
              Sign in
            </Link>
          </p>
        </Card>
        ) : null}
      </div>
    </Container>
  );
}

