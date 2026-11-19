"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { Map as MapIcon, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ICellRendererParams } from "@/components/admin/gridHelpers";
import type { Order, OrderStatus } from "@/types";
import { adminListOrders } from "@/lib/adminEndpoints";
import { formatPrice, formatDate, daysSince } from "@/lib/format";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Spinner } from "@/components/ui/Spinner";
import { PageHeader } from "@/components/admin/PageHeader";
import { Pagination } from "@/components/admin/Pagination";
import { useServerTable } from "@/components/admin/useServerTable";
import { DataGrid } from "@/components/admin/DataGrid";
import { LoadError } from "@/components/admin/LoadError";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import { col, sortCol } from "@/components/admin/gridHelpers";
import { cn } from "@/lib/cn";

// Code-split: AG Grid is heavy, so load it lazily and keep it out of the initial
// admin bundle (client-only — the grid has no SSR value here).

const statuses = [
  { value: "", label: "All" },
  { value: "placed", label: "Placed" },
  { value: "reached_dealer", label: "Reached dealer" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

export default function AdminOrdersPage() {
  const router = useRouter();
  const [status, setStatus] = useState("placed");
  // Free-text search (order number, customer name or phone) and an optional
  // date range. Either date may be set on its own.
  const [search, setSearch] = useState("");
  const q = useDebouncedValue(search.trim());
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const filtered = q !== "" || from !== "" || to !== "" || status !== "placed";

  // Server-side pagination + sorting, refetching when any filter changes.
  const fetcher = useCallback(
    (p: { page: number; limit: number; sort?: string; order?: "asc" | "desc" }) =>
      adminListOrders({ ...p, status, q, from, to }).then((d) => ({ rows: d.orders ?? [], total: d.total ?? 0 })),
    [status, q, from, to],
  );
  const grid = useServerTable<Order>(fetcher, { limit: 20, deps: [status, q, from, to] });

  function clearFilters() {
    setStatus("placed");
    setSearch("");
    setFrom("");
    setTo("");
  }

  const columnDefs = [
    col<Order>("order_number", "Order", {
      minWidth: 180,
      cellRenderer: (p: ICellRendererParams<Order>) => (
        <div className="leading-tight">
          <Link
            href={`/admin/orders/${p.data?.id}`}
            className="font-semibold text-brand-600 hover:underline"
          >
            {p.value}
          </Link>
          <div className="text-xs text-muted">{p.data?.ship_name}</div>
        </div>
      ),
    }),
    sortCol<Order>("placed_at", "Placed", {
      minWidth: 130,
      cellRenderer: (p: ICellRendererParams<Order>) => (
        <span className="text-muted">{p.value ? formatDate(String(p.value)) : "—"}</span>
      ),
    }),
    col<Order>("placed_at", "Age", {
      colId: "age",
      maxWidth: 90,
      cellRenderer: (p: ICellRendererParams<Order>) => {
        const age = p.value ? daysSince(String(p.value)) : 0;
        const stale = age >= 3 && p.data?.status === "placed";
        return (
          <span className={cn("text-sm font-semibold", stale ? "text-red-600" : "text-muted")}>{age}d</span>
        );
      },
    }),
    sortCol<Order>("total", "Total", {
      maxWidth: 130,
      cellRenderer: (p: ICellRendererParams<Order>) => (
        <span className="font-display font-bold text-ink">{formatPrice(Number(p.value))}</span>
      ),
    }),
    sortCol<Order>("status", "Status", {
      maxWidth: 160,
      cellRenderer: (p: ICellRendererParams<Order>) => <StatusBadge status={p.value as OrderStatus} />,
    }),
  ];

  return (
    <div>
      <PageHeader
        title="Orders"
        subtitle={`${grid.total} order${grid.total === 1 ? "" : "s"} total`}
        breadcrumbs={[{ label: "Orders" }]}
        action={
          <Link
            href="/admin/orders/map"
            className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-2 text-sm font-semibold text-ink hover:border-brand-400 hover:text-brand-600"
          >
            <MapIcon className="h-4 w-4" /> Map view
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {statuses.map((s) => (
          <button
            key={s.value}
            onClick={() => setStatus(s.value)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors",
              status === s.value
                ? "bg-brand-gradient text-white shadow-sm shadow-brand-500/25"
                : "border border-line bg-white text-muted hover:text-brand-600",
            )}
          >
            {s.label}
          </button>
        ))}
        <span className="ml-auto text-xs text-muted">Click a column header to sort</span>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="relative w-full sm:max-w-xs">
          <span className="sr-only">Search orders</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input
            type="search"
            value={search}
            maxLength={100}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Order no., customer name or phone"
            className="h-10 w-full rounded-xl border border-line bg-white pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-muted">
          From
          <input
            type="date"
            value={from}
            max={to || undefined}
            onChange={(e) => setFrom(e.target.value)}
            className="h-10 rounded-xl border border-line bg-white px-2 text-sm text-ink"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium text-muted">
          To
          <input
            type="date"
            value={to}
            min={from || undefined}
            onChange={(e) => setTo(e.target.value)}
            className="h-10 rounded-xl border border-line bg-white px-2 text-sm text-ink"
          />
        </label>
        {filtered && (
          <button type="button" onClick={clearFilters} className="h-10 px-2 text-sm font-semibold text-brand-600 hover:underline">
            Clear filters
          </button>
        )}
      </div>
      {grid.error ? (
        <LoadError what="orders" onRetry={grid.reload} />
      ) : (
        <DataGrid<Order>
          rowData={grid.rows}
          columnDefs={columnDefs}
          loading={grid.loading}
          getRowId={(o) => o.id}
          onRowClicked={(o) => router.push(`/admin/orders/${o.id}`)}
          onServerSort={grid.onServerSort}
          emptyText={q ? `No orders match “${q}”.` : "No orders match this filter."}
        />
      )}

      <Pagination page={grid.page} total={grid.total} limit={grid.limit} onPage={grid.setPage} />
    </div>
  );
}
