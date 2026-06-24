"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

import { ROLES, VENDOR_STATUS } from "@/lib/roles";
import { cn } from "@/lib/cn";

const linkClass =
  "block rounded-lg px-3 py-2 text-sm font-medium text-fix-text hover:bg-fix-bg-muted hover:text-fix-heading";
const activeClass = "bg-fix-bg-muted text-fix-heading";

/** Pick the most specific nav href so /account/vendor does not stay active on /account/vendor/listings. */
function longestMatchingHref(pathname: string, hrefs: string[]): string | null {
  let best: string | null = null;
  for (const href of hrefs) {
    const match = pathname === href || pathname.startsWith(`${href}/`);
    if (match && href.length > (best?.length ?? -1)) {
      best = href;
    }
  }
  return best;
}

export function AccountNav() {
  const pathname = usePathname() || "/account";
  const { data: session } = useSession();
  if (!session?.user) return null;

  const role = session.user.role ?? ROLES.CUSTOMER;
  const vendorStatus = session.user.vendorStatus;
  const isAdmin = role === ROLES.ADMIN;
  const isVendorApproved = role === ROLES.VENDOR && vendorStatus === VENDOR_STATUS.APPROVED;
  const hasVendorProfile = role === ROLES.VENDOR || vendorStatus != null;

  const items: Array<{ href: string; label: string; show: boolean }> = [
    { href: "/account", label: "Overview", show: true },
    { href: "/account/settings", label: "Account Settings", show: true },
    { href: "/account/orders", label: "Order history", show: true },
    { href: "/account/community", label: "Community", show: true },
    { href: "/messages/inbox", label: "Messages", show: true },
    {
      href: "/account/vendor/apply",
      label: "Become a vendor",
      show: vendorStatus == null,
    },
    { href: "/account/vendor", label: "Vendor dashboard", show: hasVendorProfile || isVendorApproved },
    { href: "/account/vendor/profile", label: "Vendor profile", show: hasVendorProfile || isVendorApproved },
    { href: "/account/vendor/listings", label: "My listings", show: isVendorApproved },
    { href: "/account/vendor/orders", label: "Vendor orders", show: isVendorApproved },
    { href: "/account/admin", label: "Admin", show: isAdmin },
    { href: "/account/admin/vendors", label: "Vendor requests", show: isAdmin },
    { href: "/account/admin/users", label: "Users & roles", show: isAdmin },
  ];

  const visible = items.filter((i) => i.show);
  const hrefList = visible.map((i) => i.href);
  const activeHref = longestMatchingHref(pathname, hrefList);

  return (
    <nav className="flex flex-col gap-0.5" aria-label="Account">
      {visible.map(({ href, label }) => {
        const active = activeHref === href;
        return (
          <Link key={href} href={href} className={cn(linkClass, active && activeClass)}>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
