import { CardListSkeleton, PageHeaderSkeleton } from "@/components/ui/LoadingSkeleton";

export default function AccountLoading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
      <div className="grid gap-4 sm:grid-cols-2">
        <CardListSkeleton count={4} />
      </div>
    </div>
  );
}
