import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, className }: EmptyStateProps) {
  return (
    <div className={cn('flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-muted-foreground', className)}>
      <div className="flex h-10 w-10 items-center justify-center rounded-lg border bg-muted/40">
        <Icon className="h-5 w-5" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {description ? <p className="max-w-64 text-xs leading-5">{description}</p> : null}
      </div>
    </div>
  );
}
