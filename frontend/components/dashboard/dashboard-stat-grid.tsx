import { StatCard, type StatCardProps } from '@/components/dashboard/stat-card';

interface DashboardStatGridProps {
  items: StatCardProps[];
}

export function DashboardStatGrid({ items }: DashboardStatGridProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <StatCard key={`${item.eyebrow}-${item.value}`} {...item} />
      ))}
    </div>
  );
}
