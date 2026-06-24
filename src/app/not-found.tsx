import { Container } from "@/components/Container";
import { ButtonLink } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <Container className="py-16">
      <div className="max-w-xl">
        <div className="text-sm font-semibold text-fix-heading">Not found</div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-fix-heading">
          We couldn’t find that page.
        </h1>
        <p className="mt-3 text-fix-text-muted">
          Try heading back home or browsing the shops.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <ButtonLink href="/" size="lg" variant="primary">
            Go home
          </ButtonLink>
          <ButtonLink href="/marketplace" variant="secondary" size="lg">
            Browse shops
          </ButtonLink>
        </div>
      </div>
    </Container>
  );
}

