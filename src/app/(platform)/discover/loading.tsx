import { Container } from "@/components/Container";
import { CardListSkeleton, PageHeaderSkeleton } from "@/components/ui/LoadingSkeleton";

export default function MarketplaceLoading() {
  return (
    <Container>
      <PageHeaderSkeleton />
      <div className="mt-8">
        <CardListSkeleton count={4} />
      </div>
    </Container>
  );
}
