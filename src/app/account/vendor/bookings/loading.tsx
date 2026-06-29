import { CardListSkeleton, PageHeaderSkeleton } from "@/components/ui/LoadingSkeleton";

export default function VendorBookingsLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <CardListSkeleton count={3} />
    </div>
  );
}
