"use client";

import { useSession } from "next-auth/react";

import { NavTileGrid } from "@/components/ui/NavTileGrid";
import {
  ACCOUNT_ADMIN_NAV,
  ACCOUNT_GROWTH_NAV,
  ACCOUNT_MEMBER_NAV,
  ACCOUNT_VITALS_NAV,
  ACCOUNT_VENDOR_NAV,
  accountNavItemToTile,
} from "@/config/accountNav";
import { canAccessGrowthWorkspace } from "@/lib/growthAccess";
import { ROLES, VENDOR_STATUS } from "@/lib/roles";

export function AccountNavGrid() {
  const { data: session } = useSession();
  if (!session?.user) return null;

  const role = session.user.role ?? ROLES.CUSTOMER;
  const vendorStatus = session.user.vendorStatus;
  const isAdmin = role === ROLES.ADMIN;
  const isVendorApproved = role === ROLES.VENDOR && vendorStatus === VENDOR_STATUS.APPROVED;
  const showVendorHub = isAdmin || isVendorApproved;
  const showGrowspace = canAccessGrowthWorkspace(role, vendorStatus ?? undefined);

  const sections = [
    { id: "vitals", title: "Vitals", items: ACCOUNT_VITALS_NAV.map(accountNavItemToTile) },
    { id: "member-hub", title: "Member Hub", items: ACCOUNT_MEMBER_NAV.map(accountNavItemToTile) },
    ...(showVendorHub
      ? [{ id: "vendor-hub", title: "Vendor Hub", items: ACCOUNT_VENDOR_NAV.map(accountNavItemToTile) }]
      : []),
    ...(showGrowspace
      ? [{ id: "growspace", title: "GrowSpace", items: ACCOUNT_GROWTH_NAV.map(accountNavItemToTile) }]
      : []),
    ...(isAdmin
      ? [{ id: "admin-hub", title: "Admin Hub", items: ACCOUNT_ADMIN_NAV.map(accountNavItemToTile) }]
      : []),
  ];

  return <NavTileGrid sections={sections} />;
}
