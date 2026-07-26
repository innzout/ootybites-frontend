"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { Order, OrderStatus, Dealer } from "@/types";
import {
  adminGetOrder,
  adminUpdateOrderStatus,
  adminAddOrderNote,
  adminListDealers,
  adminAssignOrder,
} from "@/lib/adminEndpoints";
import { ApiException } from "@/lib/api";
import { toast } from "@/lib/toast";
import { formatPrice, formatDate } from "@/lib/format";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Spinner } from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";

// Next allowed statuses per the server state machine (mirrored for the UI).
const nextStatuses: Record<OrderStatus, OrderStatus[]> = {
  placed: ["reached_dealer", "cancelled"],
  reached_dealer: ["delivered", "cancelled"],
  delivered: [],
  cancelled: [],
};

const statusLabel: Record<OrderStatus, string> = {
  placed: "Placed",
  reached_dealer: "Mark reached dealer",
  delivered: "Mark delivered",
  cancelled: "Cancel order",
};

export default function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [showCancel, setShowCancel] = useState(false);
  const [note, setNote] = useState("");
  const [dealers, setDealers] = useState<Dealer[]>([]);

  const load = useCallback(() => {
    adminGetOrder(id)
      .then(setOrder)
      .catch(() => setOrder(null))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
    adminListDealers()
      .then((d) => setDealers(d.dealers ?? []))
      .catch(() => setDealers([]));
  }, [load]);

  async function assignDealer(dealerId: string) {
    setBusy(true);
    try {
      const updated = await adminAssignOrder(id, dealerId || null);
      setOrder(updated);
      toast.success(dealerId ? "Dealer assigned" : "Dealer unassigned");
    } catch (ex) {
      setError(ex instanceof ApiException ? ex.message : "Could not assign dealer");
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(status: OrderStatus, reason?: string) {
    setError(null);
    setBusy(true);
    try {
      const updated = await adminUpdateOrderStatus(id, status, reason);
      setOrder(updated);
      setShowCancel(false);
      setCancelReason("");
      toast.success(status === "cancelled" ? "Order cancelled" : "Order updated");
    } catch (ex) {
      setError(ex instanceof ApiException ? ex.message : "Could not update status");
    } finally {
      setBusy(false);
    }
  }

  async function submitNote() {
    if (!note.trim()) return;
    setBusy(true);
    try {
      const updated = await adminAddOrderNote(id, note.trim());
      setOrder(updated);
      setNote("");
    } catch (ex) {
      setError(ex instanceof ApiException ? ex.message : "Could not add note");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Spinner />;
  if (!order) return <p className="text-muted">Order not found.</p>;

  const nexts = nextStatuses[order.status];

  return (
    <div className="max-w-3xl">
      <Link href="/admin/orders" className="text-sm text-brand-600 hover:underline">
        ← Orders
      </Link>

      <div className="mt-3 flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-ink">{order.order_number}</h1>
          <p className="text-sm text-muted">Placed {formatDate(order.placed_at)}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      {/* Status actions */}
      <div className="mt-5 rounded-2xl border border-line bg-white p-4">
        <p className="mb-3 text-sm font-medium text-ink">Actions</p>
        {nexts.length === 0 ? (
          <p className="text-sm text-muted">This order is {order.status}. No further actions.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {nexts.map((s) =>
              s === "cancelled" ? (
                <Button key={s} variant="danger" onClick={() => setShowCancel(true)} disabled={busy}>
                  {statusLabel[s]}
                </Button>
              ) : (
                <Button key={s} onClick={() => changeStatus(s)} loading={busy}>
                  {statusLabel[s]}
                </Button>
              ),
            )}
          </div>
        )}

        {showCancel && (
          <div className="mt-3 rounded-lg bg-red-50 p-3">
            <p className="mb-2 text-sm text-red-700">Cancelling restores stock. A reason is required.</p>
            <textarea
              className="w-full rounded-lg border border-red-200 p-2 text-sm"
              rows={2}
              placeholder="Reason for cancellation"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
            <div className="mt-2 flex gap-2">
              <Button
                variant="danger"
                disabled={!cancelReason.trim() || busy}
                onClick={() => changeStatus("cancelled", cancelReason.trim())}
              >
                Confirm cancel
              </Button>
              <Button variant="ghost" onClick={() => setShowCancel(false)}>
                Keep order
              </Button>
            </div>
          </div>
        )}
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>

      {/* Assign dealer */}
      <div className="mt-4 rounded-2xl border border-line bg-white p-4">
        <p className="mb-2 text-sm font-medium text-ink">Fulfilling dealer</p>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={order.dealer_id ?? ""}
            onChange={(e) => assignDealer(e.target.value)}
            disabled={busy}
            className="h-10 rounded-xl border border-line bg-white px-3 text-sm"
          >
            <option value="">— Unassigned —</option>
            {dealers.map((d) => (
              <option key={d.id} value={d.id} disabled={!d.is_active}>
                {d.name} ({d.mobile})
              </option>
            ))}
          </select>
          {order.dealer_name && (
            <span className="text-sm text-muted">
              Assigned to <span className="font-semibold text-ink">{order.dealer_name}</span>
            </span>
          )}
        </div>
      </div>

      {/* Items */}
      <div className="mt-4 divide-y divide-line rounded-2xl border border-line bg-white">
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
        <div className="space-y-1 p-4 text-sm">
          <div className="flex justify-between">
            <span className="text-muted">Subtotal</span>
            <span>{formatPrice(order.subtotal)}</span>
          </div>
          {order.discount_amount > 0 && (
            <div className="flex justify-between text-brand-600">
              <span>Discount {order.coupon_code ? `(${order.coupon_code})` : ""}</span>
              <span>−{formatPrice(order.discount_amount)}</span>
            </div>
          )}
          <div className="flex justify-between font-semibold">
            <span>Total (COD)</span>
            <span>{formatPrice(order.total)}</span>
          </div>
        </div>
      </div>

      {/* Address */}
      <div className="mt-4 rounded-2xl border border-line bg-white p-4 text-sm text-muted">
        <p className="font-medium text-ink">Delivery to</p>
        <p className="mt-1">
          {order.ship_name} · {order.ship_phone}
        </p>
        <p>
          {order.ship_line1}
          {order.ship_line2 ? `, ${order.ship_line2}` : ""}, {order.ship_city}, {order.ship_state} - {order.ship_pincode}
        </p>
      </div>

      {/* History + note */}
      <div className="mt-4 rounded-2xl border border-line bg-white p-4">
        <p className="mb-3 text-sm font-medium text-ink">History</p>
        <ol className="space-y-2">
          {order.history?.map((h) => (
            <li key={h.id} className="flex items-start gap-3 text-sm">
              <StatusBadge status={h.status} />
              <div>
                {h.note && <p className="text-ink">{h.note}</p>}
                <p className="text-xs text-muted">{formatDate(h.created_at)}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-4 flex gap-2">
          <input
            className="h-10 flex-1 rounded-lg border border-line px-3 text-sm outline-none focus:border-brand-500"
            placeholder="Add an internal note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <Button variant="secondary" onClick={submitNote} disabled={busy || !note.trim()}>
            Add note
          </Button>
        </div>
      </div>
    </div>
  );
}
