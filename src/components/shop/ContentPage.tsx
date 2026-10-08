import { cache } from "react";
import { getPage } from "@/lib/endpoints";
import type { Page } from "@/lib/endpoints";
import { Markdown } from "@/components/ui/Markdown";

// Deduped fetch so a route's generateMetadata and its ContentPage render share
// one backend call per request.
export const loadPage = cache(async (slug: string): Promise<Page | null> => {
  try {
    return await getPage(slug);
  } catch {
    return null;
  }
});

// ContentPage renders an admin-managed CMS page by slug (Terms, Privacy, etc.)
// on the server, so the copy is present in the initial HTML for crawlers.
export async function ContentPage({ slug }: { slug: string }) {
  const page = await loadPage(slug);

  if (!page || !page.is_published) {
    return <p className="py-20 text-center text-muted">This page isn&rsquo;t available.</p>;
  }

  return (
    <article className="mx-auto max-w-2xl">
      <h1 className="mb-6 font-display text-2xl font-bold text-ink">{page.title}</h1>
      <Markdown body={page.body} />
    </article>
  );
}
