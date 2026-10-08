"use client";
import { askConfirm } from "@/lib/confirm";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import type { ICellRendererParams } from "@/components/admin/gridHelpers";
import type { Vendor } from "@/types";
import { adminListVendors, adminUpdateVendor, adminDeleteVendor } from "@/lib/adminEndpoints";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataGrid } from "@/components/admin/DataGrid";
import { GridActions } from "@/components/admin/GridActions";
import { col, actionCol } from "@/components/admin/gridHelpers";

export default function AdminVendorsPage() {
  const router = useRouter();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    adminListVendors()
      .then((d) => setVendors(d.vendors ?? []))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function toggle(v: Vendor) {
    await adminUpdateVendor(v.id, {
      name: v.name,
      phone: v.phone ?? null,
      location: v.location,
      notes: v.notes ?? null,
      is_active: !v.is_active,
    });
    load();
  }

  async function remove(id: string) {
    if (!(await askConfirm({ title: "Delete vendor?", tone: "danger", confirmText: "Delete" }))) return;
    await adminDeleteVendor(id);
    load();
  }

  if (loading)
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );

  const columnDefs = [
    col<Vendor>("name", "Name", {
      minWidth: 180,
      cellRenderer: (p: ICellRendererParams<Vendor>) => (
        <div className="flex items-center gap-2">
          <span className="font-semibold text-ink">{p.value}</span>
          <Badge tone={p.data?.is_active ? "success" : "neutral"}>{p.data?.is_active ? "Active" : "Off"}</Badge>
        </div>
      ),
    }),
    col<Vendor>("location", "Location", { minWidth: 120 }),
    col<Vendor>("phone", "Phone", {
      minWidth: 130,
      cellRenderer: (p: ICellRendererParams<Vendor>) => <span className="text-muted">{p.value || "—"}</span>,
    }),
    col<Vendor>("notes", "Notes", {
      minWidth: 140,
      cellRenderer: (p: ICellRendererParams<Vendor>) => <span className="text-muted">{p.value || "—"}</span>,
    }),
    actionCol<Vendor>("", (v) => (
      <GridActions
        toggle={{ label: v.is_active ? "Disable" : "Enable", onClick: () => toggle(v) }}
        onEdit={() => router.push(`/admin/vendors/${v.id}/edit`)}
        onDelete={() => remove(v.id)}
      />
    ), { minWidth: 240, maxWidth: 260 }),
  ];

  return (
    <div>
      <PageHeader
        title="Vendors"
        subtitle="Suppliers in Ooty you buy stock from"
        breadcrumbs={[{ label: "Vendors" }]}
        action={
          <Button onClick={() => router.push("/admin/vendors/new")}>
            <Plus className="h-4 w-4" /> Add vendor
          </Button>
        }
      />
      <DataGrid<Vendor>
        rowData={vendors}
        columnDefs={columnDefs}
        getRowId={(v) => v.id}
        sortable
        pagination
        pageSize={10}
        emptyText="No vendors yet — add your first."
      />
    </div>
  );
}
