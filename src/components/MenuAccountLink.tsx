"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { ChevronRight } from "lucide-react";

import { UserAvatar } from "@/components/UserAvatar";

type Props = {
  onNavigate?: () => void;
};

export function MenuAccountLink({ onNavigate }: Props) {
  const { data: session, status } = useSession();

  const href =
    status === "loading" || session ? "/account" : "/login?callbackUrl=/account";

  const label =
    status === "loading" ? "Account" : session ? "My account" : "Sign in";

  const displayName = session?.user?.name ?? session?.user?.email ?? label;

  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="flex items-center gap-4 rounded-2xl border border-fix-border/12 bg-fix-surface p-4 shadow-soft transition-all hover:border-fix-border/25 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fix-cta"
    >
      <UserAvatar src={session?.user?.image} name={displayName} size="lg" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-fix-heading">{displayName}</p>
        <p className="mt-0.5 text-xs text-fix-text-muted">
          {session ? "View your account" : "Sign in to RootSync"}
        </p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-fix-text-muted/70" aria-hidden />
    </Link>
  );
}
