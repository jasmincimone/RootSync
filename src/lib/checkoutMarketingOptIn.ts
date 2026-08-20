import { prisma } from "@/lib/prisma";

/** Checkout opt-in: explicit checkbox wins; signed-in members inherit account preference. */
export async function resolveCheckoutMarketingOptIn(args: {
  userId?: string | null;
  explicitOptIn?: boolean;
}): Promise<boolean> {
  if (args.explicitOptIn === true) return true;
  if (!args.userId) return false;

  const user = await prisma.user.findUnique({
    where: { id: args.userId },
    select: { marketingOptIn: true },
  });
  return Boolean(user?.marketingOptIn);
}

export function parseMarketingOptIn(value: unknown): boolean {
  return value === true || value === "true" || value === 1 || value === "1";
}
