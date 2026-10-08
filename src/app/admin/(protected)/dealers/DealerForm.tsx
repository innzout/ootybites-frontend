"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Dealer } from "@/types";
import { adminCreateDealer, adminUpdateDealer } from "@/lib/adminEndpoints";
import { ApiException } from "@/lib/api";
import { toast } from "@/lib/toast";
import { Input } from "@/components/ui/Input";
import { FormShell } from "@/components/admin/FormShell";

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
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const valid = form.name && form.mobile && form.username && (editing || form.password);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
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
        <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Input label="Mobile" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
        <div className="sm:col-span-2">
          <Input label="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </div>
        <Input label="Username (login)" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
        <Input
          label={editing ? "New password (leave blank to keep)" : "Password"}
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
      </div>
    </FormShell>
  );
}
