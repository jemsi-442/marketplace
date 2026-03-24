'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type PropsWithChildren, useEffect, useState } from 'react';

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
    void useAuthStore.persist.rehydrate();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <RouteProgress />
      {children}
      <ToastRegion />
    </QueryClientProvider>
  );
}
