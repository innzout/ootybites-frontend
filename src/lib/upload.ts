// Image upload.
//
// Prefers Cloudinary: the browser asks our backend to sign an upload, then posts
// the file straight to Cloudinary. The API secret never leaves the server
// (CLAUDE.md rule 8) — only a short-lived signature does.
//
// Falls back to POST /api/admin/uploads, which stores on the API's own disk.
// That is fine locally but NOT in a deployed environment: Railway containers
// have an ephemeral filesystem, so anything written there disappears on the
// next deploy and every product image 404s. Configure Cloudinary for staging
// and production.
import { useAdminAuthStore } from "@/store/adminAuthStore";
import { adminSignUpload } from "@/lib/adminEndpoints";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080/api";

export interface UploadedImage {
  url: string;
  publicId: string;
}

/** Posts straight to Cloudinary with params our server signed. */
async function uploadToCloudinary(file: File, folder: string): Promise<UploadedImage> {
  const sig = await adminSignUpload(folder);

  const form = new FormData();
  form.append("file", file);
  form.append("api_key", sig.api_key);
  form.append("timestamp", String(sig.timestamp));
  form.append("folder", sig.folder);
  form.append("signature", sig.signature);
  // Only sent when the server signed one; sending it unsigned (or omitting a
  // preset that WAS signed) makes Cloudinary reject the signature.
  if (sig.upload_preset) form.append("upload_preset", sig.upload_preset);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloud_name}/image/upload`, {
    method: "POST",
    body: form,
  });

  const body = (await res.json().catch(() => null)) as
    | { secure_url?: string; public_id?: string; error?: { message?: string } }
    | null;

  if (!res.ok || !body?.secure_url || !body.public_id) {
    // Surface Cloudinary's own reason — "Invalid Signature" and "Upload preset
    // not found" are the two likely ones and they need different fixes.
    throw new Error(body?.error?.message ?? "Cloudinary upload failed. Please try again.");
  }
  return { url: body.secure_url, publicId: body.public_id };
}

/** Stores on the API's own disk. Development only — see the note above. */
async function uploadToBackend(file: File): Promise<UploadedImage> {
  const token = useAdminAuthStore.getState().token;
  const form = new FormData();
  form.append("file", file);

  const res = await fetch(`${BASE_URL}/admin/uploads`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: form,
  });

  let env: { success: boolean; data?: { url: string; public_id: string }; error?: { message: string } };
  try {
    env = await res.json();
  } catch {
    throw new Error("Upload failed. Please try again.");
  }
  if (!res.ok || !env.success || !env.data) {
    throw new Error(env?.error?.message ?? "Upload failed. Please try again.");
  }
  return { url: env.data.url, publicId: env.data.public_id };
}

// uploadImage stores an image and returns its hosted URL. `folder` groups the
// asset in Cloudinary (e.g. "products", "banners").
export async function uploadImage(file: File, folder = "ootybites"): Promise<UploadedImage> {
  try {
    return await uploadToCloudinary(file, folder);
  } catch (e) {
    // The sign endpoint answers 501 when Cloudinary is unconfigured — that is
    // the expected local path, so fall back quietly. A real Cloudinary failure
    // (bad signature, missing preset) must NOT fall back: silently writing to
    // the API's ephemeral disk would look like success and lose the image on
    // the next deploy.
    const msg = e instanceof Error ? e.message : "";
    if (/not configured/i.test(msg)) return uploadToBackend(file);
    throw e;
  }
}
