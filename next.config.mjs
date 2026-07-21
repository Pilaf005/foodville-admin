/** @type {import('next').NextConfig} */

// Security headers applied to every response.
const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // blob: needed for FFmpeg WASM toBlobURL(); wasm-unsafe-eval needed for WebAssembly execution
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' blob:",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https://*.r2.dev https://pub-*.r2.dev https://images.unsplash.com https://plus.unsplash.com",
      // blob: needed for FFmpeg WASM worker; https://*.r2.dev for video streaming
      "connect-src 'self' blob: https://nominatim.openstreetmap.org https://*.r2.dev https://pub-*.r2.dev",
      // R2 video URLs need media-src permission for <video> tags
      "media-src 'self' blob: https://*.r2.dev https://pub-*.r2.dev",
      // worker-src blob: needed for FFmpeg WASM worker thread
      "worker-src 'self' blob:",
      "frame-src 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  images: {
    // Remote hosts used by the catalog + avatar imagery.
    remotePatterns: [
      // Cloudflare R2 — primary image CDN for all catalog, category, blog and user images
      { protocol: "https", hostname: "*.r2.dev" },
      { protocol: "https", hostname: "pub-ea082eb584df4a42a07e202cd67dcb02.r2.dev" },
      { protocol: "https", hostname: "*.cloudflarestorage.com" },
      // Unsplash hero images
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "plus.unsplash.com" },
      // Google profile pictures (used for SSO avatars if added in future)
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
    formats: ["image/avif", "image/webp"],
  },

  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Keep API responses out of search indexes; per-route Cache-Control still applies.
      { source: "/api/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex" }] },
    ];
  },
};

export default nextConfig;
