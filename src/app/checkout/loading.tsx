import { Container } from "@/components/Container";
import { CardSkeleton, PageHeaderSkeleton } from "@/components/ui/LoadingSkeleton";

export default function CheckoutLoading() {
  return (
    <Container className="py-12 sm:py-16">
      <div className="mx-auto max-w-xl space-y-6">
        <PageHeaderSkeleton />
        <CardSkeleton className="min-h-[280px]" />
      </div>
    </Container>
  );
}
