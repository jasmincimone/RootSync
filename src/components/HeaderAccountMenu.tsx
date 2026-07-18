"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useId, useRef, useState } from "react";

import { UserAvatar } from "@/components/UserAvatar";
import { cn } from "@/lib/cn";

export function HeaderAccountMenu() {
  const pathname = usePathname() || "/";
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const loading = status === "loading";
  const user = session?.user;

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target as Node | null;
      if (target && rootRef.current && !rootRef.current.contains(target)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  if (loading || !user) {
    return (
      <Link
        href="/login?callbackUrl=/account"
        aria-label="Sign in to account"
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full hover:bg-fix-bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-fix-cta focus-visible:ring-offset-2"
      >
        <UserAvatar name={undefined} size="md" />
      </Link>
    );
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={user.email ? `Account menu (${user.email})` : "Account menu"}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "inline-flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full hover:bg-fix-bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-fix-cta focus-visible:ring-offset-2",
          (pathname.startsWith("/account") ||
            pathname.startsWith("/members/") ||
            pathname.startsWith("/discover/vendors/") ||
            pathname === "/profile") &&
            "ring-2 ring-fix-cta/30 ring-offset-2",
        )}
      >
        <UserAvatar src={user.image} name={user.name ?? user.email} size="md" />
      </button>

      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label="Account"
          className="absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-2xl border border-fix-border/20 bg-fix-surface py-1 shadow-soft"
        >
          <Link
            role="menuitem"
            href="/account"
            className="block px-4 py-2.5 text-sm font-medium text-fix-heading hover:bg-fix-bg-muted focus:bg-fix-bg-muted focus:outline-none"
            onClick={() => setOpen(false)}
          >
            View account
          </Link>
          <Link
            role="menuitem"
            href="/profile"
            className="block px-4 py-2.5 text-sm font-medium text-fix-heading hover:bg-fix-bg-muted focus:bg-fix-bg-muted focus:outline-none"
            onClick={() => setOpen(false)}
          >
            View profile
          </Link>
          <div className="my-1 border-t border-fix-border/15" role="separator" />
          <button
            type="button"
            role="menuitem"
            className="block w-full px-4 py-2.5 text-left text-sm font-medium text-fix-text-muted hover:bg-fix-bg-muted hover:text-fix-heading focus:bg-fix-bg-muted focus:outline-none"
            onClick={() => {
              setOpen(false);
              void signOut({ callbackUrl: "/" });
            }}
          >
            Log out
          </button>
        </div>
      ) : null}
    </div>
  );
}
