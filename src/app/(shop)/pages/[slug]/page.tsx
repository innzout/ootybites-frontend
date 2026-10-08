import type { Metadata } from "next";
import { ContentPage, loadPage } from "@/components/shop/ContentPage";

// Admin-editable CMS content — render on demand so edits show without a rebuild.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await loadPage(slug);
  if (!page) return { title: "Page not found" };
  return {
    title: page.title,
    description: `${page.title} — Ootybites`,
    alternates: { canonical: `/pages/${slug}` },
  };
}

// Generic route for any admin-created CMS page, reachable at /pages/<slug>.
export default async function DynamicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ContentPage slug={slug} />;
}
