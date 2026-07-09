import Link from "next/link";
import { getServerSession } from "next-auth";

import { AccountSubpageBody } from "@/components/account/AccountSubpageBody";
import { EmptyState } from "@/components/ui/EmptyState";
import { OrderStatusBadge } from "@/components/ui/StatusBadge";
import { Card } from "@/components/ui/Card";
import { formatPrice } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/authOptions";

export default async function AccountOrdersPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;

  const orders = await prisma.order.findMany({
    where: {
      OR: [{ email: session.user.email }, { userId: session.user.id }],
    },
    include: { items: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <AccountSubpageBody
      description={
        <>
          Marketplace purchases and checkout receipts.{" "}
          <Link href="/account/bookings" className="font-medium text-fix-link hover:text-fix-link-hover">
            Service bookings
          </Link>{" "}
          are listed separately.
        </>
      }
    >
      {orders.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="No orders yet"
            description="When you buy from the marketplace, receipts and tracking will appear here."
            action={{ href: "/discover", label: "Browse marketplace", variant: "cta" }}
          />
        </div>
      ) : (
        <ul className="mt-6 space-y-4">
          {orders.map((order) => {
            const itemCount = order.items.reduce((n, i) => n + i.quantity, 0);
            return (
              <li key={order.id}>
                <Link href={`/account/orders/${order.id}`}>
                  <Card className="p-4 transition-colors hover:bg-fix-bg-muted/50 sm:p-6">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="font-medium text-fix-heading">{order.id}</span>
                        <span className="ml-2 text-sm text-fix-text-muted">
                          {new Date(order.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-semibold text-fix-heading">
                          {formatPrice(order.totalCents)}
                        </span>
                        <span className="ml-2 text-xs text-fix-text-muted">
                          {itemCount} item{itemCount !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <OrderStatusBadge status={order.status} />
                        {order.trackingNumber ? (
                          <span className="text-sm text-fix-text-muted">
                            {order.trackingCarrier && `${order.trackingCarrier}: `}
                            <span className="font-medium text-fix-heading">{order.trackingNumber}</span>
                          </span>
                        ) : null}
                      </div>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </AccountSubpageBody>
  );
}
