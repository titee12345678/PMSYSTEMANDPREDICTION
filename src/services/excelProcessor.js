const ExcelJS = require('exceljs');
const TextAnalyzer = require('../utils/textAnalysis');

class ExcelProcessor {
  constructor() {
    this.errors = [];
    this.warnings = [];
  }

  // อ่านไฟล์ Excel
  async readExcelFile(filePath) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    return workbook;
  }

  // แปลง Excel เป็น JSON พร้อมตรวจสอบข้อมูล
  async processExcel(filePath) {
    this.errors = [];
    this.warnings = [];

    try {
      const workbook = await this.readExcelFile(filePath);
      const worksheet = workbook.worksheets[0];

      if (!worksheet) {
        throw new Error('ไม่พบ worksheet ในไฟล์');
      }

      const records = [];
      const headers = [];

      // อ่าน headers
      const headerRow = worksheet.getRow(1);
      headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        headers[colNumber] = cell.value;
      });

      // ตรวจสอบ headers ที่จำเป็น
      const requiredHeaders = [
        'Machine',
        'Symptoms of failure',
        'Date_failure',
        'Time_failure',
        'repairer',
        'How to fix'
      ];

      const missingHeaders = requiredHeaders.filter(
        header => !Object.values(headers).includes(header)
      );

      if (missingHeaders.length > 0) {
        this.errors.push({
          type: 'MISSING_HEADERS',
          message: `ไม่พบคอลัมน์: ${missingHeaders.join(', ')}`
        });
        return { records: [], errors: this.errors, warnings: this.warnings };
      }

      // อ่านข้อมูลแต่ละแถว
      worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (rowNumber === 1) return; // ข้าม header

        const record = {};
        const rowErrors = [];

        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          const header = headers[colNumber];
          if (header) {
            record[header] = cell.value;
          }
        });

        // ตรวจสอบข้อมูลแต่ละ field
        const validation = this.validateRecord(record, rowNumber);
        if (!validation.isValid) {
          rowErrors.push(...validation.errors);
        }

        if (validation.warnings) {
          this.warnings.push(...validation.warnings);
        }

        if (rowErrors.length > 0) {
          this.errors.push({
            row: rowNumber,
            errors: rowErrors,
            data: record
          });
        } else {
          // แปลงข้อมูลให้ถูก format
          records.push(this.formatRecord(record));
        }
      });

      return {
        records,
        errors: this.errors,
        warnings: this.warnings,
        totalRows: worksheet.rowCount - 1
      };
    } catch (error) {
      this.errors.push({
        type: 'FILE_ERROR',
        message: `เกิดข้อผิดพลาดในการอ่านไฟล์: ${error.message}`
      });
      return { records: [], errors: this.errors, warnings: this.warnings };
    }
  }

  // ตรวจสอบความถูกต้องของข้อมูล
  validateRecord(record, rowNumber) {
    const errors = [];
    const warnings = [];

    // ตรวจสอบ Machine
    if (!record.Machine || record.Machine.toString().trim() === '') {
      errors.push('ไม่พบข้อมูล Machine');
    }

    // ตรวจสอบ Symptoms of failure
    if (!record['Symptoms of failure'] || record['Symptoms of failure'].toString().trim() === '') {
      errors.push('ไม่พบข้อมูล Symptoms of failure');
    }

    // ตรวจสอบ Date_failure
    if (!record.Date_failure) {
      errors.push('ไม่พบข้อมูล Date_failure');
    } else {
      const dateValidation = this.validateDate(record.Date_failure);
      if (!dateValidation.isValid) {
        errors.push(`รูปแบบวันที่ไม่ถูกต้อง: ${dateValidation.message}`);
      }
    }

    // ตรวจสอบ Time_failure
    if (!record.Time_failure) {
      errors.push('ไม่พบข้อมูล Time_failure');
    } else {
      const timeValidation = this.validateTime(record.Time_failure);
      if (!timeValidation.isValid) {
        errors.push(`รูปแบบเวลาไม่ถูกต้อง: ${timeValidation.message}`);
      }
    }

    // ตรวจสอบ repairer
    if (!record.repairer || record.repairer.toString().trim() === '') {
      errors.push('ไม่พบข้อมูล repairer');
    }

    // ตรวจสอบ How to fix
    if (!record['How to fix'] || record['How to fix'].toString().trim() === '') {
      warnings.push({
        row: rowNumber,
        message: 'ไม่พบข้อมูล How to fix'
      });
    }

    // ตรวจสอบอะไหล่
    if (record.part_code && !record.name_part) {
      warnings.push({
        row: rowNumber,
        message: 'มี part_code แต่ไม่มี name_part'
      });
    }

    if (record.name_part && !record.part_code) {
      warnings.push({
        row: rowNumber,
        message: 'มี name_part แต่ไม่มี part_code'
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  // ตรวจสอบรูปแบบวันที่
  validateDate(dateValue) {
    try {
      // Excel date เป็น serial number
      if (dateValue instanceof Date) {
        return { isValid: true };
      }

      // ตรวจสอบรูปแบบ dd/mm/yy
      if (typeof dateValue === 'string') {
        const parts = dateValue.split('/');
        if (parts.length === 3) {
          const day = parseInt(parts[0]);
          const month = parseInt(parts[1]);
          let year = parseInt(parts[2]);

          // แปลง year 2 หลักเป็น 4 หลัก
          if (year < 100) {
            year += year < 50 ? 2000 : 1900;
          }

          if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1900) {
            return { isValid: true };
          }
        }
      }

      // Excel serial number
      if (typeof dateValue === 'number' && dateValue > 0) {
        return { isValid: true };
      }

      return {
        isValid: false,
        message: 'รูปแบบวันที่ต้องเป็น dd/mm/yy หรือ Date object'
      };
    } catch (error) {
      return { isValid: false, message: error.message };
    }
  }

  // ตรวจสอบรูปแบบเวลา
  validateTime(timeValue) {
    try {
      if (timeValue instanceof Date) {
        return { isValid: true };
      }

      // ตรวจสอบรูปแบบ HH:MM
      if (typeof timeValue === 'string') {
        const parts = timeValue.split(':');
        if (parts.length >= 2) {
          const hours = parseInt(parts[0]);
          const minutes = parseInt(parts[1]);

          if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
            return { isValid: true };
          }
        }
      }

      // Excel time เป็นเศษส่วนของวัน
      if (typeof timeValue === 'number' && timeValue >= 0 && timeValue < 1) {
        return { isValid: true };
      }

      return {
        isValid: false,
        message: 'รูปแบบเวลาต้องเป็น HH:MM'
      };
    } catch (error) {
      return { isValid: false, message: error.message };
    }
  }

  // แปลงข้อมูลให้อยู่ในรูปแบบที่เหมาะสม
  formatRecord(record) {
    return {
      machine: this.cleanText(record.Machine),
      machine_side: this.cleanText(record.Machine_side),
      symptom: this.cleanText(record['Symptoms of failure']),
      date_failure: this.formatDate(record.Date_failure),
      time_failure: this.formatTime(record.Time_failure),
      repairer: this.cleanText(record.repairer),
      how_to_fix: this.cleanText(record['How to fix']),
      part_code: this.cleanText(record.part_code),
      name_part: this.cleanText(record.name_part),
      court_part: record.court_part ? parseInt(record.court_part) || 1 : null
    };
  }

  // ทำความสะอาดข้อความ
  cleanText(text) {
    if (!text) return null;
    return text.toString().trim();
  }

  // แปลงวันที่เป็น YYYY-MM-DD
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
        // Excel serial date
        date = new Date((dateValue - 25569) * 86400 * 1000);
      }

      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');

      return `${year}-${month}-${day}`;
    } catch (error) {
      return null;
    }
  }

  // แปลงเวลาเป็น HH:MM:SS
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
        // Excel time (เศษส่วนของวัน)
        const totalSeconds = Math.round(timeValue * 24 * 60 * 60);
        hours = Math.floor(totalSeconds / 3600);
        minutes = Math.floor((totalSeconds % 3600) / 60);
        seconds = totalSeconds % 60;
      }

      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    } catch (error) {
      return null;
    }
  }
}

module.exports = ExcelProcessor;
