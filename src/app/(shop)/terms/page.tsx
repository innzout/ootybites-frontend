import type { Metadata } from "next";
import { ContentPage } from "@/components/shop/ContentPage";

// Admin-editable CMS content — render on demand so edits show without a rebuild.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "The terms and conditions for shopping with Ootybites.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return <ContentPage slug="terms" />;
}
