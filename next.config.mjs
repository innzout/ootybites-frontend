import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Pin the workspace root to this app — there are sibling lockfiles higher up
  // (the monorepo root), and Next would otherwise infer the wrong root.
  outputFileTracingRoot: dirname(fileURLToPath(import.meta.url)),
  images: {
    // Cloudinary-hosted product images.
    remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com" }],
  },
};

export default nextConfig;
