"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { adminCreateAdmin, adminUpdateAdmin, type AdminUser, type AdminRole } from "@/lib/adminEndpoints";
import { ApiException } from "@/lib/api";
import { toast } from "@/lib/toast";
import { Input } from "@/components/ui/Input";
import { FormShell } from "@/components/admin/FormShell";

const crumbs = (label: string) => [{ label: "Admins", href: "/admin/admins" }, { label }];

const roles: { value: AdminRole; label: string; hint: string }[] = [
  { value: "manager", label: "Manager", hint: "Full operational access — cannot manage admin users." },
  { value: "super_admin", label: "Super admin", hint: "Full access, including managing admin users." },
];

// Shared create/edit form for an admin user (full-screen route). Super-admin only
// (route-gated). Password is required on create, optional on edit.
export function AdminUserForm({ admin }: { admin?: AdminUser }) {
  const router = useRouter();
  const editing = !!admin;
  const [form, setForm] = useState({
    username: admin?.username ?? "",
    name: admin?.name ?? "",
    password: "",
    role: (admin?.role ?? "manager") as AdminRole,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const valid = form.username.trim().length >= 3 && (editing || form.password.length >= 8);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setErrors({});
    setSaving(true);
    try {
      const body = {
        username: form.username.trim(),
        name: form.name.trim() || null,
        password: form.password || undefined,
        role: form.role,
      };
      if (editing) {
        await adminUpdateAdmin(admin.id, body);
        toast.success("Admin updated");
      } else {
        await adminCreateAdmin(body);
        toast.success("Admin created");
      }
      router.push("/admin/admins");
    } catch (ex) {
      if (ex instanceof ApiException && ex.fields) setErrors(ex.fields);
      setError(ex instanceof ApiException ? ex.message : "Could not save admin");
      setSaving(false);
    }
  }

  const roleHint = roles.find((r) => r.value === form.role)?.hint;

  return (
    <FormShell
      title={editing ? `Edit ${admin.username}` : "New admin"}
      subtitle="Back-office user with a role that controls access."
      breadcrumbs={crumbs(editing ? "Edit" : "New")}
      backHref="/admin/admins"
      onSubmit={submit}
      saving={saving}
      disabled={!valid}
      submitLabel={editing ? "Save changes" : "Create admin"}
      error={error}
      maxWidth="max-w-2xl"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Username (login)"
          requiredMark
          value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value })}
          error={errors.username}
        />
        <Input label="Display name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Input
          label={editing ? "New password (leave blank to keep)" : "Password"}
          requiredMark={!editing}
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          error={errors.password}
          placeholder="At least 8 characters"
        />
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-ink">
            Role<span className="ml-0.5 text-red-500">*</span>
          </span>
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value as AdminRole })}
            className="h-10 rounded-xl border border-line bg-white px-3 text-sm text-ink outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/25"
          >
            {roles.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          {errors.role && <span className="text-xs text-red-600">{errors.role}</span>}
        </label>
      </div>
      {roleHint && <p className="mt-3 text-xs text-muted">{roleHint}</p>}
    </FormShell>
  );
}
