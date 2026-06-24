"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

import { Container } from "@/components/Container";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FormFeedback } from "@/components/ui/FormFeedback";

type PrepareOk =
  | { skipTwoFactor: true }
  | {
      needsTwoFactor: true;
      challengeId: string;
      channel: "EMAIL" | "SMS";
      hint?: string;
    };

export function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/account";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"password" | "otp">("password");
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [otpChannel, setOtpChannel] = useState<"EMAIL" | "SMS" | null>(null);
  const [otpPrepareHint, setOtpPrepareHint] = useState<string | null>(null);
  const [code, setCode] = useState("");

  const finishSignIn = async () => {
    const res = await signIn("credentials", {
      email: email.trim(),
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError("Invalid email or password.");
      return;
    }
    setSuccessMsg("Signed in successfully.");
    window.setTimeout(() => {
      router.push(callbackUrl);
      router.refresh();
    }, 500);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login-prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = (await res.json().catch(() => ({}))) as PrepareOk & { error?: string };
      if (!res.ok) {
        setError(
          typeof data.error === "string" ? data.error : "Invalid email or password."
        );
        setLoading(false);
        return;
      }
      if ("skipTwoFactor" in data && data.skipTwoFactor) {
        await finishSignIn();
        return;
      }
      if ("needsTwoFactor" in data && data.needsTwoFactor && data.challengeId) {
        setChallengeId(data.challengeId);
        setOtpChannel(data.channel);
        setOtpPrepareHint(typeof data.hint === "string" ? data.hint : null);
        setStep("otp");
        setCode("");
        setLoading(false);
        return;
      }
      setError("Unexpected response from server.");
    } catch {
      setError("Something went wrong. Check your connection and try again.");
    }
    setLoading(false);
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!challengeId) return;
    setError("");
    setSuccessMsg("");
    setLoading(true);
    const res = await signIn("credentials-2fa", {
      challengeId,
      code: code.trim(),
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError("Invalid or expired code.");
      return;
    }
    setSuccessMsg("Signed in successfully.");
    window.setTimeout(() => {
      router.push(callbackUrl);
      router.refresh();
    }, 500);
  };

  const otpHint =
    otpChannel === "SMS"
      ? "Enter the code we texted to your phone."
      : "Enter the code we emailed you.";

  return (
    <Container className="py-12 sm:py-16">
      <div className="mx-auto max-w-sm">
        <h1 className="text-2xl font-semibold tracking-tight text-fix-heading">Sign in</h1>
        <p className="mt-1 text-sm text-fix-text-muted">
          Access your order history and downloads.
        </p>
        <Card className="mt-6 p-6">
          <FormFeedback success={successMsg || null} />
          {step === "password" ? (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label htmlFor="login-email" className="block text-sm font-medium text-fix-text">
                  Email
                </label>
                <input
                  id="login-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-fix-border/20 bg-fix-surface px-3 py-2 text-fix-text focus:border-amber focus:outline-none focus:ring-1 focus:ring-amber"
                />
              </div>
              <div>
                <label htmlFor="login-password" className="block text-sm font-medium text-fix-text">
                  Password
                </label>
                <input
                  id="login-password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-fix-border/20 bg-fix-surface px-3 py-2 text-fix-text focus:border-amber focus:outline-none focus:ring-1 focus:ring-amber"
                />
                <p className="mt-1 text-right text-xs">
                  <Link href="/forgot-password" className="text-fix-link hover:text-fix-link-hover">
                    Forgot password?
                  </Link>
                </p>
              </div>
              <FormFeedback error={error || null} />
              <Button type="submit" disabled={loading || !!successMsg} className="w-full" variant="primary">
                {loading ? "Signing in…" : "Sign in"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleOtpSubmit} className="space-y-4">
              <p className="text-sm text-fix-text-muted">{otpHint}</p>
              {otpPrepareHint ? (
                <p className="rounded-md border border-amber/40 bg-amber/10 px-3 py-2 text-xs text-fix-text">
                  {otpPrepareHint}
                </p>
              ) : null}
              <div>
                <label htmlFor="login-otp" className="block text-sm font-medium text-fix-text">
                  Verification code
                </label>
                <input
                  id="login-otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-fix-border/20 bg-fix-surface px-3 py-2 text-fix-text focus:border-amber focus:outline-none focus:ring-1 focus:ring-amber"
                  placeholder="6-digit code"
                />
              </div>
              <FormFeedback error={error || null} />
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full sm:w-auto"
                  disabled={loading || !!successMsg}
                  onClick={() => {
                    setStep("password");
                    setChallengeId(null);
                    setOtpChannel(null);
                    setOtpPrepareHint(null);
                    setCode("");
                    setError("");
                  }}
                >
                  Back
                </Button>
                <Button type="submit" disabled={loading || !!successMsg} className="w-full flex-1" variant="primary">
                  {loading ? "Verifying…" : "Verify and sign in"}
                </Button>
              </div>
            </form>
          )}
          <p className="mt-4 text-center text-sm text-fix-text-muted">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-fix-link hover:text-fix-link-hover">
              Sign up
            </Link>
          </p>
        </Card>
      </div>
    </Container>
  );
}
