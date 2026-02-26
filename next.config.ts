import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // CRÍTICO para Docker: genera servidor standalone sin node_modules completo
  output: "standalone",

  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },

  images: {
    remotePatterns: [
      { protocol: "http", hostname: "localhost" },
      // En producción, añadir solo tu dominio real:
      // { protocol: "https", hostname: "app.multitravelcherrymatute.com" },
    ],
  },

  async rewrites() {
    return [
      {
        source: "/uploads/:path*",
        destination: "/api/files/:path*",
      },
    ];
  },

  async headers() {
    const isDev = process.env.NODE_ENV === "development";
    const csp = [
      "default-src 'self'",
      // unsafe-inline/eval necesario para Next.js
      isDev
        ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
        : "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self'",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ");

    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Content-Security-Policy", value: csp },
          { key: "X-DNS-Prefetch-Control", value: "off" },
          { key: "X-Download-Options", value: "noopen" },
          { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
        ],
      },
    ];
  },

  poweredByHeader: false,
};

export default nextConfig;
