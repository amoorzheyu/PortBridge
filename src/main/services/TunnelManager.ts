import fs from 'node:fs';
import net from 'node:net';
import { BrowserWindow } from 'electron';
import { Client, type ConnectConfig } from 'ssh2';
import type { ServerConfig, TunnelRuntimeState, TunnelStatus } from '../../shared/types';
import { ServerRepository } from '../db/serverRepository';
import { TunnelRepository } from '../db/tunnelRepository';
import { checkPortAvailable } from '../utils/checkPort';
import type { LogService } from './LogService';

interface RuntimeTunnel {
  tunnelId: string;
  serverId: string;
  sshClient?: Client;
  localServer?: net.Server;
  status: TunnelStatus;
  manuallyStopped: boolean;
  reconnectTimer?: NodeJS.Timeout;
  reconnectCount: number;
  error?: string;
  startedAt?: string;
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
    server.close(() => resolve());
  });
}

function createLocalForward(
  ssh: Client,
  localHost: string,
  localPort: number,
  remoteHost: string,
  remotePort: number
): Promise<net.Server> {
  return new Promise((resolve, reject) => {
    const server = net.createServer((localSocket) => {
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
          }
        );
      } catch {
        localSocket.destroy();
      }
    });

    server.once('error', reject);
    server.listen(localPort, localHost, () => resolve(server));
  });
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
    const tunnel = this.tunnelRepository.get(tunnelId);
    if (!tunnel) throw new Error('映射规则不存在');

    const existing = this.getRuntime(tunnelId, tunnel.serverId);
    if (existing.status === 'running' || existing.status === 'starting') return;

    const server = this.serverRepository.get(tunnel.serverId, true);
    if (!server) throw new Error('服务器不存在');

    existing.manuallyStopped = false;
    existing.error = undefined;
    existing.status = 'starting';
    this.emitState(existing);
    this.logService.info(`启动映射 ${tunnel.name} ${tunnel.localHost}:${tunnel.localPort} -> ${tunnel.remoteHost}:${tunnel.remotePort}`);

    const available = await checkPortAvailable(tunnel.localHost, tunnel.localPort);
    if (!available) {
      const message = `本地端口 ${tunnel.localHost}:${tunnel.localPort} 已被占用`;
      existing.status = 'error';
      existing.error = message;
      this.emitState(existing);
      this.logService.error(message);
      throw new Error(message);
    }

    const ssh = new Client();
    existing.sshClient = ssh;

    try {
      await this.connectSsh(ssh, server);
      const localServer = await createLocalForward(ssh, tunnel.localHost, tunnel.localPort, tunnel.remoteHost, tunnel.remotePort);
      existing.localServer = localServer;
      existing.status = 'running';
      existing.startedAt = new Date().toISOString();
      existing.error = undefined;
      this.bindRuntimeEvents(existing);
      this.emitState(existing);
      this.logService.info(`SSH 连接成功，映射已运行 ${tunnel.name}`);
    } catch (error) {
      await closeServer(existing.localServer);
      existing.localServer = undefined;
      ssh.end();
      const message = error instanceof Error ? error.message : 'SSH 连接失败';
      existing.status = 'error';
      existing.error = message;
      this.emitState(existing);
      this.logService.error(`SSH 连接失败：${message}`);
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

    await closeServer(runtime.localServer);
    runtime.localServer = undefined;
    runtime.sshClient?.end();
    runtime.sshClient = undefined;
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
      ssh.once('ready', resolve);
      ssh.once('error', reject);
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

    const localServer = runtime.localServer;
    runtime.localServer = undefined;
    void closeServer(localServer);
    runtime.sshClient?.end();
    runtime.sshClient = undefined;

    runtime.reconnectTimer = setTimeout(async () => {
      runtime.reconnectTimer = undefined;
      try {
        await this.startTunnel(runtime.tunnelId);
      } catch {
        if (!runtime.manuallyStopped) this.scheduleReconnect(runtime);
      }
    }, delay);
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
