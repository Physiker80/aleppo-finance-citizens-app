// =====================================================
// 🎛️ Admin Dashboard System
// لوحة تحكم إدارية شاملة
// =====================================================

import { Ticket, RequestStatus, Employee } from '../types';

export interface DashboardMetrics {
    // إحصائيات عامة
    totalTickets: number;
    newTickets: number;
    inProgressTickets: number;
    answeredTickets: number;
    closedTickets: number;

    // معدلات الأداء
    averageResponseTime: number; // بالساعات
    averageResolutionTime: number; // بالساعات
    slaComplianceRate: number; // نسبة مئوية
    customerSatisfaction: number; // من 5

    // مقارنات زمنية
    ticketsToday: number;
    ticketsThisWeek: number;
    ticketsThisMonth: number;
    changeFromLastWeek: number; // نسبة التغيير
    changeFromLastMonth: number;

    // إحصائيات حسب القسم
    byDepartment: DepartmentStats[];

    // إحصائيات حسب الموظف
    byEmployee: EmployeeStats[];

    // أعلى الشكاوى
    topCategories: { name: string; count: number }[];

    // الشكاوى المتأخرة
    overdueTickets: number;
    urgentTickets: number;
}

export interface DepartmentStats {
    name: string;
    totalTickets: number;
    openTickets: number;
    closedTickets: number;
    avgResponseTime: number;
    slaCompliance: number;
}

export interface EmployeeStats {
    id: string;
    name: string;
    department: string;
    ticketsHandled: number;
    ticketsResolved: number;
    avgResponseTime: number;
    avgResolutionTime: number;
    satisfaction: number;
    performance: 'excellent' | 'good' | 'average' | 'needsImprovement';
}

export interface TimeSeriesData {
    date: string;
    newTickets: number;
    resolvedTickets: number;
    pending: number;
}

/**
 * حساب مقاييس لوحة التحكم
 */
export function calculateDashboardMetrics(
    tickets: Ticket[],
    employees: Employee[]
): DashboardMetrics {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const lastWeekStart = new Date(weekAgo.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastMonthStart = new Date(monthAgo.getTime() - 30 * 24 * 60 * 60 * 1000);

    // إحصائيات أساسية
    const newTickets = tickets.filter(t => t.status === RequestStatus.New).length;
    const inProgressTickets = tickets.filter(t => t.status === RequestStatus.InProgress).length;
    const answeredTickets = tickets.filter(t => t.status === RequestStatus.Answered).length;
    const closedTickets = tickets.filter(t => t.status === RequestStatus.Closed).length;

    // شكاوى حسب الفترة
    const ticketsToday = tickets.filter(t => new Date(t.createdAt) >= today).length;
    const ticketsThisWeek = tickets.filter(t => new Date(t.createdAt) >= weekAgo).length;
    const ticketsThisMonth = tickets.filter(t => new Date(t.createdAt) >= monthAgo).length;

    const ticketsLastWeek = tickets.filter(t => {
        const date = new Date(t.createdAt);
        return date >= lastWeekStart && date < weekAgo;
    }).length;

    const ticketsLastMonth = tickets.filter(t => {
        const date = new Date(t.createdAt);
        return date >= lastMonthStart && date < monthAgo;
    }).length;

    // حساب أوقات الاستجابة
    const resolvedTickets = tickets.filter(t => t.answeredAt);
    const responseTimes = resolvedTickets.map(t => {
        const created = new Date(t.createdAt).getTime();
        const answered = new Date(t.answeredAt!).getTime();
        return (answered - created) / (1000 * 60 * 60); // بالساعات
    });

    const avgResponseTime = responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : 0;

    const resolutionTimes = tickets
        .filter(t => t.status === RequestStatus.Closed && t.closedAt)
        .map(t => {
            const created = new Date(t.createdAt).getTime();
            const closed = new Date(t.closedAt!).getTime();
            return (closed - created) / (1000 * 60 * 60);
        });

    const avgResolutionTime = resolutionTimes.length > 0
        ? resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length
        : 0;

    // حساب SLA (افتراضي 24 ساعة للرد)
    const slaThreshold = 24; // ساعات
    const onTimeResponses = responseTimes.filter(t => t <= slaThreshold).length;
    const slaComplianceRate = resolvedTickets.length > 0
        ? (onTimeResponses / resolvedTickets.length) * 100
        : 100;

    // شكاوى متأخرة وعاجلة
    const overdueThreshold = 48 * 60 * 60 * 1000; // 48 ساعة
    const overdueTickets = tickets.filter(t => {
        if (t.status === RequestStatus.Closed) return false;
        const age = now.getTime() - new Date(t.createdAt).getTime();
        return age > overdueThreshold;
    }).length;

    const urgentTickets = tickets.filter(t =>
        t.status !== RequestStatus.Closed && t.priority === 'عاجل'
    ).length;

    // إحصائيات الأقسام
    const departmentMap = new Map<string, Ticket[]>();
    tickets.forEach(t => {
        const dept = t.department || 'غير محدد';
        if (!departmentMap.has(dept)) {
            departmentMap.set(dept, []);
        }
        departmentMap.get(dept)!.push(t);
    });

    const byDepartment: DepartmentStats[] = Array.from(departmentMap.entries()).map(([name, deptTickets]) => {
        const open = deptTickets.filter(t => t.status !== RequestStatus.Closed).length;
        const closed = deptTickets.filter(t => t.status === RequestStatus.Closed).length;

        const deptResponseTimes = deptTickets
            .filter(t => t.answeredAt)
            .map(t => (new Date(t.answeredAt!).getTime() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60));

        const avgResp = deptResponseTimes.length > 0
            ? deptResponseTimes.reduce((a, b) => a + b, 0) / deptResponseTimes.length
            : 0;

        const onTime = deptResponseTimes.filter(t => t <= slaThreshold).length;
        const sla = deptResponseTimes.length > 0 ? (onTime / deptResponseTimes.length) * 100 : 100;

        return {
            name,
            totalTickets: deptTickets.length,
            openTickets: open,
            closedTickets: closed,
            avgResponseTime: avgResp,
            slaCompliance: sla
        };
    }).sort((a, b) => b.totalTickets - a.totalTickets);

    // إحصائيات الموظفين
    const byEmployee: EmployeeStats[] = employees
        .filter(e => e.role !== 'مدير')
        .map(emp => {
            const empTickets = tickets.filter(t =>
                t.assignedTo === emp.username || t.handledBy === emp.username
            );

            const resolved = empTickets.filter(t => t.status === RequestStatus.Closed);

            const empResponseTimes = empTickets
                .filter(t => t.answeredAt)
                .map(t => (new Date(t.answeredAt!).getTime() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60));

            const empResolutionTimes = resolved
                .filter(t => t.closedAt)
                .map(t => (new Date(t.closedAt!).getTime() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60));

            const avgResp = empResponseTimes.length > 0
                ? empResponseTimes.reduce((a, b) => a + b, 0) / empResponseTimes.length
                : 0;

            const avgRes = empResolutionTimes.length > 0
                ? empResolutionTimes.reduce((a, b) => a + b, 0) / empResolutionTimes.length
                : 0;

            // تقييم الأداء
            let performance: EmployeeStats['performance'] = 'average';
            if (avgResp <= 12 && resolved.length >= 10) performance = 'excellent';
            else if (avgResp <= 24 && resolved.length >= 5) performance = 'good';
            else if (avgResp > 48 || resolved.length < 2) performance = 'needsImprovement';

            return {
                id: emp.username,
                name: emp.name || emp.username,
                department: emp.department || 'غير محدد',
                ticketsHandled: empTickets.length,
                ticketsResolved: resolved.length,
                avgResponseTime: avgResp,
                avgResolutionTime: avgRes,
                satisfaction: 4.2, // يمكن حسابها من التقييمات
                performance
            };
        })
        .sort((a, b) => b.ticketsResolved - a.ticketsResolved);

    // أعلى التصنيفات
    const categoryMap = new Map<string, number>();
    tickets.forEach(t => {
        const category = t.category || t.requestType || 'غير محدد';
        categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
    });

    const topCategories = Array.from(categoryMap.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

    return {
        totalTickets: tickets.length,
        newTickets,
        inProgressTickets,
        answeredTickets,
        closedTickets,
        averageResponseTime: avgResponseTime,
        averageResolutionTime: avgResolutionTime,
        slaComplianceRate,
        customerSatisfaction: 4.2,
        ticketsToday,
        ticketsThisWeek,
        ticketsThisMonth,
        changeFromLastWeek: ticketsLastWeek > 0
            ? ((ticketsThisWeek - ticketsLastWeek) / ticketsLastWeek) * 100
            : 0,
        changeFromLastMonth: ticketsLastMonth > 0
            ? ((ticketsThisMonth - ticketsLastMonth) / ticketsLastMonth) * 100
            : 0,
        byDepartment,
        byEmployee,
        topCategories,
        overdueTickets,
        urgentTickets
    };
}

/**
 * إنشاء بيانات السلسلة الزمنية
 */
export function generateTimeSeriesData(tickets: Ticket[], days: number = 30): TimeSeriesData[] {
    const data: TimeSeriesData[] = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        const dateStr = date.toLocaleDateString('ar-SY', { month: 'short', day: 'numeric' });
        const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

        const newTickets = tickets.filter(t => {
            const created = new Date(t.createdAt);
            return created >= dayStart && created < dayEnd;
        }).length;

        const resolvedTickets = tickets.filter(t => {
            if (!t.closedAt) return false;
            const closed = new Date(t.closedAt);
            return closed >= dayStart && closed < dayEnd;
        }).length;

        const pending = tickets.filter(t => {
            const created = new Date(t.createdAt);
            return created < dayEnd && t.status !== RequestStatus.Closed;
        }).length;

        data.push({ date: dateStr, newTickets, resolvedTickets, pending });
    }

    return data;
}

/**
 * حساب التوقعات
 */
export function predictNextWeekTickets(tickets: Ticket[]): number {
    const weeklyData: number[] = [];
    const now = new Date();

    // جمع بيانات الأسابيع الأربعة الماضية
    for (let i = 0; i < 4; i++) {
        const weekStart = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
        const weekEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);

        const count = tickets.filter(t => {
            const date = new Date(t.createdAt);
            return date >= weekStart && date < weekEnd;
        }).length;

        weeklyData.push(count);
    }

    // متوسط بسيط مع وزن للأسابيع الأخيرة
    const weights = [0.4, 0.3, 0.2, 0.1];
    const prediction = weeklyData.reduce((sum, val, i) => sum + val * weights[i], 0);

    return Math.round(prediction);
}

/**
 * تحديد حالة النظام
 */
export function getSystemHealth(metrics: DashboardMetrics): {
    status: 'healthy' | 'warning' | 'critical';
    message: string;
    issues: string[];
} {
    const issues: string[] = [];

    if (metrics.overdueTickets > 10) {
        issues.push(`${metrics.overdueTickets} شكوى متأخرة تحتاج متابعة`);
    }

    if (metrics.slaComplianceRate < 80) {
        issues.push(`نسبة الالتزام بـ SLA منخفضة (${metrics.slaComplianceRate.toFixed(1)}%)`);
    }

    if (metrics.averageResponseTime > 48) {
        issues.push(`متوسط وقت الاستجابة مرتفع (${metrics.averageResponseTime.toFixed(1)} ساعة)`);
    }

    if (metrics.urgentTickets > 5) {
        issues.push(`${metrics.urgentTickets} شكوى عاجلة معلقة`);
    }

    if (issues.length === 0) {
        return { status: 'healthy', message: 'النظام يعمل بشكل جيد', issues: [] };
    } else if (issues.length <= 2) {
        return { status: 'warning', message: 'يوجد بعض التحسينات المطلوبة', issues };
    } else {
        return { status: 'critical', message: 'النظام يحتاج اهتمام فوري', issues };
    }
}

/**
 * تصدير المقاييس للتقارير
 */
export function exportMetricsForReport(metrics: DashboardMetrics): Record<string, unknown> {
    return {
        summary: {
            total: metrics.totalTickets,
            new: metrics.newTickets,
            inProgress: metrics.inProgressTickets,
            answered: metrics.answeredTickets,
            closed: metrics.closedTickets
        },
        performance: {
            avgResponseTime: `${metrics.averageResponseTime.toFixed(1)} ساعة`,
            avgResolutionTime: `${metrics.averageResolutionTime.toFixed(1)} ساعة`,
            slaCompliance: `${metrics.slaComplianceRate.toFixed(1)}%`,
            satisfaction: `${metrics.customerSatisfaction}/5`
        },
        trends: {
            today: metrics.ticketsToday,
            thisWeek: metrics.ticketsThisWeek,
            thisMonth: metrics.ticketsThisMonth,
            weeklyChange: `${metrics.changeFromLastWeek > 0 ? '+' : ''}${metrics.changeFromLastWeek.toFixed(1)}%`,
            monthlyChange: `${metrics.changeFromLastMonth > 0 ? '+' : ''}${metrics.changeFromLastMonth.toFixed(1)}%`
        },
        alerts: {
            overdue: metrics.overdueTickets,
            urgent: metrics.urgentTickets
        },
        departments: metrics.byDepartment,
        employees: metrics.byEmployee,
        topCategories: metrics.topCategories
    };
}

export default {
    calculateDashboardMetrics,
    generateTimeSeriesData,
    predictNextWeekTickets,
    getSystemHealth,
    exportMetricsForReport
};
