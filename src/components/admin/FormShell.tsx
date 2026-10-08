"use client";

import { useRouter } from "next/navigation";
import { Breadcrumbs, type Crumb } from "@/components/admin/Breadcrumbs";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

// FormShell — the standard full-screen admin create/edit page: breadcrumb trail,
// a clean sans title, the form body in a card, and a sticky action bar with
// Cancel (back to the list) + Save. Only confirmations are pop-ups; forms are
// full screens (ifacx pattern).
export function FormShell({
  title,
  subtitle,
  breadcrumbs,
  backHref,
  onSubmit,
  saving,
  submitLabel = "Save",
  disabled,
  error,
  children,
  maxWidth = "max-w-3xl",
}: {
  title: string;
  subtitle?: string;
  breadcrumbs: Crumb[];
  backHref: string;
  onSubmit: (e: React.FormEvent) => void;
  saving?: boolean;
  submitLabel?: string;
  disabled?: boolean;
  error?: string | null;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  const router = useRouter();
  return (
    <div className={maxWidth}>
      <Breadcrumbs items={breadcrumbs} />
      <h1 className="mb-6 font-sans text-2xl font-bold tracking-tight text-ink">{title}</h1>

      <form onSubmit={onSubmit}>
        <Card className="p-5 sm:p-6">
          {subtitle && <p className="mb-4 text-sm text-muted">{subtitle}</p>}
          {children}
          {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        </Card>

        <div className="sticky bottom-0 mt-4 flex items-center justify-end gap-2 rounded-2xl border border-line bg-white/90 px-4 py-3 backdrop-blur">
          <Button type="button" variant="ghost" onClick={() => router.push(backHref)}>
            Cancel
          </Button>
          <Button type="submit" loading={saving} disabled={disabled}>
            {submitLabel}
          </Button>
        </div>
      </form>
    </div>
  );
}
