import type { Metadata } from "next";
import { ContentPage } from "@/components/shop/ContentPage";

// Admin-editable CMS content — render on demand so edits show without a rebuild.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Ootybites collects, uses and protects your personal data.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return <ContentPage slug="privacy" />;
}
