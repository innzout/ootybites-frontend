import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

// Response headers for every page.
//
// The Content-Security-Policy here is deliberately partial. It locks down the
// directives that are safe to set without per-request nonces: who may frame
// the site, where forms may post, and plugins. It does NOT restrict script-src,
// because Next's inline bootstrap and the Google Maps loader would need a
// nonce-based policy wired through middleware to keep working. That is worth
// doing before launch, but a half-right script-src would break checkout.
const securityHeaders = [
  // Clickjacking: nobody may put the checkout or the admin panel in a frame.
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'",
  },
  // Never let a browser guess a response's type.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Send the origin, not the full URL, to other sites - order ids and search
  // terms live in our URLs.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // The address picker uses geolocation; nothing uses the camera or microphone.
  { key: "Permissions-Policy", value: "geolocation=(self), camera=(), microphone=(), payment=()" },
  // HTTPS only, for two years. Harmless on localhost, where browsers ignore it.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

// Images an admin uploads while Cloudinary is not configured are stored by the
// API and served from its /uploads path. Without this they bypassed the
// optimiser entirely - a 370 KB PNG as a product page hero took 3.8 s on a
// throttled phone. Only that path on the configured API host is allowed.
function apiUploadPattern() {
  try {
    const u = new URL(process.env.NEXT_PUBLIC_API_BASE_URL ?? "");
    return [{ protocol: u.protocol.replace(":", ""), hostname: u.hostname, port: u.port, pathname: "/uploads/**" }];
  } catch {
    return [];
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Pin the workspace root to this app — there are sibling lockfiles higher up
  // (the monorepo root), and Next would otherwise infer the wrong root.
  outputFileTracingRoot: dirname(fileURLToPath(import.meta.url)),
  // Do not advertise the framework and version to anyone probing the site.
  poweredByHeader: false,
  images: {
    // Cloudinary-hosted product images.
    remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com" }, ...apiUploadPattern()],
    // Serve AVIF where the browser takes it, WebP otherwise. Product photos are
    // most of the page weight, and AVIF is typically a third smaller than WebP.
    formats: ["image/avif", "image/webp"],
    // Product images change rarely; let the optimiser keep its output for a day
    // instead of the 60-second default.
    minimumCacheTTL: 86400,
  },
  // Browsers request /favicon.ico on every page regardless of the <link rel="icon">
  // tags, and it was a 404 each time. Serve the 32px brand icon there instead.
  async rewrites() {
    return [{ source: "/favicon.ico", destination: "/brand/icon-32.png" }];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
