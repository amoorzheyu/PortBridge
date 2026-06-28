import { z } from 'zod';
import { createGroupSchema, idSchema, updateGroupSchema } from '../../shared/schemas';
import { GroupRepository } from '../db/groupRepository';
import { registerHandler } from './safeHandler';

export function registerGroupHandlers(groupRepository: GroupRepository): void {
  registerHandler('groups:list', null, () => groupRepository.list());
  registerHandler('groups:create', createGroupSchema, (input) => groupRepository.create(input));
  registerHandler('groups:update', updateGroupSchema, (input) => groupRepository.update(input));
  registerHandler('groups:delete', idSchema, (input: z.infer<typeof idSchema>) => {
    groupRepository.delete(input.id);
    return true;
  });
}
