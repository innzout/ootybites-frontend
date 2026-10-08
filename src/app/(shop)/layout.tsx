import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { listCategories } from "@/lib/endpoints";

// Shop route-group layout — customer-facing shell. Admin lives in its own route
// group so the two bundles stay code-split (see docs/ARCHITECTURE.md §9).
// Categories are fetched here (server) so the footer's category links are
// crawlable on every storefront page.
export default async function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const categories = await listCategories()
    .then((d) => d.categories ?? [])
    .catch(() => []);

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-8">{children}</main>
      <Footer categories={categories} />
    </div>
  );
}
