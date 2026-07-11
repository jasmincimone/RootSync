/**
 * Shared listing field limits — keep Stripe product description in sync (500 chars).
 */
export const LISTING_DESCRIPTION_MAX_CHARS = 500;

export function assertListingDescription(description: string): string {
  const trimmed = description.trim();
  if (!trimmed) {
    throw new Error("Description is required.");
  }
  if (trimmed.length > LISTING_DESCRIPTION_MAX_CHARS) {
    throw new Error(
      `Description must be ${LISTING_DESCRIPTION_MAX_CHARS} characters or fewer (Stripe product limit).`,
    );
  }
  return trimmed;
}
