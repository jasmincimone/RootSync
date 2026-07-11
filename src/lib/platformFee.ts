/**
 * Platform take-rate for Stripe Connect destination charges.
 * Configure with STRIPE_PLATFORM_FEE_BPS (basis points). Default 1000 = 10%.
 * Fee is always less than the charge so the connected vendor receives funds.
 */
export function platformFeeBps(): number {
  const raw = process.env.STRIPE_PLATFORM_FEE_BPS;
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
  if (Number.isFinite(parsed) && parsed >= 0 && parsed < 10_000) return parsed;
  return 1000;
}

/** Application fee in cents for a Connect destination charge. */
export function platformApplicationFeeCents(chargeAmountCents: number): number {
  const amount = Math.round(chargeAmountCents);
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  const fee = Math.floor((amount * platformFeeBps()) / 10_000);
  // Vendor must receive at least 1¢ on any positive charge.
  return Math.min(Math.max(fee, 0), Math.max(amount - 1, 0));
}
