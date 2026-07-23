import { app, BrowserWindow, ipcMain, WebContents, session, shell, net } from 'electron';
import http from 'http';
import fs from 'fs';
import netModule from 'net'; // For port discovery
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GenerationRecord, LiteDatabase } from './database';
import { SidecarSupervisor } from './sidecar_supervisor';
import { ModelDownloader } from './model_downloader';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Limit V8 heap space to 512MB to prevent memory explosions
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=512');

// Shim for dependencies that rely on __filename/__dirname (like better-sqlite3's bindings).
Object.defineProperty(globalThis, '__filename', { value: __filename });
Object.defineProperty(globalThis, '__dirname', { value: __dirname });

dotenv.config();

if (!app.requestSingleInstanceLock()) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;
let db: LiteDatabase | null = null;
let dbInitError: string | null = null;
let pendingAuthResolve: ((url: string) => void) | null = null;
let pendingDeepLinkUrl: string | null = null;
let activeAuthServer: http.Server | null = null;
let authServerTimeout: NodeJS.Timeout | null = null;
const activeSockets = new Set<netModule.Socket>();
const logQueue: string[] = [];
let isWritingLog = false;

if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('dreambees', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('dreambees');
}

const isDev = !app.isPackaged;
const devServerUrl = process.env.VITE_DEV_SERVER_URL;
const rendererRoot = path.resolve(__dirname, '../dist');
const authDomain = 'dreambees-alchemist.firebaseapp.com';

/**
 * PRODUCTION HARDENING: Persistent Forensic Logging
 */
const logFile = path.join(app.getPath('userData'), 'forensic.log');

function flushLogQueue() {
  if (isWritingLog || logQueue.length === 0) return;
  isWritingLog = true;
  const entry = logQueue.shift()!;
  
  fs.appendFile(logFile, entry, (err) => {
    if (!err) {
      fs.stat(logFile, (err, stats) => {
        if (!err && stats.size > 5 * 1024 * 1024) {
          fs.writeFile(logFile, `[${new Date().toISOString()}] Log Rotated\n`, () => {
            isWritingLog = false;
            flushLogQueue();
          });
        } else {
          isWritingLog = false;
          flushLogQueue();
        }
      });
    } else {
      isWritingLog = false;
      flushLogQueue();
    }
  });
}

function logStartup(message: string, error?: unknown) {
  const suffix = error instanceof Error ? `: ${error.stack || error.message}` : error ? `: ${String(error)}` : '';
  const logEntry = `[${new Date().toISOString()}] ${message}${suffix}\n`;
  
  console.log(logEntry.trim());
  
  logQueue.push(logEntry);
  flushLogQueue();
}

async function findAvailablePort(startPort: number): Promise<number> {
  return new Promise((resolve) => {
    const server = netModule.createServer();
    server.unref();
    server.on('error', () => resolve(findAvailablePort(startPort + 1)));
    server.listen(startPort, '127.0.0.1', () => {
      const port = (server.address() as netModule.AddressInfo).port;
      server.close(() => resolve(port));
    });
  });
}

function cleanupAuthServer() {
  if (activeAuthServer) {
    activeAuthServer.close();
    activeAuthServer = null;
  }
  for (const socket of activeSockets) {
    if (!socket.destroyed) {
      socket.destroy();
    }
  }
  activeSockets.clear();
  if (authServerTimeout) {
    clearTimeout(authServerTimeout);
    authServerTimeout = null;
  }
}

function ensureDb() {
  if (!db) throw new Error(dbInitError || 'Local database is unavailable');
  return db;
}

let sidecarSupervisor: SidecarSupervisor | null = null;
let modelDownloader: ModelDownloader | null = null;

function registerIpcHandlers() {
  // Health check with system diagnostics
  ipcMain.handle('lite:health', async () => ({
    ok: true,
    appVersion: app.getVersion(),
    dbAvailable: Boolean(db),
    dbError: dbInitError,
    packaged: app.isPackaged,
    platform: process.platform,
    arch: process.arch,
  }));

  ipcMain.handle('lite:saveGeneration', async (_, data: GenerationRecord) => {
    try {
      if (!data?.id) throw new Error('Generation record must have an ID');
      return ensureDb().saveGeneration(data);
    } catch (error) {
      logStartup('Failed to save generation', error);
      throw error;
    }
  });

  ipcMain.handle('lite:getGenerations', async (_, limit?: number) => {
    try {
      return ensureDb().getGenerations(limit);
    } catch (error) {
      logStartup('Failed to get generations', error);
      return [];
    }
  });

  ipcMain.handle('lite:setSetting', async (_, key: string, val: unknown) => {
    try {
      return ensureDb().setSetting(key, val);
    } catch (error) {
      logStartup(`Failed to set setting: ${key}`, error);
      throw error;
    }
  });

  ipcMain.handle('lite:getSetting', async (_, key: string) => {
    try {
      return ensureDb().getSetting(key);
    } catch (error) {
      logStartup(`Failed to get setting: ${key}`, error);
      return null;
    }
  });

  // MLX Native IPC Handlers
  ipcMain.handle('mlx:getHardwareStats', async () => {
    const os = await import('os');
    return {
      platform: process.platform,
      arch: process.arch,
      totalMemoryMb: Math.round(os.totalmem() / (1024 * 1024)),
      metalAvailable: process.platform === 'darwin' && process.arch === 'arm64',
    };
  });

  ipcMain.handle('mlx:listModels', async () => {
    if (!modelDownloader) {
      modelDownloader = new ModelDownloader(app.getPath('userData'));
    }
    return modelDownloader.getModelCatalog();
  });

  ipcMain.handle('mlx:downloadModel', async (_, modelId: string) => {
    if (!modelDownloader) {
      modelDownloader = new ModelDownloader(app.getPath('userData'));
    }
    return modelDownloader.downloadModel(modelId);
  });

  ipcMain.handle('mlx:generateImage', async (_, params: any) => {
    if (!sidecarSupervisor) {
      const scriptPath = path.join(__dirname, 'mlx/mlx_image_daemon.py');
      sidecarSupervisor = new SidecarSupervisor(scriptPath);

      sidecarSupervisor.on('message', (msg: any) => {
        if (mainWindow) {
          if (msg.type === 'progress') {
            mainWindow.webContents.send('mlx:progress', msg.payload);
          } else if (msg.type === 'complete') {
            mainWindow.webContents.send('mlx:complete', msg.payload);
            // Save generation record to SQLite
            if (msg.payload?.output_path && db) {
              db.saveGeneration({
                id: `gen_${Date.now()}`,
                prompt: params.prompt || '',
                imageUrl: `file://${msg.payload.output_path}`,
                modelId: msg.payload.model_id || params.modelId,
                params: {
                  width: msg.payload.width,
                  height: msg.payload.height,
                  seed: msg.payload.seed,
                  durationMs: msg.payload.duration_ms,
                },
                createdAt: Date.now(),
              });
            }
          }
        }
      });

      sidecarSupervisor.start();
    }

    const outputDir = path.join(app.getPath('userData'), 'generations');
    const outputPath = path.join(outputDir, `gen_${Date.now()}_${Math.floor(Math.random() * 1000)}.png`);

    const req = {
      id: `gen_${Date.now()}`,
      prompt: params.prompt || '',
      model_id: params.modelId || 'flux2-klein-4b',
      width: Number(params.width) || 1024,
      height: Number(params.height) || 1024,
      steps: Number(params.steps) || 4,
      guidance_scale: Number(params.guidanceScale) || 3.5,
      seed: Number(params.seed) || Math.floor(Math.random() * 1000000),
      output_path: outputPath,
    };

    return sidecarSupervisor.generateImage(req);
  });

  ipcMain.handle('auth:google-login', async () => ({
    idToken: 'local_token',
    accessToken: 'local_access',
  }));

  ipcMain.handle('auth:get-pending-link', async () => null);
}

function tryInitDatabase() {
  try {
    db = new LiteDatabase();
    dbInitError = null;
    logStartup('Local database initialized');
  } catch (error) {
    db = null;
    dbInitError = error instanceof Error ? error.message : String(error);
    logStartup('Local database unavailable; continuing without local persistence', error);
  }
}

function attachWebContentsDiagnostics(contents: WebContents) {
  contents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    logStartup(`Renderer did-fail-load ${errorCode} ${errorDescription} ${validatedURL}`);
  });
  contents.on('render-process-gone', (_event, details) => {
    logStartup(`Renderer process gone: ${details.reason} (${details.exitCode})`);
  });
  contents.on('unresponsive', () => logStartup('Renderer became unresponsive'));
}

function isAllowedNavigation(url: string) {
  if (devServerUrl && url.startsWith(devServerUrl)) return true;

  try {
    const parsed = new URL(url);
    
    // Allow Firebase and Google Auth domains
    const allowedHosts = [
      'accounts.google.com',
      authDomain,
      'firebaseapp.com'
    ];
    
    if (allowedHosts.some(host => parsed.hostname === host || parsed.hostname.endsWith('.' + host))) {
      return true;
    }

    if (parsed.protocol === 'file:') {
      const targetPath = path.resolve(fileURLToPath(parsed));
      return targetPath === rendererRoot || targetPath.startsWith(`${rendererRoot}${path.sep}`);
    }
    return parsed.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsed.hostname);
  } catch {
    return false;
  }
}

function setupSecurityHeaders() {
  const authDomain = 'dreambees-alchemist.firebaseapp.com';

  // 1. Outgoing: Comprehensive Masquerade
  session.defaultSession.webRequest.onBeforeSendHeaders({
    urls: [
      'https://*.googleapis.com/*',
      'https://*.firebaseio.com/*',
      'https://*.firebaseapp.com/*',
      'https://accounts.google.com/*'
    ]
  }, (details, callback) => {
    const headers = { ...details.requestHeaders };
    
    headers['Origin'] = `https://${authDomain}`;
    headers['Referer'] = `https://${authDomain}/`;
    
    // Mask metadata to appear as a same-site request from the authorized domain
    headers['Sec-Fetch-Site'] = 'same-site';
    headers['Sec-Fetch-Mode'] = 'cors';
    headers['Sec-Fetch-Dest'] = 'empty';
    
    callback({ cancel: false, requestHeaders: headers });
  });

  // 2. Incoming: Force Allow CORS & Inject CSP
  session.defaultSession.webRequest.onHeadersReceived({
    urls: [
      'https://*.googleapis.com/*',
      'https://*.firebaseio.com/*',
      'https://*.firebaseapp.com/*',
      'https://accounts.google.com/*'
    ]
  }, (details, callback) => {
    const responseHeaders = { ...details.responseHeaders };
    
    responseHeaders['Access-Control-Allow-Origin'] = ['*'];
    responseHeaders['Access-Control-Allow-Methods'] = ['GET, POST, OPTIONS, PUT, DELETE'];
    responseHeaders['Access-Control-Allow-Headers'] = ['*'];
    
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      `img-src 'self' data: https: blob:`,
      `connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://api.dreambeesai.com https://www.google-analytics.com https://${authDomain}`,
      "frame-src 'self' https://accounts.google.com",
      "object-src 'none'"
    ].join('; ');
    
    responseHeaders['Content-Security-Policy'] = [csp];

    callback({ cancel: false, responseHeaders });
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webgl: true,
    },
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#060608',
    show: false,
    icon: path.join(__dirname, '../public/dreambees_icon.png'),
  });

  attachWebContentsDiagnostics(mainWindow.webContents);

  mainWindow.webContents.on('did-finish-load', () => {
    if (pendingDeepLinkUrl && mainWindow) {
      mainWindow.webContents.send('auth:deep-link', pendingDeepLinkUrl);
      pendingDeepLinkUrl = null;
    }
  });

  const loadPromise = devServerUrl
    ? mainWindow.loadURL(devServerUrl)
    : mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));

  loadPromise.catch((error) => {
    logStartup('Failed to load renderer', error);
  });

  if (isDev || process.env.DREAMBEES_OPEN_DEVTOOLS === '1') {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    cleanupAuthServer();
  });
}

function handleDeepLink(url: string) {
  logStartup(`Received protocol URL to handle: ${url}`);
  if (url.startsWith('dreambees://auth')) {
    if (pendingAuthResolve) {
      pendingAuthResolve(url);
      pendingAuthResolve = null;
    }
    if (mainWindow && !mainWindow.webContents.isLoading()) {
      mainWindow.webContents.send('auth:deep-link', url);
    } else {
      pendingDeepLinkUrl = url;
    }
  }
}

app.whenReady().then(() => {
  setupSecurityHeaders();
  registerIpcHandlers();
  createWindow();
  tryInitDatabase();

  if (!modelDownloader) {
    modelDownloader = new ModelDownloader(app.getPath('userData'));
  }

  modelDownloader.on('progress', (data) => {
    if (mainWindow) {
      mainWindow.webContents.send('mlx:progress', {
        stage: `Downloading model weights (${data.progressPct}%)...`,
        progress_pct: data.progressPct,
        downloading_model_id: data.modelId,
      });
    }
  });

  modelDownloader.on('completed', (data) => {
    if (mainWindow) {
      mainWindow.webContents.send('mlx:complete', {
        auto_provisioned_model_id: data.modelId,
      });
    }
  });

  modelDownloader.autoProvisionDefaultModel();

  if (!sidecarSupervisor) {
    const scriptPath = path.join(__dirname, 'mlx/mlx_image_daemon.py');
    sidecarSupervisor = new SidecarSupervisor(scriptPath);
    sidecarSupervisor.start();
  }

  app.on('open-url', (event, url) => {
    event.preventDefault();
    handleDeepLink(url);
  });

  // Windows/Linux handle deep link from argv
  app.on('second-instance', (_event, commandLine) => {
    const url = commandLine.find(arg => arg.startsWith('dreambees://auth'));
    if (url) {
      handleDeepLink(url);
    }
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  // Windows/Linux cold-start deep-link check
  if (process.platform !== 'darwin') {
    const url = process.argv.find(arg => arg.startsWith('dreambees://auth'));
    if (url) {
      handleDeepLink(url);
    }
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
}).catch((error) => {
  logStartup('App failed during whenReady', error);
});

app.on('before-quit', () => {
  cleanupAuthServer();
  try {
    db?.close();
  } catch (error) {
    logStartup('Failed to close database', error);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Security: restrict navigation and new windows
app.on('web-contents-created', (_, contents) => {
  contents.on('will-navigate', (event, url) => {
    if (!isAllowedNavigation(url)) {
      logStartup(`Blocked unauthorized navigation to: ${url}`);
      event.preventDefault();
    }
  });

  contents.setWindowOpenHandler(({ url }) => {
    if (isAllowedNavigation(url)) {
      return { action: 'allow' };
    }
    logStartup(`Blocked unauthorized window opening: ${url}`);
    return { action: 'deny' };
  });

  // Harden: prevent rogue webviews
  contents.on('will-attach-webview', (event) => {
    event.preventDefault();
    logStartup('Blocked unauthorized webview attachment');
  });
});

process.on('uncaughtException', (error) => logStartup('Uncaught exception', error));
process.on('unhandledRejection', (reason) => logStartup('Unhandled rejection', reason));
