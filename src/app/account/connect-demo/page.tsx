import { redirect } from "next/navigation";

/**
 * Legacy Connect sample route — Payment Hub is now the canonical Vendor Hub surface.
 */
export default function ConnectDemoPage() {
  redirect("/account/vendor/payments");
}
