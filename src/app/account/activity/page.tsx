import Link from "next/link";
import { getServerSession } from "next-auth";

import { Card } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { OrderStatusBadge } from "@/components/ui/StatusBadge";
import { authOptions } from "@/lib/authOptions";
import { bookingStatusLabel } from "@/lib/bookingAccess";
import { formatPrice } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const metadata = {
  title: "Activity",
};

export default async function AccountActivityPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const userId = session.user.id;
  const email = session.user.email;

  const [orders, bookings] = await Promise.all([
    prisma.order.findMany({
      where: email ? { OR: [{ userId }, { email }] } : { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.booking.findMany({
      where: { memberUserId: userId },
      include: { listing: { select: { title: true } } },
      orderBy: { scheduledStartAt: "desc" },
      take: 5,
    }),
  ]);

  const hasActivity = orders.length > 0 || bookings.length > 0;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-fix-heading">Activity</h2>
        <p className="mt-1 text-sm text-fix-text-muted">
          Recent orders and service bookings in one place.
        </p>
      </div>

      {!hasActivity ? (
        <EmptyState
          title="No activity yet"
          description="When you buy from the marketplace or book a service, it will show up here."
          action={{ href: "/discover", label: "Browse marketplace", variant: "cta" }}
        />
      ) : (
        <>
          {orders.length > 0 ? (
            <section>
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-fix-heading">Recent orders</h3>
                <Link href="/account/orders" className="text-xs font-medium text-fix-link hover:text-fix-link-hover">
                  View all →
                </Link>
              </div>
              <ul className="mt-3 space-y-2">
                {orders.map((order) => (
                  <li key={order.id}>
                    <Link href={`/account/orders/${order.id}`}>
                      <Card className="flex flex-wrap items-center justify-between gap-2 p-4 transition-colors hover:bg-fix-bg-muted/50">
                        <div>
                          <span className="text-sm font-medium text-fix-heading">{order.id}</span>
                          <p className="text-xs text-fix-text-muted">
                            {new Date(order.createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <OrderStatusBadge status={order.status} />
                          <span className="text-sm font-semibold text-fix-heading">
                            {formatPrice(order.totalCents)}
                          </span>
                        </div>
                      </Card>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {bookings.length > 0 ? (
            <section>
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-fix-heading">Recent bookings</h3>
                <Link href="/account/bookings" className="text-xs font-medium text-fix-link hover:text-fix-link-hover">
                  View all →
                </Link>
              </div>
              <ul className="mt-3 space-y-2">
                {bookings.map((b) => (
                  <li key={b.id}>
                    <Card className="p-4">
                      <p className="text-sm font-medium text-fix-heading">{b.listing.title}</p>
                      <p className="mt-1 text-xs text-fix-text-muted">
                        {bookingStatusLabel(b.status)} ·{" "}
                        {new Date(b.scheduledStartAt).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </Card>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      )}

      <Card className="p-5">
        <p className="text-sm text-fix-text-muted">
          Messages and community posts live in their own sections.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <ButtonLink href="/messages/inbox" variant="secondary" size="sm">
            Messages
          </ButtonLink>
          <ButtonLink href="/account/community" variant="secondary" size="sm">
            My community posts
          </ButtonLink>
        </div>
      </Card>
    </div>
  );
}
