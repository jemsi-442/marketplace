'use client';

import { ShieldAlert, ShieldCheck, Waypoints } from 'lucide-react';

import { RuntimePostureCard } from '@/components/dashboard/runtime-posture-card';
import { SectionHeader } from '@/components/ui/section-header';
import type { AdminMetricsHealth, AdminOpsOverview } from '@/lib/types';

interface AdminDashboardRuntimeSectionProps {
  metricsHealth: AdminMetricsHealth | undefined;
  opsOverview: AdminOpsOverview | undefined;
}

export function AdminDashboardRuntimeSection({
  metricsHealth,
  opsOverview,
}: AdminDashboardRuntimeSectionProps) {
  return (
    <div className="space-y-4">
      <SectionHeader
        eyebrow="Runtime posture"
        title="Check tracing, metrics freshness, and upload protection"
        description="These runtime cards keep operational diagnostics visible before you drop into control workflows."
        variant="guidance"
      />
      <div className="grid gap-4 xl:grid-cols-3">
        <RuntimePostureCard
          label="Request tracing"
          value={opsOverview?.request_tracing.enabled ? 'Active' : 'Unknown'}
          detail="API failures now carry a request ID for faster tracing across logs and support checks."
          accent="var(--accent-teal)"
          icon={<ShieldCheck className="size-4" />}
        />

        <RuntimePostureCard
          label="Metrics freshness"
          value={opsOverview?.metrics_pipeline.status ?? metricsHealth?.status ?? 'Syncing'}
          detail={
            opsOverview?.metrics_pipeline.message ??
            metricsHealth?.message ??
            'Waiting for the latest snapshot signal.'
          }
          accent="var(--accent-cyan)"
          icon={<Waypoints className="size-4" />}
        />

        <RuntimePostureCard
          label="File protection"
          value={
            opsOverview?.object_storage.driver
              ? `${opsOverview.object_storage.driver} storage`
              : 'Checking'
          }
          detail={
            opsOverview?.object_storage.message ??
            'Waiting for object storage posture.'
          }
          accent="var(--accent-amber)"
          icon={<ShieldAlert className="size-4" />}
          chips={
            opsOverview
              ? [
                  `Storage ${opsOverview.object_storage.status}`,
                  `Scan ${opsOverview.upload_scanning.status}`,
                  `Env ${opsOverview.app_env}`,
                  `Timeout ${opsOverview.upload_scanning.timeout_seconds}s`,
                  opsOverview.upload_scanning.fail_closed
                    ? 'Fail closed'
                    : 'Fail open',
                ]
              : []
          }
        />
      </div>
    </div>
  );
}
