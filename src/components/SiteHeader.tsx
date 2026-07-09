"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu } from "lucide-react";
import { useSession } from "next-auth/react";

import { UserAvatar } from "@/components/UserAvatar";
import { BrandPngIcon } from "@/components/ui/BrandPngIcon";
import { PulseIcon } from "@/components/pulse/PulseIcon";
import { PLATFORM_PRIMARY_NAV_LINKS } from "@/config/platformNav";
import { platformNavIconByHref } from "@/config/platformExploreNav";
import { cn } from "@/lib/cn";
import { leaveMenu, rememberPathBeforeMenu } from "@/lib/menuReturn";

import { Container } from "./Container";

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href === "/pulse") {
    return pathname === "/pulse" || pathname.startsWith("/pulse/") || pathname.startsWith("/community");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader() {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();

  const accountHref =
    sessionStatus === "loading" || session ? "/account" : "/login?callbackUrl=/account";
  const accountAria =
    sessionStatus === "loading"
      ? "Account"
      : session?.user?.email
        ? `Account (${session.user.email})`
        : "Sign in to account";

  return (
    <header className="border-b border-fix-border/15 bg-fix-surface">
      <Container className="flex h-16 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {pathname === "/menu" ? (
            <button
              type="button"
              onClick={() => leaveMenu(router)}
              className="relative z-10 -ml-1 inline-flex h-11 min-w-[44px] shrink-0 items-center justify-center gap-1.5 rounded-full px-2 text-fix-text hover:bg-fix-bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-fix-cta focus-visible:ring-offset-2 active:opacity-90 lg:hidden"
              aria-label="Close menu"
            >
              <Menu className="h-6 w-6 shrink-0" aria-hidden />
              <span className="text-sm font-medium">Menu</span>
            </button>
          ) : (
            <Link
              href="/menu"
              onClick={() => rememberPathBeforeMenu(pathname)}
              className="relative z-10 -ml-1 inline-flex h-11 min-w-[44px] shrink-0 items-center justify-center gap-1.5 rounded-full px-2 text-fix-text hover:bg-fix-bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-fix-cta focus-visible:ring-offset-2 active:opacity-90 lg:hidden"
              aria-label="Menu"
            >
              <Menu className="h-6 w-6 shrink-0" aria-hidden />
              <span className="text-sm font-medium">Menu</span>
            </Link>
          )}

          <Link
            href="/"
            className="inline-flex shrink-0 items-center gap-2 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-fix-cta focus-visible:ring-offset-2"
          >
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-fix-bg-muted text-bark ring-1 ring-inset ring-fix-border/20">
              TF
            </span>
            <div className="hidden leading-tight sm:block">
              <div className="text-sm font-semibold text-fix-heading">RootSync</div>
              <div className="text-xs text-fix-text-muted">Stay Synced!</div>
            </div>
          </Link>
        </div>

        <nav className="hidden min-w-0 flex-1 items-center justify-center gap-0.5 lg:flex" aria-label="Main">
          {PLATFORM_PRIMARY_NAV_LINKS.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex max-w-[9.5rem] items-center gap-1.5 truncate rounded-full px-2.5 py-2 text-sm font-medium text-fix-heading transition-colors hover:bg-fix-bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-fix-cta focus-visible:ring-offset-2 xl:max-w-none xl:px-3",
                  active && "bg-fix-bg-muted text-forest",
                )}
              >
                {item.usePulseIcon ? (
                  <PulseIcon size={16} alt="" className="shrink-0" />
                ) : platformNavIconByHref[item.href] ? (
                  <BrandPngIcon
                    src={platformNavIconByHref[item.href]}
                    size={16}
                    className="shrink-0"
                    alt=""
                  />
                ) : null}
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <Link
            href={accountHref}
            aria-label={accountAria}
            className={cn(
              "inline-flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full hover:bg-fix-bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-fix-cta focus-visible:ring-offset-2",
              pathname.startsWith("/account") && "ring-2 ring-fix-cta/30 ring-offset-2",
            )}
          >
            <UserAvatar
              src={session?.user?.image}
              name={session?.user?.name ?? session?.user?.email}
              size="md"
            />
          </Link>
        </div>
      </Container>
    </header>
  );
}
