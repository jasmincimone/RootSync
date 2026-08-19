import { prisma } from "@/lib/prisma";
import {
  GROWTH_CONTACT_STATUS,
  GROWTH_FUNNEL_ENTRY_SOURCE,
  GROWTH_MARKETING_EVENT_TYPE,
  type GrowthContactStatus,
} from "@/lib/growth/roles";

const PAID_ORDER_STATUSES = ["paid", "shipped", "delivered"] as const;
const LEAD_SOURCE = "discover_checkout";

export function nextCustomerStatus(
  current: string | null | undefined,
): GrowthContactStatus {
  if (current === GROWTH_CONTACT_STATUS.RETURNING_CUSTOMER) {
    return GROWTH_CONTACT_STATUS.RETURNING_CUSTOMER;
  }
  if (current === GROWTH_CONTACT_STATUS.CUSTOMER) {
    return GROWTH_CONTACT_STATUS.RETURNING_CUSTOMER;
  }
  return GROWTH_CONTACT_STATUS.CUSTOMER;
}

export function formatPurchaseSummaryLine(args: {
  listingTitle: string;
  quantity: number;
  priceCents: number;
  purchasedAt: Date;
}): string {
  const date = args.purchasedAt.toISOString().slice(0, 10);
  const total = ((args.priceCents * args.quantity) / 100).toFixed(2);
  return `${date}: ${args.listingTitle} ×${args.quantity} ($${total})`;
}

function appendPurchaseSummary(existing: string | null | undefined, line: string): string {
  const prior = existing?.trim();
  const lines = prior ? prior.split("\n").filter(Boolean) : [];
  lines.push(line);
  return lines.slice(-5).join("\n");
}

async function findDiscoverCheckoutFunnel(vendorProfileId: string) {
  return prisma.growthFunnel.findFirst({
    where: {
      vendorProfileId,
      isActive: true,
      entrySource: GROWTH_FUNNEL_ENTRY_SOURCE.DISCOVER_CHECKOUT,
    },
    select: { id: true },
  });
}

async function resolveVendorFunnelId(
  vendorProfileId: string,
  requestedFunnelId?: string | null,
): Promise<string | null> {
  if (requestedFunnelId) {
    const funnel = await prisma.growthFunnel.findFirst({
      where: { id: requestedFunnelId, vendorProfileId },
      select: { id: true },
    });
    if (!funnel) {
      throw new Error("Choose a funnel from this vendor workspace.");
    }
    return funnel.id;
  }
  return (await findDiscoverCheckoutFunnel(vendorProfileId))?.id ?? null;
}

async function isVendorOwnEmail(vendorProfileId: string, email: string): Promise<boolean> {
  const profile = await prisma.vendorProfile.findUnique({
    where: { id: vendorProfileId },
    select: { contactEmail: true, user: { select: { email: true } } },
  });
  if (!profile) return false;
  const normalized = email.trim().toLowerCase();
  return [profile.contactEmail, profile.user.email]
    .filter(Boolean)
    .some((value) => value!.trim().toLowerCase() === normalized);
}

async function upsertVendorBuyerContact(args: {
  vendorProfileId: string;
  email: string;
  name: string;
  rootSyncUserId: string | null;
  purchaseLines: string[];
  funnelId: string | null;
  recordEvent?: boolean;
  skipVendorEmailCheck?: boolean;
  existingContact?: {
    id: string;
    name: string;
    status: string;
    purchaseSummary: string | null;
    funnelId: string | null;
    leadSource: string | null;
    rootSyncUserId: string | null;
  } | null;
}): Promise<"created" | "updated" | "skipped"> {
  const email = args.email.trim().toLowerCase();
  if (!email.includes("@")) return "skipped";
  if (!args.skipVendorEmailCheck && (await isVendorOwnEmail(args.vendorProfileId, email))) {
    return "skipped";
  }

  const existing =
    args.existingContact !== undefined
      ? args.existingContact
      : await prisma.growthContact.findFirst({
          where: { vendorProfileId: args.vendorProfileId, email },
          select: {
            id: true,
            name: true,
            status: true,
            purchaseSummary: true,
            funnelId: true,
            leadSource: true,
            rootSyncUserId: true,
          },
        });

  let purchaseSummary = existing?.purchaseSummary ?? null;
  for (const line of args.purchaseLines) {
    purchaseSummary = appendPurchaseSummary(purchaseSummary, line);
  }

  const status = nextCustomerStatus(existing?.status);
  const funnelId = existing?.funnelId ?? args.funnelId;
  const displayName =
    existing?.name?.trim() && existing.name.trim() !== email
      ? existing.name.trim()
      : args.name.trim() || email.split("@")[0] || "Customer";

  const contact = existing
    ? await prisma.growthContact.update({
        where: { id: existing.id },
        data: {
          status,
          purchaseSummary,
          lastActivityAt: new Date(),
          ...(displayName !== existing.name ? { name: displayName } : {}),
          ...(args.rootSyncUserId && !existing.rootSyncUserId
            ? { rootSyncUserId: args.rootSyncUserId }
            : {}),
          ...(funnelId && !existing.funnelId ? { funnelId } : {}),
          ...(!existing.leadSource ? { leadSource: LEAD_SOURCE } : {}),
        },
        select: { id: true },
      })
    : await prisma.growthContact.create({
        data: {
          vendorProfileId: args.vendorProfileId,
          email,
          name: displayName,
          status,
          leadSource: LEAD_SOURCE,
          purchaseSummary,
          funnelId: args.funnelId,
          rootSyncUserId: args.rootSyncUserId,
          lastActivityAt: new Date(),
        },
        select: { id: true },
      });

  if (args.recordEvent !== false) {
    await prisma.growthMarketingEvent.create({
      data: {
        vendorProfileId: args.vendorProfileId,
        eventType: GROWTH_MARKETING_EVENT_TYPE.CONVERSION,
        contactId: contact.id,
        funnelId: funnelId ?? undefined,
        metadataJson: {
          source: LEAD_SOURCE,
          email,
          purchaseLines: args.purchaseLines,
        },
      },
    });
  }

  return existing ? "updated" : "created";
}

/** Create or update vendor CRM contacts when a Discover order is paid. */
export async function syncGrowthContactsFromPaidOrder(orderId: string): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      status: true,
      email: true,
      userId: true,
      shippingName: true,
      createdAt: true,
      user: { select: { id: true, name: true } },
      items: {
        where: { listingId: { not: null } },
        select: {
          quantity: true,
          priceCents: true,
          listing: { select: { vendorProfileId: true, title: true } },
        },
      },
    },
  });

  if (!order || !PAID_ORDER_STATUSES.includes(order.status as (typeof PAID_ORDER_STATUSES)[number])) {
    return;
  }

  const buyerEmail = order.email?.trim().toLowerCase();
  if (!buyerEmail?.includes("@")) return;

  const buyerName =
    order.shippingName?.trim() ||
    order.user?.name?.trim() ||
    buyerEmail.split("@")[0] ||
    "Customer";

  const byVendor = new Map<string, string[]>();
  for (const item of order.items) {
    const vendorProfileId = item.listing?.vendorProfileId;
    if (!vendorProfileId) continue;
    const line = formatPurchaseSummaryLine({
      listingTitle: item.listing?.title ?? "Listing",
      quantity: item.quantity,
      priceCents: item.priceCents,
      purchasedAt: order.createdAt,
    });
    const lines = byVendor.get(vendorProfileId) ?? [];
    lines.push(line);
    byVendor.set(vendorProfileId, lines);
  }

  for (const [vendorProfileId, purchaseLines] of byVendor) {
    const funnel = await findDiscoverCheckoutFunnel(vendorProfileId);
    await upsertVendorBuyerContact({
      vendorProfileId,
      email: buyerEmail,
      name: buyerName,
      rootSyncUserId: order.userId ?? order.user?.id ?? null,
      purchaseLines,
      funnelId: funnel?.id ?? null,
      recordEvent: true,
    });
  }
}

/** Import paid Discover checkout buyers into CRM (historical backfill). */
export async function backfillGrowthContactsFromVendorOrders(
  vendorProfileId: string,
  options?: { funnelId?: string | null },
): Promise<{
  ordersProcessed: number;
  contactsCreated: number;
  contactsUpdated: number;
  contactsAssignedToFunnel: number;
}> {
  const vendor = await prisma.vendorProfile.findUnique({
    where: { id: vendorProfileId },
    select: { contactEmail: true, user: { select: { email: true } } },
  });
  if (!vendor) {
    throw new Error("Vendor profile not found.");
  }

  const vendorEmails = new Set(
    [vendor.contactEmail, vendor.user.email]
      .filter(Boolean)
      .map((value) => value!.trim().toLowerCase()),
  );

  const rows = await prisma.orderItem.findMany({
    where: {
      listingId: { not: null },
      listing: { vendorProfileId },
      order: { status: { in: [...PAID_ORDER_STATUSES] } },
    },
    select: {
      orderId: true,
      quantity: true,
      priceCents: true,
      listing: { select: { title: true } },
      order: {
        select: {
          email: true,
          userId: true,
          shippingName: true,
          createdAt: true,
          user: { select: { id: true, name: true } },
        },
      },
    },
  });

  const orderIds = new Set<string>();
  const buyers = new Map<
    string,
    {
      email: string;
      name: string;
      rootSyncUserId: string | null;
      purchaseLines: string[];
    }
  >();

  for (const row of rows) {
    orderIds.add(row.orderId);
    const email = row.order.email?.trim().toLowerCase();
    if (!email?.includes("@") || vendorEmails.has(email)) continue;

    const line = formatPurchaseSummaryLine({
      listingTitle: row.listing?.title ?? "Listing",
      quantity: row.quantity,
      priceCents: row.priceCents,
      purchasedAt: row.order.createdAt,
    });

    const existing = buyers.get(email);
    if (existing) {
      existing.purchaseLines.push(line);
      continue;
    }

    buyers.set(email, {
      email,
      name:
        row.order.shippingName?.trim() ||
        row.order.user?.name?.trim() ||
        email.split("@")[0] ||
        "Customer",
      rootSyncUserId: row.order.userId ?? row.order.user?.id ?? null,
      purchaseLines: [line],
    });
  }

  const existingContacts = await prisma.growthContact.findMany({
    where: {
      vendorProfileId,
      email: { in: [...buyers.keys()] },
    },
    select: {
      id: true,
      email: true,
      name: true,
      status: true,
      purchaseSummary: true,
      funnelId: true,
      leadSource: true,
      rootSyncUserId: true,
    },
  });
  const existingByEmail = new Map(
    existingContacts.map((contact) => [contact.email.trim().toLowerCase(), contact]),
  );

  let contactsCreated = 0;
  let contactsUpdated = 0;

  const buyerList = [...buyers.values()];
  const chunkSize = 8;
  for (let index = 0; index < buyerList.length; index += chunkSize) {
    const chunk = buyerList.slice(index, index + chunkSize);
    const results = await Promise.all(
      chunk.map((buyer) =>
        upsertVendorBuyerContact({
          vendorProfileId,
          email: buyer.email,
          name: buyer.name,
          rootSyncUserId: buyer.rootSyncUserId,
          purchaseLines: buyer.purchaseLines,
          funnelId: options?.funnelId ?? null,
          recordEvent: false,
          skipVendorEmailCheck: true,
          existingContact: existingByEmail.get(buyer.email) ?? null,
        }),
      ),
    );
    for (const result of results) {
      if (result === "created") contactsCreated += 1;
      if (result === "updated") contactsUpdated += 1;
    }
  }

  return {
    ordersProcessed: orderIds.size,
    contactsCreated,
    contactsUpdated,
    contactsAssignedToFunnel: 0,
  };
}

export async function setDiscoverCheckoutFunnel(args: {
  funnelId: string;
  vendorProfileId: string;
  enabled: boolean;
}): Promise<void> {
  if (args.enabled) {
    await prisma.growthFunnel.updateMany({
      where: {
        vendorProfileId: args.vendorProfileId,
        id: { not: args.funnelId },
        entrySource: GROWTH_FUNNEL_ENTRY_SOURCE.DISCOVER_CHECKOUT,
      },
      data: { entrySource: null },
    });
  }

  await prisma.growthFunnel.update({
    where: { id: args.funnelId },
    data: {
      entrySource: args.enabled ? GROWTH_FUNNEL_ENTRY_SOURCE.DISCOVER_CHECKOUT : null,
    },
  });
}
