import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

export interface Crumb {
  label: string;
  href?: string;
}

// Breadcrumbs — top-of-screen trail on every admin page (ifacx pattern).
// The first item is always Home (dashboard); the last is the current screen.
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  // The home link points at the dashboard, so a lone "Dashboard" crumb would
  // render "Home > Dashboard" — a trail whose every step is the current page.
  // Render nothing rather than that.
  if (items.length === 0 || (items.length === 1 && items[0].label === "Dashboard")) {
    return null;
  }

  return (
    <nav aria-label="Breadcrumb" className="mb-3 flex items-center gap-1.5 text-sm text-muted">
      <Link href="/admin/dashboard" className="flex items-center gap-1 hover:text-brand-600" aria-label="Dashboard home">
        <Home className="h-4 w-4" />
      </Link>
      {items.map((c, i) => {
        const last = i === items.length - 1;
        return (
          <span key={i} className="flex items-center gap-1.5">
            {/* text-line (#e7e9ea) was effectively invisible on white; the
                separator has to be legible for the trail to read as a trail. */}
            <ChevronRight className="h-3.5 w-3.5 text-muted/50" />
            {c.href && !last ? (
              <Link href={c.href} className="hover:text-brand-600">
                {c.label}
              </Link>
            ) : (
              <span className={last ? "font-semibold text-ink" : ""}>{c.label}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
