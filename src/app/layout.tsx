import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Toaster } from "@/components/ui/Toaster";

// Fraunces (serif) for display/headings, Inter for body — an artisanal,
// premium pairing for a hill-produce brand.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Ootybites — Taste of the Hills",
  description:
    "Small-batch teas, varki, snacks, cold-pressed oils and wild honey — sourced from the Nilgiri hills of Ooty.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable}`}>
      <body>
        {children}
        <ConfirmDialog />
        <Toaster />
      </body>
    </html>
  );
}
