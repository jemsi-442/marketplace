import type { NextConfig } from 'next';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async rewrites() {
    const backendInternalUrl = process.env.BACKEND_INTERNAL_URL ?? 'http://127.0.0.1:8000';

    return [
      {
        source: '/backend-api/:path*',
        destination: `${backendInternalUrl}/:path*`,
      },
    ];
  },
  turbopack: {
    root: rootDir,
  },
};

export default nextConfig;
