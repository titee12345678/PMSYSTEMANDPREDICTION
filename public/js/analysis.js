class AnalysisPage {
  constructor(app) {
    this.app = app;
    this.selectedMachine = null;
    this.selectedSide = null;
  }

  async render() {
    const content = document.getElementById('app-content');
    content.innerHTML = `
      <h2 class="mb-4"><i class="bi bi-graph-up"></i> วิเคราะห์ข้อมูล</h2>

      <div class="filter-section">
        <div class="row">
          <div class="col-md-4">
            <label class="form-label">เลือกเครื่องจักร</label>
            <select class="form-select" id="machine-select">
              <option value="">-- เลือกเครื่องจักร --</option>
            </select>
          </div>
          <div class="col-md-4">
            <label class="form-label">เลือกหัวย่อย (ถ้ามี)</label>
            <select class="form-select" id="side-select" disabled>
              <option value="">-- ทั้งหมด --</option>
            </select>
          </div>
          <div class="col-md-4">
            <label class="form-label">&nbsp;</label>
            <button class="btn btn-primary w-100" id="analyze-btn" disabled>
              <i class="bi bi-bar-chart"></i> วิเคราะห์
            </button>
          </div>
        </div>
      </div>

      <div id="analysis-result" style="display: none;">
        <!-- Machine Summary -->
        <div class="card mb-4">
          <div class="card-header">
            <i class="bi bi-info-circle"></i> ข้อมูลเครื่องจักร
          </div>
          <div class="card-body" id="machine-summary"></div>
        </div>

        <!-- Failure Frequency -->
        <div class="card mb-4">
          <div class="card-header">
            <i class="bi bi-graph-up"></i> ความถี่การเสีย
          </div>
          <div class="card-body">
            <div class="chart-container">
              <canvas id="frequency-chart"></canvas>
            </div>
            <div id="frequency-table" class="mt-3"></div>
          </div>
        </div>

        <!-- Part Usage Analysis -->
        <div class="card mb-4">
          <div class="card-header">
            <i class="bi bi-gear"></i> การใช้อะไหล่
          </div>
          <div class="card-body">
            <div id="parts-analysis"></div>
          </div>
        </div>

        <!-- Failure Patterns -->
        <div class="card mb-4">
          <div class="card-header">
            <i class="bi bi-pattern"></i> รูปแบบการเสีย
          </div>
          <div class="card-body">
            <div class="row">
              <div class="col-md-6">
                <h6>ช่วงเวลาที่เสียบ่อย</h6>
                <div class="chart-container">
                  <canvas id="time-pattern-chart"></canvas>
                </div>
              </div>
              <div class="col-md-6">
                <h6>วันที่เสียบ่อย</h6>
                <div class="chart-container">
                  <canvas id="day-pattern-chart"></canvas>
                </div>
              </div>
            </div>
            <div class="mt-4" id="symptom-patterns"></div>
          </div>
        </div>

        <!-- Recommended Inventory -->
        <div class="card">
          <div class="card-header">
            <i class="bi bi-box-seam"></i> แนะนำอะไหล่ที่ควรเตรียม (3 เดือนข้างหน้า)
          </div>
          <div class="card-body" id="inventory-recommendation"></div>
        </div>
      </div>
    `;

    await this.loadMachines();
    this.setupEventListeners();
  }

  async loadMachines() {
    try {
      const machines = await this.app.getMachines();
      const select = document.getElementById('machine-select');

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
    const machineSelect = document.getElementById('machine-select');
    const sideSelect = document.getElementById('side-select');
    const analyzeBtn = document.getElementById('analyze-btn');

    machineSelect.addEventListener('change', async (e) => {
      this.selectedMachine = e.target.value;

      if (this.selectedMachine) {
        analyzeBtn.disabled = false;
        sideSelect.disabled = false;

        // Load sides
        const sides = await this.app.getMachineSides(this.selectedMachine);
        sideSelect.innerHTML = '<option value="">-- ทั้งหมด --</option>';

        sides.forEach(s => {
          if (s.machine_side) {
            const option = document.createElement('option');
            option.value = s.machine_side;
            option.textContent = s.machine_side;
            sideSelect.appendChild(option);
          }
        });
      } else {
        analyzeBtn.disabled = true;
        sideSelect.disabled = true;
      }
    });

    sideSelect.addEventListener('change', (e) => {
      this.selectedSide = e.target.value || null;
    });

    analyzeBtn.addEventListener('click', () => {
      this.performAnalysis();
    });
  }

  async performAnalysis() {
    if (!this.selectedMachine) return;

    this.app.showLoading(true);

    try {
      // Get machine summary
      const summary = await this.app.apiCall(`/machines/${this.selectedMachine}/summary`);

      // Get frequency analysis
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 6);
      const startDateStr = startDate.toISOString().split('T')[0];

      const frequency = await this.app.apiCall(
        `/analyze/frequency?machine=${this.selectedMachine}&startDate=${startDateStr}&endDate=${endDate}`
      );

      // Get part usage
      const parts = await this.app.apiCall(
        `/analyze/parts?machine=${this.selectedMachine}${this.selectedSide ? `&machineSide=${this.selectedSide}` : ''}`
      );

      // Get patterns
      const patterns = await this.app.apiCall(`/analyze/patterns?machine=${this.selectedMachine}`);

      // Get inventory recommendation
      const inventory = await this.app.apiCall(`/analyze/inventory?machine=${this.selectedMachine}&months=3`);

      // Render all
      this.renderMachineSummary(summary);
      this.renderFrequencyAnalysis(frequency);
      this.renderPartsAnalysis(parts);
      this.renderPatterns(patterns);
      this.renderInventoryRecommendation(inventory);

      document.getElementById('analysis-result').style.display = 'block';
      this.app.showLoading(false);
    } catch (error) {
      this.app.showLoading(false);
    }
  }

  renderMachineSummary(summary) {
    const container = document.getElementById('machine-summary');
    container.innerHTML = `
      <div class="row">
        <div class="col-md-3">
          <h6>เครื่องจักร</h6>
          <p class="fs-4 fw-bold text-primary">${summary.machine}</p>
        </div>
        <div class="col-md-3">
          <h6>การเสียทั้งหมด</h6>
          <p class="fs-4 fw-bold">${summary.total_failures} ครั้ง</p>
        </div>
        <div class="col-md-3">
          <h6>ความถี่เฉลี่ย</h6>
          <p class="fs-4 fw-bold text-warning">${summary.failures_per_month} ครั้ง/เดือน</p>
        </div>
        <div class="col-md-3">
          <h6>ช่วงข้อมูล</h6>
          <p class="small">${this.app.formatDate(summary.first_record)} ถึง ${this.app.formatDate(summary.last_record)}</p>
          <p class="small text-muted">(${summary.period_days} วัน)</p>
        </div>
      </div>

      <hr>

      <h6>อาการเสียที่พบบ่อย</h6>
      <ul>
        ${summary.top_symptoms.map(s => `
          <li>${s.symptom} <span class="badge bg-secondary">${s.count} ครั้ง</span></li>
        `).join('')}
      </ul>
    `;
  }

  renderFrequencyAnalysis(frequency) {
    // Render table
    const tableContainer = document.getElementById('frequency-table');
    tableContainer.innerHTML = `
      <div class="table-responsive">
        <table class="table table-striped">
          <thead>
            <tr>
              <th>หัวย่อย</th>
              <th>จำนวนการเสีย</th>
              <th>ครั้ง/เดือน</th>
            </tr>
          </thead>
          <tbody>
            ${frequency.map(f => `
              <tr>
                <td>${f.machine_side || 'N/A'}</td>
                <td>${f.failure_count}</td>
                <td><strong>${f.failures_per_month}</strong></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    // Render chart
    const ctx = document.getElementById('frequency-chart');
    if (ctx) {
      new Chart(ctx, {
        type: 'bar',
        data: {
          labels: frequency.map(f => f.machine_side || 'N/A'),
          datasets: [{
            label: 'จำนวนการเสีย',
            data: frequency.map(f => f.failure_count),
            backgroundColor: 'rgba(13, 110, 253, 0.5)',
            borderColor: 'rgba(13, 110, 253, 1)',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true
            }
          }
        }
      });
    }
  }

  renderPartsAnalysis(parts) {
    const container = document.getElementById('parts-analysis');

    if (parts.length === 0) {
      container.innerHTML = '<p class="text-muted">ไม่มีข้อมูลการใช้อะไหล่</p>';
      return;
    }

    container.innerHTML = `
      <div class="table-responsive">
        <table class="table table-hover">
          <thead>
            <tr>
              <th>รหัสอะไหล่</th>
              <th>ชื่ออะไหล่</th>
              <th>จำนวนครั้ง</th>
              <th>อายุเฉลี่ย (วัน)</th>
              <th>อายุต่ำสุด</th>
              <th>อายุสูงสุด</th>
              <th>เปลี่ยนล่าสุด</th>
              <th>ความเร่งด่วน</th>
            </tr>
          </thead>
          <tbody>
            ${parts.map(p => `
              <tr>
                <td><code>${p.part_code}</code></td>
                <td>${p.name_part}</td>
                <td><span class="badge bg-primary">${p.replacement_count}</span></td>
                <td><strong>${p.avg_lifespan_days}</strong></td>
                <td>${p.min_lifespan_days}</td>
                <td>${p.max_lifespan_days}</td>
                <td>${this.app.formatDate(p.last_replacement)}<br>
                    <small class="text-muted">(${p.days_since_last_replacement} วันที่แล้ว)</small></td>
                <td>
                  <div class="urgency-bar">
                    <div class="urgency-indicator" style="left: ${p.replacement_urgency}%"></div>
                  </div>
                  <small>${Math.round(p.replacement_urgency)}%</small>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  renderPatterns(patterns) {
    // Time patterns
    const timeCtx = document.getElementById('time-pattern-chart');
    if (timeCtx && patterns.time_patterns) {
      new Chart(timeCtx, {
        type: 'doughnut',
        data: {
          labels: ['เช้า (06-12)', 'บ่าย (12-18)', 'เย็น (18-22)', 'กลางคืน (22-06)'],
          datasets: [{
            data: [
              patterns.time_patterns.data.morning,
              patterns.time_patterns.data.afternoon,
              patterns.time_patterns.data.evening,
              patterns.time_patterns.data.night
            ],
            backgroundColor: [
              'rgba(255, 206, 86, 0.5)',
              'rgba(255, 159, 64, 0.5)',
              'rgba(153, 102, 255, 0.5)',
              'rgba(54, 162, 235, 0.5)'
            ]
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false
        }
      });
    }

    // Day patterns
    const dayCtx = document.getElementById('day-pattern-chart');
    if (dayCtx && patterns.day_patterns) {
      new Chart(dayCtx, {
        type: 'bar',
        data: {
          labels: ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา'],
          datasets: [{
            label: 'จำนวนการเสีย',
            data: [
              patterns.day_patterns.data.Mon,
              patterns.day_patterns.data.Tue,
              patterns.day_patterns.data.Wed,
              patterns.day_patterns.data.Thu,
              patterns.day_patterns.data.Fri,
              patterns.day_patterns.data.Sat,
              patterns.day_patterns.data.Sun
            ],
            backgroundColor: 'rgba(75, 192, 192, 0.5)',
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true
            }
          }
        }
      });
    }

    // Symptom patterns
    const symptomContainer = document.getElementById('symptom-patterns');
    if (patterns.symptom_patterns) {
      symptomContainer.innerHTML = `
        <h6>อาการเสียที่พบบ่อยสุด</h6>
        <div class="row">
          ${patterns.symptom_patterns.top_symptoms.map((s, i) => `
            <div class="col-md-4 mb-2">
              <div class="card">
                <div class="card-body">
                  <div class="d-flex justify-content-between align-items-center">
                    <div>
                      <div class="small text-muted">#${i + 1}</div>
                      <div>${s.symptom}</div>
                    </div>
                    <div class="text-end">
                      <div class="fs-4 fw-bold text-primary">${s.count}</div>
                      <div class="small text-muted">${s.percentage}%</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }
  }

  renderInventoryRecommendation(inventory) {
    const container = document.getElementById('inventory-recommendation');

    if (inventory.length === 0) {
      container.innerHTML = '<p class="text-muted">ไม่มีข้อมูลการใช้อะไหล่</p>';
      return;
    }

    container.innerHTML = `
      <div class="table-responsive">
        <table class="table table-striped">
          <thead>
            <tr>
              <th>รหัสอะไหล่</th>
              <th>ชื่ออะไหล่</th>
              <th>การใช้ในอดีต</th>
              <th>อัตราต่อเดือน</th>
              <th class="text-center">แนะนำให้เตรียม</th>
            </tr>
          </thead>
          <tbody>
            ${inventory.map(item => `
              <tr>
                <td><code>${item.part_code}</code></td>
                <td>${item.name_part}</td>
                <td>${item.historical_usage}</td>
                <td>${item.usage_per_month}</td>
                <td class="text-center">
                  <span class="badge bg-success fs-6">${item.recommended_quantity} ชิ้น</span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }
}
