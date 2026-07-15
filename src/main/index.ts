import { app, BrowserWindow } from 'electron';
import { join } from 'node:path';
import { createAppServices, registerIpcHandlers } from './ipc';

let mainWindow: BrowserWindow | null = null;
const services = createAppServices();

function getWindowIconPath(): string {
  return app.isPackaged ? join(process.resourcesPath, 'icon.png') : join(process.cwd(), 'build/icon.png');
}

function setAppIcon(): void {
  if (process.platform === 'darwin') {
    app.dock.setIcon(getWindowIconPath());
  }
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1060,
    minHeight: 680,
    title: '',
    icon: getWindowIconPath(),
    backgroundColor: '#09090b',
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.on('page-title-updated', (event) => {
    event.preventDefault();
    mainWindow?.setTitle('');
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

app.whenReady().then(() => {
  setAppIcon();
  registerIpcHandlers(services);
  createWindow();
  void services.tunnelManager.startAutoStartTunnels().catch((error) => {
    services.logService.error(error instanceof Error ? error.message : '自动启动映射失败');
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

let isQuitting = false;

app.on('before-quit', async (event) => {
  if (isQuitting) return;
  isQuitting = true;
  event.preventDefault();
  await services.tunnelManager.stopAll();
  app.exit(0);
});
