'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type PropsWithChildren, useEffect, useState } from 'react';

import { ServiceWorkerRegistration } from '@/components/pwa/service-worker-registration';
import { NetworkStatusNotifier } from '@/components/pwa/network-status-notifier';
import { RouteProgress } from '@/components/ui/route-progress';
import { ToastRegion } from '@/components/ui/toast-region';
import { useAuthStore } from '@/lib/auth/store';

export function AppProviders({ children }: PropsWithChildren) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            staleTime: 30000,
          },
        },
      }),
  );

  useEffect(() => {
    void useAuthStore.getState().bootstrap();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ServiceWorkerRegistration />
      <NetworkStatusNotifier />
      <RouteProgress />
      {children}
      <ToastRegion />
    </QueryClientProvider>
  );
}
