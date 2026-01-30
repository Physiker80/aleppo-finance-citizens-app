/**
 * نظام سجل النشاطات
 * تتبع جميع العمليات والأحداث في النظام
 */

import React, { useState, useEffect, useMemo } from 'react';

// ==================== أنواع النشاطات ====================
export type ActivityType =
    | 'login'
    | 'logout'
    | 'ticket_create'
    | 'ticket_update'
    | 'ticket_view'
    | 'ticket_respond'
    | 'ticket_forward'
    | 'ticket_close'
    | 'employee_create'
    | 'employee_update'
    | 'employee_delete'
    | 'settings_change'
    | 'export_data'
    | 'print'
    | 'search'
    | 'department_change'
    | 'notification_read'
    | 'message_send'
    | 'file_upload'
    | 'file_download'
    | 'error';

export interface ActivityLog {
    id: string;
    type: ActivityType;
    userId?: string;
    userName?: string;
    userRole?: string;
    description: string;
    details?: Record<string, any>;
    metadata?: {
        ip?: string;
        userAgent?: string;
        sessionId?: string;
    };
    timestamp: string;
    severity: 'info' | 'warning' | 'error' | 'success';
}

// ==================== ثوابت ====================
const STORAGE_KEY = 'activity_logs';
const MAX_LOGS = 1000;

const ACTIVITY_LABELS: Record<ActivityType, { label: string; icon: string }> = {
    login: { label: 'تسجيل دخول', icon: '🔑' },
    logout: { label: 'تسجيل خروج', icon: '🚪' },
    ticket_create: { label: 'إنشاء تذكرة', icon: '📝' },
    ticket_update: { label: 'تحديث تذكرة', icon: '✏️' },
    ticket_view: { label: 'عرض تذكرة', icon: '👁️' },
    ticket_respond: { label: 'رد على تذكرة', icon: '💬' },
    ticket_forward: { label: 'تحويل تذكرة', icon: '↪️' },
    ticket_close: { label: 'إغلاق تذكرة', icon: '✅' },
    employee_create: { label: 'إضافة موظف', icon: '👤' },
    employee_update: { label: 'تحديث موظف', icon: '✏️' },
    employee_delete: { label: 'حذف موظف', icon: '🗑️' },
    settings_change: { label: 'تغيير إعدادات', icon: '⚙️' },
    export_data: { label: 'تصدير بيانات', icon: '📤' },
    print: { label: 'طباعة', icon: '🖨️' },
    search: { label: 'بحث', icon: '🔍' },
    department_change: { label: 'تغيير قسم', icon: '🏢' },
    notification_read: { label: 'قراءة إشعار', icon: '🔔' },
    message_send: { label: 'إرسال رسالة', icon: '📧' },
    file_upload: { label: 'رفع ملف', icon: '📎' },
    file_download: { label: 'تنزيل ملف', icon: '⬇️' },
    error: { label: 'خطأ', icon: '❌' }
};

// ==================== إدارة السجلات ====================

/**
 * الحصول على جميع السجلات
 */
export const getActivityLogs = (): ActivityLog[] => {
    try {
        const logs = localStorage.getItem(STORAGE_KEY);
        return logs ? JSON.parse(logs) : [];
    } catch {
        return [];
    }
};

/**
 * إضافة سجل نشاط جديد
 */
export const addActivityLog = (
    type: ActivityType,
    description: string,
    options: {
        userId?: string;
        userName?: string;
        userRole?: string;
        details?: Record<string, any>;
        severity?: 'info' | 'warning' | 'error' | 'success';
    } = {}
): ActivityLog => {
    const log: ActivityLog = {
        id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        type,
        description,
        userId: options.userId,
        userName: options.userName,
        userRole: options.userRole,
        details: options.details,
        severity: options.severity || 'info',
        timestamp: new Date().toISOString(),
        metadata: {
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
            sessionId: sessionStorage.getItem('sessionId') || undefined
        }
    };

    try {
        let logs = getActivityLogs();
        logs.unshift(log);

        // الاحتفاظ بآخر MAX_LOGS سجل فقط
        if (logs.length > MAX_LOGS) {
            logs = logs.slice(0, MAX_LOGS);
        }

        localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
    } catch (error) {
        console.error('Error saving activity log:', error);
    }

    return log;
};

/**
 * حذف سجلات قديمة
 */
export const clearOldLogs = (daysToKeep: number = 30): number => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const logs = getActivityLogs();
    const filteredLogs = logs.filter(log =>
        new Date(log.timestamp) > cutoffDate
    );

    const deletedCount = logs.length - filteredLogs.length;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredLogs));

    return deletedCount;
};

/**
 * تصفية السجلات
 */
export const filterActivityLogs = (
    logs: ActivityLog[],
    filters: {
        type?: ActivityType | ActivityType[];
        userId?: string;
        severity?: 'info' | 'warning' | 'error' | 'success';
        fromDate?: Date;
        toDate?: Date;
        searchQuery?: string;
    }
): ActivityLog[] => {
    return logs.filter(log => {
        // فلتر النوع
        if (filters.type) {
            const types = Array.isArray(filters.type) ? filters.type : [filters.type];
            if (!types.includes(log.type)) return false;
        }

        // فلتر المستخدم
        if (filters.userId && log.userId !== filters.userId) return false;

        // فلتر الخطورة
        if (filters.severity && log.severity !== filters.severity) return false;

        // فلتر التاريخ
        const logDate = new Date(log.timestamp);
        if (filters.fromDate && logDate < filters.fromDate) return false;
        if (filters.toDate && logDate > filters.toDate) return false;

        // فلتر البحث
        if (filters.searchQuery) {
            const query = filters.searchQuery.toLowerCase();
            const searchableText = `${log.description} ${log.userName || ''} ${log.type}`.toLowerCase();
            if (!searchableText.includes(query)) return false;
        }

        return true;
    });
};

/**
 * تجميع السجلات حسب التاريخ
 */
export const groupLogsByDate = (logs: ActivityLog[]): Map<string, ActivityLog[]> => {
    const groups = new Map<string, ActivityLog[]>();

    logs.forEach(log => {
        const date = new Date(log.timestamp).toLocaleDateString('ar-SY');
        const existing = groups.get(date) || [];
        existing.push(log);
        groups.set(date, existing);
    });

    return groups;
};

/**
 * إحصائيات السجلات
 */
export const getActivityStats = (logs: ActivityLog[]): {
    total: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
    byUser: Record<string, number>;
    todayCount: number;
    weekCount: number;
} => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const stats = {
        total: logs.length,
        byType: {} as Record<string, number>,
        bySeverity: {} as Record<string, number>,
        byUser: {} as Record<string, number>,
        todayCount: 0,
        weekCount: 0
    };

    logs.forEach(log => {
        // حسب النوع
        stats.byType[log.type] = (stats.byType[log.type] || 0) + 1;

        // حسب الخطورة
        stats.bySeverity[log.severity] = (stats.bySeverity[log.severity] || 0) + 1;

        // حسب المستخدم
        if (log.userName) {
            stats.byUser[log.userName] = (stats.byUser[log.userName] || 0) + 1;
        }

        // اليوم
        if (new Date(log.timestamp) >= today) {
            stats.todayCount++;
        }

        // الأسبوع
        if (new Date(log.timestamp) >= weekAgo) {
            stats.weekCount++;
        }
    });

    return stats;
};

// ==================== Helper للتسجيل السهل ====================
export const logActivity = {
    login: (userName: string, userId?: string) =>
        addActivityLog('login', `تم تسجيل دخول ${userName}`, { userName, userId, severity: 'success' }),

    logout: (userName: string, userId?: string) =>
        addActivityLog('logout', `تم تسجيل خروج ${userName}`, { userName, userId }),

    ticketCreate: (ticketId: string, userName?: string) =>
        addActivityLog('ticket_create', `تم إنشاء تذكرة جديدة رقم ${ticketId}`, { userName, details: { ticketId }, severity: 'success' }),

    ticketUpdate: (ticketId: string, changes: string, userName?: string) =>
        addActivityLog('ticket_update', `تم تحديث تذكرة رقم ${ticketId}: ${changes}`, { userName, details: { ticketId, changes } }),

    ticketRespond: (ticketId: string, userName?: string) =>
        addActivityLog('ticket_respond', `تم الرد على تذكرة رقم ${ticketId}`, { userName, details: { ticketId }, severity: 'success' }),

    ticketForward: (ticketId: string, toDepartment: string, userName?: string) =>
        addActivityLog('ticket_forward', `تم تحويل تذكرة رقم ${ticketId} إلى ${toDepartment}`, { userName, details: { ticketId, toDepartment } }),

    ticketClose: (ticketId: string, userName?: string) =>
        addActivityLog('ticket_close', `تم إغلاق تذكرة رقم ${ticketId}`, { userName, details: { ticketId }, severity: 'success' }),

    error: (message: string, details?: Record<string, any>) =>
        addActivityLog('error', message, { details, severity: 'error' }),

    export: (format: string, count: number, userName?: string) =>
        addActivityLog('export_data', `تم تصدير ${count} سجل بصيغة ${format}`, { userName, details: { format, count } }),

    print: (what: string, userName?: string) =>
        addActivityLog('print', `تم طباعة ${what}`, { userName }),

    search: (query: string, resultsCount: number) =>
        addActivityLog('search', `بحث عن "${query}" - ${resultsCount} نتيجة`, { details: { query, resultsCount } })
};

// ==================== مكونات React ====================

const severityColors = {
    info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    warning: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    error: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    success: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
};

interface ActivityLogItemProps {
    log: ActivityLog;
    showDetails?: boolean;
}

export const ActivityLogItem: React.FC<ActivityLogItemProps> = ({ log, showDetails = false }) => {
    const [expanded, setExpanded] = useState(false);
    const activityInfo = ACTIVITY_LABELS[log.type];

    const formatTime = (timestamp: string) => {
        return new Date(timestamp).toLocaleString('ar-SY', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    return (
        <div
            className={`p-4 rounded-lg border transition-all ${expanded ? 'bg-gray-50 dark:bg-gray-700/50' : 'bg-white dark:bg-gray-800'
                } border-gray-200 dark:border-gray-700`}
        >
            <div className="flex items-start gap-3">
                {/* الأيقونة */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${severityColors[log.severity]}`}>
                    {activityInfo.icon}
                </div>

                {/* المحتوى */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-medium text-gray-800 dark:text-gray-200">
                            {activityInfo.label}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                            {formatTime(log.timestamp)}
                        </span>
                    </div>

                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        {log.description}
                    </p>

                    {log.userName && (
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            بواسطة: {log.userName}
                            {log.userRole && ` (${log.userRole})`}
                        </p>
                    )}
                </div>

                {/* زر التفاصيل */}
                {showDetails && log.details && (
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                        {expanded ? '▲' : '▼'}
                    </button>
                )}
            </div>

            {/* التفاصيل الموسعة */}
            {expanded && log.details && (
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                    <pre className="text-xs text-gray-600 dark:text-gray-400 overflow-x-auto">
                        {JSON.stringify(log.details, null, 2)}
                    </pre>
                </div>
            )}
        </div>
    );
};

interface ActivityLogViewerProps {
    limit?: number;
    userId?: string;
    showFilters?: boolean;
}

export const ActivityLogViewer: React.FC<ActivityLogViewerProps> = ({
    limit,
    userId,
    showFilters = true
}) => {
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [filters, setFilters] = useState({
        type: '' as ActivityType | '',
        severity: '' as 'info' | 'warning' | 'error' | 'success' | '',
        searchQuery: '',
        fromDate: '',
        toDate: ''
    });

    useEffect(() => {
        const allLogs = getActivityLogs();
        setLogs(allLogs);
    }, []);

    const filteredLogs = useMemo(() => {
        let result = logs;

        if (userId) {
            result = result.filter(log => log.userId === userId);
        }

        if (filters.type) {
            result = result.filter(log => log.type === filters.type);
        }

        if (filters.severity) {
            result = result.filter(log => log.severity === filters.severity);
        }

        if (filters.searchQuery) {
            const query = filters.searchQuery.toLowerCase();
            result = result.filter(log =>
                log.description.toLowerCase().includes(query) ||
                log.userName?.toLowerCase().includes(query)
            );
        }

        if (filters.fromDate) {
            result = result.filter(log => new Date(log.timestamp) >= new Date(filters.fromDate));
        }

        if (filters.toDate) {
            result = result.filter(log => new Date(log.timestamp) <= new Date(filters.toDate));
        }

        if (limit) {
            result = result.slice(0, limit);
        }

        return result;
    }, [logs, filters, limit, userId]);

    const stats = useMemo(() => getActivityStats(logs), [logs]);

    return (
        <div className="space-y-4">
            {/* الإحصائيات */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <div className="text-2xl font-bold text-gray-800 dark:text-white">{stats.total}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">إجمالي السجلات</div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <div className="text-2xl font-bold text-blue-600">{stats.todayCount}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">اليوم</div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <div className="text-2xl font-bold text-green-600">{stats.weekCount}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">هذا الأسبوع</div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <div className="text-2xl font-bold text-red-600">{stats.bySeverity.error || 0}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">أخطاء</div>
                </div>
            </div>

            {/* الفلاتر */}
            {showFilters && (
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <input
                            type="text"
                            placeholder="بحث..."
                            value={filters.searchQuery}
                            onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
                            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        />

                        <select
                            value={filters.type}
                            onChange={(e) => setFilters({ ...filters, type: e.target.value as ActivityType })}
                            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        >
                            <option value="">جميع الأنواع</option>
                            {Object.entries(ACTIVITY_LABELS).map(([key, { label }]) => (
                                <option key={key} value={key}>{label}</option>
                            ))}
                        </select>

                        <select
                            value={filters.severity}
                            onChange={(e) => setFilters({ ...filters, severity: e.target.value as any })}
                            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        >
                            <option value="">جميع المستويات</option>
                            <option value="info">معلومات</option>
                            <option value="success">نجاح</option>
                            <option value="warning">تحذير</option>
                            <option value="error">خطأ</option>
                        </select>

                        <input
                            type="date"
                            value={filters.fromDate}
                            onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })}
                            className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                        />
                    </div>
                </div>
            )}

            {/* قائمة السجلات */}
            <div className="space-y-3">
                {filteredLogs.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                        لا توجد سجلات
                    </div>
                ) : (
                    filteredLogs.map(log => (
                        <ActivityLogItem key={log.id} log={log} showDetails={true} />
                    ))
                )}
            </div>
        </div>
    );
};

// Hook للاستخدام في المكونات
export const useActivityLogs = () => {
    const [logs, setLogs] = useState<ActivityLog[]>([]);

    useEffect(() => {
        setLogs(getActivityLogs());
    }, []);

    const refresh = () => setLogs(getActivityLogs());

    return { logs, refresh, addLog: addActivityLog, stats: getActivityStats(logs) };
};
