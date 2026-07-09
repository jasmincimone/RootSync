import { PulseRatingBadge, PulseRatingDisplay } from "@/components/pulse/PulseRatingDisplay";
import { Card } from "@/components/ui/Card";
import { formatPulseRelativeTime } from "@/lib/pulse/eventLabels";
import type { VendorPulseReviewRow, VendorPulseSummary } from "@/lib/pulse/vendorReviews";
import { cn } from "@/lib/cn";

type Props = {
  summary: VendorPulseSummary;
  reviews: VendorPulseReviewRow[];
  headingId?: string;
  className?: string;
};

export function VendorPulseReviewsSection({
  summary,
  reviews,
  headingId = "vendor-pulse-reviews-heading",
  className,
}: Props) {
  return (
    <section className={cn("space-y-4", className)} aria-labelledby={headingId}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id={headingId} className="text-lg font-semibold text-fix-heading">
            Pulse reviews
          </h2>
          <p className="mt-0.5 text-sm text-fix-text-muted">
            Members give Pulse instead of stars — trust built through contribution.
          </p>
        </div>
        <PulseRatingBadge
          averageRating={summary.averageRating}
          reviewCount={summary.reviewCount}
          size={18}
        />
      </div>

      {reviews.length === 0 ? (
        <Card className="p-5">
          <p className="text-sm text-fix-text-muted">
            No Pulse reviews yet. Be the first to share your experience after a purchase or consultation.
          </p>
        </Card>
      ) : (
        <ul className="space-y-3">
          {reviews.map((review) => (
            <li key={review.id}>
              <Card className="p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <PulseRatingDisplay rating={review.pulseRating} size={18} />
                    {review.title ? (
                      <p className="mt-2 font-medium text-fix-heading">{review.title}</p>
                    ) : null}
                    {review.body ? (
                      <p className="mt-1 text-sm leading-relaxed text-fix-text">{review.body}</p>
                    ) : null}
                    {review.listingTitle ? (
                      <p className="mt-2 text-xs text-fix-text-muted">For {review.listingTitle}</p>
                    ) : null}
                  </div>
                  <div className="text-right text-xs text-fix-text-muted">
                    <p>{review.reviewerName ?? "RootSync member"}</p>
                    <p>{formatPulseRelativeTime(review.createdAt)}</p>
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
