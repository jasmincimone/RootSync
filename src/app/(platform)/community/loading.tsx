import { Container } from "@/components/Container";
import { CardListSkeleton, PageHeaderSkeleton } from "@/components/ui/LoadingSkeleton";

export default function CommunityLoading() {
  return (
    <Container className="py-12 sm:py-16">
      <div className="mx-auto max-w-3xl space-y-8">
        <PageHeaderSkeleton />
        <CardListSkeleton count={4} />
      </div>
    </Container>
  );
}
