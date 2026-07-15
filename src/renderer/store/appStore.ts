import { create } from 'zustand';
import { toast } from 'sonner';
import type { AppLog, ConfigFileSummary, ConfigImportFileInfo, ConfigImportResult, Group, ServerConfig, TunnelRule, TunnelRuntimeState } from '@shared/types';
import type { CreateGroupInput, CreateServerInput, CreateTunnelInput, UpdateGroupInput, UpdateServerInput, UpdateTunnelInput } from '@shared/schemas';
import { electronApi } from '@/api/electronApi';

interface AppStore {
  groups: Group[];
  servers: ServerConfig[];
  tunnels: TunnelRule[];
  states: Record<string, TunnelRuntimeState>;
  logs: AppLog[];
  selectedGroupId: string;
  selectedServerId?: string;
  loading: boolean;
  bootstrap: () => Promise<void>;
  loadAll: () => Promise<void>;
  selectGroup: (groupId: string) => void;
  selectServer: (serverId?: string) => void;
  createGroup: (input: CreateGroupInput) => Promise<void>;
  updateGroup: (input: UpdateGroupInput) => Promise<void>;
  deleteGroup: (id: string) => Promise<void>;
  createServer: (input: CreateServerInput) => Promise<void>;
  updateServer: (input: UpdateServerInput) => Promise<void>;
  deleteServer: (id: string) => Promise<void>;
  createTunnel: (input: CreateTunnelInput) => Promise<void>;
  updateTunnel: (input: UpdateTunnelInput) => Promise<void>;
  deleteTunnel: (id: string) => Promise<void>;
  startTunnel: (id: string) => Promise<void>;
  stopTunnel: (id: string) => Promise<void>;
  restartTunnel: (id: string) => Promise<void>;
  startServerTunnels: (serverId: string) => Promise<void>;
  stopServerTunnels: (serverId: string) => Promise<void>;
  clearLogs: () => Promise<void>;
  exportConfig: (password?: string) => Promise<string | null>;
  selectImportFile: () => Promise<ConfigImportFileInfo | null>;
  inspectImportFile: (path: string) => Promise<ConfigFileSummary>;
  previewImport: (path: string, password?: string) => Promise<ConfigFileSummary>;
  importConfig: (path: string, password?: string) => Promise<ConfigImportResult>;
  applyState: (state: TunnelRuntimeState) => void;
  appendLog: (log: AppLog) => void;
  resetLogs: () => void;
}

async function runAction(action: () => Promise<void>, success?: string) {
  try {
    await action();
    if (success) toast.success(success);
  } catch (error) {
    toast.error(error instanceof Error ? error.message : '操作失败');
  }
}

export const useAppStore = create<AppStore>((set, get) => ({
  groups: [],
  servers: [],
  tunnels: [],
  states: {},
  logs: [],
  selectedGroupId: 'all',
  selectedServerId: undefined,
  loading: false,

  bootstrap: async () => {
    await get().loadAll();
    const unsubscribeState = electronApi.events.onStateChanged((state) => get().applyState(state));
    const unsubscribeLog = electronApi.events.onLog((log) => get().appendLog(log));
    const unsubscribeClear = electronApi.events.onLogsCleared(() => get().resetLogs());
    window.addEventListener('beforeunload', () => {
      unsubscribeState();
      unsubscribeLog();
      unsubscribeClear();
    });
  },

  loadAll: async () => {
    set({ loading: true });
    try {
      const [groups, servers, tunnels, runtimeStates, logs] = await Promise.all([
        electronApi.groups.list(),
        electronApi.servers.list(),
        electronApi.tunnels.list(),
        electronApi.runtime.getStates(),
        electronApi.logs.list()
      ]);
      const states = Object.fromEntries(runtimeStates.map((state) => [state.tunnelId, state]));
      const selectedServerId = get().selectedServerId && servers.some((server) => server.id === get().selectedServerId) ? get().selectedServerId : servers[0]?.id;
      set({ groups, servers, tunnels, states, logs, selectedServerId });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '加载失败');
    } finally {
      set({ loading: false });
    }
  },

  selectGroup: (groupId) => {
    const servers = get().servers.filter((server) => groupId === 'all' || server.groupId === groupId);
    set({ selectedGroupId: groupId, selectedServerId: servers[0]?.id });
  },

  selectServer: (serverId) => set({ selectedServerId: serverId }),

  createGroup: async (input) => runAction(async () => {
    await electronApi.groups.create(input);
    await get().loadAll();
  }),

  updateGroup: async (input) => runAction(async () => {
    await electronApi.groups.update(input);
    await get().loadAll();
  }),

  deleteGroup: async (id) => runAction(async () => {
    await electronApi.groups.delete(id);
    if (get().selectedGroupId === id) set({ selectedGroupId: 'all' });
    await get().loadAll();
  }, '已删除'),

  createServer: async (input) => runAction(async () => {
    const server = await electronApi.servers.create(input);
    await get().loadAll();
    set({ selectedServerId: server.id });
  }),

  updateServer: async (input) => runAction(async () => {
    await electronApi.servers.update(input);
    await get().loadAll();
  }),

  deleteServer: async (id) => runAction(async () => {
    await electronApi.servers.delete(id);
    if (get().selectedServerId === id) set({ selectedServerId: undefined });
    await get().loadAll();
  }, '已删除'),

  createTunnel: async (input) => runAction(async () => {
    await electronApi.tunnels.create(input);
    await get().loadAll();
  }),

  updateTunnel: async (input) => runAction(async () => {
    await electronApi.tunnels.update(input);
    await get().loadAll();
  }),

  deleteTunnel: async (id) => runAction(async () => {
    await electronApi.tunnels.delete(id);
    await get().loadAll();
  }, '已删除'),

  startTunnel: async (id) => runAction(async () => {
    await electronApi.runtime.startTunnel(id);
  }),

  stopTunnel: async (id) => runAction(async () => {
    await electronApi.runtime.stopTunnel(id);
  }),

  restartTunnel: async (id) => runAction(async () => {
    await electronApi.runtime.restartTunnel(id);
  }),

  startServerTunnels: async (serverId) => runAction(async () => {
    await electronApi.runtime.startServerTunnels(serverId);
  }),

  stopServerTunnels: async (serverId) => runAction(async () => {
    await electronApi.runtime.stopServerTunnels(serverId);
  }),

  clearLogs: async () => runAction(async () => {
    await electronApi.logs.clear();
    set({ logs: [] });
  }),

  exportConfig: async (password) => {
    try {
      const path = await electronApi.config.export(password);
      if (path) toast.success('配置已导出');
      return path;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '导出失败');
      return null;
    }
  },

  selectImportFile: async () => {
    try {
      return await electronApi.config.selectImportFile();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '读取配置文件失败');
      return null;
    }
  },

  inspectImportFile: async (path) => electronApi.config.inspectImportFile(path),

  previewImport: async (path, password) => electronApi.config.previewImport(path, password),

  importConfig: async (path, password) => {
    const result = await electronApi.config.import(path, password);
    await get().loadAll();
    toast.success('配置已导入');
    return result;
  },

  applyState: (state) => set((current) => ({ states: { ...current.states, [state.tunnelId]: state } })),
  appendLog: (log) => set((current) => ({ logs: [...current.logs, log].slice(-500) })),
  resetLogs: () => set({ logs: [] })
}));
