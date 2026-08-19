import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { Mail, Package } from "lucide-react";

import { AccountSubpageBody } from "@/components/account/AccountSubpageBody";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card } from "@/components/ui/Card";
import { authOptions } from "@/lib/authOptions";
import { formatPrice } from "@/lib/format";
import { formatUnitSelectionsSummary, type UnitSelectionSnapshot } from "@/lib/offeringOptions";
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
      order: {
        select: {
          id: true,
          email: true,
          shippingName: true,
          status: true,
          createdAt: true,
        },
      },
      listing: { select: { title: true } },
    },
    orderBy: { order: { createdAt: "desc" } },
    take: 100,
  });

  return (
    <AccountSubpageBody description="Discover checkout orders for your listings, including buyer emails for follow-up.">
      {items.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No Discover orders yet"
          description="When members buy your listings through checkout, order line items will appear here."
          action={{ href: "/account/vendor/listings", label: "Manage listings", variant: "cta" }}
        />
      ) : (
        <ul className="space-y-3">
          {items.map((line) => {
            const buyerEmail = line.order.email?.trim();
            const buyerLabel = line.order.shippingName?.trim() || buyerEmail || "Buyer";
            return (
              <li key={line.id}>
                <Card className="p-4">
                  <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
                    <div className="min-w-0">
                      <div className="font-medium text-fix-heading">
                        {line.listing?.title ?? line.name}
                      </div>
                      <div className="text-xs text-fix-text-muted">
                        Order {line.order.id.slice(0, 8)}… • {line.order.status} •{" "}
                        {line.order.createdAt.toISOString().slice(0, 10)}
                      </div>
                      {buyerEmail ? (
                        <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-fix-text">
                          <span className="font-medium text-fix-heading">{buyerLabel}</span>
                          <a
                            href={`mailto:${buyerEmail}`}
                            className="inline-flex items-center gap-1 text-fix-link hover:text-fix-link-hover"
                          >
                            <Mail className="h-3.5 w-3.5" aria-hidden />
                            {buyerEmail}
                          </a>
                        </p>
                      ) : (
                        <p className="mt-2 text-sm text-fix-text-muted">No buyer email on file</p>
                      )}
                    </div>
                    <div className="text-sm font-semibold text-fix-heading sm:text-right">
                      ×{line.quantity} • {formatPrice(line.priceCents * line.quantity)}
                    </div>
                  </div>
                  {line.unitSelections ? (
                    <p className="mt-2 text-xs text-fix-text-muted">
                      {formatUnitSelectionsSummary(line.unitSelections as UnitSelectionSnapshot[])}
                    </p>
                  ) : null}
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </AccountSubpageBody>
  );
}
