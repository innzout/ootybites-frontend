"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Coupon } from "@/types";
import { adminCreateCoupon, adminUpdateCoupon } from "@/lib/adminEndpoints";
import { ApiException } from "@/lib/api";
import { toast } from "@/lib/toast";
import { Input } from "@/components/ui/Input";
import { FormShell } from "@/components/admin/FormShell";
import { useFieldErrors } from "@/lib/useFieldErrors";
import { required, percent, nonNegativeNumber, optional, maxLength } from "@/lib/validators";

// percent mirrors the server rule (0 < value <= 100), so an out-of-range
// discount is caught here instead of after a failed round trip.
const schema = {
  code: [required, maxLength(40)],
  discount_value: [percent],
  min_order_value: [optional(nonNegativeNumber)],
  max_discount_cap: [optional(nonNegativeNumber)],
};
import { ProductMultiSelect } from "@/components/admin/ProductMultiSelect";

type Scope = "all" | "specific_products";

export function CouponForm({ coupon }: { coupon?: Coupon }) {
  const router = useRouter();
  const editing = !!coupon;
  const [form, setForm] = useState({
    code: coupon?.code ?? "",
    discount_value: coupon ? String(coupon.discount_value) : "",
    min_order_value: coupon?.min_order_value ? String(coupon.min_order_value) : "",
    max_discount_cap: coupon?.max_discount_cap ? String(coupon.max_discount_cap) : "",
    is_active: coupon?.is_active ?? true,
  });
  const [scope, setScope] = useState<Scope>(coupon?.applicable_scope === "specific_products" ? "specific_products" : "all");
  const [productIds, setProductIds] = useState<string[]>(coupon?.product_ids ?? []);
  const { errors, validateAll, revalidatePatch, validateOnBlur } = useFieldErrors(schema);
  function patch(p: Partial<typeof form>) {
    setForm((f) => ({ ...f, ...p }));
    revalidatePatch(p as Record<string, unknown>);
  }
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!validateAll(form)) return;
    if (scope === "specific_products" && productIds.length === 0) {
      setError("Select at least one product for a product-specific coupon");
      return;
    }
    setSaving(true);
    try {
      const body = {
        code: form.code,
        discount_value: Number(form.discount_value),
        min_order_value: Number(form.min_order_value || 0),
        max_discount_cap: form.max_discount_cap ? Number(form.max_discount_cap) : undefined,
        applicable_scope: scope,
        product_ids: scope === "specific_products" ? productIds : [],
        is_active: form.is_active,
      };
      if (editing) {
        await adminUpdateCoupon(coupon.id, {
          ...body,
          min_customer_lifetime_value: coupon.min_customer_lifetime_value,
          usage_limit_total: coupon.usage_limit_total ?? undefined,
          usage_limit_per_user: coupon.usage_limit_per_user ?? undefined,
        });
        toast.success("Coupon updated");
      } else {
        await adminCreateCoupon(body);
        toast.success("Coupon created");
      }
      router.push("/admin/coupons");
    } catch (ex) {
      setError(ex instanceof ApiException ? ex.message : "Could not save coupon");
      setSaving(false);
    }
  }

  return (
    <FormShell
      title={editing ? `Edit ${coupon.code}` : "New coupon"}
      subtitle="Percentage discount applied at checkout (server-validated)."
      breadcrumbs={[{ label: "Coupons", href: "/admin/coupons" }, { label: editing ? "Edit" : "New" }]}
      backHref="/admin/coupons"
      onSubmit={submit}
      saving={saving}
      disabled={!form.code || !form.discount_value}
      submitLabel={editing ? "Save changes" : "Create coupon"}
      error={error}
      maxWidth="max-w-3xl"
    >
      <div className="grid gap-4 sm:grid-cols-4">
        <Input label="Code" requiredMark value={form.code} onChange={(e) => patch({ code: e.target.value.toUpperCase() })} onBlur={() => validateOnBlur("code", form.code)} error={errors.code} />
        <Input label="Discount %" requiredMark inputMode="decimal" value={form.discount_value} onChange={(e) => patch({ discount_value: e.target.value })} onBlur={() => validateOnBlur("discount_value", form.discount_value)} error={errors.discount_value} />
        <Input label="Min order ₹" inputMode="decimal" value={form.min_order_value} onChange={(e) => patch({ min_order_value: e.target.value })} onBlur={() => validateOnBlur("min_order_value", form.min_order_value)} error={errors.min_order_value} />
        <Input label="Max cap ₹" inputMode="decimal" value={form.max_discount_cap} onChange={(e) => patch({ max_discount_cap: e.target.value })} onBlur={() => validateOnBlur("max_discount_cap", form.max_discount_cap)} error={errors.max_discount_cap} />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-[200px_1fr]">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-ink">Applies to</span>
          <select
            className="h-10 rounded-xl border border-line bg-white px-3 text-sm"
            value={scope}
            onChange={(e) => setScope(e.target.value as Scope)}
          >
            <option value="all">All products</option>
            <option value="specific_products">Specific products</option>
          </select>
        </label>
        {scope === "specific_products" && (
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-ink">Products</span>
            <ProductMultiSelect value={productIds} onChange={setProductIds} />
          </label>
        )}
      </div>

      <label className="mt-4 flex items-center gap-2 text-sm text-muted">
        <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
        Active (shown to customers)
      </label>
    </FormShell>
  );
}
