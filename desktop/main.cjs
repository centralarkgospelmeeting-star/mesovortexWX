const { app, BrowserWindow, dialog, shell, utilityProcess } = require('electron');
const path = require('node:path');

const PORT = '3217';
const APP_URL = `http://127.0.0.1:${PORT}`;
let serverProcess;
let mainWindow;

app.setAppUserModelId('org.mesovortexwx.desktop');

async function waitForServer() {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (serverProcess && serverProcess.exitCode !== null) {
      throw new Error('The local weather app server stopped unexpectedly.');
    }
    try {
      const response = await fetch(APP_URL);
      if (response.ok) return;
    } catch {
      // The bundled Next.js server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error('The local weather app server did not start in time.');
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
    stdio: 'ignore',
    serviceName: 'MesoVortexWX Server'
  });

  try {
    await waitForServer();
  } catch (error) {
    dialog.showErrorBox(
      'MesoVortexWX could not start',
      `${error.message}\n\nRestart the app. If the problem continues, reinstall MesoVortexWX.`
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
  if (serverProcess && serverProcess.exitCode === null) serverProcess.kill();
});
