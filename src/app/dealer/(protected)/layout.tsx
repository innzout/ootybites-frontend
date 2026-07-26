"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDealerAuthStore } from "@/store/dealerAuthStore";
import { Spinner } from "@/components/ui/Spinner";
import { BrandMark } from "@/components/ui/BrandMark";

export default function DealerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const isAuthed = useDealerAuthStore((s) => s.isAuthenticated());
  const dealer = useDealerAuthStore((s) => s.dealer);
  const logout = useDealerAuthStore((s) => s.logout);

  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  useEffect(() => {
    if (ready && !isAuthed) router.replace("/dealer/login");
  }, [ready, isAuthed, router]);

  if (!ready || !isAuthed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-30 bg-brand-800">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
          <Link href="/dealer/orders">
            <BrandMark size="sm" />
          </Link>
          <div className="flex items-center gap-3 text-sm text-cream/80">
            {dealer && <span className="hidden sm:inline">{dealer.name}</span>}
            <button
              onClick={() => {
                logout();
                router.replace("/dealer/login");
              }}
              className="rounded-full px-3 py-1.5 font-semibold hover:bg-white/10 hover:text-white"
            >
              Logout
            </button>
          </div>
        </div>
        <div className="h-px w-full bg-gradient-to-r from-transparent via-accent-500/60 to-transparent" />
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6">{children}</main>
    </div>
  );
}
