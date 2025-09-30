// Verify we're running in Electron
if (!process.versions.electron) {
  console.error('✗ Error: Not running in Electron context');
  console.error('  Please run with: npm start');
  process.exit(1);
}

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const APIServer = require('../api/server');

let mainWindow;
let apiServer;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    icon: path.join(__dirname, '../../assets/icon.png')
  });

  mainWindow.loadFile(path.join(__dirname, '../../public/index.html'));

  // Open DevTools in development (always open for debugging)
  mainWindow.webContents.openDevTools();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Initialize API server
async function startAPIServer() {
  try {
    console.log('Starting API Server...');
    apiServer = new APIServer();
    await apiServer.start(3000);
    console.log('✓ API Server started successfully on http://localhost:3000');
  } catch (error) {
    console.error('✗ Failed to start API server:', error.message);
    console.error(error.stack);

    // Show error dialog
    dialog.showErrorBox(
      'เกิดข้อผิดพลาด',
      `ไม่สามารถเริ่มต้น API Server ได้\n\nรายละเอียด: ${error.message}`
    );
    app.quit();
  }
}

// App lifecycle
app.whenReady().then(async () => {
  await startAPIServer();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', async () => {
  if (apiServer) {
    await apiServer.stop();
  }
});

// IPC Handlers
ipcMain.handle('select-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Excel Files', extensions: ['xlsx', 'xls'] }
    ]
  });

  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0];
  }

  return null;
});

ipcMain.handle('show-message', async (event, options) => {
  return await dialog.showMessageBox(mainWindow, options);
});

ipcMain.handle('get-app-path', () => {
  return app.getPath('userData');
});
