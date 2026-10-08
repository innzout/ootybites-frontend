"use client";
import { askConfirm } from "@/lib/confirm";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, ExternalLink } from "lucide-react";
import type { ICellRendererParams } from "@/components/admin/gridHelpers";
import { adminListPages, adminDeletePage } from "@/lib/adminEndpoints";
import type { Page } from "@/lib/endpoints";
import { ApiException } from "@/lib/api";
import { toast } from "@/lib/toast";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { PageHeader } from "@/components/admin/PageHeader";
import { DataGrid } from "@/components/admin/DataGrid";
import { GridActions } from "@/components/admin/GridActions";
import { col, actionCol } from "@/components/admin/gridHelpers";

export default function AdminPagesPage() {
  const router = useRouter();
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    adminListPages().then((d) => setPages(d.pages ?? [])).finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function remove(p: Page) {
    if (!(await askConfirm({ title: "Delete page?", message: `${p.title} will be removed from the storefront.`, tone: "danger", confirmText: "Delete" }))) return;
    try {
      await adminDeletePage(p.id);
      toast.success("Page deleted");
      load();
    } catch (ex) {
      toast.error(ex instanceof ApiException ? ex.message : "Could not delete page");
    }
  }

  if (loading)
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );

  const columnDefs = [
    col<Page>("title", "Page", {
      minWidth: 240,
      cellRenderer: (p: ICellRendererParams<Page>) => {
        const pg = p.data;
        if (!pg) return null;
        return (
          <div className="leading-tight">
            <span className="font-semibold text-ink">{pg.title}</span>
            <a
              href={`/pages/${pg.slug}`}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="ml-2 inline-flex items-center gap-0.5 text-xs text-brand-600 hover:underline"
            >
              /pages/{pg.slug} <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        );
      },
    }),
    col<Page>("is_published", "Status", {
      maxWidth: 140,
      cellRenderer: (p: ICellRendererParams<Page>) =>
        p.value ? <Badge tone="success">Published</Badge> : <Badge tone="neutral">Draft</Badge>,
    }),
    col<Page>("updated_at", "Updated", {
      minWidth: 140,
      cellRenderer: (p: ICellRendererParams<Page>) => (
        <span className="text-muted">{p.value ? formatDate(String(p.value)) : "—"}</span>
      ),
    }),
    actionCol<Page>("", (p) => (
      <GridActions onEdit={() => router.push(`/admin/pages/${p.id}/edit`)} onDelete={() => remove(p)} />
    ), { minWidth: 160, maxWidth: 180 }),
  ];

  return (
    <div>
      <PageHeader
        title="Content"
        subtitle="Storefront content pages (Terms, Privacy, and any custom pages)"
        breadcrumbs={[{ label: "Content" }]}
        action={
          <Button onClick={() => router.push("/admin/pages/new")}>
            <Plus className="h-4 w-4" /> Add page
          </Button>
        }
      />
      <DataGrid<Page>
        rowData={pages}
        columnDefs={columnDefs}
        getRowId={(p) => p.id}
        sortable
        pagination
        pageSize={10}
        onRowClicked={(p) => router.push(`/admin/pages/${p.id}/edit`)}
        emptyText="No pages yet."
      />
    </div>
  );
}
