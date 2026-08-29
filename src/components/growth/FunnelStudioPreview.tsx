"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { FunnelPagePreview } from "@/components/growth/FunnelPagePreview";
import { cn } from "@/lib/cn";
import type { FunnelPageContent } from "@/lib/growth/funnelPage";

export function FunnelStudioPreview({
  page,
  ctaLabel,
  className,
}: {
  page: FunnelPageContent;
  ctaLabel?: string | null;
  className?: string;
}) {
  const [previewMobile, setPreviewMobile] = useState(false);

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-fix-text-muted">Live preview</p>
        <div className="flex gap-1">
          <Button
            type="button"
            size="sm"
            variant={previewMobile ? "ghost" : "secondary"}
            onClick={() => setPreviewMobile(false)}
          >
            Desktop
          </Button>
          <Button
            type="button"
            size="sm"
            variant={previewMobile ? "secondary" : "ghost"}
            onClick={() => setPreviewMobile(true)}
          >
            Mobile
          </Button>
        </div>
      </div>
      <div
        className={cn(
          "overflow-hidden rounded-2xl border border-fix-border/20 bg-fix-bg-muted/30 transition-[max-width]",
          previewMobile ? "mx-auto w-[390px] shadow-lg" : "w-full",
        )}
      >
        <FunnelPagePreview page={page} ctaLabel={ctaLabel} compact={previewMobile} />
      </div>
    </div>
  );
}
