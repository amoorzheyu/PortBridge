import type { Group } from '../../shared/types';
import type { CreateGroupInput, UpdateGroupInput } from '../../shared/schemas';
import { getDatabase } from './database';
import { createId, nowIso } from '../utils/id';

interface GroupRow {
  id: string;
  name: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

function mapGroup(row: GroupRow): Group {
  return {
    id: row.id,
    name: row.name,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export class GroupRepository {
  list(): Group[] {
    return getDatabase()
      .prepare('SELECT * FROM groups ORDER BY sort_order ASC, created_at ASC')
      .all()
      .map((row) => mapGroup(row as GroupRow));
  }

  get(id: string): Group | undefined {
    const row = getDatabase().prepare('SELECT * FROM groups WHERE id = ?').get(id) as GroupRow | undefined;
    return row ? mapGroup(row) : undefined;
  }

  create(input: CreateGroupInput): Group {
    const createdAt = nowIso();
    const group: Group = {
      id: createId(),
      name: input.name,
      sortOrder: Date.now(),
      createdAt,
      updatedAt: createdAt
    };
    getDatabase()
      .prepare('INSERT INTO groups (id, name, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
      .run(group.id, group.name, group.sortOrder, group.createdAt, group.updatedAt);
    return group;
  }

  update(input: UpdateGroupInput): Group {
    const updatedAt = nowIso();
    getDatabase().prepare('UPDATE groups SET name = ?, updated_at = ? WHERE id = ?').run(input.name, updatedAt, input.id);
    const group = this.get(input.id);
    if (!group) throw new Error('分组不存在');
    return group;
  }

  delete(id: string): void {
    const serverCount = getDatabase().prepare('SELECT COUNT(*) as count FROM servers WHERE group_id = ?').get(id) as { count: number };
    if (serverCount.count > 0) throw new Error('该分组下还有服务器，请先删除服务器。');
    getDatabase().prepare('DELETE FROM groups WHERE id = ?').run(id);
  }

  deleteEmptyGroups(): number {
    const result = getDatabase()
      .prepare(
        `DELETE FROM groups
        WHERE NOT EXISTS (
          SELECT 1 FROM servers WHERE servers.group_id = groups.id
        )`
      )
      .run();
    return result.changes;
  }

  deleteAllData(): void {
    const db = getDatabase();
    const transaction = db.transaction(() => {
      db.prepare('DELETE FROM tunnels').run();
      db.prepare('DELETE FROM servers').run();
      db.prepare('DELETE FROM groups').run();
    });
    transaction();
  }
}
