"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PackagePlus, MapPin } from "lucide-react";
import type { Hub, Area, Vendor, StockRow, StockMovement } from "@/types";
import {
  adminListHubs,
  adminListAreas,
  adminListVendors,
  adminAssignHubAreas,
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
import { Spinner } from "@/components/ui/Spinner";
import { Breadcrumbs } from "@/components/admin/Breadcrumbs";
import { cn } from "@/lib/cn";

export default function HubManagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [hub, setHub] = useState<Hub | null>(null);
  const [areas, setAreas] = useState<Area[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [stock, setStock] = useState<StockRow[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);

  // Areas served (exclusive to one hub).
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [savingAreas, setSavingAreas] = useState(false);

  // Receive stock form.
  const [variantId, setVariantId] = useState("");
  const [qty, setQty] = useState("");
  const [cost, setCost] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [busy, setBusy] = useState(false);

  const loadStock = useCallback(() => {
    adminHubStock(id).then((d) => setStock(d.stock ?? [])).catch(() => setStock([]));
    adminHubMovements(id).then((d) => setMovements(d.movements ?? [])).catch(() => setMovements([]));
  }, [id]);

  useEffect(() => {
    Promise.all([adminListHubs(), adminListAreas(), adminListVendors()])
      .then(([h, a, v]) => {
        const found = (h.hubs ?? []).find((x) => x.id === id) ?? null;
        if (!found) {
          router.replace("/admin/hubs");
          return;
        }
        setHub(found);
        setAreas(a.areas ?? []);
        setVendors(v.vendors ?? []);
        setSelected(new Set((a.areas ?? []).filter((ar) => ar.hub_id === id).map((ar) => ar.id)));
      })
      .finally(() => setLoading(false));
    loadStock();
  }, [id, router, loadStock]);

  function toggleArea(a: Area) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(a.id)) next.delete(a.id);
      else next.add(a.id);
      return next;
    });
  }

  async function saveAreas() {
    setSavingAreas(true);
    try {
      await adminAssignHubAreas(id, [...selected]);
      toast.success("Areas assigned");
    } catch (ex) {
      toast.error(ex instanceof ApiException ? ex.message : "Could not save areas");
    } finally {
      setSavingAreas(false);
    }
  }

  async function receive() {
    setBusy(true);
    try {
      await adminHubReceiveStock(id, {
        variant_id: variantId,
        vendor_id: vendorId || null,
        qty: Number(qty),
        unit_cost: cost ? Number(cost) : null,
      });
      setQty("");
      setCost("");
      toast.success("Stock received into hub");
      loadStock();
    } catch (ex) {
      toast.error(ex instanceof ApiException ? ex.message : "Could not receive stock");
    } finally {
      setBusy(false);
    }
  }

  async function adjust(row: StockRow, delta: number) {
    try {
      await adminHubAdjustStock(id, { variant_id: row.variant_id, delta });
      toast.success("Stock adjusted");
      loadStock();
    } catch (ex) {
      toast.error(ex instanceof ApiException ? ex.message : "Could not adjust");
    }
  }

  if (loading)
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  if (!hub) return null;

  return (
    <div className="max-w-4xl">
      <Breadcrumbs items={[{ label: "Hubs", href: "/admin/hubs" }, { label: hub.name }, { label: "Manage" }]} />
      <h1 className="mb-6 font-sans text-2xl font-bold tracking-tight text-ink">Manage {hub.name}</h1>

      {/* Areas served */}
      <Card className="mb-4 p-5">
        <div className="mb-3 flex items-center gap-2">
          <MapPin className="h-4 w-4 text-brand-600" />
          <h2 className="font-semibold text-ink">Areas served</h2>
          <span className="text-xs text-muted">an area belongs to one hub only</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {areas.length === 0 && <span className="text-sm text-muted">No areas yet — add areas first.</span>}
          {areas.map((a) => {
            const onOtherHub = a.hub_id && a.hub_id !== id;
            const on = selected.has(a.id);
            return (
              <button
                key={a.id}
                disabled={!!onOtherHub}
                onClick={() => toggleArea(a)}
                className={cn(
                  "rounded-full border px-3 py-1 text-sm transition-colors",
                  on ? "border-brand-500 bg-brand-500 text-white" : "border-line bg-white text-muted hover:border-brand-300",
                  onOtherHub && "cursor-not-allowed opacity-40",
                )}
                title={onOtherHub ? `On ${a.hub_name}` : ""}
              >
                {a.name} · {a.pincode}
              </button>
            );
          })}
        </div>
        <Button size="sm" className="mt-4" onClick={saveAreas} loading={savingAreas}>
          Save areas
        </Button>
      </Card>

      {/* Receive stock */}
      <Card className="mb-4 p-5">
        <div className="mb-3 flex items-center gap-2">
          <PackagePlus className="h-4 w-4 text-brand-600" />
          <h2 className="font-semibold text-ink">Receive stock into this hub</h2>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <select className="col-span-2 rounded-lg border border-line px-2 py-2 text-sm sm:col-span-1" value={variantId} onChange={(e) => setVariantId(e.target.value)}>
            <option value="">Variant…</option>
            {stock.map((s) => (
              <option key={s.variant_id} value={s.variant_id}>{s.product_name} · {s.variant_label}</option>
            ))}
          </select>
          <input className="rounded-lg border border-line px-2 py-2 text-sm" placeholder="Qty" value={qty} onChange={(e) => setQty(e.target.value)} />
          <input className="rounded-lg border border-line px-2 py-2 text-sm" placeholder="Unit cost ₹" value={cost} onChange={(e) => setCost(e.target.value)} />
          <select className="rounded-lg border border-line px-2 py-2 text-sm" value={vendorId} onChange={(e) => setVendorId(e.target.value)}>
            <option value="">Vendor…</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
        </div>
        <Button size="sm" variant="secondary" className="mt-3" onClick={receive} loading={busy} disabled={!variantId || !qty}>
          Receive
        </Button>
      </Card>

      {/* Current stock with adjust */}
      <Card className="mb-4 p-5">
        <h2 className="mb-3 font-semibold text-ink">Current hub stock</h2>
        {stock.filter((s) => s.stock_qty > 0).length === 0 ? (
          <p className="text-sm text-muted">No stock in this hub yet.</p>
        ) : (
          <div className="space-y-1.5">
            {stock.filter((s) => s.stock_qty > 0).map((s) => (
              <div key={s.variant_id} className="flex items-center justify-between rounded-lg bg-surface px-3 py-2 text-sm">
                <span className="text-ink">{s.product_name} · {s.variant_label}</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => adjust(s, -1)} className="h-7 w-7 rounded-full border border-line text-muted hover:border-red-300 hover:text-red-600">−</button>
                  <span className="w-14 text-center font-semibold">{s.stock_qty}</span>
                  <button onClick={() => adjust(s, 1)} className="h-7 w-7 rounded-full border border-line text-muted hover:border-brand-300 hover:text-brand-600">+</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Movement ledger */}
      <Card className="p-5">
        <h2 className="mb-3 font-semibold text-ink">Recent stock movements</h2>
        {movements.length === 0 ? (
          <p className="text-sm text-muted">No movements yet.</p>
        ) : (
          <div className="divide-y divide-line">
            {movements.slice(0, 20).map((m) => {
              const row = stock.find((s) => s.variant_id === m.variant_id);
              const label = row ? `${row.product_name} · ${row.variant_label}` : m.variant_id;
              return (
                <div key={m.id} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <span className="font-medium text-ink">{label}</span>
                    <span className="ml-2 text-xs capitalize text-muted">{m.reason.replace("_", " ")}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={cn("font-semibold", m.delta >= 0 ? "text-brand-600" : "text-red-600")}>
                      {m.delta >= 0 ? "+" : ""}{m.delta}
                    </span>
                    <span className="text-xs text-muted">{m.created_at ? formatDate(m.created_at) : ""}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
