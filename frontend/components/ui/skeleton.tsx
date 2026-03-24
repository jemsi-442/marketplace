import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn('animate-pulse rounded-2xl bg-[linear-gradient(90deg,rgba(255,255,255,0.08),rgba(255,255,255,0.16),rgba(255,255,255,0.08))] bg-[length:200%_100%]', className)} />;
}
