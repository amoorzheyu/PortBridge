import { app, BrowserWindow } from 'electron';
import { join } from 'node:path';
import { createAppServices, registerIpcHandlers } from './ipc';

let mainWindow: BrowserWindow | null = null;
const services = createAppServices();

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1060,
    minHeight: 680,
    title: 'PortBridge',
    backgroundColor: '#09090b',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
}

app.whenReady().then(() => {
  registerIpcHandlers(services);
  createWindow();
  void services.tunnelManager.startAutoStartTunnels();

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
