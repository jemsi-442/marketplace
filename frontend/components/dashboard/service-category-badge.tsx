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
  const toneClass = (
    label.includes('Software') ||
    label.includes('Automation') ||
    label.includes('Analytics') ||
    label.includes('Web') ||
    label.includes('Mobile')
  )
    ? 'border-[rgba(79,70,229,0.14)] bg-[rgba(238,242,255,0.94)] text-[var(--brand-primary)] hover:border-[rgba(99,102,241,0.24)]'
    : label.includes('Design') || label.includes('Brand') || label.includes('Motion') || label.includes('Video')
      ? 'border-[rgba(139,92,246,0.14)] bg-[rgba(245,243,255,0.94)] text-[var(--accent-violet)] hover:border-[rgba(139,92,246,0.24)]'
      : label.includes('Marketing') || label.includes('Social') || label.includes('SEO') || label.includes('Content') || label.includes('Copy')
        ? 'border-[rgba(14,165,233,0.14)] bg-[rgba(240,249,255,0.94)] text-[var(--accent-cyan)] hover:border-[rgba(14,165,233,0.24)]'
        : label.includes('Government')
          ? 'border-[rgba(245,158,11,0.16)] bg-[rgba(255,251,235,0.94)] text-[var(--accent-amber)] hover:border-[rgba(245,158,11,0.24)]'
          : 'border-[rgba(20,184,166,0.14)] bg-[rgba(240,253,250,0.94)] text-[var(--accent-teal)] hover:border-[rgba(20,184,166,0.24)]';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[11px] uppercase tracking-[0.16em] shadow-[0_8px_18px_rgba(15,23,42,0.04)] transition duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[1px] hover:shadow-[0_12px_26px_rgba(15,23,42,0.08)]',
        toneClass,
        className,
      )}
    >
      <Icon className="size-3.5" />
      <span>{label}</span>
    </span>
  );
}
