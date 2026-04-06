import type { NextConfig } from 'next';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const allowedDevOrigins = (process.env.ALLOWED_DEV_ORIGINS ?? '192.168.1.186')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

function buildContentSecurityPolicy(isProduction: boolean): string {
  const connectSrc = isProduction
    ? ["'self'"]
    : ["'self'", 'http://127.0.0.1:8000', 'http://localhost:8000', 'ws://127.0.0.1:*', 'ws://localhost:*'];

  const scriptSrc = isProduction
    ? ["'self'", "'unsafe-inline'"]
    : ["'self'", "'unsafe-inline'", "'unsafe-eval'"];

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "frame-src 'none'",
    "object-src 'none'",
    "form-action 'self'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https:",
    "style-src 'self' 'unsafe-inline'",
    `script-src ${scriptSrc.join(' ')}`,
    `connect-src ${connectSrc.join(' ')}`,
    "manifest-src 'self'",
    "worker-src 'self' blob:",
    "media-src 'self'",
    ...(isProduction ? ['upgrade-insecure-requests'] : []),
  ].join('; ');
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins,
  outputFileTracingRoot: rootDir,
  experimental: {
    webpackBuildWorker: false,
  },
  async headers() {
    const isProduction = process.env.NODE_ENV === 'production';
    const securityHeaders = [
      {
        key: 'X-Content-Type-Options',
        value: 'nosniff',
      },
      {
        key: 'X-Frame-Options',
        value: 'DENY',
      },
      {
        key: 'Referrer-Policy',
        value: 'strict-origin-when-cross-origin',
      },
      {
        key: 'Permissions-Policy',
        value: 'camera=(), geolocation=(), microphone=(), payment=(), usb=()',
      },
      {
        key: 'Cross-Origin-Opener-Policy',
        value: 'same-origin',
      },
      {
        key: 'Cross-Origin-Resource-Policy',
        value: 'same-site',
      },
      {
        key: 'Origin-Agent-Cluster',
        value: '?1',
      },
      {
        key: 'Content-Security-Policy',
        value: buildContentSecurityPolicy(isProduction),
      },
      ...(isProduction
        ? [
            {
              key: 'Strict-Transport-Security',
              value: 'max-age=31536000; includeSubDomains; preload',
            },
          ]
        : []),
    ];

    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
  async rewrites() {
    const backendInternalUrl = process.env.BACKEND_INTERNAL_URL ?? 'http://127.0.0.1:8000';

    return [
      {
        source: '/backend-api/:path*',
        destination: `${backendInternalUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
