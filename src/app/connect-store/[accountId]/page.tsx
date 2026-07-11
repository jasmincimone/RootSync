import { notFound } from "next/navigation";
import Link from "next/link";

import { Container } from "@/components/Container";
import { ConnectStorefrontClient } from "@/components/ConnectStorefrontClient";
import { getConnectStripeClient } from "@/lib/stripeConnectDemo";

export const dynamic = "force-dynamic";

function connectDemoEnabled(): boolean {
  if (process.env.ENABLE_CONNECT_DEMO === "1") return true;
  return process.env.NODE_ENV === "development";
}

/**
 * Demo storefront for a connected account (dev / ENABLE_CONNECT_DEMO only).
 * Production storefront is the Discover vendor page.
 */
export default async function ConnectedStorefrontPage({
  params,
}: {
  params: Promise<{ accountId: string }>;
}) {
  if (!connectDemoEnabled()) notFound();

  const { accountId } = await params;
  const stripeClient = getConnectStripeClient();

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
        Connected account storefront (demo)
      </h1>
      <p className="mt-2 max-w-3xl text-sm text-fix-text-muted">
        Dev-only sample. Production storefronts are Discover vendor pages. Account:{" "}
        <code>{accountId}</code>.
      </p>
      <p className="mt-2 text-sm">
        <Link href="/account/vendor/payments" className="font-medium text-fix-link hover:text-fix-link-hover">
          Open Payment Hub
        </Link>
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
    </Container>
  );
}
