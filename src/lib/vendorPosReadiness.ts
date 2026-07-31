import { fetchConnectAccountStatus } from "@/lib/stripeConnectDemo";
import { prisma } from "@/lib/prisma";
import { OFFERING_STATUS, ORDER_ITEM_TYPE, VENDOR_STATUS } from "@/lib/roles";

export type PosReadinessStep = {
  id: string;
  title: string;
  description: string;
  href?: string;
  done: boolean;
  /** Soft steps are recommended; hard steps block Counter/M2 charges. */
  required: boolean;
};

export type VendorPosReadiness = {
  userId: string;
  vendorProfileId: string;
  displayName: string;
  email: string;
  connectAccountId: string | null;
  approved: boolean;
  connectReady: boolean;
  hasSellableListing: boolean;
  hasCounterSale: boolean;
  hasTerminalSale: boolean;
  /** Can take Counter (phone/tablet) charges on the web POS. */
  counterReady: boolean;
  /** Backend ready for M2 companion app (same Connect gate as Counter). */
  terminalBackendReady: boolean;
  steps: PosReadinessStep[];
};

/**
 * Live POS readiness for a vendor — no DB flag.
 * Counter is fully self-serve once Connect is ready; M2 also needs the Terminal app + reader.
 */
export async function getVendorPosReadiness(userId: string): Promise<VendorPosReadiness | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      stripeConnectAccountId: true,
      vendorProfile: {
        select: { id: true, status: true, displayName: true },
      },
    },
  });
  if (!user?.vendorProfile) return null;

  const vendorProfileId = user.vendorProfile.id;
  const approved = user.vendorProfile.status === VENDOR_STATUS.APPROVED;
  const connectAccountId = user.stripeConnectAccountId?.trim() || null;

  let connectReady = false;
  if (connectAccountId) {
    try {
      const status = await fetchConnectAccountStatus(connectAccountId);
      connectReady = status.readyToProcessPayments;
    } catch {
      connectReady = false;
    }
  }

  const [sellableListing, counterSale, terminalSale] = await Promise.all([
    prisma.listing.findFirst({
      where: {
        vendorProfileId,
        offering: { status: OFFERING_STATUS.ACTIVE },
        OR: [
          { priceCents: { gte: 50 } },
          { offering: { variants: { some: { priceCents: { gte: 50 } } } } },
        ],
      },
      select: { id: true },
    }),
    prisma.order.findFirst({
      where: {
        userId,
        OR: [
          { items: { some: { type: ORDER_ITEM_TYPE.POS } } },
          { items: { some: { productId: { startsWith: "pos-terminal:" } } } },
        ],
        status: "paid",
      },
      select: { id: true },
    }),
    prisma.order.findFirst({
      where: {
        userId,
        stripePaymentIntent: { not: null },
        status: "paid",
        OR: [
          { items: { some: { productId: { startsWith: "pos-terminal:" } } } },
          {
            items: {
              some: {
                listingId: { not: null },
                listing: { vendorProfileId },
              },
            },
          },
        ],
      },
      select: { id: true },
    }),
  ]);

  const hasSellableListing = Boolean(sellableListing);
  const hasCounterSale = Boolean(counterSale);
  const hasTerminalSale = Boolean(terminalSale);
  const counterReady = approved && connectReady;
  const terminalBackendReady = counterReady;

  const steps: PosReadinessStep[] = [
    {
      id: "approved",
      title: "Get approved as a vendor",
      description: "Finish your application and wait for RootSync review.",
      href: "/account/vendor",
      done: approved,
      required: true,
    },
    {
      id: "connect",
      title: "Finish Payment Hub (Stripe Connect)",
      description: "Charges must be enabled so in-person sales can pay out to you.",
      href: "/account/vendor/payments",
      done: connectReady,
      required: true,
    },
    {
      id: "listing",
      title: "Publish an ACTIVE listing ($0.50+)",
      description: "Optional for custom amounts; required for the Terminal listing picker.",
      href: "/account/vendor/listings",
      done: hasSellableListing,
      required: false,
    },
    {
      id: "counter",
      title: "Take a Counter payment (phone / tablet)",
      description: "No card reader needed — use In-person POS → Counter on this site.",
      href: "/account/vendor/pos",
      done: hasCounterSale || hasTerminalSale,
      required: false,
    },
    {
      id: "terminal-app",
      title: "Install RootSync Terminal (M2)",
      description:
        "Install the companion app, sign in with this vendor account, then scan your Stripe Reader M2.",
      href: "/account/vendor/pos#m2-setup",
      done: hasTerminalSale,
      required: false,
    },
  ];

  return {
    userId: user.id,
    vendorProfileId,
    displayName: user.vendorProfile.displayName,
    email: user.email,
    connectAccountId,
    approved,
    connectReady,
    hasSellableListing,
    hasCounterSale,
    hasTerminalSale,
    counterReady,
    terminalBackendReady,
    steps,
  };
}

export async function listApprovedVendorsPosReadiness(limit = 40): Promise<
  {
    userId: string;
    displayName: string;
    email: string;
    connectAccountId: string | null;
    counterReady: boolean;
    hasSellableListing: boolean;
    hasTerminalSale: boolean;
    connectReady: boolean;
  }[]
> {
  const profiles = await prisma.vendorProfile.findMany({
    where: { status: VENDOR_STATUS.APPROVED },
    select: {
      displayName: true,
      user: {
        select: {
          id: true,
          email: true,
          stripeConnectAccountId: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: Math.min(80, Math.max(1, limit)),
  });

  const rows = [];
  for (const p of profiles) {
    const readiness = await getVendorPosReadiness(p.user.id);
    if (!readiness) continue;
    rows.push({
      userId: readiness.userId,
      displayName: readiness.displayName,
      email: readiness.email,
      connectAccountId: readiness.connectAccountId,
      counterReady: readiness.counterReady,
      hasSellableListing: readiness.hasSellableListing,
      hasTerminalSale: readiness.hasTerminalSale,
      connectReady: readiness.connectReady,
    });
  }
  return rows;
}
