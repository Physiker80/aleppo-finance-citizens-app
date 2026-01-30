/**
 * لوحة الإحصائيات المتقدمة
 * تحليلات ومخططات شاملة
 */

import React, { useState, useMemo, useEffect } from 'react';
import { PieChart, BarChart, LineChart, StatCard, DonutChart } from '../components/Charts';

// ==================== أنواع البيانات ====================
export interface TicketStats {
    total: number;
    byStatus: Record<string, number>;
    byDepartment: Record<string, number>;
    byRequestType: Record<string, number>;
    byMonth: Array<{ month: string; count: number }>;
    byDay: Array<{ day: string; count: number }>;
    avgResponseTime: number; // بالساعات
    responseRate: number; // نسبة مئوية
}

export interface DashboardData {
    tickets: TicketStats;
    recentActivity: Array<{
        type: string;
        description: string;
        timestamp: Date;
    }>;
    performance: {
        today: number;
        thisWeek: number;
        thisMonth: number;
        trend: 'up' | 'down' | 'stable';
        trendPercentage: number;
    };
}

// ==================== حساب الإحصائيات ====================
export const calculateTicketStats = (tickets: Array<{
    id: string;
    status: string;
    department: string;
    requestType: string;
    createdAt: Date;
    answeredAt?: Date;
}>): TicketStats => {
    const stats: TicketStats = {
        total: tickets.length,
        byStatus: {},
        byDepartment: {},
        byRequestType: {},
        byMonth: [],
        byDay: [],
        avgResponseTime: 0,
        responseRate: 0
    };

    // تجميع حسب الحالة
    tickets.forEach(ticket => {
        stats.byStatus[ticket.status] = (stats.byStatus[ticket.status] || 0) + 1;
        stats.byDepartment[ticket.department] = (stats.byDepartment[ticket.department] || 0) + 1;
        stats.byRequestType[ticket.requestType] = (stats.byRequestType[ticket.requestType] || 0) + 1;
    });

    // تجميع حسب الشهر
    const monthCounts: Record<string, number> = {};
    const dayCounts: Record<string, number> = {};

    tickets.forEach(ticket => {
        const date = new Date(ticket.createdAt);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const dayKey = date.toLocaleDateString('ar-SY', { weekday: 'short' });

        monthCounts[monthKey] = (monthCounts[monthKey] || 0) + 1;
        dayCounts[dayKey] = (dayCounts[dayKey] || 0) + 1;
    });

    stats.byMonth = Object.entries(monthCounts)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-6)
        .map(([month, count]) => ({ month, count }));

    stats.byDay = Object.entries(dayCounts)
        .map(([day, count]) => ({ day, count }));

    // حساب متوسط وقت الاستجابة
    const answeredTickets = tickets.filter(t => t.answeredAt);
    if (answeredTickets.length > 0) {
        const totalResponseTime = answeredTickets.reduce((sum, t) => {
            const responseTime = new Date(t.answeredAt!).getTime() - new Date(t.createdAt).getTime();
            return sum + responseTime;
        }, 0);
        stats.avgResponseTime = Math.round(totalResponseTime / answeredTickets.length / (1000 * 60 * 60)); // بالساعات
    }

    // نسبة الرد
    const closedOrAnswered = (stats.byStatus['Answered'] || 0) + (stats.byStatus['Closed'] || 0);
    stats.responseRate = stats.total > 0 ? Math.round((closedOrAnswered / stats.total) * 100) : 0;

    return stats;
};

// ==================== ألوان الحالات ====================
const STATUS_COLORS: Record<string, string> = {
    'New': '#3b82f6',
    'InProgress': '#f59e0b',
    'Answered': '#10b981',
    'Closed': '#6b7280',
    'جديد': '#3b82f6',
    'قيد المعالجة': '#f59e0b',
    'تم الرد': '#10b981',
    'مغلق': '#6b7280'
};

const STATUS_LABELS: Record<string, string> = {
    'New': 'جديد',
    'InProgress': 'قيد المعالجة',
    'Answered': 'تم الرد',
    'Closed': 'مغلق'
};

// ==================== مكونات اللوحة ====================

interface StatsSummaryProps {
    stats: TicketStats;
    previousStats?: TicketStats;
}

export const StatsSummary: React.FC<StatsSummaryProps> = ({ stats, previousStats }) => {
    const getTrend = (current: number, previous?: number): { direction: 'up' | 'down' | 'stable'; percentage: number } => {
        if (!previous || previous === 0) return { direction: 'stable', percentage: 0 };
        const diff = ((current - previous) / previous) * 100;
        return {
            direction: diff > 0 ? 'up' : diff < 0 ? 'down' : 'stable',
            percentage: Math.abs(Math.round(diff))
        };
    };

    const totalTrend = getTrend(stats.total, previousStats?.total);
    const responseTrend = getTrend(stats.responseRate, previousStats?.responseRate);

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard
                title="إجمالي التذاكر"
                value={stats.total}
                icon="📋"
                trend={totalTrend.direction}
                trendValue={`${totalTrend.percentage}%`}
                color="blue"
            />
            <StatCard
                title="نسبة الإنجاز"
                value={`${stats.responseRate}%`}
                icon="✅"
                trend={responseTrend.direction}
                trendValue={`${responseTrend.percentage}%`}
                color="green"
            />
            <StatCard
                title="متوسط الاستجابة"
                value={`${stats.avgResponseTime} ساعة`}
                icon="⏱️"
                color="orange"
            />
            <StatCard
                title="تذاكر جديدة"
                value={stats.byStatus['New'] || 0}
                icon="🆕"
                color="purple"
            />
        </div>
    );
};

interface StatusChartsProps {
    stats: TicketStats;
}

export const StatusCharts: React.FC<StatusChartsProps> = ({ stats }) => {
    const statusData = Object.entries(stats.byStatus).map(([status, count]) => ({
        label: STATUS_LABELS[status] || status,
        value: count,
        color: STATUS_COLORS[status] || '#6b7280'
    }));

    const departmentData = Object.entries(stats.byDepartment)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([dept, count]) => ({
            label: dept,
            value: count
        }));

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">توزيع الحالات</h3>
                <DonutChart
                    data={statusData}
                    size={200}
                    centerLabel={`${stats.total}`}
                    centerSubLabel="تذكرة"
                />
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">التذاكر حسب القسم</h3>
                <BarChart
                    data={departmentData}
                    height={200}
                    horizontal={true}
                />
            </div>
        </div>
    );
};

interface TrendChartsProps {
    stats: TicketStats;
}

export const TrendCharts: React.FC<TrendChartsProps> = ({ stats }) => {
    const monthlyData = stats.byMonth.map(m => ({
        label: m.month.split('-')[1], // الشهر فقط
        value: m.count
    }));

    const requestTypeData = Object.entries(stats.byRequestType)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 6)
        .map(([type, count]) => ({
            label: type,
            value: count
        }));

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">التذاكر الشهرية</h3>
                <LineChart
                    data={monthlyData}
                    height={200}
                    showArea={true}
                    color="#3b82f6"
                />
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">أنواع الطلبات</h3>
                <PieChart
                    data={requestTypeData}
                    size={200}
                    showLegend={true}
                />
            </div>
        </div>
    );
};

interface PerformanceMetricsProps {
    stats: TicketStats;
    tickets: Array<{ createdAt: Date; status: string }>;
}

export const PerformanceMetrics: React.FC<PerformanceMetricsProps> = ({ stats, tickets }) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    const todayCount = tickets.filter(t => new Date(t.createdAt) >= today).length;
    const weekCount = tickets.filter(t => new Date(t.createdAt) >= weekAgo).length;
    const monthCount = tickets.filter(t => new Date(t.createdAt) >= monthAgo).length;

    const pendingCount = (stats.byStatus['New'] || 0) + (stats.byStatus['InProgress'] || 0);
    const closedThisWeek = tickets.filter(t =>
        new Date(t.createdAt) >= weekAgo && t.status === 'Closed'
    ).length;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700 mb-6">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">مؤشرات الأداء</h3>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                    <div className="text-3xl font-bold text-blue-600">{todayCount}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">اليوم</div>
                </div>
                <div className="text-center p-4 bg-green-50 dark:bg-green-900/30 rounded-lg">
                    <div className="text-3xl font-bold text-green-600">{weekCount}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">هذا الأسبوع</div>
                </div>
                <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
                    <div className="text-3xl font-bold text-purple-600">{monthCount}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">هذا الشهر</div>
                </div>
                <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/30 rounded-lg">
                    <div className="text-3xl font-bold text-orange-600">{pendingCount}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">قيد الانتظار</div>
                </div>
                <div className="text-center p-4 bg-teal-50 dark:bg-teal-900/30 rounded-lg">
                    <div className="text-3xl font-bold text-teal-600">{closedThisWeek}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">مغلقة هذا الأسبوع</div>
                </div>
            </div>
        </div>
    );
};

// ==================== اللوحة الرئيسية ====================

interface AdvancedDashboardProps {
    tickets: Array<{
        id: string;
        status: string;
        department: string;
        requestType: string;
        createdAt: Date;
        answeredAt?: Date;
    }>;
}

export const AdvancedDashboard: React.FC<AdvancedDashboardProps> = ({ tickets }) => {
    const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year' | 'all'>('month');
    const [refreshKey, setRefreshKey] = useState(0);

    // تصفية التذاكر حسب النطاق الزمني
    const filteredTickets = useMemo(() => {
        const now = new Date();
        let cutoffDate: Date;

        switch (timeRange) {
            case 'week':
                cutoffDate = new Date(now.setDate(now.getDate() - 7));
                break;
            case 'month':
                cutoffDate = new Date(now.setMonth(now.getMonth() - 1));
                break;
            case 'year':
                cutoffDate = new Date(now.setFullYear(now.getFullYear() - 1));
                break;
            default:
                return tickets;
        }

        return tickets.filter(t => new Date(t.createdAt) >= cutoffDate);
    }, [tickets, timeRange]);

    const stats = useMemo(() => calculateTicketStats(filteredTickets), [filteredTickets, refreshKey]);

    const handleRefresh = () => {
        setRefreshKey(prev => prev + 1);
    };

    return (
        <div className="space-y-6">
            {/* شريط الأدوات */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-gray-800 rounded-xl p-4 shadow border border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                    📊 لوحة الإحصائيات المتقدمة
                </h2>

                <div className="flex items-center gap-3">
                    {/* اختيار النطاق الزمني */}
                    <select
                        value={timeRange}
                        onChange={(e) => setTimeRange(e.target.value as typeof timeRange)}
                        className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    >
                        <option value="week">آخر أسبوع</option>
                        <option value="month">آخر شهر</option>
                        <option value="year">آخر سنة</option>
                        <option value="all">الكل</option>
                    </select>

                    {/* زر التحديث */}
                    <button
                        onClick={handleRefresh}
                        className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        title="تحديث"
                    >
                        🔄
                    </button>
                </div>
            </div>

            {/* الملخص */}
            <StatsSummary stats={stats} />

            {/* مخططات الحالة */}
            <StatusCharts stats={stats} />

            {/* مخططات الاتجاهات */}
            <TrendCharts stats={stats} />

            {/* مؤشرات الأداء */}
            <PerformanceMetrics stats={stats} tickets={filteredTickets} />

            {/* ملاحظة */}
            <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                آخر تحديث: {new Date().toLocaleString('ar-SY')}
            </div>
        </div>
    );
};

// ==================== Hook للاستخدام ====================
export const useDashboardStats = (tickets: Array<any>) => {
    const [stats, setStats] = useState<TicketStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        const calculated = calculateTicketStats(tickets);
        setStats(calculated);
        setLoading(false);
    }, [tickets]);

    return { stats, loading };
};
