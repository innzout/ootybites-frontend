import type { MetadataRoute } from "next";
import { listCategories, listProducts } from "@/lib/endpoints";
import { SITE_URL } from "@/lib/seo";

// Regenerate hourly so newly-added products appear without a redeploy.
export const revalidate = 3600;

// Dynamic sitemap: static shop routes + every active product. Regenerated on
// request (product catalogue changes often); crawler-only pages (cart, account,
// checkout, admin, dealer) are excluded here and in robots.ts.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/express`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
    { url: `${SITE_URL}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];

  let productRoutes: MetadataRoute.Sitemap = [];
  try {
    const d = await listProducts({ limit: 1000 });
    productRoutes = (d.products ?? []).map((p) => ({
      url: `${SITE_URL}/products/${p.slug}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    }));
  } catch {
    // Backend unreachable at build/request time — ship the static routes only.
  }

  let categoryRoutes: MetadataRoute.Sitemap = [];
  try {
    const d = await listCategories();
    categoryRoutes = (d.categories ?? []).map((c) => ({
      url: `${SITE_URL}/category/${c.slug}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    }));
  } catch {
    // Ignore — static + product routes still ship.
  }

  return [...staticRoutes, ...categoryRoutes, ...productRoutes];
}
