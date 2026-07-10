"use client";

import { VendorStripeConnectSetup } from "@/components/VendorStripeConnectSetup";

/**
 * @deprecated Prefer VendorStripeConnectSetup on `/account/vendor/payments` (Payment Hub).
 * Kept as a thin alias so older imports keep working.
 */
export function ConnectDemoDashboard() {
  return (
    <VendorStripeConnectSetup
      returnPath="/account/vendor/payments"
      showDevControls={process.env.NODE_ENV === "development"}
    />
  );
}
