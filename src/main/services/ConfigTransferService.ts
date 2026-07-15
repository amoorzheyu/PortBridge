import { dialog } from 'electron';
import { readFileSync, writeFileSync } from 'node:fs';
import { basename } from 'node:path';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';
import { z } from 'zod';
import type { ConfigExportData, ConfigFileSummary, ConfigImportConflict, ConfigImportFileInfo, ConfigImportResult, Group, ServerConfig, TunnelRule } from '../../shared/types';
import { getDatabase } from '../db/database';
import { GroupRepository } from '../db/groupRepository';
import { ServerRepository } from '../db/serverRepository';
import { TunnelRepository } from '../db/tunnelRepository';
import { createId, nowIso } from '../utils/id';

const CONFIG_VERSION = 1;
const ALGORITHM = 'aes-256-gcm';
const KDF = 'scrypt';
const KEY_LENGTH = 32;

const groupSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  sortOrder: z.number(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1)
});

const serverSchema = z.object({
  id: z.string().min(1),
  groupId: z.string().min(1),
  name: z.string().min(1),
  host: z.string().min(1),
  port: z.number().int().min(1).max(65535),
  username: z.string().min(1),
  authType: z.enum(['password', 'privateKey']),
  password: z.string().optional(),
  privateKey: z.string().optional(),
  privateKeyPath: z.string().optional(),
  privateKeyPassphrase: z.string().optional(),
  autoReconnect: z.boolean(),
  reconnectInterval: z.number().int().min(1),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1)
});

const tunnelSchema = z.object({
  id: z.string().min(1),
  serverId: z.string().min(1),
  name: z.string().min(1),
  localHost: z.string().min(1),
  localPort: z.number().int().min(1).max(65535),
  remoteHost: z.string().min(1),
  remotePort: z.number().int().min(1).max(65535),
  autoStart: z.boolean(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1)
});

const exportDataSchema = z.object({
  groups: z.array(groupSchema),
  servers: z.array(serverSchema),
  tunnels: z.array(tunnelSchema)
});

const plainConfigFileSchema = z.object({
  version: z.literal(CONFIG_VERSION),
  encrypted: z.literal(false),
  data: exportDataSchema
});

const encryptedConfigFileSchema = z.object({
  version: z.literal(CONFIG_VERSION),
  encrypted: z.literal(true),
  crypto: z.object({
    algorithm: z.literal(ALGORITHM),
    kdf: z.literal(KDF),
    salt: z.string().min(1),
    iv: z.string().min(1),
    tag: z.string().min(1)
  }),
  payload: z.string().min(1)
});

function decodeJsonFile(path: string): unknown {
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as unknown;
  } catch {
    throw new Error('配置文件格式不正确');
  }
}

function deriveKey(password: string, salt: Buffer): Buffer {
  return scryptSync(password, salt, KEY_LENGTH);
}

function encryptData(data: ConfigExportData, password: string) {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = deriveKey(password, salt);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const payload = Buffer.concat([cipher.update(JSON.stringify(data), 'utf8'), cipher.final()]);

  return {
    version: CONFIG_VERSION,
    encrypted: true,
    crypto: {
      algorithm: ALGORITHM,
      kdf: KDF,
      salt: salt.toString('base64'),
      iv: iv.toString('base64'),
      tag: cipher.getAuthTag().toString('base64')
    },
    payload: payload.toString('base64')
  };
}

function decryptData(file: z.infer<typeof encryptedConfigFileSchema>, password?: string): ConfigExportData {
  if (!password) throw new Error('请输入导入密码');

  try {
    const salt = Buffer.from(file.crypto.salt, 'base64');
    const iv = Buffer.from(file.crypto.iv, 'base64');
    const tag = Buffer.from(file.crypto.tag, 'base64');
    const key = deriveKey(password, salt);
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(Buffer.from(file.payload, 'base64')), decipher.final()]).toString('utf8');
    return exportDataSchema.parse(JSON.parse(decrypted));
  } catch {
    throw new Error('密码错误或配置文件已损坏');
  }
}

function readConfigData(path: string, password?: string): ConfigExportData {
  const file = decodeJsonFile(path);
  const encrypted = encryptedConfigFileSchema.safeParse(file);
  if (encrypted.success) return decryptData(encrypted.data, password);

  const plain = plainConfigFileSchema.safeParse(file);
  if (plain.success) return plain.data.data;

  throw new Error('不支持的配置文件版本或格式');
}

function summarize(path: string): ConfigFileSummary {
  const file = decodeJsonFile(path);
  const encrypted = encryptedConfigFileSchema.safeParse(file);
  if (encrypted.success) return { encrypted: true };

  const plain = plainConfigFileSchema.safeParse(file);
  if (!plain.success) throw new Error('不支持的配置文件版本或格式');

  return {
    encrypted: false,
    groups: plain.data.data.groups.length,
    servers: plain.data.data.servers.length,
    tunnels: plain.data.data.tunnels.length
  };
}

function sameName(left: string, right: string): boolean {
  return left.trim() === right.trim();
}

function sameServerContent(left: ServerConfig, right: ServerConfig): boolean {
  return left.host === right.host
    && left.port === right.port
    && left.username === right.username
    && left.authType === right.authType
    && (left.password ?? '') === (right.password ?? '')
    && (left.privateKey ?? '') === (right.privateKey ?? '')
    && (left.privateKeyPath ?? '') === (right.privateKeyPath ?? '')
    && (left.privateKeyPassphrase ?? '') === (right.privateKeyPassphrase ?? '')
    && left.autoReconnect === right.autoReconnect
    && left.reconnectInterval === right.reconnectInterval;
}

function sameTunnelContent(left: TunnelRule, right: TunnelRule): boolean {
  return left.localHost === right.localHost
    && left.localPort === right.localPort
    && left.remoteHost === right.remoteHost
    && left.remotePort === right.remotePort
    && left.autoStart === right.autoStart;
}

interface ImportPlan {
  conflicts: ConfigImportConflict[];
  groupsToCreate: Group[];
  serversToCreate: ServerConfig[];
  serversToUpdate: Array<{ current: ServerConfig; incoming: ServerConfig }>;
  tunnelsToCreate: TunnelRule[];
  tunnelsToUpdate: Array<{ current: TunnelRule; incoming: TunnelRule }>;
  skippedGroups: number;
  skippedServers: number;
  skippedTunnels: number;
}

export class ConfigTransferService {
  constructor(
    private readonly groupRepository: GroupRepository,
    private readonly serverRepository: ServerRepository,
    private readonly tunnelRepository: TunnelRepository
  ) {}

  async exportConfig(password?: string): Promise<string | null> {
    const result = await dialog.showSaveDialog({
      title: '导出配置',
      defaultPath: `portbridge-config-${new Date().toISOString().slice(0, 10)}.pbconfig`,
      filters: [{ name: 'PortBridge 配置', extensions: ['pbconfig'] }]
    });

    if (result.canceled || !result.filePath) return null;

    const servers = this.serverRepository.listWithSecrets();
    const data: ConfigExportData = {
      groups: this.groupRepository.list(),
      servers,
      tunnels: this.tunnelRepository.list()
    };
    const file = password
      ? encryptData(data, password)
      : {
          version: CONFIG_VERSION,
          encrypted: false,
          data
        };

    writeFileSync(result.filePath, JSON.stringify(file, null, 2), 'utf8');
    return result.filePath;
  }

  async selectImportFile(): Promise<ConfigImportFileInfo | null> {
    const result = await dialog.showOpenDialog({
      title: '选择配置文件',
      properties: ['openFile'],
      filters: [{ name: 'PortBridge 配置', extensions: ['pbconfig'] }]
    });

    if (result.canceled || result.filePaths.length === 0) return null;

    const path = result.filePaths[0];
    return {
      path,
      name: basename(path)
    };
  }

  previewImport(path: string, password?: string): ConfigFileSummary {
    const data = readConfigData(path, password);
    const plan = this.createImportPlan(data, nowIso());
    return {
      encrypted: false,
      groups: data.groups.length,
      servers: data.servers.length,
      tunnels: data.tunnels.length,
      conflicts: plan.conflicts
    };
  }

  inspectImportFile(path: string): ConfigFileSummary {
    return summarize(path);
  }

  importConfig(path: string, password?: string, overwriteConflicts = false): ConfigImportResult {
    const data = readConfigData(path, password);
    const db = getDatabase();
    const importedAt = nowIso();
    const plan = this.createImportPlan(data, importedAt);

    if (plan.conflicts.length > 0 && !overwriteConflicts) {
      throw new Error('存在同名但内容不同的配置，请确认是否覆盖');
    }

    const transaction = db.transaction(() => {
      plan.groupsToCreate.forEach((nextGroup) => {
        db.prepare('INSERT INTO groups (id, name, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
          .run(nextGroup.id, nextGroup.name, nextGroup.sortOrder, nextGroup.createdAt, nextGroup.updatedAt);
      });

      plan.serversToCreate.forEach((nextServer) => {
        db.prepare(
          `INSERT INTO servers (
            id, group_id, name, host, port, username, auth_type, password, private_key, private_key_path,
            private_key_passphrase, auto_reconnect, reconnect_interval, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
          nextServer.id,
          nextServer.groupId,
          nextServer.name,
          nextServer.host,
          nextServer.port,
          nextServer.username,
          nextServer.authType,
          nextServer.authType === 'password' ? nextServer.password ?? null : null,
          nextServer.authType === 'privateKey' ? nextServer.privateKey ?? null : null,
          nextServer.authType === 'privateKey' ? nextServer.privateKeyPath ?? null : null,
          nextServer.authType === 'privateKey' ? nextServer.privateKeyPassphrase ?? null : null,
          nextServer.autoReconnect ? 1 : 0,
          nextServer.reconnectInterval,
          nextServer.createdAt,
          nextServer.updatedAt
        );
      });

      if (overwriteConflicts) {
        plan.serversToUpdate.forEach(({ current, incoming }) => {
          db.prepare(
            `UPDATE servers SET
              group_id = ?, name = ?, host = ?, port = ?, username = ?, auth_type = ?, password = ?,
              private_key = ?, private_key_path = ?, private_key_passphrase = ?, auto_reconnect = ?, reconnect_interval = ?, updated_at = ?
            WHERE id = ?`
          ).run(
            current.groupId,
            current.name,
            incoming.host,
            incoming.port,
            incoming.username,
            incoming.authType,
            incoming.authType === 'password' ? incoming.password ?? null : null,
            incoming.authType === 'privateKey' ? incoming.privateKey ?? null : null,
            incoming.authType === 'privateKey' ? incoming.privateKeyPath ?? null : null,
            incoming.authType === 'privateKey' ? incoming.privateKeyPassphrase ?? null : null,
            incoming.autoReconnect ? 1 : 0,
            incoming.reconnectInterval,
            importedAt,
            current.id
          );
        });
      }

      plan.tunnelsToCreate.forEach((nextTunnel) => {
        db.prepare(
          `INSERT INTO tunnels (
            id, server_id, name, local_host, local_port, remote_host, remote_port, auto_start, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
          nextTunnel.id,
          nextTunnel.serverId,
          nextTunnel.name,
          nextTunnel.localHost,
          nextTunnel.localPort,
          nextTunnel.remoteHost,
          nextTunnel.remotePort,
          nextTunnel.autoStart ? 1 : 0,
          nextTunnel.createdAt,
          nextTunnel.updatedAt
        );
      });

      if (overwriteConflicts) {
        plan.tunnelsToUpdate.forEach(({ current, incoming }) => {
          db.prepare(
            `UPDATE tunnels SET
              server_id = ?, name = ?, local_host = ?, local_port = ?, remote_host = ?, remote_port = ?, auto_start = ?, updated_at = ?
            WHERE id = ?`
          ).run(
            current.serverId,
            current.name,
            incoming.localHost,
            incoming.localPort,
            incoming.remoteHost,
            incoming.remotePort,
            incoming.autoStart ? 1 : 0,
            importedAt,
            current.id
          );
        });
      }
    });

    transaction();

    return {
      groups: plan.groupsToCreate.length,
      servers: plan.serversToCreate.length,
      tunnels: plan.tunnelsToCreate.length,
      updatedGroups: 0,
      updatedServers: overwriteConflicts ? plan.serversToUpdate.length : 0,
      updatedTunnels: overwriteConflicts ? plan.tunnelsToUpdate.length : 0,
      skippedGroups: plan.skippedGroups,
      skippedServers: plan.skippedServers,
      skippedTunnels: plan.skippedTunnels
    };
  }

  private createImportPlan(data: ConfigExportData, importedAt: string): ImportPlan {
    const groups = this.groupRepository.list();
    const servers = this.serverRepository.listWithSecrets();
    const tunnels = this.tunnelRepository.list();
    const groupIdMap = new Map<string, string>();
    const serverIdMap = new Map<string, string>();
    const groupsToCreate: Group[] = [];
    const serversToCreate: ServerConfig[] = [];
    const serversToUpdate: ImportPlan['serversToUpdate'] = [];
    const tunnelsToCreate: TunnelRule[] = [];
    const tunnelsToUpdate: ImportPlan['tunnelsToUpdate'] = [];
    const conflicts: ConfigImportConflict[] = [];
    let skippedGroups = 0;
    let skippedServers = 0;
    let skippedTunnels = 0;

    data.groups.forEach((group, index) => {
      const current = groups.find((item) => sameName(item.name, group.name));
      if (current) {
        groupIdMap.set(group.id, current.id);
        skippedGroups += 1;
        return;
      }

      const nextGroup: Group = {
        ...group,
        id: createId(),
        sortOrder: Date.now() + index,
        createdAt: importedAt,
        updatedAt: importedAt
      };
      groups.push(nextGroup);
      groupsToCreate.push(nextGroup);
      groupIdMap.set(group.id, nextGroup.id);
    });

    data.servers.forEach((server) => {
      const groupId = groupIdMap.get(server.groupId);
      if (!groupId) return;

      const current = servers.find((item) => item.groupId === groupId && sameName(item.name, server.name));
      if (current) {
        serverIdMap.set(server.id, current.id);
        if (sameServerContent(server, current)) {
          skippedServers += 1;
        } else {
          conflicts.push({ type: 'server', name: current.name, parentName: groups.find((group) => group.id === groupId)?.name ?? '未分组' });
          serversToUpdate.push({ current, incoming: server });
        }
        return;
      }

      const nextServer: ServerConfig = {
        ...server,
        id: createId(),
        groupId,
        createdAt: importedAt,
        updatedAt: importedAt
      };
      servers.push(nextServer);
      serversToCreate.push(nextServer);
      serverIdMap.set(server.id, nextServer.id);
    });

    data.tunnels.forEach((tunnel) => {
      const serverId = serverIdMap.get(tunnel.serverId);
      if (!serverId) return;

      const current = tunnels.find((item) => item.serverId === serverId && sameName(item.name, tunnel.name));
      if (current) {
        if (sameTunnelContent(tunnel, current)) {
          skippedTunnels += 1;
        } else {
          const parentName = servers.find((server) => server.id === serverId)?.name ?? '未知服务器';
          conflicts.push({ type: 'tunnel', name: current.name, parentName });
          tunnelsToUpdate.push({ current, incoming: tunnel });
        }
        return;
      }

      const nextTunnel: TunnelRule = {
        ...tunnel,
        id: createId(),
        serverId,
        createdAt: importedAt,
        updatedAt: importedAt
      };
      tunnels.push(nextTunnel);
      tunnelsToCreate.push(nextTunnel);
    });

    return {
      conflicts,
      groupsToCreate,
      serversToCreate,
      serversToUpdate,
      tunnelsToCreate,
      tunnelsToUpdate,
      skippedGroups,
      skippedServers,
      skippedTunnels
    };
  }
}
