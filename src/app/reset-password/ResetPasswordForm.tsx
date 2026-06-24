"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FormFeedback } from "@/components/ui/FormFeedback";
import { PASSWORD_POLICY_TEXT } from "@/lib/passwordPolicy";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (!token) {
      setError("Invalid or missing reset link.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Reset failed.");
        setLoading(false);
        return;
      }
      setSuccess("Saved. Redirecting to sign in…");
      setLoading(false);
      window.setTimeout(() => {
        router.push("/login");
        router.refresh();
      }, 800);
    } catch {
      setError("Something went wrong. Check your connection and try again.");
      setLoading(false);
    }
  };

  return (
    <Card className="p-6">
      {!token ? (
        <p className="text-sm text-bark">This link is invalid. Request a new reset from the sign-in page.</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormFeedback success={success || null} error={error || null} />
          <div>
            <label htmlFor="reset-password" className="block text-sm font-medium text-fix-text">
              New password
            </label>
            <input
              id="reset-password"
              type="password"
              required
              minLength={12}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-fix-border/20 bg-fix-surface px-3 py-2 text-fix-text focus:border-amber focus:outline-none focus:ring-1 focus:ring-amber"
            />
            <p className="mt-0.5 text-xs text-fix-text-muted">{PASSWORD_POLICY_TEXT}</p>
          </div>
          <div>
            <label htmlFor="reset-confirm" className="block text-sm font-medium text-fix-text">
              Confirm password
            </label>
            <input
              id="reset-confirm"
              type="password"
              required
              minLength={12}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="mt-1 w-full rounded-lg border border-fix-border/20 bg-fix-surface px-3 py-2 text-fix-text focus:border-amber focus:outline-none focus:ring-1 focus:ring-amber"
            />
          </div>
          <Button type="submit" disabled={loading || !!success} className="w-full" variant="primary">
            {loading ? "Saving…" : "Set new password"}
          </Button>
        </form>
      )}
      <p className="mt-4 text-center text-sm text-fix-text-muted">
        <Link href="/login" className="text-fix-link hover:text-fix-link-hover">
          Sign in
        </Link>
      </p>
    </Card>
  );
}
