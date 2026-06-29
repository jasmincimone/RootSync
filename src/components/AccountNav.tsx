"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

import { ROLES, VENDOR_STATUS } from "@/lib/roles";
import { cn } from "@/lib/cn";

const linkClass =
  "block rounded-lg px-3 py-2 text-sm font-medium text-fix-text hover:bg-fix-bg-muted hover:text-fix-heading focus:outline-none focus-visible:ring-2 focus-visible:ring-fix-cta focus-visible:ring-offset-2";
const activeClass = "bg-fix-bg-muted text-fix-heading";
const sectionClass =
  "mt-5 px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-fix-text-muted first:mt-0";

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

type NavItem = { href: string; label: string };

function NavSection({
  title,
  items,
  activeHref,
}: {
  title?: string;
  items: NavItem[];
  activeHref: string | null;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      {title ? <p className={sectionClass}>{title}</p> : null}
      <div className="mt-0.5 flex flex-col gap-0.5">
        {items.map(({ href, label }) => {
          const active = activeHref === href;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(linkClass, active && activeClass)}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function AccountNav() {
  const pathname = usePathname() || "/account";
  const { data: session } = useSession();
  if (!session?.user) return null;

  const role = session.user.role ?? ROLES.CUSTOMER;
  const vendorStatus = session.user.vendorStatus;
  const isAdmin = role === ROLES.ADMIN;
  const isVendorApproved = role === ROLES.VENDOR && vendorStatus === VENDOR_STATUS.APPROVED;
  const hasPendingVendor = vendorStatus === VENDOR_STATUS.PENDING;

  const memberItems: NavItem[] = [
    { href: "/account", label: "Overview" },
    { href: "/account/activity", label: "Activity" },
    { href: "/account/settings", label: "Account settings" },
    { href: "/account/orders", label: "Order history" },
    { href: "/account/bookings", label: "My bookings" },
    { href: "/account/community", label: "Community" },
    { href: "/messages/inbox", label: "Messages" },
  ];

  if (vendorStatus == null) {
    memberItems.push({ href: "/account/vendor/apply", label: "Become a vendor" });
  }
  if (hasPendingVendor) {
    memberItems.push({ href: "/account/vendor", label: "Vendor application" });
  }

  const vendorItems: NavItem[] = isVendorApproved
    ? [
        { href: "/account/vendor", label: "Vendor dashboard" },
        { href: "/account/vendor/payments", label: "Payment setup" },
        { href: "/account/vendor/profile", label: "Vendor profile" },
        { href: "/account/vendor/listings", label: "My listings" },
        { href: "/account/vendor/orders", label: "Orders received" },
        { href: "/account/vendor/bookings", label: "Incoming appointments" },
      ]
    : [];

  const adminItems: NavItem[] = isAdmin
    ? [
        { href: "/account/admin", label: "Admin overview" },
        { href: "/account/admin/vendors", label: "Vendor requests" },
        { href: "/account/admin/users", label: "Users & roles" },
      ]
    : [];

  const allHrefs = [...memberItems, ...vendorItems, ...adminItems].map((i) => i.href);
  const activeHref = longestMatchingHref(pathname, allHrefs);

  return (
    <nav className="flex flex-col" aria-label="Account">
      <NavSection title="Member" items={memberItems} activeHref={activeHref} />
      <NavSection title="Vendor services" items={vendorItems} activeHref={activeHref} />
      <NavSection title="Admin" items={adminItems} activeHref={activeHref} />
    </nav>
  );
}
