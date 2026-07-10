"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { AccountSubpageBody } from "@/components/account/AccountSubpageBody";
import { VendorOfferingForm } from "@/components/VendorOfferingForm";
import type { SerializedOfferingDetails } from "@/lib/offeringDetails";
import { LISTING_TYPE, OFFERING_STATUS } from "@/lib/roles";

const emptyDetails: SerializedOfferingDetails = {
  product: null,
  service: null,
  resource: null,
  event: null,
};

type WizardStepKey = "basics" | "details" | "options" | "checkout" | "publish";

const WIZARD_STEPS = new Set<WizardStepKey>([
  "basics",
  "details",
  "options",
  "checkout",
  "publish",
]);

export default function EditVendorListingPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = typeof params?.id === "string" ? params.id : "";
  const stepParam = searchParams.get("step");
  const initialWizardStep =
    stepParam && WIZARD_STEPS.has(stepParam as WizardStepKey)
      ? (stepParam as WizardStepKey)
      : undefined;

  const [initial, setInitial] = useState<Parameters<typeof VendorOfferingForm>[0]["initial"]>();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/vendor/listings/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      const l = data.listing;
      setInitial({
        title: l.title,
        description: l.description,
        priceCents: l.priceCents,
        category: l.category ?? "",
        imageUrl: l.imageUrl ?? "",
        paymentUrl: l.paymentUrl ?? "",
        productUrl: l.productUrl ?? "",
        listingType: l.listingType ?? LISTING_TYPE.PRODUCT,
        vendorNotes: l.vendorNotes ?? "",
        status: l.status ?? OFFERING_STATUS.DRAFT,
        scheduledPublishAt: l.scheduledPublishAt ?? null,
        details: l.details ?? emptyDetails,
        booking: l.booking ?? { availabilityRules: [], intakeQuestions: [] },
        variants: l.variants ?? [],
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
      setInitial(undefined);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <AccountSubpageBody>
        <p className="text-sm text-fix-text-muted">Loading…</p>
      </AccountSubpageBody>
    );
  }

  if (!initial) {
    return (
      <AccountSubpageBody>
        <p className="text-sm text-bark">{error ?? "Offering not found."}</p>
      </AccountSubpageBody>
    );
  }

  return (
    <AccountSubpageBody description="Update listing details, pricing, and availability.">
      <VendorOfferingForm
        mode="edit"
        listingId={id}
        initial={initial}
        initialWizardStep={initialWizardStep}
      />
    </AccountSubpageBody>
  );
}
