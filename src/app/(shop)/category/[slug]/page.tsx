import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { listCategories, listProducts, type Category } from "@/lib/endpoints";
import { JsonLd } from "@/components/seo/JsonLd";
import { SITE_URL, breadcrumbJsonLd, itemListJsonLd } from "@/lib/seo";
import { CategoryBrowse } from "./CategoryBrowse";

// Render on demand — categories/products are live data.
export const dynamic = "force-dynamic";

const PAGE_SIZE = 12;

const loadCategories = cache(async (): Promise<Category[]> => {
  try {
    const d = await listCategories();
    return d.categories ?? [];
  } catch {
    return [];
  }
});

const findBySlug = cache(async (slug: string): Promise<Category | null> => {
  const all = await loadCategories();
  return all.find((c) => c.slug === slug) ?? null;
});

// Fetch the first page of products for a category (deduped for metadata + page).
const loadFirstPage = cache(async (categoryId: string) => {
  try {
    return await listProducts({ category: categoryId, sort: "newest", page: 1, limit: PAGE_SIZE });
  } catch {
    return { products: [], total: 0 };
  }
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const cat = await findBySlug(slug);
  if (!cat) return { title: "Category not found" };

  const desc = `Shop ${cat.name} from Ootybites — fresh from the Nilgiri hills of Ooty. Cash on delivery across Tamil Nadu.`;
  return {
    title: { absolute: `${cat.name} — Buy Online from Ooty | Ootybites` },
    description: desc,
    keywords: [cat.name, `Ooty ${cat.name}`, `buy ${cat.name} online`, "Nilgiri products"],
    alternates: { canonical: `/category/${cat.slug}` },
    openGraph: {
      type: "website",
      title: `${cat.name} | Ootybites`,
      description: desc,
      url: `${SITE_URL}/category/${cat.slug}`,
    },
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const cat = await findBySlug(slug);
  if (!cat) notFound();

  const [first, categories] = await Promise.all([loadFirstPage(cat.id), loadCategories()]);
  const products = first.products ?? [];
  const others = categories.filter((c) => c.slug !== cat.slug);

  return (
    <div>
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: "Home", url: SITE_URL },
            { name: cat.name, url: `${SITE_URL}/category/${cat.slug}` },
          ]),
          itemListJsonLd(
            cat.name,
            products.map((p) => ({ name: p.name, url: `${SITE_URL}/products/${p.slug}` })),
          ),
        ]}
      />

      {/* Breadcrumb + heading */}
      <nav className="mb-2 text-sm text-muted">
        <Link href="/" className="hover:text-brand-600">
          Home
        </Link>{" "}
        <span className="px-1">/</span> <span className="text-ink">{cat.name}</span>
      </nav>
      <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">{cat.name}</h1>
      <p className="mt-1 text-muted">Fresh {cat.name.toLowerCase()} from the Nilgiri hills of Ooty.</p>

      {/* Cross-links to other categories (crawlable internal linking) */}
      {others.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {others.map((c) => (
            <Link
              key={c.id}
              href={`/category/${c.slug}`}
              className="rounded-full border border-line bg-white px-3.5 py-1.5 text-sm font-semibold text-muted transition-colors hover:text-brand-600"
            >
              {c.name}
            </Link>
          ))}
        </div>
      )}

      <div className="mt-8">
        <CategoryBrowse categoryId={cat.id} initialProducts={products} initialTotal={first.total ?? 0} />
      </div>
    </div>
  );
}
