import { Suspense } from "react";

import { Container } from "@/components/Container";
import { Card } from "@/components/ui/Card";

import { LoginClient } from "./LoginClient";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <Container className="py-12 sm:py-16">
          <div className="mx-auto max-w-sm">
            <Card className="p-6 text-sm text-fix-text-muted">Loading…</Card>
          </div>
        </Container>
      }
    >
      <LoginClient />
    </Suspense>
  );
}
