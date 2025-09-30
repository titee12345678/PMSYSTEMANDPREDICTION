class RecordsPage {
  constructor(app) {
    this.app = app;
    this.currentPage = 1;
    this.pageSize = 20;
    this.allRecords = [];
    this.filteredRecords = [];
  }

  async render() {
    const content = document.getElementById('app-content');
    content.innerHTML = `
      <h2 class="mb-4"><i class="bi bi-table"></i> ประวัติการซ่อม</h2>

      <div class="filter-section">
        <div class="row">
          <div class="col-md-4">
            <label class="form-label">เครื่องจักร</label>
            <select class="form-select" id="records-machine-select">
              <option value="">-- ทั้งหมด --</option>
            </select>
          </div>
          <div class="col-md-4">
            <label class="form-label">ค้นหา</label>
            <input type="text" class="form-control" id="search-input" placeholder="ค้นหาอาการเสีย, วิธีแก้ไข, ช่าง...">
          </div>
          <div class="col-md-4">
            <label class="form-label">&nbsp;</label>
            <button class="btn btn-primary w-100" id="load-records-btn">
              <i class="bi bi-arrow-clockwise"></i> โหลดข้อมูล
            </button>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header d-flex justify-content-between align-items-center">
          <span><i class="bi bi-list"></i> รายการทั้งหมด</span>
          <span class="badge bg-primary" id="total-records">0 รายการ</span>
        </div>
        <div class="card-body">
          <div id="records-loading" class="text-center py-5" style="display: none;">
            <div class="spinner-border text-primary" role="status">
              <span class="visually-hidden">กำลังโหลด...</span>
            </div>
          </div>

          <div id="records-table-container"></div>

          <div id="pagination-container" class="mt-3 d-flex justify-content-between align-items-center">
            <div id="page-info"></div>
            <nav>
              <ul class="pagination mb-0" id="pagination"></ul>
            </nav>
          </div>
        </div>
      </div>
    `;

    await this.loadMachines();
    this.setupEventListeners();
    this.loadRecords();
  }

  async loadMachines() {
    try {
      const machines = await this.app.getMachines();
      const select = document.getElementById('records-machine-select');

      machines.forEach(m => {
        const option = document.createElement('option');
        option.value = m.machine;
        option.textContent = m.machine;
        select.appendChild(option);
      });
    } catch (error) {
      console.error('Error loading machines:', error);
    }
  }

  setupEventListeners() {
    const loadBtn = document.getElementById('load-records-btn');
    const searchInput = document.getElementById('search-input');
    const machineSelect = document.getElementById('records-machine-select');

    loadBtn.addEventListener('click', () => {
      this.loadRecords();
    });

    searchInput.addEventListener('input', (e) => {
      this.filterRecords(e.target.value);
    });

    machineSelect.addEventListener('change', () => {
      this.loadRecords();
    });
  }

  async loadRecords() {
    const loading = document.getElementById('records-loading');
    loading.style.display = 'block';

    try {
      const machine = document.getElementById('records-machine-select').value;
      const url = machine ? `/records?machine=${machine}` : '/records';

      this.allRecords = await this.app.apiCall(url);
      this.filteredRecords = [...this.allRecords];

      this.currentPage = 1;
      this.renderTable();
      this.updatePagination();

      loading.style.display = 'none';
      document.getElementById('total-records').textContent = `${this.allRecords.length} รายการ`;
    } catch (error) {
      loading.style.display = 'none';
      this.app.showToast('ไม่สามารถโหลดข้อมูลได้', 'danger');
    }
  }

  filterRecords(searchTerm) {
    if (!searchTerm) {
      this.filteredRecords = [...this.allRecords];
    } else {
      const term = searchTerm.toLowerCase();
      this.filteredRecords = this.allRecords.filter(record => {
        return (
          (record.symptom && record.symptom.toLowerCase().includes(term)) ||
          (record.how_to_fix && record.how_to_fix.toLowerCase().includes(term)) ||
          (record.repairer && record.repairer.toLowerCase().includes(term)) ||
          (record.machine && record.machine.toLowerCase().includes(term))
        );
      });
    }

    this.currentPage = 1;
    this.renderTable();
    this.updatePagination();
    document.getElementById('total-records').textContent = `${this.filteredRecords.length} รายการ`;
  }

  renderTable() {
    const container = document.getElementById('records-table-container');

    if (this.filteredRecords.length === 0) {
      container.innerHTML = '<p class="text-center text-muted py-4">ไม่พบข้อมูล</p>';
      return;
    }

    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = Math.min(startIndex + this.pageSize, this.filteredRecords.length);
    const pageRecords = this.filteredRecords.slice(startIndex, endIndex);

    container.innerHTML = `
      <div class="table-responsive">
        <table class="table table-hover">
          <thead>
            <tr>
              <th>#</th>
              <th>เครื่อง</th>
              <th>หัว</th>
              <th>อาการเสีย</th>
              <th>วันที่/เวลา</th>
              <th>ช่างซ่อม</th>
              <th>วิธีแก้ไข</th>
              <th>อะไหล่</th>
            </tr>
          </thead>
          <tbody>
            ${pageRecords.map((record, index) => `
              <tr>
                <td>${startIndex + index + 1}</td>
                <td><strong>${record.machine}</strong></td>
                <td>${record.machine_side || '-'}</td>
                <td>
                  <div class="text-truncate" style="max-width: 200px;" title="${record.symptom}">
                    ${record.symptom}
                  </div>
                  ${record.symptom_normalized && record.symptom_normalized !== record.symptom ? `
                    <small class="text-muted">(${record.symptom_normalized})</small>
                  ` : ''}
                </td>
                <td>
                  <div>${this.app.formatDate(record.date_failure)}</div>
                  <small class="text-muted">${record.time_failure}</small>
                </td>
                <td>${record.repairer}</td>
                <td>
                  <div class="text-truncate" style="max-width: 250px;" title="${record.how_to_fix || '-'}">
                    ${record.how_to_fix || '-'}
                  </div>
                </td>
                <td>
                  ${this.getPartsInfo(record.id)}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  getPartsInfo(maintenanceId) {
    // In a real implementation, this would fetch from the database
    // For now, return a placeholder
    return '<small class="text-muted">-</small>';
  }

  updatePagination() {
    const totalPages = Math.ceil(this.filteredRecords.length / this.pageSize);
    const pageInfo = document.getElementById('page-info');
    const pagination = document.getElementById('pagination');

    // Update page info
    const startIndex = (this.currentPage - 1) * this.pageSize + 1;
    const endIndex = Math.min(this.currentPage * this.pageSize, this.filteredRecords.length);
    pageInfo.textContent = `แสดง ${startIndex}-${endIndex} จาก ${this.filteredRecords.length} รายการ`;

    // Update pagination
    if (totalPages <= 1) {
      pagination.innerHTML = '';
      return;
    }

    let paginationHTML = '';

    // Previous button
    paginationHTML += `
      <li class="page-item ${this.currentPage === 1 ? 'disabled' : ''}">
        <a class="page-link" href="#" data-page="${this.currentPage - 1}">
          <i class="bi bi-chevron-left"></i>
        </a>
      </li>
    `;

    // Page numbers
    const maxPagesToShow = 5;
    let startPage = Math.max(1, this.currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage < maxPagesToShow - 1) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    if (startPage > 1) {
      paginationHTML += `
        <li class="page-item">
          <a class="page-link" href="#" data-page="1">1</a>
        </li>
      `;
      if (startPage > 2) {
        paginationHTML += '<li class="page-item disabled"><span class="page-link">...</span></li>';
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      paginationHTML += `
        <li class="page-item ${i === this.currentPage ? 'active' : ''}">
          <a class="page-link" href="#" data-page="${i}">${i}</a>
        </li>
      `;
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        paginationHTML += '<li class="page-item disabled"><span class="page-link">...</span></li>';
      }
      paginationHTML += `
        <li class="page-item">
          <a class="page-link" href="#" data-page="${totalPages}">${totalPages}</a>
        </li>
      `;
    }

    // Next button
    paginationHTML += `
      <li class="page-item ${this.currentPage === totalPages ? 'disabled' : ''}">
        <a class="page-link" href="#" data-page="${this.currentPage + 1}">
          <i class="bi bi-chevron-right"></i>
        </a>
      </li>
    `;

    pagination.innerHTML = paginationHTML;

    // Add event listeners
    pagination.querySelectorAll('a.page-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const page = parseInt(e.currentTarget.dataset.page);
        if (page && page !== this.currentPage && page >= 1 && page <= totalPages) {
          this.currentPage = page;
          this.renderTable();
          this.updatePagination();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      });
    });
  }
}
