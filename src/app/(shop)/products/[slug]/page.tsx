import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProduct, listProducts } from "@/lib/endpoints";
import { ProductCard } from "@/components/product/ProductCard";
import { RecentlyViewed } from "@/components/product/RecentlyViewed";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  SITE_URL,
  primaryImage,
  productJsonLd,
  breadcrumbJsonLd,
} from "@/lib/seo";
import { ProductDetail } from "./ProductDetail";

// Render on demand so price/stock in the page and the Product/Offer JSON-LD are
// always accurate (a stale price mismatch is penalised in Google rich results).
export const dynamic = "force-dynamic";

// Deduped within a single request: generateMetadata and the page both call this,
// but React cache() ensures the backend is hit once per render.
const loadProduct = cache(async (slug: string) => {
  try {
    return await getProduct(slug);
  } catch {
    return null;
  }
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const p = await loadProduct(slug);
  if (!p) return { title: "Product not found" };

  const desc = (
    p.description?.trim() ||
    `Buy ${p.name} online from Ootybites — fresh from the Nilgiri hills of Ooty. Cash on delivery across Tamil Nadu.`
  ).slice(0, 160);
  const img = primaryImage(p);

  return {
    title: { absolute: `${p.name} — Buy Online | Ootybites` },
    description: desc,
    keywords: [p.name, `buy ${p.name} online`, `${p.name} Ooty`, "Nilgiri products"],
    alternates: { canonical: `/products/${p.slug}` },
    openGraph: {
      type: "website",
      title: `${p.name} | Ootybites`,
      description: desc,
      url: `${SITE_URL}/products/${p.slug}`,
      ...(img ? { images: [{ url: img, alt: p.name }] } : {}),
    },
    twitter: {
      card: img ? "summary_large_image" : "summary",
      title: `${p.name} | Ootybites`,
      description: desc,
      ...(img ? { images: [img] } : {}),
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await loadProduct(slug);
  if (!product) notFound();

  // "You may also like" — other active products in the same category (cross-sell
  // to deepen the session). Best-effort: a failure here must not break the page.
  const related = product.category_id
    ? await listProducts({ category: product.category_id, limit: 8 })
        .then((d) => (d.products ?? []).filter((p) => p.id !== product.id).slice(0, 4))
        .catch(() => [])
    : [];

  return (
    <>
      <JsonLd
        data={[
          productJsonLd(product),
          breadcrumbJsonLd([
            { name: "Home", url: SITE_URL },
            { name: product.name, url: `${SITE_URL}/products/${product.slug}` },
          ]),
        ]}
      />
      <ProductDetail product={product} />

      {related.length > 0 && (
        <section className="mt-14">
          <h2 className="mb-4 font-display text-lg font-bold text-ink sm:text-xl">You may also like</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      <RecentlyViewed excludeId={product.id} />
    </>
  );
}
