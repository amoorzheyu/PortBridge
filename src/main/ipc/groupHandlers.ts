import { z } from 'zod';
import { createGroupSchema, idSchema, updateGroupSchema } from '../../shared/schemas';
import { GroupRepository } from '../db/groupRepository';
import type { TunnelManager } from '../services/TunnelManager';
import { registerHandler } from './safeHandler';

export function registerGroupHandlers(groupRepository: GroupRepository, tunnelManager: TunnelManager): void {
  registerHandler('groups:list', null, () => groupRepository.list());
  registerHandler('groups:create', createGroupSchema, (input) => groupRepository.create(input));
  registerHandler('groups:update', updateGroupSchema, (input) => groupRepository.update(input));
  registerHandler('groups:delete', idSchema, (input: z.infer<typeof idSchema>) => {
    groupRepository.delete(input.id);
    return true;
  });
  registerHandler('groups:deleteEmpty', null, () => groupRepository.deleteEmptyGroups());
  registerHandler('groups:deleteAllData', null, async () => {
    await tunnelManager.stopAll();
    groupRepository.deleteAllData();
    return true;
  });
}
