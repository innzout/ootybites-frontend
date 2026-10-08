import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { buttonClasses } from "@/components/ui/Button";

// Root 404. Product pages call notFound() for a bad slug, and this also catches
// any unrouted URL. It renders the navbar itself rather than living inside the
// (shop) group, because a 404 can occur outside that group too.
export const metadata = {
  title: "Page not found",
  // A 404 must never enter the index — otherwise dead URLs compete with real
  // product pages in search results.
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-20 text-center">
        <p className="font-serif text-6xl text-brand-500">404</p>
        <h1 className="mt-4 font-serif text-2xl text-ink">This page has wandered off</h1>
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">
          The link may be old, or the product may no longer be stocked. Everything
          we currently carry is on the shop page.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link href="/" className={buttonClasses()}>
            Browse the shop
          </Link>
          <Link href="/orders" className={buttonClasses({ variant: "outline" })}>
            My orders
          </Link>
        </div>
      </main>
    </div>
  );
}
