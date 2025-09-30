class Dashboard {
  constructor(app) {
    this.app = app;
  }

  async render() {
    const content = document.getElementById('app-content');
    content.innerHTML = `
      <h2 class="mb-4"><i class="bi bi-speedometer2"></i> Dashboard - ภาพรวมระบบ</h2>

      <div id="dashboard-loading" class="text-center py-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">กำลังโหลด...</span>
        </div>
        <p class="mt-3">กำลังโหลดข้อมูล...</p>
      </div>

      <div id="dashboard-content" style="display: none;">
        <!-- Overall Stats -->
        <div class="row mb-4">
          <div class="col-md-3">
            <div class="card stat-card">
              <div class="card-body">
                <i class="bi bi-gear text-primary"></i>
                <div class="stat-value" id="total-machines">0</div>
                <div class="stat-label">เครื่องจักรทั้งหมด</div>
              </div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="card stat-card">
              <div class="card-body">
                <i class="bi bi-exclamation-triangle text-danger"></i>
                <div class="stat-value text-danger" id="high-risk-count">0</div>
                <div class="stat-label">ความเสี่ยงสูง</div>
              </div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="card stat-card">
              <div class="card-body">
                <i class="bi bi-exclamation-circle text-warning"></i>
                <div class="stat-value text-warning" id="medium-risk-count">0</div>
                <div class="stat-label">ความเสี่ยงปานกลาง</div>
              </div>
            </div>
          </div>
          <div class="col-md-3">
            <div class="card stat-card">
              <div class="card-body">
                <i class="bi bi-check-circle text-success"></i>
                <div class="stat-value text-success" id="low-risk-count">0</div>
                <div class="stat-label">ความเสี่ยงต่ำ</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Machines List -->
        <div class="card">
          <div class="card-header">
            <i class="bi bi-list-ul"></i> รายการเครื่องจักร
          </div>
          <div class="card-body">
            <div id="machines-list"></div>
          </div>
        </div>
      </div>

      <div id="dashboard-error" style="display: none;">
        <div class="alert alert-warning">
          <i class="bi bi-exclamation-triangle"></i>
          ไม่พบข้อมูล กรุณา Upload ข้อมูลก่อน
        </div>
      </div>
    `;

    await this.loadDashboard();
  }

  async loadDashboard() {
    try {
      const data = await this.app.apiCall('/dashboard');

      if (data.length === 0) {
        document.getElementById('dashboard-loading').style.display = 'none';
        document.getElementById('dashboard-error').style.display = 'block';
        return;
      }

      // Calculate stats
      let highRisk = 0;
      let mediumRisk = 0;
      let lowRisk = 0;

      data.forEach(item => {
        if (item.risk.risk_level === 'HIGH') highRisk++;
        else if (item.risk.risk_level === 'MEDIUM') mediumRisk++;
        else if (item.risk.risk_level === 'LOW') lowRisk++;
      });

      // Update stats
      document.getElementById('total-machines').textContent = data.length;
      document.getElementById('high-risk-count').textContent = highRisk;
      document.getElementById('medium-risk-count').textContent = mediumRisk;
      document.getElementById('low-risk-count').textContent = lowRisk;

      // Render machines list
      this.renderMachinesList(data);

      document.getElementById('dashboard-loading').style.display = 'none';
      document.getElementById('dashboard-content').style.display = 'block';
    } catch (error) {
      document.getElementById('dashboard-loading').style.display = 'none';
      document.getElementById('dashboard-error').style.display = 'block';
    }
  }

  renderMachinesList(data) {
    const container = document.getElementById('machines-list');

    // Sort by risk score
    data.sort((a, b) => b.risk.risk_score - a.risk.risk_score);

    const html = data.map(item => {
      const riskClass = this.app.getRiskClass(item.risk.risk_level);
      const riskIcon = this.app.getRiskIcon(item.risk.risk_level);

      return `
        <div class="card mb-3 fade-in">
          <div class="card-body">
            <div class="row align-items-center">
              <div class="col-md-2">
                <h5 class="mb-0">
                  <i class="bi bi-gear-fill text-primary"></i>
                  ${item.machine}
                </h5>
              </div>
              <div class="col-md-2">
                <span class="risk-badge ${riskClass}">
                  <i class="bi bi-${riskIcon}"></i>
                  ${item.risk.risk_level}
                </span>
                <div class="small text-muted mt-1">Risk: ${item.risk.risk_score}/100</div>
              </div>
              <div class="col-md-3">
                <div class="small text-muted">การเสียทั้งหมด</div>
                <strong>${item.summary.total_failures}</strong> ครั้ง
                <div class="small text-muted">${item.summary.failures_per_month} ครั้ง/เดือน</div>
              </div>
              <div class="col-md-3">
                <div class="small text-muted">พยากรณ์การเสียครั้งต่อไป</div>
                <strong class="text-primary">
                  ${item.prediction.predicted_date ? this.app.formatDate(item.prediction.predicted_date) : 'N/A'}
                </strong>
                ${item.prediction.confidence ? `
                  <div class="small text-muted">ความมั่นใจ: ${item.prediction.confidence}%</div>
                ` : ''}
              </div>
              <div class="col-md-2 text-end">
                <button class="btn btn-sm btn-outline-primary" onclick="app.loadPage('analysis')">
                  <i class="bi bi-graph-up"></i> ดูรายละเอียด
                </button>
              </div>
            </div>
            ${item.risk.recommendation ? `
              <div class="mt-3 p-2 bg-light rounded">
                <i class="bi bi-lightbulb"></i> <strong>คำแนะนำ:</strong> ${item.risk.recommendation}
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = html;
  }
}
