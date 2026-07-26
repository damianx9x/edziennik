import type { NextConfig } from "next";

const isStaticPreview = process.env.KLA_STATIC_PREVIEW === "1";
const isMacTestHost = process.env.KLA_MAC_TEST_HOST === "1";
const isDevelopment = process.env.NODE_ENV !== "production";

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "media-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: contentSecurityPolicy,
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(), payment=(), display-capture=(self)",
  },
  {
    key: "Cross-Origin-Opener-Policy",
    value: "same-origin",
  },
  {
    key: "Cross-Origin-Resource-Policy",
    value: "same-origin",
  },
] as const;

const nextConfig: NextConfig = {
  output: isStaticPreview ? "export" : "standalone",
  outputFileTracingRoot: process.cwd(),
  trailingSlash: isStaticPreview,
  turbopack: {
    root: process.cwd(),
  },
  images: {
    unoptimized: isStaticPreview || isMacTestHost,
  },
  poweredByHeader: false,
  reactStrictMode: true,
  ...(isStaticPreview
    ? {}
    : {
        async headers() {
          return [
            {
              source: "/(.*)",
              headers: [...securityHeaders],
            },
            {
              source: "/api/auth/:path*",
              headers: [
                {
                  key: "Cache-Control",
                  value: "private, no-store, max-age=0",
                },
              ],
            },
            {
              source: "/panel/:path*",
              headers: [
                {
                  key: "Cache-Control",
                  value: "private, no-store, max-age=0",
                },
              ],
            },
          ];
        },
      }),
};

export default nextConfig;
