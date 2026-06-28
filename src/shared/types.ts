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
