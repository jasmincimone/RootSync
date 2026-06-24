import Link from "next/link";

import { Container } from "@/components/Container";

export default async function ConnectStoreSuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ accountId: string }>;
  searchParams?: Promise<{ session_id?: string }>;
}) {
  const { accountId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  return (
    <Container className="py-12 sm:py-16">
      <div className="mx-auto max-w-xl rounded-2xl border border-fix-border/20 bg-fix-surface p-6 shadow-soft">
        <h1 className="text-2xl font-semibold text-fix-heading">Payment successful</h1>
        <p className="mt-2 text-sm text-fix-text-muted">
          Thank you for your purchase from connected account <code>{accountId}</code>.
        </p>
        {resolvedSearchParams?.session_id ? (
          <p className="mt-2 text-xs text-fix-text-muted">
            Checkout session id: <code>{resolvedSearchParams.session_id}</code>
          </p>
        ) : null}
        <div className="mt-5">
          <Link
            href={`/connect-store/${accountId}`}
            className="inline-flex h-10 items-center justify-center rounded-full bg-fix-cta px-4 text-sm font-medium text-fix-cta-foreground hover:opacity-90"
          >
            Continue shopping
          </Link>
        </div>
      </div>
    </Container>
  );
}
