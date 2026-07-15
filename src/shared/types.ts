export type AuthType = 'password' | 'privateKey';

export interface Group {
  id: string;
  name: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ServerConfig {
  id: string;
  groupId: string;
  name: string;
  host: string;
  port: number;
  username: string;
  authType: AuthType;
  password?: string;
  privateKey?: string;
  privateKeyPath?: string;
  privateKeyPassphrase?: string;
  autoReconnect: boolean;
  reconnectInterval: number;
  createdAt: string;
  updatedAt: string;
}

export interface TunnelRule {
  id: string;
  serverId: string;
  name: string;
  localHost: string;
  localPort: number;
  remoteHost: string;
  remotePort: number;
  autoStart: boolean;
  createdAt: string;
  updatedAt: string;
}

export type TunnelStatus = 'stopped' | 'starting' | 'running' | 'stopping' | 'error' | 'reconnecting';

export interface TunnelRuntimeState {
  tunnelId: string;
  serverId: string;
  status: TunnelStatus;
  error?: string;
  startedAt?: string;
  reconnectCount: number;
}

export interface AppLog {
  id: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  createdAt: string;
}

export interface ConfigExportData {
  groups: Group[];
  servers: ServerConfig[];
  tunnels: TunnelRule[];
}

export interface ConfigFileSummary {
  encrypted: boolean;
  groups?: number;
  servers?: number;
  tunnels?: number;
  conflicts?: ConfigImportConflict[];
}

export interface ConfigImportFileInfo {
  path: string;
  name: string;
}

export interface ConfigImportResult {
  groups: number;
  servers: number;
  tunnels: number;
  updatedGroups?: number;
  updatedServers?: number;
  updatedTunnels?: number;
  skippedGroups?: number;
  skippedServers?: number;
  skippedTunnels?: number;
}

export type ConfigImportConflictType = 'server' | 'tunnel';

export interface ConfigImportConflict {
  type: ConfigImportConflictType;
  name: string;
  parentName: string;
}
