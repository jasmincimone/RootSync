import { Container } from "@/components/Container";
import { CardSkeleton, PageHeaderSkeleton } from "@/components/ui/LoadingSkeleton";

export default function MessagesInboxLoading() {
  return (
    <Container className="py-10 sm:py-12">
      <PageHeaderSkeleton />
      <div className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,280px)_1fr]">
        <CardSkeleton className="min-h-[320px]" />
        <CardSkeleton className="min-h-[320px]" />
      </div>
    </Container>
  );
}
