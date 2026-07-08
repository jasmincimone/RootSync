import { RootSyncLoader } from "@/components/RootSyncLoader";
import { cn } from "@/lib/cn";

import { Card } from "./Card";

function Bone({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-lg bg-fix-bg-muted motion-reduce:animate-none", className)}
      aria-hidden
    />
  );
}

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn(className)}>
      <RootSyncLoader size="sm" block />
    </div>
  );
}

export function CardListSkeleton({ count: _count = 3 }: { count?: number }) {
  return <RootSyncLoader size="md" block />;
}

export function PageHeaderSkeleton() {
  return <RootSyncLoader size="sm" block className="min-h-0 py-4" label="" />;
}

export function MarketplaceLoadingSkeleton() {
  return <RootSyncLoader size="lg" block className="py-12 sm:py-16" />;
}

export function BookingCalendarSkeleton() {
  return <RootSyncLoader size="md" block label="Loading available times" />;
}

/** @deprecated Prefer RootSyncLoader — kept for layout-specific skeleton chrome. */
export { Bone };
