"use client";
import { askConfirm } from "@/lib/confirm";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil } from "lucide-react";
import type { ICellRendererParams } from "@/components/admin/gridHelpers";
import { adminListAdmins, adminDeleteAdmin, type AdminUser } from "@/lib/adminEndpoints";
import { ApiException } from "@/lib/api";
import { toast } from "@/lib/toast";
import { formatDate } from "@/lib/format";
import { useAdminAuthStore } from "@/store/adminAuthStore";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataGrid } from "@/components/admin/DataGrid";
import { col, actionCol } from "@/components/admin/gridHelpers";

export default function AdminAdminsPage() {
  const router = useRouter();
  const meId = useAdminAuthStore((s) => s.adminId);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    adminListAdmins().then((d) => setAdmins(d.admins ?? [])).finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function remove(a: AdminUser) {
    if (!(await askConfirm({ title: "Delete admin?", message: `${a.username} will lose all access.`, tone: "danger", confirmText: "Delete" }))) return;
    try {
      await adminDeleteAdmin(a.id);
      toast.success("Admin deleted");
      load();
    } catch (ex) {
      toast.error(ex instanceof ApiException ? ex.message : "Could not delete admin");
    }
  }

  if (loading)
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );

  const columnDefs = [
    col<AdminUser>("username", "Admin", {
      minWidth: 220,
      cellRenderer: (p: ICellRendererParams<AdminUser>) => {
        const a = p.data;
        if (!a) return null;
        return (
          <div className="leading-tight">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-ink">{a.username}</span>
              {a.id === meId && <Badge tone="brand">You</Badge>}
            </div>
            {a.name && <span className="text-xs text-muted">{a.name}</span>}
          </div>
        );
      },
    }),
    col<AdminUser>("role", "Role", {
      maxWidth: 160,
      cellRenderer: (p: ICellRendererParams<AdminUser>) =>
        p.value === "super_admin" ? (
          <Badge tone="success">Super admin</Badge>
        ) : (
          <Badge tone="neutral">Manager</Badge>
        ),
    }),
    col<AdminUser>("created_at", "Added", {
      minWidth: 140,
      cellRenderer: (p: ICellRendererParams<AdminUser>) => (
        <span className="text-muted">{p.value ? formatDate(String(p.value)) : "—"}</span>
      ),
    }),
    actionCol<AdminUser>("", (a) => (
      <div className="flex h-full items-center justify-end gap-2">
        <button
          onClick={() => router.push(`/admin/admins/${a.id}/edit`)}
          aria-label="Edit"
          className="rounded-full p-1.5 text-muted hover:bg-brand-50 hover:text-brand-600"
        >
          <Pencil className="h-4 w-4" />
        </button>
        {a.id !== meId && (
          <button
            onClick={() => remove(a)}
            className="rounded-full px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
          >
            Delete
          </button>
        )}
      </div>
    ), { minWidth: 160, maxWidth: 180 }),
  ];

  return (
    <div>
      <PageHeader
        title="Admins"
        subtitle="Back-office users and their roles"
        breadcrumbs={[{ label: "Admins" }]}
        action={
          <Button onClick={() => router.push("/admin/admins/new")}>
            <Plus className="h-4 w-4" /> Add admin
          </Button>
        }
      />
      <DataGrid<AdminUser>
        rowData={admins}
        columnDefs={columnDefs}
        getRowId={(a) => a.id}
        sortable
        pagination
        pageSize={10}
        emptyText="No admins yet."
      />
    </div>
  );
}
