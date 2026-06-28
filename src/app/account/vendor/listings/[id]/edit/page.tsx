"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { VendorOfferingForm } from "@/components/VendorOfferingForm";
import type { SerializedOfferingDetails } from "@/lib/offeringDetails";
import { LISTING_TYPE, OFFERING_STATUS } from "@/lib/roles";

const emptyDetails: SerializedOfferingDetails = {
  product: null,
  service: null,
  resource: null,
  event: null,
};

export default function EditVendorListingPage() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";
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
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return <p className="text-sm text-fix-text-muted">Loading…</p>;
  }

  if (error || !initial) {
    return <p className="text-sm text-bark">{error ?? "Offering not found."}</p>;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <h2 className="text-lg font-semibold text-fix-heading">Edit offering</h2>
      <VendorOfferingForm mode="edit" listingId={id} initial={initial} />
    </div>
  );
}
