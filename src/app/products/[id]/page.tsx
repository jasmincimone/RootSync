import Link from "next/link";
import { notFound } from "next/navigation";

import { Container } from "@/components/Container";
import { AddToCartButton } from "@/components/AddToCartButton";
import { BuyNowLink } from "@/components/BuyNowLink";
import { ProductImage } from "@/components/ProductImage";
import { ButtonLink } from "@/components/ui/Button";
import { getShop } from "@/config/shops";
import { formatPrice } from "@/lib/format";
import { getStripePaymentLink } from "@/lib/paymentLinks";
import { getMergedProductForPublic } from "@/lib/shopCatalog";
import { ProductSeedChoice } from "@/components/ProductSeedChoice";

type ProductPageParams = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: ProductPageParams) {
  const { id } = await params;
  const product = await getMergedProductForPublic(id);
  if (!product) return {};
  return {
    title: product.name,
    description: product.summary,
  };
}

export default async function ProductPage({ params }: ProductPageParams) {
  const { id } = await params;
  const product = await getMergedProductForPublic(id);
  if (!product) notFound();

  const shop = getShop(product.shop);
  const paymentLink = getStripePaymentLink(product);

  return (
    <div>
      <section className="border-b border-fix-border/15">
        <Container className="py-8 sm:py-12">
          <nav className="text-sm text-fix-text-muted">
            <Link href="/marketplace" className="text-fix-link hover:text-fix-link-hover">
              Marketplace
            </Link>
            <span className="mx-2">/</span>
            <Link href={`/shops/${product.shop}`} className="text-fix-link hover:text-fix-link-hover">
              {shop?.name ?? product.shop}
            </Link>
            <span className="mx-2">/</span>
            <Link
              href={`/shops/${product.shop}/products`}
              className="text-fix-link hover:text-fix-link-hover"
            >
              Products
            </Link>
            <span className="mx-2">/</span>
            <span className="text-fix-heading">{product.name}</span>
          </nav>

          <div className="mt-8 grid gap-8 lg:grid-cols-2">
            <div
              className={`overflow-hidden rounded-2xl bg-fix-bg-muted ${
                product.imageFit === "contain"
                  ? "aspect-square max-w-md mx-auto lg:mx-0 lg:max-w-none"
                  : "aspect-[4/3] lg:aspect-square"
              }`}
            >
              <ProductImage
                shop={product.shop}
                productId={product.id}
                src={product.image}
                fit={product.imageFit ?? "cover"}
                placeholderText={product.type === "digital" ? "Digital product" : "Product image"}
                className="h-full w-full rounded-2xl"
              />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-fix-border/20 px-2.5 py-1 text-xs font-medium text-fix-heading">
                  {product.type === "physical" ? "Physical" : "Digital"}
                </span>
                {product.format && (
                  <span className="rounded-full bg-fix-bg-muted px-2.5 py-1 text-xs text-fix-text-muted">
                    {product.format}
                  </span>
                )}
                {product.badge && (
                  <span className="rounded-full bg-gold/20 px-2.5 py-1 text-xs font-medium text-bark">
                    {product.badge}
                  </span>
                )}
              </div>
              <h1 className="mt-4 text-2xl font-semibold tracking-tight text-fix-heading sm:text-3xl">
                {product.name}
              </h1>
              <p className="mt-2 text-xl font-semibold text-fix-heading">
                {formatPrice(product.price)}
              </p>
              <p className="mt-4 text-fix-text-muted">{product.description}</p>

              {product.options?.some((o) => o.id === "seed") ? (
                <div className="mt-6">
                  <ProductSeedChoice product={product} />
                </div>
              ) : null}

              {product.type === "digital" && (
                <p className="mt-3 text-sm text-fix-text-muted">
                  Ebooks, crochet patterns, and other digital items are delivered instantly.
                  You&apos;ll receive a download link by email after checkout; when member accounts
                  are available, you&apos;ll also find them in your library.
                </p>
              )}

              <div className="mt-8 flex flex-wrap gap-3">
                {paymentLink ? (
                  <>
                    <BuyNowLink href={paymentLink} size="lg" />
                    <AddToCartButton productId={product.id} size="lg" variant="secondary" />
                  </>
                ) : product.options?.some((o) => o.id === "seed") ? null : (
                  <AddToCartButton productId={product.id} size="lg" />
                )}
                <ButtonLink href={`/shops/${product.shop}/products`} variant="secondary" size="lg">
                  More from {shop?.name ?? product.shop}
                </ButtonLink>
              </div>
              {paymentLink && (
                <p className="mt-3 text-xs text-fix-text-muted">
                  Buy now opens a secure Stripe checkout. You can still add to cart to combine items and check out together.
                </p>
              )}
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
}
