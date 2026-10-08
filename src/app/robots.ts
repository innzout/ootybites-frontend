import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

// Index the storefront; keep the private/transactional and staff areas out of
// search results.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/dealer", "/account", "/checkout", "/cart", "/orders", "/login"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
