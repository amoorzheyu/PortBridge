import { zodResolver } from '@hookform/resolvers/zod';
import { Upload } from 'lucide-react';
import { useForm } from 'react-hook-form';
import type { Group, ServerConfig } from '@shared/types';
import { createServerSchema, type CreateServerInput } from '@shared/schemas';
import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { electronApi } from '@/api/electronApi';

interface ServerFormProps {
  groups: Group[];
  server?: ServerConfig;
  defaultGroupId?: string;
  onSubmit: (input: CreateServerInput) => Promise<void>;
  onCancel: () => void;
}

export function ServerForm({ groups, server, defaultGroupId, onSubmit, onCancel }: ServerFormProps) {
  const form = useForm<CreateServerInput>({
    resolver: zodResolver(createServerSchema),
    defaultValues: {
      groupId: server?.groupId ?? defaultGroupId ?? groups[0]?.id ?? '',
      name: server?.name ?? '',
      host: server?.host ?? '',
      port: server?.port ?? 22,
      username: server?.username ?? '',
      authType: server?.authType ?? 'password',
      password: '',
      privateKey: '',
      privateKeyPath: server?.privateKeyPath ?? '',
      privateKeyPassphrase: ''
    }
  });
  const authType = form.watch('authType');

  const applyPrivateKeyFile = async (file: File) => {
    const content = await file.text();
    const path = (file as File & { path?: string }).path;
    form.setValue('privateKey', content, { shouldDirty: true, shouldValidate: true });
    form.setValue('privateKeyPath', path || file.name, { shouldDirty: true });
  };

  const selectPrivateKey = async () => {
    const file = await electronApi.files.selectPrivateKey();
    if (!file) return;
    form.setValue('privateKey', file.content, { shouldDirty: true, shouldValidate: true });
    form.setValue('privateKeyPath', file.path, { shouldDirty: true });
  };

  return (
    <Form {...form}>
      <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>服务器名称</FormLabel>
                <FormControl>
                  <Input autoFocus {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="groupId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>分组</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {groups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-[1fr_120px] gap-4">
          <FormField
            control={form.control}
            name="host"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Host</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="port"
            render={({ field }) => (
              <FormItem>
                <FormLabel>SSH 端口</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    value={field.value ?? ''}
                    onChange={(event) => field.onChange(event.target.value === '' ? undefined : Number(event.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>用户名</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="authType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>认证方式</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="password">密码</SelectItem>
                    <SelectItem value="privateKey">私钥</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {authType === 'password' ? (
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>密码</FormLabel>
                <FormControl>
                  <Input type="password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : (
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="privateKey"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>私钥内容</FormLabel>
                    <Button type="button" variant="secondary" size="sm" onClick={selectPrivateKey}>
                      <Upload className="mr-2 h-4 w-4" />
                      选择文件
                    </Button>
                  </div>
                  <FormControl>
                    <Textarea
                      className="min-h-32 resize-y font-mono text-xs"
                      placeholder="-----BEGIN OPENSSH PRIVATE KEY-----"
                      {...field}
                      onDragOver={(event) => {
                        event.preventDefault();
                        event.dataTransfer.dropEffect = 'copy';
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        const file = event.dataTransfer.files?.[0];
                        if (file) void applyPrivateKeyFile(file);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="privateKeyPath"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>私钥文件</FormLabel>
                    <FormControl>
                      <Input placeholder="可选" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="privateKeyPassphrase"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>私钥口令</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            取消
          </Button>
          <Button type="submit">保存</Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
