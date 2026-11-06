const { app, BrowserWindow, dialog, shell, utilityProcess } = require('electron');
const path = require('node:path');

// 1. Force the computer's graphics card to handle radar loops at 60-120 FPS
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-zero-copy');

const PORT = '3217';
const APP_URL = `http://127.0.0.1:${PORT}`;
let serverProcess;
let mainWindow;
let serverOutput = '';
let serverExitDetails = '';

app.setAppUserModelId('org.mesovortexwx.desktop');

function appendServerOutput(source, chunk) {
  const text = chunk.toString().trim();
  if (!text) return;
  serverOutput = `${serverOutput}\n[${source}] ${text}`.slice(-8000);
}

async function waitForServer() {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (serverProcess && serverProcess.exitCode != null) {
      const details = serverOutput || serverExitDetails || 'The server process exited without reporting an error.';
      throw new Error(`The local weather app server stopped unexpectedly.\n\n${details}`);
    }
    try {
      const response = await fetch(APP_URL);
      if (response.ok) return;
    } catch {
      // Server is still starting up
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  const details = serverOutput || 'No server output was captured.';
  throw new Error(`The local weather app server did not start in time.\n\n${details}`);
}

async function createWindow() {
  const serverPath = path.join(app.getAppPath(), '.next', 'standalone', 'server.js');
  serverProcess = utilityProcess.fork(serverPath, [], {
    cwd: path.dirname(serverPath),
    env: {
      ...process.env,
      PORT,
      HOSTNAME: '127.0.0.1',
      NODE_ENV: 'production'
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    serviceName: 'MesoVortexWX Server'
  });

  serverProcess.stdout?.on('data', (chunk) => appendServerOutput('stdout', chunk));
  serverProcess.stderr?.on('data', (chunk) => appendServerOutput('stderr', chunk));
  serverProcess.on('error', (error) => {
    serverExitDetails = `Failed to launch the server process: ${error.message}`;
  });
  serverProcess.on('exit', (code) => {
    serverExitDetails = `Server process exited with code ${code}.`;
  });

  try {
    await waitForServer();
  } catch (error) {
    dialog.showErrorBox(
      'MesoVortexWX could not start',
      `${error.message}\n\nPlease check startup diagnostics.`
    );
    app.quit();
    return;
  }

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 900,
    minHeight: 650,
    title: 'MesoVortexWX',
    backgroundColor: '#020817',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(APP_URL)) shell.openExternal(url);
    return { action: 'deny' };
  });

  await mainWindow.loadURL(APP_URL);
}

app.whenReady().then(createWindow).catch((error) => {
  dialog.showErrorBox('MesoVortexWX could not start', error.message);
  app.quit();
});

app.on('window-all-closed', () => app.quit());
app.on('before-quit', () => {
  if (serverProcess && serverProcess.exitCode == null) serverProcess.kill();
});
