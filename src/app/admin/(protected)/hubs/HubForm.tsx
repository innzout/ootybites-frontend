"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { Hub, Dealer } from "@/types";
import { adminCreateHub, adminUpdateHub, adminListDealers } from "@/lib/adminEndpoints";
import { ApiException } from "@/lib/api";
import { toast } from "@/lib/toast";
import { Input } from "@/components/ui/Input";
import { FormShell } from "@/components/admin/FormShell";

export function HubForm({ hub }: { hub?: Hub }) {
  const router = useRouter();
  const editing = !!hub;
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [name, setName] = useState(hub?.name ?? "");
  const [dealerId, setDealerId] = useState(hub?.dealer_id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminListDealers().then((d) => setDealers(d.dealers ?? [])).catch(() => setDealers([]));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      if (editing) {
        await adminUpdateHub(hub.id, { name, dealer_id: dealerId || null, is_active: hub.is_active });
        toast.success("Hub updated");
      } else {
        await adminCreateHub({ name, dealer_id: dealerId || null, is_active: true });
        toast.success("Hub created");
      }
      router.push("/admin/hubs");
    } catch (ex) {
      setError(ex instanceof ApiException ? ex.message : "Could not save hub");
      setSaving(false);
    }
  }

  return (
    <FormShell
      title={editing ? `Edit ${hub.name}` : "New hub"}
      subtitle="A hub is a fulfilment centre run by a dealer. After saving, use Manage to assign areas and receive stock."
      breadcrumbs={[{ label: "Hubs", href: "/admin/hubs" }, { label: editing ? "Edit" : "New" }]}
      backHref="/admin/hubs"
      onSubmit={submit}
      saving={saving}
      disabled={!name.trim()}
      submitLabel={editing ? "Save changes" : "Add hub"}
      error={error}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Hub name" placeholder="Siruseri Hub" value={name} onChange={(e) => setName(e.target.value)} />
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-ink">Dealer</span>
          <select className="h-10 rounded-xl border border-line bg-white px-3 text-sm" value={dealerId} onChange={(e) => setDealerId(e.target.value)}>
            <option value="">— None —</option>
            {dealers.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </label>
      </div>
    </FormShell>
  );
}
