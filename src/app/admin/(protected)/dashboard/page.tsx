"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { dashboardStats, type DashboardStats } from "@/lib/adminEndpoints";
import { formatPrice, formatDate, daysSince } from "@/lib/format";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { PageHeader } from "@/components/admin/PageHeader";
import { StatCard } from "@/components/admin/StatCard";

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardStats()
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  if (!stats) return <p className="text-muted">Could not load stats.</p>;

  const c = stats.counts_by_status;

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Store performance at a glance" />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Total orders" value={stats.total_orders} tone="brand" icon="▦" />
        <StatCard
          label="Revenue"
          value={formatPrice(stats.revenue)}
          tone="success"
          icon="₹"
          hint="Delivered only"
        />
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
          <p className="p-4 text-sm text-muted">No orders yet.</p>
        )}
      </Card>
    </div>
  );
}
