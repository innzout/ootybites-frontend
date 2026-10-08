"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { requestOTP, verifyOTP } from "@/lib/endpoints";
import { phoneIN, otp as otpValidator } from "@/lib/validators";
import { ApiException } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);

  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const err = phoneIN(phone);
    if (err) return setError(err);
    setBusy(true);
    try {
      const res = await requestOTP(phone);
      setDevOtp(res.dev_otp ?? null); // shown only in dev mode
      setStep("otp");
    } catch (ex) {
      setError(ex instanceof ApiException ? ex.message : "Could not send code");
    } finally {
      setBusy(false);
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const err = otpValidator(code);
    if (err) return setError(err);
    setBusy(true);
    try {
      const res = await verifyOTP(phone, code);
      login(res.token, res.customer);
      // Return to where the user was headed (?next=/…), else home.
      const n = new URLSearchParams(window.location.search).get("next");
      const dest = n && n.startsWith("/") && !n.startsWith("//") ? n : "/";
      router.push(dest);
    } catch (ex) {
      setError(ex instanceof ApiException ? ex.message : "Could not verify code");
    } finally {
      setBusy(false);
    }
  }

  if (step === "phone") {
    return (
      <form onSubmit={sendOtp} className="flex flex-col gap-4">
        <h1 className="text-lg font-semibold text-neutral-800">Sign in</h1>
        <Input
          label="Mobile number"
          inputMode="numeric"
          placeholder="10-digit number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          error={error}
        />
        <Button type="submit" loading={busy}>
          Send OTP
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={verify} className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold text-neutral-800">Enter OTP</h1>
      <p className="text-sm text-neutral-500">Sent to {phone}</p>
      {devOtp && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
          Dev mode OTP: <span className="font-mono font-semibold">{devOtp}</span>
        </p>
      )}
      <Input
        label="6-digit code"
        inputMode="numeric"
        placeholder="••••••"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        error={error}
      />
      <Button type="submit" loading={busy}>
        Verify &amp; continue
      </Button>
      <button
        type="button"
        onClick={() => setStep("phone")}
        className="text-sm text-neutral-500 hover:underline"
      >
        ← Change number
      </button>
    </form>
  );
}
