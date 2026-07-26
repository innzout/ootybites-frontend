"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAdminAuthStore } from "@/store/adminAuthStore";
import { Spinner } from "@/components/ui/Spinner";
import { BrandMark } from "@/components/ui/BrandMark";
import { cn } from "@/lib/cn";

const nav = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/dealers", label: "Dealers" },
  { href: "/admin/areas", label: "Areas" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/banners", label: "Banners" },
  { href: "/admin/coupons", label: "Coupons" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isAuthed = useAdminAuthStore((s) => s.isAuthenticated());
  const logout = useAdminAuthStore((s) => s.logout);

  // Wait for the persisted store to hydrate before deciding to redirect,
  // otherwise the first client render (token still null) bounces to login.
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  useEffect(() => {
    if (ready && !isAuthed) router.replace("/admin/login");
  }, [ready, isAuthed, router]);

  if (!ready || !isAuthed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <Spinner />
      </div>
    );
  }

  const signOut = () => {
    logout();
    router.replace("/admin/login");
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
        <div className="mb-6 px-1">
          <BrandMark subtitle="Admin" />
        </div>
        <nav className="flex flex-col gap-1">
          {nav.map((n) => (
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
          <button onClick={signOut} className="text-sm font-semibold text-muted">
            Logout
          </button>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-2">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className={cn(linkClass(n.href), "whitespace-nowrap")}>
              {n.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="flex-1 p-4 sm:p-6">{children}</main>
    </div>
  );
}
