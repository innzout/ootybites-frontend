"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
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
import { LOW_STOCK } from "@/lib/stock";

// Same threshold the storefront uses for its "only N left" nudge.
const LOW = LOW_STOCK;
const MOVES_STEP = 20;
type StockView = "all" | "low" | "out";
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
  // A hub carries every variant in the catalogue, so the list needs a way to
  // find one item and to see only what needs reordering.
  const [stockQuery, setStockQuery] = useState("");
  const [stockView, setStockView] = useState<StockView>("all");
  const [stockSort, setStockSort] = useState<"name" | "qty">("name");
  const [movesShown, setMovesShown] = useState(MOVES_STEP);

  const visibleStock = useMemo(() => {
    const q = stockQuery.trim().toLowerCase();
    const rows = stock.filter((r) => {
      if (stockView === "out" && r.stock_qty > 0) return false;
      if (stockView === "low" && (r.stock_qty <= 0 || r.stock_qty > LOW)) return false;
      if (!q) return true;
      return `${r.product_name} ${r.variant_label} ${r.sku ?? ""}`.toLowerCase().includes(q);
    });
    return [...rows].sort((a, b) =>
      stockSort === "qty" ? a.stock_qty - b.stock_qty : a.product_name.localeCompare(b.product_name),
    );
  }, [stock, stockQuery, stockView, stockSort]);
  const counts = useMemo(
    () => ({
      all: stock.length,
      low: stock.filter((r) => r.stock_qty > 0 && r.stock_qty <= LOW).length,
      out: stock.filter((r) => r.stock_qty <= 0).length,
    }),
    [stock],
  );

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
      {/* Stock list: search, needs-attention filters and sort */}
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-0 flex-1 sm:max-w-xs">
          <span className="sr-only">Search stock</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input
            type="search"
            value={stockQuery}
            maxLength={100}
            onChange={(e) => setStockQuery(e.target.value)}
            placeholder="Search product, size or SKU"
            className="h-9 w-full rounded-full border border-line bg-white pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25"
          />
        </label>
        {(["all", "low", "out"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setStockView(v)}
            aria-pressed={stockView === v}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
              stockView === v ? "bg-brand-gradient text-white" : "border border-line bg-white text-muted hover:text-brand-600",
            )}
          >
            {v === "all" ? "All" : v === "low" ? "Low" : "Out"} ({counts[v]})
          </button>
        ))}
        <select
          value={stockSort}
          onChange={(e) => setStockSort(e.target.value as "name" | "qty")}
          aria-label="Sort stock"
          className="h-9 rounded-full border border-line bg-white px-3 text-xs text-ink"
        >
          <option value="name">Name A–Z</option>
          <option value="qty">Lowest stock first</option>
        </select>
      </div>
      <div className="space-y-2">
        {visibleStock.length === 0 && (
          <p className="rounded-xl border border-line bg-white px-3 py-6 text-center text-sm text-muted">
            {stock.length === 0 ? "No stock at this hub yet." : "Nothing matches these filters."}
          </p>
        )}
        {visibleStock.map((r) => {
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
                {moves.slice(0, movesShown).map((m) => (
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
        {moves.length > movesShown && (
          <button
            type="button"
            onClick={() => setMovesShown((n) => n + MOVES_STEP)}
            className="mt-2 text-sm font-semibold text-brand-600 hover:underline"
          >
            Show more ({moves.length - movesShown} older)
          </button>
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
          <input className="rounded-lg border border-line px-2 py-1.5 text-sm" placeholder="Qty" inputMode="numeric" maxLength={6} aria-label="Quantity" value={qty} onChange={(e) => setQty(e.target.value.replace(/D/g, ""))} />
          <input className="rounded-lg border border-line px-2 py-1.5 text-sm" placeholder="Cost ₹" inputMode="decimal" maxLength={10} aria-label="Unit cost in rupees" value={cost} onChange={(e) => setCost(e.target.value.replace(/[^d.]/g, ""))} />
          <select className="col-span-2 rounded-lg border border-line px-2 py-1.5 text-sm" value={vendorId} onChange={(e) => setVendorId(e.target.value)}>
            <option value="">— Vendor (optional) —</option>
            {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>
        </div>
        <Button size="sm" className="mt-2" onClick={receive} loading={busy} disabled={!qty || Number(qty) <= 0}>Receive</Button>
      </div>
      <div className="rounded-xl border border-line bg-white p-3">
        <p className="mb-2 text-sm font-semibold text-ink">Adjust (±)</p>
        <input className="w-full rounded-lg border border-line px-2 py-1.5 text-sm" placeholder="e.g. -3 or +2" aria-label="Stock adjustment" inputMode="numeric" maxLength={7} value={adj} onChange={(e) => setAdj(e.target.value.replace(/[^d+-]/g, ""))} />
        <input className="mt-2 w-full rounded-lg border border-line px-2 py-1.5 text-sm" placeholder="Reason" aria-label="Reason for adjustment" maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} />
        <Button size="sm" variant="outline" className="mt-2" onClick={adjust} loading={busy} disabled={!adj || Number(adj) === 0}>Apply</Button>
      </div>
    </div>
  );
}
