import Link from "next/link";
import { getServerSession } from "next-auth";

import { Card } from "@/components/ui/Card";
import { formatPrice } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/authOptions";

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending payment",
  paid: "Paid",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

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
    <div>
      <h2 className="text-xl font-semibold text-fix-heading">Order history</h2>
      <p className="mt-1 text-sm text-fix-text-muted">
        {orders.length} order{orders.length !== 1 ? "s" : ""}
      </p>
      {orders.length === 0 ? (
        <Card className="mt-6 p-8 text-center">
          <p className="text-fix-text-muted">You haven&apos;t placed any orders yet.</p>
          <Link
            href="/marketplace"
            className="mt-4 inline-block text-sm font-medium text-fix-link hover:text-fix-link-hover"
          >
            Browse shops
          </Link>
        </Card>
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
                    <p className="mt-1 text-sm text-fix-text-muted">
                      {STATUS_LABELS[order.status] || order.status}
                      {order.trackingNumber && ` • ${order.trackingNumber}`}
                    </p>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
