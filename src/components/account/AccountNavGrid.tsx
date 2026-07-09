"use client";

import { useSession } from "next-auth/react";

import { NavTileGrid } from "@/components/ui/NavTileGrid";
import {
  ACCOUNT_ADMIN_NAV,
  ACCOUNT_GROWTH_NAV,
  ACCOUNT_MEMBER_NAV,
  ACCOUNT_VITALS_NAV,
  ACCOUNT_VENDOR_APPLY_NAV,
  ACCOUNT_VENDOR_NAV,
  ACCOUNT_VENDOR_PENDING_NAV,
  accountNavItemToTile,
} from "@/config/accountNav";
import { ROLES, VENDOR_STATUS } from "@/lib/roles";

export function AccountNavGrid() {
  const { data: session } = useSession();
  if (!session?.user) return null;

  const role = session.user.role ?? ROLES.CUSTOMER;
  const vendorStatus = session.user.vendorStatus;
  const isAdmin = role === ROLES.ADMIN;
  const isVendorApproved = role === ROLES.VENDOR && vendorStatus === VENDOR_STATUS.APPROVED;
  const hasPendingVendor = vendorStatus === VENDOR_STATUS.PENDING;

  const memberItems = [...ACCOUNT_MEMBER_NAV];
  if (vendorStatus == null) memberItems.push(ACCOUNT_VENDOR_APPLY_NAV);
  if (hasPendingVendor) memberItems.push(ACCOUNT_VENDOR_PENDING_NAV);

  const sections = [
    { id: "member-hub", title: "Member Hub", items: memberItems.map(accountNavItemToTile) },
    { id: "vitals", title: "Vitals", items: ACCOUNT_VITALS_NAV.map(accountNavItemToTile) },
    ...(isVendorApproved
      ? [{ id: "vendor-hub", title: "Vendor Hub", items: ACCOUNT_VENDOR_NAV.map(accountNavItemToTile) }]
      : []),
    ...(isAdmin || isVendorApproved
      ? [{ id: "growspace", title: "GrowSpace", items: ACCOUNT_GROWTH_NAV.map(accountNavItemToTile) }]
      : []),
    ...(isAdmin ? [{ id: "admin", title: "Admin", items: ACCOUNT_ADMIN_NAV.map(accountNavItemToTile) }] : []),
  ];

  return <NavTileGrid sections={sections} />;
}
