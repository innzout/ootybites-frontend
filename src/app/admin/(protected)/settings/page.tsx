"use client";

import { useEffect, useState } from "react";
import { adminGetSettings, adminUpdateSettings } from "@/lib/adminEndpoints";
import type { StoreSettings } from "@/lib/endpoints";
import { ApiException } from "@/lib/api";
import { toast } from "@/lib/toast";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { FormShell } from "@/components/admin/FormShell";

// Store settings — the single-row config editor (super-admin only, route-gated).
export default function AdminSettingsPage() {
  const [form, setForm] = useState<StoreSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminGetSettings()
      .then(setForm)
      .catch(() => setError("Could not load settings"));
  }, []);

  function set<K extends keyof StoreSettings>(key: K, value: StoreSettings[K]) {
    setForm((f) => (f ? { ...f, [key]: value } : f));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    setError(null);
    try {
      const saved = await adminUpdateSettings(form);
      setForm(saved);
      toast.success("Settings saved");
    } catch (ex) {
      setError(ex instanceof ApiException ? ex.message : "Could not save settings");
    } finally {
      setSaving(false);
    }
  }

  if (!form) {
    return (
      <div className="flex justify-center py-20">
        {error ? <p className="text-muted">{error}</p> : <Spinner />}
      </div>
    );
  }

  return (
    <FormShell
      title="Store settings"
      subtitle="Store profile, contact details and delivery copy shown across the storefront."
      breadcrumbs={[{ label: "Settings" }]}
      backHref="/admin/dashboard"
      onSubmit={submit}
      saving={saving}
      submitLabel="Save settings"
      error={error}
      maxWidth="max-w-2xl"
    >
      <Section title="Store profile">
        <Input label="Store name" value={form.store_name} onChange={(e) => set("store_name", e.target.value)} />
        <Input label="Tagline" value={form.tagline} onChange={(e) => set("tagline", e.target.value)} />
      </Section>

      <Section title="Contact">
        <Input label="Support email" type="email" value={form.support_email} onChange={(e) => set("support_email", e.target.value)} placeholder="hello@example.com" />
        <Input label="Support phone" value={form.support_phone} onChange={(e) => set("support_phone", e.target.value)} placeholder="+91…" />
        <div className="sm:col-span-2">
          <Input label="Store address" value={form.store_address} onChange={(e) => set("store_address", e.target.value)} />
        </div>
      </Section>

      <Section title="Delivery copy (storefront)">
        <Input label="Express delivery text" value={form.express_delivery_text} onChange={(e) => set("express_delivery_text", e.target.value)} placeholder="Delivered within 24 hours" />
        <Input label="Standard delivery text" value={form.standard_delivery_text} onChange={(e) => set("standard_delivery_text", e.target.value)} placeholder="Arrives in 3–5 days" />
        <div className="sm:col-span-2">
          <Input label="Cash-on-delivery note" value={form.cod_note} onChange={(e) => set("cod_note", e.target.value)} />
        </div>
      </Section>

      <Section title="Orders">
        <Input label="Order number prefix" value={form.order_number_prefix} onChange={(e) => set("order_number_prefix", e.target.value.toUpperCase())} placeholder="OB" />
      </Section>
    </FormShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5 last:mb-0">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">{title}</h2>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </div>
  );
}
