import { notFound } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";

import { AccountSubpageBody } from "@/components/account/AccountSubpageBody";
import { Card } from "@/components/ui/Card";
import { OrderStatusBadge } from "@/components/ui/StatusBadge";
import { VendorPulseReviewForm } from "@/components/pulse/VendorPulseReviewForm";
import { formatPrice } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/authOptions";
import { checkVendorReviewEligibility } from "@/lib/pulse/vendorReviews";
import { isResourceOrderItem, orderItemTypeLabel } from "@/lib/roles";

export default async function AccountOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;

  const order = await prisma.order.findFirst({
    where: {
      id,
      OR: [{ email: session.user.email }, { userId: session.user.id }],
    },
    include: {
      items: {
        include: {
          listing: {
            select: {
              id: true,
              title: true,
              vendorProfileId: true,
              vendorProfile: { select: { displayName: true } },
            },
          },
        },
      },
      vendorPulseReview: { select: { id: true } },
    },
  });

  if (!order) notFound();

  const vendorListing = order.items.find((i) => i.listing)?.listing ?? null;
  const reviewEligibility =
    vendorListing && session.user.id
      ? await checkVendorReviewEligibility({
          reviewerUserId: session.user.id,
          vendorProfileId: vendorListing.vendorProfileId,
          orderId: order.id,
        })
      : null;

  const hasShipping =
    order.shippingName &&
    order.shippingLine1 &&
    order.shippingCity &&
    order.shippingState &&
    order.shippingPostal;

  return (
    <AccountSubpageBody
      description={
        <>
          Order <span className="font-mono text-xs">{order.id}</span>
          {" · "}
          {new Date(order.createdAt).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </>
      }
    >
      <Card className="p-6">
        <div className="flex flex-wrap items-center gap-2 border-b border-fix-border/15 pb-4">
          <OrderStatusBadge status={order.status} />
          {order.trackingNumber && (
            <span className="text-sm text-fix-text-muted">
              {order.trackingCarrier && `${order.trackingCarrier}: `}
              <span className="font-medium text-fix-heading">{order.trackingNumber}</span>
            </span>
          )}
        </div>

        <ul className="mt-4 divide-y divide-fix-border/15">
          {order.items.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0">
              <div>
                <span className="font-medium text-fix-heading">{item.name}</span>
                <span className="ml-2 text-xs text-fix-text-muted">
                  × {item.quantity} ({orderItemTypeLabel(item.type)})
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-medium text-fix-heading">
                  {formatPrice(item.priceCents * item.quantity)}
                </span>
                {isResourceOrderItem(item.type) && order.status === "paid" && (
                  <Link
                    href={`/api/download?orderId=${order.id}&itemId=${item.id}`}
                    className="text-sm font-medium text-fix-link hover:text-fix-link-hover"
                  >
                    Access resource
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>

        <dl className="mt-4 space-y-2 border-t border-fix-border/15 pt-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-fix-text-muted">Subtotal</dt>
            <dd className="font-medium text-fix-heading">{formatPrice(order.subtotalCents)}</dd>
          </div>
          {order.shippingCents > 0 && (
            <div className="flex justify-between">
              <dt className="text-fix-text-muted">Shipping</dt>
              <dd className="font-medium text-fix-heading">{formatPrice(order.shippingCents)}</dd>
            </div>
          )}
          <div className="flex justify-between border-t border-fix-border/15 pt-3 text-base">
            <dt className="font-semibold text-fix-heading">Total</dt>
            <dd className="font-semibold text-fix-heading">{formatPrice(order.totalCents)}</dd>
          </div>
        </dl>

        {order.trackingNumber && (
          <div className="mt-6 rounded-xl border border-fix-border/15 bg-fix-bg-muted/50 p-4">
            <h3 className="text-sm font-semibold text-fix-heading">Tracking</h3>
            <p className="mt-1 text-sm text-fix-text-muted">
              {order.trackingCarrier && `${order.trackingCarrier}: `}
              <span className="font-medium text-fix-heading">{order.trackingNumber}</span>
            </p>
            {order.shippedAt && (
              <p className="mt-0.5 text-xs text-fix-text-muted">
                Shipped {new Date(order.shippedAt).toLocaleDateString("en-US")}
              </p>
            )}
          </div>
        )}

        {hasShipping && (
          <div className="mt-6 border-t border-fix-border/15 pt-6">
            <h3 className="text-sm font-semibold text-fix-heading">Shipping address</h3>
            <p className="mt-2 text-sm text-fix-text-muted">
              {order.shippingName}
              <br />
              {order.shippingLine1}
              {order.shippingLine2 && (
                <>
                  <br />
                  {order.shippingLine2}
                </>
              )}
              <br />
              {order.shippingCity}, {order.shippingState} {order.shippingPostal}
              <br />
              {order.shippingCountry}
            </p>
          </div>
        )}
      </Card>

      {reviewEligibility?.eligible && vendorListing ? (
        <Card className="mt-6 p-6">
          <VendorPulseReviewForm
            vendorProfileId={vendorListing.vendorProfileId}
            vendorName={vendorListing.vendorProfile.displayName}
            listingTitle={vendorListing.title}
            orderId={order.id}
          />
        </Card>
      ) : null}
    </AccountSubpageBody>
  );
}
