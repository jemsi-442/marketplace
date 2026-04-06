import type { ReactNode } from 'react';

import { DashboardLayoutFrame } from '@/components/layout/dashboard-shell';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <DashboardLayoutFrame>{children}</DashboardLayoutFrame>;
}
