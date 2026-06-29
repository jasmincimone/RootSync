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
    <Card className={cn("p-5", className)}>
      <Bone className="h-4 w-1/3" />
      <Bone className="mt-3 h-3 w-full" />
      <Bone className="mt-2 h-3 w-2/3" />
    </Card>
  );
}

export function CardListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }, (_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export function PageHeaderSkeleton() {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="Loading">
      <Bone className="h-7 w-48" />
      <Bone className="h-4 w-64" />
    </div>
  );
}

export function MarketplaceLoadingSkeleton() {
  return (
    <div className="space-y-8 py-12 sm:py-16" aria-busy="true" aria-label="Loading marketplace">
      <div className="space-y-3">
        <Bone className="h-9 w-64" />
        <Bone className="h-4 w-full max-w-xl" />
      </div>
      <Bone className="h-64 w-full rounded-2xl" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Card key={i} className="overflow-hidden">
            <Bone className="h-40 w-full rounded-none" />
            <div className="space-y-2 p-4">
              <Bone className="h-4 w-3/4" />
              <Bone className="h-3 w-1/2" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function BookingCalendarSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading available times">
      <Bone className="h-6 w-40" />
      <div className="grid grid-cols-7 gap-2">
        {Array.from({ length: 35 }, (_, i) => (
          <Bone key={i} className="aspect-square w-full" />
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 6 }, (_, i) => (
          <Bone key={i} className="h-10 w-20 rounded-full" />
        ))}
      </div>
    </div>
  );
}
