import { CircleCheck, CircleX, Loader2, PauseCircle, RefreshCw, TriangleAlert } from 'lucide-react';
import type { TunnelStatus } from '@shared/types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const statusMap: Record<TunnelStatus, { label: string; className: string; icon: typeof CircleCheck }> = {
  stopped: { label: '未启动', className: 'border-border bg-muted text-muted-foreground', icon: PauseCircle },
  starting: { label: '启动中', className: 'border-sky-500/30 bg-sky-500/12 text-sky-300', icon: Loader2 },
  running: { label: '运行中', className: 'border-emerald-500/30 bg-emerald-500/12 text-emerald-300', icon: CircleCheck },
  stopping: { label: '停止中', className: 'border-yellow-500/30 bg-yellow-500/12 text-yellow-300', icon: TriangleAlert },
  reconnecting: { label: '重连中', className: 'border-orange-500/30 bg-orange-500/12 text-orange-300', icon: RefreshCw },
  error: { label: '错误', className: 'border-red-500/30 bg-red-500/12 text-red-300', icon: CircleX }
};

export function StatusBadge({ status }: { status: TunnelStatus }) {
  const config = statusMap[status];
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={cn('gap-1.5 px-2', config.className)}>
      <Icon className={cn('h-3.5 w-3.5', (status === 'starting' || status === 'reconnecting') && 'animate-spin')} />
      {config.label}
    </Badge>
  );
}
