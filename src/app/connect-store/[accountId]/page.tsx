import Link from "next/link";

import { Container } from "@/components/Container";
import { ConnectStorefrontClient } from "@/components/ConnectStorefrontClient";
import { getConnectStripeClient } from "@/lib/stripeConnectDemo";

export const dynamic = "force-dynamic";

/**
 * Public storefront for one connected account.
 *
 * NOTE: This demo uses the connected account id (`acct_…`) in the URL for simplicity.
 * In production, map a public seller slug/handle → account id so you do not expose
 * internal Stripe identifiers.
 */
export default async function ConnectedStorefrontPage({
  params,
}: {
  params: Promise<{ accountId: string }>;
}) {
  const { accountId } = await params;
  const stripeClient = getConnectStripeClient();

  // List products on the connected account via Stripe-Account header.
  const products = await stripeClient.products.list(
    {
      limit: 20,
      active: true,
      expand: ["data.default_price"],
    },
    {
      stripeAccount: accountId,
    },
  );

  return (
    <Container className="py-10 sm:py-14">
      <h1 className="text-3xl font-semibold tracking-tight text-fix-heading">
        Connected account storefront
      </h1>
      <p className="mt-2 max-w-3xl text-sm text-fix-text-muted">
        Account: <code>{accountId}</code>. This demo intentionally uses the connected account ID in
        the URL; for production, map public seller handles/slugs to account IDs.
      </p>
      <div className="mt-8">
        <ConnectStorefrontClient
          accountId={accountId}
          products={products.data.map((product) => ({
            id: product.id,
            name: product.name,
            description: product.description,
            images: product.images || [],
            default_price:
              product.default_price && typeof product.default_price !== "string"
                ? {
                    unit_amount: product.default_price.unit_amount,
                    currency: product.default_price.currency,
                  }
                : null,
          }))}
        />
      </div>
      <div className="mt-8">
        <Link
          href="/account/vendor/payments"
          className="text-sm font-medium text-fix-link hover:text-fix-link-hover"
        >
          Back to Payment Hub
        </Link>
      </div>
    </Container>
  );
}
