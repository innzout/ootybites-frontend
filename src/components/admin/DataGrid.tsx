"use client";
/**
 * Admin data table.
 *
 * PATTERN (unchanged): the grid is RENDER-ONLY. The Go backend owns pagination
 * and sorting for the big lists — each view fetches one page via the API
 * (page/limit/sort/order), feeds rows in as `rowData`, and `onServerSort`
 * reports header clicks back so the caller can refetch.
 *
 * This replaced an AG Grid wrapper. AG Grid was an 849 KB chunk (232 KB gzip,
 * 2.3 MB in dev) lazy-loaded on every admin list screen to render ~20 rows of a
 * table the server had already sorted and paginated — none of its virtualisation,
 * pivoting or filtering was used. It was the dominant cost of opening an admin
 * page. The call-site contract (columnDefs via col/actionCol, cellRenderer,
 * getRowId, emptyText, height, sortable, pagination, pageSize) is preserved, so
 * pages did not change beyond where the types are imported from.
 */
import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import { cellValue, type ColDef } from "@/components/admin/gridHelpers";
import { cn } from "@/lib/cn";

export interface DataGridProps<T> {
  rowData: T[];
  columnDefs: ColDef<T>[];
  /** Row click handler (opens detail). Row gets a pointer cursor when set. */
  onRowClicked?: (row: T) => void;
  /** Server-side sort: reports the active sort column + direction (or null). */
  onServerSort?: (colId: string | null, dir: "asc" | "desc" | null) => void;
  getRowId?: (row: T) => string;
  emptyText?: string;
  /** Fixed pixel height (body scrolls); omit to grow to fit the rows. */
  height?: number;
  loading?: boolean;
  /** Make every column sortable unless a column opts out. */
  sortable?: boolean;
  /** Client-side pagination; controls render beneath the table. */
  pagination?: boolean;
  /** Rows per page when `pagination` is on (default 10). */
  pageSize?: number;
}

type SortState = { colId: string; dir: "asc" | "desc" } | null;

// Mixed-type comparator: numbers numerically, everything else as text.
function compare(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  if (typeof a === "boolean" && typeof b === "boolean") return Number(a) - Number(b);
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });
}

export function DataGrid<T>({
  rowData,
  columnDefs,
  onRowClicked,
  onServerSort,
  getRowId,
  emptyText,
  height,
  loading,
  sortable,
  pagination,
  pageSize,
}: DataGridProps<T>) {
  const size = pageSize ?? 10;
  const [sort, setSort] = useState<SortState>(() => {
    // Only a column with a real key can be the sorted column; an empty-string
    // colId would silently match other keyless columns.
    const preset = columnDefs.find((c) => c.sort && (c.colId ?? c.field));
    if (!preset?.sort) return null;
    return { colId: (preset.colId ?? preset.field) as string, dir: preset.sort };
  });
  const [page, setPage] = useState(0);

  const canSort = (c: ColDef<T>) => (c.sortable ?? sortable ?? false) && !!(c.colId ?? c.field);

  // When the server sorts, rows arrive already ordered — sorting again locally
  // would fight the response. Only sort in-memory for purely client-side lists.
  const sorted = useMemo(() => {
    if (onServerSort || !sort) return rowData;
    const c = columnDefs.find((d) => (d.colId ?? d.field) === sort.colId);
    if (!c) return rowData;
    const copy = [...rowData];
    copy.sort((x, y) => {
      const r = compare(cellValue(c, x), cellValue(c, y));
      return sort.dir === "asc" ? r : -r;
    });
    return copy;
  }, [rowData, columnDefs, sort, onServerSort]);

  const pageCount = pagination ? Math.max(1, Math.ceil(sorted.length / size)) : 1;
  const current = Math.min(page, pageCount - 1);
  const rows = pagination ? sorted.slice(current * size, current * size + size) : sorted;

  function toggleSort(c: ColDef<T>) {
    const colId = c.colId ?? c.field ?? "";
    // Three-state cycle, matching the grid this replaced: asc → desc → unsorted.
    const next: SortState =
      sort?.colId !== colId ? { colId, dir: "asc" } : sort.dir === "asc" ? { colId, dir: "desc" } : null;
    setSort(next);
    setPage(0);
    onServerSort?.(next?.colId ?? null, next?.dir ?? null);
  }

  return (
    <div className="w-full">
      {/* Self-contained surface: the list pages used to wrap this in a <Card>,
          which drew a second identical border/radius around it. The shadow that
          Card provided lives here now. */}
      <div
        className="relative overflow-auto rounded-2xl border border-line bg-white shadow-sm shadow-ink/[0.03]"
        style={height != null ? { height } : undefined}
      >
        <table className="w-full border-collapse text-left text-[13.5px]">
          <thead className="sticky top-0 z-10">
            <tr className="bg-brand-50/70">
              {columnDefs.map((c, i) => {
                // An actions column has neither colId nor field, so comparing
                // `sort?.colId === (c.colId ?? c.field)` matched undefined to
                // undefined and reported itself as the sorted column while sort
                // was still null. Require a real key AND a live sort — and derive
                // the direction here so no non-null assertion is needed below
                // (the `!` is what hid this from the type checker).
                const colKey = c.colId ?? c.field;
                const activeDir = colKey && sort?.colId === colKey ? sort.dir : null;
                const s = canSort(c);
                return (
                  <th
                    key={i}
                    scope="col"
                    // aria-sort is what tells a screen reader the table is sorted
                    // and which way — the icon alone conveys nothing to them.
                    aria-sort={
                      activeDir ? (activeDir === "asc" ? "ascending" : "descending") : s ? "none" : undefined
                    }
                    style={{ minWidth: c.minWidth, maxWidth: c.maxWidth, width: c.flex === 0 ? 1 : undefined }}
                    className="whitespace-nowrap border-b border-line px-4 py-2.5 text-[11px] font-bold uppercase tracking-wide text-muted"
                  >
                    {s ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(c)}
                        className="inline-flex items-center gap-1 rounded font-bold uppercase tracking-wide transition-colors hover:text-brand-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
                      >
                        {c.headerName}
                        {activeDir === "asc" ? (
                          <ChevronUp className="h-3.5 w-3.5 text-brand-600" />
                        ) : activeDir === "desc" ? (
                          <ChevronDown className="h-3.5 w-3.5 text-brand-600" />
                        ) : (
                          <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />
                        )}
                      </button>
                    ) : (
                      c.headerName
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr
                key={getRowId ? getRowId(row) : ri}
                onClick={
                  onRowClicked
                    ? (e) => {
                        // Ignore clicks that came from a control inside a cell,
                        // so an action button never also opens the row.
                        const t = e.target as HTMLElement | null;
                        if (t?.closest("button, a, input, select, label")) return;
                        onRowClicked(row);
                      }
                    : undefined
                }
                className={cn(
                  "border-b border-line/70 transition-colors last:border-0 hover:bg-brand-50/60",
                  onRowClicked && "cursor-pointer",
                )}
              >
                {columnDefs.map((c, ci) => (
                  <td
                    key={ci}
                    style={{ minWidth: c.minWidth, maxWidth: c.maxWidth }}
                    className="px-4 py-2.5 align-middle text-ink"
                  >
                    {c.cellRenderer
                      ? c.cellRenderer({ value: cellValue(c, row), data: row })
                      : String(cellValue(c, row) ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {!loading && rows.length === 0 && (
          <p className="px-4 py-14 text-center text-sm font-semibold text-muted">
            {emptyText ?? "No records found."}
          </p>
        )}

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-[1px]">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          </div>
        )}
      </div>

      {pagination && sorted.length > size && (
        <div className="mt-3 flex items-center justify-between text-sm">
          <span className="text-muted">
            {current * size + 1}–{Math.min((current + 1) * size, sorted.length)} of {sorted.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={current === 0}
              className="rounded-full border border-line px-3 py-1.5 font-semibold text-ink transition-colors hover:border-brand-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-muted">
              Page {current + 1} of {pageCount}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              disabled={current >= pageCount - 1}
              className="rounded-full border border-line px-3 py-1.5 font-semibold text-ink transition-colors hover:border-brand-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
