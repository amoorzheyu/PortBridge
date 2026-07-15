import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import type { AppLog, ConfigFileSummary, ConfigImportFileInfo, ConfigImportResult, Group, ServerConfig, TunnelRule, TunnelRuntimeState } from '../shared/types';
import type {
  CreateGroupInput,
  CreateServerInput,
  CreateTunnelInput,
  UpdateGroupInput,
  UpdateServerInput,
  UpdateTunnelInput
} from '../shared/schemas';

type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string };

async function invoke<T>(channel: string, payload?: unknown): Promise<T> {
  const result = (await ipcRenderer.invoke(channel, payload)) as ApiResult<T>;
  if (!result.ok) throw new Error(result.error);
  return result.data;
}

const api = {
  platform: process.platform,
  groups: {
    list: () => invoke<Group[]>('groups:list'),
    create: (input: CreateGroupInput) => invoke<Group>('groups:create', input),
    update: (input: UpdateGroupInput) => invoke<Group>('groups:update', input),
    delete: (id: string) => invoke<boolean>('groups:delete', { id })
  },
  servers: {
    list: () => invoke<ServerConfig[]>('servers:list'),
    listByGroup: (groupId: string) => invoke<ServerConfig[]>('servers:listByGroup', { groupId }),
    create: (input: CreateServerInput) => invoke<ServerConfig>('servers:create', input),
    update: (input: UpdateServerInput) => invoke<ServerConfig>('servers:update', input),
    delete: (id: string) => invoke<boolean>('servers:delete', { id })
  },
  tunnels: {
    list: () => invoke<TunnelRule[]>('tunnels:list'),
    listByServer: (serverId: string) => invoke<TunnelRule[]>('tunnels:listByServer', { serverId }),
    create: (input: CreateTunnelInput) => invoke<TunnelRule>('tunnels:create', input),
    update: (input: UpdateTunnelInput) => invoke<TunnelRule>('tunnels:update', input),
    delete: (id: string) => invoke<boolean>('tunnels:delete', { id })
  },
  runtime: {
    startTunnel: (id: string) => invoke<void>('runtime:startTunnel', { id }),
    stopTunnel: (id: string) => invoke<void>('runtime:stopTunnel', { id }),
    restartTunnel: (id: string) => invoke<void>('runtime:restartTunnel', { id }),
    startServerTunnels: (serverId: string) => invoke<void>('runtime:startServerTunnels', { serverId }),
    stopServerTunnels: (serverId: string) => invoke<void>('runtime:stopServerTunnels', { serverId }),
    getStates: () => invoke<TunnelRuntimeState[]>('runtime:getStates'),
    checkPort: (host: string, port: number) => invoke<boolean>('runtime:checkPort', { host, port }),
    testServerConnection: (input: CreateServerInput) => invoke<boolean>('runtime:testServerConnection', input)
  },
  logs: {
    list: () => invoke<AppLog[]>('logs:list'),
    clear: () => invoke<boolean>('logs:clear')
  },
  config: {
    export: (password?: string) => invoke<string | null>('config:export', { password }),
    selectImportFile: () => invoke<ConfigImportFileInfo | null>('config:selectImportFile'),
    inspectImportFile: (path: string) => invoke<ConfigFileSummary>('config:inspectImportFile', { path }),
    previewImport: (path: string, password?: string) => invoke<ConfigFileSummary>('config:previewImport', { path, password }),
    import: (path: string, password?: string) => invoke<ConfigImportResult>('config:import', { path, password })
  },
  files: {
    selectPrivateKey: () => invoke<{ path: string; content: string } | null>('files:selectPrivateKey')
  },
  events: {
    onStateChanged: (callback: (state: TunnelRuntimeState) => void) => {
      const listener = (_event: IpcRendererEvent, state: TunnelRuntimeState) => callback(state);
      ipcRenderer.on('runtime:stateChanged', listener);
      return () => ipcRenderer.off('runtime:stateChanged', listener);
    },
    onLog: (callback: (log: AppLog) => void) => {
      const listener = (_event: IpcRendererEvent, log: AppLog) => callback(log);
      ipcRenderer.on('runtime:log', listener);
      return () => ipcRenderer.off('runtime:log', listener);
    },
    onLogsCleared: (callback: () => void) => {
      const listener = () => callback();
      ipcRenderer.on('runtime:logsCleared', listener);
      return () => ipcRenderer.off('runtime:logsCleared', listener);
    }
  }
};

contextBridge.exposeInMainWorld('portBridge', api);
