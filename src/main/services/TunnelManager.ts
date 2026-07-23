import fs from 'node:fs';
import net from 'node:net';
import { BrowserWindow } from 'electron';
import { Client, type ConnectConfig } from 'ssh2';
import type { ServerConfig, TunnelRuntimeState, TunnelStatus } from '../../shared/types';
import { ServerRepository } from '../db/serverRepository';
import { TunnelRepository } from '../db/tunnelRepository';
import type { LogService } from './LogService';

interface RuntimeTunnel {
  tunnelId: string;
  serverId: string;
  sshClient?: Client;
  localServer?: net.Server;
  localSockets?: Set<net.Socket>;
  status: TunnelStatus;
  manuallyStopped: boolean;
  reconnectTimer?: NodeJS.Timeout;
  reconnectCount: number;
  error?: string;
  startedAt?: string;
}

interface LocalForward {
  server: net.Server;
  sockets: Set<net.Socket>;
}

function getReconnectDelay(): number {
  return 3000;
}

function closeServer(server?: net.Server): Promise<void> {
  return new Promise((resolve) => {
    if (!server || !server.listening) {
      resolve();
      return;
    }
    try {
      server.close(() => resolve());
    } catch {
      resolve();
    }
  });
}

function closeSshClient(ssh?: Client): void {
  if (!ssh) return;
  ssh.on('error', () => {
    // Keep late ssh2 errors from escaping after the tunnel lifecycle moved on.
  });
  ssh.end();
  ssh.destroy();
}

async function closeLocalForward(server?: net.Server, sockets?: Set<net.Socket>): Promise<void> {
  const closePromise = closeServer(server);
  sockets?.forEach((socket) => socket.destroy());
  sockets?.clear();
  await closePromise;
}

function createLocalForward(
  ssh: Client,
  localHost: string,
  localPort: number,
  remoteHost: string,
  remotePort: number
): Promise<LocalForward> {
  return new Promise((resolve, reject) => {
    const sockets = new Set<net.Socket>();
    const server = net.createServer((localSocket) => {
      sockets.add(localSocket);
      localSocket.once('close', () => sockets.delete(localSocket));
      try {
        ssh.forwardOut(
          localSocket.remoteAddress || '127.0.0.1',
          localSocket.remotePort || 0,
          remoteHost,
          remotePort,
          (err, stream) => {
            if (err) {
              localSocket.destroy();
              return;
            }
            localSocket.pipe(stream);
            stream.pipe(localSocket);
            localSocket.once('close', () => stream.destroy());
            stream.once('close', () => localSocket.destroy());
            stream.once('error', () => localSocket.destroy());
          }
        );
      } catch {
        localSocket.destroy();
      }
    });

    const cleanup = (): void => {
      server.off('error', onError);
      server.off('listening', onListening);
    };
    const onError = (error: Error): void => {
      cleanup();
      reject(error);
    };
    const onListening = (): void => {
      cleanup();
      resolve({ server, sockets });
    };

    server.once('error', onError);
    server.once('listening', onListening);
    server.listen(localPort, localHost);
  });
}

function getStartErrorMessage(error: unknown, localHost: string, localPort: number): string {
  if (error && typeof error === 'object' && 'code' in error && error.code === 'EADDRINUSE') {
    return `本地端口 ${localHost}:${localPort} 已被占用`;
  }
  return error instanceof Error ? error.message : 'SSH 连接失败';
}

export class TunnelManager {
  private runtimes = new Map<string, RuntimeTunnel>();

  constructor(
    private readonly serverRepository: ServerRepository,
    private readonly tunnelRepository: TunnelRepository,
    private readonly logService: LogService
  ) {}

  getTunnelStates(): TunnelRuntimeState[] {
    return Array.from(this.runtimes.values()).map((runtime) => this.toState(runtime));
  }

  async startTunnel(tunnelId: string): Promise<void> {
    await this.startTunnelInternal(tunnelId, false);
  }

  private async startTunnelInternal(tunnelId: string, fromReconnect: boolean): Promise<void> {
    const tunnel = this.tunnelRepository.get(tunnelId);
    if (!tunnel) throw new Error('映射规则不存在');

    const existing = this.getRuntime(tunnelId, tunnel.serverId);
    if (existing.status === 'running' || existing.status === 'starting' || (existing.status === 'reconnecting' && !fromReconnect)) return;

    const server = this.serverRepository.get(tunnel.serverId, true);
    if (!server) throw new Error('服务器不存在');

    await this.closeRuntimeResources(existing);

    existing.manuallyStopped = false;
    existing.error = undefined;
    existing.status = 'starting';
    this.emitState(existing);
    this.logService.info(`启动映射 ${tunnel.name} ${tunnel.localHost}:${tunnel.localPort} -> ${tunnel.remoteHost}:${tunnel.remotePort}`);

    const ssh = new Client();
    existing.sshClient = ssh;
    ssh.on('error', (error) => {
      existing.error = error.message;
    });

    try {
      await this.connectSsh(ssh, server);
      const localForward = await createLocalForward(ssh, tunnel.localHost, tunnel.localPort, tunnel.remoteHost, tunnel.remotePort);
      existing.localServer = localForward.server;
      existing.localSockets = localForward.sockets;
      existing.status = 'running';
      existing.startedAt = new Date().toISOString();
      existing.error = undefined;
      this.bindRuntimeEvents(existing);
      this.emitState(existing);
      this.logService.info(`SSH 连接成功，映射已运行 ${tunnel.name}`);
    } catch (error) {
      await this.closeRuntimeResources(existing);
      const message = getStartErrorMessage(error, tunnel.localHost, tunnel.localPort);
      existing.status = 'error';
      existing.error = message;
      this.emitState(existing);
      this.logService.error(`映射启动失败：${message}`);
      throw new Error(message);
    }
  }

  async stopTunnel(tunnelId: string): Promise<void> {
    const runtime = this.runtimes.get(tunnelId);
    if (!runtime || runtime.status === 'stopped') return;

    runtime.manuallyStopped = true;
    runtime.status = 'stopping';
    runtime.error = undefined;
    this.emitState(runtime);

    if (runtime.reconnectTimer) {
      clearTimeout(runtime.reconnectTimer);
      runtime.reconnectTimer = undefined;
    }

    await this.closeRuntimeResources(runtime);
    runtime.status = 'stopped';
    runtime.startedAt = undefined;
    this.emitState(runtime);
    this.logService.info('已停止映射');
  }

  async restartTunnel(tunnelId: string): Promise<void> {
    await this.stopTunnel(tunnelId);
    await this.startTunnel(tunnelId);
  }

  async startServerTunnels(serverId: string): Promise<void> {
    const tunnels = this.tunnelRepository.listByServer(serverId);
    for (const tunnel of tunnels) {
      await this.startTunnel(tunnel.id);
    }
  }

  async stopServerTunnels(serverId: string): Promise<void> {
    const tunnels = this.tunnelRepository.listByServer(serverId);
    for (const tunnel of tunnels) {
      await this.stopTunnel(tunnel.id);
    }
  }

  async stopAll(): Promise<void> {
    for (const tunnelId of this.runtimes.keys()) {
      await this.stopTunnel(tunnelId);
    }
  }

  async startAutoStartTunnels(): Promise<void> {
    const tunnels = this.tunnelRepository.listAutoStart();
    for (const tunnel of tunnels) {
      try {
        await this.startTunnel(tunnel.id);
      } catch {
        // startTunnel already updates state and writes a user-facing log.
      }
    }
  }

  hasRunningServerTunnels(serverId: string): boolean {
    return Array.from(this.runtimes.values()).some((runtime) => {
      return runtime.serverId === serverId && ['starting', 'running', 'stopping', 'reconnecting'].includes(runtime.status);
    });
  }

  hasRunningTunnel(tunnelId: string): boolean {
    const runtime = this.runtimes.get(tunnelId);
    return Boolean(runtime && ['starting', 'running', 'stopping', 'reconnecting'].includes(runtime.status));
  }

  private getRuntime(tunnelId: string, serverId: string): RuntimeTunnel {
    const current = this.runtimes.get(tunnelId);
    if (current) return current;

    const runtime: RuntimeTunnel = {
      tunnelId,
      serverId,
      status: 'stopped',
      manuallyStopped: false,
      reconnectCount: 0
    };
    this.runtimes.set(tunnelId, runtime);
    return runtime;
  }

  private async closeRuntimeResources(runtime: RuntimeTunnel): Promise<void> {
    const localServer = runtime.localServer;
    const localSockets = runtime.localSockets;
    const sshClient = runtime.sshClient;

    runtime.localServer = undefined;
    runtime.localSockets = undefined;
    runtime.sshClient = undefined;

    closeSshClient(sshClient);
    await closeLocalForward(localServer, localSockets);
  }

  private connectSsh(ssh: Client, server: ServerConfig): Promise<void> {
    const config: ConnectConfig = {
      host: server.host,
      port: server.port,
      username: server.username,
      readyTimeout: 15000,
      keepaliveInterval: 30000,
      keepaliveCountMax: 3
    };

    if (server.authType === 'password') {
      config.password = server.password;
    } else {
      if (server.privateKey?.trim()) {
        config.privateKey = server.privateKey;
      } else if (server.privateKeyPath && fs.existsSync(server.privateKeyPath)) {
        config.privateKey = fs.readFileSync(server.privateKeyPath, 'utf8');
      } else {
        throw new Error('私钥文件不存在');
      }
      config.passphrase = server.privateKeyPassphrase || undefined;
    }

    return new Promise((resolve, reject) => {
      const cleanup = (): void => {
        ssh.off('ready', onReady);
        ssh.off('error', onError);
        ssh.off('close', onClose);
      };
      const onReady = (): void => {
        cleanup();
        resolve();
      };
      const onError = (error: Error): void => {
        cleanup();
        reject(error);
      };
      const onClose = (): void => {
        cleanup();
        reject(new Error('SSH 连接在握手完成前断开'));
      };

      ssh.once('ready', onReady);
      ssh.once('error', onError);
      ssh.once('close', onClose);
      ssh.connect(config);
    });
  }

  private bindRuntimeEvents(runtime: RuntimeTunnel): void {
    runtime.sshClient?.once('close', () => {
      if (runtime.manuallyStopped) return;
      this.scheduleReconnect(runtime);
    });
    runtime.sshClient?.once('error', (error) => {
      runtime.error = error.message;
    });
    runtime.localServer?.once('error', (error) => {
      runtime.error = error.message;
      if (!runtime.manuallyStopped) this.scheduleReconnect(runtime);
    });
  }

  private scheduleReconnect(runtime: RuntimeTunnel): void {
    if (runtime.reconnectTimer) return;

    runtime.status = 'reconnecting';
    runtime.reconnectCount += 1;
    const delay = getReconnectDelay();
    this.emitState(runtime);
    this.logService.warn(`SSH 连接断开，准备 ${Math.round(delay / 1000)} 秒后重连`);

    runtime.reconnectTimer = setTimeout(async () => {
      runtime.reconnectTimer = undefined;
      try {
        await this.startTunnelInternal(runtime.tunnelId, true);
      } catch {
        if (!runtime.manuallyStopped) this.scheduleReconnect(runtime);
      }
    }, delay);

    void this.closeRuntimeResources(runtime);
  }

  private emitState(runtime: RuntimeTunnel): void {
    const state = this.toState(runtime);
    BrowserWindow.getAllWindows().forEach((window) => {
      window.webContents.send('runtime:stateChanged', state);
    });
  }

  private toState(runtime: RuntimeTunnel): TunnelRuntimeState {
    return {
      tunnelId: runtime.tunnelId,
      serverId: runtime.serverId,
      status: runtime.status,
      error: runtime.error,
      startedAt: runtime.startedAt,
      reconnectCount: runtime.reconnectCount
    };
  }
}
