"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FormFeedback } from "@/components/ui/FormFeedback";

export default function VendorApplyPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [pickupLocation, setPickupLocation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/vendor/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, bio, contactEmail, pickupLocation }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not submit.");
        setSubmitting(false);
        return;
      }
      setSuccess("Submitted.");
      setSubmitting(false);
      window.setTimeout(() => {
        router.push("/account/vendor");
        router.refresh();
      }, 800);
    } catch {
      setError("Something went wrong. Check your connection and try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-fix-heading">Become a vendor</h2>
        <p className="mt-1 text-sm text-fix-text-muted">
          Tell us about your business. After admin approval, you&apos;ll connect Stripe (or use
          payment links on listings) and publish offerings on Discover.
        </p>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormFeedback success={success} error={error} />
          <div>
            <label htmlFor="displayName" className="block text-sm font-medium text-fix-text">
              Business / display name *
            </label>
            <input
              id="displayName"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-fix-border/20 bg-fix-surface px-3 py-2 text-fix-text"
            />
          </div>
          <div>
            <label htmlFor="bio" className="block text-sm font-medium text-fix-text">
              About you
            </label>
            <textarea
              id="bio"
              rows={4}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="mt-1 w-full rounded-lg border border-fix-border/20 bg-fix-surface px-3 py-2 text-fix-text"
            />
          </div>
          <div>
            <label htmlFor="contactEmail" className="block text-sm font-medium text-fix-text">
              Public contact email
            </label>
            <input
              id="contactEmail"
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-fix-border/20 bg-fix-surface px-3 py-2 text-fix-text"
            />
          </div>
          <div>
            <label htmlFor="pickupLocation" className="block text-sm font-medium text-fix-text">
              Pickup / region (optional)
            </label>
            <input
              id="pickupLocation"
              value={pickupLocation}
              onChange={(e) => setPickupLocation(e.target.value)}
              className="mt-1 w-full rounded-lg border border-fix-border/20 bg-fix-surface px-3 py-2 text-fix-text"
            />
          </div>
          <Button type="submit" disabled={submitting || !!success} variant="cta" className="w-full sm:w-auto">
            {submitting ? "Submitting…" : "Submit application"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
