import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, TerminalSquare, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAppStore } from '@/store/appStore';
import { cn } from '@/lib/utils';

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString('zh-CN', { hour12: false });
}

const levelClass = {
  info: 'text-sky-300',
  warn: 'text-orange-300',
  error: 'text-red-300'
};

export function LogPanel() {
  const logs = useAppStore((state) => state.logs);
  const clearLogs = useAppStore((state) => state.clearLogs);
  const [collapsed, setCollapsed] = useState(false);
  const [level, setLevel] = useState<'all' | 'info' | 'warn' | 'error'>('all');
  const bottomRef = useRef<HTMLDivElement>(null);
  const previousLogCountRef = useRef(logs.length);
  const filteredLogs = level === 'all' ? logs : logs.filter((log) => log.level === level);

  useEffect(() => {
    const logCountChanged = previousLogCountRef.current !== logs.length;
    previousLogCountRef.current = logs.length;

    if (collapsed || !logCountChanged) {
      return;
    }

    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [logs.length, collapsed]);

  return (
    <section className={cn('absolute inset-x-0 bottom-0 z-20 overflow-hidden border-t bg-card/95 backdrop-blur transition-[height]', collapsed ? 'h-10' : 'h-[220px]')}>
      <div className="flex h-10 items-center justify-between px-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <TerminalSquare className="h-4 w-4 text-muted-foreground" />
          日志
          <span className="text-xs text-muted-foreground">{logs.length}</span>
        </div>
        <div className="flex items-center gap-2">
          {!collapsed ? (
            <Tabs value={level} onValueChange={(value) => setLevel(value as typeof level)}>
              <TabsList>
                <TabsTrigger value="all">全部</TabsTrigger>
                <TabsTrigger value="info">info</TabsTrigger>
                <TabsTrigger value="warn">warn</TabsTrigger>
                <TabsTrigger value="error">error</TabsTrigger>
              </TabsList>
            </Tabs>
          ) : null}
          <Button size="icon" variant="ghost" onClick={() => clearLogs()} aria-label="清空日志">
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => setCollapsed((value) => !value)} aria-label={collapsed ? '展开日志' : '折叠日志'}>
            {collapsed ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>
      {!collapsed ? (
        <>
          <Separator />
          <ScrollArea className="h-[178px]">
            <div className="space-y-1 px-3 py-2 font-mono text-xs">
              {filteredLogs.map((log) => (
                <div key={log.id} className="flex gap-2">
                  <span className="text-muted-foreground">[{formatTime(log.createdAt)}]</span>
                  <span className={levelClass[log.level]}>[{log.level}]</span>
                  <span className="min-w-0 flex-1 text-foreground/90">{log.message}</span>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          </ScrollArea>
        </>
      ) : null}
    </section>
  );
}
