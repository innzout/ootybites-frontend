// Image upload — posts the file to our own backend, which stores it and returns
// a hosted URL. Works out-of-the-box in dev with no external service; Cloudinary
// can be layered on for production later.
import { useAdminAuthStore } from "@/store/adminAuthStore";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080/api";

export interface UploadedImage {
  url: string;
  publicId: string;
}

// uploadImage sends a file to POST /api/admin/uploads (multipart) with the admin
// token and returns the stored image URL. `folder` is accepted for call-site
// compatibility but not required by the local backend.
export async function uploadImage(file: File, _folder?: string): Promise<UploadedImage> {
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
