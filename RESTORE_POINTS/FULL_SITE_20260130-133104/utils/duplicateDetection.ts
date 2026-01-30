// =====================================================
// 🔍 Duplicate Ticket Detection
// كشف الشكاوى المكررة
// =====================================================

export interface DuplicateMatch {
    ticketId: string;
    similarity: number;
    matchType: 'exact' | 'high' | 'medium' | 'low';
    matchedFields: string[];
    originalTicket: {
        id: string;
        title: string;
        department: string;
        status: string;
        createdAt: string;
    };
}

export interface DuplicateCheckResult {
    isDuplicate: boolean;
    confidence: number;
    matches: DuplicateMatch[];
    recommendation: 'reject' | 'merge' | 'link' | 'allow';
    reason: string;
}

export interface DuplicateConfig {
    titleWeight: number;
    descriptionWeight: number;
    nationalIdWeight: number;
    phoneWeight: number;
    similarityThreshold: number;
    timeWindowDays: number;
    enableFuzzyMatching: boolean;
}

const DEFAULT_CONFIG: DuplicateConfig = {
    titleWeight: 0.3,
    descriptionWeight: 0.4,
    nationalIdWeight: 0.2,
    phoneWeight: 0.1,
    similarityThreshold: 0.7,
    timeWindowDays: 30,
    enableFuzzyMatching: true
};

/**
 * حساب تشابه النصوص (Jaccard Similarity)
 */
function calculateTextSimilarity(text1: string, text2: string): number {
    if (!text1 || !text2) return 0;

    const normalize = (text: string) =>
        text.toLowerCase()
            .replace(/[^\u0600-\u06FFa-zA-Z0-9\s]/g, '')
            .split(/\s+/)
            .filter(w => w.length > 2);

    const words1 = new Set(normalize(text1));
    const words2 = new Set(normalize(text2));

    if (words1.size === 0 || words2.size === 0) return 0;

    const intersection = [...words1].filter(w => words2.has(w)).length;
    const union = new Set([...words1, ...words2]).size;

    return union > 0 ? intersection / union : 0;
}

/**
 * حساب مسافة Levenshtein
 */
function levenshteinDistance(str1: string, str2: string): number {
    const m = str1.length;
    const n = str2.length;

    if (m === 0) return n;
    if (n === 0) return m;

    const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
            dp[i][j] = Math.min(
                dp[i - 1][j] + 1,
                dp[i][j - 1] + 1,
                dp[i - 1][j - 1] + cost
            );
        }
    }

    return dp[m][n];
}

/**
 * حساب تشابه فازي
 */
function fuzzyMatch(str1: string, str2: string): number {
    const maxLen = Math.max(str1.length, str2.length);
    if (maxLen === 0) return 1;

    const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
    return 1 - distance / maxLen;
}

/**
 * استخراج N-grams
 */
function getNGrams(text: string, n: number): Set<string> {
    const normalized = text.toLowerCase().replace(/\s+/g, ' ').trim();
    const grams = new Set<string>();

    for (let i = 0; i <= normalized.length - n; i++) {
        grams.add(normalized.substring(i, i + n));
    }

    return grams;
}

/**
 * حساب تشابه N-grams
 */
function nGramSimilarity(text1: string, text2: string, n: number = 3): number {
    const grams1 = getNGrams(text1, n);
    const grams2 = getNGrams(text2, n);

    if (grams1.size === 0 || grams2.size === 0) return 0;

    const intersection = [...grams1].filter(g => grams2.has(g)).length;
    const union = new Set([...grams1, ...grams2]).size;

    return union > 0 ? intersection / union : 0;
}

/**
 * فحص التكرار
 */
export function checkForDuplicates(
    newTicket: {
        title: string;
        description: string;
        nationalId?: string;
        phone?: string;
    },
    existingTickets: Array<{
        id: string;
        title: string;
        description: string;
        nationalId?: string;
        phone?: string;
        department: string;
        status: string;
        createdAt: string;
    }>,
    config: Partial<DuplicateConfig> = {}
): DuplicateCheckResult {
    const cfg = { ...DEFAULT_CONFIG, ...config };
    const matches: DuplicateMatch[] = [];

    // تصفية الشكاوى حسب الفترة الزمنية
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - cfg.timeWindowDays);

    const recentTickets = existingTickets.filter(t =>
        new Date(t.createdAt) >= cutoffDate
    );

    recentTickets.forEach(existing => {
        const matchedFields: string[] = [];
        let totalScore = 0;
        let maxWeight = 0;

        // مقارنة العنوان
        const titleSim = cfg.enableFuzzyMatching
            ? Math.max(
                calculateTextSimilarity(newTicket.title, existing.title),
                nGramSimilarity(newTicket.title, existing.title)
            )
            : calculateTextSimilarity(newTicket.title, existing.title);

        if (titleSim > 0.5) {
            matchedFields.push('العنوان');
        }
        totalScore += titleSim * cfg.titleWeight;
        maxWeight += cfg.titleWeight;

        // مقارنة الوصف
        const descSim = cfg.enableFuzzyMatching
            ? Math.max(
                calculateTextSimilarity(newTicket.description, existing.description),
                nGramSimilarity(newTicket.description, existing.description)
            )
            : calculateTextSimilarity(newTicket.description, existing.description);

        if (descSim > 0.5) {
            matchedFields.push('الوصف');
        }
        totalScore += descSim * cfg.descriptionWeight;
        maxWeight += cfg.descriptionWeight;

        // مقارنة الرقم الوطني
        if (newTicket.nationalId && existing.nationalId) {
            const idSim = newTicket.nationalId === existing.nationalId ? 1 : 0;
            if (idSim === 1) {
                matchedFields.push('الرقم الوطني');
            }
            totalScore += idSim * cfg.nationalIdWeight;
            maxWeight += cfg.nationalIdWeight;
        }

        // مقارنة الهاتف
        if (newTicket.phone && existing.phone) {
            const phoneSim = newTicket.phone.replace(/\D/g, '') === existing.phone.replace(/\D/g, '') ? 1 : 0;
            if (phoneSim === 1) {
                matchedFields.push('رقم الهاتف');
            }
            totalScore += phoneSim * cfg.phoneWeight;
            maxWeight += cfg.phoneWeight;
        }

        // حساب التشابه الإجمالي
        const similarity = maxWeight > 0 ? totalScore / maxWeight : 0;

        if (similarity >= 0.3) {
            let matchType: DuplicateMatch['matchType'];
            if (similarity >= 0.9) matchType = 'exact';
            else if (similarity >= 0.7) matchType = 'high';
            else if (similarity >= 0.5) matchType = 'medium';
            else matchType = 'low';

            matches.push({
                ticketId: existing.id,
                similarity,
                matchType,
                matchedFields,
                originalTicket: {
                    id: existing.id,
                    title: existing.title,
                    department: existing.department,
                    status: existing.status,
                    createdAt: existing.createdAt
                }
            });
        }
    });

    // ترتيب حسب التشابه
    matches.sort((a, b) => b.similarity - a.similarity);

    // تحديد النتيجة
    const topMatch = matches[0];
    const isDuplicate = topMatch ? topMatch.similarity >= cfg.similarityThreshold : false;

    let recommendation: DuplicateCheckResult['recommendation'];
    let reason: string;

    if (!topMatch || topMatch.similarity < 0.3) {
        recommendation = 'allow';
        reason = 'لم يتم العثور على شكاوى مشابهة';
    } else if (topMatch.similarity >= 0.9) {
        recommendation = 'reject';
        reason = `شكوى مكررة تماماً. الشكوى الأصلية: ${topMatch.ticketId}`;
    } else if (topMatch.similarity >= 0.7) {
        recommendation = 'merge';
        reason = `تشابه عالي مع الشكوى ${topMatch.ticketId}. يُنصح بدمج الشكويين`;
    } else if (topMatch.similarity >= 0.5) {
        recommendation = 'link';
        reason = `تشابه متوسط مع الشكوى ${topMatch.ticketId}. يمكن ربط الشكويين`;
    } else {
        recommendation = 'allow';
        reason = 'تشابه منخفض، يمكن المتابعة';
    }

    return {
        isDuplicate,
        confidence: topMatch?.similarity || 0,
        matches: matches.slice(0, 5),
        recommendation,
        reason
    };
}

/**
 * دمج شكويين
 */
export function mergeTickets(
    primaryId: string,
    secondaryId: string,
    options: {
        mergeResponses?: boolean;
        mergeAttachments?: boolean;
        keepSecondary?: boolean;
    } = {}
): {
    success: boolean;
    mergedTicketId: string;
    actions: string[];
} {
    const actions: string[] = [];

    // في الإنتاج، هذا سيتفاعل مع قاعدة البيانات
    actions.push(`ربط الشكوى ${secondaryId} بالشكوى الرئيسية ${primaryId}`);

    if (options.mergeResponses) {
        actions.push('نقل جميع الردود إلى الشكوى الرئيسية');
    }

    if (options.mergeAttachments) {
        actions.push('نقل جميع المرفقات إلى الشكوى الرئيسية');
    }

    if (!options.keepSecondary) {
        actions.push(`إغلاق الشكوى ${secondaryId} كمكررة`);
    }

    return {
        success: true,
        mergedTicketId: primaryId,
        actions
    };
}

/**
 * الحصول على إحصائيات التكرار
 */
export function getDuplicateStats(
    tickets: Array<{
        id: string;
        title: string;
        description: string;
        department: string;
        createdAt: string;
    }>
): {
    totalChecked: number;
    duplicatesFound: number;
    duplicateRate: number;
    topDuplicatedTopics: Array<{ topic: string; count: number }>;
    byDepartment: Record<string, { total: number; duplicates: number }>;
} {
    const stats = {
        totalChecked: tickets.length,
        duplicatesFound: 0,
        duplicateRate: 0,
        topDuplicatedTopics: [] as Array<{ topic: string; count: number }>,
        byDepartment: {} as Record<string, { total: number; duplicates: number }>
    };

    const topicCounts = new Map<string, number>();

    tickets.forEach((ticket, index) => {
        // تهيئة الإحصائيات حسب القسم
        if (!stats.byDepartment[ticket.department]) {
            stats.byDepartment[ticket.department] = { total: 0, duplicates: 0 };
        }
        stats.byDepartment[ticket.department].total++;

        // فحص التكرار مع الشكاوى السابقة
        const previousTickets = tickets.slice(0, index);
        const result = checkForDuplicates(
            { title: ticket.title, description: ticket.description },
            previousTickets.map(t => ({
                ...t,
                nationalId: '',
                phone: '',
                status: 'new'
            })),
            { similarityThreshold: 0.7 }
        );

        if (result.isDuplicate) {
            stats.duplicatesFound++;
            stats.byDepartment[ticket.department].duplicates++;

            // تتبع المواضيع المكررة
            const topic = extractTopic(ticket.title);
            topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1);
        }
    });

    stats.duplicateRate = stats.totalChecked > 0
        ? stats.duplicatesFound / stats.totalChecked
        : 0;

    stats.topDuplicatedTopics = [...topicCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([topic, count]) => ({ topic, count }));

    return stats;
}

/**
 * استخراج الموضوع الرئيسي
 */
function extractTopic(title: string): string {
    // تبسيط العنوان
    const words = title
        .replace(/[^\u0600-\u06FFa-zA-Z\s]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 3)
        .slice(0, 3);

    return words.join(' ') || 'غير محدد';
}

/**
 * اقتراحات لتقليل التكرار
 */
export function getSuggestions(stats: ReturnType<typeof getDuplicateStats>): string[] {
    const suggestions: string[] = [];

    if (stats.duplicateRate > 0.2) {
        suggestions.push('نسبة التكرار مرتفعة. يُنصح بتحسين نظام البحث للمواطنين');
    }

    stats.topDuplicatedTopics.forEach(({ topic, count }) => {
        if (count >= 5) {
            suggestions.push(`موضوع "${topic}" يتكرر كثيراً. يمكن إنشاء صفحة أسئلة شائعة`);
        }
    });

    Object.entries(stats.byDepartment).forEach(([dept, data]) => {
        const rate = data.total > 0 ? data.duplicates / data.total : 0;
        if (rate > 0.3) {
            suggestions.push(`قسم ${dept} لديه نسبة تكرار عالية (${(rate * 100).toFixed(1)}%)`);
        }
    });

    return suggestions;
}

export default {
    checkForDuplicates,
    mergeTickets,
    getDuplicateStats,
    getSuggestions,
    calculateTextSimilarity,
    fuzzyMatch,
    nGramSimilarity
};
