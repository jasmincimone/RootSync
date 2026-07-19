"use client";

import { RouteErrorPanel } from "@/components/RouteErrorPanel";

export default function DiscoverError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteErrorPanel error={error} reset={reset} title="Discover hit a snag" />;
}
