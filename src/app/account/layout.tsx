import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import Link from "next/link";

import { Container } from "@/components/Container";
import { AccountNav } from "@/components/AccountNav";
import { authOptions } from "@/lib/authOptions";
import { ROLES } from "@/lib/roles";

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let session = null;
  try {
    session = await getServerSession(authOptions);
  } catch (e) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[next-auth] getServerSession failed in /account (check NEXTAUTH_SECRET / clear cookies):", e);
    }
    session = null;
  }
  if (!session) {
    redirect("/login?callbackUrl=/account");
  }

  const roleLabel =
    session.user.role === ROLES.ADMIN
      ? "Admin"
      : session.user.role === ROLES.VENDOR
        ? "Vendor"
        : "Member";

  return (
    <Container className="py-8 sm:py-12">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-fix-border/15 pb-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-fix-heading">Account</h1>
          <p className="mt-1 text-sm text-fix-text-muted">{session.user?.email}</p>
          <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-fix-text-muted">
            {roleLabel}
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/community"
            className="text-sm font-medium text-fix-link hover:text-fix-link-hover"
          >
            Community
          </Link>
          <Link
            href="/api/auth/signout"
            className="text-sm font-medium text-fix-text-muted hover:text-fix-heading"
          >
            Sign out
          </Link>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,220px)_1fr]">
        <aside className="relative z-10 lg:sticky lg:top-28 lg:self-start">
          <AccountNav />
        </aside>
        <div className="relative min-w-0">{children}</div>
      </div>
    </Container>
  );
}
