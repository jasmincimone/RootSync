"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { ArrowLeft, LayoutDashboard, Sprout, Store } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";

import { AccountHubCard } from "@/components/account/AccountHubCard";
import { NavTile, type NavTileItem } from "@/components/ui/NavTile";
import {
  ACCOUNT_ADMIN_NAV,
  ACCOUNT_MEMBER_NAV,
  ACCOUNT_VITALS_NAV,
  ACCOUNT_VENDOR_APPLY_NAV,
  ACCOUNT_VENDOR_NAV,
  ACCOUNT_VENDOR_PENDING_NAV,
  accountNavItemToTile,
} from "@/config/accountNav";
import {
  ACCOUNT_HUB_IDS,
  type AccountHubId,
  isAccountHubId,
} from "@/config/accountHubs";
import { GROWTH_NAV_ITEMS } from "@/config/growthNav";
import { ROLES, VENDOR_STATUS } from "@/lib/roles";

const HUB_ORDER = ACCOUNT_HUB_IDS;

const HUB_META: Record<
  AccountHubId,
  { title: string; description: string; icon: typeof LayoutDashboard; usePulseIcon?: boolean }
> = {
  vitals: {
    title: "Vitals",
    description: "Pulse score, posts & your contribution",
    icon: LayoutDashboard,
    usePulseIcon: true,
  },
  "member-hub": {
    title: "Member Hub",
    description: "Orders, bookings, settings & messages",
    icon: LayoutDashboard,
  },
  "vendor-hub": {
    title: "Vendor Hub",
    description: "Listings, orders, payouts & profile",
    icon: Store,
  },
  growspace: {
    title: "GrowSpace",
    description: "CRM, campaigns, funnels & analytics",
    icon: Sprout,
  },
};

function AccountHubExplorerInner() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const hubParam = searchParams.get("hub");
  const [activeHub, setActiveHub] = useState<AccountHubId | null>(() =>
    isAccountHubId(hubParam) ? hubParam : null,
  );

  useEffect(() => {
    if (isAccountHubId(hubParam)) {
      setActiveHub(hubParam);
      return;
    }
    if (!hubParam) {
      setActiveHub(null);
    }
  }, [hubParam]);

  function openHub(hubId: AccountHubId) {
    setActiveHub(hubId);
    router.replace(`/account?hub=${hubId}`, { scroll: false });
  }

  function closeHub() {
    setActiveHub(null);
    router.replace("/account", { scroll: false });
  }

  useEffect(() => {
    if (!activeHub) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActiveHub(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeHub]);

  const hubItems = useMemo(() => {
    if (!session?.user) return null;

    const role = session.user.role ?? ROLES.CUSTOMER;
    const vendorStatus = session.user.vendorStatus;
    const isAdmin = role === ROLES.ADMIN;
    const isVendorApproved = role === ROLES.VENDOR && vendorStatus === VENDOR_STATUS.APPROVED;
    const hasPendingVendor = vendorStatus === VENDOR_STATUS.PENDING;

    const memberItems = ACCOUNT_MEMBER_NAV.filter((item) => item.href !== "/account").map(
      accountNavItemToTile,
    );
    if (isAdmin) {
      memberItems.push(...ACCOUNT_ADMIN_NAV.map(accountNavItemToTile));
    }

    const vendorItems = isVendorApproved
      ? ACCOUNT_VENDOR_NAV.map(accountNavItemToTile)
      : hasPendingVendor
        ? [accountNavItemToTile(ACCOUNT_VENDOR_PENDING_NAV)]
        : [accountNavItemToTile(ACCOUNT_VENDOR_APPLY_NAV)];

    const growspaceItems: NavTileItem[] = GROWTH_NAV_ITEMS.map((item) => ({
      href: item.href,
      label: item.label,
      description: item.description,
      icon: Sprout,
    }));

    return {
      vitals: ACCOUNT_VITALS_NAV.map(accountNavItemToTile),
      "member-hub": memberItems,
      "vendor-hub": vendorItems,
      growspace: growspaceItems,
    } satisfies Record<AccountHubId, NavTileItem[]>;
  }, [session?.user]);

  if (!session?.user || !hubItems) return null;

  const activeMeta = activeHub ? HUB_META[activeHub] : null;
  const activeItems = activeHub ? hubItems[activeHub] : [];

  if (activeHub && activeMeta) {
    return (
      <div className="space-y-5">
        <button
          type="button"
          onClick={closeHub}
          className="inline-flex items-center gap-1.5 rounded-full border border-fix-border/15 bg-fix-surface px-3 py-1.5 text-sm font-medium text-fix-text-muted shadow-soft transition-colors hover:bg-fix-bg-muted hover:text-fix-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fix-cta"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Account
        </button>

        <div>
          <h2 className="text-lg font-semibold text-fix-heading">{activeMeta.title}</h2>
          <p className="mt-1 text-sm text-fix-text-muted">{activeMeta.description}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {activeItems.map((item) => (
            <NavTile key={item.href} item={item} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {HUB_ORDER.map((hubId) => {
          const meta = HUB_META[hubId];
          return (
            <AccountHubCard
              key={hubId}
              title={meta.title}
              description={meta.description}
              icon={meta.icon}
              usePulseIcon={meta.usePulseIcon}
              onClick={() => openHub(hubId)}
            />
          );
        })}
      </div>
      <p className="text-center text-sm text-fix-text-muted">Choose a hub to see your options.</p>
    </div>
  );
}

export function AccountHubExplorer() {
  return (
    <Suspense
      fallback={
        <div className="grid grid-cols-2 gap-3">
          {HUB_ORDER.map((hubId) => (
            <div
              key={hubId}
              className="min-h-[9.5rem] animate-pulse rounded-2xl border border-fix-border/12 bg-fix-bg-muted/40"
            />
          ))}
        </div>
      }
    >
      <AccountHubExplorerInner />
    </Suspense>
  );
}
