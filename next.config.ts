import type { NextConfig } from "next";
import withPWAInit from "next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Don't ship source maps to the browser in production.
  productionBrowserSourceMaps: false,
  // Reduce information leakage via console logs in production.
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  turbopack: {},
  images: {
    unoptimized: true,
  },
  logging: {
    fetches: {
      // Avoid leaking sensitive query params/tokens in production logs.
      fullUrl: process.env.NODE_ENV === "development",
    },
  },
  async headers() {
    const isDev = process.env.NODE_ENV === "development";
    const isVercelPreview = process.env.VERCEL_ENV === "preview";
    const enableApiCors = process.env.ENABLE_API_CORS === "true";
    const apiCorsAllowOrigin = (process.env.API_CORS_ALLOW_ORIGIN || "").trim();

    // Pragmatic CSP for Next.js App Router:
    // - Allows inline scripts (Next injects some inline scripts)
    // - Allows unsafe-eval only in development (HMR/tooling)
    const allowVercelLive = isDev || isVercelPreview;

    const csp = [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      // Vercel Live injects a feedback iframe in Preview/Dev.
      // If frame-src/child-src are not set, browsers fall back to default-src and block it.
      `frame-src 'self'${allowVercelLive ? " https://vercel.live" : ""}`,
      `child-src 'self'${allowVercelLive ? " https://vercel.live" : ""}`,
      "form-action 'self'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data: https://fonts.gstatic.com",
      // Keep 'unsafe-inline' for now because the app uses inline styles in multiple places.
      // Narrow external stylesheets to Google Fonts only.
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      // Narrow scripts to self (and Vercel Live in dev/preview). Next.js may rely on inline scripts.
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}${allowVercelLive ? " https://vercel.live" : ""}`,
      // Tighten network destinations to known backends.
      `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.openweathermap.org https://v6.exchangerate-api.com${allowVercelLive ? " https://vercel.live" : ""}`,
      "worker-src 'self' blob:",
      "upgrade-insecure-requests",
    ]
      .join("; ")
      .trim();

    const securityHeaders = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      // Cross-origin isolation (safe defaults). Note: COEP can break 3rd-party assets, so it's intentionally not enabled here.
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
      // HSTS only makes sense over HTTPS (production). Browsers ignore it on HTTP.
      {
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      },
      { key: "Content-Security-Policy", value: csp },
    ];

    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      // CORS: disabled by default for stronger security.
      // If you need cross-origin API access, set:
      //   ENABLE_API_CORS=true
      //   API_CORS_ALLOW_ORIGIN=https://your-domain.com
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
    ]
  },
};

export default withPWA(nextConfig);
