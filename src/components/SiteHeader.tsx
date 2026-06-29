"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu } from "lucide-react";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { UserAvatar } from "@/components/UserAvatar";

import {
  isPlatformHeaderRootsyncSectionActive,
  PLATFORM_HEADER_ROOTSYNC_MENU_LINKS,
} from "@/config/platformNav";
import { cn } from "@/lib/cn";
import { leaveMenu, rememberPathBeforeMenu } from "@/lib/menuReturn";

import { Container } from "./Container";

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavMenuLink({
  href,
  label,
  comingSoon,
  pathname,
  onNavigate,
  tabIndex,
  onKeyDown,
  innerRef,
}: {
  href: string;
  label: string;
  comingSoon?: boolean;
  pathname: string;
  onNavigate?: () => void;
  tabIndex?: number;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  innerRef?: React.Ref<HTMLAnchorElement>;
}) {
  const active = isActive(pathname, href);
  return (
    <Link
      ref={innerRef}
      href={href}
      role="menuitem"
      tabIndex={tabIndex}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
      onKeyDown={onKeyDown}
      className={cn(
        "flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm text-fix-link hover:bg-fix-bg-muted hover:text-fix-link-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-fix-cta focus-visible:ring-offset-2",
        active && "bg-fix-bg-muted font-medium text-fix-heading",
      )}
    >
      <span>{label}</span>
      {comingSoon ? (
        <span className="rounded-full bg-amber/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-espresso">
          Soon
        </span>
      ) : null}
    </Link>
  );
}

export function SiteHeader() {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const [rootsyncOpen, setRootsyncOpen] = useState(false);
  const [menuFocusIndex, setMenuFocusIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const menuItemRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  const menuLinks = [
    { href: "/rootsync", label: "View RootSync platform", isHub: true },
    ...PLATFORM_HEADER_ROOTSYNC_MENU_LINKS.map((item) => ({ ...item, isHub: false })),
  ];

  const accountHref =
    sessionStatus === "loading" || session
      ? "/account"
      : "/login?callbackUrl=/account";
  const accountAria =
    sessionStatus === "loading"
      ? "Account"
      : session?.user?.email
        ? `Account (${session.user.email})`
        : "Sign in to account";

  const closeMenu = useCallback(() => {
    setRootsyncOpen(false);
    setMenuFocusIndex(-1);
  }, []);

  useEffect(() => {
    if (!rootsyncOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        closeMenu();
        document.getElementById("rootsync-menu-button")?.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [rootsyncOpen, closeMenu]);

  useEffect(() => {
    closeMenu();
  }, [pathname, closeMenu]);

  useEffect(() => {
    if (rootsyncOpen && menuFocusIndex >= 0) {
      menuItemRefs.current[menuFocusIndex]?.focus();
    }
  }, [rootsyncOpen, menuFocusIndex]);

  function handleMenuKeyDown(e: React.KeyboardEvent) {
    const count = menuLinks.length;
    if (count === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setMenuFocusIndex((i) => (i + 1) % count);
        break;
      case "ArrowUp":
        e.preventDefault();
        setMenuFocusIndex((i) => (i <= 0 ? count - 1 : i - 1));
        break;
      case "Home":
        e.preventDefault();
        setMenuFocusIndex(0);
        break;
      case "End":
        e.preventDefault();
        setMenuFocusIndex(count - 1);
        break;
      case "Tab":
        closeMenu();
        break;
      default:
        break;
    }
  }

  function openMenu() {
    setRootsyncOpen(true);
    setMenuFocusIndex(0);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-fix-border/15 bg-fix-surface">
      <Container className="flex h-16 items-center justify-between gap-3">
        <div className="flex items-center gap-3">
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
            className="inline-flex items-center gap-2 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-fix-cta focus-visible:ring-offset-2"
          >
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-fix-bg-muted text-bark ring-1 ring-inset ring-fix-border/20">
              TF
            </span>
            <div className="leading-tight">
              <div className="text-sm font-semibold text-fix-heading">RootSync</div>
              <div className="text-xs text-fix-text-muted">Stay Synced!</div>
            </div>
          </Link>
        </div>

        <nav className="relative hidden flex-wrap items-center gap-1 lg:flex" aria-label="Main">
          <div className="relative" ref={dropdownRef} onMouseLeave={() => closeMenu()}>
            <button
              type="button"
              id="rootsync-menu-button"
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-3 py-2 text-sm font-medium text-fix-heading hover:bg-fix-bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-fix-cta focus-visible:ring-offset-2",
                isPlatformHeaderRootsyncSectionActive(pathname) && "bg-fix-bg-muted",
              )}
              aria-haspopup="menu"
              aria-expanded={rootsyncOpen}
              aria-controls="rootsync-menu"
              onClick={() => (rootsyncOpen ? closeMenu() : openMenu())}
              onMouseEnter={() => openMenu()}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  openMenu();
                }
              }}
            >
              RootSync Platform
              <span
                className={cn(
                  "text-[10px] transition-transform motion-reduce:transition-none",
                  rootsyncOpen && "rotate-180",
                )}
              >
                ▾
              </span>
            </button>
            {rootsyncOpen ? (
              <div
                id="rootsync-menu"
                className="absolute left-0 top-full z-40 w-72 pt-2"
                role="menu"
                aria-labelledby="rootsync-menu-button"
                onMouseEnter={() => setRootsyncOpen(true)}
                onKeyDown={handleMenuKeyDown}
              >
                <div className="rounded-2xl border border-fix-border/15 bg-fix-surface p-2 shadow-soft">
                  <div className="grid gap-1">
                    {menuLinks.map((item, index) =>
                      item.isHub ? (
                        <Link
                          key={item.href}
                          ref={(el) => {
                            menuItemRefs.current[index] = el;
                          }}
                          href={item.href}
                          role="menuitem"
                          tabIndex={menuFocusIndex === index ? 0 : -1}
                          aria-current={pathname === "/rootsync" ? "page" : undefined}
                          onClick={closeMenu}
                          onKeyDown={handleMenuKeyDown}
                          className="block rounded-xl px-3 py-2 text-xs font-semibold uppercase tracking-wide text-fix-text-muted hover:bg-fix-bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-fix-cta focus-visible:ring-offset-2"
                        >
                          {item.label}
                        </Link>
                      ) : (
                        <NavMenuLink
                          key={item.href}
                          href={item.href}
                          label={item.label}
                          comingSoon={item.comingSoon}
                          pathname={pathname}
                          onNavigate={closeMenu}
                          tabIndex={menuFocusIndex === index ? 0 : -1}
                          onKeyDown={handleMenuKeyDown}
                          innerRef={(el) => {
                            menuItemRefs.current[index] = el;
                          }}
                        />
                      ),
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </nav>

        <div className="flex items-center gap-2">
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
