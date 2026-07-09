import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import Link from "next/link";

import { AccountSubpageChrome } from "@/components/account/AccountSubpageChrome";
import { Container } from "@/components/Container";
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

  return (
    <Container className="py-6 sm:py-10">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-fix-heading sm:text-3xl">Account</h1>
          <p className="mt-1 text-sm text-fix-text-muted">{session.user?.email}</p>
        </div>
        <div className="flex items-center gap-4 text-sm font-medium">
          <Link href="/pulse" className="text-forest hover:text-forest/80">
            Pulse
          </Link>
          <Link href="/api/auth/signout" className="text-fix-text-muted hover:text-fix-heading">
            Sign out
          </Link>
        </div>
      </div>

      <AccountSubpageChrome>{children}</AccountSubpageChrome>
    </Container>
  );
}
