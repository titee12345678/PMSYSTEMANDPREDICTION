const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  selectFile: () => ipcRenderer.invoke('select-file'),
  showMessage: (options) => ipcRenderer.invoke('show-message', options),
  getAppPath: () => ipcRenderer.invoke('get-app-path')
});
