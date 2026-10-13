const { app, BrowserWindow, Menu, nativeImage, shell } = require('electron')
const path = require('node:path')

const HOME = 'https://asaas-erp.vercel.app/app'
const ALLOWED_ORIGIN = 'https://asaas-erp.vercel.app'
const BLOCKED_PRODUCTS = ['/invoice', '/asaasdelivery']
let mainWindow
let pendingDeepLink

function isAllowedUrl(value) {
  try {
    const url = new URL(value)
    return url.origin === ALLOWED_ORIGIN && !BLOCKED_PRODUCTS.some(prefix => url.pathname === prefix || url.pathname.startsWith(`${prefix}/`))
  } catch {
    return false
  }
}

function openExternalUrl(value) {
  try {
    const url = new URL(value)
    if (['https:', 'http:', 'mailto:', 'tel:'].includes(url.protocol)) void shell.openExternal(url.href)
  } catch {
    // Ignore malformed or unsafe external navigation.
  }
}

function resolveDeepLink(value) {
  try {
    const url = new URL(value)
    if (url.protocol !== 'asaas-erp:') return HOME
    const pathName = `/${url.host}${url.pathname}`.replace(/\/+/g, '/')
    const target = new URL(pathName, ALLOWED_ORIGIN)
    target.search = url.search
    return isAllowedUrl(target.href) ? target.href : HOME
  } catch {
    return HOME
  }
}

function openInApp(value) {
  const target = value?.startsWith('asaas-erp:') ? resolveDeepLink(value) : value
  mainWindow?.loadURL(isAllowedUrl(target) ? target : HOME)
  if (mainWindow?.isMinimized()) mainWindow.restore()
  mainWindow?.show()
  mainWindow?.focus()
}

function createWindow() {
  const icon = nativeImage.createFromPath(path.join(__dirname, 'assets', 'icon.png'))
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 940,
    minWidth: 980,
    minHeight: 680,
    show: false,
    backgroundColor: '#071b3b',
    icon,
    title: 'ASAAS ERP',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    trafficLightPosition: { x: 18, y: 18 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      spellcheck: true,
      partition: 'persist:asaas-erp',
    },
  })

  mainWindow.webContents.setUserAgent(`${mainWindow.webContents.getUserAgent()} ASAASERPDesktop/1.0`)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isAllowedUrl(url)) openInApp(url)
    else openExternalUrl(url)
    return { action: 'deny' }
  })
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (isAllowedUrl(url)) return
    event.preventDefault()
    if (new URL(url).origin === ALLOWED_ORIGIN) openInApp(HOME)
    else openExternalUrl(url)
  })
  mainWindow.webContents.on('will-redirect', (event, url) => {
    if (isAllowedUrl(url)) return
    event.preventDefault()
    if (new URL(url).origin === ALLOWED_ORIGIN) openInApp(HOME)
    else openExternalUrl(url)
  })
  mainWindow.webContents.on('render-process-gone', () => mainWindow?.reload())
  mainWindow.once('ready-to-show', () => mainWindow?.show())
  mainWindow.on('closed', () => { mainWindow = undefined })

  mainWindow.loadFile(path.join(__dirname, 'splash.html'))
  mainWindow.webContents.once('did-finish-load', () => {
    setTimeout(() => openInApp(pendingDeepLink || HOME), 500)
    pendingDeepLink = undefined
  })
}

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) app.quit()
else {
  app.on('second-instance', (_event, argv) => {
    const link = argv.find(value => value.startsWith('asaas-erp:'))
    openInApp(link || HOME)
  })
  app.on('open-url', (event, url) => {
    event.preventDefault()
    if (mainWindow) openInApp(url)
    else pendingDeepLink = url
  })
  app.whenReady().then(() => {
    app.setAsDefaultProtocolClient('asaas-erp')
    Menu.setApplicationMenu(null)
    createWindow()
    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
  })
  app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
}
