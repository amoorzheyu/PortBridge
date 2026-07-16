import { ipcMain } from 'electron';
import type { z, ZodTypeAny } from 'zod';

export function registerHandler<Schema extends ZodTypeAny, Output>(
  channel: string,
  schema: Schema,
  handler: (input: z.output<Schema>) => Output | Promise<Output>
): void;
export function registerHandler<Output>(
  channel: string,
  schema: null,
  handler: (input: unknown) => Output | Promise<Output>
): void;
export function registerHandler<Input, Output>(
  channel: string,
  schema: ZodTypeAny | null,
  handler: (input: Input) => Output | Promise<Output>
): void {
  ipcMain.handle(channel, async (_event, payload) => {
    try {
      const input = schema ? schema.parse(payload) : payload;
      return { ok: true, data: await handler(input as Input) };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : '操作失败'
      };
    }
  });
}
