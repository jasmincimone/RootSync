import Link from "next/link";

import { AdminHubNav } from "@/components/account/AdminHubNav";
import { PageBody } from "@/components/ui/PageBody";

export default function AdminHomePage() {
  return (
    <PageBody description="Platform administration — users, vendor requests, and Pulse configuration.">
      <AdminHubNav />
      <p className="text-xs text-fix-text-muted">
        <Link
          href="/account?hub=admin-hub"
          className="font-medium text-fix-link hover:text-fix-link-hover"
        >
          Back to Admin Hub
        </Link>
        {" · "}
        <Link href="/account" className="font-medium text-fix-link hover:text-fix-link-hover">
          Account overview
        </Link>
      </p>
    </PageBody>
  );
}
