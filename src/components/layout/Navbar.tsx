"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingBag, User, Heart, Gamepad2 } from "lucide-react";
import { useCartStore } from "@/store/cartStore";
import { useWishlistStore } from "@/store/wishlistStore";
import { useAuthStore } from "@/store/authStore";
import { BrandMark } from "@/components/ui/BrandMark";
import { NotificationBell } from "@/components/ui/NotificationBell";
import { listNotifications, markNotificationsRead } from "@/lib/endpoints";
import { useHydrated } from "@/lib/useHydrated";
import { cn } from "@/lib/cn";

// Navbar — shop header on a light surface, so the full-colour Ootybites
// wordmark can be used (the white knockout was only needed because the bar used
// to be deep green). Text links collapse on mobile; cart and account become
// icons so the bar never overflows on a phone.
export function Navbar() {
  const router = useRouter();
  // Cart and wishlist live in localStorage, so the server always renders 0 while
  // the client renders the real count — that mismatch made React discard the
  // server-rendered tree on every page. Suppress the badges until the stores
  // have rehydrated; the nav itself still renders server-side.
  const cartHydrated = useHydrated(useCartStore);
  const wishHydrated = useHydrated(useWishlistStore);
  const count = useCartStore((s) => s.count());
  const wishCount = useWishlistStore((s) => s.count());
  const cartBadge = cartHydrated ? count : 0;
  const wishBadge = wishHydrated ? wishCount : 0;
  const authHydrated = useHydrated(useAuthStore);
  // Gated for the same reason as the badges: the session lives in localStorage,
  // so the server always renders the signed-out bar. Reading it ungated made
  // every page swap "Sign in" for "Logout" on hydration, which is a mismatch
  // React resolves by throwing away the whole server-rendered tree.
  const isAuthed = useAuthStore((s) => s.isAuthenticated()) && authHydrated;
  const logout = useAuthStore((s) => s.logout);

  // Log out → clear session and return to the home page.
  function signOut() {
    logout();
    router.push("/");
  }

  const focusRing = "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40";
  const link = `rounded-full px-3 py-2 text-muted transition-colors hover:bg-brand-50 hover:text-brand-700 ${focusRing}`;
  const icon = `rounded-full p-2 text-muted transition-colors hover:bg-brand-50 hover:text-brand-700 ${focusRing}`;

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/90 backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link
          href="/"
          aria-label="Ootybites — home"
          className={cn("rounded-xl", focusRing)}
        >
          <BrandMark />
        </Link>
        <div className="flex items-center gap-0.5 text-sm font-semibold sm:gap-1.5">
          <Link href="/" className={cn(link, "hidden sm:block")}>
            Shop
          </Link>
          <Link href="/orders" className={cn(link, "hidden sm:block")}>
            Orders
          </Link>
          <Link href="/play" className={icon} aria-label="Play Ooty Bites Dash">
            <Gamepad2 className="h-5 w-5" />
          </Link>
          <Link href="/wishlist" className={cn(icon, "relative")} aria-label="Wishlist">
            <Heart className="h-5 w-5" />
            {wishBadge > 0 && (
              <span className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-500 px-1 text-[10px] font-bold text-white">
                {wishBadge}
              </span>
            )}
          </Link>
          <Link href="/cart" className={cn(icon, "relative")} aria-label="Cart">
            <ShoppingBag className="h-5 w-5" />
            {cartBadge > 0 && (
              <span className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-500 px-1 text-[10px] font-bold text-white">
                {cartBadge}
              </span>
            )}
          </Link>
          {isAuthed ? (
            <>
              <NotificationBell fetchFeed={listNotifications} markRead={markNotificationsRead} tone="dark" hrefFor={(n) => (n.order_id ? `/orders/${n.order_id}` : null)} />
              <Link href="/account" className={icon} aria-label="Account">
                <User className="h-5 w-5" />
              </Link>
              <button onClick={signOut} className={cn(link, "hidden sm:block")}>
                Logout
              </button>
            </>
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
      {/* Gold hairline accent — reads as a warm underline on the light bar. */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-accent-500/50 to-transparent" />
    </header>
  );
}
