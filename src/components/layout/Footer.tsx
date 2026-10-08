"use client";

import Link from "next/link";
import { Leaf, Mail, Phone } from "lucide-react";
import { BrandMark } from "@/components/ui/BrandMark";
import type { Category } from "@/lib/endpoints";
import { useSettings } from "@/store/settingsStore";

// Footer — premium deep-green footer matching the logo. Contact + copy come from
// admin-editable store settings; categories are passed from the (server) shop
// layout so the links are crawlable on every page.
export function Footer({ categories = [] }: { categories?: Category[] }) {
  const s = useSettings();
  const year = new Date().getFullYear();
  const linkCls =
    "rounded text-cream/70 transition-colors hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60";

  return (
    <footer className="mt-24 bg-brand-gradient text-cream">
      {/* Gold hairline accent */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-accent-500/60 to-transparent" />

      <div className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
          {/* Brand blurb */}
          <div className="lg:col-span-2">
            <BrandMark tone="onDark" />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-cream/70">
              A taste of the Nilgiris — small-batch teas, varki, wild honey and heirloom
              bites, packed and shipped from the hills of Ooty to your door.
            </p>
            <p className="mt-4 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-accent-300">
              <Leaf className="h-3.5 w-3.5" /> {s.tagline}
            </p>
          </div>

          {/* Shop by category */}
          {categories.length > 0 && (
            <div>
              <h4 className="font-serif text-lg text-white">Categories</h4>
              <ul className="mt-4 space-y-2.5 text-sm">
                {categories.slice(0, 6).map((c) => (
                  <li key={c.id}>
                    <Link href={`/category/${c.slug}`} className={linkCls}>
                      {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Shop */}
          <div>
            <h4 className="font-serif text-lg text-white">Shop</h4>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li><Link href="/" className={linkCls}>All products</Link></li>
              <li><Link href="/express" className={linkCls}>24-hour express</Link></li>
              <li><Link href="/play" className={linkCls}>Ooty Bites Dash 🎮</Link></li>
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
              {s.store_address && <li><span className="text-cream/70">{s.store_address}</span></li>}
              {s.support_email && (
                <li>
                  <a href={`mailto:${s.support_email}`} className={`inline-flex items-center gap-1.5 ${linkCls}`}>
                    <Mail className="h-3.5 w-3.5" /> {s.support_email}
                  </a>
                </li>
              )}
              {s.support_phone && (
                <li>
                  <a href={`tel:${s.support_phone}`} className={`inline-flex items-center gap-1.5 ${linkCls}`}>
                    <Phone className="h-3.5 w-3.5" /> {s.support_phone}
                  </a>
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-2 border-t border-white/10 pt-6 text-xs text-cream/60 sm:flex-row">
          <p>© {year} {s.store_name} · INNZOUT Technologies</p>
          <p>{s.cod_note}</p>
        </div>
      </div>
    </footer>
  );
}
