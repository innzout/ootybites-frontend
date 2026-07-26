"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Leaf, Mountain, Truck } from "lucide-react";
import type { Product, Banner } from "@/types";
import { listProducts, listBanners } from "@/lib/endpoints";
import { ProductCard } from "@/components/product/ProductCard";
import { ProductCardSkeleton } from "@/components/ui/Skeleton";
import { BannerCarousel } from "@/components/shop/BannerCarousel";

const FEATURES = [
  { icon: Mountain, title: "Grown in the hills", body: "Everything comes from farms and makers within the Nilgiri range." },
  { icon: Leaf, title: "Small-batch & fresh", body: "We only stock what's just been made or harvested this season." },
  { icon: Truck, title: "Cash on delivery", body: "Carefully packed and dispatched from Ooty — pay when it arrives." },
];

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listBanners()
      .then((d) => setBanners(d.banners ?? []))
      .catch(() => setBanners([]));
    listProducts()
      .then((d) => setProducts(d.products ?? []))
      .catch(() => setError("Could not load products. Is the API running?"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section>
      {/* Brand hero — always the base of the home page. */}
      <div className="relative overflow-hidden rounded-3xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/hero-ooty.jpg"
          alt="Misty Nilgiri hills of Ooty"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-ink/25 via-ink/40 to-ink/70" />
        <div className="relative flex min-h-[58vh] flex-col justify-center px-6 py-16 text-cream sm:px-10">
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
            <Leaf className="h-3.5 w-3.5" /> Taste of the Hills
          </span>
          <h1 className="mt-5 max-w-3xl font-serif text-4xl font-semibold leading-[1.05] text-white sm:text-6xl">
            A little bite of the <em className="italic">Nilgiris</em>, at your doorstep.
          </h1>
          <p className="mt-5 max-w-xl text-base text-white/85 sm:text-lg">
            Small-batch teas, varki, handmade snacks, cold-pressed oils and wild honey — sourced from the hill town of Ooty.
          </p>
          <div className="mt-8">
            <a
              href="#products"
              className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-6 py-3 font-semibold text-white shadow-soft transition hover:bg-brand-600"
            >
              Shop the collection <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>

      {/* Promo banners (admin-managed) — shown below the hero when present. */}
      {banners.length > 0 && (
        <div className="mt-6">
          <BannerCarousel banners={banners} />
        </div>
      )}

      {/* Feature strip */}
      <div className="mt-12 grid gap-4 sm:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, body }) => (
          <div
            key={title}
            className="group rounded-2xl border border-line bg-white p-6 transition-all hover:-translate-y-0.5 hover:shadow-soft"
          >
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 transition-colors group-hover:bg-brand-500 group-hover:text-white">
              <Icon className="h-5 w-5" />
            </span>
            <h3 className="mt-4 font-serif text-xl text-ink">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
          </div>
        ))}
      </div>

      {/* Catalog */}
      <div id="products" className="mt-16 scroll-mt-20">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <p className="text-sm font-semibold text-brand-600">Fresh in</p>
            <h2 className="font-serif text-3xl text-ink sm:text-4xl">This season&rsquo;s picks</h2>
          </div>
        </div>

        {error && <p className="py-8 text-center text-sm text-red-600">{error}</p>}
        {!loading && !error && products.length === 0 && (
          <p className="py-8 text-center text-sm text-muted">No products yet.</p>
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
          {loading
            ? Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)
            : products.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </div>
    </section>
  );
}
