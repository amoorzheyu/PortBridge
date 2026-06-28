import { useMemo, useState } from 'react';
import { FileKey, Network, Pencil, Play, Plus, RefreshCw, Server, Square, Trash2 } from 'lucide-react';
import type { TunnelRule } from '@shared/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TunnelForm } from '@/components/forms/TunnelForm';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { EmptyState } from '@/components/common/EmptyState';
import { IconButton } from '@/components/common/IconButton';
import { StatusBadge } from '@/components/common/StatusBadge';
import { useAppStore } from '@/store/appStore';

export function TunnelPanel() {
  const store = useAppStore();
  const [open, setOpen] = useState(false);
  const [editingTunnel, setEditingTunnel] = useState<TunnelRule | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<TunnelRule | undefined>();
  const server = store.servers.find((item) => item.id === store.selectedServerId);
  const tunnels = useMemo(() => store.tunnels.filter((tunnel) => tunnel.serverId === store.selectedServerId), [store.tunnels, store.selectedServerId]);

  const openCreate = () => {
    setEditingTunnel(undefined);
    setOpen(true);
  };

  const openEdit = (tunnel: TunnelRule) => {
    setEditingTunnel(tunnel);
    setOpen(true);
  };

  if (!server) {
    return <EmptyState icon={Server} title="请选择服务器" className="bg-background" />;
  }

  return (
    <section className="flex min-h-0 flex-col bg-background">
      <div className="flex h-14 items-center justify-between border-b px-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-sm font-semibold">{server.name}</h2>
            <span className="rounded-md border px-1.5 py-0.5 text-xs text-muted-foreground">{server.authType === 'password' ? '密码' : '私钥'}</span>
          </div>
          <div className="mt-1 flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
            <FileKey className="h-3.5 w-3.5" />
            <span className="truncate">{server.username}@{server.host}:{server.port}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => store.stopServerTunnels(server.id)}>
            <Square className="mr-2 h-4 w-4" />
            停止全部
          </Button>
          <Button size="sm" onClick={() => store.startServerTunnels(server.id)}>
            <Play className="mr-2 h-4 w-4" />
            启动全部
          </Button>
          <Button size="icon" variant="secondary" onClick={openCreate} aria-label="新增映射">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {tunnels.length === 0 ? (
          <EmptyState icon={Network} title="暂无映射规则" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[22%]">规则名称</TableHead>
                <TableHead>本地监听</TableHead>
                <TableHead>远程目标</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>重连</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tunnels.map((tunnel) => {
                const runtime = store.states[tunnel.id];
                const status = runtime?.status ?? 'stopped';
                const isRunning = ['starting', 'running', 'reconnecting'].includes(status);
                return (
                  <TableRow key={tunnel.id}>
                    <TableCell>
                      <div className="font-medium">{tunnel.name}</div>
                      {runtime?.error ? <div className="mt-1 line-clamp-1 text-xs text-destructive">{runtime.error}</div> : null}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{tunnel.localHost}:{tunnel.localPort}</TableCell>
                    <TableCell className="font-mono text-xs">{tunnel.remoteHost}:{tunnel.remotePort}</TableCell>
                    <TableCell>
                      <StatusBadge status={status} />
                    </TableCell>
                    <TableCell className="font-mono text-xs">{runtime?.reconnectCount ?? 0}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        {isRunning ? (
                          <IconButton icon={Square} label="停止" onClick={() => store.stopTunnel(tunnel.id)} />
                        ) : (
                          <IconButton icon={Play} label="启动" onClick={() => store.startTunnel(tunnel.id)} />
                        )}
                        <IconButton icon={RefreshCw} label="重连" onClick={() => store.restartTunnel(tunnel.id)} />
                        <IconButton icon={Pencil} label="编辑" onClick={() => openEdit(tunnel)} disabled={isRunning} />
                        <IconButton icon={Trash2} label="删除" onClick={() => setDeleteTarget(tunnel)} disabled={isRunning} />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <Separator />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[520px]">
          <DialogHeader>
            <DialogTitle>{editingTunnel ? '编辑映射' : '新增映射'}</DialogTitle>
          </DialogHeader>
          <TunnelForm
            serverId={server.id}
            tunnel={editingTunnel}
            onCancel={() => setOpen(false)}
            onSubmit={async (input) => {
              if (editingTunnel) await store.updateTunnel({ ...input, id: editingTunnel.id });
              else await store.createTunnel(input);
              setOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="删除映射"
        description="删除后不可恢复。运行中的映射需要先停止。"
        onOpenChange={(value) => !value && setDeleteTarget(undefined)}
        onConfirm={() => {
          if (deleteTarget) void store.deleteTunnel(deleteTarget.id);
          setDeleteTarget(undefined);
        }}
      />
    </section>
  );
}
