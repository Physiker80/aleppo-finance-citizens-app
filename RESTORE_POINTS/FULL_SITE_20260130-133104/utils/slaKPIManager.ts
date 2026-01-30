// =====================================================
// 📊 SLA & KPIs Manager
// نظام مستوى الخدمة ومؤشرات الأداء الرئيسية
// =====================================================

import { Ticket, RequestStatus } from '../types';

export interface SLAConfig {
    /** وقت الاستجابة الأولى (بالساعات) */
    firstResponseTime: number;
    /** وقت الحل (بالساعات) */
    resolutionTime: number;
    /** وقت التصعيد (بالساعات) */
    escalationTime: number;
    /** أيام العمل فقط */
    businessDaysOnly: boolean;
    /** ساعات العمل اليومية */
    businessHours: { start: number; end: number };
}

export interface SLAResult {
    ticketId: string;
    slaType: 'first-response' | 'resolution';
    targetTime: Date;
    actualTime?: Date;
    breached: boolean;
    remainingMinutes: number;
    percentUsed: number;
}

export interface KPIMetrics {
    // مؤشرات الحجم
    totalTickets: number;
    newTickets: number;
    closedTickets: number;
    openTickets: number;

    // مؤشرات الوقت
    avgFirstResponseTime: number; // بالدقائق
    avgResolutionTime: number; // بالدقائق

    // مؤشرات الجودة
    slaCompliance: number; // نسبة مئوية
    customerSatisfaction: number; // نسبة مئوية
    firstContactResolution: number; // نسبة مئوية

    // مؤشرات الكفاءة
    ticketsPerEmployee: number;
    reopenRate: number; // نسبة مئوية

    // توزيع حسب القسم
    byDepartment: Record<string, DepartmentKPIs>;

    // توزيع حسب النوع
    byType: Record<string, number>;

    // اتجاهات
    trends: TrendData[];
}

export interface DepartmentKPIs {
    department: string;
    totalTickets: number;
    avgResponseTime: number;
    slaCompliance: number;
    closedTickets: number;
    openTickets: number;
}

export interface TrendData {
    date: string;
    newTickets: number;
    closedTickets: number;
    avgResponseTime: number;
}

// الإعدادات الافتراضية
const DEFAULT_SLA: SLAConfig = {
    firstResponseTime: 4, // 4 ساعات
    resolutionTime: 48, // يومين
    escalationTime: 24, // يوم واحد
    businessDaysOnly: true,
    businessHours: { start: 8, end: 16 } // 8 صباحاً - 4 مساءً
};

class SLAKPIManager {
    private config: SLAConfig;

    constructor(config: Partial<SLAConfig> = {}) {
        this.config = { ...DEFAULT_SLA, ...config };
    }

    /**
     * تحديث الإعدادات
     */
    updateConfig(config: Partial<SLAConfig>): void {
        this.config = { ...this.config, ...config };
    }

    /**
     * حساب وقت SLA المستهدف
     */
    calculateTargetTime(startDate: Date, hours: number): Date {
        const target = new Date(startDate);

        if (!this.config.businessDaysOnly) {
            target.setHours(target.getHours() + hours);
            return target;
        }

        let remainingHours = hours;
        const { start, end } = this.config.businessHours;
        const hoursPerDay = end - start;

        while (remainingHours > 0) {
            const dayOfWeek = target.getDay();

            // تخطي أيام العطلة (الجمعة والسبت في سوريا)
            if (dayOfWeek === 5 || dayOfWeek === 6) {
                target.setDate(target.getDate() + 1);
                target.setHours(start, 0, 0, 0);
                continue;
            }

            const currentHour = target.getHours();

            if (currentHour < start) {
                target.setHours(start, 0, 0, 0);
            } else if (currentHour >= end) {
                target.setDate(target.getDate() + 1);
                target.setHours(start, 0, 0, 0);
                continue;
            }

            const availableToday = end - Math.max(currentHour, start);

            if (remainingHours <= availableToday) {
                target.setHours(target.getHours() + remainingHours);
                remainingHours = 0;
            } else {
                remainingHours -= availableToday;
                target.setDate(target.getDate() + 1);
                target.setHours(start, 0, 0, 0);
            }
        }

        return target;
    }

    /**
     * التحقق من SLA للطلب
     */
    checkSLA(ticket: Ticket): SLAResult[] {
        const results: SLAResult[] = [];
        const submissionDate = new Date(ticket.submissionDate);
        const now = new Date();

        // SLA الاستجابة الأولى
        const firstResponseTarget = this.calculateTargetTime(
            submissionDate,
            this.config.firstResponseTime
        );

        const hasResponse = ticket.status !== RequestStatus.New;
        const responseDate = ticket.startedAt ? new Date(ticket.startedAt) : null;

        results.push({
            ticketId: ticket.id,
            slaType: 'first-response',
            targetTime: firstResponseTarget,
            actualTime: responseDate || undefined,
            breached: hasResponse
                ? (responseDate! > firstResponseTarget)
                : (now > firstResponseTarget),
            remainingMinutes: Math.max(0, (firstResponseTarget.getTime() - now.getTime()) / 60000),
            percentUsed: Math.min(100, ((now.getTime() - submissionDate.getTime()) / (firstResponseTarget.getTime() - submissionDate.getTime())) * 100)
        });

        // SLA الحل
        const resolutionTarget = this.calculateTargetTime(
            submissionDate,
            this.config.resolutionTime
        );

        const isClosed = ticket.status === RequestStatus.Closed || ticket.status === RequestStatus.Answered;
        const closedDate = ticket.closedAt ? new Date(ticket.closedAt) :
            ticket.answeredAt ? new Date(ticket.answeredAt) : null;

        results.push({
            ticketId: ticket.id,
            slaType: 'resolution',
            targetTime: resolutionTarget,
            actualTime: closedDate || undefined,
            breached: isClosed
                ? (closedDate! > resolutionTarget)
                : (now > resolutionTarget),
            remainingMinutes: Math.max(0, (resolutionTarget.getTime() - now.getTime()) / 60000),
            percentUsed: Math.min(100, ((now.getTime() - submissionDate.getTime()) / (resolutionTarget.getTime() - submissionDate.getTime())) * 100)
        });

        return results;
    }

    /**
     * حساب مؤشرات الأداء
     */
    calculateKPIs(tickets: Ticket[], employeeCount: number = 1): KPIMetrics {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        // تصفية الطلبات الحديثة
        const recentTickets = tickets.filter(t => new Date(t.submissionDate) >= thirtyDaysAgo);

        // مؤشرات الحجم
        const totalTickets = recentTickets.length;
        const newTickets = recentTickets.filter(t => t.status === RequestStatus.New).length;
        const closedTickets = recentTickets.filter(t =>
            t.status === RequestStatus.Closed || t.status === RequestStatus.Answered
        ).length;
        const openTickets = totalTickets - closedTickets;

        // حساب أوقات الاستجابة
        const responseTimes: number[] = [];
        const resolutionTimes: number[] = [];
        let slaBreaches = 0;

        for (const ticket of recentTickets) {
            const submission = new Date(ticket.submissionDate);

            // وقت الاستجابة الأولى
            if (ticket.startedAt) {
                const responseTime = (new Date(ticket.startedAt).getTime() - submission.getTime()) / 60000;
                responseTimes.push(responseTime);
            }

            // وقت الحل
            if (ticket.answeredAt || ticket.closedAt) {
                const endTime = ticket.closedAt || ticket.answeredAt;
                const resolutionTime = (new Date(endTime!).getTime() - submission.getTime()) / 60000;
                resolutionTimes.push(resolutionTime);
            }

            // فحص SLA
            const slaResults = this.checkSLA(ticket);
            if (slaResults.some(r => r.breached)) {
                slaBreaches++;
            }
        }

        // حساب المتوسطات
        const avgFirstResponseTime = responseTimes.length > 0
            ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
            : 0;

        const avgResolutionTime = resolutionTimes.length > 0
            ? resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length
            : 0;

        // نسبة الالتزام بـ SLA
        const slaCompliance = totalTickets > 0
            ? ((totalTickets - slaBreaches) / totalTickets) * 100
            : 100;

        // توزيع حسب القسم
        const byDepartment: Record<string, DepartmentKPIs> = {};
        for (const ticket of recentTickets) {
            const dept = ticket.department || 'غير محدد';
            if (!byDepartment[dept]) {
                byDepartment[dept] = {
                    department: dept,
                    totalTickets: 0,
                    avgResponseTime: 0,
                    slaCompliance: 100,
                    closedTickets: 0,
                    openTickets: 0
                };
            }
            byDepartment[dept].totalTickets++;
            if (ticket.status === RequestStatus.Closed || ticket.status === RequestStatus.Answered) {
                byDepartment[dept].closedTickets++;
            } else {
                byDepartment[dept].openTickets++;
            }
        }

        // توزيع حسب النوع
        const byType: Record<string, number> = {};
        for (const ticket of recentTickets) {
            const type = ticket.requestType || 'غير محدد';
            byType[type] = (byType[type] || 0) + 1;
        }

        // بيانات الاتجاهات (آخر 7 أيام)
        const trends: TrendData[] = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];

            const dayTickets = recentTickets.filter(t => {
                const tDate = new Date(t.submissionDate).toISOString().split('T')[0];
                return tDate === dateStr;
            });

            const dayClosed = dayTickets.filter(t =>
                t.status === RequestStatus.Closed || t.status === RequestStatus.Answered
            ).length;

            trends.push({
                date: dateStr,
                newTickets: dayTickets.length,
                closedTickets: dayClosed,
                avgResponseTime: 0 // يمكن حسابها بشكل أدق
            });
        }

        return {
            totalTickets,
            newTickets,
            closedTickets,
            openTickets,
            avgFirstResponseTime,
            avgResolutionTime,
            slaCompliance,
            customerSatisfaction: 85, // يمكن ربطها بنظام التقييم
            firstContactResolution: closedTickets > 0 ? (closedTickets / totalTickets) * 100 : 0,
            ticketsPerEmployee: totalTickets / Math.max(1, employeeCount),
            reopenRate: 0, // يتطلب تتبع إعادة فتح الطلبات
            byDepartment,
            byType,
            trends
        };
    }

    /**
     * الحصول على الطلبات المتأخرة
     */
    getOverdueTickets(tickets: Ticket[]): Ticket[] {
        return tickets.filter(ticket => {
            if (ticket.status === RequestStatus.Closed || ticket.status === RequestStatus.Answered) {
                return false;
            }
            const slaResults = this.checkSLA(ticket);
            return slaResults.some(r => r.breached);
        });
    }

    /**
     * الحصول على الطلبات القريبة من التأخر
     */
    getAtRiskTickets(tickets: Ticket[], thresholdPercent: number = 80): Ticket[] {
        return tickets.filter(ticket => {
            if (ticket.status === RequestStatus.Closed || ticket.status === RequestStatus.Answered) {
                return false;
            }
            const slaResults = this.checkSLA(ticket);
            return slaResults.some(r => r.percentUsed >= thresholdPercent && !r.breached);
        });
    }

    /**
     * تصنيف الأولوية بناءً على SLA
     */
    getPriorityLevel(ticket: Ticket): 'critical' | 'high' | 'medium' | 'low' {
        const slaResults = this.checkSLA(ticket);
        const resolutionSLA = slaResults.find(r => r.slaType === 'resolution');

        if (!resolutionSLA) return 'medium';

        if (resolutionSLA.breached) return 'critical';
        if (resolutionSLA.percentUsed >= 80) return 'high';
        if (resolutionSLA.percentUsed >= 50) return 'medium';
        return 'low';
    }

    /**
     * الحصول على الإعدادات الحالية
     */
    getConfig(): SLAConfig {
        return { ...this.config };
    }
}

// Export singleton
export const slaKPIManager = new SLAKPIManager();

export default slaKPIManager;
