export const DISCOVER_PAGE_SIZE_OPTIONS = [10, 20, 30, 40, 50] as const;

export type DiscoverPageSize = (typeof DISCOVER_PAGE_SIZE_OPTIONS)[number];

export const DEFAULT_DISCOVER_PAGE_SIZE: DiscoverPageSize = 20;

export function parseDiscoverPageSize(value: unknown): DiscoverPageSize {
  const n = typeof value === "number" ? value : Number(value);
  if (DISCOVER_PAGE_SIZE_OPTIONS.includes(n as DiscoverPageSize)) {
    return n as DiscoverPageSize;
  }
  return DEFAULT_DISCOVER_PAGE_SIZE;
}

export function paginateSlice<T>(items: T[], page: number, pageSize: number): T[] {
  const safePage = Math.max(1, page);
  const start = (safePage - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

export function totalPages(total: number, pageSize: number): number {
  if (total <= 0) return 1;
  return Math.ceil(total / pageSize);
}
