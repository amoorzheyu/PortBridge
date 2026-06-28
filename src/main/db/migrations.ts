import type Database from 'better-sqlite3';

export function runMigrations(db: Database.Database): void {
  db.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS servers (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL,
      name TEXT NOT NULL,
      host TEXT NOT NULL,
      port INTEGER NOT NULL DEFAULT 22,
      username TEXT NOT NULL,
      auth_type TEXT NOT NULL,
      password TEXT,
      private_key TEXT,
      private_key_path TEXT,
      private_key_passphrase TEXT,
      auto_reconnect INTEGER NOT NULL DEFAULT 1,
      reconnect_interval INTEGER NOT NULL DEFAULT 3000,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (group_id) REFERENCES groups(id)
    );

    CREATE TABLE IF NOT EXISTS tunnels (
      id TEXT PRIMARY KEY,
      server_id TEXT NOT NULL,
      name TEXT NOT NULL,
      local_host TEXT NOT NULL DEFAULT '127.0.0.1',
      local_port INTEGER NOT NULL,
      remote_host TEXT NOT NULL DEFAULT '127.0.0.1',
      remote_port INTEGER NOT NULL,
      auto_start INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (server_id) REFERENCES servers(id)
    );
  `);

  const columns = db.prepare('PRAGMA table_info(servers)').all() as Array<{ name: string }>;
  if (!columns.some((column) => column.name === 'private_key')) {
    db.exec('ALTER TABLE servers ADD COLUMN private_key TEXT;');
  }
}
