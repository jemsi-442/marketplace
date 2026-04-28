import { Skeleton } from '@/components/ui/skeleton';

interface DashboardPageSkeletonProps {
  statsCount?: number;
  sections?: number;
}

export function DashboardPageSkeleton({
  statsCount = 4,
  sections = 2,
}: DashboardPageSkeletonProps) {
  return (
    <>
      <Skeleton className="h-56 rounded-[30px]" />
      <div className={`grid gap-4 md:grid-cols-2 ${statsCount >= 4 ? 'xl:grid-cols-4' : 'xl:grid-cols-3'}`}>
        {Array.from({ length: statsCount }).map((_, index) => (
          <Skeleton key={index} className="h-52 rounded-[28px]" />
        ))}
      </div>
      {Array.from({ length: sections }).map((_, index) => (
        <Skeleton
          key={index}
          className={index === 0 ? 'h-[42rem] rounded-[30px] lg:h-[52rem]' : 'h-[22rem] rounded-[30px] lg:h-[28rem]'}
        />
      ))}
    </>
  );
}
