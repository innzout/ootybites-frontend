import { unstable_cache } from "next/cache";
import { Footer } from "./Footer";
import { listCategories } from "@/lib/endpoints";

// The footer's category links need an API call, but they sit at the very bottom
// of the page. Fetching them in the shop layout blocked the entire shell: a
// layout cannot stream, and loading.tsx only wraps the *page*, so nothing at
// all — not the navbar, not the page skeleton — could paint until this call
// came back. On a cold backend that is a blank screen with no feedback, which
// reads as frozen rather than slow.
//
// Isolating the await in its own component lets the layout wrap it in Suspense
// and flush the shell immediately. The links still arrive in the streamed SSR
// HTML, so they stay crawlable.
//
// Cached because categories change rarely and this runs on every storefront
// page view. Admin edits appear within the revalidate window.
const cachedCategories = unstable_cache(
  async () => listCategories().then((d) => d.categories ?? []).catch(() => []),
  ["shop-footer-categories"],
  { revalidate: 300, tags: ["categories"] },
);

export async function FooterCategories() {
  return <Footer categories={await cachedCategories()} />;
}
