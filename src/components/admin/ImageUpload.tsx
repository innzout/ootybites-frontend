"use client";

import { useRef, useState } from "react";
import { uploadImage } from "@/lib/upload";
import { ApiException } from "@/lib/api";

// ImageUpload is a file picker that uploads directly to Cloudinary and reports
// the hosted URL via onUploaded. When Cloudinary isn't configured the sign call
// returns 501; the component surfaces that message so the caller's URL-paste
// field remains the usable fallback.
export function ImageUpload({
  folder,
  onUploaded,
  label = "Upload image",
}: {
  folder: string;
  onUploaded: (url: string) => void;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const { url } = await uploadImage(file, folder);
      onUploaded(url);
    } catch (ex) {
      setError(ex instanceof ApiException ? ex.message : ex instanceof Error ? ex.message : "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-ink transition-colors hover:border-brand-400 hover:text-brand-600 disabled:opacity-60"
      >
        {busy ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
            Uploading…
          </>
        ) : (
          <>
            <span aria-hidden>⬆</span> {label}
          </>
        )}
      </button>
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={handleFile} />
      {error && <span className="text-xs text-amber-600">{error}</span>}
    </div>
  );
}
