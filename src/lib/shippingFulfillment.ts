import type { Prisma } from "@prisma/client";

import { sendAdminShippableOrderEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { ROLES } from "@/lib/roles";

export function orderHasShipToAddress(order: {
  shippingLine1?: string | null;
  shippingPostal?: string | null;
  shippingCity?: string | null;
}): boolean {
  return Boolean(
    order.shippingLine1?.trim() || order.shippingPostal?.trim() || order.shippingCity?.trim(),
  );
}

const shippableWhere: Prisma.OrderWhereInput = {
  status: "paid",
  shippedAt: null,
  OR: [
    { shippingLine1: { not: null } },
    { shippingPostal: { not: null } },
    { shippingCity: { not: null } },
  ],
};

export async function listShippableOrders(take = 80) {
  return prisma.order.findMany({
    where: shippableWhere,
    include: {
      items: {
        include: {
          listing: {
            select: {
              title: true,
              vendorProfile: { select: { displayName: true } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
    take,
  });
}

export async function listRecentlyShippedOrders(take = 20) {
  return prisma.order.findMany({
    where: { status: "paid", shippedAt: { not: null } },
    include: {
      items: {
        include: {
          listing: {
            select: {
              title: true,
              vendorProfile: { select: { displayName: true } },
            },
          },
        },
      },
    },
    orderBy: { shippedAt: "desc" },
    take,
  });
}

async function adminNotifyEmails(): Promise<string[]> {
  const extra = process.env.ADMIN_NOTIFY_EMAIL?.trim();
  const admins = await prisma.user.findMany({
    where: { role: ROLES.ADMIN },
    select: { email: true },
    take: 20,
  });
  const emails = admins.map((u) => u.email).filter((e): e is string => Boolean(e?.trim()));
  if (extra) emails.push(extra);
  return [...new Set(emails.map((e) => e.trim().toLowerCase()))];
}

/**
 * Email platform admins once when a paid order has a mail-to address.
 * Safe to call from webhook and confirmation fallback.
 */
export async function notifyAdminsOfShippableOrder(orderId: string): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          listing: { select: { vendorProfile: { select: { displayName: true } } } },
        },
      },
    },
  });
  if (!order || order.status !== "paid" || order.shippedAt) return;
  if (!orderHasShipToAddress(order)) return;
  if (order.shippingAlertEmailedAt) return;

  const claimed = await prisma.order.updateMany({
    where: { id: orderId, shippingAlertEmailedAt: null, status: "paid" },
    data: { shippingAlertEmailedAt: new Date() },
  });
  if (claimed.count === 0) return;

  const to = await adminNotifyEmails();
  if (to.length === 0) {
    console.warn("[shipping] no ADMIN users with email; skip ship alert", orderId);
    return;
  }

  const vendorName =
    order.items.map((i) => i.listing?.vendorProfile.displayName).find(Boolean) ?? null;

  const sent = await sendAdminShippableOrderEmail({
    to,
    orderId: order.id,
    buyerEmail: order.email,
    totalCents: order.totalCents,
    shippingCents: order.shippingCents,
    shippingName: order.shippingName,
    shippingLine1: order.shippingLine1,
    shippingLine2: order.shippingLine2,
    shippingCity: order.shippingCity,
    shippingState: order.shippingState,
    shippingPostal: order.shippingPostal,
    shippingCountry: order.shippingCountry,
    itemLines: order.items.map((i) => ({ name: i.name, quantity: i.quantity })),
    vendorName,
  });

  if (!sent.ok) {
    await prisma.order.update({
      where: { id: orderId },
      data: { shippingAlertEmailedAt: null },
    });
    console.error("[shipping] admin alert failed", orderId, sent.error);
  }
}

export async function markOrderShipped(orderId: string): Promise<boolean> {
  const result = await prisma.order.updateMany({
    where: {
      id: orderId,
      status: "paid",
      shippedAt: null,
    },
    data: { shippedAt: new Date() },
  });
  return result.count === 1;
}
