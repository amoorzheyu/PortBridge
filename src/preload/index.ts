import { contextBridge } from 'electron';

contextBridge.exposeInMainWorld('portBridge', {
  platform: process.platform
});
