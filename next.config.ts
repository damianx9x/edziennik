import type { NextConfig } from "next";

const isStaticPreview = process.env.KLA_STATIC_PREVIEW === "1";

const nextConfig: NextConfig = {
  output: isStaticPreview ? "export" : "standalone",
  trailingSlash: isStaticPreview,
  images: {
    unoptimized: isStaticPreview,
  },
  poweredByHeader: false,
  reactStrictMode: true,
};

export default nextConfig;
