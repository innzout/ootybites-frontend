import type { Metadata } from "next";
import { getCachedExpressAreas } from "@/lib/cachedCatalog";
import { ExpressClient } from "./ExpressClient";

export const metadata: Metadata = {
  title: "24-hour delivery",
  description: "See what can reach you within 24 hours from your nearest Ootybites hub.",
  alternates: { canonical: "/express" },
};

// Server wrapper: seeds the serviceable areas so the first HTML already holds
// the page's content. Choosing the shopper's area stays on the client - it
// depends on their saved choice, session and location.
export default async function ExpressPage() {
  return <ExpressClient initialAreas={await getCachedExpressAreas()} />;
}
