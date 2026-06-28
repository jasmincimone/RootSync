import { CircleUser } from "lucide-react";

import { cn } from "@/lib/cn";

type Size = "xs" | "sm" | "md" | "lg" | "xl";

const sizeClasses: Record<Size, string> = {
  xs: "h-5 w-5 text-[9px]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-16 w-16 text-lg",
  xl: "h-24 w-24 text-2xl sm:h-28 sm:w-28",
};

function initialsFromName(name: string | null | undefined): string {
  const trimmed = name?.trim();
  if (!trimmed) return "";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
}

type Props = {
  src?: string | null;
  name?: string | null;
  size?: Size;
  className?: string;
};

export function UserAvatar({ src, name, size = "md", className }: Props) {
  const initials = initialsFromName(name);
  const sizeClass = sizeClasses[size];

  if (src?.trim()) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- user-uploaded avatar URLs
      <img
        src={src}
        alt={name?.trim() ? `${name} profile photo` : "Profile photo"}
        className={cn(
          "shrink-0 rounded-full object-cover ring-1 ring-inset ring-fix-border/20",
          sizeClass,
          className,
        )}
      />
    );
  }

  if (initials) {
    return (
      <span
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-full bg-fix-bg-muted font-semibold text-fix-heading ring-1 ring-inset ring-fix-border/20",
          sizeClass,
          className,
        )}
        aria-hidden
      >
        {initials}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-fix-bg-muted text-fix-text-muted ring-1 ring-inset ring-fix-border/20",
        sizeClass,
        className,
      )}
      aria-hidden
    >
      <CircleUser className={size === "xs" ? "h-3 w-3" : size === "sm" ? "h-4 w-4" : size === "lg" || size === "xl" ? "h-8 w-8" : "h-5 w-5"} />
    </span>
  );
}
