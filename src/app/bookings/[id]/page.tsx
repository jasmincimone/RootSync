import Link from "next/link";
import { notFound } from "next/navigation";

import { Container } from "@/components/Container";
import { discoverListingPath } from "@/config/discoverPaths";
import { guestBookingCancelTokenValid } from "@/lib/auth-tokens";
import { prisma } from "@/lib/prisma";
import { GuestBookingClient } from "./GuestBookingClient";

export const dynamic = "force-dynamic";

function formatWhen(start: Date, end: Date, timeZone: string): string {
  const startFmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  const endFmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
  return `${startFmt.format(start)} – ${endFmt.format(end)}`;
}

export default async function GuestBookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { id } = await params;
  const { token } = await searchParams;

  const booking = await prisma.booking.findUnique({
    where: { id },
    select: {
      id: true,
      memberUserId: true,
      memberEmail: true,
      status: true,
      scheduledStartAt: true,
      scheduledEndAt: true,
      timeZone: true,
      priceCents: true,
      meetLink: true,
      calendarHtmlLink: true,
      fulfillmentMethod: true,
      vendorEmail: true,
      listing: { select: { id: true, title: true, publicSlug: true } },
      vendorProfile: { select: { displayName: true } },
    },
  });

  // Members manage bookings from their account; this page is for guests only.
  if (!booking || booking.memberUserId) notFound();
  if (!token || !guestBookingCancelTokenValid(booking.id, booking.memberEmail, token)) {
    notFound();
  }

  return (
    <div>
      <section className="border-b border-fix-border/15">
        <Container className="py-8 sm:py-12">
          <h1 className="text-2xl font-semibold tracking-tight text-fix-heading sm:text-3xl">
            Your booking
          </h1>
          <p className="mt-2 text-fix-text-muted">
            Booked as a guest with {booking.memberEmail}.{" "}
            <Link href="/signup" className="text-fix-link hover:text-fix-link-hover">
              Create an account
            </Link>{" "}
            with that email to keep all your appointments in one place.
          </p>

          <div className="mt-8 max-w-2xl">
            <GuestBookingClient
              bookingId={booking.id}
              token={token}
              status={booking.status}
              serviceTitle={booking.listing.title}
              vendorName={booking.vendorProfile.displayName}
              when={formatWhen(
                booking.scheduledStartAt,
                booking.scheduledEndAt,
                booking.timeZone,
              )}
              priceCents={booking.priceCents}
              meetLink={booking.meetLink}
              calendarHtmlLink={booking.calendarHtmlLink}
              fulfillmentMethod={booking.fulfillmentMethod}
              scheduledStartAt={booking.scheduledStartAt.toISOString()}
              vendorMessageHref={`mailto:${booking.vendorEmail}?subject=${encodeURIComponent(
                `Booking #${booking.id.slice(-8)} — ${booking.listing.title}`,
              )}`}
            />

            <p className="mt-6 text-sm text-fix-text-muted">
              <Link
                href={discoverListingPath(booking.listing)}
                className="text-fix-link hover:text-fix-link-hover"
              >
                View {booking.listing.title}
              </Link>
            </p>
          </div>
        </Container>
      </section>
    </div>
  );
}
