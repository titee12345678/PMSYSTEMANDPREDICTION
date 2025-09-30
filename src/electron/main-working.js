const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const express = require('express');

// Express server will be initialized after app is ready
let expressApp;
let server;
let mainWindow;
let db;

// Database manager
const DatabaseManager = require('../database/schema');
const DataAnalyzer = require('../services/dataAnalyzer');
const MaintenancePredictor = require('../services/predictor');
const ExcelProcessor = require('../services/excelProcessor');

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Load from local express server
  mainWindow.loadURL('http://localhost:3000');

  // Open DevTools
  mainWindow.webContents.openDevTools();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Initialize Express server
function initializeServer() {
  return new Promise((resolve, reject) => {
    try {
      console.log('Initializing database...');

      // Initialize database
      db = new DatabaseManager();
      const dataAnalyzer = new DataAnalyzer(db);
      const predictor = new MaintenancePredictor(db);

      console.log('✓ Database initialized');

      // Setup Express
      expressApp = express();
      expressApp.use(express.json());
      expressApp.use(express.urlencoded({ extended: true }));

      // Serve static files
      expressApp.use(express.static(path.join(__dirname, '../../public')));

      // API Routes
      expressApp.get('/api/health', (req, res) => {
        res.json({ status: 'ok', message: 'Server is running' });
      });

      expressApp.get('/api/machines', (req, res) => {
        try {
          const machines = db.db
            .prepare('SELECT DISTINCT machine FROM maintenance_records ORDER BY machine')
            .all();
          res.json(machines);
        } catch (error) {
          res.status(500).json({ error: error.message });
        }
      });

      expressApp.get('/api/machines/:machine/sides', (req, res) => {
        try {
          const { machine } = req.params;
          const sides = db.db
            .prepare('SELECT DISTINCT machine_side FROM maintenance_records WHERE machine = ? ORDER BY machine_side')
            .all(machine);
          res.json(sides);
        } catch (error) {
          res.status(500).json({ error: error.message });
        }
      });

      expressApp.get('/api/machines/:machine/summary', (req, res) => {
        try {
          const { machine } = req.params;
          const summary = dataAnalyzer.getMachineSummary(machine);
          res.json(summary || { error: 'Machine not found' });
        } catch (error) {
          res.status(500).json({ error: error.message });
        }
      });

      expressApp.get('/api/dashboard', (req, res) => {
        try {
          const machines = db.db
            .prepare('SELECT DISTINCT machine FROM maintenance_records ORDER BY machine')
            .all();

          const dashboard = machines.map(m => {
            const summary = dataAnalyzer.getMachineSummary(m.machine);
            const risk = predictor.calculateRiskScore(m.machine);
            const prediction = predictor.predictNextFailure(m.machine);

            return { machine: m.machine, summary, risk, prediction };
          });

          res.json(dashboard);
        } catch (error) {
          res.status(500).json({ error: error.message });
        }
      });

      expressApp.get('/api/analyze/frequency', (req, res) => {
        try {
          const { machine, startDate, endDate } = req.query;
          const analysis = dataAnalyzer.analyzeFailureFrequency(machine, startDate, endDate);
          res.json(analysis);
        } catch (error) {
          res.status(500).json({ error: error.message });
        }
      });

      expressApp.get('/api/analyze/parts', (req, res) => {
        try {
          const { machine, machineSide } = req.query;
          const analysis = dataAnalyzer.analyzePartUsage(machine, machineSide || null);
          res.json(analysis);
        } catch (error) {
          res.status(500).json({ error: error.message });
        }
      });

      expressApp.get('/api/analyze/patterns', (req, res) => {
        try {
          const { machine } = req.query;
          const patterns = predictor.analyzeFailurePatterns(machine);
          res.json(patterns);
        } catch (error) {
          res.status(500).json({ error: error.message });
        }
      });

      expressApp.get('/api/analyze/inventory', (req, res) => {
        try {
          const { machine, months } = req.query;
          const forecastMonths = months ? parseInt(months) : 3;
          const recommendations = dataAnalyzer.getRecommendedPartInventory(machine, forecastMonths);
          res.json(recommendations);
        } catch (error) {
          res.status(500).json({ error: error.message });
        }
      });

      expressApp.get('/api/predict/next-failure', (req, res) => {
        try {
          const { machine, machineSide } = req.query;
          const prediction = predictor.predictNextFailure(machine, machineSide || null);
          res.json(prediction);
        } catch (error) {
          res.status(500).json({ error: error.message });
        }
      });

      expressApp.get('/api/predict/parts', (req, res) => {
        try {
          const { machine, machineSide, days } = req.query;
          const forecastDays = days ? parseInt(days) : 90;
          const prediction = predictor.predictPartRequirement(machine, machineSide || null, forecastDays);
          res.json(prediction);
        } catch (error) {
          res.status(500).json({ error: error.message });
        }
      });

      expressApp.get('/api/risk/score', (req, res) => {
        try {
          const { machine, machineSide } = req.query;
          const riskScore = predictor.calculateRiskScore(machine, machineSide || null);
          res.json(riskScore);
        } catch (error) {
          res.status(500).json({ error: error.message });
        }
      });

      expressApp.get('/api/records', (req, res) => {
        try {
          const { machine, limit } = req.query;
          let records;

          if (machine) {
            records = db.getRecordsByMachine(machine);
          } else {
            records = db.getAllRecords();
          }

          if (limit) {
            records = records.slice(0, parseInt(limit));
          }

          res.json(records);
        } catch (error) {
          res.status(500).json({ error: error.message });
        }
      });

      expressApp.post('/api/upload', async (req, res) => {
        try {
          const { filePath } = req.body;
          const processor = new ExcelProcessor();
          const result = await processor.processExcel(filePath);

          if (result.errors.length > 0) {
            return res.json({
              status: 'error',
              message: 'พบข้อผิดพลาดในข้อมูล',
              errors: result.errors,
              warnings: result.warnings,
              totalRows: result.totalRows
            });
          }

          const importResult = await dataAnalyzer.importRecords(result.records);

          res.json({
            status: 'success',
            message: 'นำเข้าข้อมูลสำเร็จ',
            imported: importResult.success,
            failed: importResult.failed,
            warnings: result.warnings,
            totalRows: result.totalRows
          });
        } catch (error) {
          res.status(500).json({ status: 'error', message: error.message });
        }
      });

      // Start server
      server = expressApp.listen(3000, () => {
        console.log('✓ Express server running on http://localhost:3000');
        resolve();
      });

    } catch (error) {
      console.error('✗ Failed to initialize server:', error);
      reject(error);
    }
  });
}

// App lifecycle
app.whenReady().then(async () => {
  console.log('App is ready, initializing...');

  try {
    await initializeServer();
    createWindow();

    console.log('✓ Application started successfully');
  } catch (error) {
    console.error('✗ Failed to start application:', error);
    dialog.showErrorBox('Error', `Failed to start: ${error.message}`);
    app.quit();
  }

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

app.on('before-quit', () => {
  if (server) {
    server.close();
  }
  if (db) {
    db.close();
  }
});

// IPC Handlers
app.whenReady().then(() => {
  ipcMain.handle('select-file', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [{ name: 'Excel Files', extensions: ['xlsx', 'xls'] }]
    });

    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0];
    }

    return null;
  });

  ipcMain.handle('get-app-path', () => {
    return app.getPath('userData');
  });
});
