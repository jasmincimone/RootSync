import Link from "next/link";

import { AdminHubNav } from "@/components/account/AdminHubNav";
import { PageBody } from "@/components/ui/PageBody";

export default function AdminHomePage() {
  return (
    <PageBody description="Manage vendor applications and user roles.">
      <AdminHubNav />
      <p className="text-xs text-fix-text-muted">
        Need the full account hub?{" "}
        <Link href="/account" className="font-medium text-fix-link hover:text-fix-link-hover">
          Back to account overview
        </Link>
        .
      </p>
    </PageBody>
  );
}
