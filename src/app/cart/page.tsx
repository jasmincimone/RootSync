import type { Metadata } from "next";

import { CartPageClient } from "@/app/cart/CartPageClient";

export const metadata: Metadata = {
  title: "Cart | RootSync",
  description: "Review items and check out with one vendor at a time.",
};

export default function CartPage() {
  return <CartPageClient />;
}
