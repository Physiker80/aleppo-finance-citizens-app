// =====================================================
// 📅 Scheduled Reports System
// نظام التقارير المجدولة
// =====================================================

export interface ScheduledReport {
    id: string;
    name: string;
    description?: string;
    reportType: ReportType;
    schedule: ReportSchedule;
    filters?: ReportFilters;
    format: 'pdf' | 'excel' | 'csv';
    recipients: string[];
    enabled: boolean;
    lastRun?: number;
    nextRun?: number;
    createdAt: number;
    createdBy: string;
}

export type ReportType =
    | 'tickets-summary'
    | 'department-performance'
    | 'employee-performance'
    | 'sla-compliance'
    | 'tickets-detailed'
    | 'response-times'
    | 'trend-analysis'
    | 'custom';

export interface ReportSchedule {
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';
    time: string; // HH:mm
    dayOfWeek?: number; // 0-6 for weekly
    dayOfMonth?: number; // 1-31 for monthly
    customCron?: string;
    timezone?: string;
}

export interface ReportFilters {
    dateRange?: {
        type: 'last7days' | 'last30days' | 'lastMonth' | 'lastQuarter' | 'lastYear' | 'custom';
        startDate?: string;
        endDate?: string;
    };
    departments?: string[];
    statuses?: string[];
    employees?: string[];
}

const STORAGE_KEY = 'scheduled-reports';

/**
 * حفظ التقارير المجدولة
 */
function saveReports(reports: ScheduledReport[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
}

/**
 * تحميل التقارير المجدولة
 */
export function loadReports(): ScheduledReport[] {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved) : [];
    } catch {
        return [];
    }
}

/**
 * إنشاء معرف فريد
 */
function generateId(): string {
    return `report-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * حساب موعد التشغيل التالي
 */
export function calculateNextRun(schedule: ReportSchedule): number {
    const now = new Date();
    const [hours, minutes] = schedule.time.split(':').map(Number);

    let nextRun = new Date(now);
    nextRun.setHours(hours, minutes, 0, 0);

    // If time has passed today, move to next occurrence
    if (nextRun <= now) {
        switch (schedule.frequency) {
            case 'daily':
                nextRun.setDate(nextRun.getDate() + 1);
                break;
            case 'weekly':
                const daysUntilNext = ((schedule.dayOfWeek || 0) - now.getDay() + 7) % 7 || 7;
                nextRun.setDate(nextRun.getDate() + daysUntilNext);
                break;
            case 'monthly':
                nextRun.setMonth(nextRun.getMonth() + 1);
                nextRun.setDate(schedule.dayOfMonth || 1);
                break;
            case 'quarterly':
                const currentQuarter = Math.floor(now.getMonth() / 3);
                nextRun.setMonth((currentQuarter + 1) * 3);
                nextRun.setDate(schedule.dayOfMonth || 1);
                break;
            case 'yearly':
                nextRun.setFullYear(nextRun.getFullYear() + 1);
                nextRun.setMonth(0);
                nextRun.setDate(schedule.dayOfMonth || 1);
                break;
        }
    } else {
        // Adjust to correct day for weekly/monthly
        switch (schedule.frequency) {
            case 'weekly':
                const daysUntil = ((schedule.dayOfWeek || 0) - now.getDay() + 7) % 7;
                if (daysUntil > 0) {
                    nextRun.setDate(nextRun.getDate() + daysUntil);
                }
                break;
            case 'monthly':
                nextRun.setDate(schedule.dayOfMonth || 1);
                if (nextRun <= now) {
                    nextRun.setMonth(nextRun.getMonth() + 1);
                }
                break;
        }
    }

    return nextRun.getTime();
}

/**
 * إنشاء تقرير مجدول جديد
 */
export function createScheduledReport(
    data: Omit<ScheduledReport, 'id' | 'createdAt' | 'nextRun'>
): ScheduledReport {
    const report: ScheduledReport = {
        ...data,
        id: generateId(),
        createdAt: Date.now(),
        nextRun: calculateNextRun(data.schedule)
    };

    const reports = loadReports();
    reports.push(report);
    saveReports(reports);

    return report;
}

/**
 * تحديث تقرير مجدول
 */
export function updateScheduledReport(
    id: string,
    updates: Partial<Omit<ScheduledReport, 'id' | 'createdAt'>>
): ScheduledReport | null {
    const reports = loadReports();
    const index = reports.findIndex(r => r.id === id);

    if (index === -1) return null;

    const updated = { ...reports[index], ...updates };
    if (updates.schedule) {
        updated.nextRun = calculateNextRun(updates.schedule);
    }

    reports[index] = updated;
    saveReports(reports);

    return updated;
}

/**
 * حذف تقرير مجدول
 */
export function deleteScheduledReport(id: string): boolean {
    const reports = loadReports();
    const filtered = reports.filter(r => r.id !== id);

    if (filtered.length === reports.length) return false;

    saveReports(filtered);
    return true;
}

/**
 * تفعيل/تعطيل تقرير
 */
export function toggleReportEnabled(id: string): ScheduledReport | null {
    const reports = loadReports();
    const report = reports.find(r => r.id === id);

    if (!report) return null;

    report.enabled = !report.enabled;
    if (report.enabled) {
        report.nextRun = calculateNextRun(report.schedule);
    }

    saveReports(reports);
    return report;
}

/**
 * الحصول على التقارير المستحقة للتشغيل
 */
export function getDueReports(): ScheduledReport[] {
    const now = Date.now();
    return loadReports().filter(r =>
        r.enabled && r.nextRun && r.nextRun <= now
    );
}

/**
 * تسجيل تشغيل التقرير
 */
export function markReportAsRun(id: string): void {
    const reports = loadReports();
    const report = reports.find(r => r.id === id);

    if (report) {
        report.lastRun = Date.now();
        report.nextRun = calculateNextRun(report.schedule);
        saveReports(reports);
    }
}

/**
 * الحصول على وصف التكرار
 */
export function getFrequencyDescription(schedule: ReportSchedule): string {
    const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

    switch (schedule.frequency) {
        case 'daily':
            return `يومياً في الساعة ${schedule.time}`;
        case 'weekly':
            return `أسبوعياً كل ${days[schedule.dayOfWeek || 0]} في الساعة ${schedule.time}`;
        case 'monthly':
            return `شهرياً في اليوم ${schedule.dayOfMonth || 1} في الساعة ${schedule.time}`;
        case 'quarterly':
            return `ربع سنوي في اليوم ${schedule.dayOfMonth || 1} من كل ربع في الساعة ${schedule.time}`;
        case 'yearly':
            return `سنوياً في اليوم ${schedule.dayOfMonth || 1} من يناير في الساعة ${schedule.time}`;
        case 'custom':
            return `جدول مخصص: ${schedule.customCron}`;
        default:
            return 'غير محدد';
    }
}

/**
 * الحصول على اسم نوع التقرير
 */
export function getReportTypeName(type: ReportType): string {
    const names: Record<ReportType, string> = {
        'tickets-summary': 'ملخص الشكاوى',
        'department-performance': 'أداء الأقسام',
        'employee-performance': 'أداء الموظفين',
        'sla-compliance': 'الالتزام بـ SLA',
        'tickets-detailed': 'تفاصيل الشكاوى',
        'response-times': 'أوقات الاستجابة',
        'trend-analysis': 'تحليل الاتجاهات',
        'custom': 'تقرير مخصص'
    };
    return names[type];
}

/**
 * مدير التقارير المجدولة
 */
class ScheduledReportManager {
    private checkInterval: ReturnType<typeof setInterval> | null = null;
    private onReportDue: ((report: ScheduledReport) => void) | null = null;

    /**
     * بدء مراقبة التقارير
     */
    start(callback: (report: ScheduledReport) => void): void {
        this.onReportDue = callback;
        this.checkInterval = setInterval(() => this.checkDueReports(), 60000); // Check every minute
        this.checkDueReports(); // Initial check
    }

    /**
     * إيقاف المراقبة
     */
    stop(): void {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }

    /**
     * التحقق من التقارير المستحقة
     */
    private checkDueReports(): void {
        const dueReports = getDueReports();
        dueReports.forEach(report => {
            this.onReportDue?.(report);
            markReportAsRun(report.id);
        });
    }

    /**
     * تشغيل تقرير فوري
     */
    async runNow(id: string): Promise<void> {
        const reports = loadReports();
        const report = reports.find(r => r.id === id);

        if (report && this.onReportDue) {
            this.onReportDue(report);
            markReportAsRun(id);
        }
    }
}

export const reportManager = new ScheduledReportManager();

/**
 * نماذج التقارير المتاحة
 */
export const REPORT_TEMPLATES: { type: ReportType; name: string; description: string }[] = [
    { type: 'tickets-summary', name: 'ملخص الشكاوى', description: 'تقرير ملخص لعدد الشكاوى حسب الحالة والقسم' },
    { type: 'department-performance', name: 'أداء الأقسام', description: 'تحليل أداء كل قسم من حيث معالجة الشكاوى' },
    { type: 'employee-performance', name: 'أداء الموظفين', description: 'تقييم أداء الموظفين في التعامل مع الشكاوى' },
    { type: 'sla-compliance', name: 'الالتزام بـ SLA', description: 'تقرير الالتزام باتفاقية مستوى الخدمة' },
    { type: 'tickets-detailed', name: 'تفاصيل الشكاوى', description: 'قائمة تفصيلية بجميع الشكاوى' },
    { type: 'response-times', name: 'أوقات الاستجابة', description: 'تحليل متوسط أوقات الاستجابة والمعالجة' },
    { type: 'trend-analysis', name: 'تحليل الاتجاهات', description: 'تحليل اتجاهات الشكاوى عبر الزمن' }
];

export default {
    loadReports,
    createScheduledReport,
    updateScheduledReport,
    deleteScheduledReport,
    toggleReportEnabled,
    getDueReports,
    getFrequencyDescription,
    getReportTypeName,
    reportManager,
    REPORT_TEMPLATES
};
