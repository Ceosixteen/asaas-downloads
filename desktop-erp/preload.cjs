const { contextBridge } = require('electron')

contextBridge.exposeInMainWorld('ASAASDesktop', Object.freeze({
  platform: process.platform,
  version: '1.0.0',
  desktop: true,
}))
