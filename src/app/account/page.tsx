import Link from "next/link";
import { getServerSession } from "next-auth";

import { Card } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import { authOptions } from "@/lib/authOptions";
import { ROLES, VENDOR_STATUS } from "@/lib/roles";

export default async function AccountPage() {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role ?? ROLES.CUSTOMER;
  const vs = session?.user?.vendorStatus;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-fix-heading">Dashboard</h2>
        <p className="mt-1 text-sm text-fix-text-muted">
          Manage orders, vendor tools, and community from here.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <div className="text-sm font-semibold text-fix-heading">Orders</div>
          <p className="mt-2 text-sm text-fix-text-muted">
            View receipts, shipping, and digital downloads.
          </p>
          <div className="mt-4">
            <ButtonLink href="/account/orders" variant="secondary" size="sm">
              Order history
            </ButtonLink>
          </div>
        </Card>

        <Card className="p-5">
          <div className="text-sm font-semibold text-fix-heading">My bookings</div>
          <p className="mt-2 text-sm text-fix-text-muted">
            Services you booked with vendors — times, Meet links, and cancellations.
          </p>
          <div className="mt-4">
            <ButtonLink href="/account/bookings" variant="secondary" size="sm">
              View my bookings
            </ButtonLink>
          </div>
        </Card>

        <Card className="p-5">
          <div className="text-sm font-semibold text-fix-heading">Messages</div>
          <p className="mt-2 text-sm text-fix-text-muted">
            Chat with marketplace vendors or reply to customers from your inbox.
          </p>
          <div className="mt-4">
            <ButtonLink href="/messages/inbox" variant="secondary" size="sm">
              Open messages
            </ButtonLink>
          </div>
        </Card>

        <Card className="p-5">
          <div className="text-sm font-semibold text-fix-heading">Community</div>
          <p className="mt-2 text-sm text-fix-text-muted">
            View the feed, post updates, and manage your own posts.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <ButtonLink href="/community" variant="secondary" size="sm">
              Community feed
            </ButtonLink>
            <ButtonLink href="/account/community" variant="secondary" size="sm">
              My posts
            </ButtonLink>
          </div>
        </Card>

        <Card className="p-5">
          <div className="text-sm font-semibold text-fix-heading">Stripe Connect demo</div>
          <p className="mt-2 text-sm text-fix-text-muted">
            Sample connected account onboarding, product creation, storefront checkout, and subscriptions.
          </p>
          <div className="mt-4">
            <ButtonLink href="/account/connect-demo" variant="secondary" size="sm">
              Open Connect demo
            </ButtonLink>
          </div>
        </Card>

        {vs == null && (
          <Card className="p-5 sm:col-span-2">
            <div className="text-sm font-semibold text-fix-heading">Sell on the marketplace</div>
            <p className="mt-2 text-sm text-fix-text-muted">
              Apply to become a vendor to list products and reach customers.
            </p>
            <div className="mt-4">
              <ButtonLink href="/account/vendor/apply" variant="cta" size="sm">
                Become a vendor
              </ButtonLink>
            </div>
          </Card>
        )}

        {vs === VENDOR_STATUS.APPROVED && (
          <Card className="p-5 sm:col-span-2">
            <div className="text-sm font-semibold text-fix-heading">Vendor services</div>
            <p className="mt-2 text-sm text-fix-text-muted">
              Manage listings, orders from customers, and incoming service appointments.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <ButtonLink href="/account/vendor" variant="secondary" size="sm">
                Vendor dashboard
              </ButtonLink>
              <ButtonLink href="/account/vendor/bookings" variant="secondary" size="sm">
                Incoming appointments
              </ButtonLink>
            </div>
          </Card>
        )}

        {vs === VENDOR_STATUS.PENDING && (
          <Card className="border-amber/40 bg-fix-bg-muted/50 p-5 sm:col-span-2">
            <div className="text-sm font-semibold text-fix-heading">Vendor application pending</div>
            <p className="mt-2 text-sm text-fix-text-muted">
              We&apos;ll notify you when an admin reviews your request.
            </p>
            <Link href="/account/vendor" className="mt-3 inline-block text-sm font-medium text-fix-link">
              View status →
            </Link>
          </Card>
        )}

        {role === ROLES.ADMIN && (
          <Card className="border-forest/30 p-5 sm:col-span-2">
            <div className="text-sm font-semibold text-fix-heading">Administration</div>
            <p className="mt-2 text-sm text-fix-text-muted">
              Approve vendors and manage user roles.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <ButtonLink href="/account/admin/vendors" variant="cta" size="sm">
                Vendor requests
              </ButtonLink>
              <ButtonLink href="/account/admin/users" variant="secondary" size="sm">
                Users & roles
              </ButtonLink>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
