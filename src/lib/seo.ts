// Central SEO helpers — site constants, keyword clusters and schema.org JSON-LD
// builders. Kept in one place so metadata and structured data never drift from
// the actual product data (price/stock live on variants — non-negotiable rule 1).

import type { Product, Variant } from "@/types";

export const SITE_NAME = "Ootybites";

// Canonical site origin. Set NEXT_PUBLIC_SITE_URL in production; the fallback is
// only for local/dev so canonicals and the sitemap still resolve.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://ootybites.com"
).replace(/\/$/, "");

export const DEFAULT_DESCRIPTION =
  "Small-batch teas, varki, snacks, cold-pressed oils and wild honey — sourced fresh from the Nilgiri hills of Ooty. Cash on delivery across Tamil Nadu.";

// Broad storefront keyword set. Product/category pages layer their own on top.
export const SITE_KEYWORDS = [
  "Ooty products online",
  "Nilgiri tea online",
  "Ooty tea buy online",
  "varki Ooty",
  "Ooty snacks online",
  "cold pressed oil Nilgiris",
  "wild honey Ooty",
  "Nilgiri hills honey",
  "Ooty homemade chocolate",
  "buy Ooty products online",
];

export function activeVariants(p: Product): Variant[] {
  return p.variants.filter((v) => v.is_active);
}

// Min/max active-variant price — the storefront "from" price and the schema
// AggregateOffer range both come from here.
export function priceRange(p: Product): { min: number; max: number } | null {
  const prices = activeVariants(p).map((v) => v.price);
  if (!prices.length) return null;
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

export function inStock(p: Product): boolean {
  return activeVariants(p).some((v) => v.stock_qty > 0);
}

export function primaryImage(p: Product): string | undefined {
  return (p.images.find((i) => i.is_primary) ?? p.images[0])?.url;
}

// schema.org Product for a detail page — drives Google's price/availability rich
// result. Uses AggregateOffer when a product has multiple sellable variants.
export function productJsonLd(p: Product): Record<string, unknown> {
  const range = priceRange(p);
  const images = p.images.map((i) => i.url);
  const actives = activeVariants(p);
  const availability = inStock(p)
    ? "https://schema.org/InStock"
    : "https://schema.org/OutOfStock";

  const offers =
    range == null
      ? undefined
      : actives.length > 1
        ? {
            "@type": "AggregateOffer",
            priceCurrency: "INR",
            lowPrice: range.min,
            highPrice: range.max,
            offerCount: actives.length,
            availability,
          }
        : {
            "@type": "Offer",
            priceCurrency: "INR",
            price: range.min,
            availability,
          };

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.description || DEFAULT_DESCRIPTION,
    ...(images.length ? { image: images } : {}),
    ...(actives[0]?.sku ? { sku: actives[0].sku } : {}),
    brand: { "@type": "Brand", name: SITE_NAME },
    ...(offers ? { offers } : {}),
    url: `${SITE_URL}/products/${p.slug}`,
  };
}

export function breadcrumbJsonLd(
  items: { name: string; url: string }[],
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: it.url,
    })),
  };
}

// Ordered list of product URLs — used on category/collection pages so Google
// understands the set of items on the page.
export function itemListJsonLd(
  name: string,
  items: { name: string; url: string }[],
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      url: it.url,
    })),
  };
}

export function organizationJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    description: DEFAULT_DESCRIPTION,
  };
}

// WebSite + SearchAction so Google can offer a sitelinks search box.
export function websiteJsonLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}
