class UploadPage {
  constructor(app) {
    this.app = app;
    this.selectedFile = null;
  }

  render() {
    const content = document.getElementById('app-content');
    content.innerHTML = `
      <h2 class="mb-4"><i class="bi bi-cloud-upload"></i> Upload ข้อมูลการซ่อม</h2>

      <div class="row">
        <div class="col-md-8">
          <div class="card">
            <div class="card-header">
              <i class="bi bi-file-earmark-excel"></i> เลือกไฟล์ Excel
            </div>
            <div class="card-body">
              <div class="upload-zone" id="upload-zone">
                <i class="bi bi-cloud-upload"></i>
                <h4>คลิกหรือลากไฟล์มาวางที่นี่</h4>
                <p class="text-muted">รองรับไฟล์ .xlsx และ .xls</p>
                <input type="file" id="file-input" accept=".xlsx,.xls" style="display: none;">
                <button class="btn btn-primary mt-3" id="select-file-btn">
                  <i class="bi bi-folder2-open"></i> เลือกไฟล์
                </button>
              </div>

              <div id="file-info" class="mt-3" style="display: none;">
                <div class="alert alert-info">
                  <i class="bi bi-file-earmark-check"></i>
                  <strong>ไฟล์ที่เลือก:</strong> <span id="file-name"></span>
                  <button class="btn btn-sm btn-danger float-end" id="clear-file-btn">
                    <i class="bi bi-x"></i> ยกเลิก
                  </button>
                </div>
                <button class="btn btn-success w-100" id="upload-btn">
                  <i class="bi bi-upload"></i> Upload และวิเคราะห์ข้อมูล
                </button>
              </div>

              <div id="upload-result" class="mt-3" style="display: none;"></div>
            </div>
          </div>
        </div>

        <div class="col-md-4">
          <div class="card">
            <div class="card-header">
              <i class="bi bi-info-circle"></i> คำแนะนำ
            </div>
            <div class="card-body">
              <h6>รูปแบบไฟล์ Excel</h6>
              <p class="small">ไฟล์ต้องมีคอลัมน์ดังนี้:</p>
              <ul class="small">
                <li><strong>Machine</strong> - รหัสเครื่องจักร</li>
                <li><strong>Machine_side</strong> - หัวย่อย (ถ้ามี)</li>
                <li><strong>Symptoms of failure</strong> - อาการเสีย</li>
                <li><strong>Date_failure</strong> - วันที่เสีย (dd/mm/yy)</li>
                <li><strong>Time_failure</strong> - เวลา (HH:MM)</li>
                <li><strong>repairer</strong> - ชื่อช่างซ่อม</li>
                <li><strong>How to fix</strong> - วิธีแก้ไข</li>
                <li><strong>part_code</strong> - รหัสอะไหล่ (ถ้ามี)</li>
                <li><strong>name_part</strong> - ชื่ออะไหล่ (ถ้ามี)</li>
                <li><strong>court_part</strong> - จำนวนอะไหล่</li>
              </ul>

              <hr>

              <h6>ตัวอย่างข้อมูล</h6>
              <div class="small bg-light p-2 rounded">
                <code>
                  Machine: H03<br>
                  Machine_side: 5<br>
                  Symptoms of failure: ไม่จับด้าย<br>
                  Date_failure: 28/06/12<br>
                  Time_failure: 08:00
                </code>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.setupEventListeners();
  }

  setupEventListeners() {
    const uploadZone = document.getElementById('upload-zone');
    const fileInput = document.getElementById('file-input');
    const selectFileBtn = document.getElementById('select-file-btn');

    // Click to select file
    selectFileBtn.addEventListener('click', () => {
      fileInput.click();
    });

    uploadZone.addEventListener('click', (e) => {
      if (e.target.id !== 'select-file-btn') {
        fileInput.click();
      }
    });

    // File selected
    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        this.handleFileSelect(e.target.files[0]);
      }
    });

    // Drag and drop
    uploadZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadZone.classList.add('dragover');
    });

    uploadZone.addEventListener('dragleave', () => {
      uploadZone.classList.remove('dragover');
    });

    uploadZone.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadZone.classList.remove('dragover');

      if (e.dataTransfer.files.length > 0) {
        this.handleFileSelect(e.dataTransfer.files[0]);
      }
    });
  }

  handleFileSelect(file) {
    // Check file type
    const validTypes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls)$/i)) {
      this.app.showToast('กรุณาเลือกไฟล์ Excel (.xlsx หรือ .xls)', 'danger');
      return;
    }

    this.selectedFile = file;
    document.getElementById('file-name').textContent = file.name;
    document.getElementById('file-info').style.display = 'block';

    // Upload button
    document.getElementById('upload-btn').addEventListener('click', () => {
      this.uploadFile();
    });

    // Clear button
    document.getElementById('clear-file-btn').addEventListener('click', () => {
      this.clearFile();
    });
  }

  clearFile() {
    this.selectedFile = null;
    document.getElementById('file-input').value = '';
    document.getElementById('file-info').style.display = 'none';
    document.getElementById('upload-result').style.display = 'none';
  }

  async uploadFile() {
    if (!this.selectedFile) return;

    this.app.showLoading(true);

    try {
      // Read and parse Excel file with ExcelJS (client-side)
      const arrayBuffer = await this.selectedFile.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);

      // Parse Excel data
      const worksheet = workbook.worksheets[0];
      const records = [];

      // Get headers from first row
      const headers = {};
      const headerRow = worksheet.getRow(1);
      headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
        headers[colNumber] = cell.value;
      });

      // Parse data rows
      worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header

        const record = {};
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          const header = headers[colNumber];
          if (header) {
            record[header] = cell.value;
          }
        });

        records.push(record);
      });

      console.log(`Parsed ${records.length} records from Excel`);

      // Send parsed data to server
      const result = await this.app.apiCall('/upload-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          records: records,
          fileName: this.selectedFile.name
        })
      });

      this.displayResult(result);
      this.app.showLoading(false);

      if (result.status === 'success') {
        this.app.showToast('นำเข้าข้อมูลสำเร็จ!', 'success');
      } else {
        this.app.showToast('พบข้อผิดพลาดในข้อมูล', 'warning');
      }
    } catch (error) {
      this.app.showLoading(false);
      console.error('Upload error:', error);

      let errorMessage = error.message;

      // Better error messages
      if (error.message.includes('Failed to fetch')) {
        errorMessage = 'ไม่สามารถเชื่อมต่อกับ Server ได้ กรุณาตรวจสอบว่า Server รันอยู่';
      } else if (error.message.includes('JSON')) {
        errorMessage = 'Server ตอบกลับในรูปแบบที่ไม่ถูกต้อง';
      }

      this.displayResult({
        status: 'error',
        message: `เกิดข้อผิดพลาด: ${errorMessage}`,
        errors: [{
          row: 0,
          errors: [error.stack || error.message]
        }]
      });
      this.app.showToast('เกิดข้อผิดพลาดในการอัปโหลด', 'danger');
    }
  }

  displayResult(result) {
    const resultDiv = document.getElementById('upload-result');
    resultDiv.style.display = 'block';

    let html = '';

    if (result.status === 'success') {
      html = `
        <div class="alert alert-success">
          <i class="bi bi-check-circle"></i>
          <strong>สำเร็จ!</strong> ${result.message}
          <ul class="mt-2 mb-0">
            <li>นำเข้าสำเร็จ: ${result.imported} รายการ</li>
            <li>ทั้งหมด: ${result.totalRows} รายการ</li>
          </ul>
        </div>
      `;
    } else if (result.status === 'error') {
      html = `
        <div class="alert alert-danger">
          <i class="bi bi-x-circle"></i>
          <strong>ข้อผิดพลาด!</strong> ${result.message}
        </div>
      `;

      if (result.errors && result.errors.length > 0) {
        html += '<div class="mt-3"><h6>รายการข้อผิดพลาด:</h6>';
        result.errors.slice(0, 10).forEach(err => {
          html += `
            <div class="error-item error">
              <strong>แถว ${err.row}:</strong> ${err.errors.join(', ')}
            </div>
          `;
        });
        if (result.errors.length > 10) {
          html += `<div class="text-muted">... และอีก ${result.errors.length - 10} รายการ</div>`;
        }
        html += '</div>';
      }
    } else {
      html = `
        <div class="alert alert-info">
          <i class="bi bi-info-circle"></i>
          ${result.message}
        </div>
      `;
    }

    if (result.warnings && result.warnings.length > 0) {
      html += '<div class="mt-3"><h6>คำเตือน:</h6>';
      result.warnings.slice(0, 5).forEach(warn => {
        html += `
          <div class="error-item">
            <strong>แถว ${warn.row}:</strong> ${warn.message}
          </div>
        `;
      });
      if (result.warnings.length > 5) {
        html += `<div class="text-muted">... และอีก ${result.warnings.length - 5} รายการ</div>`;
      }
      html += '</div>';
    }

    resultDiv.innerHTML = html;
  }
}
