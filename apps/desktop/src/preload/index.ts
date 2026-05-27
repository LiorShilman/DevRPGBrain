import { contextBridge } from 'electron'

// Expose Electron APIs to the renderer via contextBridge.
// Add channels here as features are implemented.
contextBridge.exposeInMainWorld('electronAPI', {
  // e.g. openFolder: () => ipcRenderer.invoke('dialog:openFolder')
})
