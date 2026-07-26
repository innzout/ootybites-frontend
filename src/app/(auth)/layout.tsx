import Link from "next/link";
import { BrandMark } from "@/components/ui/BrandMark";

// Minimal centered shell for auth screens (OTP login).
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-brand-50 px-4">
      <Link href="/" className="mb-8 flex flex-col items-center gap-2">
        <BrandMark />
        <span className="text-xs font-medium uppercase tracking-[0.18em] text-brand-700">
          Taste of the Hills
        </span>
      </Link>
      <div className="w-full max-w-sm rounded-2xl border border-line bg-white p-6 shadow-soft">
        {children}
      </div>
    </div>
  );
}
