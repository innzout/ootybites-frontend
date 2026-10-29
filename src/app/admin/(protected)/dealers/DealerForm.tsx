"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Dealer } from "@/types";
import { adminCreateDealer, adminUpdateDealer } from "@/lib/adminEndpoints";
import { ApiException } from "@/lib/api";
import { toast } from "@/lib/toast";
import { Input } from "@/components/ui/Input";
import { FormShell } from "@/components/admin/FormShell";
import { useFieldErrors } from "@/lib/useFieldErrors";
import { required, phoneIN, minLength, maxLength } from "@/lib/validators";

// Password is validated conditionally in submit: required when creating,
// optional when editing (blank keeps the existing one).
const schema = {
  name: [required, maxLength(120)],
  mobile: [phoneIN],
  address: [maxLength(300)],
  username: [required, minLength(3), maxLength(60)],
};

const crumbs = (label: string) => [
  { label: "Dealers", href: "/admin/dealers" },
  { label },
];

// Shared create/edit form for a dealer (full-screen route).
export function DealerForm({ dealer }: { dealer?: Dealer }) {
  const router = useRouter();
  const editing = !!dealer;
  const [form, setForm] = useState({
    name: dealer?.name ?? "",
    mobile: dealer?.mobile ?? "",
    address: dealer?.address ?? "",
    username: dealer?.username ?? "",
    password: "",
  });
  const { errors, validateAll, revalidatePatch, validateOnBlur, setServerErrors } = useFieldErrors(schema);
  function patch(p: Partial<typeof form>) {
    setForm((f) => ({ ...f, ...p }));
    revalidatePatch(p as Record<string, unknown>);
  }
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const valid = form.name && form.mobile && form.username && (editing || form.password);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!validateAll(form)) return;
    // A new dealer must get a password; editing may leave it blank to keep it.
    if (!editing && form.password.trim().length < 8) {
      setServerErrors({ password: "Set a password of at least 8 characters" });
      return;
    }
    if (editing && form.password.trim() !== "" && form.password.trim().length < 8) {
      setServerErrors({ password: "Must be at least 8 characters" });
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await adminUpdateDealer(dealer.id, {
          name: form.name,
          mobile: form.mobile,
          address: form.address || null,
          username: form.username,
          password: form.password || undefined,
          is_active: dealer.is_active,
        });
        toast.success("Dealer updated");
      } else {
        await adminCreateDealer({ ...form, address: form.address || null, is_active: true });
        toast.success("Dealer added");
      }
      router.push("/admin/dealers");
    } catch (ex) {
      setError(ex instanceof ApiException ? ex.message : "Could not save dealer");
      setSaving(false);
    }
  }

  return (
    <FormShell
      title={editing ? `Edit ${dealer.name}` : "New dealer"}
      breadcrumbs={crumbs(editing ? "Edit" : "New")}
      backHref="/admin/dealers"
      onSubmit={submit}
      saving={saving}
      disabled={!valid}
      submitLabel={editing ? "Save changes" : "Add dealer"}
      error={error}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Name" requiredMark value={form.name} onChange={(e) => patch({ name: e.target.value })} onBlur={() => validateOnBlur("name", form.name)} error={errors.name} />
        <Input label="Mobile" requiredMark type="tel" inputMode="numeric" maxLength={10} value={form.mobile} onChange={(e) => patch({ mobile: e.target.value.replace(/\D/g, "").slice(0, 10) })} onBlur={() => validateOnBlur("mobile", form.mobile)} error={errors.mobile} />
        <div className="sm:col-span-2">
          <Input label="Address" value={form.address} onChange={(e) => patch({ address: e.target.value })} onBlur={() => validateOnBlur("address", form.address)} error={errors.address} />
        </div>
        <Input label="Username (login)" requiredMark autoComplete="off" value={form.username} onChange={(e) => patch({ username: e.target.value })} onBlur={() => validateOnBlur("username", form.username)} error={errors.username} />
        <Input
          label={editing ? "New password (leave blank to keep)" : "Password"}
          type="password"
          value={form.password}
          autoComplete="new-password"
          onChange={(e) => patch({ password: e.target.value })}
          error={errors.password}
        />
      </div>
    </FormShell>
  );
}
