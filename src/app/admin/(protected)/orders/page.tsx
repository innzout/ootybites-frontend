"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import type { ICellRendererParams } from "ag-grid-community";
import type { Order, OrderStatus } from "@/types";
import { adminListOrders } from "@/lib/adminEndpoints";
import { formatPrice, formatDate, daysSince } from "@/lib/format";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { PageHeader } from "@/components/admin/PageHeader";
import { Pagination } from "@/components/admin/Pagination";
import { useServerTable } from "@/components/admin/useServerTable";
import { col, sortCol } from "@/components/admin/gridHelpers";
import { cn } from "@/lib/cn";

// Code-split: AG Grid is heavy, so load it lazily and keep it out of the initial
// admin bundle (client-only — the grid has no SSR value here).
const DataGrid = dynamic(() => import("@/components/admin/DataGrid").then((m) => m.DataGrid), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center py-16">
      <Spinner />
    </div>
  ),
}) as typeof import("@/components/admin/DataGrid").DataGrid;

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

  // Server-side pagination + sorting, refetching when the status filter changes.
  const fetcher = useCallback(
    (p: { page: number; limit: number; sort?: string; order?: "asc" | "desc" }) =>
      adminListOrders({ ...p, status }).then((d) => ({ rows: d.orders ?? [], total: d.total ?? 0 })),
    [status],
  );
  const grid = useServerTable<Order>(fetcher, { limit: 20, deps: [status] });

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
      <PageHeader title="Orders" subtitle={`${grid.total} order${grid.total === 1 ? "" : "s"} total`} />

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

      <Card className="overflow-hidden p-1.5">
        <DataGrid<Order>
          rowData={grid.rows}
          columnDefs={columnDefs}
          loading={grid.loading}
          getRowId={(o) => o.id}
          onRowClicked={(o) => router.push(`/admin/orders/${o.id}`)}
          onServerSort={grid.onServerSort}
          emptyText="No orders match this filter."
        />
      </Card>

      <Pagination page={grid.page} total={grid.total} limit={grid.limit} onPage={grid.setPage} />
    </div>
  );
}
