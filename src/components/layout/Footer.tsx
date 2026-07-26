import Link from "next/link";
import { Leaf } from "lucide-react";
import { BrandMark } from "@/components/ui/BrandMark";

// Footer — premium deep-green footer matching the logo.
export function Footer() {
  const year = new Date().getFullYear();
  const linkCls = "text-cream/70 transition-colors hover:text-white";

  return (
    <footer className="mt-24 bg-brand-800 text-cream">
      {/* Gold hairline accent */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-accent-500/60 to-transparent" />

      <div className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand blurb */}
          <div className="lg:col-span-2">
            <BrandMark tone="onDark" />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-cream/70">
              A taste of the Nilgiris — small-batch teas, varki, wild honey and heirloom
              bites, packed and shipped from the hills of Ooty to your door.
            </p>
            <p className="mt-4 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-accent-300">
              <Leaf className="h-3.5 w-3.5" /> Taste of the Hills
            </p>
          </div>

          {/* Shop */}
          <div>
            <h4 className="font-serif text-lg text-white">Shop</h4>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li><Link href="/" className={linkCls}>All products</Link></li>
              <li><Link href="/cart" className={linkCls}>Your cart</Link></li>
              <li><Link href="/orders" className={linkCls}>Your orders</Link></li>
            </ul>
          </div>

          {/* Help */}
          <div>
            <h4 className="font-serif text-lg text-white">Help</h4>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li><Link href="/terms" className={linkCls}>Terms</Link></li>
              <li><Link href="/privacy" className={linkCls}>Privacy</Link></li>
              <li><span className="text-cream/70">Ooty, Tamil Nadu</span></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-2 border-t border-white/10 pt-6 text-xs text-cream/60 sm:flex-row">
          <p>© {year} Ootybites · INNZOUT Technologies</p>
          <p>Cash on delivery across India</p>
        </div>
      </div>
    </footer>
  );
}
