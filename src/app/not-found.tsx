import { Container } from "@/components/Container";
import { ButtonLink } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <Container className="py-16">
      <div className="max-w-xl">
        <div className="text-sm font-semibold text-fix-heading">Not found</div>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-fix-heading">
          We couldn&apos;t find that page.
        </h1>
        <p className="mt-3 text-fix-text-muted">
          The link may be outdated or the page may have moved. Try the marketplace or your account
          dashboard.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <ButtonLink href="/" size="lg" variant="primary">
            Go home
          </ButtonLink>
          <ButtonLink href="/discover" variant="secondary" size="lg">
            Browse marketplace
          </ButtonLink>
          <ButtonLink href="/account" variant="secondary" size="lg">
            Account
          </ButtonLink>
        </div>
      </div>
    </Container>
  );
}
