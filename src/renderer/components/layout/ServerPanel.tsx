import { useMemo, useState } from 'react';
import { KeyRound, MoreHorizontal, Play, Plus, Server, Square } from 'lucide-react';
import type { ServerConfig, TunnelStatus } from '@shared/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ServerForm } from '@/components/forms/ServerForm';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { StatusBadge } from '@/components/common/StatusBadge';
import { EmptyState } from '@/components/common/EmptyState';
import { useAppStore } from '@/store/appStore';
import { cn } from '@/lib/utils';

function getServerStatus(serverId: string, statuses: TunnelStatus[]): TunnelStatus {
  if (statuses.includes('error')) return 'error';
  if (statuses.includes('reconnecting')) return 'reconnecting';
  if (statuses.includes('running')) return 'running';
  if (statuses.includes('starting')) return 'starting';
  if (statuses.includes('stopping')) return 'stopping';
  return 'stopped';
}

export function ServerPanel() {
  const store = useAppStore();
  const [open, setOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<ServerConfig | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<ServerConfig | undefined>();
  const filteredServers = useMemo(() => {
    return store.servers.filter((server) => store.selectedGroupId === 'all' || server.groupId === store.selectedGroupId);
  }, [store.servers, store.selectedGroupId]);

  const openCreate = () => {
    setEditingServer(undefined);
    setOpen(true);
  };

  const openEdit = (server: ServerConfig) => {
    setEditingServer(server);
    setOpen(true);
  };

  return (
    <section className="flex min-h-0 flex-col border-r bg-background">
      <div className="flex h-12 items-center justify-between px-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Server className="h-4 w-4 text-muted-foreground" />
          服务器
        </div>
        <Button size="icon" variant="ghost" onClick={openCreate} disabled={store.groups.length === 0} aria-label="新增服务器">
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <Separator />
      <ScrollArea className="min-h-0 flex-1">
        {filteredServers.length === 0 ? (
          <EmptyState icon={Server} title={store.groups.length === 0 ? '先创建分组' : '暂无服务器'} />
        ) : (
          <div className="space-y-2 p-2">
            {filteredServers.map((server) => {
              const serverTunnels = store.tunnels.filter((tunnel) => tunnel.serverId === server.id);
              const status = getServerStatus(server.id, serverTunnels.map((tunnel) => store.states[tunnel.id]?.status ?? 'stopped'));
              return (
                <div
                  key={server.id}
                  className={cn('group rounded-lg border bg-card/50 p-3 hover:bg-accent/50', store.selectedServerId === server.id && 'border-primary/40 bg-accent')}
                  onClick={() => store.selectServer(server.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 space-y-1">
                      <div className="truncate text-sm font-medium">{server.name}</div>
                      <div className="truncate font-mono text-xs text-muted-foreground">{server.host}:{server.port}</div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-7 w-7 opacity-0 group-hover:opacity-100" aria-label="服务器操作">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(event) => {
                          event.stopPropagation();
                          void store.startServerTunnels(server.id);
                        }}>
                          <Play className="mr-2 h-4 w-4" />
                          启动全部
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(event) => {
                          event.stopPropagation();
                          void store.stopServerTunnels(server.id);
                        }}>
                          <Square className="mr-2 h-4 w-4" />
                          停止全部
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={(event) => {
                          event.stopPropagation();
                          openEdit(server);
                        }}>编辑</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={(event) => {
                          event.stopPropagation();
                          setDeleteTarget(server);
                        }}>
                          删除
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
                      <KeyRound className="h-3.5 w-3.5" />
                      <span>{server.username}</span>
                      <span>·</span>
                      <span>{server.authType === 'password' ? '密码' : '私钥'}</span>
                      <span>·</span>
                      <span>{serverTunnels.length} 条</span>
                    </div>
                    <StatusBadge status={status} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[520px]">
          <DialogHeader>
            <DialogTitle>{editingServer ? '编辑服务器' : '新增服务器'}</DialogTitle>
          </DialogHeader>
          <ServerForm
            key={editingServer?.id ?? 'create'}
            groups={store.groups}
            server={editingServer}
            defaultGroupId={store.selectedGroupId === 'all' ? undefined : store.selectedGroupId}
            onCancel={() => setOpen(false)}
            onSubmit={async (input) => {
              if (editingServer) await store.updateServer({ ...input, id: editingServer.id });
              else await store.createServer(input);
              setOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="删除服务器"
        description="删除服务器会同时删除其映射规则。运行中的映射需要先停止。"
        onOpenChange={(value) => !value && setDeleteTarget(undefined)}
        onConfirm={() => {
          if (deleteTarget) void store.deleteServer(deleteTarget.id);
          setDeleteTarget(undefined);
        }}
      />
    </section>
  );
}
