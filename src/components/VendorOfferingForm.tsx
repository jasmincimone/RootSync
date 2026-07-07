"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { VendorListingImageField } from "@/components/VendorListingImageField";
import { VendorResourceFileField } from "@/components/VendorResourceFileField";
import { FormSection } from "@/components/FormSection";
import { ServiceBookingConfigFields } from "@/components/ServiceBookingConfigFields";
import {
  OfferingVariantEditor,
  draftsFromSerialized,
  draftsToPayload,
  type VariantDraft,
} from "@/components/OfferingVariantEditor";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FormFeedback } from "@/components/ui/FormFeedback";
import { RESOURCE_SUBTYPE_OPTIONS } from "@/config/resourceSubtypes";
import { cn } from "@/lib/cn";
import type { SerializedOfferingDetails } from "@/lib/offeringDetails";
import type { SerializedOfferingVariant } from "@/lib/offeringVariants";
import { formatPrice } from "@/lib/format";
import {
  DEFAULT_AVAILABILITY_RULES,
  type AvailabilityRuleInput,
  type IntakeQuestionInput,
  type SerializedServiceBookingConfig,
} from "@/lib/serviceBookingConfig";
import {
  FULFILLMENT_METHOD,
  LISTING_TYPE,
  type ResourceSubtype,
  OFFERING_STATUS,
  SERVICE_KIND,
  type FulfillmentMethod,
  type ServiceKind,
} from "@/lib/roles";

type Props = {
  mode: "create" | "edit";
  listingId?: string;
  initial?: {
    title: string;
    description: string;
    priceCents: number;
    category: string;
    imageUrl: string;
    paymentUrl: string;
    productUrl: string;
    listingType: string;
    vendorNotes: string;
    status: string;
    scheduledPublishAt: string | null;
    details: SerializedOfferingDetails;
    booking?: SerializedServiceBookingConfig;
    variants?: SerializedOfferingVariant[];
  };
};

function toDatetimeLocalValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocalValue(value: string): string | null {
  if (!value.trim()) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

const inputClass =
  "mt-1 w-full rounded-lg border border-fix-border/20 bg-fix-surface px-3 py-2 text-fix-text";

type WizardStepKey = "basics" | "details" | "options" | "checkout" | "publish";

const WIZARD_STEP_LABELS: Record<WizardStepKey, string> = {
  basics: "Basics",
  details: "Details",
  options: "Options",
  checkout: "Checkout",
  publish: "Publish",
};

function visibleWizardSteps(listingType: string): WizardStepKey[] {
  const steps: WizardStepKey[] = ["basics", "details"];
  if (listingType !== LISTING_TYPE.EVENT) steps.push("options");
  steps.push("checkout", "publish");
  return steps;
}

export function VendorOfferingForm({ mode, listingId, initial }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [priceDollars, setPriceDollars] = useState(
    initial ? (initial.priceCents / 100).toFixed(2) : "",
  );
  const [category, setCategory] = useState(initial?.category ?? "");
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl ?? "");
  const [paymentUrl, setPaymentUrl] = useState(initial?.paymentUrl ?? "");
  const [productUrl, setProductUrl] = useState(initial?.productUrl ?? "");
  const [listingType, setListingType] = useState(initial?.listingType ?? LISTING_TYPE.PRODUCT);
  const [vendorNotes, setVendorNotes] = useState(initial?.vendorNotes ?? "");
  const [status, setStatus] = useState(initial?.status ?? OFFERING_STATUS.DRAFT);
  const [scheduledPublishAt, setScheduledPublishAt] = useState(
    toDatetimeLocalValue(initial?.scheduledPublishAt),
  );
  const [step, setStep] = useState(0);

  const wizardSteps = visibleWizardSteps(listingType);
  const currentStepKey = wizardSteps[step] ?? "basics";
  const lastStepIndex = wizardSteps.length - 1;

  useEffect(() => {
    setStep((s) => Math.min(s, visibleWizardSteps(listingType).length - 1));
  }, [listingType]);

  const [requiresShipping, setRequiresShipping] = useState(
    initial?.details.product?.requiresShipping ?? true,
  );
  const [sku, setSku] = useState(initial?.details.product?.sku ?? "");

  const [serviceKind, setServiceKind] = useState<ServiceKind>(
    initial?.details.service?.serviceKind ?? SERVICE_KIND.ONE_TIME,
  );
  const [durationMinutes, setDurationMinutes] = useState(
    initial?.details.service?.durationMinutes?.toString() ?? "",
  );
  const [serviceRadius, setServiceRadius] = useState(initial?.details.service?.serviceRadius ?? "");
  const [serviceTerms, setServiceTerms] = useState(initial?.details.service?.terms ?? "");
  const [bookingUrl, setBookingUrl] = useState(initial?.details.service?.bookingUrl ?? "");
  const [fulfillmentMethod, setFulfillmentMethod] = useState<FulfillmentMethod>(
    initial?.details.service?.fulfillmentMethod ?? FULFILLMENT_METHOD.VIRTUAL,
  );
  const [defaultTimeZone, setDefaultTimeZone] = useState(
    initial?.details.service?.defaultTimeZone ?? "America/New_York",
  );
  const [availabilityRules, setAvailabilityRules] = useState<AvailabilityRuleInput[]>(
    initial?.booking?.availabilityRules?.length
      ? initial.booking.availabilityRules
      : mode === "create"
        ? DEFAULT_AVAILABILITY_RULES
        : [],
  );
  const [intakeQuestions, setIntakeQuestions] = useState<IntakeQuestionInput[]>(
    initial?.booking?.intakeQuestions?.map((q) => ({
      question: q.question,
      required: q.required,
      sortOrder: q.sortOrder,
    })) ?? [],
  );
  const [variantDrafts, setVariantDrafts] = useState<VariantDraft[]>(
    draftsFromSerialized(initial?.variants ?? []),
  );

  const [resourceSubtype, setResourceSubtype] = useState<ResourceSubtype | "">(
    (initial?.details.resource?.resourceSubtype as ResourceSubtype | undefined) ?? "",
  );
  const [resourceFormat, setResourceFormat] = useState(initial?.details.resource?.format ?? "");
  const [resourceFileUrl, setResourceFileUrl] = useState(initial?.details.resource?.fileUrl ?? "");

  const [eventStartsAt, setEventStartsAt] = useState(
    toDatetimeLocalValue(initial?.details.event?.startsAt),
  );
  const [eventEndsAt, setEventEndsAt] = useState(
    toDatetimeLocalValue(initial?.details.event?.endsAt),
  );
  const [eventLocation, setEventLocation] = useState(initial?.details.event?.location ?? "");
  const [eventVenue, setEventVenue] = useState(initial?.details.event?.venue ?? "");
  const [eventCapacity, setEventCapacity] = useState(
    initial?.details.event?.capacity?.toString() ?? "",
  );

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const lowestVariantCents =
    variantDrafts.length > 0
      ? Math.min(...draftsToPayload(variantDrafts, listingType).map((v) => v.priceCents))
      : null;

  function buildDetailsPayload() {
    if (listingType === LISTING_TYPE.PRODUCT) {
      return {
        product: {
          requiresShipping,
          sku: sku.trim() || null,
        },
      };
    }
    if (listingType === LISTING_TYPE.SERVICE) {
      return {
        service: {
          serviceKind,
          durationMinutes: durationMinutes.trim() ? Number.parseInt(durationMinutes, 10) : null,
          serviceRadius: serviceRadius.trim() || null,
          terms: serviceTerms.trim() || null,
          bookingUrl: bookingUrl.trim() || null,
          fulfillmentMethod,
          defaultTimeZone,
        },
      };
    }
    if (listingType === LISTING_TYPE.RESOURCE) {
      return {
        resource: {
          resourceSubtype: resourceSubtype || null,
          format: resourceFormat.trim() || null,
          fileUrl: resourceFileUrl.trim() || null,
        },
      };
    }
    return {
      event: {
        startsAt: fromDatetimeLocalValue(eventStartsAt),
        endsAt: fromDatetimeLocalValue(eventEndsAt),
        location: eventLocation.trim() || null,
        venue: eventVenue.trim() || null,
        capacity: eventCapacity.trim() ? Number.parseInt(eventCapacity, 10) : null,
      },
    };
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const hasVariants = variantDrafts.length > 0;
    const cents = hasVariants
      ? Math.min(
          ...draftsToPayload(variantDrafts, listingType).map((v) => v.priceCents),
        )
      : Math.round(parseFloat(priceDollars || "0") * 100);

    if (!title.trim() || !description.trim()) {
      setError("Check title and description.");
      return;
    }
    if (!hasVariants && (cents < 0 || Number.isNaN(cents))) {
      setError("Check title, description, and price.");
      return;
    }
    if (hasVariants) {
      const payload = draftsToPayload(variantDrafts, listingType);
      if (payload.length === 0 || payload.some((v) => !v.title || v.priceCents < 0)) {
        setError("Each option needs a title and price.");
        return;
      }
      if (
        listingType === LISTING_TYPE.SERVICE &&
        payload.some((v) => !v.durationMinutes || v.durationMinutes <= 0)
      ) {
        setError("Each service option needs duration in minutes.");
        return;
      }
    }

    if (status === OFFERING_STATUS.SCHEDULED && !scheduledPublishAt.trim()) {
      setError("Scheduled offerings need a publish date and time.");
      return;
    }

    if (listingType === LISTING_TYPE.SERVICE) {
      const invalidRule = availabilityRules.find((r) => r.startMinutes >= r.endMinutes);
      if (invalidRule) {
        setError("Check availability hours — end time must be after start time.");
        return;
      }
      const emptyRequired = intakeQuestions.some((q) => !q.question.trim());
      if (emptyRequired) {
        setError("Remove empty intake questions or fill them in.");
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        title,
        description,
        priceCents: cents,
        category: category || null,
        imageUrl: imageUrl || null,
        paymentUrl: paymentUrl.trim() || null,
        productUrl: productUrl.trim() || null,
        listingType,
        vendorNotes: vendorNotes.trim() || null,
        status,
        scheduledPublishAt: fromDatetimeLocalValue(scheduledPublishAt),
        details: buildDetailsPayload(),
        ...(listingType === LISTING_TYPE.SERVICE
          ? {
              booking: {
                availabilityRules: availabilityRules.map((r) => ({
                  dayOfWeek: r.dayOfWeek,
                  startMinutes: r.startMinutes,
                  endMinutes: r.endMinutes,
                  timeZone: r.timeZone || defaultTimeZone,
                })),
                intakeQuestions: intakeQuestions
                  .filter((q) => q.question.trim())
                  .map((q, index) => ({
                    question: q.question.trim(),
                    required: q.required,
                    sortOrder: index,
                  })),
              },
            }
          : {}),
        variants: draftsToPayload(variantDrafts, listingType),
      };

      const url =
        mode === "create" ? "/api/vendor/listings" : `/api/vendor/listings/${listingId}`;
      const method = mode === "create" ? "POST" : "PATCH";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Failed to save offering.");
        setSaving(false);
        return;
      }
      setSuccess("Saved.");
      setSaving(false);
      window.setTimeout(() => {
        router.push("/account/vendor/listings");
        router.refresh();
      }, 700);
    } catch {
      setError("Something went wrong. Check your connection and try again.");
      setSaving(false);
    }
  }

  return (
    <Card className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between gap-2 text-xs font-medium text-fix-text-muted">
          <span>
            Step {step + 1} of {wizardSteps.length}
          </span>
          <span>{WIZARD_STEP_LABELS[currentStepKey]}</span>
        </div>
        <div className="mt-2 flex gap-1">
          {wizardSteps.map((key, index) => (
            <div
              key={key}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors",
                index <= step ? "bg-forest" : "bg-fix-bg-muted",
              )}
              aria-hidden
            />
          ))}
        </div>
        <ol className="mt-3 hidden flex-wrap gap-2 sm:flex">
          {wizardSteps.map((key, index) => (
            <li key={key}>
              <button
                type="button"
                onClick={() => setStep(index)}
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
                  index === step
                    ? "bg-forest text-fix-primary-foreground"
                    : index < step
                      ? "bg-forest/15 text-forest"
                      : "bg-fix-bg-muted text-fix-text-muted",
                )}
              >
                {WIZARD_STEP_LABELS[key]}
              </button>
            </li>
          ))}
        </ol>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <FormFeedback success={success} error={error} />

        {currentStepKey === "basics" ? (
        <FormSection title="Basics" description="Type, title, pricing, and image">
        <div>
          <label className="block text-sm font-medium text-fix-text">Listing type</label>
          <select
            value={listingType}
            onChange={(e) => {
              setListingType(e.target.value);
              setStep(0);
            }}
            className={inputClass}
          >
            <option value={LISTING_TYPE.PRODUCT}>Product — physical goods</option>
            <option value={LISTING_TYPE.SERVICE}>Service — appointments, installs, maintenance</option>
            <option value={LISTING_TYPE.RESOURCE}>Resource — ebooks, plans, templates</option>
            <option value={LISTING_TYPE.EVENT}>Event — markets, classes, workshops</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-fix-text">Title *</label>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-fix-text">Description *</label>
          <textarea
            required
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={inputClass}
          />
          {variantDrafts.length > 0 ? (
            <p className="mt-1 text-xs text-fix-text-muted">
              Describe what each option includes here — members see this before they choose a
              variation.
            </p>
          ) : null}
        </div>

        <div>
          <label className="block text-sm font-medium text-fix-text">
            {variantDrafts.length > 0 ? "Base price (auto from lowest option)" : "Price (USD) *"}
          </label>
          <input
            required={variantDrafts.length === 0}
            type="number"
            min={0}
            step="0.01"
            value={priceDollars}
            onChange={(e) => setPriceDollars(e.target.value)}
            disabled={variantDrafts.length > 0}
            className={inputClass}
          />
          {variantDrafts.length > 0 && lowestVariantCents !== null ? (
            <p className="mt-1 text-xs text-fix-text-muted">
              Listing price uses your lowest option ({formatPrice(lowestVariantCents)}).
            </p>
          ) : null}
        </div>

        <div>
          <label className="block text-sm font-medium text-fix-text">Category</label>
          <input value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass} />
        </div>

        <VendorListingImageField
          imageUrl={imageUrl}
          onImageUrlChange={setImageUrl}
          disabled={saving}
        />
        </FormSection>
        ) : null}

        {currentStepKey === "details" && listingType === LISTING_TYPE.PRODUCT ? (
          <FormSection title="Product details" description="Shipping and SKU">
          <fieldset className="space-y-3">
            <label className="flex items-center gap-2 text-sm text-fix-text">
              <input
                type="checkbox"
                checked={requiresShipping}
                onChange={(e) => setRequiresShipping(e.target.checked)}
              />
              Requires shipping
            </label>
            <div>
              <label className="block text-sm font-medium text-fix-text">SKU (optional)</label>
              <input value={sku} onChange={(e) => setSku(e.target.value)} className={inputClass} />
            </div>
          </fieldset>
          </FormSection>
        ) : null}

        {currentStepKey === "details" && listingType === LISTING_TYPE.SERVICE ? (
          <FormSection title="Service details" description="Duration, fulfillment, and RootSync booking">
          <fieldset className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-fix-text">Service type</label>
              <select
                value={serviceKind}
                onChange={(e) => setServiceKind(e.target.value as ServiceKind)}
                className={inputClass}
              >
                <option value={SERVICE_KIND.CONSULTATION}>Consultation</option>
                <option value={SERVICE_KIND.ONE_TIME}>One-time service</option>
                <option value={SERVICE_KIND.SUBSCRIPTION}>Recurring / subscription</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-fix-text">Duration (minutes)</label>
              <input
                type="number"
                min={0}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                placeholder="60"
                className={inputClass}
              />
              <p className="mt-1 text-xs text-fix-text-muted">
                Slot length for RootSync booking. Defaults to 60 minutes if empty.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-fix-text">Fulfillment</label>
              <select
                value={fulfillmentMethod}
                onChange={(e) => setFulfillmentMethod(e.target.value as FulfillmentMethod)}
                className={inputClass}
              >
                <option value={FULFILLMENT_METHOD.VIRTUAL}>Virtual — Google Meet link</option>
                <option value={FULFILLMENT_METHOD.IN_PERSON}>In person — no Meet link</option>
                <option value={FULFILLMENT_METHOD.HYBRID}>Hybrid — Meet link + in-person option</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-fix-text">Service radius</label>
              <input
                value={serviceRadius}
                onChange={(e) => setServiceRadius(e.target.value)}
                placeholder="e.g. 15 miles from downtown"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-fix-text">Terms</label>
              <textarea
                rows={3}
                value={serviceTerms}
                onChange={(e) => setServiceTerms(e.target.value)}
                placeholder="Cancellation policy, what's included, etc."
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-fix-text">Booking URL (optional)</label>
              <input
                type="url"
                value={bookingUrl}
                onChange={(e) => setBookingUrl(e.target.value)}
                placeholder="https://… external calendar link"
                className={inputClass}
              />
              <p className="mt-1 text-xs text-fix-text-muted">
                Optional fallback. Active services use built-in RootSync booking when published.
              </p>
            </div>

            <div className="border-t border-fix-border/15 pt-4">
              <ServiceBookingConfigFields
                timeZone={defaultTimeZone}
                onTimeZoneChange={setDefaultTimeZone}
                availabilityRules={availabilityRules}
                onAvailabilityRulesChange={setAvailabilityRules}
                intakeQuestions={intakeQuestions}
                onIntakeQuestionsChange={setIntakeQuestions}
                disabled={saving}
              />
            </div>
          </fieldset>
          </FormSection>
        ) : null}

        {currentStepKey === "details" && listingType === LISTING_TYPE.RESOURCE ? (
          <FormSection title="Resource details" description="Kind, format, and delivery file">
          <fieldset className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-fix-text">Resource kind</label>
              <select
                value={resourceSubtype}
                onChange={(e) => setResourceSubtype(e.target.value as ResourceSubtype | "")}
                className={inputClass}
              >
                <option value="">Select kind…</option>
                {RESOURCE_SUBTYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-fix-text-muted">
                Classes and workshops are listed as Events, not Resources.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-fix-text">Format</label>
              <input
                value={resourceFormat}
                onChange={(e) => setResourceFormat(e.target.value)}
                placeholder="Auto-filled from upload (PDF, ZIP, …)"
                className={inputClass}
              />
            </div>
            <VendorResourceFileField
              fileRef={resourceFileUrl}
              onFileRefChange={setResourceFileUrl}
              format={resourceFormat}
              onFormatChange={setResourceFormat}
              disabled={saving}
            />
          </fieldset>
          </FormSection>
        ) : null}

        {currentStepKey === "details" && listingType === LISTING_TYPE.EVENT ? (
          <FormSection title="Event details" description="Schedule and venue">
          <fieldset className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-fix-text">Starts</label>
              <input
                type="datetime-local"
                value={eventStartsAt}
                onChange={(e) => setEventStartsAt(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-fix-text">Ends</label>
              <input
                type="datetime-local"
                value={eventEndsAt}
                onChange={(e) => setEventEndsAt(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-fix-text">Location</label>
              <input
                value={eventLocation}
                onChange={(e) => setEventLocation(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-fix-text">Venue</label>
              <input value={eventVenue} onChange={(e) => setEventVenue(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-fix-text">Capacity</label>
              <input
                type="number"
                min={0}
                value={eventCapacity}
                onChange={(e) => setEventCapacity(e.target.value)}
                className={inputClass}
              />
            </div>
          </fieldset>
          </FormSection>
        ) : null}

        {currentStepKey === "options" &&
        (listingType === LISTING_TYPE.PRODUCT ||
        listingType === LISTING_TYPE.SERVICE ||
        listingType === LISTING_TYPE.RESOURCE) ? (
          <FormSection
            title="Options & pricing"
            description="Variations members can choose at checkout"
            defaultOpen={variantDrafts.length > 0}
          >
          <fieldset className="space-y-3">
            <OfferingVariantEditor
              listingType={listingType}
              variants={variantDrafts}
              onChange={setVariantDrafts}
              disabled={saving}
            />
          </fieldset>
          </FormSection>
        ) : null}

        {currentStepKey === "checkout" ? (
        <FormSection title="Checkout links" description="Optional alternate payment URLs" defaultOpen>
        <div>
          <label className="block text-sm font-medium text-fix-text">Payment link (optional)</label>
          <input
            type="text"
            inputMode="url"
            autoComplete="off"
            placeholder="https://buy.stripe.com/… or other checkout URL"
            value={paymentUrl}
            onChange={(e) => setPaymentUrl(e.target.value)}
            className={inputClass}
          />
          <p className="mt-1 text-xs text-fix-text-muted">
            Optional alternate checkout. Active listings also get built-in Buy now via Stripe Checkout.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-fix-text">Product link (optional)</label>
          <input
            type="text"
            inputMode="url"
            autoComplete="off"
            placeholder="https://… your shop or catalog page"
            value={productUrl}
            onChange={(e) => setProductUrl(e.target.value)}
            className={inputClass}
          />
        </div>
        </FormSection>
        ) : null}

        {currentStepKey === "publish" ? (
        <FormSection title="Publish" description="Status, scheduling, and internal notes" defaultOpen>
        <div>
          <label className="block text-sm font-medium text-fix-text">Internal notes (optional)</label>
          <textarea
            rows={2}
            value={vendorNotes}
            onChange={(e) => setVendorNotes(e.target.value)}
            placeholder="Planning notes — not shown publicly"
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-fix-text">Offering status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className={inputClass}
          >
            <option value={OFFERING_STATUS.DRAFT}>Draft — planning, not public</option>
            <option value={OFFERING_STATUS.SCHEDULED}>Scheduled — publishes later</option>
            <option value={OFFERING_STATUS.ACTIVE}>Active — public and available</option>
            <option value={OFFERING_STATUS.PAUSED}>Paused — hidden temporarily</option>
            <option value={OFFERING_STATUS.ARCHIVED}>Archived — no longer offered</option>
          </select>
        </div>

        {status === OFFERING_STATUS.SCHEDULED ? (
          <div>
            <label className="block text-sm font-medium text-fix-text">Publish date & time *</label>
            <input
              type="datetime-local"
              required
              value={scheduledPublishAt}
              onChange={(e) => setScheduledPublishAt(e.target.value)}
              className={inputClass}
            />
            <p className="mt-1 text-xs text-fix-text-muted">
              Goes live automatically when this time passes (checked every 15 minutes).
            </p>
          </div>
        ) : null}
        </FormSection>
        ) : null}

        <div className="flex flex-wrap items-center gap-2 border-t border-fix-border/15 pt-4">
          {step > 0 ? (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={saving}
              onClick={() => setStep((s) => Math.max(0, s - 1))}
            >
              Back
            </Button>
          ) : null}
          {step < lastStepIndex ? (
            <Button
              type="button"
              variant="cta"
              size="sm"
              disabled={saving}
              onClick={() => setStep((s) => Math.min(lastStepIndex, s + 1))}
            >
              Next
            </Button>
          ) : (
            <Button type="submit" disabled={saving || !!success} variant="cta" size="sm">
              {saving ? "Saving…" : mode === "create" ? "Create offering" : "Save changes"}
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
}
