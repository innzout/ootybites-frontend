"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAdminAuthStore } from "@/store/adminAuthStore";
import { useHydrated } from "@/lib/useHydrated";
import { Spinner } from "@/components/ui/Spinner";
import { BrandMark } from "@/components/ui/BrandMark";
import { NotificationBell } from "@/components/ui/NotificationBell";
import { adminListNotifications, adminMarkNotificationsRead, adminMe } from "@/lib/adminEndpoints";
import { cn } from "@/lib/cn";

const nav = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/express", label: "24-Hour Delivery" },
  { href: "/admin/dealers", label: "Dealers" },
  { href: "/admin/hubs", label: "Hubs" },
  { href: "/admin/areas", label: "Areas" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/inventory", label: "Inventory" },
  { href: "/admin/vendors", label: "Vendors" },
  { href: "/admin/banners", label: "Banners" },
  { href: "/admin/coupons", label: "Coupons" },
  { href: "/admin/pages", label: "Content" },
  { href: "/admin/league", label: "Game league" },
  { href: "/admin/admins", label: "Admins", superAdminOnly: true },
  { href: "/admin/settings", label: "Settings", superAdminOnly: true },
];

// Path prefixes only super-admins may open (managers get bounced).
const superAdminPaths = ["/admin/admins", "/admin/settings"];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isAuthed = useAdminAuthStore((s) => s.isAuthenticated());
  const logout = useAdminAuthStore((s) => s.logout);
  const role = useAdminAuthStore((s) => s.role);
  const setProfile = useAdminAuthStore((s) => s.setProfile);

  // Wait for the persisted store to actually finish rehydrating before deciding
  // to redirect — otherwise a valid session is bounced straight back to login.
  const ready = useHydrated(useAdminAuthStore);
  useEffect(() => {
    if (ready && !isAuthed) router.replace("/admin/login");
  }, [ready, isAuthed, router]);

  // Load the current admin's role once authenticated (drives nav + route gating).
  useEffect(() => {
    if (!isAuthed) return;
    adminMe()
      .then((m) => setProfile({ id: m.id, role: m.role, name: m.name }))
      .catch(() => {});
  }, [isAuthed, setProfile]);

  // Managers can't reach super-admin-only sections — bounce them out.
  useEffect(() => {
    const restricted = superAdminPaths.some((p) => pathname.startsWith(p));
    if (ready && isAuthed && role && role !== "super_admin" && restricted) {
      router.replace("/admin/dashboard");
    }
  }, [ready, isAuthed, role, pathname, router]);

  const visibleNav = nav.filter((n) => !n.superAdminOnly || role === "super_admin");

  if (!ready || !isAuthed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <Spinner />
      </div>
    );
  }

  // Log out → clear session and return to the storefront home.
  const signOut = () => {
    logout();
    router.replace("/");
  };

  const linkClass = (href: string) =>
    cn(
      "rounded-full px-3 py-2 text-sm font-semibold transition-colors",
      pathname.startsWith(href) ? "bg-brand-50 text-brand-700" : "text-muted hover:bg-brand-50 hover:text-brand-700",
    );

  return (
    <div className="flex min-h-screen flex-col bg-canvas sm:flex-row">
      {/* Desktop sidebar */}
      <aside className="hidden w-56 shrink-0 border-r border-line bg-white p-4 sm:block">
        {/* Brand only. The notification bell lives in the content top bar —
            sitting it here put it hard against the page breadcrumb, so the bell,
            the breadcrumb home icon and the chevron read as one icon soup. */}
        <div className="mb-6 px-1">
          <BrandMark subtitle="Admin" />
        </div>
        <nav className="flex flex-col gap-1">
          {visibleNav.map((n) => (
            <Link key={n.href} href={n.href} className={linkClass(n.href)}>
              {n.label}
            </Link>
          ))}
          <button onClick={signOut} className="mt-4 rounded-full px-3 py-2 text-left text-sm text-muted hover:bg-brand-50">
            Logout
          </button>
        </nav>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 border-b border-line bg-white/85 backdrop-blur-md sm:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <BrandMark size="sm" subtitle="Admin" />
          <div className="flex items-center gap-1">
            <NotificationBell fetchFeed={adminListNotifications} markRead={adminMarkNotificationsRead} tone="dark" hrefFor={(n) => (n.order_id ? `/admin/orders/${n.order_id}` : null)} />
            <button onClick={signOut} className="text-sm font-semibold text-muted">
              Logout
            </button>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-2">
          {visibleNav.map((n) => (
            <Link key={n.href} href={n.href} className={cn(linkClass(n.href), "whitespace-nowrap")}>
              {n.label}
            </Link>
          ))}
        </nav>
      </header>

      {/* Content column. min-w-0 so wide tables scroll inside the main region
          instead of stretching the flex row and pushing the sidebar off. */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Desktop top bar — notifications belong top-right, which is both the
            conventional position and clear of the page breadcrumb. */}
        <div className="hidden items-center justify-end border-b border-line bg-white px-6 py-2 sm:flex">
          <NotificationBell
            fetchFeed={adminListNotifications}
            markRead={adminMarkNotificationsRead}
            tone="dark"
            hrefFor={(n) => (n.order_id ? `/admin/orders/${n.order_id}` : null)}
          />
        </div>
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
