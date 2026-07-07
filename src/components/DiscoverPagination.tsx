import { cn } from "@/lib/cn";
import { totalPages } from "@/config/discoverPagination";

type Props = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  className?: string;
};

export function DiscoverPagination({ page, pageSize, total, onPageChange, className }: Props) {
  const pages = totalPages(total, pageSize);
  const safePage = Math.min(Math.max(1, page), pages);
  const start = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const end = total === 0 ? 0 : Math.min(safePage * pageSize, total);

  if (total === 0) return null;

  return (
    <nav
      className={cn("mt-6 flex flex-wrap items-center justify-between gap-3", className)}
      aria-label="Pagination"
    >
      <p className="text-sm text-fix-text-muted">
        Showing {start}–{end} of {total}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
          className="rounded-full border border-fix-border/20 bg-fix-surface px-3 py-1.5 text-sm font-medium text-fix-text disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous
        </button>
        <span className="text-sm text-fix-text-muted">
          Page {safePage} of {pages}
        </span>
        <button
          type="button"
          disabled={safePage >= pages}
          onClick={() => onPageChange(safePage + 1)}
          className="rounded-full border border-fix-border/20 bg-fix-surface px-3 py-1.5 text-sm font-medium text-fix-text disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </nav>
  );
}
