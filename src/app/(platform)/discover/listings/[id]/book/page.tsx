import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { Container } from "@/components/Container";
import { ServiceBookingWizard } from "@/components/ServiceBookingWizard";
import { authOptions } from "@/lib/authOptions";
import { loadBookableServiceListing } from "@/lib/bookingAccess";
import { getServiceDurationMinutes, resolveBookingPriceCents } from "@/lib/bookingSlots";
import { formatPrice } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function BookServicePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ variant?: string }>;
}) {
  const { id } = await params;
  const { variant: variantParam } = await searchParams;
  const listing = await loadBookableServiceListing(id, variantParam ?? null);
  if (!listing) notFound();

  const session = await getServerSession(authOptions);
  const bookPath = variantParam
    ? `/discover/listings/${id}/book?variant=${encodeURIComponent(variantParam)}`
    : `/discover/listings/${id}/book`;
  if (!session?.user) {
    redirect(`/login?callbackUrl=${encodeURIComponent(bookPath)}`);
  }

  const service = listing.offering.serviceDetails!;
  const durationMinutes = getServiceDurationMinutes(listing, listing.selectedVariantId);
  const priceCents = resolveBookingPriceCents(listing);
  const variant = listing.selectedVariantId
    ? listing.offering.variants.find((v) => v.id === listing.selectedVariantId)
    : null;

  return (
    <div>
      <section className="border-b border-fix-border/15">
        <Container className="py-8 sm:py-12">
          <nav className="text-sm text-fix-text-muted">
            <Link href="/discover" className="text-fix-link hover:text-fix-link-hover">
              Marketplace
            </Link>
            <span className="mx-2">/</span>
            <Link
              href={`/discover/listings/${listing.id}`}
              className="text-fix-link hover:text-fix-link-hover"
            >
              {listing.title}
            </Link>
            <span className="mx-2">/</span>
            <span className="text-fix-heading">Book</span>
          </nav>

          <h1 className="mt-6 text-2xl font-semibold tracking-tight text-fix-heading sm:text-3xl">
            Book {listing.title}
            {variant ? ` — ${variant.title}` : ""}
          </h1>
          <p className="mt-2 text-fix-text-muted">
            with {listing.vendorProfile.displayName} · {formatPrice(priceCents)}
            {variant?.durationMinutes ? ` · ${variant.durationMinutes} min` : ""}
          </p>

          <div className="mt-8 max-w-3xl">
            <ServiceBookingWizard
              listingId={listing.id}
              variantId={listing.selectedVariantId ?? null}
              title={listing.title}
              priceCents={priceCents}
              durationMinutes={durationMinutes}
              terms={service.terms}
              intakeQuestions={listing.offering.intakeQuestions}
            />
          </div>
        </Container>
      </section>
    </div>
  );
}
