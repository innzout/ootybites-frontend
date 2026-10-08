"use client";

import { useCallback, useEffect, useState } from "react";
import type { Hub, StockRow, StockMovement, Vendor } from "@/types";
import {
  adminListHubs,
  adminListVendors,
  adminHubStock,
  adminHubReceiveStock,
  adminHubAdjustStock,
  adminHubMovements,
} from "@/lib/adminEndpoints";
import { ApiException } from "@/lib/api";
import { toast } from "@/lib/toast";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { PageHeader } from "@/components/admin/PageHeader";
import { cn } from "@/lib/cn";

const LOW = 5;
const reasonTone: Record<StockMovement["reason"], "success" | "danger" | "info" | "warning"> = {
  purchase: "success",
  sale: "danger",
  cancel_restore: "info",
  adjustment: "warning",
};
const reasonLabel: Record<StockMovement["reason"], string> = {
  purchase: "Received",
  sale: "Sale",
  cancel_restore: "Restock",
  adjustment: "Adjust",
};

export default function AdminInventoryPage() {
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [hubId, setHubId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminListHubs()
      .then((d) => {
        const list = d.hubs ?? [];
        setHubs(list);
        if (list.length > 0) setHubId(list[0].id);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );

  return (
    <div className="max-w-4xl">
      <PageHeader title="Inventory" subtitle="Stock is held per hub — pick a hub to receive & adjust its stock" breadcrumbs={[{ label: "Inventory" }]} />

      {hubs.length === 0 ? (
        <Card className="py-16 text-center text-sm text-muted">
          No hubs yet. Create a hub first under <span className="font-semibold">Hubs</span>.
        </Card>
      ) : (
        <>
          {/* Hub selector */}
          <div className="mb-5 flex flex-wrap gap-2">
            {hubs.map((h) => (
              <button
                key={h.id}
                onClick={() => setHubId(h.id)}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors",
                  hubId === h.id
                    ? "bg-brand-gradient text-white shadow-sm shadow-brand-500/25"
                    : "border border-line bg-white text-muted hover:text-brand-600",
                )}
              >
                {h.name}
              </button>
            ))}
          </div>

          {hubId && <HubInventory key={hubId} hubId={hubId} />}
        </>
      )}
    </div>
  );
}

function HubInventory({ hubId }: { hubId: string }) {
  const [stock, setStock] = useState<StockRow[]>([]);
  const [moves, setMoves] = useState<StockMovement[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [openVariant, setOpenVariant] = useState<string | null>(null);

  const load = useCallback(() => {
    Promise.all([adminHubStock(hubId), adminHubMovements(hubId)])
      .then(([s, m]) => {
        setStock(s.stock ?? []);
        setMoves(m.movements ?? []);
      })
      .finally(() => setLoading(false));
  }, [hubId]);
  useEffect(() => {
    load();
    adminListVendors().then((d) => setVendors(d.vendors ?? [])).catch(() => setVendors([]));
  }, [load]);

  if (loading)
    return (
      <div className="flex justify-center py-10">
        <Spinner />
      </div>
    );

  return (
    <div className="space-y-6">
      {/* Stock list */}
      <div className="space-y-2">
        {stock.map((r) => {
          const out = r.stock_qty <= 0;
          const low = !out && r.stock_qty <= LOW;
          return (
            <Card key={r.variant_id} className="overflow-hidden">
              <button
                onClick={() => setOpenVariant(openVariant === r.variant_id ? null : r.variant_id)}
                className="flex w-full items-center justify-between gap-3 p-3.5 text-left hover:bg-brand-50/40"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink">
                    {r.product_name} <span className="text-muted">· {r.variant_label}</span>
                  </p>
                  <p className="text-xs text-muted">{r.sku ?? "no SKU"}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={cn("font-display text-lg font-bold", out ? "text-red-600" : "text-ink")}>{r.stock_qty}</span>
                  {out ? <Badge tone="danger">Out</Badge> : low ? <Badge tone="warning">Low</Badge> : null}
                </div>
              </button>
              {openVariant === r.variant_id && (
                <VariantActions hubId={hubId} variantId={r.variant_id} vendors={vendors} onChanged={load} />
              )}
            </Card>
          );
        })}
      </div>

      {/* Hub ledger */}
      <div>
        <p className="mb-2 text-sm font-semibold text-ink">Movement history</p>
        {moves.length === 0 ? (
          <p className="text-sm text-muted">No movements yet.</p>
        ) : (
          <Card className="overflow-x-auto">
            <table className="w-full min-w-[440px] text-sm">
              <tbody className="divide-y divide-line">
                {moves.map((m) => (
                  <tr key={m.id}>
                    <td className="p-2.5"><Badge tone={reasonTone[m.reason]}>{reasonLabel[m.reason]}</Badge></td>
                    <td className={cn("p-2.5 font-display font-bold", m.delta >= 0 ? "text-brand-600" : "text-red-600")}>
                      {m.delta >= 0 ? `+${m.delta}` : m.delta}
                    </td>
                    <td className="p-2.5 text-xs text-muted">
                      {m.vendor_name && `from ${m.vendor_name}`}
                      {m.order_number && `order ${m.order_number}`}
                      {m.unit_cost != null && ` · ₹${m.unit_cost}/u`}
                      {m.note && ` · ${m.note}`}
                    </td>
                    <td className="p-2.5 text-right text-xs text-muted">{formatDate(m.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </div>
  );
}

function VariantActions({ hubId, variantId, vendors, onChanged }: { hubId: string; variantId: string; vendors: Vendor[]; onChanged: () => void }) {
  const [qty, setQty] = useState("");
  const [cost, setCost] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [adj, setAdj] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function receive() {
    setBusy(true);
    try {
      await adminHubReceiveStock(hubId, { variant_id: variantId, vendor_id: vendorId || null, qty: Number(qty), unit_cost: cost ? Number(cost) : null });
      setQty(""); setCost("");
      toast.success("Stock received");
      onChanged();
    } catch (ex) {
      toast.error(ex instanceof ApiException ? ex.message : "Could not receive");
    } finally {
      setBusy(false);
    }
  }
  async function adjust() {
    setBusy(true);
    try {
      await adminHubAdjustStock(hubId, { variant_id: variantId, delta: Number(adj), note: note || undefined });
      setAdj(""); setNote("");
      toast.success("Stock adjusted");
      onChanged();
    } catch (ex) {
      toast.error(ex instanceof ApiException ? ex.message : "Could not adjust");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-4 border-t border-line bg-surface p-4 sm:grid-cols-2">
      <div className="rounded-xl border border-line bg-white p-3">
        <p className="mb-2 text-sm font-semibold text-ink">Receive (purchase)</p>
        <div className="grid grid-cols-2 gap-2">
          <input className="rounded-lg border border-line px-2 py-1.5 text-sm" placeholder="Qty" value={qty} onChange={(e) => setQty(e.target.value)} />
          <input className="rounded-lg border border-line px-2 py-1.5 text-sm" placeholder="Cost ₹" value={cost} onChange={(e) => setCost(e.target.value)} />
          <select className="col-span-2 rounded-lg border border-line px-2 py-1.5 text-sm" value={vendorId} onChange={(e) => setVendorId(e.target.value)}>
            <option value="">— Vendor (optional) —</option>
            {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </div>
        <Button size="sm" className="mt-2" onClick={receive} loading={busy} disabled={!qty || Number(qty) <= 0}>Receive</Button>
      </div>
      <div className="rounded-xl border border-line bg-white p-3">
        <p className="mb-2 text-sm font-semibold text-ink">Adjust (±)</p>
        <input className="w-full rounded-lg border border-line px-2 py-1.5 text-sm" placeholder="e.g. -3 or +2" value={adj} onChange={(e) => setAdj(e.target.value)} />
        <input className="mt-2 w-full rounded-lg border border-line px-2 py-1.5 text-sm" placeholder="Reason" value={note} onChange={(e) => setNote(e.target.value)} />
        <Button size="sm" variant="outline" className="mt-2" onClick={adjust} loading={busy} disabled={!adj || Number(adj) === 0}>Apply</Button>
      </div>
    </div>
  );
}
