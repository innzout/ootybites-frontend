"use client";
import { askConfirm } from "@/lib/confirm";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import type { ICellRendererParams } from "@/components/admin/gridHelpers";
import type { Dealer } from "@/types";
import { adminListDealers, adminUpdateDealer, adminDeleteDealer } from "@/lib/adminEndpoints";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataGrid } from "@/components/admin/DataGrid";
import { GridActions } from "@/components/admin/GridActions";
import { col, actionCol } from "@/components/admin/gridHelpers";
import { LoadError } from "@/components/admin/LoadError";
import { runAdminAction } from "@/lib/adminAction";

export default function AdminDealersPage() {
  const router = useRouter();
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  function load() {
    setLoadError(false);
    adminListDealers()
      .then((d) => setDealers(d.dealers ?? []))
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function toggle(d: Dealer) {
    const ok = await runAdminAction(async () => {
      await adminUpdateDealer(d.id, {
        name: d.name,
        mobile: d.mobile,
        address: d.address ?? null,
        username: d.username,
        is_active: !d.is_active,
      });
    });
    if (ok) load();
  }

  async function remove(id: string) {
    if (!(await askConfirm({ title: "Delete dealer?", message: "Their assigned orders will be unassigned.", tone: "danger", confirmText: "Delete" }))) return;
    const ok = await runAdminAction(async () => {
      await adminDeleteDealer(id);
    });
    if (ok) load();
  }

  if (loading)
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  if (loadError)
    return (
      <LoadError
        what="dealers"
        onRetry={() => {
          setLoading(true);
          load();
        }}
      />
    );

  const columnDefs = [
    col<Dealer>("name", "Name", {
      minWidth: 180,
      cellRenderer: (p: ICellRendererParams<Dealer>) => (
        <div className="flex items-center gap-2">
          <span className="font-semibold text-ink">{p.value}</span>
          <Badge tone={p.data?.is_active ? "success" : "neutral"}>{p.data?.is_active ? "Active" : "Off"}</Badge>
        </div>
      ),
    }),
    col<Dealer>("mobile", "Contact", {
      minWidth: 200,
      cellRenderer: (p: ICellRendererParams<Dealer>) => (
        <span className="text-muted">
          {p.data?.mobile} · @{p.data?.username}
          {p.data?.address ? ` · ${p.data.address}` : ""}
        </span>
      ),
    }),
    actionCol<Dealer>("", (d) => (
      <GridActions
        toggle={{ label: d.is_active ? "Disable" : "Enable", onClick: () => toggle(d) }}
        onEdit={() => router.push(`/admin/dealers/${d.id}/edit`)}
        onDelete={() => remove(d.id)}
      />
    ), { minWidth: 240, maxWidth: 260 }),
  ];

  return (
    <div>
      <PageHeader
        title="Dealers"
        subtitle="Partners who fulfil assigned orders"
        breadcrumbs={[{ label: "Dealers" }]}
        action={
          <Button onClick={() => router.push("/admin/dealers/new")}>
            <Plus className="h-4 w-4" /> Add dealer
          </Button>
        }
      />
      <DataGrid<Dealer>
        rowData={dealers}
        columnDefs={columnDefs}
        getRowId={(d) => d.id}
        searchable="Search dealers by name, mobile or username"
        sortable
        pagination
        pageSize={10}
        emptyText="No dealers yet — add your first."
      />
    </div>
  );
}
