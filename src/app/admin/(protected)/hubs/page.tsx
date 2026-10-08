"use client";
import { askConfirm } from "@/lib/confirm";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Settings2 } from "lucide-react";
import type { ICellRendererParams } from "@/components/admin/gridHelpers";
import type { Hub } from "@/types";
import { adminListHubs, adminUpdateHub, adminDeleteHub } from "@/lib/adminEndpoints";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataGrid } from "@/components/admin/DataGrid";
import { GridActions } from "@/components/admin/GridActions";
import { col, actionCol } from "@/components/admin/gridHelpers";

export default function AdminHubsPage() {
  const router = useRouter();
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    adminListHubs().then((d) => setHubs(d.hubs ?? [])).finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function toggle(h: Hub) {
    await adminUpdateHub(h.id, { name: h.name, dealer_id: h.dealer_id ?? null, is_active: !h.is_active });
    load();
  }

  async function remove(id: string) {
    if (!(await askConfirm({ title: "Delete hub?", message: "Its areas become unassigned.", tone: "danger", confirmText: "Delete" }))) return;
    await adminDeleteHub(id);
    load();
  }

  if (loading)
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );

  const columnDefs = [
    col<Hub>("name", "Hub", {
      minWidth: 180,
      cellRenderer: (p: ICellRendererParams<Hub>) => (
        <div className="flex items-center gap-2">
          <span className="font-semibold text-ink">{p.value}</span>
          <Badge tone={p.data?.is_active ? "success" : "neutral"}>{p.data?.is_active ? "Active" : "Off"}</Badge>
        </div>
      ),
    }),
    col<Hub>("dealer_name", "Dealer", {
      minWidth: 150,
      cellRenderer: (p: ICellRendererParams<Hub>) => <span className="text-muted">{p.value ?? "—"}</span>,
    }),
    col<Hub>("area_count", "Areas", {
      maxWidth: 100,
      cellRenderer: (p: ICellRendererParams<Hub>) => (
        <span className="text-muted">{p.value} area{p.value === 1 ? "" : "s"}</span>
      ),
    }),
    actionCol<Hub>("", (h) => (
      <div className="flex h-full items-center justify-end gap-2">
        <button
          onClick={() => router.push(`/admin/hubs/${h.id}/manage`)}
          className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-100"
        >
          <Settings2 className="h-3 w-3" /> Manage
        </button>
        <GridActions
          toggle={{ label: h.is_active ? "Disable" : "Enable", onClick: () => toggle(h) }}
          onEdit={() => router.push(`/admin/hubs/${h.id}/edit`)}
          onDelete={() => remove(h.id)}
        />
      </div>
    ), { minWidth: 340, maxWidth: 360 }),
  ];

  return (
    <div>
      <PageHeader
        title="Hubs"
        subtitle="Fulfilment centres — each runs by a dealer, serves areas, holds stock for 24h delivery"
        breadcrumbs={[{ label: "Hubs" }]}
        action={
          <Button onClick={() => router.push("/admin/hubs/new")}>
            <Plus className="h-4 w-4" /> Add hub
          </Button>
        }
      />
      <DataGrid<Hub>
        rowData={hubs}
        columnDefs={columnDefs}
        getRowId={(h) => h.id}
        sortable
        pagination
        pageSize={10}
        emptyText="No hubs yet — add your first."
      />
    </div>
  );
}
