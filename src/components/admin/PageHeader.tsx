import { Breadcrumbs, type Crumb } from "@/components/admin/Breadcrumbs";

// PageHeader — consistent admin page header: an optional breadcrumb trail, a
// clean sans title (DM Sans), an optional subtitle, and a right-side action.
export function PageHeader({
  title,
  subtitle,
  action,
  breadcrumbs,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  breadcrumbs?: Crumb[];
}) {
  return (
    <div className="mb-6">
      {breadcrumbs && breadcrumbs.length > 0 && <Breadcrumbs items={breadcrumbs} />}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-sans text-2xl font-bold tracking-tight text-ink">{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
        </div>
        {action}
      </div>
    </div>
  );
}
