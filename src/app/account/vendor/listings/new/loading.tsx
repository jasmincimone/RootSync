import { CardSkeleton, PageHeaderSkeleton } from "@/components/ui/LoadingSkeleton";

export default function NewVendorListingLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <CardSkeleton className="min-h-[480px]" />
    </div>
  );
}
