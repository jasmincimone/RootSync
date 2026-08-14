import { fetchConnectAccountStatus } from "@/lib/stripeConnectDemo";

export type ListingCheckoutOptions = {
  stripeCheckoutReady: boolean;
  /** Offering payment URL, or vendor default payment link when listing has none. */
  paymentLinkUrl: string | null;
  /**
   * A pay link set on the listing itself is an explicit choice to sell off-platform,
   * so RootSync checkout (Buy now, cart, shipping) is withheld for that listing.
   * A vendor-wide default link does not trigger this.
   */
  externalCheckoutOnly: boolean;
};

export function resolveListingPaymentLinkUrl(args: {
  offeringPaymentUrl: string | null | undefined;
  vendorPaymentLinkUrl: string | null | undefined;
}): string | null {
  const offering = args.offeringPaymentUrl?.trim();
  if (offering) return offering;
  const vendor = args.vendorPaymentLinkUrl?.trim();
  return vendor || null;
}

export async function vendorStripeCheckoutReady(
  stripeConnectAccountId: string | null | undefined,
): Promise<boolean> {
  if (!stripeConnectAccountId?.trim()) return false;
  try {
    const status = await fetchConnectAccountStatus(stripeConnectAccountId);
    return status.readyToProcessPayments;
  } catch {
    return false;
  }
}

export async function resolveListingCheckoutOptions(args: {
  offeringPaymentUrl: string | null | undefined;
  vendorPaymentLinkUrl: string | null | undefined;
  stripeConnectAccountId: string | null | undefined;
}): Promise<ListingCheckoutOptions> {
  const [stripeCheckoutReady] = await Promise.all([
    vendorStripeCheckoutReady(args.stripeConnectAccountId),
  ]);

  return {
    stripeCheckoutReady,
    paymentLinkUrl: resolveListingPaymentLinkUrl({
      offeringPaymentUrl: args.offeringPaymentUrl,
      vendorPaymentLinkUrl: args.vendorPaymentLinkUrl,
    }),
    externalCheckoutOnly: Boolean(args.offeringPaymentUrl?.trim()),
  };
}
