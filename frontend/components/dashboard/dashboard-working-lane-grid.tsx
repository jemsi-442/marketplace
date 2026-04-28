import { WorkingLaneCard, type WorkingLaneCardProps } from '@/components/dashboard/working-lane-card';

interface DashboardWorkingLaneGridProps {
  items: WorkingLaneCardProps[];
}

export function DashboardWorkingLaneGrid({ items }: DashboardWorkingLaneGridProps) {
  return (
    <div className="grid gap-6 xl:grid-cols-4">
      {items.map((item) => (
        <WorkingLaneCard key={`${item.eyebrow}-${item.title}`} {...item} />
      ))}
    </div>
  );
}
