import { GroupRepository } from '../db/groupRepository';
import { ServerRepository } from '../db/serverRepository';
import { TunnelRepository } from '../db/tunnelRepository';
import { LogService } from '../services/LogService';
import { TunnelManager } from '../services/TunnelManager';
import { registerGroupHandlers } from './groupHandlers';
import { registerRuntimeHandlers } from './runtimeHandlers';
import { registerServerHandlers } from './serverHandlers';
import { registerTunnelHandlers } from './tunnelHandlers';

export interface AppServices {
  groupRepository: GroupRepository;
  serverRepository: ServerRepository;
  tunnelRepository: TunnelRepository;
  logService: LogService;
  tunnelManager: TunnelManager;
}

export function createAppServices(): AppServices {
  const groupRepository = new GroupRepository();
  const serverRepository = new ServerRepository();
  const tunnelRepository = new TunnelRepository();
  const logService = new LogService();
  const tunnelManager = new TunnelManager(serverRepository, tunnelRepository, logService);

  return {
    groupRepository,
    serverRepository,
    tunnelRepository,
    logService,
    tunnelManager
  };
}

export function registerIpcHandlers(services: AppServices): void {
  registerGroupHandlers(services.groupRepository);
  registerServerHandlers(services.serverRepository, services.tunnelManager);
  registerTunnelHandlers(services.tunnelRepository, services.tunnelManager);
  registerRuntimeHandlers(services.tunnelManager, services.logService);
}
