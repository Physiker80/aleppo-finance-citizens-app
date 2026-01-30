// =====================================================
// 🔒 Audit Log System
// نظام سجل التدقيق الأمني
// =====================================================

export type AuditAction =
    | 'LOGIN'
    | 'LOGOUT'
    | 'LOGIN_FAILED'
    | 'PASSWORD_CHANGE'
    | 'TICKET_CREATE'
    | 'TICKET_UPDATE'
    | 'TICKET_DELETE'
    | 'TICKET_VIEW'
    | 'TICKET_FORWARD'
    | 'TICKET_ASSIGN'
    | 'TICKET_CLOSE'
    | 'TICKET_REOPEN'
    | 'RESPONSE_ADD'
    | 'RESPONSE_DELETE'
    | 'ATTACHMENT_UPLOAD'
    | 'ATTACHMENT_DELETE'
    | 'ATTACHMENT_DOWNLOAD'
    | 'EMPLOYEE_CREATE'
    | 'EMPLOYEE_UPDATE'
    | 'EMPLOYEE_DELETE'
    | 'SETTINGS_CHANGE'
    | 'EXPORT_DATA'
    | 'IMPORT_DATA'
    | 'PERMISSION_CHANGE'
    | 'DEPARTMENT_CREATE'
    | 'DEPARTMENT_UPDATE'
    | 'DEPARTMENT_DELETE'
    | 'SESSION_TIMEOUT'
    | 'ACCOUNT_LOCKED'
    | 'ACCOUNT_UNLOCKED'
    | 'MFA_ENABLED'
    | 'MFA_DISABLED'
    | 'SUSPICIOUS_ACTIVITY';

export type AuditSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface AuditLogEntry {
    id: string;
    timestamp: number;
    action: AuditAction;
    severity: AuditSeverity;
    userId: string;
    userName: string;
    userRole?: string;
    ipAddress?: string;
    userAgent?: string;
    resourceType?: string;
    resourceId?: string;
    description: string;
    details?: Record<string, unknown>;
    previousValue?: unknown;
    newValue?: unknown;
    success: boolean;
    sessionId?: string;
}

export interface AuditLogFilter {
    startDate?: Date;
    endDate?: Date;
    actions?: AuditAction[];
    severity?: AuditSeverity[];
    userId?: string;
    resourceType?: string;
    resourceId?: string;
    searchTerm?: string;
    success?: boolean;
}

export interface AuditLogStats {
    totalEntries: number;
    byAction: Record<string, number>;
    bySeverity: Record<AuditSeverity, number>;
    byUser: { userId: string; count: number }[];
    failedLogins: number;
    suspiciousActivities: number;
    recentActivity: AuditLogEntry[];
}

const STORAGE_KEY = 'audit-logs';
const MAX_ENTRIES = 10000; // الحد الأقصى للسجلات
const RETENTION_DAYS = 90; // مدة الاحتفاظ بالسجلات

/**
 * تحديد مستوى الخطورة للإجراء
 */
function getActionSeverity(action: AuditAction, success: boolean): AuditSeverity {
    if (!success) {
        if (action === 'LOGIN_FAILED') return 'warning';
        return 'error';
    }

    const criticalActions: AuditAction[] = [
        'EMPLOYEE_DELETE', 'TICKET_DELETE', 'SETTINGS_CHANGE',
        'PERMISSION_CHANGE', 'ACCOUNT_LOCKED', 'SUSPICIOUS_ACTIVITY'
    ];

    const warningActions: AuditAction[] = [
        'LOGIN_FAILED', 'PASSWORD_CHANGE', 'EXPORT_DATA',
        'IMPORT_DATA', 'MFA_DISABLED'
    ];

    if (criticalActions.includes(action)) return 'critical';
    if (warningActions.includes(action)) return 'warning';
    return 'info';
}

/**
 * الحصول على وصف الإجراء بالعربية
 */
export function getActionDescription(action: AuditAction): string {
    const descriptions: Record<AuditAction, string> = {
        'LOGIN': 'تسجيل دخول',
        'LOGOUT': 'تسجيل خروج',
        'LOGIN_FAILED': 'فشل تسجيل الدخول',
        'PASSWORD_CHANGE': 'تغيير كلمة المرور',
        'TICKET_CREATE': 'إنشاء شكوى',
        'TICKET_UPDATE': 'تحديث شكوى',
        'TICKET_DELETE': 'حذف شكوى',
        'TICKET_VIEW': 'عرض شكوى',
        'TICKET_FORWARD': 'تحويل شكوى',
        'TICKET_ASSIGN': 'تعيين شكوى',
        'TICKET_CLOSE': 'إغلاق شكوى',
        'TICKET_REOPEN': 'إعادة فتح شكوى',
        'RESPONSE_ADD': 'إضافة رد',
        'RESPONSE_DELETE': 'حذف رد',
        'ATTACHMENT_UPLOAD': 'رفع مرفق',
        'ATTACHMENT_DELETE': 'حذف مرفق',
        'ATTACHMENT_DOWNLOAD': 'تحميل مرفق',
        'EMPLOYEE_CREATE': 'إنشاء موظف',
        'EMPLOYEE_UPDATE': 'تحديث موظف',
        'EMPLOYEE_DELETE': 'حذف موظف',
        'SETTINGS_CHANGE': 'تغيير الإعدادات',
        'EXPORT_DATA': 'تصدير بيانات',
        'IMPORT_DATA': 'استيراد بيانات',
        'PERMISSION_CHANGE': 'تغيير الصلاحيات',
        'DEPARTMENT_CREATE': 'إنشاء قسم',
        'DEPARTMENT_UPDATE': 'تحديث قسم',
        'DEPARTMENT_DELETE': 'حذف قسم',
        'SESSION_TIMEOUT': 'انتهاء الجلسة',
        'ACCOUNT_LOCKED': 'قفل الحساب',
        'ACCOUNT_UNLOCKED': 'فتح الحساب',
        'MFA_ENABLED': 'تفعيل المصادقة الثنائية',
        'MFA_DISABLED': 'تعطيل المصادقة الثنائية',
        'SUSPICIOUS_ACTIVITY': 'نشاط مشبوه'
    };

    return descriptions[action] || action;
}

/**
 * إنشاء معرف فريد
 */
function generateId(): string {
    return `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * الحصول على معلومات الجهاز
 */
function getDeviceInfo(): { userAgent: string; ipAddress: string } {
    return {
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
        ipAddress: 'local' // يتم تحديدها من الخادم في الإنتاج
    };
}

/**
 * الحصول على معرف الجلسة
 */
function getSessionId(): string {
    let sessionId = sessionStorage.getItem('audit-session-id');
    if (!sessionId) {
        sessionId = `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        sessionStorage.setItem('audit-session-id', sessionId);
    }
    return sessionId;
}

/**
 * تحميل سجلات التدقيق
 */
export function loadAuditLogs(): AuditLogEntry[] {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved) : [];
    } catch {
        return [];
    }
}

/**
 * حفظ سجلات التدقيق
 */
function saveLogs(logs: AuditLogEntry[]): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
    } catch (e) {
        // إذا امتلأت المساحة، احذف السجلات القديمة
        const trimmedLogs = logs.slice(-Math.floor(MAX_ENTRIES / 2));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedLogs));
    }
}

/**
 * تنظيف السجلات القديمة
 */
export function cleanupOldLogs(): number {
    const logs = loadAuditLogs();
    const cutoffDate = Date.now() - (RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const filteredLogs = logs.filter(log => log.timestamp >= cutoffDate);

    const deleted = logs.length - filteredLogs.length;
    if (deleted > 0) {
        saveLogs(filteredLogs);
    }

    return deleted;
}

/**
 * إضافة سجل تدقيق
 */
export function addAuditLog(entry: {
    action: AuditAction;
    userId: string;
    userName: string;
    userRole?: string;
    resourceType?: string;
    resourceId?: string;
    description?: string;
    details?: Record<string, unknown>;
    previousValue?: unknown;
    newValue?: unknown;
    success?: boolean;
}): AuditLogEntry {
    const deviceInfo = getDeviceInfo();
    const success = entry.success ?? true;

    const logEntry: AuditLogEntry = {
        id: generateId(),
        timestamp: Date.now(),
        action: entry.action,
        severity: getActionSeverity(entry.action, success),
        userId: entry.userId,
        userName: entry.userName,
        userRole: entry.userRole,
        ipAddress: deviceInfo.ipAddress,
        userAgent: deviceInfo.userAgent,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId,
        description: entry.description || getActionDescription(entry.action),
        details: entry.details,
        previousValue: entry.previousValue,
        newValue: entry.newValue,
        success,
        sessionId: getSessionId()
    };

    const logs = loadAuditLogs();

    // إضافة السجل الجديد
    logs.push(logEntry);

    // تقليم السجلات إذا تجاوزت الحد
    const trimmedLogs = logs.length > MAX_ENTRIES
        ? logs.slice(-MAX_ENTRIES)
        : logs;

    saveLogs(trimmedLogs);

    // تنبيه للأحداث الحرجة
    if (logEntry.severity === 'critical') {
        notifyCriticalEvent(logEntry);
    }

    return logEntry;
}

/**
 * تنبيه للأحداث الحرجة
 */
function notifyCriticalEvent(entry: AuditLogEntry): void {
    console.warn('[AUDIT] Critical security event:', {
        action: entry.action,
        user: entry.userName,
        description: entry.description,
        timestamp: new Date(entry.timestamp).toISOString()
    });

    // يمكن إضافة إشعار للمسؤولين هنا
}

/**
 * تصفية سجلات التدقيق
 */
export function filterAuditLogs(filter: AuditLogFilter): AuditLogEntry[] {
    let logs = loadAuditLogs();

    if (filter.startDate) {
        logs = logs.filter(log => log.timestamp >= filter.startDate!.getTime());
    }

    if (filter.endDate) {
        logs = logs.filter(log => log.timestamp <= filter.endDate!.getTime());
    }

    if (filter.actions?.length) {
        logs = logs.filter(log => filter.actions!.includes(log.action));
    }

    if (filter.severity?.length) {
        logs = logs.filter(log => filter.severity!.includes(log.severity));
    }

    if (filter.userId) {
        logs = logs.filter(log => log.userId === filter.userId);
    }

    if (filter.resourceType) {
        logs = logs.filter(log => log.resourceType === filter.resourceType);
    }

    if (filter.resourceId) {
        logs = logs.filter(log => log.resourceId === filter.resourceId);
    }

    if (filter.success !== undefined) {
        logs = logs.filter(log => log.success === filter.success);
    }

    if (filter.searchTerm) {
        const term = filter.searchTerm.toLowerCase();
        logs = logs.filter(log =>
            log.description.toLowerCase().includes(term) ||
            log.userName.toLowerCase().includes(term) ||
            log.userId.toLowerCase().includes(term) ||
            (log.resourceId && log.resourceId.toLowerCase().includes(term))
        );
    }

    return logs.sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * الحصول على إحصائيات سجل التدقيق
 */
export function getAuditLogStats(days: number = 30): AuditLogStats {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const logs = filterAuditLogs({ startDate });

    const byAction: Record<string, number> = {};
    const bySeverity: Record<AuditSeverity, number> = {
        info: 0,
        warning: 0,
        error: 0,
        critical: 0
    };
    const userCounts = new Map<string, number>();

    let failedLogins = 0;
    let suspiciousActivities = 0;

    logs.forEach(log => {
        // حسب الإجراء
        byAction[log.action] = (byAction[log.action] || 0) + 1;

        // حسب الخطورة
        bySeverity[log.severity]++;

        // حسب المستخدم
        userCounts.set(log.userId, (userCounts.get(log.userId) || 0) + 1);

        // فشل تسجيل الدخول
        if (log.action === 'LOGIN_FAILED') {
            failedLogins++;
        }

        // نشاط مشبوه
        if (log.action === 'SUSPICIOUS_ACTIVITY' || log.severity === 'critical') {
            suspiciousActivities++;
        }
    });

    const byUser = Array.from(userCounts.entries())
        .map(([userId, count]) => ({ userId, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

    return {
        totalEntries: logs.length,
        byAction,
        bySeverity,
        byUser,
        failedLogins,
        suspiciousActivities,
        recentActivity: logs.slice(0, 20)
    };
}

/**
 * تصدير سجلات التدقيق
 */
export function exportAuditLogs(filter?: AuditLogFilter): string {
    const logs = filter ? filterAuditLogs(filter) : loadAuditLogs();

    // إضافة سجل للتصدير نفسه
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    addAuditLog({
        action: 'EXPORT_DATA',
        userId: currentUser.username || 'system',
        userName: currentUser.name || 'النظام',
        resourceType: 'audit-logs',
        description: `تصدير ${logs.length} سجل تدقيق`,
        details: { filter, count: logs.length }
    });

    return JSON.stringify(logs, null, 2);
}

/**
 * البحث عن نشاط مشبوه
 */
export function detectSuspiciousActivity(): AuditLogEntry[] {
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const logs = filterAuditLogs({ startDate: last24h });

    const suspicious: AuditLogEntry[] = [];
    const loginAttempts = new Map<string, number>();

    logs.forEach(log => {
        // تتبع محاولات تسجيل الدخول الفاشلة
        if (log.action === 'LOGIN_FAILED') {
            const count = (loginAttempts.get(log.userId) || 0) + 1;
            loginAttempts.set(log.userId, count);

            // أكثر من 5 محاولات فاشلة
            if (count >= 5) {
                suspicious.push(log);
            }
        }

        // أي نشاط حرج
        if (log.severity === 'critical') {
            suspicious.push(log);
        }
    });

    return suspicious;
}

/**
 * مدير سجل التدقيق
 */
class AuditLogManager {
    private cleanupInterval: ReturnType<typeof setInterval> | null = null;

    /**
     * بدء التنظيف التلقائي
     */
    startAutoCleanup(): void {
        // تنظيف يومي
        this.cleanupInterval = setInterval(() => {
            cleanupOldLogs();
        }, 24 * 60 * 60 * 1000);

        // تنظيف فوري عند البدء
        cleanupOldLogs();
    }

    /**
     * إيقاف التنظيف التلقائي
     */
    stopAutoCleanup(): void {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
    }

    /**
     * تسجيل تسجيل الدخول
     */
    logLogin(userId: string, userName: string, success: boolean, details?: Record<string, unknown>): void {
        addAuditLog({
            action: success ? 'LOGIN' : 'LOGIN_FAILED',
            userId,
            userName,
            success,
            details
        });
    }

    /**
     * تسجيل تسجيل الخروج
     */
    logLogout(userId: string, userName: string): void {
        addAuditLog({
            action: 'LOGOUT',
            userId,
            userName
        });
    }

    /**
     * تسجيل إجراء على شكوى
     */
    logTicketAction(
        action: 'TICKET_CREATE' | 'TICKET_UPDATE' | 'TICKET_DELETE' | 'TICKET_VIEW' | 'TICKET_FORWARD' | 'TICKET_ASSIGN' | 'TICKET_CLOSE' | 'TICKET_REOPEN',
        ticketId: string,
        userId: string,
        userName: string,
        details?: Record<string, unknown>
    ): void {
        addAuditLog({
            action,
            userId,
            userName,
            resourceType: 'ticket',
            resourceId: ticketId,
            details
        });
    }
}

export const auditLogManager = new AuditLogManager();

export default {
    addAuditLog,
    loadAuditLogs,
    filterAuditLogs,
    getAuditLogStats,
    exportAuditLogs,
    cleanupOldLogs,
    detectSuspiciousActivity,
    getActionDescription,
    auditLogManager
};
