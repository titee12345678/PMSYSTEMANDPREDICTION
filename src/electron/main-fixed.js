// Main process for Electron
const path = require('path');

// Import Electron safely
let app, BrowserWindow, ipcMain, dialog;

try {
  const electron = require('electron');

  // Electron exports differently in main vs renderer
  if (electron.app) {
    ({ app, BrowserWindow, ipcMain, dialog } = electron);
  } else {
    console.error('Electron API not available in this context');
    process.exit(1);
  }
} catch (error) {
  console.error('Failed to load Electron:', error);
  process.exit(1);
}

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

  // Open DevTools
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
    if (dialog) {
      dialog.showErrorBox(
        'เกิดข้อผิดพลาด',
        `ไม่สามารถเริ่มต้น API Server ได้\n\nรายละเอียด: ${error.message}`
      );
    }
    if (app) {
      app.quit();
    }
  }
}

// App lifecycle
if (app) {
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
}

// IPC Handlers
if (ipcMain) {
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
}
