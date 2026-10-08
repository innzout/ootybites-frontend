"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminLogin } from "@/lib/adminEndpoints";
import { ApiException } from "@/lib/api";
import { useAdminAuthStore } from "@/store/adminAuthStore";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { BrandMark } from "@/components/ui/BrandMark";

export default function AdminLoginPage() {
  const router = useRouter();
  const login = useAdminAuthStore((s) => s.login);
  const [username, setUsername] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      // Trim to defend against pasted/autofilled trailing whitespace.
      const res = await adminLogin(username.trim(), pass.trim());
      login(res.token);
      router.push("/admin/dashboard");
    } catch (ex) {
      setError(ex instanceof ApiException ? ex.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-canvas px-4">
      {/* Ambient brand glow */}
      <div className="bg-brand-radial pointer-events-none absolute -top-40 right-0 h-96 w-96 rounded-full opacity-10 blur-3xl" />

      <form
        onSubmit={submit}
        autoComplete="off"
        className="relative w-full max-w-sm rounded-3xl border border-line bg-white p-7 shadow-xl shadow-ink/5"
      >
        <div className="mb-6 flex flex-col items-center text-center">
          <BrandMark withWord={false} />
          <h1 className="mt-3 font-display text-xl font-bold text-ink">Admin panel</h1>
          <p className="text-sm text-muted">Sign in to manage the store</p>
        </div>

        <div className="flex flex-col gap-4">
          <Input
            label="Username"
            name="ob-admin-user"
            autoComplete="off"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <Input
            label="Password"
            type="password"
            name="ob-admin-pass"
            autoComplete="new-password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            error={error}
          />
          <Button type="submit" size="lg" loading={busy} className="w-full">
            Sign in
          </Button>
        </div>

        {/* The bootstrap admin credentials used to be printed here. That shipped
            the real password in the client bundle and rendered it on the public
            login page, so anyone who loaded /admin/login could sign in. Read them
            from backend/.env (ADMIN_USER / ADMIN_PASS) instead. */}
      </form>
    </div>
  );
}
