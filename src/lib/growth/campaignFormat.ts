/** Pure format helpers — safe for client components (no Prisma). */

export function formatPercent(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0%";
  return `${Math.round(value * 1000) / 10}%`;
}

export function formatRevenue(cents: number): string {
  return `$${(Math.max(0, cents) / 100).toFixed(2)}`;
}
