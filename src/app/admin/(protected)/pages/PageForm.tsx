"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { adminCreatePage, adminUpdatePage } from "@/lib/adminEndpoints";
import type { Page } from "@/lib/endpoints";
import { ApiException } from "@/lib/api";
import { toast } from "@/lib/toast";
import { Input } from "@/components/ui/Input";
import { FormShell } from "@/components/admin/FormShell";

const crumbs = (label: string) => [{ label: "Content", href: "/admin/pages" }, { label }];

// Shared create/edit form for a CMS content page.
export function PageForm({ page }: { page?: Page }) {
  const router = useRouter();
  const editing = !!page;
  const [form, setForm] = useState({
    slug: page?.slug ?? "",
    title: page?.title ?? "",
    body: page?.body ?? "",
    is_published: page?.is_published ?? true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const valid = form.slug.trim() && form.title.trim();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setErrors({});
    setSaving(true);
    try {
      const body = { slug: form.slug.trim(), title: form.title.trim(), body: form.body, is_published: form.is_published };
      if (editing) {
        await adminUpdatePage(page.id, body);
        toast.success("Page updated");
      } else {
        await adminCreatePage(body);
        toast.success("Page created");
      }
      router.push("/admin/pages");
    } catch (ex) {
      if (ex instanceof ApiException && ex.fields) setErrors(ex.fields);
      setError(ex instanceof ApiException ? ex.message : "Could not save page");
      setSaving(false);
    }
  }

  return (
    <FormShell
      title={editing ? `Edit ${page.title}` : "New page"}
      subtitle="Content shown on the storefront. Reachable at /pages/<slug> (Terms & Privacy also link here)."
      breadcrumbs={crumbs(editing ? "Edit" : "New")}
      backHref="/admin/pages"
      onSubmit={submit}
      saving={saving}
      disabled={!valid}
      submitLabel={editing ? "Save changes" : "Create page"}
      error={error}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Title" requiredMark value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} error={errors.title} />
        <Input
          label="Slug (URL)"
          requiredMark
          value={form.slug}
          onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") })}
          error={errors.slug}
          placeholder="terms"
        />
      </div>

      <div className="mt-4 flex flex-col gap-1">
        <span className="text-sm font-medium text-ink">Body</span>
        <textarea
          value={form.body}
          onChange={(e) => setForm({ ...form, body: e.target.value })}
          rows={16}
          placeholder={"# Heading\n\nA paragraph of text.\n\n## Subheading\n\n- A bullet\n- Another bullet\n\n**Bold** words are supported."}
          className="rounded-xl border border-line bg-white px-3 py-2 font-mono text-sm text-ink outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25"
        />
        <span className="text-xs text-muted">
          Lightweight markdown: <code># </code>/<code>## </code> headings, <code>- </code> bullet lists,{" "}
          <code>**bold**</code>, blank line between paragraphs.
        </span>
      </div>

      <label className="mt-4 flex items-center gap-2 text-sm text-muted">
        <input type="checkbox" checked={form.is_published} onChange={(e) => setForm({ ...form, is_published: e.target.checked })} />
        Published (visible on the storefront)
      </label>
    </FormShell>
  );
}
