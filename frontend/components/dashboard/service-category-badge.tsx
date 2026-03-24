import type { LucideIcon } from 'lucide-react';
import {
  BarChart3,
  Brush,
  Code2,
  FilePenLine,
  Globe,
  Landmark,
  Megaphone,
  MonitorSmartphone,
  Palette,
  PenTool,
  PlaySquare,
  Settings2,
} from 'lucide-react';

import { cn } from '@/lib/utils';

const iconMap: Record<string, LucideIcon> = {
  'Software Engineering': Code2,
  'Web Development': Globe,
  'Mobile App Development': MonitorSmartphone,
  'Government Consultancy Services': Landmark,
  'UI/UX Design': PenTool,
  'Graphic Design': Palette,
  'Brand Identity Design': Brush,
  'Motion Graphics': PlaySquare,
  'Video Editing': PlaySquare,
  'Social Media Management': Megaphone,
  'Content Design': FilePenLine,
  'Copywriting': FilePenLine,
  SEO: BarChart3,
  'Digital Marketing': Megaphone,
  'Automation & Integrations': Settings2,
  'Analytics & Dashboards': BarChart3,
};

interface ServiceCategoryBadgeProps {
  category?: string | null;
  className?: string;
}

export function ServiceCategoryBadge({ category, className }: ServiceCategoryBadgeProps) {
  const label = category?.trim() || 'Other Digital Service';
  const Icon = iconMap[label] ?? Palette;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[linear-gradient(135deg,rgba(16,38,48,0.9),rgba(12,29,37,0.68))] px-3 py-2 text-[11px] uppercase tracking-[0.16em] text-[var(--brand-secondary)] transition duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[1px] hover:border-[rgba(155,183,238,0.34)] hover:shadow-[0_12px_26px_rgba(0,0,0,0.18)]',
        className,
      )}
    >
      <Icon className="size-3.5" />
      <span>{label}</span>
    </span>
  );
}
