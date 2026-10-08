"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Zap, Settings2, MapPin } from "lucide-react";
import type { Area, Hub, StockRow } from "@/types";
import { adminListAreas, adminListHubs, adminHubStock } from "@/lib/adminEndpoints";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { PageHeader } from "@/components/admin/PageHeader";
import { cn } from "@/lib/cn";

const LOW = 5;

interface HubAvail {
  available: number; // in-stock, active variants
  low: number; // in-stock but <= LOW
  out: number; // stocked variants now at 0
}

// Admin console for the 24-hour (express) delivery flow. It mirrors what the
// customer sees — per serviceable area, which hub fulfils it and how many
// products are actually available for 24h delivery — and links to hub stock
// management. Availability = hub_stock > 0 (the same rule the storefront uses).
export default function AdminExpressPage() {
  const router = useRouter();
  const [areas, setAreas] = useState<Area[]>([]);
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [availByHub, setAvailByHub] = useState<Record<string, HubAvail>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([adminListAreas(), adminListHubs()])
      .then(async ([a, h]) => {
        const areaList = (a.areas ?? []).filter((x) => x.is_active && x.hub_id);
        const hubList = (h.hubs ?? []).filter((x) => x.is_active);
        setAreas(areaList);
        setHubs(hubList);

        // Fetch each active hub's stock once and summarise express availability.
        const hubIds = [...new Set(hubList.map((x) => x.id))];
        const entries = await Promise.all(
          hubIds.map(async (id) => {
            try {
              const d = await adminHubStock(id);
              const rows: StockRow[] = d.stock ?? [];
              const inStock = rows.filter((r) => r.is_active && r.stock_qty > 0);
              const avail: HubAvail = {
                available: inStock.length,
                low: inStock.filter((r) => r.stock_qty <= LOW).length,
                out: rows.filter((r) => r.is_active && r.stock_qty <= 0).length,
              };
              return [id, avail] as const;
            } catch {
              return [id, { available: 0, low: 0, out: 0 }] as const;
            }
          }),
        );
        setAvailByHub(Object.fromEntries(entries));
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );

  const coveredHubs = new Set(areas.map((a) => a.hub_id)).size;
  const totalAvailable = Object.values(availByHub).reduce((n, v) => n + v.available, 0);

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="24-Hour Delivery"
        subtitle="Express fulfilment — what customers can order for delivery within 24 hours, by area"
        breadcrumbs={[{ label: "24-Hour Delivery" }]}
      />

      {areas.length === 0 ? (
        <Card className="py-16 text-center text-sm text-muted">
          No express coverage yet. Assign areas to a hub and receive stock under{" "}
          <span className="font-semibold">Hubs</span> to enable 24-hour delivery.
        </Card>
      ) : (
        <>
          {/* Summary */}
          <div className="mb-5 grid grid-cols-3 gap-3">
            <Card className="p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">Areas covered</p>
              <p className="mt-1 font-display text-2xl font-bold text-ink">{areas.length}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">Hubs live</p>
              <p className="mt-1 font-display text-2xl font-bold text-ink">{coveredHubs}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">Products available</p>
              <p className="mt-1 font-display text-2xl font-bold text-brand-600">{totalAvailable}</p>
            </Card>
          </div>

          {/* Per-area express readiness */}
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                    <th className="p-3 font-semibold">Area</th>
                    <th className="p-3 font-semibold">Hub</th>
                    <th className="p-3 font-semibold">Available (24h)</th>
                    <th className="p-3 font-semibold">Stock health</th>
                    <th className="p-3 text-right font-semibold">Manage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {areas.map((a) => {
                    const av = (a.hub_id && availByHub[a.hub_id]) || { available: 0, low: 0, out: 0 };
                    return (
                      <tr key={a.id} className="hover:bg-brand-50/40">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3.5 w-3.5 shrink-0 text-brand-500" />
                            <span className="font-semibold text-ink">{a.name}</span>
                          </div>
                          <span className="text-xs text-muted">
                            {a.city} · {a.pincode}
                          </span>
                        </td>
                        <td className="p-3 text-muted">{a.hub_name ?? "—"}</td>
                        <td className="p-3">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 font-display text-lg font-bold",
                              av.available > 0 ? "text-brand-600" : "text-red-600",
                            )}
                          >
                            <Zap className={cn("h-4 w-4", av.available > 0 && "fill-current")} />
                            {av.available}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1.5">
                            {av.available === 0 && <Badge tone="danger">None in stock</Badge>}
                            {av.low > 0 && <Badge tone="warning">{av.low} low</Badge>}
                            {av.out > 0 && <Badge tone="neutral">{av.out} out</Badge>}
                            {av.available > 0 && av.low === 0 && av.out === 0 && <Badge tone="success">Healthy</Badge>}
                          </div>
                        </td>
                        <td className="p-3 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => a.hub_id && router.push(`/admin/hubs/${a.hub_id}/manage`)}
                          >
                            <Settings2 className="h-3.5 w-3.5" /> Stock
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          <p className="mt-3 text-xs text-muted">
            Availability reflects live hub stock. Receive or adjust stock from a hub&rsquo;s Manage screen; changes appear
            to customers in the Express store immediately.
          </p>
        </>
      )}
    </div>
  );
}
