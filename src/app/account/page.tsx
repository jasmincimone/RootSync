import Link from "next/link";
import { getServerSession } from "next-auth";

import { AccountFtueChecklist } from "@/components/AccountFtueChecklist";
import { Card } from "@/components/ui/Card";
import { ButtonLink } from "@/components/ui/Button";
import { authOptions } from "@/lib/authOptions";
import { ROLES, VENDOR_STATUS } from "@/lib/roles";

export default async function AccountPage() {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role ?? ROLES.CUSTOMER;
  const vs = session?.user?.vendorStatus;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-fix-heading">Dashboard</h2>
        <p className="mt-1 text-sm text-fix-text-muted">
          Your RootSync activity, community, and account tools.
        </p>
      </div>

      <AccountFtueChecklist />

      <section className="space-y-4">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-fix-text-muted">
            As a member
          </h3>
          <p className="mt-1 text-sm text-fix-text-muted">
            Shop on Discover, book services, and connect with vendors.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="p-5">
            <div className="text-sm font-semibold text-fix-heading">Activity</div>
            <p className="mt-2 text-sm text-fix-text-muted">
              Recent orders and service bookings in one hub.
            </p>
            <div className="mt-4">
              <ButtonLink href="/account/activity" variant="cta" size="sm">
                View activity
              </ButtonLink>
            </div>
          </Card>

          <Card className="p-5">
            <div className="text-sm font-semibold text-fix-heading">Orders</div>
            <p className="mt-2 text-sm text-fix-text-muted">
              Receipts for Discover purchases and resources from vendors.
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
              Service appointments — times, Meet links, and cancellations.
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
              Chat with vendors or reply to members from your inbox.
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
        </div>
      </section>

      {(vs == null || vs === VENDOR_STATUS.PENDING || vs === VENDOR_STATUS.APPROVED) && (
        <section className="space-y-4">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-fix-text-muted">
              {vs === VENDOR_STATUS.APPROVED ? "As a vendor" : "Sell on Discover"}
            </h3>
            {vs === VENDOR_STATUS.APPROVED ? (
              <p className="mt-1 text-sm text-fix-text-muted">
                Manage listings, member orders, and incoming appointments.
              </p>
            ) : vs === VENDOR_STATUS.PENDING ? (
              <p className="mt-1 text-sm text-fix-text-muted">
                Your application is under review.
              </p>
            ) : (
              <p className="mt-1 text-sm text-fix-text-muted">
                Apply to list products and services for RootSync members.
              </p>
            )}
          </div>

          {vs == null && (
            <Card className="p-5">
              <div className="text-sm font-semibold text-fix-heading">Become a vendor</div>
              <p className="mt-2 text-sm text-fix-text-muted">
                List on Discover and reach members in your region.
              </p>
              <div className="mt-4">
                <ButtonLink href="/account/vendor/apply" variant="cta" size="sm">
                  Start application
                </ButtonLink>
              </div>
            </Card>
          )}

          {vs === VENDOR_STATUS.PENDING && (
            <Card className="border-amber/40 bg-fix-bg-muted/50 p-5">
              <div className="text-sm font-semibold text-fix-heading">Application pending</div>
              <p className="mt-2 text-sm text-fix-text-muted">
                We&apos;ll notify you when an admin reviews your request.
              </p>
              <Link href="/account/vendor" className="mt-3 inline-block text-sm font-medium text-fix-link">
                View status →
              </Link>
            </Card>
          )}

          {vs === VENDOR_STATUS.APPROVED && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Card className="p-5">
                <div className="text-sm font-semibold text-fix-heading">Payment setup</div>
                <p className="mt-2 text-sm text-fix-text-muted">
                  Connect Stripe to accept checkout and bookings, or use payment links on listings.
                </p>
                <div className="mt-4">
                  <ButtonLink href="/account/vendor/payments" variant="cta" size="sm">
                    Set up payments
                  </ButtonLink>
                </div>
              </Card>
              <Card className="p-5">
                <div className="text-sm font-semibold text-fix-heading">Listings</div>
                <p className="mt-2 text-sm text-fix-text-muted">
                  Create and edit marketplace offerings.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <ButtonLink href="/account/vendor/listings" variant="secondary" size="sm">
                    My listings
                  </ButtonLink>
                  <ButtonLink href="/account/vendor/listings/new" variant="cta" size="sm">
                    New offering
                  </ButtonLink>
                </div>
              </Card>
              <Card className="p-5">
                <div className="text-sm font-semibold text-fix-heading">Appointments & orders</div>
                <p className="mt-2 text-sm text-fix-text-muted">
                  Incoming service bookings and marketplace checkout orders.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <ButtonLink href="/account/vendor/bookings" variant="secondary" size="sm">
                    Incoming appointments
                  </ButtonLink>
                  <ButtonLink href="/account/vendor/orders" variant="secondary" size="sm">
                    Orders received
                  </ButtonLink>
                </div>
              </Card>
            </div>
          )}
        </section>
      )}

      {role === ROLES.ADMIN && (
        <section className="space-y-4">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-fix-text-muted">
              Administration
            </h3>
          </div>
          <Card className="border-forest/30 p-5">
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
              {process.env.NODE_ENV === "development" ? (
                <ButtonLink href="/account/connect-demo" variant="secondary" size="sm">
                  Connect demo (dev)
                </ButtonLink>
              ) : null}
            </div>
          </Card>
        </section>
      )}
    </div>
  );
}
