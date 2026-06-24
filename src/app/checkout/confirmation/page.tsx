import { Suspense } from "react";

import { Container } from "@/components/Container";

import { OrderConfirmationClient } from "./OrderConfirmationClient";

export default function OrderConfirmationPage() {
  return (
    <Suspense
      fallback={
        <Container className="py-12 sm:py-16">
          <p className="text-fix-text-muted">Loading your order…</p>
        </Container>
      }
    >
      <OrderConfirmationClient />
    </Suspense>
  );
}
