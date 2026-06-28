import { z } from 'zod';
import { createServerSchema, idSchema, listByGroupSchema, updateServerSchema } from '../../shared/schemas';
import { ServerRepository } from '../db/serverRepository';
import type { TunnelManager } from '../services/TunnelManager';
import { registerHandler } from './safeHandler';

export function registerServerHandlers(serverRepository: ServerRepository, tunnelManager: TunnelManager): void {
  registerHandler('servers:list', null, () => serverRepository.list());
  registerHandler('servers:listByGroup', listByGroupSchema, (input) => serverRepository.listByGroup(input.groupId));
  registerHandler('servers:create', createServerSchema, (input) => serverRepository.create(input));
  registerHandler('servers:update', updateServerSchema, (input) => serverRepository.update(input));
  registerHandler('servers:delete', idSchema, (input: z.infer<typeof idSchema>) => {
    if (tunnelManager.hasRunningServerTunnels(input.id)) {
      throw new Error('请先停止该服务器下所有运行中的映射。');
    }
    serverRepository.delete(input.id);
    return true;
  });
}
