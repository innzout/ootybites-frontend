"use client";
import { askConfirm } from "@/lib/confirm";

import { useEffect, useState } from "react";
import type { Coupon } from "@/types";
import {
  adminListCoupons,
  adminCreateCoupon,
  adminUpdateCoupon,
  adminDeleteCoupon,
} from "@/lib/adminEndpoints";
import { ApiException } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/admin/PageHeader";

const empty = {
  code: "",
  discount_value: "",
  min_order_value: "",
  max_discount_cap: "",
  is_active: true,
};

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(empty);
  const [error, setError] = useState<string | null>(null);

  function load() {
    adminListCoupons()
      .then((d) => setCoupons(d.coupons ?? []))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await adminCreateCoupon({
        code: form.code,
        discount_value: Number(form.discount_value),
        min_order_value: Number(form.min_order_value || 0),
        max_discount_cap: form.max_discount_cap ? Number(form.max_discount_cap) : undefined,
        applicable_scope: "all",
        is_active: form.is_active,
      });
      setForm(empty);
      load();
    } catch (ex) {
      setError(ex instanceof ApiException ? ex.message : "Could not create coupon");
    }
  }

  async function toggle(c: Coupon) {
    // Send only the fields the update endpoint accepts (it rejects unknowns).
    await adminUpdateCoupon(c.id, {
      code: c.code,
      is_active: !c.is_active,
      discount_value: c.discount_value,
      max_discount_cap: c.max_discount_cap ?? undefined,
      applicable_scope: c.applicable_scope,
      min_order_value: c.min_order_value,
      min_customer_lifetime_value: c.min_customer_lifetime_value,
      usage_limit_total: c.usage_limit_total ?? undefined,
      usage_limit_per_user: c.usage_limit_per_user ?? undefined,
      product_ids: c.product_ids,
    });
    load();
  }

  async function remove(id: string) {
    if (!(await askConfirm({ title: "Delete coupon?", tone: "danger", confirmText: "Delete" }))) return;
    await adminDeleteCoupon(id);
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
      <PageHeader title="Coupons" subtitle="Percentage discounts across the store" />

      <Card className="mb-6 p-4">
        <form onSubmit={create}>
          <p className="mb-3 text-sm font-semibold text-ink">New coupon (percentage, all products)</p>
        <div className="grid gap-3 sm:grid-cols-4">
          <Input label="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
          <Input label="Discount %" value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: e.target.value })} />
          <Input label="Min order ₹" value={form.min_order_value} onChange={(e) => setForm({ ...form, min_order_value: e.target.value })} />
          <Input label="Max cap ₹" value={form.max_discount_cap} onChange={(e) => setForm({ ...form, max_discount_cap: e.target.value })} />
        </div>
          <label className="mt-3 flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
            Active (shown to customers)
          </label>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          <Button type="submit" className="mt-3" disabled={!form.code || !form.discount_value}>
            Create coupon
          </Button>
        </form>
      </Card>

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="p-3.5 font-semibold">Code</th>
              <th className="p-3.5 font-semibold">Discount</th>
              <th className="p-3.5 font-semibold">Min order</th>
              <th className="p-3.5 font-semibold">Used</th>
              <th className="p-3.5 font-semibold">Active</th>
              <th className="p-3.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {coupons.map((c) => (
              <tr key={c.id} className="hover:bg-brand-50/40">
                <td className="p-3.5 font-display font-bold text-ink">{c.code}</td>
                <td className="p-3.5 text-muted">
                  {c.discount_value}%{c.max_discount_cap ? ` (max ${formatPrice(c.max_discount_cap)})` : ""}
                </td>
                <td className="p-3.5 text-muted">{formatPrice(c.min_order_value)}</td>
                <td className="p-3.5 text-muted">{c.used_count}</td>
                <td className="p-3.5">
                  <button onClick={() => toggle(c)} title="Toggle active">
                    <Badge tone={c.is_active ? "success" : "neutral"}>{c.is_active ? "Active" : "Inactive"}</Badge>
                  </button>
                </td>
                <td className="p-3.5 text-right">
                  <button onClick={() => remove(c.id)} className="text-sm font-medium text-red-600 hover:underline">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {coupons.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-muted">
                  No coupons yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
