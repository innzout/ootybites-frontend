import { Footer } from "./Footer";
import { getCachedCategories } from "@/lib/cachedCatalog";

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
// The list itself comes from the shared cached loader (lib/cachedCatalog), so
// the footer, home page and category pages all reuse one copy.
export async function FooterCategories() {
  return <Footer categories={await getCachedCategories()} />;
}
