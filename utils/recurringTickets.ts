// =====================================================
// 🔄 Recurring Tickets System
// نظام الشكاوى المتكررة
// =====================================================

export interface RecurringTicket {
    id: string;
    title: string;
    description: string;
    department: string;
    category: string;
    frequency: RecurrenceFrequency;
    startDate: number;
    endDate?: number;
    nextRunDate: number;
    lastRunDate?: number;
    isActive: boolean;
    runCount: number;
    maxRuns?: number;
    createdBy: string;
    createdAt: number;
    updatedAt: number;
    metadata?: Record<string, unknown>;
}

export type RecurrenceFrequency =
    | 'daily'
    | 'weekly'
    | 'biweekly'
    | 'monthly'
    | 'quarterly'
    | 'yearly'
    | 'custom';

export interface CustomFrequency {
    type: 'days' | 'weeks' | 'months';
    interval: number;
}

export interface RecurringTicketCreate {
    title: string;
    description: string;
    department: string;
    category?: string;
    frequency: RecurrenceFrequency;
    customFrequency?: CustomFrequency;
    startDate: Date;
    endDate?: Date;
    maxRuns?: number;
    createdBy: string;
    metadata?: Record<string, unknown>;
}

const RECURRING_KEY = 'recurring-tickets';
const EXECUTION_LOG_KEY = 'recurring-execution-log';

/**
 * تحميل الشكاوى المتكررة
 */
export function loadRecurringTickets(): RecurringTicket[] {
    try {
        const saved = localStorage.getItem(RECURRING_KEY);
        return saved ? JSON.parse(saved) : [];
    } catch {
        return [];
    }
}

/**
 * حفظ الشكاوى المتكررة
 */
function saveRecurringTickets(tickets: RecurringTicket[]): void {
    localStorage.setItem(RECURRING_KEY, JSON.stringify(tickets));
}

/**
 * حساب تاريخ التشغيل التالي
 */
function calculateNextRunDate(
    lastDate: Date,
    frequency: RecurrenceFrequency,
    customFrequency?: CustomFrequency
): Date {
    const next = new Date(lastDate);

    switch (frequency) {
        case 'daily':
            next.setDate(next.getDate() + 1);
            break;
        case 'weekly':
            next.setDate(next.getDate() + 7);
            break;
        case 'biweekly':
            next.setDate(next.getDate() + 14);
            break;
        case 'monthly':
            next.setMonth(next.getMonth() + 1);
            break;
        case 'quarterly':
            next.setMonth(next.getMonth() + 3);
            break;
        case 'yearly':
            next.setFullYear(next.getFullYear() + 1);
            break;
        case 'custom':
            if (customFrequency) {
                switch (customFrequency.type) {
                    case 'days':
                        next.setDate(next.getDate() + customFrequency.interval);
                        break;
                    case 'weeks':
                        next.setDate(next.getDate() + customFrequency.interval * 7);
                        break;
                    case 'months':
                        next.setMonth(next.getMonth() + customFrequency.interval);
                        break;
                }
            }
            break;
    }

    return next;
}

/**
 * إنشاء شكوى متكررة
 */
export function createRecurringTicket(
    data: RecurringTicketCreate
): RecurringTicket {
    const tickets = loadRecurringTickets();

    const newTicket: RecurringTicket = {
        id: `rec-${Date.now()}`,
        title: data.title,
        description: data.description,
        department: data.department,
        category: data.category || 'عام',
        frequency: data.frequency,
        startDate: data.startDate.getTime(),
        endDate: data.endDate?.getTime(),
        nextRunDate: data.startDate.getTime(),
        isActive: true,
        runCount: 0,
        maxRuns: data.maxRuns,
        createdBy: data.createdBy,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        metadata: data.metadata
    };

    tickets.push(newTicket);
    saveRecurringTickets(tickets);

    return newTicket;
}

/**
 * تحديث شكوى متكررة
 */
export function updateRecurringTicket(
    id: string,
    updates: Partial<RecurringTicket>
): RecurringTicket | null {
    const tickets = loadRecurringTickets();
    const index = tickets.findIndex(t => t.id === id);

    if (index === -1) return null;

    tickets[index] = {
        ...tickets[index],
        ...updates,
        updatedAt: Date.now()
    };

    saveRecurringTickets(tickets);
    return tickets[index];
}

/**
 * حذف شكوى متكررة
 */
export function deleteRecurringTicket(id: string): boolean {
    const tickets = loadRecurringTickets();
    const filtered = tickets.filter(t => t.id !== id);

    if (filtered.length === tickets.length) return false;

    saveRecurringTickets(filtered);
    return true;
}

/**
 * إيقاف/تشغيل شكوى متكررة
 */
export function toggleRecurringTicket(id: string): boolean {
    const tickets = loadRecurringTickets();
    const ticket = tickets.find(t => t.id === id);

    if (!ticket) return false;

    ticket.isActive = !ticket.isActive;
    ticket.updatedAt = Date.now();

    saveRecurringTickets(tickets);
    return ticket.isActive;
}

/**
 * الحصول على الشكاوى المستحقة للتنفيذ
 */
export function getDueRecurringTickets(): RecurringTicket[] {
    const now = Date.now();

    return loadRecurringTickets().filter(ticket => {
        if (!ticket.isActive) return false;
        if (ticket.endDate && now > ticket.endDate) return false;
        if (ticket.maxRuns && ticket.runCount >= ticket.maxRuns) return false;

        return ticket.nextRunDate <= now;
    });
}

/**
 * تنفيذ شكوى متكررة
 */
export function executeRecurringTicket(
    id: string,
    createTicketFn: (data: {
        title: string;
        description: string;
        department: string;
        category: string;
    }) => string
): { success: boolean; ticketId?: string; error?: string } {
    const tickets = loadRecurringTickets();
    const ticket = tickets.find(t => t.id === id);

    if (!ticket) {
        return { success: false, error: 'الشكوى المتكررة غير موجودة' };
    }

    if (!ticket.isActive) {
        return { success: false, error: 'الشكوى المتكررة متوقفة' };
    }

    try {
        // إنشاء الشكوى
        const ticketId = createTicketFn({
            title: `${ticket.title} (${ticket.runCount + 1})`,
            description: ticket.description,
            department: ticket.department,
            category: ticket.category
        });

        // تحديث الشكوى المتكررة
        ticket.lastRunDate = Date.now();
        ticket.runCount++;
        ticket.nextRunDate = calculateNextRunDate(
            new Date(),
            ticket.frequency
        ).getTime();
        ticket.updatedAt = Date.now();

        // التحقق من انتهاء التكرار
        if (ticket.maxRuns && ticket.runCount >= ticket.maxRuns) {
            ticket.isActive = false;
        }

        if (ticket.endDate && ticket.nextRunDate > ticket.endDate) {
            ticket.isActive = false;
        }

        saveRecurringTickets(tickets);
        logExecution(id, ticketId, true);

        return { success: true, ticketId };
    } catch (error) {
        logExecution(id, undefined, false, String(error));
        return { success: false, error: String(error) };
    }
}

/**
 * تسجيل التنفيذ
 */
function logExecution(
    recurringId: string,
    ticketId: string | undefined,
    success: boolean,
    error?: string
): void {
    try {
        const saved = localStorage.getItem(EXECUTION_LOG_KEY);
        const log = saved ? JSON.parse(saved) : [];

        log.push({
            recurringId,
            ticketId,
            success,
            error,
            timestamp: Date.now()
        });

        // الحد من حجم السجل
        const trimmed = log.slice(-500);
        localStorage.setItem(EXECUTION_LOG_KEY, JSON.stringify(trimmed));
    } catch {
        // تجاهل الأخطاء
    }
}

/**
 * الحصول على سجل التنفيذ
 */
export function getExecutionLog(recurringId?: string): Array<{
    recurringId: string;
    ticketId?: string;
    success: boolean;
    error?: string;
    timestamp: number;
}> {
    try {
        const saved = localStorage.getItem(EXECUTION_LOG_KEY);
        const log = saved ? JSON.parse(saved) : [];

        if (recurringId) {
            return log.filter((e: { recurringId: string }) => e.recurringId === recurringId);
        }

        return log;
    } catch {
        return [];
    }
}

/**
 * تشغيل جميع الشكاوى المستحقة
 */
export function runDueRecurringTickets(
    createTicketFn: (data: {
        title: string;
        description: string;
        department: string;
        category: string;
    }) => string
): { executed: number; failed: number; results: Array<{ id: string; success: boolean }> } {
    const due = getDueRecurringTickets();
    const results: Array<{ id: string; success: boolean }> = [];

    let executed = 0;
    let failed = 0;

    due.forEach(ticket => {
        const result = executeRecurringTicket(ticket.id, createTicketFn);

        if (result.success) {
            executed++;
        } else {
            failed++;
        }

        results.push({ id: ticket.id, success: result.success });
    });

    return { executed, failed, results };
}

/**
 * الحصول على إحصائيات الشكاوى المتكررة
 */
export function getRecurringStats(): {
    total: number;
    active: number;
    paused: number;
    totalExecutions: number;
    byFrequency: Record<RecurrenceFrequency, number>;
    byDepartment: Record<string, number>;
} {
    const tickets = loadRecurringTickets();
    const stats = {
        total: tickets.length,
        active: 0,
        paused: 0,
        totalExecutions: 0,
        byFrequency: {} as Record<RecurrenceFrequency, number>,
        byDepartment: {} as Record<string, number>
    };

    tickets.forEach(ticket => {
        if (ticket.isActive) {
            stats.active++;
        } else {
            stats.paused++;
        }

        stats.totalExecutions += ticket.runCount;

        stats.byFrequency[ticket.frequency] =
            (stats.byFrequency[ticket.frequency] || 0) + 1;

        stats.byDepartment[ticket.department] =
            (stats.byDepartment[ticket.department] || 0) + 1;
    });

    return stats;
}

/**
 * الحصول على الوصف النصي للتكرار
 */
export function getFrequencyLabel(frequency: RecurrenceFrequency): string {
    const labels: Record<RecurrenceFrequency, string> = {
        daily: 'يومياً',
        weekly: 'أسبوعياً',
        biweekly: 'كل أسبوعين',
        monthly: 'شهرياً',
        quarterly: 'ربع سنوي',
        yearly: 'سنوياً',
        custom: 'مخصص'
    };

    return labels[frequency] || frequency;
}

export default {
    loadRecurringTickets,
    createRecurringTicket,
    updateRecurringTicket,
    deleteRecurringTicket,
    toggleRecurringTicket,
    getDueRecurringTickets,
    executeRecurringTicket,
    runDueRecurringTickets,
    getExecutionLog,
    getRecurringStats,
    getFrequencyLabel
};
