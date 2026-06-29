import { Container } from "@/components/Container";
import { BookingCalendarSkeleton, PageHeaderSkeleton } from "@/components/ui/LoadingSkeleton";

export default function BookServiceLoading() {
  return (
    <Container className="py-8 sm:py-12">
      <PageHeaderSkeleton />
      <div className="mt-8">
        <BookingCalendarSkeleton />
      </div>
    </Container>
  );
}
