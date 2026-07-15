import type { ServerConfig } from '../../shared/types';
import type { CreateServerInput, UpdateServerInput } from '../../shared/schemas';
import { getDatabase } from './database';
import { createId, nowIso } from '../utils/id';

interface ServerRow {
  id: string;
  group_id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  auth_type: 'password' | 'privateKey';
  password?: string;
  private_key?: string;
  private_key_path?: string;
  private_key_passphrase?: string;
  auto_reconnect: number;
  reconnect_interval: number;
  created_at: string;
  updated_at: string;
}

function mapServer(row: ServerRow): ServerConfig {
  return {
    id: row.id,
    groupId: row.group_id,
    name: row.name,
    host: row.host,
    port: row.port,
    username: row.username,
    authType: row.auth_type,
    password: row.password ?? undefined,
    privateKey: row.private_key ?? undefined,
    privateKeyPath: row.private_key_path ?? undefined,
    privateKeyPassphrase: row.private_key_passphrase ?? undefined,
    autoReconnect: Boolean(row.auto_reconnect),
    reconnectInterval: row.reconnect_interval,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function publicServer(server: ServerConfig): ServerConfig {
  return {
    ...server,
    password: server.password ? undefined : server.password,
    privateKey: server.privateKey ? undefined : server.privateKey,
    privateKeyPassphrase: server.privateKeyPassphrase ? undefined : server.privateKeyPassphrase
  };
}

export class ServerRepository {
  list(): ServerConfig[] {
    return getDatabase()
      .prepare('SELECT * FROM servers ORDER BY created_at ASC')
      .all()
      .map((row) => publicServer(mapServer(row as ServerRow)));
  }

  listWithSecrets(): ServerConfig[] {
    return getDatabase()
      .prepare('SELECT * FROM servers ORDER BY created_at ASC')
      .all()
      .map((row) => mapServer(row as ServerRow));
  }

  listByGroup(groupId: string): ServerConfig[] {
    return getDatabase()
      .prepare('SELECT * FROM servers WHERE group_id = ? ORDER BY created_at ASC')
      .all(groupId)
      .map((row) => publicServer(mapServer(row as ServerRow)));
  }

  get(id: string, includeSecrets = false): ServerConfig | undefined {
    const row = getDatabase().prepare('SELECT * FROM servers WHERE id = ?').get(id) as ServerRow | undefined;
    if (!row) return undefined;
    const server = mapServer(row);
    return includeSecrets ? server : publicServer(server);
  }

  create(input: CreateServerInput): ServerConfig {
    const createdAt = nowIso();
    const id = createId();
    getDatabase()
      .prepare(
        `INSERT INTO servers (
          id, group_id, name, host, port, username, auth_type, password, private_key, private_key_path,
          private_key_passphrase, auto_reconnect, reconnect_interval, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        id,
        input.groupId,
        input.name,
        input.host,
        input.port,
        input.username,
        input.authType,
        input.authType === 'password' ? input.password : null,
        input.authType === 'privateKey' ? input.privateKey : null,
        input.authType === 'privateKey' ? input.privateKeyPath : null,
        input.authType === 'privateKey' ? input.privateKeyPassphrase : null,
        1,
        3000,
        createdAt,
        createdAt
      );
    return this.get(id) as ServerConfig;
  }

  update(input: UpdateServerInput): ServerConfig {
    const current = this.get(input.id, true);
    if (!current) throw new Error('服务器不存在');

    const updatedAt = nowIso();
    const password = input.password?.trim()
      ? input.password
      : current.authType === 'password' && current.password
        ? current.password
        : null;
    const privateKey = input.privateKey?.trim()
      ? input.privateKey
      : current.authType === 'privateKey' && current.privateKey
        ? current.privateKey
        : null;
    const privateKeyPath = input.privateKeyPath?.trim()
      ? input.privateKeyPath
      : current.authType === 'privateKey' && current.privateKeyPath
        ? current.privateKeyPath
        : null;
    const privateKeyPassphrase = input.privateKeyPassphrase?.trim()
      ? input.privateKeyPassphrase
      : current.authType === 'privateKey' && current.privateKeyPassphrase
        ? current.privateKeyPassphrase
        : null;

    if (input.authType === 'password' && !password) {
      throw new Error('密码不能为空');
    }
    if (input.authType === 'privateKey' && !privateKey && !privateKeyPath) {
      throw new Error('请填写私钥内容或选择私钥文件');
    }

    getDatabase()
      .prepare(
        `UPDATE servers SET
          group_id = ?, name = ?, host = ?, port = ?, username = ?, auth_type = ?, password = ?,
          private_key = ?, private_key_path = ?, private_key_passphrase = ?, auto_reconnect = ?, reconnect_interval = ?, updated_at = ?
        WHERE id = ?`
      )
      .run(
        input.groupId,
        input.name,
        input.host,
        input.port,
        input.username,
        input.authType,
        input.authType === 'password' ? password : null,
        input.authType === 'privateKey' ? privateKey : null,
        input.authType === 'privateKey' ? privateKeyPath : null,
        input.authType === 'privateKey' ? privateKeyPassphrase : null,
        1,
        3000,
        updatedAt,
        input.id
      );
    const server = this.get(input.id);
    if (!server) throw new Error('服务器不存在');
    return server;
  }

  delete(id: string): void {
    const db = getDatabase();
    const transaction = db.transaction(() => {
      db.prepare('DELETE FROM tunnels WHERE server_id = ?').run(id);
      db.prepare('DELETE FROM servers WHERE id = ?').run(id);
    });
    transaction();
  }
}
