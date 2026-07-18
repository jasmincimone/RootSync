"use client";

import { Bookmark } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { cn } from "@/lib/cn";
import type { FavoriteTargetType } from "@/lib/roles";

type Props = {
  targetType: FavoriteTargetType;
  targetId: string;
  initialSaved: boolean;
  signedIn: boolean;
  className?: string;
  size?: "sm" | "md";
};

export function FavoriteButton({
  targetType,
  targetId,
  initialSaved,
  signedIn,
  className,
  size = "md",
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const callbackUrl = pathname || "/discover";
  const loginHref = `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`;

  const iconClass = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  const padClass = size === "sm" ? "h-9 w-9" : "h-10 w-10";

  const idleClass =
    "bg-fix-surface text-fix-heading ring-1 ring-inset ring-fix-border/20 hover:bg-fix-bg-muted";
  const savedClass =
    "bg-fix-cta/15 text-fix-cta ring-1 ring-inset ring-fix-cta/35";

  if (!signedIn) {
    return (
      <Link
        href={loginHref}
        className={cn(
          "inline-flex items-center justify-center rounded-full transition-colors",
          idleClass,
          padClass,
          className,
        )}
        aria-label="Sign in to save"
        title="Sign in to save"
      >
        <Bookmark className={iconClass} strokeWidth={1.75} />
      </Link>
    );
  }

  return (
    <div className={cn("inline-flex flex-col items-end gap-1", className)}>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setError(null);
          const next = !saved;
          setSaved(next);
          startTransition(async () => {
            try {
              const res = await fetch("/api/favorites", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ targetType, targetId }),
              });
              const data = (await res.json().catch(() => ({}))) as {
                saved?: boolean;
                error?: string;
              };
              if (!res.ok) {
                setSaved(!next);
                setError(data.error ?? "Could not update favorite");
                return;
              }
              setSaved(Boolean(data.saved));
              router.refresh();
            } catch {
              setSaved(!next);
              setError("Could not update favorite");
            }
          });
        }}
        className={cn(
          "inline-flex items-center justify-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber focus-visible:ring-offset-2 disabled:opacity-60",
          padClass,
          saved ? savedClass : idleClass,
        )}
        aria-label={saved ? "Remove from favorites" : "Add to favorites"}
        aria-pressed={saved}
        title={saved ? "Remove from favorites" : "Add to favorites"}
      >
        <Bookmark
          className={iconClass}
          strokeWidth={saved ? 0 : 1.75}
          fill={saved ? "currentColor" : "none"}
        />
      </button>
      {error ? <p className="max-w-[10rem] text-right text-xs text-red-700">{error}</p> : null}
    </div>
  );
}
