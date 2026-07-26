import { cn } from "@/lib/cn";

// Pagination — shared page control for server-paginated admin lists.
export function Pagination({
  page,
  total,
  limit,
  onPage,
}: {
  page: number;
  total: number;
  limit: number;
  onPage: (p: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / limit));
  if (pages <= 1) return null;

  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  const btn = "rounded-full border border-line bg-white px-4 py-1.5 text-sm font-semibold text-ink transition-colors hover:border-brand-400 disabled:opacity-40 disabled:hover:border-line";

  return (
    <div className="mt-4 flex items-center justify-between gap-3 text-sm">
      <span className="text-muted">
        {from}–{to} of {total}
      </span>
      <div className="flex items-center gap-3">
        <button className={cn(btn)} disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Prev
        </button>
        <span className="text-muted">
          Page {page} / {pages}
        </span>
        <button className={cn(btn)} disabled={page >= pages} onClick={() => onPage(page + 1)}>
          Next
        </button>
      </div>
    </div>
  );
}
