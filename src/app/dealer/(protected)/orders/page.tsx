"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Order } from "@/types";
import { dealerListOrders } from "@/lib/dealerEndpoints";
import { formatPrice, formatDate } from "@/lib/format";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { PageHeader } from "@/components/admin/PageHeader";

export default function DealerOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dealerListOrders()
      .then((d) => setOrders(d.orders ?? []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );

  const active = orders.filter((o) => o.status === "placed" || o.status === "reached_dealer");
  const done = orders.filter((o) => o.status === "delivered" || o.status === "cancelled");

  return (
    <div>
      <PageHeader title="My orders" subtitle={`${active.length} to handle`} />
      {orders.length === 0 ? (
        <Card className="py-16 text-center text-sm text-muted">No orders assigned to you yet.</Card>
      ) : (
        <div className="space-y-6">
          <Section title="To handle" orders={active} empty="Nothing pending — nice work!" />
          {done.length > 0 && <Section title="Completed" orders={done} />}
        </div>
      )}
    </div>
  );
}

function Section({ title, orders, empty }: { title: string; orders: Order[]; empty?: string }) {
  return (
    <div>
      <h2 className="mb-3 font-serif text-lg text-ink">{title}</h2>
      {orders.length === 0 ? (
        <Card className="py-8 text-center text-sm text-muted">{empty}</Card>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <Link key={o.id} href={`/dealer/orders/${o.id}`}>
              <Card className="flex items-center justify-between gap-3 p-4 transition-all hover:-translate-y-0.5 hover:shadow-soft">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink">{o.order_number}</p>
                  <p className="truncate text-sm text-muted">
                    {o.ship_name} · {o.ship_city} · {formatDate(o.placed_at)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-display font-bold text-ink">{formatPrice(o.total)}</span>
                  <StatusBadge status={o.status} />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
