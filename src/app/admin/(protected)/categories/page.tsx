"use client";
import { askConfirm } from "@/lib/confirm";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import type { ICellRendererParams } from "@/components/admin/gridHelpers";
import { adminListCategories, adminDeleteCategory } from "@/lib/adminEndpoints";
import type { Category } from "@/lib/endpoints";
import { ApiException } from "@/lib/api";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataGrid } from "@/components/admin/DataGrid";
import { GridActions } from "@/components/admin/GridActions";
import { col, actionCol } from "@/components/admin/gridHelpers";

export default function AdminCategoriesPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    adminListCategories().then((d) => setCategories(d.categories ?? [])).finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function remove(c: Category) {
    if (!(await askConfirm({ title: "Delete category?", message: `Products in ${c.name} become uncategorised.`, tone: "danger", confirmText: "Delete" }))) return;
    try {
      await adminDeleteCategory(c.id);
      toast.success("Category deleted");
      load();
    } catch (ex) {
      toast.error(ex instanceof ApiException ? ex.message : "Could not delete category");
    }
  }

  if (loading)
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );

  const columnDefs = [
    col<Category>("name", "Category", {
      minWidth: 200,
      cellRenderer: (p: ICellRendererParams<Category>) => (
        <div className="flex items-center gap-2">
          <span className="font-semibold text-ink">{p.value}</span>
          {!p.data?.is_active && <Badge tone="neutral">Hidden</Badge>}
        </div>
      ),
    }),
    col<Category>("slug", "Slug", {
      minWidth: 140,
      cellRenderer: (p: ICellRendererParams<Category>) => <span className="text-muted">{p.value}</span>,
    }),
    col<Category>("sort_order", "Order", { maxWidth: 100, cellRenderer: (p: ICellRendererParams<Category>) => <span className="text-muted">{p.value}</span> }),
    actionCol<Category>("", (c) => (
      <GridActions onEdit={() => router.push(`/admin/categories/${c.id}/edit`)} onDelete={() => remove(c)} />
    ), { minWidth: 160, maxWidth: 180 }),
  ];

  return (
    <div>
      <PageHeader
        title="Categories"
        subtitle="Product taxonomy shown as storefront filter chips"
        breadcrumbs={[{ label: "Categories" }]}
        action={
          <Button onClick={() => router.push("/admin/categories/new")}>
            <Plus className="h-4 w-4" /> Add category
          </Button>
        }
      />
      <DataGrid<Category>
        rowData={categories}
        columnDefs={columnDefs}
        getRowId={(c) => c.id}
        sortable
        pagination
        pageSize={10}
        emptyText="No categories yet — add your first."
      />
    </div>
  );
}
