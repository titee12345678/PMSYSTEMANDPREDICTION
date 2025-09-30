const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

class DatabaseManager {
  constructor() {
    const dataDir = path.join(__dirname, '../../data');

    // สร้าง data directory ถ้ายังไม่มี
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const dbPath = path.join(dataDir, 'maintenance.db');
    this.db = new Database(dbPath);
    this.db.pragma('encoding = "UTF-8"');
    this.initDatabase();
  }

  initDatabase() {
    // ตารางเครื่องจักร
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS machines (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        machine_name TEXT NOT NULL UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ตารางบันทึกการซ่อม
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS maintenance_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        machine TEXT NOT NULL,
        machine_side TEXT,
        symptom TEXT NOT NULL,
        symptom_normalized TEXT,
        date_failure DATE NOT NULL,
        time_failure TIME NOT NULL,
        repairer TEXT NOT NULL,
        how_to_fix TEXT,
        fix_method_normalized TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ตารางอะไหล่
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS parts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        part_code TEXT UNIQUE,
        name_part TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ตารางการใช้อะไหล่
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS part_usage (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        maintenance_id INTEGER NOT NULL,
        part_code TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        replacement_date DATE NOT NULL,
        FOREIGN KEY (maintenance_id) REFERENCES maintenance_records(id),
        FOREIGN KEY (part_code) REFERENCES parts(part_code)
      )
    `);

    // ตารางอาการเสียที่ normalize แล้ว
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS symptom_patterns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pattern TEXT UNIQUE NOT NULL,
        variants TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ตารางวิธีแก้ไขที่ normalize แล้ว
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS fix_patterns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pattern TEXT UNIQUE NOT NULL,
        variants TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // สร้าง indexes เพื่อเพิ่มประสิทธิภาพ
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_machine ON maintenance_records(machine);
      CREATE INDEX IF NOT EXISTS idx_machine_side ON maintenance_records(machine_side);
      CREATE INDEX IF NOT EXISTS idx_date_failure ON maintenance_records(date_failure);
      CREATE INDEX IF NOT EXISTS idx_symptom_normalized ON maintenance_records(symptom_normalized);
      CREATE INDEX IF NOT EXISTS idx_part_code ON part_usage(part_code);
      CREATE INDEX IF NOT EXISTS idx_replacement_date ON part_usage(replacement_date);
    `);
  }

  // Insert maintenance record
  insertMaintenanceRecord(record) {
    const stmt = this.db.prepare(`
      INSERT INTO maintenance_records
      (machine, machine_side, symptom, symptom_normalized, date_failure, time_failure, repairer, how_to_fix, fix_method_normalized)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
      record.machine,
      record.machine_side,
      record.symptom,
      record.symptom_normalized,
      record.date_failure,
      record.time_failure,
      record.repairer,
      record.how_to_fix,
      record.fix_method_normalized
    );
    return result.lastInsertRowid;
  }

  // Insert part
  insertPart(partCode, namePart) {
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO parts (part_code, name_part)
      VALUES (?, ?)
    `);
    stmt.run(partCode, namePart);
  }

  // Insert part usage
  insertPartUsage(maintenanceId, partCode, quantity, replacementDate) {
    const stmt = this.db.prepare(`
      INSERT INTO part_usage (maintenance_id, part_code, quantity, replacement_date)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(maintenanceId, partCode, quantity, replacementDate);
  }

  // Get all maintenance records
  getAllRecords() {
    const stmt = this.db.prepare(`
      SELECT * FROM maintenance_records
      ORDER BY date_failure DESC, time_failure DESC
    `);
    return stmt.all();
  }

  // Get records by machine
  getRecordsByMachine(machine) {
    const stmt = this.db.prepare(`
      SELECT * FROM maintenance_records
      WHERE machine = ?
      ORDER BY date_failure DESC, time_failure DESC
    `);
    return stmt.all(machine);
  }

  // Get records by machine and side
  getRecordsByMachineAndSide(machine, side) {
    const stmt = this.db.prepare(`
      SELECT * FROM maintenance_records
      WHERE machine = ? AND machine_side = ?
      ORDER BY date_failure DESC, time_failure DESC
    `);
    return stmt.all(machine, side);
  }

  // Get failure frequency by machine
  getFailureFrequency(machine, startDate, endDate) {
    const stmt = this.db.prepare(`
      SELECT
        machine,
        machine_side,
        COUNT(*) as failure_count,
        GROUP_CONCAT(DISTINCT symptom_normalized) as symptoms
      FROM maintenance_records
      WHERE machine = ? AND date_failure BETWEEN ? AND ?
      GROUP BY machine, machine_side
      ORDER BY failure_count DESC
    `);
    return stmt.all(machine, startDate, endDate);
  }

  // Get part usage history
  getPartUsageHistory(partCode) {
    const stmt = this.db.prepare(`
      SELECT
        pu.replacement_date,
        mr.machine,
        mr.machine_side,
        pu.quantity,
        mr.symptom,
        mr.how_to_fix
      FROM part_usage pu
      JOIN maintenance_records mr ON pu.maintenance_id = mr.id
      WHERE pu.part_code = ?
      ORDER BY pu.replacement_date DESC
    `);
    return stmt.all(partCode);
  }

  // Get part lifespan statistics
  getPartLifespanStats(machine, machineSide, partCode) {
    const stmt = this.db.prepare(`
      SELECT
        pu.part_code,
        p.name_part,
        pu.replacement_date,
        LAG(pu.replacement_date) OVER (ORDER BY pu.replacement_date) as prev_replacement_date,
        julianday(pu.replacement_date) - julianday(LAG(pu.replacement_date) OVER (ORDER BY pu.replacement_date)) as days_between
      FROM part_usage pu
      JOIN maintenance_records mr ON pu.maintenance_id = mr.id
      JOIN parts p ON pu.part_code = p.part_code
      WHERE mr.machine = ?
        AND (mr.machine_side = ? OR ? IS NULL)
        AND (pu.part_code = ? OR ? IS NULL)
      ORDER BY pu.replacement_date
    `);
    return stmt.all(machine, machineSide, machineSide, partCode, partCode);
  }

  // Clear all data (for testing)
  clearAllData() {
    this.db.exec(`
      DELETE FROM part_usage;
      DELETE FROM maintenance_records;
      DELETE FROM parts;
      DELETE FROM machines;
      DELETE FROM symptom_patterns;
      DELETE FROM fix_patterns;
    `);
  }

  close() {
    this.db.close();
  }
}

module.exports = DatabaseManager;
