"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { Order, OrderStatus } from "@/types";
import { dealerGetOrder, dealerUpdateOrderStatus } from "@/lib/dealerEndpoints";
import { ApiException } from "@/lib/api";
import { toast } from "@/lib/toast";
import { formatPrice, formatDate } from "@/lib/format";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { OrderTimeline } from "@/components/order/OrderTimeline";
import { OrderLocationMap } from "@/components/admin/OrderLocationMap";
import { DeliveryHandoff } from "@/components/admin/DeliveryHandoff";

// Dealers move orders forward; cancellation stays with admins.
const nextForward: Record<OrderStatus, OrderStatus | null> = {
  placed: "delivered",
  reached_dealer: "delivered",
  delivered: null,
  cancelled: null,
};
const label: Record<OrderStatus, string> = {
  placed: "Placed",
  reached_dealer: "Mark reached dealer",
  delivered: "Mark delivered",
  cancelled: "Cancelled",
};

export default function DealerOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    dealerGetOrder(id)
      .then(setOrder)
      .catch(() => setOrder(null))
      .finally(() => setLoading(false));
  }, [id]);
  useEffect(() => {
    load();
  }, [load]);

  async function advance(status: OrderStatus) {
    setBusy(true);
    setError(null);
    try {
      setOrder(await dealerUpdateOrderStatus(id, status));
      toast.success("Order updated");
    } catch (ex) {
      setError(ex instanceof ApiException ? ex.message : "Could not update status");
    } finally {
      setBusy(false);
    }
  }

  if (loading)
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  if (!order) return <p className="text-muted">Order not found.</p>;

  const next = nextForward[order.status];

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/dealer/orders" className="text-sm text-brand-600 hover:underline">
        ← My orders
      </Link>

      <div className="mt-3 flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-ink">{order.order_number}</h1>
          <p className="text-sm text-muted">Placed {formatDate(order.placed_at)}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      {/* Action */}
      <Card className="mt-5 p-4">
        <p className="mb-3 text-sm font-medium text-ink">Update status</p>
        {next ? (
          <Button onClick={() => advance(next)} loading={busy}>
            {label[next]}
          </Button>
        ) : (
          <p className="text-sm text-muted">This order is {order.status}. No further action.</p>
        )}
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </Card>

      {/* Delivery details */}
      <Card className="mt-4 p-4 text-sm text-muted">
        <p className="font-medium text-ink">Deliver to</p>
        <p className="mt-1">
          {order.ship_name} · {order.ship_phone}
        </p>
        <p>
          {order.ship_line1}
          {order.ship_line2 ? `, ${order.ship_line2}` : ""}, {order.ship_city}, {order.ship_state} - {order.ship_pincode}
        </p>
        {order.delivery_note && (
          <p className="mt-2 rounded-lg bg-accent-300/20 px-2.5 py-1.5 text-ink">
            <span className="font-semibold">Note:</span> {order.delivery_note}
          </p>
        )}
        <OrderLocationMap lat={order.ship_lat} lng={order.ship_lng} label={order.ship_name} />
        <DeliveryHandoff order={order} />
        <p className="mt-2 font-semibold text-ink">Collect on delivery: {formatPrice(order.total)}</p>
      </Card>

      {/* Items */}
      <Card className="mt-4 divide-y divide-line">
        {order.items?.map((it) => (
          <div key={it.id} className="flex justify-between p-4">
            <div>
              <p className="font-medium text-ink">{it.product_name}</p>
              <p className="text-sm text-muted">
                {it.variant_label} × {it.qty}
              </p>
            </div>
            <span className="font-medium">{formatPrice(it.line_total)}</span>
          </div>
        ))}
      </Card>

      {/* Timeline */}
      <Card className="mt-4 p-5">
        <p className="mb-4 text-sm font-semibold text-ink">History</p>
        <OrderTimeline order={order} />
      </Card>
    </div>
  );
}
