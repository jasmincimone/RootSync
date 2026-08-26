import { LISTING_TYPE } from "@/lib/roles";

/** Stripe Checkout minimum for USD. */
export const DONATION_STRIPE_MIN_CENTS = 50;

export type DonationAmountRules = {
  allowsCustomAmount: boolean;
  minAmountCents: number;
  maxAmountCents: number | null;
};

export function normalizeDonationMinCents(value: number | null | undefined): number {
  const n = typeof value === "number" && Number.isFinite(value) ? Math.round(value) : 100;
  return Math.max(DONATION_STRIPE_MIN_CENTS, n);
}

export function resolveDonationCheckoutAmountCents(args: {
  listingType: string;
  listingPriceCents: number;
  variantPriceCents?: number | null;
  amountCents?: number | null;
  rules: DonationAmountRules | null | undefined;
}): number {
  if (args.listingType !== LISTING_TYPE.DONATION) {
    return args.variantPriceCents ?? args.listingPriceCents;
  }

  const minCents = normalizeDonationMinCents(args.rules?.minAmountCents);
  const maxCents =
    typeof args.rules?.maxAmountCents === "number" && Number.isFinite(args.rules.maxAmountCents)
      ? Math.round(args.rules.maxAmountCents)
      : null;
  const allowsCustom = args.rules?.allowsCustomAmount !== false;

  if (typeof args.amountCents === "number" && Number.isFinite(args.amountCents)) {
    if (!allowsCustom) {
      throw new Error("This donation only accepts the suggested amounts.");
    }
    const amount = Math.round(args.amountCents);
    if (amount < minCents) {
      throw new Error(`Enter at least $${(minCents / 100).toFixed(2)}.`);
    }
    if (maxCents != null && amount > maxCents) {
      throw new Error(`Enter at most $${(maxCents / 100).toFixed(2)}.`);
    }
    return amount;
  }

  const fromVariantOrListing = args.variantPriceCents ?? args.listingPriceCents;
  if (fromVariantOrListing >= minCents) return fromVariantOrListing;

  throw new Error("Choose a suggested amount or enter how much you want to give.");
}
