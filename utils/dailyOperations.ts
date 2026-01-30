import { DailyReport, DailyCheckEntry, DailyIssue, DailyMetrics, DailyIssueSeverity } from '../types';

const STORAGE_KEY = 'daily_reports';
const nowIso = () => new Date().toISOString();

function loadReports(): DailyReport[] {
  try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : []; } catch { return []; }
}
function saveReports(list: DailyReport[]) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch {} }

export class DailyOperations {
  onUpdate?: (r: DailyReport) => void;
  constructor(onUpdate?: (r: DailyReport) => void) { this.onUpdate = onUpdate; }

  private persist(report: DailyReport) {
    const list = loadReports();
    const idx = list.findIndex(r => r.id === report.id);
    if (idx >= 0) list[idx] = report; else list.unshift(report);
    saveReports(list);
    this.onUpdate?.(report);
  }

  list(): DailyReport[] { return loadReports(); }

  async performDailyChecks(): Promise<DailyReport> {
    const report: DailyReport = {
      id: `DLY-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
      date: nowIso(),
      checks: [],
      issues: [],
      metrics: {},
      createdAt: nowIso(),
    };

    // 1) Security logs
    const securityLogs = await this.checkSecurityLogs();
    report.checks.push({ name: 'سجلات الأمان', status: securityLogs.suspicious.length === 0 ? 'OK' : 'WARNING', details: securityLogs });

    // 2) Failed login attempts
    const failedLogins = await this.reviewFailedLogins();
    if (failedLogins.count > 10) {
      report.issues.push({ severity: 'MEDIUM', description: `${failedLogins.count} محاولة دخول فاشلة`, action: 'مراجعة وتحليل الأنماط' });
    }

    // 3) Backups
    const backupStatus = await this.verifyBackups();
    report.checks.push({ name: 'النسخ الاحتياطية', status: backupStatus.allValid ? 'OK' : 'ERROR', details: backupStatus });

    // 4) Storage capacity
    const storage = await this.checkStorage();
    if (storage.usagePercentage > 80) {
      report.issues.push({ severity: storage.usagePercentage > 90 ? 'CRITICAL' : 'HIGH', description: `استخدام التخزين ${storage.usagePercentage}%`, action: 'تنظيف أو توسيع السعة' });
    }

    // 5) Certificates
    const certificates = await this.checkCertificates();
    for (const cert of certificates) {
      if (cert.daysUntilExpiry < 30) {
        report.issues.push({ severity: cert.daysUntilExpiry < 7 ? 'CRITICAL' : 'HIGH', description: `شهادة ${cert.domain} تنتهي خلال ${cert.daysUntilExpiry} يوم`, action: 'تجديد الشهادة' });
      }
    }

    // 6) Performance
    report.metrics = await this.collectPerformanceMetrics();

    // 7) Security updates
    const updates = await this.checkSecurityUpdates();
    if (updates.critical.length > 0) {
      report.issues.push({ severity: 'CRITICAL', description: `${updates.critical.length} تحديثات أمنية حرجة متاحة`, action: 'تطبيق التحديثات فوراً' });
    }

    // Persist and notify
    this.persist(report);

    // Alerts for critical
    if (report.issues.some(i => i.severity === 'CRITICAL')) {
      await this.sendCriticalAlert(report);
    }

    return report;
  }

  // ---------- Helper stubs ----------
  private async checkSecurityLogs(): Promise<{ total: number; suspicious: any[] }> {
    // In real system, fetch logs from SIEM/DB
    return { total: 0, suspicious: [] };
  }

  private async reviewFailedLogins(): Promise<{ count: number; last24h: number }> {
    // Use localStorage or backend when available
    return { count: Math.floor(Math.random() * 5), last24h: 0 };
  }

  private async verifyBackups(): Promise<{ allValid: boolean; lastBackup: string; details?: any }> {
    // Simulate last backup time
    return { allValid: true, lastBackup: nowIso() };
  }

  private async checkStorage(): Promise<{ usagePercentage: number; freeGB?: number; totalGB?: number }> {
    // Simulate usage between 50-95
    const usage = 50 + Math.floor(Math.random() * 45);
    return { usagePercentage: usage, freeGB: 100 - usage, totalGB: 100 };
  }

  private async checkCertificates(): Promise<Array<{ domain: string; daysUntilExpiry: number }>> {
    // Simulate certificates
    return [
      { domain: 'finance.gov.sy', daysUntilExpiry: 45 },
      { domain: 'api.finance.gov.sy', daysUntilExpiry: 12 },
    ];
  }

  private async collectPerformanceMetrics(): Promise<DailyMetrics> {
    return { domContentLoadedMs: 800, loadTimeMs: 1500, jsHeapUsedMB: 128, jsHeapTotalMB: 256, timestamp: nowIso() };
  }

  private async checkSecurityUpdates(): Promise<{ critical: string[]; important: string[] }> {
    return { critical: [], important: ['kernel-1.2.3'] };
  }

  private async generateDailyReport(report: DailyReport): Promise<void> {
    // Persisting already done in performDailyChecks; keep hook for future formatting
    return;
  }

  private async sendCriticalAlert(report: DailyReport): Promise<void> {
    // Hook to integrate with email/SMS/ChatOps
    console.warn('CRITICAL daily issues detected:', report.issues.filter(i => i.severity === 'CRITICAL'));
  }

  // ---------- Exports ----------
  exportCSV(report: DailyReport): string {
    const rows: string[][] = [];
    rows.push(['Report ID', report.id]);
    rows.push(['Date', report.date]);
    rows.push(['Checks']);
    rows.push(['Name','Status','Details']);
    report.checks.forEach(c => rows.push([c.name, c.status, JSON.stringify(c.details || {})]));
    rows.push(['Issues']);
    rows.push(['Severity','Description','Action']);
    report.issues.forEach(i => rows.push([i.severity, i.description, i.action || '']));
    rows.push(['Metrics']);
    rows.push(['DCL(ms)','Load(ms)','Heap Used(MB)','Heap Total(MB)','Timestamp']);
    rows.push([String(report.metrics.domContentLoadedMs || ''), String(report.metrics.loadTimeMs || ''), String(report.metrics.jsHeapUsedMB || ''), String(report.metrics.jsHeapTotalMB || ''), report.metrics.timestamp || '']);
    return rows.map(r => r.map(v => '"' + String(v).replaceAll('"','""') + '"').join(',')).join('\n');
  }

  async exportPDF(report: DailyReport): Promise<Blob> {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'pt' });
    let y = 40;
    doc.setFontSize(14);
    doc.text(`تقرير التشغيل اليومي - ${report.id}`, 40, y); y += 20;
    doc.setFontSize(10);
    doc.text(`التاريخ: ${report.date}`, 40, y); y += 16;
    doc.text('الفحوصات:', 40, y); y += 14;
    report.checks.forEach(c => { doc.text(`- ${c.name}: ${c.status}`, 44, y); y += 12; if (y > 760) { doc.addPage(); y = 40; } });
    y += 6; doc.text('القضايا:', 40, y); y += 14;
    report.issues.forEach(i => { doc.text(`- [${i.severity}] ${i.description}${i.action ? ' - ' + i.action : ''}`, 44, y); y += 12; if (y > 760) { doc.addPage(); y = 40; } });
    y += 6; doc.text('القياسات:', 40, y); y += 14;
    doc.text(`DCL: ${report.metrics.domContentLoadedMs || '-'} ms, Load: ${report.metrics.loadTimeMs || '-'} ms`, 44, y); y += 12;
    doc.text(`Heap: ${report.metrics.jsHeapUsedMB || '-'} / ${report.metrics.jsHeapTotalMB || '-'} MB`, 44, y); y += 12;
    const blob = doc.output('blob');
    return blob as Blob;
  }
}

export const dailyOps = new DailyOperations();
