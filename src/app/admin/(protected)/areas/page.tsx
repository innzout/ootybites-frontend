"use client";
import { askConfirm } from "@/lib/confirm";

import { useEffect, useState } from "react";
import type { Area, Dealer } from "@/types";
import {
  adminListAreas,
  adminCreateArea,
  adminUpdateArea,
  adminDeleteArea,
  adminListDealers,
} from "@/lib/adminEndpoints";
import { ApiException } from "@/lib/api";
import { toast } from "@/lib/toast";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { PageHeader } from "@/components/admin/PageHeader";

const empty = { code: "", name: "", pincode: "", dealer_id: "" };

export default function AdminAreasPage() {
  const [areas, setAreas] = useState<Area[]>([]);
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  function load() {
    adminListAreas()
      .then((d) => setAreas(d.areas ?? []))
      .finally(() => setLoading(false));
  }
  useEffect(() => {
    load();
    adminListDealers().then((d) => setDealers(d.dealers ?? [])).catch(() => setDealers([]));
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCreating(true);
    try {
      await adminCreateArea({
        code: form.code,
        name: form.name,
        city: "Chennai",
        pincode: form.pincode,
        dealer_id: form.dealer_id || null,
        is_active: true,
      });
      setForm(empty);
      toast.success("Area added");
      load();
    } catch (ex) {
      setError(ex instanceof ApiException ? ex.message : "Could not create area");
    } finally {
      setCreating(false);
    }
  }

  async function setDealer(a: Area, dealerId: string) {
    await adminUpdateArea(a.id, {
      code: a.code,
      name: a.name,
      city: a.city,
      pincode: a.pincode,
      dealer_id: dealerId || null,
      is_active: a.is_active,
    });
    toast.success("Area updated");
    load();
  }

  async function remove(id: string) {
    if (!(await askConfirm({ title: "Delete area?", tone: "danger", confirmText: "Delete" }))) return;
    await adminDeleteArea(id);
    load();
  }

  if (loading)
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );

  return (
    <div className="max-w-3xl">
      <PageHeader title="Areas" subtitle="Map a delivery pincode to a dealer — orders auto-assign on placement (Chennai)" />

      <Card className="mb-6 p-4">
        <form onSubmit={create} className="flex flex-col gap-3">
          <p className="text-sm font-semibold text-ink">New area</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Input label="Code" placeholder="SIR" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
            <Input label="Area name" placeholder="Siruseri" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input label="Pincode" placeholder="603103" value={form.pincode} onChange={(e) => setForm({ ...form, pincode: e.target.value })} />
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-ink">Dealer</span>
              <select
                className="h-10 rounded-xl border border-line bg-white px-3 text-sm"
                value={form.dealer_id}
                onChange={(e) => setForm({ ...form, dealer_id: e.target.value })}
              >
                <option value="">— None —</option>
                {dealers.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </label>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div>
            <Button type="submit" loading={creating} disabled={!form.code || !form.name || !form.pincode}>
              Add area
            </Button>
          </div>
        </form>
      </Card>

      {areas.length === 0 ? (
        <Card className="py-16 text-center text-sm text-muted">No areas yet. Add one to enable auto-assignment.</Card>
      ) : (
        <div className="space-y-3">
          {areas.map((a) => (
            <Card key={a.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <div className="flex items-center gap-2">
                  <Badge tone="brand">{a.code}</Badge>
                  <p className="font-semibold text-ink">{a.name}</p>
                  <span className="text-sm text-muted">· {a.pincode}</span>
                </div>
                <p className="mt-1 text-sm text-muted">
                  {a.city} · Dealer: {a.dealer_name ?? <span className="text-amber-600">unassigned</span>}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <select
                  value={a.dealer_id ?? ""}
                  onChange={(e) => setDealer(a, e.target.value)}
                  className="h-9 rounded-lg border border-line bg-white px-2 text-sm"
                >
                  <option value="">— None —</option>
                  {dealers.map((d) => (
                    <option key={d.id} value={d.id} disabled={!d.is_active}>{d.name}</option>
                  ))}
                </select>
                <button onClick={() => remove(a.id)} className="text-sm font-medium text-red-600 hover:underline">
                  Delete
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
