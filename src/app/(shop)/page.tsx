import { Suspense } from "react";
import type { Metadata } from "next";
import { listProducts, listCategories, listBanners } from "@/lib/endpoints";
import { JsonLd } from "@/components/seo/JsonLd";
import { DEFAULT_DESCRIPTION, SITE_URL, organizationJsonLd, websiteJsonLd } from "@/lib/seo";
import { Storefront } from "./Storefront";

// Render on demand: the catalogue is live data (price/stock), so we never bake it
// into the build. Crawlers still get fully-rendered HTML.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "Ootybites — Fresh Nilgiri Tea, Snacks, Honey & Oils from Ooty" },
  description: DEFAULT_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    title: "Ootybites — Taste of the Hills",
    description: DEFAULT_DESCRIPTION,
    url: SITE_URL,
  },
};

// Server component: fetches the first page of products (+ categories, banners)
// so the storefront grid is in the initial HTML, then hands off to the client
// Storefront for search/sort/filter. Emits Organization + WebSite JSON-LD.
export default async function HomePage() {
  const [prod, cats, ban] = await Promise.all([
    listProducts({ sort: "newest", page: 1, limit: 12 }).catch(() => ({ products: [], total: 0 })),
    listCategories().catch(() => ({ categories: [] })),
    listBanners().catch(() => ({ banners: [] })),
  ]);

  return (
    <>
      <JsonLd data={[organizationJsonLd(), websiteJsonLd()]} />
      <Suspense>
        <Storefront
          initialProducts={prod.products ?? []}
          initialTotal={prod.total ?? 0}
          categories={cats.categories ?? []}
          banners={ban.banners ?? []}
        />
      </Suspense>
    </>
  );
}
