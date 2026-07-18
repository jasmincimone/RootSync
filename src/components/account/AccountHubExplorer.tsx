"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { LayoutDashboard, Shield, Sprout, Store } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";

import { AccountHubCard } from "@/components/account/AccountHubCard";
import { StickySubpageBar } from "@/components/account/StickySubpageBar";
import { NavTile, type NavTileItem } from "@/components/ui/NavTile";
import {
  ACCOUNT_ADMIN_NAV,
  ACCOUNT_MEMBER_NAV,
  ACCOUNT_VITALS_NAV,
  ACCOUNT_VENDOR_NAV,
  accountNavItemToTile,
} from "@/config/accountNav";
import {
  CORE_MEMBER_HUB_IDS,
  type AccountHubId,
  isAccountHubId,
} from "@/config/accountHubs";
import { LIVE_GROWTH_NAV_ITEMS } from "@/config/growthNav";

const HUB_META: Record<
  AccountHubId,
  { title: string; description: string; icon: typeof LayoutDashboard; usePulseIcon?: boolean }
> = {
  vitals: {
    title: "Your Pulse",
    description: "Your score, posts & contribution history",
    icon: LayoutDashboard,
    usePulseIcon: true,
  },
  "member-hub": {
    title: "Member Hub",
    description: "Orders, bookings, settings & Stay Synced",
    icon: LayoutDashboard,
  },
  "vendor-hub": {
    title: "Vendor Hub",
    description: "Listings, orders, payouts & profile",
    icon: Store,
  },
  growspace: {
    title: "GrowSpace",
    description: "Overview · CRM · Funnels · Campaigns",
    icon: Sprout,
  },
  "admin-hub": {
    title: "Admin Hub",
    description: "Users, vendors, Pulse & platform tools",
    icon: Shield,
  },
};

export type AccountHubVisibility = {
  /** Approved vendors + admins */
  showVendorHub: boolean;
  /** Approved vendors + admins */
  showGrowspace: boolean;
  /** Admins only */
  showAdminHub: boolean;
};

function canOpenHub(hubId: AccountHubId, visibility: AccountHubVisibility): boolean {
  if (hubId === "vendor-hub") return visibility.showVendorHub;
  if (hubId === "growspace") return visibility.showGrowspace;
  if (hubId === "admin-hub") return visibility.showAdminHub;
  return true;
}

function AccountHubExplorerInner({ showVendorHub, showGrowspace, showAdminHub }: AccountHubVisibility) {
  const visibility = useMemo(
    () => ({ showVendorHub, showGrowspace, showAdminHub }),
    [showVendorHub, showGrowspace, showAdminHub],
  );
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const hubParam = searchParams.get("hub");

  const [activeHub, setActiveHub] = useState<AccountHubId | null>(() => {
    if (!isAccountHubId(hubParam)) return null;
    if (!canOpenHub(hubParam, { showVendorHub, showGrowspace, showAdminHub })) return null;
    return hubParam;
  });

  const visibleHubIds = useMemo((): AccountHubId[] => {
    const hubs: AccountHubId[] = [...CORE_MEMBER_HUB_IDS];
    if (showVendorHub) hubs.push("vendor-hub");
    if (showGrowspace) hubs.push("growspace");
    if (showAdminHub) hubs.push("admin-hub");
    return hubs;
  }, [showVendorHub, showGrowspace, showAdminHub]);

  useEffect(() => {
    if (isAccountHubId(hubParam)) {
      if (!canOpenHub(hubParam, visibility)) {
        setActiveHub(null);
        router.replace("/account", { scroll: false });
        return;
      }
      setActiveHub(hubParam);
      return;
    }
    if (!hubParam) {
      setActiveHub(null);
    }
  }, [hubParam, visibility, router]);

  function openHub(hubId: AccountHubId) {
    if (!canOpenHub(hubId, visibility)) return;
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
      if (e.key === "Escape") {
        setActiveHub(null);
        router.replace("/account", { scroll: false });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeHub, router]);

  const hubItems = useMemo(() => {
    if (!session?.user) return null;

    const memberItems = ACCOUNT_MEMBER_NAV.filter((item) => item.href !== "/account").map(
      accountNavItemToTile,
    );

    const items: Partial<Record<AccountHubId, NavTileItem[]>> = {
      vitals: ACCOUNT_VITALS_NAV.map(accountNavItemToTile),
      "member-hub": memberItems,
    };

    if (showVendorHub) {
      items["vendor-hub"] = ACCOUNT_VENDOR_NAV.map(accountNavItemToTile);
    }

    if (showGrowspace) {
      items.growspace = LIVE_GROWTH_NAV_ITEMS.map((item) => ({
        href: item.href,
        label: item.label,
        description: item.description,
        icon: Sprout,
      }));
    }

    if (showAdminHub) {
      items["admin-hub"] = ACCOUNT_ADMIN_NAV.filter((item) => item.href !== "/account/admin").map(
        accountNavItemToTile,
      );
    }

    return items;
  }, [session?.user, showVendorHub, showGrowspace, showAdminHub]);

  if (!session?.user || !hubItems) return null;

  if (activeHub && !canOpenHub(activeHub, visibility)) {
    return null;
  }

  const activeMeta = activeHub ? HUB_META[activeHub] : null;
  const activeItems = activeHub ? hubItems[activeHub] ?? [] : [];

  if (activeHub && activeMeta) {
    return (
      <div>
        <StickySubpageBar backLabel="Account" title={activeMeta.title} onBack={closeHub} />
        <div className="space-y-5 pt-6">
          <p className="text-sm text-fix-text-muted">{activeMeta.description}</p>
          <div className="grid grid-cols-2 gap-3">
            {activeItems.map((item) => (
              <NavTile key={item.href} item={item} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {visibleHubIds.map((hubId) => {
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

export function AccountHubExplorer(props: AccountHubVisibility) {
  return (
    <Suspense
      fallback={
        <div className="grid grid-cols-2 gap-3">
          {CORE_MEMBER_HUB_IDS.map((hubId) => (
            <div
              key={hubId}
              className="min-h-[9.5rem] animate-pulse rounded-2xl border border-fix-border/12 bg-fix-bg-muted/40"
            />
          ))}
        </div>
      }
    >
      <AccountHubExplorerInner {...props} />
    </Suspense>
  );
}
