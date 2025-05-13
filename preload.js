const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    loadTowns: () => ipcRenderer.invoke('load-towns'),
    saveTowns: (towns) => ipcRenderer.invoke('save-towns', towns),
    exportTownData: (townName, data) => ipcRenderer.invoke('export-town-data', townName, data)
});