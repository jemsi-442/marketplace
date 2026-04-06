import type { MetadataRoute } from 'next';

import { appConfig } from '@/lib/config';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: appConfig.name,
    short_name: 'WOLFIX',
    description: appConfig.description,
    start_url: '/?source=pwa',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f8f4ea',
    theme_color: '#f59e0b',
    lang: 'en',
    categories: ['business', 'productivity'],
    icons: [
      {
        src: '/icons/icon-192.svg',
        sizes: '192x192',
        type: 'image/svg+xml',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.svg',
        sizes: '512x512',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      {
        name: 'Open Dashboard',
        short_name: 'Dashboard',
        url: '/dashboard',
        icons: [{ src: '/icons/icon-192.svg', sizes: '192x192' }],
      },
      {
        name: 'Sign In',
        short_name: 'Login',
        url: '/login',
        icons: [{ src: '/icons/icon-192.svg', sizes: '192x192' }],
      },
      {
        name: 'Create Account',
        short_name: 'Register',
        url: '/register',
        icons: [{ src: '/icons/icon-192.svg', sizes: '192x192' }],
      },
    ],
  };
}
