const express = require('express');
const path = require('path');
const DatabaseManager = require('../database/schema');
const ExcelProcessor = require('../services/excelProcessor');
const DataAnalyzer = require('../services/dataAnalyzer');
const MaintenancePredictor = require('../services/predictor');

class APIServer {
  constructor() {
    this.app = express();
    this.db = null;
    this.dataAnalyzer = null;
    this.predictor = null;
    this.server = null;

    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    // Increase payload size limit for Excel file uploads (50MB)
    this.app.use(express.json({ limit: '50mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '50mb' }));

    // CORS
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
      res.header('Access-Control-Allow-Headers', 'Content-Type');
      next();
    });

    // Static files
    this.app.use(express.static(path.join(__dirname, '../../public')));
  }

  // Helper methods for date/time formatting
  formatDate(dateValue) {
    try {
      let date;
      if (dateValue instanceof Date) {
        date = dateValue;
      } else if (typeof dateValue === 'string') {
        const parts = dateValue.split('/');
        const day = parseInt(parts[0]);
        const month = parseInt(parts[1]);
        let year = parseInt(parts[2]);
        if (year < 100) {
          year += year < 50 ? 2000 : 1900;
        }
        date = new Date(year, month - 1, day);
      } else if (typeof dateValue === 'number') {
        date = new Date((dateValue - 25569) * 86400 * 1000);
      } else {
        return new Date().toISOString().split('T')[0];
      }
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (error) {
      return new Date().toISOString().split('T')[0];
    }
  }

  formatTime(timeValue) {
    try {
      let hours, minutes, seconds = 0;
      if (timeValue instanceof Date) {
        hours = timeValue.getHours();
        minutes = timeValue.getMinutes();
        seconds = timeValue.getSeconds();
      } else if (typeof timeValue === 'string') {
        const parts = timeValue.split(':');
        hours = parseInt(parts[0]);
        minutes = parseInt(parts[1]);
        seconds = parts[2] ? parseInt(parts[2]) : 0;
      } else if (typeof timeValue === 'number') {
        const totalSeconds = Math.round(timeValue * 24 * 60 * 60);
        hours = Math.floor(totalSeconds / 3600);
        minutes = Math.floor((totalSeconds % 3600) / 60);
        seconds = totalSeconds % 60;
      } else {
        return '00:00:00';
      }
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    } catch (error) {
      return '00:00:00';
    }
  }

  setupRoutes() {
    // Health check
    this.app.get('/api/health', (req, res) => {
      res.json({ status: 'ok', message: 'Server is running' });
    });

    // Upload และประมวลผล Excel (from file path)
    this.app.post('/api/upload', async (req, res) => {
      try {
        const { filePath } = req.body;

        if (!filePath) {
          return res.status(400).json({ error: 'ต้องระบุ filePath' });
        }

        const processor = new ExcelProcessor();
        const result = await processor.processExcel(filePath);

        // ตรวจสอบ errors
        if (result.errors.length > 0) {
          return res.json({
            status: 'error',
            message: 'พบข้อผิดพลาดในข้อมูล',
            errors: result.errors,
            warnings: result.warnings,
            totalRows: result.totalRows
          });
        }

        // Import ข้อมูลเข้า database
        const importResult = await this.dataAnalyzer.importRecords(result.records);

        res.json({
          status: 'success',
          message: 'นำเข้าข้อมูลสำเร็จ',
          imported: importResult.success,
          failed: importResult.failed,
          warnings: result.warnings,
          totalRows: result.totalRows
        });
      } catch (error) {
        res.status(500).json({
          status: 'error',
          message: error.message
        });
      }
    });

    // Upload data (from parsed Excel data - client-side)
    this.app.post('/api/upload-data', async (req, res) => {
      try {
        const { records, fileName } = req.body;

        if (!records || !Array.isArray(records)) {
          return res.status(400).json({
            status: 'error',
            message: 'ต้องระบุ records เป็น array'
          });
        }

        console.log(`Processing ${records.length} records from ${fileName || 'unknown file'}`);

        // Validate and format records
        const DataAnalyzer = require('../services/dataAnalyzer');
        const TextAnalyzer = require('../utils/textAnalysis');

        const formattedRecords = [];
        const errors = [];
        const warnings = [];

        for (let i = 0; i < records.length; i++) {
          const record = records[i];
          const rowNum = i + 2; // +2 because index starts at 0 and row 1 is header

          // Validate required fields
          const rowErrors = [];

          if (!record.Machine || record.Machine.toString().trim() === '') {
            rowErrors.push('ไม่พบข้อมูล Machine');
          }
          if (!record['Symptoms of failure']) {
            rowErrors.push('ไม่พบข้อมูล Symptoms of failure');
          }
          if (!record.Date_failure) {
            rowErrors.push('ไม่พบข้อมูล Date_failure');
          }
          if (!record.Time_failure) {
            rowErrors.push('ไม่พบข้อมูล Time_failure');
          }
          if (!record.repairer) {
            rowErrors.push('ไม่พบข้อมูล repairer');
          }

          if (rowErrors.length > 0) {
            errors.push({ row: rowNum, errors: rowErrors });
            continue;
          }

          // Format record
          try {
            const formatted = {
              machine: record.Machine.toString().trim(),
              machine_side: record.Machine_side ? record.Machine_side.toString().trim() : null,
              symptom: record['Symptoms of failure'].toString().trim(),
              date_failure: this.formatDate(record.Date_failure),
              time_failure: this.formatTime(record.Time_failure),
              repairer: record.repairer.toString().trim(),
              how_to_fix: record['How to fix'] ? record['How to fix'].toString().trim() : null,
              part_code: record.part_code ? record.part_code.toString().trim() : null,
              name_part: record.name_part ? record.name_part.toString().trim() : null,
              court_part: record.court_part ? parseInt(record.court_part) || 1 : null
            };

            formattedRecords.push(formatted);
          } catch (error) {
            errors.push({ row: rowNum, errors: [`Error formatting: ${error.message}`] });
          }
        }

        if (errors.length > 0) {
          return res.json({
            status: 'error',
            message: `พบข้อผิดพลาด ${errors.length} รายการ`,
            errors: errors.slice(0, 10),
            warnings: warnings,
            totalRows: records.length
          });
        }

        // Import ข้อมูลเข้า database
        const importResult = await this.dataAnalyzer.importRecords(formattedRecords);

        res.json({
          status: 'success',
          message: 'นำเข้าข้อมูลสำเร็จ',
          imported: importResult.success,
          failed: importResult.failed,
          warnings: warnings,
          totalRows: records.length
        });
      } catch (error) {
        console.error('Upload data error:', error);
        res.status(500).json({
          status: 'error',
          message: error.message
        });
      }
    });

    // ดึงข้อมูลเครื่องจักรทั้งหมด
    this.app.get('/api/machines', (req, res) => {
      try {
        const machines = this.db.db
          .prepare(
            `SELECT DISTINCT machine
             FROM maintenance_records
             ORDER BY machine`
          )
          .all();

        res.json(machines);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // ดึงข้อมูล machine sides
    this.app.get('/api/machines/:machine/sides', (req, res) => {
      try {
        const { machine } = req.params;
        const sides = this.db.db
          .prepare(
            `SELECT DISTINCT machine_side
             FROM maintenance_records
             WHERE machine = ?
             ORDER BY machine_side`
          )
          .all(machine);

        res.json(sides);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // สรุปข้อมูลเครื่องจักร
    this.app.get('/api/machines/:machine/summary', (req, res) => {
      try {
        const { machine } = req.params;
        const summary = this.dataAnalyzer.getMachineSummary(machine);

        if (!summary) {
          return res.status(404).json({ error: 'ไม่พบข้อมูลเครื่องจักร' });
        }

        res.json(summary);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // วิเคราะห์ความถี่การเสีย
    this.app.get('/api/analyze/frequency', (req, res) => {
      try {
        const { machine, startDate, endDate } = req.query;

        if (!machine || !startDate || !endDate) {
          return res.status(400).json({
            error: 'ต้องระบุ machine, startDate และ endDate'
          });
        }

        const analysis = this.dataAnalyzer.analyzeFailureFrequency(
          machine,
          startDate,
          endDate
        );

        res.json(analysis);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // วิเคราะห์การใช้อะไหล่
    this.app.get('/api/analyze/parts', (req, res) => {
      try {
        const { machine, machineSide } = req.query;

        if (!machine) {
          return res.status(400).json({ error: 'ต้องระบุ machine' });
        }

        const analysis = this.dataAnalyzer.analyzePartUsage(
          machine,
          machineSide || null
        );

        res.json(analysis);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // แนะนำอะไหล่ที่ควรเตรียม
    this.app.get('/api/analyze/inventory', (req, res) => {
      try {
        const { machine, months } = req.query;

        if (!machine) {
          return res.status(400).json({ error: 'ต้องระบุ machine' });
        }

        const forecastMonths = months ? parseInt(months) : 3;
        const recommendations = this.dataAnalyzer.getRecommendedPartInventory(
          machine,
          forecastMonths
        );

        res.json(recommendations);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // พยากรณ์การเสียครั้งต่อไป
    this.app.get('/api/predict/next-failure', (req, res) => {
      try {
        const { machine, machineSide } = req.query;

        if (!machine) {
          return res.status(400).json({ error: 'ต้องระบุ machine' });
        }

        const prediction = this.predictor.predictNextFailure(
          machine,
          machineSide || null
        );

        res.json(prediction);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // พยากรณ์ความต้องการอะไหล่
    this.app.get('/api/predict/parts', (req, res) => {
      try {
        const { machine, machineSide, days } = req.query;

        if (!machine) {
          return res.status(400).json({ error: 'ต้องระบุ machine' });
        }

        const forecastDays = days ? parseInt(days) : 90;
        const prediction = this.predictor.predictPartRequirement(
          machine,
          machineSide || null,
          forecastDays
        );

        res.json(prediction);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // วิเคราะห์รูปแบบการเสีย
    this.app.get('/api/analyze/patterns', (req, res) => {
      try {
        const { machine } = req.query;

        if (!machine) {
          return res.status(400).json({ error: 'ต้องระบุ machine' });
        }

        const patterns = this.predictor.analyzeFailurePatterns(machine);
        res.json(patterns);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // คำนวณ Risk Score
    this.app.get('/api/risk/score', (req, res) => {
      try {
        const { machine, machineSide } = req.query;

        if (!machine) {
          return res.status(400).json({ error: 'ต้องระบุ machine' });
        }

        const riskScore = this.predictor.calculateRiskScore(
          machine,
          machineSide || null
        );

        res.json(riskScore);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Dashboard - ภาพรวมทั้งหมด
    this.app.get('/api/dashboard', (req, res) => {
      try {
        const machines = this.db.db
          .prepare(
            `SELECT DISTINCT machine
             FROM maintenance_records
             ORDER BY machine`
          )
          .all();

        const dashboard = machines.map(m => {
          const summary = this.dataAnalyzer.getMachineSummary(m.machine);
          const risk = this.predictor.calculateRiskScore(m.machine);
          const prediction = this.predictor.predictNextFailure(m.machine);

          return {
            machine: m.machine,
            summary,
            risk,
            prediction
          };
        });

        res.json(dashboard);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // ประวัติการซ่อมทั้งหมด
    this.app.get('/api/records', (req, res) => {
      try {
        const { machine, limit } = req.query;
        let records;

        if (machine) {
          records = this.db.getRecordsByMachine(machine);
        } else {
          records = this.db.getAllRecords();
        }

        if (limit) {
          records = records.slice(0, parseInt(limit));
        }

        res.json(records);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Serve index.html
    this.app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, '../../public/index.html'));
    });
  }

  start(port = 3000) {
    return new Promise((resolve, reject) => {
      try {
        // Initialize database
        this.db = new DatabaseManager();
        this.dataAnalyzer = new DataAnalyzer(this.db);
        this.predictor = new MaintenancePredictor(this.db);

        // Start server
        this.server = this.app.listen(port, () => {
          console.log(`✓ API Server running on http://localhost:${port}`);
          resolve(port);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  stop() {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          if (this.db) {
            this.db.close();
          }
          console.log('✓ Server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

module.exports = APIServer;
