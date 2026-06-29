import Link from "next/link";
import { getServerSession } from "next-auth";

import { Card } from "@/components/ui/Card";
import { authOptions } from "@/lib/authOptions";
import { prisma } from "@/lib/prisma";

export async function AccountFtueChecklist() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const userId = session.user.id;
  const email = session.user.email;

  const [orderCount, bookingCount, communityPostCount] = await Promise.all([
    email
      ? prisma.order.count({
          where: { OR: [{ userId }, { email }] },
        })
      : prisma.order.count({ where: { userId } }),
    prisma.booking.count({ where: { memberUserId: userId } }),
    prisma.communityPost.count({ where: { authorId: userId } }),
  ]);

  const hasProfile = Boolean(session.user.name?.trim());
  const hasTransacted = orderCount > 0 || bookingCount > 0;
  const hasCommunity = communityPostCount > 0;

  const steps = [
    {
      id: "profile",
      label: "Complete your profile",
      done: hasProfile,
      href: "/account/settings",
      cta: "Account settings",
    },
    {
      id: "transact",
      label: "Book a service or buy from Discover",
      done: hasTransacted,
      href: "/discover",
      cta: "Browse offerings",
    },
    {
      id: "community",
      label: "Introduce yourself in the community",
      done: hasCommunity,
      href: "/community",
      cta: "Community feed",
    },
  ];

  const completed = steps.filter((s) => s.done).length;
  if (completed >= steps.length) return null;

  return (
    <Card className="border-forest/25 bg-fix-bg-muted/30 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-fix-heading">Getting started</h3>
        <span className="text-xs text-fix-text-muted">
          {completed} of {steps.length} complete
        </span>
      </div>
      <ul className="mt-4 space-y-3">
        {steps.map((step) => (
          <li key={step.id} className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm">
              <span
                className={
                  step.done
                    ? "inline-flex h-5 w-5 items-center justify-center rounded-full bg-forest text-xs text-fix-primary-foreground"
                    : "inline-flex h-5 w-5 items-center justify-center rounded-full border border-fix-border/25 text-xs text-fix-text-muted"
                }
                aria-hidden
              >
                {step.done ? "✓" : ""}
              </span>
              <span className={step.done ? "text-fix-text-muted line-through" : "text-fix-heading"}>
                {step.label}
              </span>
            </div>
            {!step.done ? (
              <Link href={step.href} className="text-xs font-medium text-fix-link hover:text-fix-link-hover">
                {step.cta} →
              </Link>
            ) : null}
          </li>
        ))}
      </ul>
    </Card>
  );
}
