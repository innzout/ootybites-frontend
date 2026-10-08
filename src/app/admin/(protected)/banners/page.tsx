"use client";
import { askConfirm } from "@/lib/confirm";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import type { ICellRendererParams } from "@/components/admin/gridHelpers";
import type { Banner } from "@/types";
import { adminListBanners, adminUpdateBanner, adminDeleteBanner } from "@/lib/adminEndpoints";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataGrid } from "@/components/admin/DataGrid";
import { GridActions } from "@/components/admin/GridActions";
import { col, actionCol } from "@/components/admin/gridHelpers";

export default function AdminBannersPage() {
  const router = useRouter();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    adminListBanners()
      .then((d) => setBanners(d.banners ?? []))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function toggleVisible(b: Banner) {
    await adminUpdateBanner(b.id, {
      image_url: b.image_url,
      title: b.title ?? null,
      link_url: b.link_url ?? null,
      sort_order: b.sort_order,
      is_active: !b.is_active,
    });
    load();
  }

  async function remove(id: string) {
    if (!(await askConfirm({ title: "Delete banner?", tone: "danger", confirmText: "Delete" }))) return;
    await adminDeleteBanner(id);
    load();
  }

  if (loading)
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );

  const columnDefs = [
    col<Banner>("image_url", "Image", {
      maxWidth: 120,
      sortable: false,
      cellRenderer: (p: ICellRendererParams<Banner>) => (
        <div className="flex h-full items-center">
          <div className="h-9 w-16 overflow-hidden rounded-md bg-brand-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={String(p.value)} alt="" className="h-full w-full object-cover" />
          </div>
        </div>
      ),
    }),
    col<Banner>("title", "Title", {
      minWidth: 160,
      cellRenderer: (p: ICellRendererParams<Banner>) => (
        <span className="font-semibold text-ink">{p.value || <span className="font-normal text-muted">—</span>}</span>
      ),
    }),
    col<Banner>("link_url", "Link", {
      minWidth: 180,
      cellRenderer: (p: ICellRendererParams<Banner>) => <span className="truncate text-muted">{p.value ? `→ ${p.value}` : "—"}</span>,
    }),
    col<Banner>("sort_order", "Sort", { maxWidth: 90 }),
    col<Banner>("is_active", "Status", {
      maxWidth: 110,
      cellRenderer: (p: ICellRendererParams<Banner>) => (
        <Badge tone={p.value ? "success" : "neutral"}>{p.value ? "Active" : "Hidden"}</Badge>
      ),
    }),
    actionCol<Banner>("", (b) => (
      <GridActions
        toggle={{ label: b.is_active ? "Hide" : "Show", onClick: () => toggleVisible(b) }}
        onEdit={() => router.push(`/admin/banners/${b.id}/edit`)}
        onDelete={() => remove(b.id)}
      />
    ), { minWidth: 240, maxWidth: 260 }),
  ];

  return (
    <div>
      <PageHeader
        title="Banners"
        subtitle="Promo images shown on the storefront home"
        breadcrumbs={[{ label: "Banners" }]}
        action={
          <Button onClick={() => router.push("/admin/banners/new")}>
            <Plus className="h-4 w-4" /> Add banner
          </Button>
        }
      />
      <DataGrid<Banner>
        rowData={banners}
        columnDefs={columnDefs}
        getRowId={(b) => b.id}
        sortable
        pagination
        pageSize={10}
        emptyText="No banners yet — add your first."
      />
    </div>
  );
}
