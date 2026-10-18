import { Suspense } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { FooterCategories } from "@/components/layout/FooterCategories";

// Shop route-group layout — customer-facing shell. Admin lives in its own route
// group so the two bundles stay code-split (see docs/ARCHITECTURE.md §9).
//
// This layout is deliberately synchronous. It used to await listCategories()
// for the footer's links, which blocked the whole shell: layouts cannot stream,
// and loading.tsx only wraps the page, so the navbar and the page skeleton
// could not paint until that call returned. Every storefront page therefore
// showed nothing at all while the API was cold. The fetch now lives inside a
// Suspense boundary, so the shell flushes immediately and the footer links
// stream in behind it — still server-rendered, still crawlable.
export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-8">{children}</main>
      {/* Fallback is the same footer without its category links, so the page
          never jumps — only the links appear. */}
      <Suspense fallback={<Footer />}>
        <FooterCategories />
      </Suspense>
    </div>
  );
}
