import type { NextConfig } from "next";
import withPWAInit from "next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  // Register service worker manually (avoids inline script injection that triggers CSP console errors).
  register: false,
  skipWaiting: true,
  disable:
    process.env.NODE_ENV === "development" ||
    process.env.DISABLE_PWA === "true",
});

const enableSri = process.env.ENABLE_SRI === "true" && process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  ...(enableSri
    ? {
        experimental: {
          sri: {
            algorithm: "sha256",
          },
        },
      }
    : {}),
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  turbopack: {},
  images: {
    unoptimized: true,
  },
  logging: {
    fetches: {
      fullUrl: process.env.NODE_ENV === "development",
    },
  },
  async headers() {
    const enableApiCors = process.env.ENABLE_API_CORS === "true";
    const apiCorsAllowOrigin = (process.env.API_CORS_ALLOW_ORIGIN || "").trim();

    const securityHeaders = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
      { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
      {
        key: "Permissions-Policy",
        value:
          "accelerometer=(), ambient-light-sensor=(), autoplay=(), battery=(), camera=(), display-capture=(), encrypted-media=(), fullscreen=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), midi=(), payment=(), picture-in-picture=(), publickey-credentials-get=(), usb=()",
      },
      { key: "X-DNS-Prefetch-Control", value: "on" },
      { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
      { key: "X-Download-Options", value: "noopen" },
      {
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      },
    ];

    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },

      ...(enableApiCors && apiCorsAllowOrigin
        ? [
            {
              source: "/api/:path*",
              headers: [
                { key: "Access-Control-Allow-Origin", value: apiCorsAllowOrigin },
                { key: "Vary", value: "Origin" },
                {
                  key: "Access-Control-Allow-Methods",
                  value: "GET,POST,PUT,DELETE,OPTIONS",
                },
                {
                  key: "Access-Control-Allow-Headers",
                  value: "Content-Type, Authorization",
                },
              ],
            },
          ]
        : []),
    ];
  },
};

export default withPWA(nextConfig);
