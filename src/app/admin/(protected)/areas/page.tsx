"use client";
import { askConfirm } from "@/lib/confirm";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import type { ICellRendererParams } from "@/components/admin/gridHelpers";
import type { Area, Hub } from "@/types";
import { adminListAreas, adminUpdateArea, adminDeleteArea, adminListHubs } from "@/lib/adminEndpoints";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataGrid } from "@/components/admin/DataGrid";
import { GridActions } from "@/components/admin/GridActions";
import { col, actionCol } from "@/components/admin/gridHelpers";

export default function AdminAreasPage() {
  const router = useRouter();
  const [areas, setAreas] = useState<Area[]>([]);
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    adminListAreas()
      .then((d) => setAreas(d.areas ?? []))
      .finally(() => setLoading(false));
  }
  useEffect(() => {
    load();
    adminListHubs().then((d) => setHubs(d.hubs ?? [])).catch(() => setHubs([]));
  }, []);

  // Quick inline hub reassignment straight from the row.
  async function setHub(a: Area, hubId: string) {
    await adminUpdateArea(a.id, {
      code: a.code,
      name: a.name,
      city: a.city,
      pincode: a.pincode,
      hub_id: hubId || null,
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

  const columnDefs = [
    col<Area>("code", "Code", {
      maxWidth: 110,
      cellRenderer: (p: ICellRendererParams<Area>) => <Badge tone="brand">{p.value}</Badge>,
    }),
    col<Area>("name", "Area", {
      minWidth: 150,
      cellRenderer: (p: ICellRendererParams<Area>) => <span className="font-semibold text-ink">{p.value}</span>,
    }),
    col<Area>("pincode", "Pincode", { maxWidth: 120 }),
    col<Area>("hub_name", "Hub", {
      minWidth: 180,
      cellRenderer: (p: ICellRendererParams<Area>) =>
        p.data ? (
          <select
            value={p.data.hub_id ?? ""}
            onChange={(e) => setHub(p.data!, e.target.value)}
            className="h-8 rounded-lg border border-line bg-white px-2 text-sm"
            title="Quick-assign hub"
          >
            <option value="">— None —</option>
            {hubs.map((h) => (
              <option key={h.id} value={h.id} disabled={!h.is_active}>{h.name}</option>
            ))}
          </select>
        ) : null,
    }),
    actionCol<Area>("", (a) => (
      <GridActions onEdit={() => router.push(`/admin/areas/${a.id}/edit`)} onDelete={() => remove(a.id)} />
    ), { minWidth: 150, maxWidth: 170 }),
  ];

  return (
    <div>
      <PageHeader
        title="Areas"
        subtitle="A pincode belongs to one hub — orders from it auto-route to that hub (Chennai)"
        breadcrumbs={[{ label: "Areas" }]}
        action={
          <Button onClick={() => router.push("/admin/areas/new")}>
            <Plus className="h-4 w-4" /> Add area
          </Button>
        }
      />
      <DataGrid<Area>
        rowData={areas}
        columnDefs={columnDefs}
        getRowId={(a) => a.id}
        sortable
        pagination
        pageSize={10}
        emptyText="No areas yet — add your first."
      />
    </div>
  );
}
