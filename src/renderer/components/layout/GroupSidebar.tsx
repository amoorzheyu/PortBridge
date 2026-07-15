import { useMemo, useState } from 'react';
import { Download, Folder, MoreHorizontal, Plus, Upload } from 'lucide-react';
import type { Group } from '@shared/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger } from '@/components/ui/context-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { GroupForm } from '@/components/forms/GroupForm';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { ConfigTransferDialog } from './ConfigTransferDialog';
import { useAppStore } from '@/store/appStore';
import { cn } from '@/lib/utils';

export function GroupSidebar() {
  const { groups, servers, selectedGroupId, selectGroup, createGroup, updateGroup, deleteGroup } = useAppStore();
  const [editingGroup, setEditingGroup] = useState<Group | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<Group | undefined>();
  const [open, setOpen] = useState(false);
  const [configDialog, setConfigDialog] = useState<'import' | 'export' | undefined>();
  const counts = useMemo(() => {
    return groups.reduce<Record<string, number>>((acc, group) => {
      acc[group.id] = servers.filter((server) => server.groupId === group.id).length;
      return acc;
    }, {});
  }, [groups, servers]);

  const openCreate = () => {
    setEditingGroup(undefined);
    setOpen(true);
  };

  const openEdit = (group: Group) => {
    setEditingGroup(group);
    setOpen(true);
  };

  return (
    <aside className="flex min-h-0 flex-col border-r bg-card/40">
      <div className="flex h-12 items-center justify-between px-3">
        <div className="text-sm font-semibold">PortBridge</div>
        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" className="focus-visible:ring-0" aria-label="配置操作">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setConfigDialog('import')}>
                <Upload className="mr-2 h-4 w-4" />
                导入配置
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setConfigDialog('export')}>
                <Download className="mr-2 h-4 w-4" />
                导出配置
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="icon" variant="ghost" className="focus-visible:ring-0" onClick={openCreate} aria-label="新增分组">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <Separator />
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-1 px-2 pb-5 pt-2">
          <button
            className={cn('flex h-9 w-full items-center gap-2 rounded-md px-2 text-left text-sm hover:bg-accent', selectedGroupId === 'all' && 'bg-accent')}
            onClick={() => selectGroup('all')}
          >
            <Folder className="h-4 w-4 text-muted-foreground" />
            <span className="min-w-0 flex-1 truncate">全部</span>
            <span className="text-xs text-muted-foreground">{servers.length}</span>
          </button>
          {groups.map((group) => {
            const serverCount = counts[group.id] ?? 0;
            return (
              <div key={group.id} className="space-y-1">
                <ContextMenu>
                  <ContextMenuTrigger asChild>
                    <div className={cn('group flex h-9 items-center rounded-md hover:bg-accent', selectedGroupId === group.id && 'bg-accent')}>
                      <button className="flex min-w-0 flex-1 items-center gap-2 px-2 text-left text-sm" onClick={() => selectGroup(group.id)}>
                        <Folder className="h-4 w-4 text-muted-foreground" />
                        <span className="min-w-0 flex-1 truncate">{group.name}</span>
                        <span className="text-xs text-muted-foreground">{serverCount}</span>
                      </button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" className="mr-1 h-7 w-7 opacity-0 focus-visible:ring-0 group-hover:opacity-100" aria-label="分组操作">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(group)}>编辑</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget(group)}>
                            删除
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    <ContextMenuItem onClick={() => openEdit(group)}>编辑</ContextMenuItem>
                    <ContextMenuItem className="text-destructive" onClick={() => setDeleteTarget(group)}>
                      删除
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[400px]">
          <DialogHeader>
            <DialogTitle>{editingGroup ? '编辑分组' : '新增分组'}</DialogTitle>
          </DialogHeader>
          <GroupForm
            group={editingGroup}
            onCancel={() => setOpen(false)}
            onSubmit={async (input) => {
              if (editingGroup) await updateGroup({ ...input, id: editingGroup.id });
              else await createGroup(input);
              setOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="删除分组"
        description="该操作不可撤销。分组下存在服务器时将无法删除。"
        onOpenChange={(value) => !value && setDeleteTarget(undefined)}
        onConfirm={() => {
          if (deleteTarget) void deleteGroup(deleteTarget.id);
          setDeleteTarget(undefined);
        }}
      />

      {configDialog ? (
        <ConfigTransferDialog
          mode={configDialog}
          open={Boolean(configDialog)}
          onOpenChange={(value) => {
            if (!value) setConfigDialog(undefined);
          }}
        />
      ) : null}
    </aside>
  );
}
