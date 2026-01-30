// =====================================================
// ⚡ Priority Queue System
// نظام أولوية الشكاوى الذكي
// =====================================================

export type Priority = 'low' | 'medium' | 'high' | 'urgent' | 'critical';

export interface PriorityConfig {
    slaHours: Record<Priority, number>;
    escalationRules: EscalationRule[];
    autoEscalate: boolean;
    weightFactors: WeightFactors;
}

export interface EscalationRule {
    id: string;
    name: string;
    condition: EscalationCondition;
    action: EscalationAction;
    isActive: boolean;
}

export interface EscalationCondition {
    type: 'time_elapsed' | 'no_response' | 'reopened' | 'vip' | 'keyword';
    threshold?: number; // بالساعات للوقت
    keywords?: string[];
}

export interface EscalationAction {
    type: 'increase_priority' | 'notify' | 'reassign' | 'escalate_to_manager';
    targetPriority?: Priority;
    notifyUsers?: string[];
    department?: string;
}

export interface WeightFactors {
    age: number;           // عمر الشكوى
    priority: number;      // الأولوية الأصلية
    slaProgress: number;   // التقدم نحو SLA
    reopenCount: number;   // عدد مرات إعادة الفتح
    vipMultiplier: number; // معامل المواطن المميز
}

export interface PrioritizedTicket {
    ticketId: string;
    originalPriority: Priority;
    effectivePriority: Priority;
    score: number;
    slaDeadline: Date;
    slaProgress: number; // 0-100%
    isOverdue: boolean;
    escalationLevel: number;
    factors: {
        ageScore: number;
        priorityScore: number;
        slaScore: number;
        reopenScore: number;
        vipScore: number;
    };
}

const CONFIG_KEY = 'priority-config';
const QUEUE_KEY = 'priority-queue';

// الإعدادات الافتراضية
const DEFAULT_CONFIG: PriorityConfig = {
    slaHours: {
        low: 72,
        medium: 48,
        high: 24,
        urgent: 8,
        critical: 2
    },
    escalationRules: [
        {
            id: 'rule-1',
            name: 'تصعيد بعد انتهاء 80% من SLA',
            condition: { type: 'time_elapsed', threshold: 80 },
            action: { type: 'increase_priority' },
            isActive: true
        },
        {
            id: 'rule-2',
            name: 'تصعيد عند عدم الرد',
            condition: { type: 'no_response', threshold: 24 },
            action: { type: 'notify', notifyUsers: ['admin'] },
            isActive: true
        },
        {
            id: 'rule-3',
            name: 'تصعيد الشكاوى المعاد فتحها',
            condition: { type: 'reopened' },
            action: { type: 'increase_priority' },
            isActive: true
        }
    ],
    autoEscalate: true,
    weightFactors: {
        age: 0.2,
        priority: 0.3,
        slaProgress: 0.3,
        reopenCount: 0.1,
        vipMultiplier: 1.5
    }
};

/**
 * تحميل الإعدادات
 */
export function loadConfig(): PriorityConfig {
    try {
        const saved = localStorage.getItem(CONFIG_KEY);
        return saved ? { ...DEFAULT_CONFIG, ...JSON.parse(saved) } : DEFAULT_CONFIG;
    } catch {
        return DEFAULT_CONFIG;
    }
}

/**
 * حفظ الإعدادات
 */
export function saveConfig(config: Partial<PriorityConfig>): void {
    const current = loadConfig();
    localStorage.setItem(CONFIG_KEY, JSON.stringify({ ...current, ...config }));
}

/**
 * الحصول على درجة الأولوية الرقمية
 */
function getPriorityScore(priority: Priority): number {
    const scores: Record<Priority, number> = {
        low: 1,
        medium: 2,
        high: 3,
        urgent: 4,
        critical: 5
    };
    return scores[priority] || 2;
}

/**
 * رفع الأولوية
 */
function increasePriority(current: Priority): Priority {
    const order: Priority[] = ['low', 'medium', 'high', 'urgent', 'critical'];
    const index = order.indexOf(current);
    return index < order.length - 1 ? order[index + 1] : current;
}

/**
 * حساب موعد SLA
 */
export function calculateSLADeadline(
    createdAt: Date,
    priority: Priority
): Date {
    const config = loadConfig();
    const hours = config.slaHours[priority] || 48;

    const deadline = new Date(createdAt);
    deadline.setHours(deadline.getHours() + hours);

    return deadline;
}

/**
 * حساب نسبة تقدم SLA
 */
export function calculateSLAProgress(
    createdAt: Date,
    priority: Priority
): number {
    const config = loadConfig();
    const hours = config.slaHours[priority] || 48;

    const now = Date.now();
    const start = new Date(createdAt).getTime();
    const elapsed = (now - start) / (1000 * 60 * 60);

    return Math.min((elapsed / hours) * 100, 100);
}

/**
 * حساب درجة الشكوى
 */
export function calculateTicketScore(ticket: {
    id: string;
    priority: Priority;
    createdAt: Date;
    reopenCount?: number;
    isVip?: boolean;
    hasResponse?: boolean;
}): PrioritizedTicket {
    const config = loadConfig();
    const factors = config.weightFactors;

    // حساب العوامل
    const now = Date.now();
    const ageHours = (now - new Date(ticket.createdAt).getTime()) / (1000 * 60 * 60);

    const slaProgress = calculateSLAProgress(ticket.createdAt, ticket.priority);
    const slaDeadline = calculateSLADeadline(ticket.createdAt, ticket.priority);
    const isOverdue = slaProgress >= 100;

    // الدرجات الفردية
    const ageScore = Math.min(ageHours / 24, 10); // 0-10 حسب الأيام
    const priorityScore = getPriorityScore(ticket.priority);
    const slaScore = slaProgress / 10; // 0-10
    const reopenScore = Math.min((ticket.reopenCount || 0) * 2, 10);
    const vipScore = ticket.isVip ? factors.vipMultiplier : 1;

    // الدرجة الإجمالية
    const baseScore =
        ageScore * factors.age +
        priorityScore * factors.priority +
        slaScore * factors.slaProgress +
        reopenScore * factors.reopenCount;

    const totalScore = baseScore * vipScore;

    // تحديد الأولوية الفعلية
    let effectivePriority = ticket.priority;
    let escalationLevel = 0;

    if (isOverdue) {
        effectivePriority = increasePriority(effectivePriority);
        escalationLevel = 1;
    }

    if (slaProgress >= 80 && config.autoEscalate) {
        effectivePriority = increasePriority(ticket.priority);
        escalationLevel = Math.max(escalationLevel, 1);
    }

    if ((ticket.reopenCount || 0) > 0) {
        effectivePriority = increasePriority(effectivePriority);
        escalationLevel++;
    }

    return {
        ticketId: ticket.id,
        originalPriority: ticket.priority,
        effectivePriority,
        score: totalScore,
        slaDeadline,
        slaProgress,
        isOverdue,
        escalationLevel,
        factors: {
            ageScore,
            priorityScore,
            slaScore,
            reopenScore,
            vipScore
        }
    };
}

/**
 * ترتيب الشكاوى حسب الأولوية
 */
export function prioritizeTickets(
    tickets: Array<{
        id: string;
        priority: Priority;
        createdAt: Date;
        reopenCount?: number;
        isVip?: boolean;
        hasResponse?: boolean;
        status: string;
    }>
): PrioritizedTicket[] {
    // استبعاد المغلقة
    const active = tickets.filter(t =>
        t.status !== 'مغلق' && t.status !== 'ملغي'
    );

    // حساب الدرجات
    const prioritized = active.map(t => calculateTicketScore(t));

    // الترتيب حسب الدرجة (الأعلى أولاً)
    return prioritized.sort((a, b) => b.score - a.score);
}

/**
 * الحصول على الشكاوى المتأخرة
 */
export function getOverdueTickets(
    tickets: Array<{
        id: string;
        priority: Priority;
        createdAt: Date;
        status: string;
    }>
): PrioritizedTicket[] {
    return prioritizeTickets(tickets as any[])
        .filter(t => t.isOverdue);
}

/**
 * الحصول على الشكاوى القريبة من SLA
 */
export function getNearSLATickets(
    tickets: Array<{
        id: string;
        priority: Priority;
        createdAt: Date;
        status: string;
    }>,
    threshold: number = 80
): PrioritizedTicket[] {
    return prioritizeTickets(tickets as any[])
        .filter(t => t.slaProgress >= threshold && !t.isOverdue);
}

/**
 * تطبيق قواعد التصعيد
 */
export function applyEscalationRules(
    ticket: {
        id: string;
        priority: Priority;
        createdAt: Date;
        reopenCount?: number;
        hasResponse?: boolean;
        title?: string;
        description?: string;
    }
): { shouldEscalate: boolean; actions: EscalationAction[] } {
    const config = loadConfig();
    const actions: EscalationAction[] = [];

    const slaProgress = calculateSLAProgress(ticket.createdAt, ticket.priority);
    const ageHours = (Date.now() - new Date(ticket.createdAt).getTime()) / (1000 * 60 * 60);

    config.escalationRules.filter(r => r.isActive).forEach(rule => {
        let shouldApply = false;

        switch (rule.condition.type) {
            case 'time_elapsed':
                shouldApply = slaProgress >= (rule.condition.threshold || 80);
                break;

            case 'no_response':
                shouldApply = !ticket.hasResponse && ageHours >= (rule.condition.threshold || 24);
                break;

            case 'reopened':
                shouldApply = (ticket.reopenCount || 0) > 0;
                break;

            case 'keyword':
                const text = `${ticket.title || ''} ${ticket.description || ''}`.toLowerCase();
                shouldApply = (rule.condition.keywords || [])
                    .some(kw => text.includes(kw.toLowerCase()));
                break;
        }

        if (shouldApply) {
            actions.push(rule.action);
        }
    });

    return {
        shouldEscalate: actions.length > 0,
        actions
    };
}

/**
 * الحصول على وصف الأولوية
 */
export function getPriorityLabel(priority: Priority): string {
    const labels: Record<Priority, string> = {
        low: 'منخفضة',
        medium: 'متوسطة',
        high: 'عالية',
        urgent: 'عاجلة',
        critical: 'حرجة'
    };
    return labels[priority] || priority;
}

/**
 * الحصول على لون الأولوية
 */
export function getPriorityColor(priority: Priority): string {
    const colors: Record<Priority, string> = {
        low: '#4ade80',      // أخضر
        medium: '#facc15',   // أصفر
        high: '#fb923c',     // برتقالي
        urgent: '#ef4444',   // أحمر
        critical: '#dc2626'  // أحمر داكن
    };
    return colors[priority] || '#9ca3af';
}

/**
 * إحصائيات الأولوية
 */
export function getPriorityStats(
    tickets: Array<{
        id: string;
        priority: Priority;
        createdAt: Date;
        status: string;
    }>
): {
    byPriority: Record<Priority, number>;
    overdue: number;
    nearSLA: number;
    averageSLAProgress: number;
    escalated: number;
} {
    const prioritized = prioritizeTickets(tickets as any[]);

    const stats = {
        byPriority: {} as Record<Priority, number>,
        overdue: 0,
        nearSLA: 0,
        averageSLAProgress: 0,
        escalated: 0
    };

    let totalProgress = 0;

    prioritized.forEach(t => {
        stats.byPriority[t.effectivePriority] =
            (stats.byPriority[t.effectivePriority] || 0) + 1;

        if (t.isOverdue) stats.overdue++;
        if (t.slaProgress >= 80 && !t.isOverdue) stats.nearSLA++;
        if (t.escalationLevel > 0) stats.escalated++;

        totalProgress += t.slaProgress;
    });

    stats.averageSLAProgress = prioritized.length > 0
        ? totalProgress / prioritized.length
        : 0;

    return stats;
}

export default {
    loadConfig,
    saveConfig,
    calculateSLADeadline,
    calculateSLAProgress,
    calculateTicketScore,
    prioritizeTickets,
    getOverdueTickets,
    getNearSLATickets,
    applyEscalationRules,
    getPriorityLabel,
    getPriorityColor,
    getPriorityStats
};
