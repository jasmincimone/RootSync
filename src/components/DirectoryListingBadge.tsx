import { MapPin } from "lucide-react";

import { cn } from "@/lib/cn";

type Props = {
  className?: string;
  size?: "sm" | "md";
};

export function DirectoryListingBadge({ className, size = "md" }: Props) {
  const iconClass = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  const textClass = size === "sm" ? "text-[10px]" : "text-xs";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-medium text-amber",
        textClass,
        className,
      )}
    >
      <MapPin className={iconClass} aria-hidden />
      Directory listing
    </span>
  );
}
