"use client";
import { askConfirm } from "@/lib/confirm";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Zap, PackageCheck, RotateCcw, XCircle } from "lucide-react";
import type { Order } from "@/types";
import { getOrder, cancelOrder, reorder } from "@/lib/endpoints";
import { ApiException } from "@/lib/api";
import { toast } from "@/lib/toast";
import { useAuthStore } from "@/store/authStore";
import { useCartStore } from "@/store/cartStore";
import { formatPrice, formatDate } from "@/lib/format";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Spinner } from "@/components/ui/Spinner";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { OrderTimeline } from "@/components/order/OrderTimeline";
import { useSettings } from "@/store/settingsStore";
import type { Unit } from "@/types";

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const isAuthed = useAuthStore((s) => s.isAuthenticated());
  const logout = useAuthStore((s) => s.logout);
  const addToCart = useCartStore((s) => s.add);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const settings = useSettings();

  function loadOrder() {
    getOrder(id)
      .then(setOrder)
      .catch((ex) => {
        if (ex instanceof ApiException && ex.status === 401) {
          logout();
          router.replace("/login");
          return;
        }
        setOrder(null);
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    // Guard: must be signed in to view an order.
    if (!isAuthed) {
      router.replace(`/login?next=/orders/${id}`);
      return;
    }
    loadOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isAuthed]);

  async function cancel() {
    const ok = await askConfirm({
      title: "Cancel this order?",
      message: "This can't be undone. Your items will be released back to stock.",
      tone: "danger",
      confirmText: "Cancel order",
      cancelText: "Keep order",
    });
    if (!ok) return;
    setBusy(true);
    try {
      const updated = await cancelOrder(id);
      setOrder(updated);
      toast.success("Order cancelled");
    } catch (ex) {
      toast.error(ex instanceof ApiException ? ex.message : "Could not cancel order");
    } finally {
      setBusy(false);
    }
  }

  async function buyAgain() {
    setBusy(true);
    try {
      const { items } = await reorder(id);
      if (items.length === 0) {
        toast.error("None of these items are available right now");
        return;
      }
      items.forEach((l) =>
        addToCart({
          variantId: l.variant_id,
          productSlug: l.product_slug,
          productName: l.product_name,
          variantLabel: l.variant_label,
          unit: l.unit as Unit,
          unitValue: l.unit_value,
          price: l.price,
          qty: l.qty,
          imageUrl: l.image_url ?? undefined,
        }),
      );
      toast.success("Added to cart");
      router.push("/cart");
    } catch (ex) {
      toast.error(ex instanceof ApiException ? ex.message : "Could not reorder");
    } finally {
      setBusy(false);
    }
  }

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

      {/* Actions: cancel (while placed) + buy again */}
      <div className="mt-4 flex flex-wrap gap-2">
        {order.status === "placed" && (
          <Button variant="outline" onClick={cancel} loading={busy}>
            <XCircle className="h-4 w-4" /> Cancel order
          </Button>
        )}
        <Button variant="secondary" onClick={buyAgain} loading={busy}>
          <RotateCcw className="h-4 w-4" /> Buy again
        </Button>
      </div>

      {order.status !== "cancelled" && order.status !== "delivered" && (
        order.is_express ? (
          <div className="mt-4 flex items-center gap-3 rounded-2xl border border-brand-300 bg-brand-gradient px-4 py-3 text-white shadow-sm shadow-brand-500/25">
            <Zap className="h-5 w-5 shrink-0 fill-current" />
            <div>
              <p className="font-semibold">{settings.express_delivery_text}</p>
              <p className="text-xs text-white/85">24-hour express from your local hub.</p>
            </div>
          </div>
        ) : (
          <div className="mt-4 flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3">
            <PackageCheck className="h-5 w-5 shrink-0 text-brand-600" />
            <div>
              <p className="font-semibold text-ink">Standard delivery</p>
              <p className="text-xs text-muted">{settings.standard_delivery_text}.</p>
            </div>
          </div>
        )
      )}

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
        {order.delivery_note && (
          <p className="mt-2 border-t border-neutral-200 pt-2">
            <span className="font-medium text-neutral-800">Delivery note:</span> {order.delivery_note}
          </p>
        )}
      </div>
    </div>
  );
}
