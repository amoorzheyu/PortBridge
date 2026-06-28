import type { TunnelRule } from '../../shared/types';
import type { CreateTunnelInput, UpdateTunnelInput } from '../../shared/schemas';
import { getDatabase } from './database';
import { createId, nowIso } from '../utils/id';

interface TunnelRow {
  id: string;
  server_id: string;
  name: string;
  local_host: string;
  local_port: number;
  remote_host: string;
  remote_port: number;
  auto_start: number;
  created_at: string;
  updated_at: string;
}

function mapTunnel(row: TunnelRow): TunnelRule {
  return {
    id: row.id,
    serverId: row.server_id,
    name: row.name,
    localHost: row.local_host,
    localPort: row.local_port,
    remoteHost: row.remote_host,
    remotePort: row.remote_port,
    autoStart: Boolean(row.auto_start),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export class TunnelRepository {
  list(): TunnelRule[] {
    return getDatabase()
      .prepare('SELECT * FROM tunnels ORDER BY created_at ASC')
      .all()
      .map((row) => mapTunnel(row as TunnelRow));
  }

  listByServer(serverId: string): TunnelRule[] {
    return getDatabase()
      .prepare('SELECT * FROM tunnels WHERE server_id = ? ORDER BY created_at ASC')
      .all(serverId)
      .map((row) => mapTunnel(row as TunnelRow));
  }

  get(id: string): TunnelRule | undefined {
    const row = getDatabase().prepare('SELECT * FROM tunnels WHERE id = ?').get(id) as TunnelRow | undefined;
    return row ? mapTunnel(row) : undefined;
  }

  create(input: CreateTunnelInput): TunnelRule {
    const createdAt = nowIso();
    const id = createId();
    getDatabase()
      .prepare(
        `INSERT INTO tunnels (
          id, server_id, name, local_host, local_port, remote_host, remote_port, auto_start, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(id, input.serverId, input.name, input.localHost, input.localPort, input.remoteHost, input.remotePort, input.autoStart ? 1 : 0, createdAt, createdAt);
    return this.get(id) as TunnelRule;
  }

  update(input: UpdateTunnelInput): TunnelRule {
    const updatedAt = nowIso();
    getDatabase()
      .prepare(
        `UPDATE tunnels SET
          server_id = ?, name = ?, local_host = ?, local_port = ?, remote_host = ?, remote_port = ?, auto_start = ?, updated_at = ?
        WHERE id = ?`
      )
      .run(input.serverId, input.name, input.localHost, input.localPort, input.remoteHost, input.remotePort, input.autoStart ? 1 : 0, updatedAt, input.id);
    const tunnel = this.get(input.id);
    if (!tunnel) throw new Error('映射规则不存在');
    return tunnel;
  }

  delete(id: string): void {
    getDatabase().prepare('DELETE FROM tunnels WHERE id = ?').run(id);
  }
}
