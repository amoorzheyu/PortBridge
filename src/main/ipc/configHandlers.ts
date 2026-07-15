import { z } from 'zod';
import { ConfigTransferService } from '../services/ConfigTransferService';
import { registerHandler } from './safeHandler';

const passwordSchema = z.object({
  password: z.string().optional()
});

const importSchema = z.object({
  path: z.string().min(1),
  password: z.string().optional()
});

export function registerConfigHandlers(configTransferService: ConfigTransferService): void {
  registerHandler('config:export', passwordSchema, (input: z.infer<typeof passwordSchema>) => configTransferService.exportConfig(input.password));
  registerHandler('config:selectImportFile', null, () => configTransferService.selectImportFile());
  registerHandler('config:inspectImportFile', z.object({ path: z.string().min(1) }), (input: { path: string }) => configTransferService.inspectImportFile(input.path));
  registerHandler('config:previewImport', importSchema, (input: z.infer<typeof importSchema>) => configTransferService.previewImport(input.path, input.password));
  registerHandler('config:import', importSchema, (input: z.infer<typeof importSchema>) => configTransferService.importConfig(input.path, input.password));
}
