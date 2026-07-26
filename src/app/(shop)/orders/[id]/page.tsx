"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import type { Order } from "@/types";
import { getOrder } from "@/lib/endpoints";
import { formatPrice, formatDate } from "@/lib/format";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Spinner } from "@/components/ui/Spinner";
import { Card } from "@/components/ui/Card";
import { OrderTimeline } from "@/components/order/OrderTimeline";

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getOrder(id)
      .then(setOrder)
      .catch(() => setOrder(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }
  if (!order) {
    return <p className="py-20 text-center text-neutral-500">Order not found.</p>;
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/orders" className="text-sm text-brand-600 hover:underline">
        ← All orders
      </Link>

      <div className="mt-3 flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-ink">{order.order_number}</h1>
          <p className="text-sm text-muted">Placed {formatDate(order.placed_at)}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      {/* Tracking timeline */}
      <Card className="mt-6 p-5">
        <p className="mb-4 text-sm font-semibold text-ink">Tracking</p>
        <OrderTimeline order={order} />
      </Card>

      <div className="mt-4 divide-y divide-line rounded-2xl border border-line bg-white">
        {order.items?.map((it) => (
          <div key={it.id} className="flex justify-between p-4">
            <div>
              <p className="font-medium text-neutral-800">{it.product_name}</p>
              <p className="text-sm text-neutral-500">
                {it.variant_label} × {it.qty}
              </p>
            </div>
            <span className="font-medium">{formatPrice(it.line_total)}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 space-y-1 rounded-xl border border-neutral-200 p-4 text-sm">
        <div className="flex justify-between">
          <span className="text-neutral-600">Subtotal</span>
          <span>{formatPrice(order.subtotal)}</span>
        </div>
        {order.discount_amount > 0 && (
          <div className="flex justify-between text-brand-600">
            <span>Discount {order.coupon_code ? `(${order.coupon_code})` : ""}</span>
            <span>−{formatPrice(order.discount_amount)}</span>
          </div>
        )}
        <div className="flex justify-between border-t border-neutral-200 pt-2 font-semibold">
          <span>Total (COD)</span>
          <span>{formatPrice(order.total)}</span>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-neutral-200 p-4 text-sm text-neutral-600">
        <p className="font-medium text-neutral-800">Delivery to</p>
        <p className="mt-1">
          {order.ship_name} · {order.ship_phone}
        </p>
        <p>
          {order.ship_line1}
          {order.ship_line2 ? `, ${order.ship_line2}` : ""}, {order.ship_city}, {order.ship_state} -{" "}
          {order.ship_pincode}
        </p>
      </div>
    </div>
  );
}
