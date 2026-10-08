"use client";
import { askConfirm } from "@/lib/confirm";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import type { ICellRendererParams } from "@/components/admin/gridHelpers";
import type { Coupon } from "@/types";
import { adminListCoupons, adminUpdateCoupon, adminDeleteCoupon } from "@/lib/adminEndpoints";
import { formatPrice } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataGrid } from "@/components/admin/DataGrid";
import { GridActions } from "@/components/admin/GridActions";
import { col, actionCol } from "@/components/admin/gridHelpers";

export default function AdminCouponsPage() {
  const router = useRouter();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    adminListCoupons()
      .then((d) => setCoupons(d.coupons ?? []))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function toggle(c: Coupon) {
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

  const columnDefs = [
    col<Coupon>("code", "Code", {
      minWidth: 140,
      cellRenderer: (p: ICellRendererParams<Coupon>) => <span className="font-semibold text-ink">{p.value}</span>,
    }),
    col<Coupon>("discount_value", "Discount", {
      minWidth: 140,
      cellRenderer: (p: ICellRendererParams<Coupon>) => (
        <span className="text-muted">
          {p.data?.discount_value}%{p.data?.max_discount_cap ? ` (max ${formatPrice(p.data.max_discount_cap)})` : ""}
        </span>
      ),
    }),
    col<Coupon>("min_order_value", "Min order", {
      maxWidth: 130,
      cellRenderer: (p: ICellRendererParams<Coupon>) => <span className="text-muted">{formatPrice(Number(p.value))}</span>,
    }),
    col<Coupon>("used_count", "Used", { maxWidth: 90 }),
    col<Coupon>("is_active", "Active", {
      maxWidth: 120,
      cellRenderer: (p: ICellRendererParams<Coupon>) =>
        p.data ? (
          <button onClick={() => toggle(p.data!)} title="Toggle active">
            <Badge tone={p.data.is_active ? "success" : "neutral"}>{p.data.is_active ? "Active" : "Inactive"}</Badge>
          </button>
        ) : null,
    }),
    actionCol<Coupon>("", (c) => (
      <GridActions onEdit={() => router.push(`/admin/coupons/${c.id}/edit`)} onDelete={() => remove(c.id)} />
    ), { minWidth: 150, maxWidth: 170 }),
  ];

  return (
    <div>
      <PageHeader
        title="Coupons"
        subtitle="Percentage discounts across the store"
        breadcrumbs={[{ label: "Coupons" }]}
        action={
          <Button onClick={() => router.push("/admin/coupons/new")}>
            <Plus className="h-4 w-4" /> Add coupon
          </Button>
        }
      />
      <DataGrid<Coupon>
        rowData={coupons}
        columnDefs={columnDefs}
        getRowId={(c) => c.id}
        sortable
        pagination
        pageSize={10}
        emptyText="No coupons yet — add your first."
      />
    </div>
  );
}
