"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { dashboardStats, type DashboardStats } from "@/lib/adminEndpoints";
import { formatPrice, formatDate, daysSince } from "@/lib/format";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatCard } from "@/components/admin/StatCard";
import { cn } from "@/lib/cn";

// Local YYYY-MM-DD (avoid UTC shift from toISOString).
function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function addDays(d: Date, n: number): Date {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}

type Range = { from: string; to: string };
type PresetKey = "today" | "7d" | "30d" | "month" | "all";

function presetRange(key: PresetKey): Range {
  const today = new Date();
  const to = ymd(today);
  switch (key) {
    case "today":
      return { from: to, to };
    case "7d":
      return { from: ymd(addDays(today, -6)), to };
    case "30d":
      return { from: ymd(addDays(today, -29)), to };
    case "month":
      return { from: ymd(new Date(today.getFullYear(), today.getMonth(), 1)), to };
    case "all":
      return { from: "2000-01-01", to };
  }
}

const presets: { key: PresetKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "month", label: "This month" },
  { key: "all", label: "All time" },
];

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [preset, setPreset] = useState<PresetKey | "custom">("today");
  const [range, setRange] = useState<Range>(() => presetRange("today"));

  const load = useCallback((r: Range) => {
    setLoading(true);
    dashboardStats(r)
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load(range);
  }, [load, range]);

  function pickPreset(key: PresetKey) {
    setPreset(key);
    setRange(presetRange(key));
  }
  function setCustom(patch: Partial<Range>) {
    setPreset("custom");
    setRange((r) => ({ ...r, ...patch }));
  }

  const rangeLabel =
    range.from === range.to
      ? formatDate(range.from)
      : `${formatDate(range.from)} → ${formatDate(range.to)}`;

  return (
    <div>
      {/* No breadcrumb: the dashboard IS the breadcrumb root, so a trail here
          would read "Home > Dashboard" pointing at the page you're already on. */}
      <PageHeader title="Dashboard" subtitle={`Store performance · ${rangeLabel}`} />

      {/* Date range filter */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {presets.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => pickPreset(p.key)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors",
              preset === p.key
                ? "bg-brand-gradient text-white shadow-sm shadow-brand-500/25"
                : "border border-line bg-white text-muted hover:text-brand-600",
            )}
          >
            {p.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2 text-sm">
          <input
            type="date"
            value={range.from}
            max={range.to}
            onChange={(e) => setCustom({ from: e.target.value })}
            className="h-9 rounded-lg border border-line bg-white px-2 text-ink"
          />
          <span className="text-muted">→</span>
          <input
            type="date"
            value={range.to}
            min={range.from}
            max={ymd(new Date())}
            onChange={(e) => setCustom({ to: e.target.value })}
            className="h-9 rounded-lg border border-line bg-white px-2 text-ink"
          />
        </div>
      </div>

      {loading || !stats ? (
        <div className="flex justify-center py-20">
          {loading ? <Spinner /> : <p className="text-muted">Could not load stats.</p>}
        </div>
      ) : (
        <DashboardBody stats={stats} />
      )}
    </div>
  );
}

function DashboardBody({ stats }: { stats: DashboardStats }) {
  const c = stats.counts_by_status;
  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Orders" value={stats.total_orders} tone="brand" icon="▦" hint="In range" />
        <StatCard label="Revenue" value={formatPrice(stats.revenue)} tone="success" icon="₹" hint="Delivered, in range" />
        <StatCard label="Awaiting dispatch" value={c.placed ?? 0} tone="accent" icon="⏱" />
        <StatCard label="Delivered" value={c.delivered ?? 0} tone="info" icon="✓" />
      </div>

      {/* Status breakdown */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(["placed", "reached_dealer", "delivered", "cancelled"] as const).map((s) => (
          <Card key={s} className="flex items-center justify-between p-3">
            <StatusBadge status={s} />
            <span className="font-display text-lg font-bold text-ink">{c[s] ?? 0}</span>
          </Card>
        ))}
      </div>

      {/* Recent orders */}
      <div className="mt-8 flex items-center justify-between">
        <h2 className="font-display text-lg font-bold text-ink">Recent orders</h2>
        <Link href="/admin/orders" className="text-sm font-semibold text-brand-600 hover:underline">
          View all →
        </Link>
      </div>

      <Card className="mt-3 divide-y divide-line">
        {stats.recent_orders?.length ? (
          stats.recent_orders.map((o) => {
            const age = daysSince(o.placed_at);
            return (
              <Link
                key={o.id}
                href={`/admin/orders/${o.id}`}
                className="flex items-center justify-between gap-3 p-4 transition-colors hover:bg-brand-50/40"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink">{o.order_number}</p>
                  <p className="text-sm text-muted">
                    {o.ship_name} · {formatDate(o.placed_at)}
                    {o.status === "placed" && age >= 3 && (
                      <span className="ml-2 font-semibold text-red-600">{age}d old</span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-display font-bold text-ink">{formatPrice(o.total)}</span>
                  <StatusBadge status={o.status} />
                </div>
              </Link>
            );
          })
        ) : (
          <p className="p-4 text-sm text-muted">No orders in this range.</p>
        )}
      </Card>
    </>
  );
}
