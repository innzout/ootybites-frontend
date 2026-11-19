"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import type { Order } from "@/types";
import { dealerListOrders } from "@/lib/dealerEndpoints";
import { formatPrice, formatDate } from "@/lib/format";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import { usePagedList } from "@/lib/usePagedList";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/admin/PageHeader";
import { cn } from "@/lib/cn";

const PAGE_SIZE = 20;

// "To deliver" is the dealer's working queue, so it opens on that tab and
// oldest first: the order that has waited longest is the one to take next.
const TABS = [
  { status: "placed", label: "To deliver", order: "asc" as const, empty: "Nothing to deliver — nice work!" },
  { status: "delivered", label: "Delivered", order: "desc" as const, empty: "No delivered orders yet." },
  { status: "cancelled", label: "Cancelled", order: "desc" as const, empty: "No cancelled orders." },
  { status: "", label: "All", order: "desc" as const, empty: "No orders assigned to you yet." },
];

export default function DealerOrdersPage() {
  const [tab, setTab] = useState(TABS[0]);
  const [order, setOrder] = useState<"asc" | "desc">(TABS[0].order);
  const [search, setSearch] = useState("");
  const q = useDebouncedValue(search.trim());

  const fetchPage = useCallback(
    (page: number) =>
      dealerListOrders({ status: tab.status, q, sort: "placed_at", order, page, limit: PAGE_SIZE }).then((d) => ({
        items: d.orders ?? [],
        total: d.total ?? 0,
      })),
    [tab, q, order],
  );
  const list = usePagedList<Order>(fetchPage, [tab, q, order]);

  function pickTab(t: (typeof TABS)[number]) {
    setTab(t);
    setOrder(t.order);
  }

  return (
    <div>
      <PageHeader
        title="My orders"
        subtitle={list.loading ? "Loading…" : `${list.total} ${tab.label.toLowerCase()}${q ? ` matching “${q}”` : ""}`}
      />

      <div className="mb-3 flex flex-wrap gap-2" role="tablist" aria-label="Order status">
        {TABS.map((t) => (
          <button
            key={t.label}
            type="button"
            role="tab"
            aria-selected={tab.label === t.label}
            onClick={() => pickTab(t)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors",
              tab.label === t.label
                ? "bg-brand-gradient text-white shadow-sm shadow-brand-500/25"
                : "border border-line bg-white text-muted hover:text-brand-600",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <label className="relative min-w-0 flex-1 sm:max-w-xs">
          <span className="sr-only">Search orders</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input
            type="search"
            value={search}
            maxLength={100}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Order no., name or phone"
            className="h-10 w-full rounded-xl border border-line bg-white pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25"
          />
        </label>
        <select
          value={order}
          onChange={(e) => setOrder(e.target.value as "asc" | "desc")}
          aria-label="Sort orders"
          className="h-10 rounded-xl border border-line bg-white px-3 text-sm text-ink"
        >
          <option value="asc">Oldest first</option>
          <option value="desc">Newest first</option>
        </select>
      </div>

      {list.loading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : list.error && list.items.length === 0 ? (
        // Used to fall through to "No orders assigned to you yet".
        <Card role="alert" className="flex flex-col items-center gap-3 py-12 text-center text-sm text-muted">
          Could not load your orders.
          <Button variant="outline" onClick={list.reload}>
            Try again
          </Button>
        </Card>
      ) : list.items.length === 0 ? (
        <Card className="py-12 text-center text-sm text-muted">
          {q ? `No orders match “${q}”.` : tab.empty}
        </Card>
      ) : (
        <>
          <div className="space-y-3">
            {list.items.map((o) => (
              <Link key={o.id} href={`/dealer/orders/${o.id}`} className="block">
                <Card className="flex items-center justify-between gap-3 p-4 transition-all hover:-translate-y-0.5 hover:shadow-soft">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-ink">{o.order_number}</p>
                    <p className="truncate text-sm text-muted">
                      {o.ship_name} · {o.ship_city} · {formatDate(o.placed_at)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="font-display font-bold text-ink">{formatPrice(o.total)}</span>
                    <StatusBadge status={o.status} />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
          {list.hasMore && (
            <div className="mt-4 flex flex-col items-center gap-1">
              <Button variant="outline" onClick={list.loadMore} loading={list.loadingMore}>
                Load more
              </Button>
              <span className="text-xs text-muted">
                Showing {list.items.length} of {list.total}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
