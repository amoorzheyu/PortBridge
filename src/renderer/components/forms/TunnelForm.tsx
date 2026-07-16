import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import type { TunnelRule } from '@shared/types';
import { checkPortSchema, createTunnelSchema, portSchema, type CreateTunnelInput } from '@shared/schemas';
import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { electronApi } from '@/api/electronApi';

interface TunnelFormProps {
  serverId: string;
  tunnel?: TunnelRule;
  onSubmit: (input: CreateTunnelInput) => Promise<void>;
  onCancel: () => void;
}

type TunnelFormInput = Omit<CreateTunnelInput, 'localPort' | 'remotePort'> & {
  localPort: string;
  remotePort: string;
};

export function TunnelForm({ serverId, tunnel, onSubmit, onCancel }: TunnelFormProps) {
  const defaultLocalPort = tunnel?.localPort ?? 3307;
  const defaultRemotePort = tunnel?.remotePort ?? 3306;
  const tunnelFormSchema = useMemo(() => createTunnelSchema.extend({
    localPort: z.preprocess((value) => value === '' || value == null ? defaultLocalPort : value, portSchema),
    remotePort: z.preprocess((value) => value === '' || value == null ? defaultRemotePort : value, portSchema)
  }), [defaultLocalPort, defaultRemotePort]);

  const form = useForm<TunnelFormInput>({
    resolver: zodResolver(tunnelFormSchema) as Resolver<TunnelFormInput>,
    defaultValues: {
      serverId,
      name: tunnel?.name ?? '',
      localHost: tunnel?.localHost ?? '127.0.0.1',
      localPort: tunnel?.localPort ? String(tunnel.localPort) : '',
      remoteHost: tunnel?.remoteHost ?? '127.0.0.1',
      remotePort: tunnel?.remotePort ? String(tunnel.remotePort) : '',
      autoStart: tunnel?.autoStart ?? false
    }
  });

  const checkPort = async () => {
    const localHost = form.getValues('localHost');
    const localPort = form.getValues('localPort');
    const parsed = checkPortSchema.safeParse({
      host: localHost,
      port: localPort === '' ? defaultLocalPort : localPort
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? '端口必须是 1-65535');
      return;
    }
    const available = await electronApi.runtime.checkPort(parsed.data.host, parsed.data.port);
    if (available) toast.success('端口可用');
    else toast.error(`本地端口 ${parsed.data.host}:${parsed.data.port} 已被占用`);
  };

  const handleSubmit = form.handleSubmit((values) => onSubmit(tunnelFormSchema.parse(values)));

  return (
    <Form {...form}>
      <form className="space-y-5" onSubmit={handleSubmit}>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>规则名称</FormLabel>
              <FormControl>
                <Input autoFocus {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-[1fr_120px] gap-4">
          <FormField
            control={form.control}
            name="localHost"
            render={({ field }) => (
              <FormItem>
                <FormLabel>本地监听地址</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="localPort"
            render={({ field }) => (
              <FormItem>
                <FormLabel>本地端口</FormLabel>
                <FormControl>
                  <Input
                    inputMode="numeric"
                    placeholder={String(defaultLocalPort)}
                    value={field.value ?? ''}
                    onChange={(event) => field.onChange(event.target.value)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-[1fr_120px] gap-4">
          <FormField
            control={form.control}
            name="remoteHost"
            render={({ field }) => (
              <FormItem>
                <FormLabel>远程目标地址</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="remotePort"
            render={({ field }) => (
              <FormItem>
                <FormLabel>远程端口</FormLabel>
                <FormControl>
                  <Input
                    inputMode="numeric"
                    placeholder={String(defaultRemotePort)}
                    value={field.value ?? ''}
                    onChange={(event) => field.onChange(event.target.value)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="autoStart"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-md border px-3 py-2">
              <FormLabel>自动启动</FormLabel>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={checkPort}>
            检测端口
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            取消
          </Button>
          <Button type="submit">保存</Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
