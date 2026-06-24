import Link from "next/link";

import { Card } from "@/components/ui/Card";

export default function AdminHomePage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-fix-heading">Administration</h2>
        <p className="mt-1 text-sm text-fix-text-muted">
          Manage vendor applications and user roles.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <div className="text-sm font-semibold text-fix-heading">Vendor requests</div>
          <p className="mt-2 text-sm text-fix-text-muted">Review and approve vendor applications.</p>
          <Link
            href="/account/admin/vendors"
            className="mt-3 inline-block text-sm font-medium text-fix-link hover:text-fix-link-hover"
          >
            Open →
          </Link>
        </Card>
        <Card className="p-5">
          <div className="text-sm font-semibold text-fix-heading">Users & roles</div>
          <p className="mt-2 text-sm text-fix-text-muted">Assign admin, vendor, or customer roles.</p>
          <Link
            href="/account/admin/users"
            className="mt-3 inline-block text-sm font-medium text-fix-link hover:text-fix-link-hover"
          >
            Open →
          </Link>
        </Card>
      </div>
    </div>
  );
}
