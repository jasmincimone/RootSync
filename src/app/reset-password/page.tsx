import { Suspense } from "react";

import { Container } from "@/components/Container";
import { Card } from "@/components/ui/Card";

import { ResetPasswordForm } from "./ResetPasswordForm";

export default function ResetPasswordPage() {
  return (
    <Container className="py-12 sm:py-16">
      <div className="mx-auto max-w-sm">
        <h1 className="text-2xl font-semibold tracking-tight text-fix-heading">Reset password</h1>
        <p className="mt-1 text-sm text-fix-text-muted">Choose a new password for your account.</p>
        <div className="mt-6">
          <Suspense fallback={<Card className="p-6 text-sm text-fix-text-muted">Loading…</Card>}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </Container>
  );
}
