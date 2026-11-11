"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { dealerLogin } from "@/lib/dealerEndpoints";
import { ApiException } from "@/lib/api";
import { useDealerAuthStore } from "@/store/dealerAuthStore";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { BrandMark } from "@/components/ui/BrandMark";
import { useFieldErrors } from "@/lib/useFieldErrors";
import { required } from "@/lib/validators";

const schema = { username: [required], password: [required] };

export default function DealerLoginPage() {
  const router = useRouter();
  const login = useDealerAuthStore((s) => s.login);
  const [username, setUsername] = useState("");
  const [pass, setPass] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { errors, validateAll, revalidate, validateOnBlur } = useFieldErrors(schema);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!validateAll({ username, password: pass })) return;
    setBusy(true);
    try {
      const res = await dealerLogin(username.trim(), pass.trim());
      login(res.token, res.dealer);
      router.push("/dealer/orders");
    } catch (ex) {
      setError(ex instanceof ApiException ? ex.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-50 px-4">
      <form onSubmit={submit} autoComplete="off" className="w-full max-w-sm rounded-3xl border border-line bg-white p-7 shadow-soft">
        <div className="mb-6 flex flex-col items-center text-center">
          <BrandMark withWord={false} />
          <h1 className="mt-3 font-display text-xl font-bold text-ink">Dealer portal</h1>
          <p className="text-sm text-muted">Sign in to fulfil your orders</p>
        </div>
        <div className="flex flex-col gap-4">
          <Input
            label="Username"
            name="ob-dealer-user"
            autoComplete="off"
            value={username}
            onChange={(e) => { setUsername(e.target.value); revalidate("username", e.target.value); }}
            onBlur={() => validateOnBlur("username", username)}
            error={errors.username}
          />
          <Input
            label="Password"
            type="password"
            name="ob-dealer-pass"
            autoComplete="current-password"
            value={pass}
            onChange={(e) => { setPass(e.target.value); revalidate("password", e.target.value); }}
            onBlur={() => validateOnBlur("password", pass)}
            // The server's "invalid credentials" shows on the password field; a
            // local "required" check takes precedence while it is empty.
            error={errors.password ?? error}
          />
          <Button type="submit" size="lg" loading={busy} className="w-full">
            Sign in
          </Button>
        </div>
      </form>
    </div>
  );
}
