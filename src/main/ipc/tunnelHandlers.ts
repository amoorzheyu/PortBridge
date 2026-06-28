import { z } from 'zod';
import { createTunnelSchema, idSchema, listByServerSchema, updateTunnelSchema } from '../../shared/schemas';
import { TunnelRepository } from '../db/tunnelRepository';
import type { TunnelManager } from '../services/TunnelManager';
import { registerHandler } from './safeHandler';

export function registerTunnelHandlers(tunnelRepository: TunnelRepository, tunnelManager: TunnelManager): void {
  registerHandler('tunnels:list', null, () => tunnelRepository.list());
  registerHandler('tunnels:listByServer', listByServerSchema, (input) => tunnelRepository.listByServer(input.serverId));
  registerHandler('tunnels:create', createTunnelSchema, (input) => tunnelRepository.create(input));
  registerHandler('tunnels:update', updateTunnelSchema, (input) => tunnelRepository.update(input));
  registerHandler('tunnels:delete', idSchema, (input: z.infer<typeof idSchema>) => {
    if (tunnelManager.hasRunningTunnel(input.id)) {
      throw new Error('请先停止该映射。');
    }
    tunnelRepository.delete(input.id);
    return true;
  });
}
