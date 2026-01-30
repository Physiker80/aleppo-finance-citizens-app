/**
 * نظام تتبع وقت الاستجابة
 * قياس وتحليل أوقات الرد على التذاكر
 */

import React, { useState, useEffect, useMemo } from 'react';

// ==================== أنواع البيانات ====================
export interface ResponseTime {
    ticketId: string;
    createdAt: string;
    firstResponseAt?: string;
    resolvedAt?: string;
    department: string;
    employeeId?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
}

export interface SLAConfig {
    id: string;
    name: string;
    priority: string;
    firstResponseHours: number; // المدة المسموحة للرد الأول
    resolutionHours: number; // المدة المسموحة للحل
    escalationHours?: number; // المدة قبل التصعيد
    departmentId?: string;
}

export interface ResponseMetrics {
    averageFirstResponse: number; // متوسط وقت الرد الأول (دقائق)
    averageResolution: number; // متوسط وقت الحل (دقائق)
    slaCompliance: number; // نسبة الالتزام بـ SLA
    totalTickets: number;
    withinSLA: number;
    breachedSLA: number;
    pendingResponse: number;
    byPriority: Record<string, { count: number; avgResponse: number }>;
    byDepartment: Record<string, { count: number; avgResponse: number }>;
    byEmployee: Record<string, { count: number; avgResponse: number }>;
    trends: {
        date: string;
        avgResponse: number;
        count: number;
    }[];
}

// ==================== ثوابت ====================
const STORAGE_KEY = 'response_times';
const SLA_KEY = 'sla_configs';

const DEFAULT_SLA: SLAConfig[] = [
    { id: 'urgent', name: 'عاجل', priority: 'urgent', firstResponseHours: 1, resolutionHours: 4 },
    { id: 'high', name: 'عالي', priority: 'high', firstResponseHours: 4, resolutionHours: 24 },
    { id: 'medium', name: 'متوسط', priority: 'medium', firstResponseHours: 8, resolutionHours: 48 },
    { id: 'low', name: 'منخفض', priority: 'low', firstResponseHours: 24, resolutionHours: 72 }
];

// ==================== وظائف مساعدة ====================

/**
 * تحويل الوقت إلى صيغة مقروءة
 */
export const formatDuration = (minutes: number): string => {
    if (minutes < 1) return 'أقل من دقيقة';
    if (minutes < 60) return `${Math.round(minutes)} دقيقة`;

    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);

    if (hours < 24) {
        return mins > 0 ? `${hours} ساعة و ${mins} دقيقة` : `${hours} ساعة`;
    }

    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;

    if (days === 1) return remainingHours > 0 ? `يوم و ${remainingHours} ساعة` : 'يوم واحد';
    return remainingHours > 0 ? `${days} أيام و ${remainingHours} ساعة` : `${days} أيام`;
};

/**
 * حساب الفرق بالدقائق بين تاريخين
 */
const diffInMinutes = (start: string, end: string): number => {
    return (new Date(end).getTime() - new Date(start).getTime()) / 60000;
};

/**
 * حساب الفرق بالساعات
 */
const diffInHours = (start: string, end: string): number => {
    return diffInMinutes(start, end) / 60;
};

// ==================== إدارة البيانات ====================

/**
 * الحصول على جميع بيانات الاستجابة
 */
export const getResponseTimes = (): ResponseTime[] => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
};

/**
 * الحصول على إعدادات SLA
 */
export const getSLAConfigs = (): SLAConfig[] => {
    try {
        const stored = localStorage.getItem(SLA_KEY);
        return stored ? JSON.parse(stored) : DEFAULT_SLA;
    } catch {
        return DEFAULT_SLA;
    }
};

/**
 * تسجيل تذكرة جديدة للتتبع
 */
export const trackNewTicket = (
    ticketId: string,
    department: string,
    priority?: 'low' | 'medium' | 'high' | 'urgent'
): void => {
    const times = getResponseTimes();

    // تجنب التكرار
    if (times.some(t => t.ticketId === ticketId)) return;

    times.push({
        ticketId,
        createdAt: new Date().toISOString(),
        department,
        priority
    });

    localStorage.setItem(STORAGE_KEY, JSON.stringify(times));
};

/**
 * تسجيل الرد الأول
 */
export const trackFirstResponse = (ticketId: string, employeeId?: string): void => {
    const times = getResponseTimes();
    const index = times.findIndex(t => t.ticketId === ticketId);

    if (index !== -1 && !times[index].firstResponseAt) {
        times[index].firstResponseAt = new Date().toISOString();
        if (employeeId) times[index].employeeId = employeeId;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(times));
    }
};

/**
 * تسجيل الحل
 */
export const trackResolution = (ticketId: string): void => {
    const times = getResponseTimes();
    const index = times.findIndex(t => t.ticketId === ticketId);

    if (index !== -1 && !times[index].resolvedAt) {
        times[index].resolvedAt = new Date().toISOString();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(times));
    }
};

/**
 * حساب حالة SLA لتذكرة
 */
export const checkSLAStatus = (ticketId: string): {
    firstResponseStatus: 'ok' | 'warning' | 'breached' | 'pending';
    resolutionStatus: 'ok' | 'warning' | 'breached' | 'pending';
    firstResponseRemaining?: number;
    resolutionRemaining?: number;
} => {
    const times = getResponseTimes();
    const ticket = times.find(t => t.ticketId === ticketId);
    const slaConfigs = getSLAConfigs();

    if (!ticket) {
        return { firstResponseStatus: 'pending', resolutionStatus: 'pending' };
    }

    const sla = slaConfigs.find(s => s.priority === ticket.priority) || slaConfigs[2]; // default to medium
    const now = new Date().toISOString();

    // حالة الرد الأول
    let firstResponseStatus: 'ok' | 'warning' | 'breached' | 'pending' = 'pending';
    let firstResponseRemaining: number | undefined;

    if (ticket.firstResponseAt) {
        const hours = diffInHours(ticket.createdAt, ticket.firstResponseAt);
        firstResponseStatus = hours <= sla.firstResponseHours ? 'ok' : 'breached';
    } else {
        const hours = diffInHours(ticket.createdAt, now);
        firstResponseRemaining = sla.firstResponseHours - hours;

        if (hours >= sla.firstResponseHours) {
            firstResponseStatus = 'breached';
        } else if (hours >= sla.firstResponseHours * 0.75) {
            firstResponseStatus = 'warning';
        } else {
            firstResponseStatus = 'pending';
        }
    }

    // حالة الحل
    let resolutionStatus: 'ok' | 'warning' | 'breached' | 'pending' = 'pending';
    let resolutionRemaining: number | undefined;

    if (ticket.resolvedAt) {
        const hours = diffInHours(ticket.createdAt, ticket.resolvedAt);
        resolutionStatus = hours <= sla.resolutionHours ? 'ok' : 'breached';
    } else {
        const hours = diffInHours(ticket.createdAt, now);
        resolutionRemaining = sla.resolutionHours - hours;

        if (hours >= sla.resolutionHours) {
            resolutionStatus = 'breached';
        } else if (hours >= sla.resolutionHours * 0.75) {
            resolutionStatus = 'warning';
        } else {
            resolutionStatus = 'pending';
        }
    }

    return { firstResponseStatus, resolutionStatus, firstResponseRemaining, resolutionRemaining };
};

/**
 * حساب الإحصائيات
 */
export const calculateMetrics = (
    startDate?: string,
    endDate?: string,
    department?: string
): ResponseMetrics => {
    let times = getResponseTimes();

    // تصفية حسب التاريخ
    if (startDate) {
        times = times.filter(t => t.createdAt >= startDate);
    }
    if (endDate) {
        times = times.filter(t => t.createdAt <= endDate);
    }
    if (department) {
        times = times.filter(t => t.department === department);
    }

    const slaConfigs = getSLAConfigs();
    const now = new Date().toISOString();

    // حساب المتوسطات
    const withFirstResponse = times.filter(t => t.firstResponseAt);
    const resolved = times.filter(t => t.resolvedAt);

    const avgFirstResponse = withFirstResponse.length > 0
        ? withFirstResponse.reduce((sum, t) => sum + diffInMinutes(t.createdAt, t.firstResponseAt!), 0) / withFirstResponse.length
        : 0;

    const avgResolution = resolved.length > 0
        ? resolved.reduce((sum, t) => sum + diffInMinutes(t.createdAt, t.resolvedAt!), 0) / resolved.length
        : 0;

    // حساب الالتزام بـ SLA
    let withinSLA = 0;
    let breachedSLA = 0;

    times.forEach(t => {
        const sla = slaConfigs.find(s => s.priority === t.priority) || slaConfigs[2];
        const responseTime = t.firstResponseAt ? diffInHours(t.createdAt, t.firstResponseAt) : diffInHours(t.createdAt, now);

        if (responseTime <= sla.firstResponseHours) {
            withinSLA++;
        } else {
            breachedSLA++;
        }
    });

    // تجميع حسب الأولوية
    const byPriority: Record<string, { count: number; avgResponse: number }> = {};
    ['urgent', 'high', 'medium', 'low'].forEach(priority => {
        const filtered = withFirstResponse.filter(t => t.priority === priority);
        if (filtered.length > 0) {
            byPriority[priority] = {
                count: filtered.length,
                avgResponse: filtered.reduce((sum, t) => sum + diffInMinutes(t.createdAt, t.firstResponseAt!), 0) / filtered.length
            };
        }
    });

    // تجميع حسب القسم
    const byDepartment: Record<string, { count: number; avgResponse: number }> = {};
    const departments = [...new Set(times.map(t => t.department))];
    departments.forEach(dept => {
        const filtered = withFirstResponse.filter(t => t.department === dept);
        if (filtered.length > 0) {
            byDepartment[dept] = {
                count: filtered.length,
                avgResponse: filtered.reduce((sum, t) => sum + diffInMinutes(t.createdAt, t.firstResponseAt!), 0) / filtered.length
            };
        }
    });

    // تجميع حسب الموظف
    const byEmployee: Record<string, { count: number; avgResponse: number }> = {};
    const employees = [...new Set(withFirstResponse.map(t => t.employeeId).filter(Boolean))];
    employees.forEach(emp => {
        const filtered = withFirstResponse.filter(t => t.employeeId === emp);
        if (filtered.length > 0) {
            byEmployee[emp!] = {
                count: filtered.length,
                avgResponse: filtered.reduce((sum, t) => sum + diffInMinutes(t.createdAt, t.firstResponseAt!), 0) / filtered.length
            };
        }
    });

    // حساب الاتجاهات (آخر 7 أيام)
    const trends: { date: string; avgResponse: number; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        const dayTickets = withFirstResponse.filter(t =>
            t.createdAt.startsWith(dateStr)
        );

        trends.push({
            date: dateStr,
            count: dayTickets.length,
            avgResponse: dayTickets.length > 0
                ? dayTickets.reduce((sum, t) => sum + diffInMinutes(t.createdAt, t.firstResponseAt!), 0) / dayTickets.length
                : 0
        });
    }

    return {
        averageFirstResponse: avgFirstResponse,
        averageResolution: avgResolution,
        slaCompliance: times.length > 0 ? (withinSLA / times.length) * 100 : 100,
        totalTickets: times.length,
        withinSLA,
        breachedSLA,
        pendingResponse: times.filter(t => !t.firstResponseAt).length,
        byPriority,
        byDepartment,
        byEmployee,
        trends
    };
};

// ==================== مكونات React ====================

interface SLABadgeProps {
    ticketId: string;
    showDetails?: boolean;
}

export const SLABadge: React.FC<SLABadgeProps> = ({ ticketId, showDetails = false }) => {
    const status = useMemo(() => checkSLAStatus(ticketId), [ticketId]);

    const getStatusColor = (s: string) => {
        switch (s) {
            case 'ok': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
            case 'warning': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
            case 'breached': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
            default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
        }
    };

    const getStatusIcon = (s: string) => {
        switch (s) {
            case 'ok': return '✅';
            case 'warning': return '⚠️';
            case 'breached': return '❌';
            default: return '⏳';
        }
    };

    return (
        <div className="flex gap-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status.firstResponseStatus)}`}>
                {getStatusIcon(status.firstResponseStatus)} الرد
                {showDetails && status.firstResponseRemaining !== undefined && status.firstResponseStatus !== 'ok' && (
                    <span className="mr-1">
                        ({status.firstResponseRemaining > 0
                            ? `متبقي ${formatDuration(status.firstResponseRemaining * 60)}`
                            : 'متأخر'
                        })
                    </span>
                )}
            </span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status.resolutionStatus)}`}>
                {getStatusIcon(status.resolutionStatus)} الحل
            </span>
        </div>
    );
};

interface ResponseTimeTrackerProps {
    dateRange?: { start: string; end: string };
    department?: string;
}

export const ResponseTimeTracker: React.FC<ResponseTimeTrackerProps> = ({
    dateRange,
    department
}) => {
    const [metrics, setMetrics] = useState<ResponseMetrics | null>(null);
    const [activeTab, setActiveTab] = useState<'overview' | 'departments' | 'employees' | 'sla'>('overview');

    useEffect(() => {
        setMetrics(calculateMetrics(dateRange?.start, dateRange?.end, department));
    }, [dateRange, department]);

    if (!metrics) return null;

    const priorityLabels: Record<string, string> = {
        urgent: 'عاجل',
        high: 'عالي',
        medium: 'متوسط',
        low: 'منخفض'
    };

    return (
        <div className="space-y-6">
            {/* البطاقات الرئيسية */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow border border-gray-200 dark:border-gray-700">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {formatDuration(metrics.averageFirstResponse)}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">متوسط وقت الرد</div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow border border-gray-200 dark:border-gray-700">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {formatDuration(metrics.averageResolution)}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">متوسط وقت الحل</div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow border border-gray-200 dark:border-gray-700">
                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                        {metrics.slaCompliance.toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">نسبة الالتزام</div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow border border-gray-200 dark:border-gray-700">
                    <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                        {metrics.pendingResponse}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">بانتظار الرد</div>
                </div>
            </div>

            {/* التبويبات */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-200 dark:border-gray-700">
                <div className="flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
                    {[
                        { id: 'overview', label: 'نظرة عامة' },
                        { id: 'departments', label: 'حسب القسم' },
                        { id: 'employees', label: 'حسب الموظف' },
                        { id: 'sla', label: 'إعدادات SLA' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as typeof activeTab)}
                            className={`px-4 py-3 font-medium whitespace-nowrap transition-colors ${activeTab === tab.id
                                    ? 'text-blue-600 border-b-2 border-blue-600'
                                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-800'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="p-4">
                    {activeTab === 'overview' && (
                        <div className="space-y-6">
                            {/* SLA Summary */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                    <div className="text-2xl font-bold text-green-600">{metrics.withinSLA}</div>
                                    <div className="text-sm text-green-700 dark:text-green-400">ضمن SLA</div>
                                </div>
                                <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                                    <div className="text-2xl font-bold text-red-600">{metrics.breachedSLA}</div>
                                    <div className="text-sm text-red-700 dark:text-red-400">خارج SLA</div>
                                </div>
                                <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                    <div className="text-2xl font-bold text-gray-600 dark:text-gray-300">{metrics.totalTickets}</div>
                                    <div className="text-sm text-gray-700 dark:text-gray-400">الإجمالي</div>
                                </div>
                            </div>

                            {/* بحسب الأولوية */}
                            <div>
                                <h4 className="font-bold text-gray-800 dark:text-white mb-3">حسب الأولوية</h4>
                                <div className="space-y-2">
                                    {Object.entries(metrics.byPriority).map(([priority, data]) => (
                                        <div key={priority} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                            <span className="font-medium">{priorityLabels[priority] || priority}</span>
                                            <div className="text-left">
                                                <span className="text-blue-600 font-medium">{formatDuration(data.avgResponse)}</span>
                                                <span className="text-gray-500 text-sm mr-2">({data.count} تذكرة)</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* الاتجاهات */}
                            <div>
                                <h4 className="font-bold text-gray-800 dark:text-white mb-3">الاتجاه (آخر 7 أيام)</h4>
                                <div className="h-48 flex items-end gap-2">
                                    {metrics.trends.map((day, i) => (
                                        <div key={i} className="flex-1 flex flex-col items-center">
                                            <div
                                                className="w-full bg-blue-500 rounded-t transition-all"
                                                style={{
                                                    height: `${day.avgResponse > 0
                                                        ? Math.min((day.avgResponse / Math.max(...metrics.trends.map(t => t.avgResponse || 1))) * 100, 100)
                                                        : 5}%`
                                                }}
                                                title={`${formatDuration(day.avgResponse)} - ${day.count} تذكرة`}
                                            />
                                            <span className="text-xs text-gray-500 mt-1">
                                                {new Date(day.date).toLocaleDateString('ar-SY', { weekday: 'short' })}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'departments' && (
                        <div className="space-y-3">
                            {Object.entries(metrics.byDepartment).length === 0 ? (
                                <div className="text-center text-gray-500 py-8">لا توجد بيانات</div>
                            ) : (
                                Object.entries(metrics.byDepartment)
                                    .sort((a, b) => a[1].avgResponse - b[1].avgResponse)
                                    .map(([dept, data]) => (
                                        <div key={dept} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                            <span className="font-medium">{dept}</span>
                                            <div className="flex items-center gap-4">
                                                <span className="text-blue-600 font-medium">{formatDuration(data.avgResponse)}</span>
                                                <span className="text-gray-500 text-sm">{data.count} تذكرة</span>
                                            </div>
                                        </div>
                                    ))
                            )}
                        </div>
                    )}

                    {activeTab === 'employees' && (
                        <div className="space-y-3">
                            {Object.entries(metrics.byEmployee).length === 0 ? (
                                <div className="text-center text-gray-500 py-8">لا توجد بيانات</div>
                            ) : (
                                Object.entries(metrics.byEmployee)
                                    .sort((a, b) => a[1].avgResponse - b[1].avgResponse)
                                    .map(([emp, data]) => (
                                        <div key={emp} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                            <span className="font-medium">{emp}</span>
                                            <div className="flex items-center gap-4">
                                                <span className="text-blue-600 font-medium">{formatDuration(data.avgResponse)}</span>
                                                <span className="text-gray-500 text-sm">{data.count} رد</span>
                                            </div>
                                        </div>
                                    ))
                            )}
                        </div>
                    )}

                    {activeTab === 'sla' && (
                        <SLAConfigManager />
                    )}
                </div>
            </div>
        </div>
    );
};

const SLAConfigManager: React.FC = () => {
    const [configs, setConfigs] = useState<SLAConfig[]>(getSLAConfigs());
    const [editing, setEditing] = useState<string | null>(null);
    const [editValues, setEditValues] = useState<Partial<SLAConfig>>({});

    const handleSave = (id: string) => {
        const updated = configs.map(c =>
            c.id === id ? { ...c, ...editValues } : c
        );
        setConfigs(updated);
        localStorage.setItem(SLA_KEY, JSON.stringify(updated));
        setEditing(null);
    };

    const priorityLabels: Record<string, string> = {
        urgent: 'عاجل',
        high: 'عالي',
        medium: 'متوسط',
        low: 'منخفض'
    };

    return (
        <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                تحديد المدة المسموحة للرد والحل حسب مستوى الأولوية
            </p>

            <div className="space-y-3">
                {configs.map(config => (
                    <div key={config.id} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        {editing === config.id ? (
                            <div className="space-y-3">
                                <div className="flex items-center gap-4">
                                    <span className="font-medium w-24">{priorityLabels[config.priority]}</span>
                                    <div className="flex-1 grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs text-gray-500">الرد الأول (ساعات)</label>
                                            <input
                                                type="number"
                                                value={editValues.firstResponseHours ?? config.firstResponseHours}
                                                onChange={(e) => setEditValues(prev => ({ ...prev, firstResponseHours: Number(e.target.value) }))}
                                                className="w-full px-3 py-2 rounded border dark:bg-gray-600 dark:border-gray-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-500">الحل (ساعات)</label>
                                            <input
                                                type="number"
                                                value={editValues.resolutionHours ?? config.resolutionHours}
                                                onChange={(e) => setEditValues(prev => ({ ...prev, resolutionHours: Number(e.target.value) }))}
                                                className="w-full px-3 py-2 rounded border dark:bg-gray-600 dark:border-gray-500"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="flex justify-end gap-2">
                                    <button
                                        onClick={() => setEditing(null)}
                                        className="px-3 py-1 text-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
                                    >
                                        إلغاء
                                    </button>
                                    <button
                                        onClick={() => handleSave(config.id)}
                                        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                                    >
                                        حفظ
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center justify-between">
                                <span className="font-medium">{priorityLabels[config.priority]}</span>
                                <div className="flex items-center gap-6">
                                    <span className="text-sm">
                                        <span className="text-gray-500">الرد:</span> {config.firstResponseHours} ساعة
                                    </span>
                                    <span className="text-sm">
                                        <span className="text-gray-500">الحل:</span> {config.resolutionHours} ساعة
                                    </span>
                                    <button
                                        onClick={() => {
                                            setEditing(config.id);
                                            setEditValues({});
                                        }}
                                        className="text-blue-600 hover:text-blue-800"
                                    >
                                        ✏️
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

// ==================== Hook ====================
export const useResponseTracking = (ticketId?: string) => {
    const [metrics, setMetrics] = useState<ResponseMetrics | null>(null);
    const [slaStatus, setSlaStatus] = useState<ReturnType<typeof checkSLAStatus> | null>(null);

    useEffect(() => {
        setMetrics(calculateMetrics());
        if (ticketId) {
            setSlaStatus(checkSLAStatus(ticketId));
        }
    }, [ticketId]);

    return {
        metrics,
        slaStatus,
        trackNew: trackNewTicket,
        trackResponse: trackFirstResponse,
        trackResolved: trackResolution,
        checkSLA: checkSLAStatus,
        refresh: () => setMetrics(calculateMetrics())
    };
};
