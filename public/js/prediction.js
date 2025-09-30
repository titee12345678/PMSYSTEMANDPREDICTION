class PredictionPage {
  constructor(app) {
    this.app = app;
    this.selectedMachine = null;
    this.selectedSide = null;
  }

  async render() {
    const content = document.getElementById('app-content');
    content.innerHTML = `
      <h2 class="mb-4"><i class="bi bi-lightning"></i> พยากรณ์การบำรุงรักษา</h2>

      <div class="filter-section">
        <div class="row">
          <div class="col-md-5">
            <label class="form-label">เลือกเครื่องจักร</label>
            <select class="form-select" id="pred-machine-select">
              <option value="">-- เลือกเครื่องจักร --</option>
            </select>
          </div>
          <div class="col-md-5">
            <label class="form-label">เลือกหัวย่อย (ถ้ามี)</label>
            <select class="form-select" id="pred-side-select" disabled>
              <option value="">-- ทั้งหมด --</option>
            </select>
          </div>
          <div class="col-md-2">
            <label class="form-label">&nbsp;</label>
            <button class="btn btn-primary w-100" id="predict-btn" disabled>
              <i class="bi bi-lightning-charge"></i> พยากรณ์
            </button>
          </div>
        </div>
      </div>

      <div id="prediction-result" style="display: none;">
        <!-- Risk Score -->
        <div class="card mb-4">
          <div class="card-header">
            <i class="bi bi-exclamation-triangle"></i> ระดับความเสี่ยง
          </div>
          <div class="card-body" id="risk-score"></div>
        </div>

        <!-- Next Failure Prediction -->
        <div class="card prediction-card mb-4">
          <div class="card-header">
            <i class="bi bi-calendar-event"></i> พยากรณ์การเสียครั้งต่อไป
          </div>
          <div class="card-body" id="next-failure"></div>
        </div>

        <!-- Part Requirement Prediction -->
        <div class="card mb-4">
          <div class="card-header">
            <i class="bi bi-box-seam"></i> พยากรณ์ความต้องการอะไหล่ (90 วันข้างหน้า)
          </div>
          <div class="card-body" id="part-prediction"></div>
        </div>

        <!-- Recommendation -->
        <div class="card">
          <div class="card-header">
            <i class="bi bi-lightbulb"></i> คำแนะนำการบำรุงรักษา
          </div>
          <div class="card-body" id="recommendation"></div>
        </div>
      </div>
    `;

    await this.loadMachines();
    this.setupEventListeners();
  }

  async loadMachines() {
    try {
      const machines = await this.app.getMachines();
      const select = document.getElementById('pred-machine-select');

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
    const machineSelect = document.getElementById('pred-machine-select');
    const sideSelect = document.getElementById('pred-side-select');
    const predictBtn = document.getElementById('predict-btn');

    machineSelect.addEventListener('change', async (e) => {
      this.selectedMachine = e.target.value;

      if (this.selectedMachine) {
        predictBtn.disabled = false;
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
        predictBtn.disabled = true;
        sideSelect.disabled = true;
      }
    });

    sideSelect.addEventListener('change', (e) => {
      this.selectedSide = e.target.value || null;
    });

    predictBtn.addEventListener('click', () => {
      this.performPrediction();
    });
  }

  async performPrediction() {
    if (!this.selectedMachine) return;

    this.app.showLoading(true);

    try {
      // Get risk score
      const riskUrl = `/risk/score?machine=${this.selectedMachine}${
        this.selectedSide ? `&machineSide=${this.selectedSide}` : ''
      }`;
      const risk = await this.app.apiCall(riskUrl);

      // Get next failure prediction
      const failureUrl = `/predict/next-failure?machine=${this.selectedMachine}${
        this.selectedSide ? `&machineSide=${this.selectedSide}` : ''
      }`;
      const nextFailure = await this.app.apiCall(failureUrl);

      // Get part prediction
      const partUrl = `/predict/parts?machine=${this.selectedMachine}${
        this.selectedSide ? `&machineSide=${this.selectedSide}` : ''
      }&days=90`;
      const partPrediction = await this.app.apiCall(partUrl);

      // Render results
      this.renderRiskScore(risk);
      this.renderNextFailure(nextFailure);
      this.renderPartPrediction(partPrediction);
      this.renderRecommendation(risk, nextFailure);

      document.getElementById('prediction-result').style.display = 'block';
      this.app.showLoading(false);
    } catch (error) {
      this.app.showLoading(false);
    }
  }

  renderRiskScore(risk) {
    const container = document.getElementById('risk-score');
    const riskClass = this.app.getRiskClass(risk.risk_level);
    const riskIcon = this.app.getRiskIcon(risk.risk_level);

    container.innerHTML = `
      <div class="row align-items-center">
        <div class="col-md-4 text-center">
          <i class="bi bi-${riskIcon} ${riskClass.replace('risk-', 'text-').replace('HIGH', 'danger').replace('MEDIUM', 'warning').replace('LOW', 'success')}" style="font-size: 4rem;"></i>
          <h3 class="mt-3">
            <span class="risk-badge ${riskClass}">${risk.risk_level}</span>
          </h3>
          <div class="fs-4 mt-2">คะแนน: <strong>${risk.risk_score}/100</strong></div>
        </div>
        <div class="col-md-8">
          <h5>ปัจจัยความเสี่ยง</h5>
          <ul class="list-group">
            <li class="list-group-item d-flex justify-content-between align-items-center">
              การเสียใน 30 วันล่าสุด
              <span class="badge bg-primary rounded-pill">${risk.factors.recent_failures_30d} ครั้ง</span>
            </li>
            <li class="list-group-item d-flex justify-content-between align-items-center">
              ระยะเวลาตั้งแต่เสียครั้งล่าสุด
              <span class="badge bg-info rounded-pill">${risk.factors.days_since_last_failure} วัน</span>
            </li>
            <li class="list-group-item d-flex justify-content-between align-items-center">
              แนวโน้ม
              <span class="badge ${
                risk.factors.trend === 'INCREASING' ? 'bg-danger' :
                risk.factors.trend === 'DECREASING' ? 'bg-success' : 'bg-secondary'
              } rounded-pill">${
                risk.factors.trend === 'INCREASING' ? 'เพิ่มขึ้น' :
                risk.factors.trend === 'DECREASING' ? 'ลดลง' : 'คงที่'
              }</span>
            </li>
          </ul>
        </div>
      </div>
    `;
  }

  renderNextFailure(prediction) {
    const container = document.getElementById('next-failure');

    if (!prediction.predicted_date) {
      container.innerHTML = `
        <div class="alert alert-warning">
          <i class="bi bi-info-circle"></i> ${prediction.message}
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="row">
        <div class="col-md-6">
          <h5>วันที่เสียครั้งล่าสุด</h5>
          <p class="fs-5">${this.app.formatDate(prediction.last_failure)}</p>

          <h5 class="mt-4">พยากรณ์วันที่จะเสียครั้งต่อไป</h5>
          <p class="prediction-date">${this.app.formatDate(prediction.predicted_date)}</p>

          <div class="mt-3">
            <label class="form-label">ความมั่นใจในการพยากรณ์</label>
            <div class="confidence-meter">
              <div class="confidence-fill" style="width: ${prediction.confidence}%">
                ${prediction.confidence}%
              </div>
            </div>
          </div>
        </div>

        <div class="col-md-6">
          <h5>ช่วงความมั่นใจ (95%)</h5>
          <div class="alert alert-info">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <span>เร็วสุด:</span>
              <strong>${this.app.formatDate(prediction.confidence_interval.earliest)}</strong>
            </div>
            <div class="d-flex justify-content-between align-items-center">
              <span>ช้าสุด:</span>
              <strong>${this.app.formatDate(prediction.confidence_interval.latest)}</strong>
            </div>
          </div>

          <h5 class="mt-4">สถิติ</h5>
          <ul class="list-unstyled">
            <li><i class="bi bi-graph-up"></i> จำนวนการเสียทั้งหมด: <strong>${prediction.statistics.total_failures}</strong></li>
            <li><i class="bi bi-clock"></i> ช่วงเวลาเฉลี่ย: <strong>${prediction.statistics.avg_interval_days}</strong> วัน</li>
            <li><i class="bi bi-activity"></i> ช่วงเวลาถ่วงน้ำหนัก: <strong>${prediction.statistics.weighted_avg_days}</strong> วัน</li>
            <li><i class="bi bi-bar-chart"></i> ค่าเบี่ยงเบน: <strong>${prediction.statistics.std_deviation}</strong> วัน</li>
          </ul>
        </div>
      </div>
    `;
  }

  renderPartPrediction(prediction) {
    const container = document.getElementById('part-prediction');

    if (prediction.length === 0) {
      container.innerHTML = '<p class="text-muted">ไม่มีข้อมูลการใช้อะไหล่เพื่อทำการพยากรณ์</p>';
      return;
    }

    container.innerHTML = `
      <div class="table-responsive">
        <table class="table table-hover">
          <thead>
            <tr>
              <th>รหัสอะไหล่</th>
              <th>ชื่ออะไหล่</th>
              <th>การใช้ในอดีต</th>
              <th>อัตราต่อวัน</th>
              <th>ใช้ล่าสุด</th>
              <th>พยากรณ์ใช้ครั้งต่อไป</th>
              <th class="text-center">แนะนำให้เตรียม</th>
            </tr>
          </thead>
          <tbody>
            ${prediction.map(p => `
              <tr>
                <td><code>${p.part_code}</code></td>
                <td>${p.name_part}</td>
                <td>${p.historical_usage}</td>
                <td>${p.usage_rate_per_day}</td>
                <td>
                  ${this.app.formatDate(p.last_used)}<br>
                  <small class="text-muted">(${p.days_since_last_use} วันที่แล้ว)</small>
                </td>
                <td>${p.predicted_next_use !== 'N/A' ? this.app.formatDate(p.predicted_next_use) : 'N/A'}</td>
                <td class="text-center">
                  <span class="badge bg-success fs-6">${p.recommended_stock} ชิ้น</span>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div class="alert alert-info mt-3">
        <i class="bi bi-info-circle"></i>
        <strong>หมายเหตุ:</strong> การพยากรณ์อิงจากข้อมูลการใช้อะไหล่ในอดีต และคำนวณปริมาณที่ควรเตรียมไว้สำหรับ 90 วันข้างหน้า
      </div>
    `;
  }

  renderRecommendation(risk, nextFailure) {
    const container = document.getElementById('recommendation');

    let recommendations = [];

    // Add risk-based recommendations
    if (risk.recommendation) {
      recommendations.push({
        priority: 'high',
        text: risk.recommendation,
        icon: 'exclamation-triangle'
      });
    }

    // Add time-based recommendations
    if (nextFailure.predicted_date) {
      const predictedDate = new Date(nextFailure.predicted_date);
      const today = new Date();
      const daysUntil = Math.ceil((predictedDate - today) / (1000 * 60 * 60 * 24));

      if (daysUntil < 7) {
        recommendations.push({
          priority: 'high',
          text: `คาดว่าจะเสียภายใน ${daysUntil} วัน - ควรเตรียมพร้อมอะไหล่และช่างซ่อม`,
          icon: 'clock'
        });
      } else if (daysUntil < 14) {
        recommendations.push({
          priority: 'medium',
          text: `คาดว่าจะเสียภายใน ${daysUntil} วัน - ควรวางแผนการบำรุงรักษา`,
          icon: 'calendar-check'
        });
      } else {
        recommendations.push({
          priority: 'low',
          text: `คาดว่าจะเสียภายใน ${daysUntil} วัน - ติดตามต่อเนื่อง`,
          icon: 'eye'
        });
      }
    }

    // Add general recommendations
    recommendations.push({
      priority: 'info',
      text: 'ตรวจสอบและบำรุงรักษาตามปกติเพื่อป้องกันการเสียกะทันหัน',
      icon: 'tools'
    });

    const priorityClass = {
      high: 'danger',
      medium: 'warning',
      low: 'success',
      info: 'info'
    };

    container.innerHTML = `
      <div class="timeline">
        ${recommendations.map((rec, index) => `
          <div class="timeline-item">
            <div class="alert alert-${priorityClass[rec.priority]} mb-2">
              <i class="bi bi-${rec.icon}"></i>
              <strong>${rec.priority === 'high' ? 'เร่งด่วน' : rec.priority === 'medium' ? 'ปานกลาง' : rec.priority === 'low' ? 'ติดตาม' : 'ข้อมูล'}:</strong>
              ${rec.text}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }
}
