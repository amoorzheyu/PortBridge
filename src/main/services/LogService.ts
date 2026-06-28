import { BrowserWindow } from 'electron';
import type { AppLog } from '../../shared/types';
import { createId, nowIso } from '../utils/id';

export class LogService {
  private logs: AppLog[] = [];

  list(): AppLog[] {
    return this.logs;
  }

  clear(): void {
    this.logs = [];
    BrowserWindow.getAllWindows().forEach((window) => {
      window.webContents.send('runtime:logsCleared');
    });
  }

  info(message: string): void {
    this.add('info', message);
  }

  warn(message: string): void {
    this.add('warn', message);
  }

  error(message: string): void {
    this.add('error', message);
  }

  private add(level: AppLog['level'], message: string): void {
    const log: AppLog = {
      id: createId(),
      level,
      message,
      createdAt: nowIso()
    };
    this.logs = [...this.logs, log].slice(-500);
    BrowserWindow.getAllWindows().forEach((window) => {
      window.webContents.send('runtime:log', log);
    });
  }
}
