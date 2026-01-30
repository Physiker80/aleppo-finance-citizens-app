// =====================================================
// 📊 Individual Performance Tracking
// تتبع الأداء الفردي للموظفين
// =====================================================

import { Ticket, RequestStatus, Employee } from '../types';

export interface PerformanceMetrics {
    employeeId: string;
    employeeName: string;
    department: string;
    period: { start: Date; end: Date };

    // مقاييس الإنتاجية
    ticketsAssigned: number;
    ticketsResolved: number;
    ticketsInProgress: number;
    resolutionRate: number; // نسبة مئوية

    // مقاييس الوقت
    avgFirstResponseTime: number; // بالساعات
    avgResolutionTime: number; // بالساعات
    fastestResolution: number; // بالساعات
    slowestResolution: number; // بالساعات

    // مقاييس الجودة
    slaCompliance: number; // نسبة مئوية
    reopenedTickets: number;
    escalatedTickets: number;
    customerRating: number; // من 5

    // مقاييس التفاعل
    commentsAdded: number;
    attachmentsAdded: number;
    ticketsForwarded: number;

    // مقارنات
    rankInDepartment: number;
    rankOverall: number;
    comparisonToAverage: number; // نسبة التفوق على المتوسط

    // التطور
    trend: 'improving' | 'stable' | 'declining';
    previousPeriodComparison: number; // نسبة التغيير
}

export interface PerformanceGoal {
    id: string;
    employeeId: string;
    metric: keyof PerformanceMetrics;
    targetValue: number;
    currentValue: number;
    deadline: Date;
    status: 'onTrack' | 'atRisk' | 'completed' | 'failed';
}

export interface PerformanceReport {
    employee: Employee;
    metrics: PerformanceMetrics;
    goals: PerformanceGoal[];
    achievements: Achievement[];
    recommendations: string[];
}

export interface Achievement {
    id: string;
    title: string;
    description: string;
    earnedAt: Date;
    icon: string;
    type: 'speed' | 'quality' | 'quantity' | 'consistency' | 'milestone';
}

const STORAGE_KEY = 'performance-data';
const GOALS_KEY = 'performance-goals';
const ACHIEVEMENTS_KEY = 'employee-achievements';

/**
 * حساب مقاييس الأداء للموظف
 */
export function calculatePerformanceMetrics(
    employee: Employee,
    tickets: Ticket[],
    period: { start: Date; end: Date }
): PerformanceMetrics {
    // تصفية الشكاوى حسب الموظف والفترة
    const employeeTickets = tickets.filter(t => {
        const created = new Date(t.createdAt);
        const isInPeriod = created >= period.start && created <= period.end;
        const isAssigned = t.assignedTo === employee.username || t.handledBy === employee.username;
        return isInPeriod && isAssigned;
    });

    const resolvedTickets = employeeTickets.filter(t => t.status === RequestStatus.Closed);
    const inProgressTickets = employeeTickets.filter(t => t.status === RequestStatus.InProgress);

    // حساب أوقات الاستجابة
    const responseTimes = employeeTickets
        .filter(t => t.firstResponseAt)
        .map(t => {
            const created = new Date(t.createdAt).getTime();
            const firstResponse = new Date(t.firstResponseAt!).getTime();
            return (firstResponse - created) / (1000 * 60 * 60);
        });

    const resolutionTimes = resolvedTickets
        .filter(t => t.closedAt)
        .map(t => {
            const created = new Date(t.createdAt).getTime();
            const closed = new Date(t.closedAt!).getTime();
            return (closed - created) / (1000 * 60 * 60);
        });

    const avgFirstResponse = responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : 0;

    const avgResolution = resolutionTimes.length > 0
        ? resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length
        : 0;

    // حساب SLA
    const slaThreshold = 24; // ساعات
    const onTimResponses = responseTimes.filter(t => t <= slaThreshold).length;
    const slaCompliance = responseTimes.length > 0
        ? (onTimResponses / responseTimes.length) * 100
        : 100;

    // حساب الشكاوى المُعاد فتحها
    const reopenedTickets = employeeTickets.filter(t => t.reopenedAt).length;

    // حساب الشكاوى المُصعّدة
    const escalatedTickets = employeeTickets.filter(t => t.escalatedAt).length;

    return {
        employeeId: employee.username,
        employeeName: employee.name || employee.username,
        department: employee.department || 'غير محدد',
        period,
        ticketsAssigned: employeeTickets.length,
        ticketsResolved: resolvedTickets.length,
        ticketsInProgress: inProgressTickets.length,
        resolutionRate: employeeTickets.length > 0
            ? (resolvedTickets.length / employeeTickets.length) * 100
            : 0,
        avgFirstResponseTime: avgFirstResponse,
        avgResolutionTime: avgResolution,
        fastestResolution: resolutionTimes.length > 0 ? Math.min(...resolutionTimes) : 0,
        slowestResolution: resolutionTimes.length > 0 ? Math.max(...resolutionTimes) : 0,
        slaCompliance,
        reopenedTickets,
        escalatedTickets,
        customerRating: 4.2, // يمكن حسابها من التقييمات
        commentsAdded: employeeTickets.reduce((sum, t) => sum + (t.responses?.length || 0), 0),
        attachmentsAdded: employeeTickets.reduce((sum, t) => sum + (t.attachments?.length || 0), 0),
        ticketsForwarded: employeeTickets.filter(t => t.forwardedTo?.length).length,
        rankInDepartment: 0, // يتم حسابها لاحقاً
        rankOverall: 0,
        comparisonToAverage: 0,
        trend: 'stable',
        previousPeriodComparison: 0
    };
}

/**
 * حساب ترتيب الموظفين
 */
export function calculateRankings(
    allMetrics: PerformanceMetrics[]
): PerformanceMetrics[] {
    // ترتيب عام
    const sortedOverall = [...allMetrics].sort((a, b) => {
        const scoreA = calculatePerformanceScore(a);
        const scoreB = calculatePerformanceScore(b);
        return scoreB - scoreA;
    });

    sortedOverall.forEach((m, i) => {
        m.rankOverall = i + 1;
    });

    // ترتيب حسب القسم
    const departments = [...new Set(allMetrics.map(m => m.department))];
    departments.forEach(dept => {
        const deptMetrics = allMetrics
            .filter(m => m.department === dept)
            .sort((a, b) => calculatePerformanceScore(b) - calculatePerformanceScore(a));

        deptMetrics.forEach((m, i) => {
            m.rankInDepartment = i + 1;
        });
    });

    // حساب المقارنة مع المتوسط
    const avgScore = allMetrics.reduce((sum, m) => sum + calculatePerformanceScore(m), 0) / allMetrics.length;
    allMetrics.forEach(m => {
        const score = calculatePerformanceScore(m);
        m.comparisonToAverage = ((score - avgScore) / avgScore) * 100;
    });

    return allMetrics;
}

/**
 * حساب درجة الأداء الإجمالية
 */
export function calculatePerformanceScore(metrics: PerformanceMetrics): number {
    // وزن كل مقياس
    const weights = {
        resolutionRate: 0.25,
        slaCompliance: 0.20,
        avgFirstResponseTime: 0.15, // معكوس
        avgResolutionTime: 0.15, // معكوس
        customerRating: 0.15,
        reopenedTickets: 0.10 // معكوس
    };

    let score = 0;

    // نسبة الحل (0-100)
    score += metrics.resolutionRate * weights.resolutionRate;

    // الالتزام بـ SLA (0-100)
    score += metrics.slaCompliance * weights.slaCompliance;

    // وقت الاستجابة (معكوس، أقل = أفضل)
    const responseScore = Math.max(0, 100 - (metrics.avgFirstResponseTime / 24) * 100);
    score += responseScore * weights.avgFirstResponseTime;

    // وقت الحل (معكوس)
    const resolutionScore = Math.max(0, 100 - (metrics.avgResolutionTime / 72) * 100);
    score += resolutionScore * weights.avgResolutionTime;

    // تقييم العملاء (0-5 → 0-100)
    score += (metrics.customerRating / 5) * 100 * weights.customerRating;

    // الشكاوى المعاد فتحها (معكوس)
    const reopenScore = Math.max(0, 100 - (metrics.reopenedTickets / Math.max(1, metrics.ticketsResolved)) * 100);
    score += reopenScore * weights.reopenedTickets;

    return Math.min(100, Math.max(0, score));
}

/**
 * تحديد مستوى الأداء
 */
export function getPerformanceLevel(score: number): {
    level: 'excellent' | 'good' | 'average' | 'belowAverage' | 'poor';
    label: string;
    color: string;
} {
    if (score >= 90) return { level: 'excellent', label: 'ممتاز', color: '#10b981' };
    if (score >= 75) return { level: 'good', label: 'جيد جداً', color: '#22c55e' };
    if (score >= 60) return { level: 'average', label: 'جيد', color: '#f59e0b' };
    if (score >= 40) return { level: 'belowAverage', label: 'يحتاج تحسين', color: '#f97316' };
    return { level: 'poor', label: 'ضعيف', color: '#ef4444' };
}

/**
 * إنشاء أهداف الأداء
 */
export function createPerformanceGoal(goal: Omit<PerformanceGoal, 'id' | 'status'>): PerformanceGoal {
    const newGoal: PerformanceGoal = {
        ...goal,
        id: `goal-${Date.now()}`,
        status: goal.currentValue >= goal.targetValue ? 'completed' : 'onTrack'
    };

    const goals = loadPerformanceGoals();
    goals.push(newGoal);
    localStorage.setItem(GOALS_KEY, JSON.stringify(goals));

    return newGoal;
}

/**
 * تحميل أهداف الأداء
 */
export function loadPerformanceGoals(): PerformanceGoal[] {
    try {
        const saved = localStorage.getItem(GOALS_KEY);
        return saved ? JSON.parse(saved) : [];
    } catch {
        return [];
    }
}

/**
 * تحديث حالة الأهداف
 */
export function updateGoalProgress(employeeId: string, metrics: PerformanceMetrics): PerformanceGoal[] {
    const goals = loadPerformanceGoals().filter(g => g.employeeId === employeeId);

    goals.forEach(goal => {
        const currentValue = metrics[goal.metric as keyof PerformanceMetrics] as number;
        goal.currentValue = currentValue;

        const now = new Date();
        const deadline = new Date(goal.deadline);

        if (currentValue >= goal.targetValue) {
            goal.status = 'completed';
        } else if (now > deadline) {
            goal.status = 'failed';
        } else {
            const progress = currentValue / goal.targetValue;
            const timeRemaining = (deadline.getTime() - now.getTime()) / (deadline.getTime() - now.getTime());
            goal.status = progress >= timeRemaining * 0.8 ? 'onTrack' : 'atRisk';
        }
    });

    // Save updated goals
    const allGoals = loadPerformanceGoals();
    const otherGoals = allGoals.filter(g => g.employeeId !== employeeId);
    localStorage.setItem(GOALS_KEY, JSON.stringify([...otherGoals, ...goals]));

    return goals;
}

/**
 * الإنجازات المتاحة
 */
export const AVAILABLE_ACHIEVEMENTS: Omit<Achievement, 'id' | 'earnedAt'>[] = [
    { title: 'بداية سريعة', description: 'أول رد خلال ساعة واحدة', icon: '⚡', type: 'speed' },
    { title: 'حلال المشاكل', description: 'حل 10 شكاوى في يوم واحد', icon: '🎯', type: 'quantity' },
    { title: 'نجم الأسبوع', description: 'أعلى أداء في القسم لمدة أسبوع', icon: '⭐', type: 'quality' },
    { title: 'المثابر', description: '30 يوم متتالي بدون تأخير', icon: '🔥', type: 'consistency' },
    { title: 'المئة الذهبية', description: 'الوصول إلى 100 شكوى محلولة', icon: '💯', type: 'milestone' },
    { title: 'رضا العملاء', description: 'متوسط تقييم 5/5 لمدة شهر', icon: '😊', type: 'quality' },
    { title: 'خبير القسم', description: 'أفضل أداء في القسم لمدة 3 أشهر', icon: '👑', type: 'quality' },
    { title: 'السرعة الفائقة', description: 'حل شكوى خلال 30 دقيقة', icon: '🚀', type: 'speed' },
    { title: 'بلا عيوب', description: 'شهر كامل بدون شكوى معاد فتحها', icon: '✨', type: 'quality' },
    { title: 'الألف', description: 'الوصول إلى 1000 شكوى محلولة', icon: '🏆', type: 'milestone' }
];

/**
 * التحقق من الإنجازات الجديدة
 */
export function checkForNewAchievements(
    employeeId: string,
    metrics: PerformanceMetrics,
    historicalData?: PerformanceMetrics[]
): Achievement[] {
    const earnedAchievements = loadEmployeeAchievements(employeeId);
    const newAchievements: Achievement[] = [];

    // التحقق من كل إنجاز
    if (metrics.ticketsResolved >= 100 && !earnedAchievements.find(a => a.title === 'المئة الذهبية')) {
        newAchievements.push({
            ...AVAILABLE_ACHIEVEMENTS.find(a => a.title === 'المئة الذهبية')!,
            id: `ach-${Date.now()}`,
            earnedAt: new Date()
        });
    }

    if (metrics.ticketsResolved >= 1000 && !earnedAchievements.find(a => a.title === 'الألف')) {
        newAchievements.push({
            ...AVAILABLE_ACHIEVEMENTS.find(a => a.title === 'الألف')!,
            id: `ach-${Date.now()}`,
            earnedAt: new Date()
        });
    }

    if (metrics.fastestResolution <= 0.5 && !earnedAchievements.find(a => a.title === 'السرعة الفائقة')) {
        newAchievements.push({
            ...AVAILABLE_ACHIEVEMENTS.find(a => a.title === 'السرعة الفائقة')!,
            id: `ach-${Date.now()}`,
            earnedAt: new Date()
        });
    }

    // حفظ الإنجازات الجديدة
    if (newAchievements.length > 0) {
        saveEmployeeAchievements(employeeId, [...earnedAchievements, ...newAchievements]);
    }

    return newAchievements;
}

/**
 * تحميل إنجازات الموظف
 */
export function loadEmployeeAchievements(employeeId: string): Achievement[] {
    try {
        const allAchievements = JSON.parse(localStorage.getItem(ACHIEVEMENTS_KEY) || '{}');
        return allAchievements[employeeId] || [];
    } catch {
        return [];
    }
}

/**
 * حفظ إنجازات الموظف
 */
function saveEmployeeAchievements(employeeId: string, achievements: Achievement[]): void {
    try {
        const allAchievements = JSON.parse(localStorage.getItem(ACHIEVEMENTS_KEY) || '{}');
        allAchievements[employeeId] = achievements;
        localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(allAchievements));
    } catch { }
}

/**
 * إنشاء تقرير الأداء الكامل
 */
export function generatePerformanceReport(
    employee: Employee,
    metrics: PerformanceMetrics
): PerformanceReport {
    const goals = updateGoalProgress(employee.username, metrics);
    const achievements = loadEmployeeAchievements(employee.username);

    // توليد التوصيات
    const recommendations: string[] = [];

    if (metrics.avgFirstResponseTime > 12) {
        recommendations.push('حاول تقليل وقت الاستجابة الأولى - الهدف أقل من 12 ساعة');
    }

    if (metrics.slaCompliance < 90) {
        recommendations.push('ركز على تحسين الالتزام بـ SLA - الهدف 90% أو أعلى');
    }

    if (metrics.reopenedTickets > 0) {
        recommendations.push('راجع الشكاوى المعاد فتحها لتحسين جودة الحلول');
    }

    if (metrics.resolutionRate < 80) {
        recommendations.push('حاول إغلاق المزيد من الشكاوى المعلقة');
    }

    if (recommendations.length === 0) {
        recommendations.push('أداء ممتاز! استمر في نفس المستوى');
    }

    return {
        employee,
        metrics,
        goals,
        achievements,
        recommendations
    };
}

export default {
    calculatePerformanceMetrics,
    calculateRankings,
    calculatePerformanceScore,
    getPerformanceLevel,
    createPerformanceGoal,
    loadPerformanceGoals,
    updateGoalProgress,
    checkForNewAchievements,
    loadEmployeeAchievements,
    generatePerformanceReport,
    AVAILABLE_ACHIEVEMENTS
};
