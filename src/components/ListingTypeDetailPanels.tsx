import { BookOpen, Calendar, MapPin, Package, Sparkles, Users } from "lucide-react";

import { Card } from "@/components/ui/Card";
import { resourceSubtypeLabel } from "@/config/resourceSubtypes";
import { listingDisplayPrice, listingTypeLabel } from "@/lib/listingDisplay";
import { LISTING_TYPE, EVENT_ATTENDANCE_MODE, type EventAttendanceMode, type FulfillmentMethod, type ServiceKind } from "@/lib/roles";

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 border-b border-fix-border/10 py-3 last:border-0">
      <dt className="text-sm text-fix-text-muted">{label}</dt>
      <dd className="text-sm font-medium text-fix-heading">{value}</dd>
    </div>
  );
}

function formatEventDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const SERVICE_KIND_LABELS: Record<ServiceKind, string> = {
  CONSULTATION: "Consultation",
  ONE_TIME: "One-time service",
  SUBSCRIPTION: "Subscription",
};

const FULFILLMENT_LABELS: Record<FulfillmentMethod, string> = {
  VIRTUAL: "Virtual",
  IN_PERSON: "In person",
  HYBRID: "Hybrid",
};

const EVENT_ATTENDANCE_LABELS: Record<EventAttendanceMode, string> = {
  [EVENT_ATTENDANCE_MODE.IN_PERSON]: "In person",
  [EVENT_ATTENDANCE_MODE.VIRTUAL_MEET]: "Digital — Google Meet",
  [EVENT_ATTENDANCE_MODE.VIRTUAL_EXTERNAL]: "Digital — external event space",
};

type ListingDetailPanelsProps = {
  listingType: string;
  priceCents: number;
  variantCount: number;
  product: { requiresShipping: boolean; sku: string | null } | null;
  service: {
    serviceKind: string;
    durationMinutes: number | null;
    serviceRadius: string | null;
    fulfillmentMethod: string;
  } | null;
  resource: {
    resourceSubtype: string | null;
    format: string | null;
  } | null;
  event: {
    startsAt: Date | null;
    endsAt: Date | null;
    location: string | null;
    venue: string | null;
    capacity: number | null;
    attendanceMode: string;
    externalJoinUrl: string | null;
    meetUrl: string | null;
  } | null;
  /** When false, do not promise RootSync post-purchase join emails. */
  rootSyncCheckoutReady?: boolean;
};

export function ListingDetailHighlights({
  listingType,
  priceCents,
  variantCount,
  resource,
}: ListingDetailPanelsProps) {
  const typeLabel = listingTypeLabel(listingType);
  const subtypeLabel = resource ? resourceSubtypeLabel(resource.resourceSubtype) : null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-fix-surface px-3 py-1 text-xs font-semibold uppercase tracking-wide text-fix-heading ring-1 ring-fix-border/20">
        <Sparkles className="h-3.5 w-3.5 text-fix-link" aria-hidden />
        {typeLabel}
      </span>
      {subtypeLabel ? (
        <span className="rounded-full bg-fix-bg-muted px-3 py-1 text-xs font-medium text-fix-heading">
          {subtypeLabel}
        </span>
      ) : null}
      <span className="ml-auto text-lg font-semibold text-fix-heading sm:text-xl">
        {listingDisplayPrice(priceCents, variantCount)}
      </span>
    </div>
  );
}

export function ListingTypeDetailCard({
  listingType,
  product,
  service,
  resource,
  event,
  rootSyncCheckoutReady = true,
}: Omit<ListingDetailPanelsProps, "priceCents" | "variantCount">) {
  if (listingType === LISTING_TYPE.RESOURCE && resource) {
    const subtype = resourceSubtypeLabel(resource.resourceSubtype);
    return (
      <Card className="overflow-hidden border-fix-border/15 p-0">
        <div className="border-b border-fix-border/15 bg-fix-bg-muted/50 px-5 py-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-fix-link" aria-hidden />
            <h2 className="text-sm font-semibold text-fix-heading">Resource</h2>
          </div>
          <p className="mt-1 text-sm text-fix-text-muted">
            RootSync purchases include secure digital access from your order history. External
            checkout is fulfilled by the Vendor.
          </p>
        </div>
        <dl className="px-5 py-1">
          {subtype ? <DetailRow label="Kind" value={subtype} /> : null}
          {resource.format?.trim() ? <DetailRow label="Format" value={resource.format.trim()} /> : null}
          <DetailRow label="Fulfillment" value="Digital access after confirmed RootSync purchase" />
        </dl>
      </Card>
    );
  }

  if (listingType === LISTING_TYPE.SERVICE && service) {
    return (
      <Card className="overflow-hidden border-fix-border/15 p-0">
        <div className="border-b border-fix-border/15 bg-fix-bg-muted/50 px-5 py-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-fix-link" aria-hidden />
            <h2 className="text-sm font-semibold text-fix-heading">Service</h2>
          </div>
        </div>
        <dl className="px-5 py-1">
          <DetailRow
            label="Type"
            value={SERVICE_KIND_LABELS[service.serviceKind as ServiceKind] ?? service.serviceKind}
          />
          <DetailRow
            label="Delivery"
            value={
              FULFILLMENT_LABELS[service.fulfillmentMethod as FulfillmentMethod] ??
              service.fulfillmentMethod
            }
          />
          {service.durationMinutes != null ? (
            <DetailRow label="Duration" value={`${service.durationMinutes} min`} />
          ) : null}
          {service.serviceRadius?.trim() ? (
            <DetailRow label="Service area" value={service.serviceRadius.trim()} />
          ) : null}
        </dl>
      </Card>
    );
  }

  if (listingType === LISTING_TYPE.EVENT && event) {
    const start = formatEventDate(event.startsAt?.toISOString());
    const end = formatEventDate(event.endsAt?.toISOString());
    const attendance =
      EVENT_ATTENDANCE_LABELS[event.attendanceMode as EventAttendanceMode] ??
      event.attendanceMode;
    const showExternalHint =
      rootSyncCheckoutReady &&
      event.attendanceMode === EVENT_ATTENDANCE_MODE.VIRTUAL_EXTERNAL &&
      !!event.externalJoinUrl?.trim();
    const showMeetHint =
      rootSyncCheckoutReady && event.attendanceMode === EVENT_ATTENDANCE_MODE.VIRTUAL_MEET;
    const showExternalVendorFulfillment =
      !rootSyncCheckoutReady &&
      (event.attendanceMode === EVENT_ATTENDANCE_MODE.VIRTUAL_EXTERNAL ||
        event.attendanceMode === EVENT_ATTENDANCE_MODE.VIRTUAL_MEET);
    return (
      <Card className="overflow-hidden border-fix-border/15 p-0">
        <div className="border-b border-fix-border/15 bg-fix-bg-muted/50 px-5 py-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-fix-link" aria-hidden />
            <h2 className="text-sm font-semibold text-fix-heading">Event</h2>
          </div>
          <p className="mt-1 text-sm text-fix-text-muted">
            Classes, workshops, and gatherings with RootSync or Vendor checkout options.
          </p>
        </div>
        <dl className="px-5 py-1">
          <DetailRow label="Attendance" value={attendance} />
          {start ? <DetailRow label="Starts" value={start} /> : null}
          {end ? <DetailRow label="Ends" value={end} /> : null}
          {event.venue?.trim() ? <DetailRow label="Venue" value={event.venue.trim()} /> : null}
          {event.location?.trim() ? (
            <DetailRow label="Location" value={event.location.trim()} />
          ) : null}
          {showExternalHint ? (
            <DetailRow
              label="Join"
              value="Event-space link emailed after confirmed RootSync ticket purchase"
            />
          ) : null}
          {showMeetHint ? (
            <DetailRow
              label="Join"
              value="Google Meet link emailed after confirmed RootSync ticket purchase"
            />
          ) : null}
          {showExternalVendorFulfillment ? (
            <DetailRow
              label="Join"
              value="Join details are provided by the Vendor for external ticket purchases"
            />
          ) : null}
          {event.capacity != null ? (
            <DetailRow label="Capacity" value={String(event.capacity)} />
          ) : null}
        </dl>
      </Card>
    );
  }

  if (listingType === LISTING_TYPE.PRODUCT && product) {
    return (
      <Card className="overflow-hidden border-fix-border/15 p-0">
        <div className="border-b border-fix-border/15 bg-fix-bg-muted/50 px-5 py-4">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-fix-link" aria-hidden />
            <h2 className="text-sm font-semibold text-fix-heading">Product</h2>
          </div>
        </div>
        <dl className="px-5 py-1">
          <DetailRow
            label="Shipping"
            value={product.requiresShipping ? "Ships or local pickup" : "No shipping required"}
          />
          {product.sku?.trim() ? <DetailRow label="SKU" value={product.sku.trim()} /> : null}
        </dl>
      </Card>
    );
  }

  return null;
}

export function ListingVendorLocationHint({ pickupLocation }: { pickupLocation: string | null }) {
  if (!pickupLocation?.trim()) return null;
  return (
    <p className="mt-2 flex items-start gap-2 text-sm text-fix-text-muted">
      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-fix-link" aria-hidden />
      <span>{pickupLocation.trim()}</span>
    </p>
  );
}
