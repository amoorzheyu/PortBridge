import { ipcMain } from 'electron';
import type { ZodTypeAny } from 'zod';

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
