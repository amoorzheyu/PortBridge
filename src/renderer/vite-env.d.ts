/// <reference types="vite/client" />

import type { AppLog, ConfigFileSummary, ConfigImportFileInfo, ConfigImportResult, Group, ServerConfig, TunnelRule, TunnelRuntimeState } from '../../shared/types';
import type {
  CreateGroupInput,
  CreateServerInput,
  CreateTunnelInput,
  UpdateGroupInput,
  UpdateServerInput,
  UpdateTunnelInput
} from '../../shared/schemas';

declare global {
  interface Window {
    portBridge: {
      platform: NodeJS.Platform;
      groups: {
        list: () => Promise<Group[]>;
        create: (input: CreateGroupInput) => Promise<Group>;
        update: (input: UpdateGroupInput) => Promise<Group>;
        delete: (id: string) => Promise<boolean>;
      };
      servers: {
        list: () => Promise<ServerConfig[]>;
        listByGroup: (groupId: string) => Promise<ServerConfig[]>;
        create: (input: CreateServerInput) => Promise<ServerConfig>;
        update: (input: UpdateServerInput) => Promise<ServerConfig>;
        delete: (id: string) => Promise<boolean>;
      };
      tunnels: {
        list: () => Promise<TunnelRule[]>;
        listByServer: (serverId: string) => Promise<TunnelRule[]>;
        create: (input: CreateTunnelInput) => Promise<TunnelRule>;
        update: (input: UpdateTunnelInput) => Promise<TunnelRule>;
        delete: (id: string) => Promise<boolean>;
      };
      runtime: {
        startTunnel: (id: string) => Promise<void>;
        stopTunnel: (id: string) => Promise<void>;
        restartTunnel: (id: string) => Promise<void>;
        startServerTunnels: (serverId: string) => Promise<void>;
        stopServerTunnels: (serverId: string) => Promise<void>;
        getStates: () => Promise<TunnelRuntimeState[]>;
        checkPort: (host: string, port: number) => Promise<boolean>;
        testServerConnection: (input: CreateServerInput) => Promise<boolean>;
      };
      logs: {
        list: () => Promise<AppLog[]>;
        clear: () => Promise<boolean>;
      };
      config: {
        export: (password?: string) => Promise<string | null>;
        selectImportFile: () => Promise<ConfigImportFileInfo | null>;
        inspectImportFile: (path: string) => Promise<ConfigFileSummary>;
        previewImport: (path: string, password?: string) => Promise<ConfigFileSummary>;
        import: (path: string, password?: string) => Promise<ConfigImportResult>;
      };
      files: {
        selectPrivateKey: () => Promise<{ path: string; content: string } | null>;
      };
      events: {
        onStateChanged: (callback: (state: TunnelRuntimeState) => void) => () => void;
        onLog: (callback: (log: AppLog) => void) => () => void;
        onLogsCleared: (callback: () => void) => () => void;
      };
    };
  }
}

export {};
