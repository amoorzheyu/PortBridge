import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import type { TunnelRule } from '@shared/types';
import { createTunnelSchema, type CreateTunnelInput } from '@shared/schemas';
import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';

interface TunnelFormProps {
  serverId: string;
  tunnel?: TunnelRule;
  onSubmit: (input: CreateTunnelInput) => Promise<void>;
  onCancel: () => void;
}

export function TunnelForm({ serverId, tunnel, onSubmit, onCancel }: TunnelFormProps) {
  const form = useForm<CreateTunnelInput>({
    resolver: zodResolver(createTunnelSchema),
    defaultValues: {
      serverId,
      name: tunnel?.name ?? '',
      localHost: tunnel?.localHost ?? '127.0.0.1',
      localPort: tunnel?.localPort ?? 3307,
      remoteHost: tunnel?.remoteHost ?? '127.0.0.1',
      remotePort: tunnel?.remotePort ?? 3306,
      autoStart: tunnel?.autoStart ?? false
    }
  });

  return (
    <Form {...form}>
      <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
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
                  <Input type="number" {...field} onChange={(event) => field.onChange(Number(event.target.value))} />
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
                  <Input type="number" {...field} onChange={(event) => field.onChange(Number(event.target.value))} />
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
          <Button type="button" variant="outline" onClick={onCancel}>
            取消
          </Button>
          <Button type="submit">保存</Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
