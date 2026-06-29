import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { Package } from "lucide-react";

import { EmptyState } from "@/components/ui/EmptyState";
import { Card } from "@/components/ui/Card";
import { authOptions } from "@/lib/authOptions";
import { formatPrice } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { ROLES, VENDOR_STATUS } from "@/lib/roles";

export default async function VendorOrdersPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/account/vendor/orders");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { vendorProfile: true },
  });
  if (
    !user?.vendorProfile ||
    user.role !== ROLES.VENDOR ||
    user.vendorProfile.status !== VENDOR_STATUS.APPROVED
  ) {
    redirect("/account/vendor");
  }

  const vendorProfileId = user.vendorProfile.id;

  const items = await prisma.orderItem.findMany({
    where: {
      listingId: { not: null },
      listing: { vendorProfileId },
    },
    include: {
      order: true,
      listing: true,
    },
    orderBy: { order: { createdAt: "desc" } },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-fix-heading">Vendor orders</h2>
        <p className="mt-1 text-sm text-fix-text-muted">
          Line items from Discover checkout that reference your listings.
        </p>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No Discover orders yet"
          description="When members buy your listings through checkout, order line items will appear here."
          action={{ href: "/account/vendor/listings", label: "Manage listings", variant: "cta" }}
        />
      ) : (
        <ul className="space-y-3">
          {items.map((line) => (
            <li key={line.id}>
              <Card className="p-4">
                <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
                  <div>
                    <div className="font-medium text-fix-heading">
                      {line.listing?.title ?? line.name}
                    </div>
                    <div className="text-xs text-fix-text-muted">
                      Order {line.order.id.slice(0, 8)}… • {line.order.status} •{" "}
                      {line.order.createdAt.toISOString().slice(0, 10)}
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-fix-heading">
                    ×{line.quantity} • {formatPrice(line.priceCents * line.quantity)}
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
