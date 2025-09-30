// Main Application Logic
class PMApp {
  constructor() {
    this.apiBaseUrl = 'http://localhost:3000/api';
    this.currentPage = 'dashboard';
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.loadPage('dashboard');
  }

  setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const page = e.currentTarget.dataset.page;
        this.loadPage(page);

        // Update active nav
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        e.currentTarget.classList.add('active');
      });
    });
  }

  loadPage(page) {
    this.currentPage = page;

    switch (page) {
      case 'dashboard':
        if (typeof Dashboard !== 'undefined') {
          new Dashboard(this).render();
        }
        break;
      case 'upload':
        if (typeof UploadPage !== 'undefined') {
          new UploadPage(this).render();
        }
        break;
      case 'analysis':
        if (typeof AnalysisPage !== 'undefined') {
          new AnalysisPage(this).render();
        }
        break;
      case 'prediction':
        if (typeof PredictionPage !== 'undefined') {
          new PredictionPage(this).render();
        }
        break;
      case 'records':
        if (typeof RecordsPage !== 'undefined') {
          new RecordsPage(this).render();
        }
        break;
    }
  }

  async apiCall(endpoint, options = {}) {
    try {
      const response = await fetch(`${this.apiBaseUrl}${endpoint}`, options);

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Non-JSON response:', text.substring(0, 200));
        throw new Error('Server returned non-JSON response');
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'เกิดข้อผิดพลาด');
      }

      return data;
    } catch (error) {
      console.error('API Call Error:', error);
      this.showToast(error.message, 'danger');
      throw error;
    }
  }

  showLoading(show = true) {
    const overlay = document.getElementById('loading-overlay');
    overlay.style.display = show ? 'flex' : 'none';
  }

  showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    const toastBody = toast.querySelector('.toast-body');
    const toastHeader = toast.querySelector('.toast-header');

    toastBody.textContent = message;
    toastHeader.classList.remove('bg-success', 'bg-danger', 'bg-warning', 'bg-info');
    toastHeader.classList.add(`bg-${type}`);

    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
  }

  formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  formatDateTime(dateStr, timeStr) {
    if (!dateStr) return 'N/A';
    const date = new Date(`${dateStr} ${timeStr || '00:00:00'}`);
    return date.toLocaleString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getRiskClass(riskLevel) {
    const classes = {
      HIGH: 'risk-HIGH',
      MEDIUM: 'risk-MEDIUM',
      LOW: 'risk-LOW',
      UNKNOWN: 'risk-UNKNOWN'
    };
    return classes[riskLevel] || 'risk-UNKNOWN';
  }

  getRiskIcon(riskLevel) {
    const icons = {
      HIGH: 'exclamation-triangle-fill',
      MEDIUM: 'exclamation-circle-fill',
      LOW: 'check-circle-fill',
      UNKNOWN: 'question-circle-fill'
    };
    return icons[riskLevel] || 'question-circle-fill';
  }

  createChart(canvasId, config) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;

    const ctx = canvas.getContext('2d');
    return new Chart(ctx, config);
  }

  async getMachines() {
    return await this.apiCall('/machines');
  }

  async getMachineSides(machine) {
    return await this.apiCall(`/machines/${machine}/sides`);
  }
}

// Initialize app
let app;
document.addEventListener('DOMContentLoaded', () => {
  app = new PMApp();
});
