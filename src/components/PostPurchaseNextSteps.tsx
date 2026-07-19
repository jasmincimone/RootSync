import Link from "next/link";

import { ButtonLink } from "@/components/ui/Button";

type Props = {
  /** Prefer order detail when available */
  orderHref?: string | null;
  showPulsePrompt?: boolean;
};

/** Shared post-purchase / post-booking next steps (max 3). */
export function PostPurchaseNextSteps({ orderHref, showPulsePrompt = true }: Props) {
  return (
    <section
      className="mt-6 rounded-2xl border border-forest/20 bg-forest/5 p-4 sm:p-5"
      aria-labelledby="post-purchase-next-heading"
    >
      <h2 id="post-purchase-next-heading" className="text-sm font-semibold text-fix-heading">
        What&apos;s next
      </h2>
      <p className="mt-1 text-sm text-fix-text-muted">
        Access what you bought, stay in touch with the vendor, or share a Pulse when you&apos;re
        ready.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <ButtonLink href={orderHref || "/account/orders"} variant="primary" size="sm">
          {orderHref ? "View this order" : "Order history"}
        </ButtonLink>
        <ButtonLink href="/messages/inbox" variant="secondary" size="sm">
          Stay Synced
        </ButtonLink>
        {showPulsePrompt ? (
          <Link
            href="/pulse"
            className="inline-flex h-9 items-center justify-center rounded-full px-3 text-sm font-medium text-fix-link hover:text-fix-link-hover hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-fix-cta focus-visible:ring-offset-2"
          >
            Open Pulse
          </Link>
        ) : null}
      </div>
    </section>
  );
}
