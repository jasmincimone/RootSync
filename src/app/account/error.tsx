"use client";

import { RouteErrorPanel } from "@/components/RouteErrorPanel";

export default function AccountError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteErrorPanel error={error} reset={reset} title="Account hit a snag" />;
}
