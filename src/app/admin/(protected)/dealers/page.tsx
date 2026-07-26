"use client";
import { askConfirm } from "@/lib/confirm";

import { useEffect, useState } from "react";
import type { Dealer } from "@/types";
import {
  adminListDealers,
  adminCreateDealer,
  adminUpdateDealer,
  adminDeleteDealer,
} from "@/lib/adminEndpoints";
import { ApiException } from "@/lib/api";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { PageHeader } from "@/components/admin/PageHeader";

const empty = { name: "", mobile: "", address: "", username: "", password: "" };

export default function AdminDealersPage() {
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  function load() {
    adminListDealers()
      .then((d) => setDealers(d.dealers ?? []))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCreating(true);
    try {
      await adminCreateDealer({ ...form, address: form.address || null, is_active: true });
      setForm(empty);
      load();
    } catch (ex) {
      setError(ex instanceof ApiException ? ex.message : "Could not create dealer");
    } finally {
      setCreating(false);
    }
  }

  async function toggle(d: Dealer) {
    await adminUpdateDealer(d.id, {
      name: d.name,
      mobile: d.mobile,
      address: d.address ?? null,
      username: d.username,
      is_active: !d.is_active,
    });
    load();
  }

  async function remove(id: string) {
    if (!(await askConfirm({ title: "Delete dealer?", message: "Their assigned orders will be unassigned.", tone: "danger", confirmText: "Delete" }))) return;
    await adminDeleteDealer(id);
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
      <PageHeader title="Dealers" subtitle="Partners who fulfil assigned orders" />

      <Card className="mb-6 p-4">
        <form onSubmit={create} className="flex flex-col gap-3">
          <p className="text-sm font-semibold text-ink">New dealer</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input label="Mobile" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
            <div className="sm:col-span-2">
              <Input label="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <Input label="Username (login)" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
            <Input label="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div>
            <Button type="submit" loading={creating} disabled={!form.name || !form.mobile || !form.username || !form.password}>
              Add dealer
            </Button>
          </div>
        </form>
      </Card>

      {dealers.length === 0 ? (
        <Card className="py-16 text-center text-sm text-muted">No dealers yet.</Card>
      ) : (
        <div className="space-y-3">
          {dealers.map((d) => (
            <Card key={d.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-ink">{d.name}</p>
                  <Badge tone={d.is_active ? "success" : "neutral"}>{d.is_active ? "Active" : "Disabled"}</Badge>
                </div>
                <p className="text-sm text-muted">
                  {d.mobile} · @{d.username}
                  {d.address ? ` · ${d.address}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggle(d)}
                  className="rounded-full border border-line px-3 py-1.5 text-sm font-semibold text-muted hover:border-brand-400 hover:text-brand-600"
                >
                  {d.is_active ? "Disable" : "Enable"}
                </button>
                <button onClick={() => remove(d.id)} className="text-sm font-medium text-red-600 hover:underline">
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
