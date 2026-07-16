import { dialog } from 'electron';
import fs from 'node:fs';
import { readFile } from 'node:fs/promises';
import { Client, type ConnectConfig } from 'ssh2';
import { z } from 'zod';
import { checkPortSchema, createServerSchema, idSchema, listByServerSchema, type CreateServerInput } from '../../shared/schemas';
import { checkPortAvailable } from '../utils/checkPort';
import type { LogService } from '../services/LogService';
import type { TunnelManager } from '../services/TunnelManager';
import { registerHandler } from './safeHandler';

function testSshConnection(input: CreateServerInput): Promise<boolean> {
  const ssh = new Client();
  ssh.on('error', () => {
    // 避免一次性握手监听消费后，后续 ssh2 错误逃逸到主进程。
  });
  const config: ConnectConfig = {
    host: input.host,
    port: input.port,
    username: input.username,
    readyTimeout: 15000,
    keepaliveInterval: 30000,
    keepaliveCountMax: 3
  };

  if (input.authType === 'password') {
    config.password = input.password;
  } else if (input.privateKey?.trim()) {
    config.privateKey = input.privateKey;
    config.passphrase = input.privateKeyPassphrase || undefined;
  } else if (input.privateKeyPath && fs.existsSync(input.privateKeyPath)) {
    config.privateKey = fs.readFileSync(input.privateKeyPath, 'utf8');
    config.passphrase = input.privateKeyPassphrase || undefined;
  } else {
    throw new Error('私钥文件不存在');
  }

  return new Promise((resolve, reject) => {
    ssh.once('ready', () => {
      ssh.end();
      resolve(true);
    });
    ssh.once('error', (error) => {
      ssh.end();
      reject(error);
    });
    ssh.connect(config);
  });
}

export function registerRuntimeHandlers(tunnelManager: TunnelManager, logService: LogService): void {
  registerHandler('runtime:startTunnel', idSchema, (input: z.infer<typeof idSchema>) => tunnelManager.startTunnel(input.id));
  registerHandler('runtime:stopTunnel', idSchema, (input: z.infer<typeof idSchema>) => tunnelManager.stopTunnel(input.id));
  registerHandler('runtime:restartTunnel', idSchema, (input: z.infer<typeof idSchema>) => tunnelManager.restartTunnel(input.id));
  registerHandler('runtime:startServerTunnels', listByServerSchema, (input) => tunnelManager.startServerTunnels(input.serverId));
  registerHandler('runtime:stopServerTunnels', listByServerSchema, (input) => tunnelManager.stopServerTunnels(input.serverId));
  registerHandler('runtime:getStates', null, () => tunnelManager.getTunnelStates());
  registerHandler('runtime:checkPort', checkPortSchema, (input) => checkPortAvailable(input.host, input.port));
  registerHandler('runtime:testServerConnection', createServerSchema, (input) => testSshConnection(input));
  registerHandler('logs:list', null, () => logService.list());
  registerHandler('logs:clear', null, () => {
    logService.clear();
    return true;
  });
  registerHandler('files:selectPrivateKey', null, async () => {
    const result = await dialog.showOpenDialog({
      title: '选择私钥文件',
      properties: ['openFile'],
      filters: [
        { name: 'Private Keys', extensions: ['pem', 'key', 'ppk'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (result.canceled || !result.filePaths[0]) return null;
    const path = result.filePaths[0];
    return {
      path,
      content: await readFile(path, 'utf8')
    };
  });
}
