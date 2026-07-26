"use client";

import Link from "next/link";
import { useCartStore } from "@/store/cartStore";
import { useAuthStore } from "@/store/authStore";
import { BrandMark } from "@/components/ui/BrandMark";

// Navbar — shop header (Deep Green, matching the logo) with a live cart count.
export function Navbar() {
  const count = useCartStore((s) => s.count());
  const isAuthed = useAuthStore((s) => s.isAuthenticated());
  const logout = useAuthStore((s) => s.logout);

  const link = "rounded-full px-3 py-2 text-cream/80 transition-colors hover:bg-white/10 hover:text-white";

  return (
    <header className="sticky top-0 z-30 bg-brand-800">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/">
          <BrandMark tone="onDark" />
        </Link>
        <div className="flex items-center gap-1.5 text-sm font-semibold">
          <Link href="/" className={link}>
            Shop
          </Link>
          <Link href="/orders" className={link}>
            Orders
          </Link>
          <Link href="/cart" className={`relative ${link}`}>
            Cart
            {count > 0 && (
              <span className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-500 px-1 text-[10px] font-bold text-white">
                {count}
              </span>
            )}
          </Link>
          {isAuthed ? (
            <button onClick={logout} className={link}>
              Logout
            </button>
          ) : (
            <Link
              href="/login"
              className="ml-1 rounded-full bg-accent-500 px-4 py-2 font-semibold text-white shadow-sm transition-transform hover:-translate-y-px hover:bg-accent-600"
            >
              Sign in
            </Link>
          )}
        </div>
      </nav>
      {/* Gold hairline accent */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-accent-500/60 to-transparent" />
    </header>
  );
}
