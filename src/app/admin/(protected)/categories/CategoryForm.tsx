"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { adminCreateCategory, adminUpdateCategory } from "@/lib/adminEndpoints";
import type { Category } from "@/lib/endpoints";
import { ApiException } from "@/lib/api";
import { toast } from "@/lib/toast";
import { Input } from "@/components/ui/Input";
import { FormShell } from "@/components/admin/FormShell";

const crumbs = (label: string) => [{ label: "Categories", href: "/admin/categories" }, { label }];
const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

// Shared create/edit form for a product category.
export function CategoryForm({ category }: { category?: Category }) {
  const router = useRouter();
  const editing = !!category;
  const [form, setForm] = useState({
    name: category?.name ?? "",
    slug: category?.slug ?? "",
    sort_order: category ? String(category.sort_order) : "0",
    is_active: category?.is_active ?? true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function setName(name: string) {
    // Auto-fill slug from the name until the user edits the slug directly.
    setForm((f) => ({ ...f, name, slug: !editing && (f.slug === "" || f.slug === slugify(f.name)) ? slugify(name) : f.slug }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setErrors({});
    setSaving(true);
    try {
      const body = { name: form.name.trim(), slug: form.slug.trim(), sort_order: Number(form.sort_order) || 0, is_active: form.is_active };
      if (editing) {
        await adminUpdateCategory(category.id, body);
        toast.success("Category updated");
      } else {
        await adminCreateCategory(body);
        toast.success("Category created");
      }
      router.push("/admin/categories");
    } catch (ex) {
      if (ex instanceof ApiException && ex.fields) setErrors(ex.fields);
      setError(ex instanceof ApiException ? ex.message : "Could not save category");
      setSaving(false);
    }
  }

  return (
    <FormShell
      title={editing ? `Edit ${category.name}` : "New category"}
      subtitle="Groups products for storefront browsing (shown as filter chips)."
      breadcrumbs={crumbs(editing ? "Edit" : "New")}
      backHref="/admin/categories"
      onSubmit={submit}
      saving={saving}
      disabled={!form.name.trim() || !form.slug.trim()}
      submitLabel={editing ? "Save changes" : "Create category"}
      error={error}
      maxWidth="max-w-xl"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Name" requiredMark value={form.name} onChange={(e) => setName(e.target.value)} error={errors.name} />
        <Input
          label="Slug"
          requiredMark
          value={form.slug}
          onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })}
          error={errors.slug}
          placeholder="teas"
        />
        <Input label="Sort order" type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} />
      </div>
      <label className="mt-4 flex items-center gap-2 text-sm text-muted">
        <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
        Active (shown on the storefront)
      </label>
    </FormShell>
  );
}
