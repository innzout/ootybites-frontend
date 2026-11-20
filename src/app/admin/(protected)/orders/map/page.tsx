"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { List } from "lucide-react";
import { adminOrdersMap, type OrderMapPoint } from "@/lib/adminEndpoints";
import { PageHeader } from "@/components/admin/PageHeader";
import { OrdersMap } from "@/components/admin/OrdersMap";
import { cn } from "@/lib/cn";

// Local YYYY-MM-DD (avoid the UTC shift from toISOString).
function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function addDays(d: Date, n: number): Date {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}

// Default to orders still needing action. The whole point of the map is
// working out today's deliveries, so starting on "everything ever" would bury
// that under months of completed pins.
const STATUSES = [
  { value: "placed", label: "To dispatch" },
  { value: "reached_dealer", label: "With dealer" },
  { value: "delivered", label: "Delivered" },
  { value: "", label: "All" },
] as const;

// 0 = no date limit.
const RANGES = [
  { days: 7, label: "Last 7 days" },
  { days: 30, label: "Last 30 days" },
  { days: 90, label: "Last 90 days" },
  { days: 0, label: "All time" },
] as const;

// Orders still waiting to go out are work, not history: one placed six weeks
// ago still needs delivering. Their tab therefore ignores the date range - it
// used to apply, and an old pending order silently dropped off the map.
const UNDATED_STATUS = "placed";

// How each filter reads in the empty-state sentence.
const EMPTY_NOUN: Record<string, string> = {
  placed: "orders waiting to dispatch",
  reached_dealer: "orders with a dealer",
  delivered: "delivered orders",
  "": "orders",
};

export default function AdminOrdersMapPage() {
  const [status, setStatus] = useState<string>("placed");
  const [days, setDays] = useState<number>(30);
  const [points, setPoints] = useState<OrderMapPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setFailed(false);
    const dated = status !== UNDATED_STATUS && days > 0;
    adminOrdersMap({
      status: status || undefined,
      from: dated ? ymd(addDays(new Date(), -(days - 1))) : undefined,
      to: dated ? ymd(new Date()) : undefined,
    })
      .then((d) => setPoints(d.points ?? []))
      .catch(() => {
        setPoints([]);
        setFailed(true);
      })
      .finally(() => setLoading(false));
  }, [status, days]);

  useEffect(load, [load]);

  return (
    <div>
      <PageHeader
        breadcrumbs={[{ label: "Orders", href: "/admin/orders" }, { label: "Map" }]}
        title="Orders map"
        subtitle="Where today's deliveries are. Select a pin for the route from its hub."
        action={
          <Link
            href="/admin/orders"
            className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-2 text-sm font-semibold text-ink hover:border-brand-400 hover:text-brand-600"
          >
            <List className="h-4 w-4" /> List view
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {STATUSES.map((s) => (
          <button
            key={s.value || "all"}
            type="button"
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
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          aria-label="Date range"
          // Not used for "To dispatch", which always shows every pending order.
          disabled={status === UNDATED_STATUS}
          title={status === UNDATED_STATUS ? "Pending orders are shown however old they are" : undefined}
          className="ml-auto h-9 rounded-lg border border-line bg-white px-2 text-sm text-ink disabled:opacity-50"
        >
          {RANGES.map((r) => (
            <option key={r.days} value={r.days}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      {failed && (
        <p role="alert" className="mb-3 rounded-xl bg-surface px-3 py-2 text-sm text-muted">
          Could not load the orders map.{" "}
          <button type="button" onClick={load} className="font-semibold text-brand-600 underline">
            Try again
          </button>
        </p>
      )}

      <OrdersMap points={points} loading={loading} />

      {!loading && !failed && points.length === 0 && (
        // Say which filter produced the empty map. The old text always blamed
        // missing pins, even when the order was simply older than the range.
        <p className="mt-3 rounded-xl bg-surface px-3 py-2 text-sm text-muted">
          No {EMPTY_NOUN[status] ?? "orders"} have a map pin
          {status !== UNDATED_STATUS && days > 0 ? ` in the last ${days} days` : ""}.
          {status !== UNDATED_STATUS && days > 0 && (
            <>
              {" "}
              <button type="button" onClick={() => setDays(0)} className="font-semibold text-brand-600 underline">
                Show all time
              </button>
            </>
          )}{" "}
          Orders where the customer typed an address without dropping a pin have no location to plot.
        </p>
      )}
    </div>
  );
}
