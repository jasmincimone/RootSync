"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";

import { UserAvatar } from "@/components/UserAvatar";

type Props = {
  /** e.g. close mobile menu overlay when navigating */
  onNavigate?: () => void;
};

export function MenuAccountLink({ onNavigate }: Props) {
  const { data: session, status } = useSession();

  const href =
    status === "loading" || session
      ? "/account"
      : "/login?callbackUrl=/account";

  const label =
    status === "loading" ? "Account" : session ? "My account" : "Sign in";

  const displayName = session?.user?.name ?? session?.user?.email ?? label;

  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="flex items-center gap-3 rounded-xl border border-fix-border/15 bg-fix-surface px-3 py-2.5 hover:bg-fix-bg-muted"
    >
      <UserAvatar
        src={session?.user?.image}
        name={displayName}
        size="sm"
      />
      <span className="text-sm font-semibold text-fix-heading">{label}</span>
    </Link>
  );
}
