import { useEffect } from 'react';
import { Toaster } from 'sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { GroupSidebar } from './GroupSidebar';
import { ServerPanel } from './ServerPanel';
import { TunnelPanel } from './TunnelPanel';
import { LogPanel } from './LogPanel';
import { useAppStore } from '@/store/appStore';

export function AppLayout() {
  const bootstrap = useAppStore((state) => state.bootstrap);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  return (
    <TooltipProvider>
      <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
        <div className="grid min-h-0 flex-1 grid-cols-[220px_320px_minmax(0,1fr)]">
          <GroupSidebar />
          <ServerPanel />
          <TunnelPanel />
        </div>
        <LogPanel />
      </div>
      <Toaster theme="dark" richColors closeButton position="top-right" />
    </TooltipProvider>
  );
}
