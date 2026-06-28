import { z } from 'zod';
import { checkPortSchema, idSchema, listByServerSchema } from '../../shared/schemas';
import { checkPortAvailable } from '../utils/checkPort';
import type { LogService } from '../services/LogService';
import type { TunnelManager } from '../services/TunnelManager';
import { registerHandler } from './safeHandler';

export function registerRuntimeHandlers(tunnelManager: TunnelManager, logService: LogService): void {
  registerHandler('runtime:startTunnel', idSchema, (input: z.infer<typeof idSchema>) => tunnelManager.startTunnel(input.id));
  registerHandler('runtime:stopTunnel', idSchema, (input: z.infer<typeof idSchema>) => tunnelManager.stopTunnel(input.id));
  registerHandler('runtime:restartTunnel', idSchema, (input: z.infer<typeof idSchema>) => tunnelManager.restartTunnel(input.id));
  registerHandler('runtime:startServerTunnels', listByServerSchema, (input) => tunnelManager.startServerTunnels(input.serverId));
  registerHandler('runtime:stopServerTunnels', listByServerSchema, (input) => tunnelManager.stopServerTunnels(input.serverId));
  registerHandler('runtime:getStates', null, () => tunnelManager.getTunnelStates());
  registerHandler('runtime:checkPort', checkPortSchema, (input) => checkPortAvailable(input.host, input.port));
  registerHandler('logs:list', null, () => logService.list());
  registerHandler('logs:clear', null, () => {
    logService.clear();
    return true;
  });
}
