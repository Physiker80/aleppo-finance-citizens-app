// =====================================================
// 🤖 AI Ticket Classification System
// نظام تصنيف الشكاوى بالذكاء الاصطناعي
// =====================================================

export interface ClassificationResult {
    department: string;
    confidence: number;
    alternativeDepartments: Array<{ name: string; confidence: number }>;
    category: string;
    subcategory?: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    tags: string[];
    reasoning: string;
}

export interface ClassificationConfig {
    minConfidence: number;
    useDepartmentHistory: boolean;
    useKeywordMatching: boolean;
    usePatternRecognition: boolean;
}

// قاموس الكلمات المفتاحية للأقسام
const DEPARTMENT_KEYWORDS: Record<string, string[]> = {
    'الإيرادات': [
        'ضريبة', 'ضرائب', 'رسوم', 'تحصيل', 'إيرادات', 'جباية',
        'رسم', 'عوائد', 'إيراد', 'تكليف', 'ربط ضريبي'
    ],
    'الحسابات': [
        'حساب', 'رصيد', 'دفعة', 'مستحقات', 'ذمم', 'صرف',
        'قيد', 'ميزانية', 'موازنة', 'إنفاق'
    ],
    'الشؤون القانونية': [
        'قانون', 'قرار', 'حكم', 'استئناف', 'اعتراض', 'طعن',
        'تظلم', 'نزاع', 'دعوى', 'محكمة', 'قضائي'
    ],
    'خدمة المواطنين': [
        'شهادة', 'وثيقة', 'براءة ذمة', 'تصديق', 'استعلام',
        'معاملة', 'طلب', 'خدمة', 'مراجعة'
    ],
    'الديوان': [
        'مدير', 'إدارة', 'عام', 'إداري', 'شكوى عامة',
        'موظف', 'تأخير', 'سوء معاملة'
    ],
    'الصناديق': [
        'صندوق', 'دفع', 'تسديد', 'إيصال', 'سند قبض',
        'تحويل', 'بنك'
    ],
    'التفتيش': [
        'مخالفة', 'تفتيش', 'رقابة', 'فحص', 'تدقيق',
        'تحقق', 'كشف'
    ]
};

// أنماط الأولوية
const PRIORITY_PATTERNS: Record<string, RegExp[]> = {
    urgent: [
        /عاجل/i,
        /فوري/i,
        /طارئ/i,
        /ضروري جداً/i,
        /لا يحتمل التأخير/i
    ],
    high: [
        /مهم/i,
        /سريع/i,
        /قريباً/i,
        /بأسرع وقت/i,
        /ضروري/i
    ],
    medium: [
        /متوسط/i,
        /عادي/i,
        /روتيني/i
    ],
    low: [
        /غير مستعجل/i,
        /عندما يتسنى/i,
        /لاحقاً/i
    ]
};

// الفئات
const CATEGORIES: Record<string, string[]> = {
    'ضرائب': ['ضريبة دخل', 'ضريبة عقارية', 'ضريبة مركبات', 'رسوم'],
    'معاملات': ['شهادات', 'براءة ذمة', 'تصديق', 'استعلام'],
    'شكاوى': ['تأخير', 'سوء خدمة', 'خطأ', 'اعتراض'],
    'مالية': ['دفعات', 'مستحقات', 'استرداد', 'تقسيط'],
    'قانونية': ['اعتراض', 'طعن', 'تظلم', 'استئناف']
};

const DEFAULT_CONFIG: ClassificationConfig = {
    minConfidence: 0.3,
    useDepartmentHistory: true,
    useKeywordMatching: true,
    usePatternRecognition: true
};

/**
 * تصنيف الشكوى
 */
export function classifyTicket(
    title: string,
    description: string,
    config: Partial<ClassificationConfig> = {}
): ClassificationResult {
    const cfg = { ...DEFAULT_CONFIG, ...config };
    const text = `${title} ${description}`.toLowerCase();

    // حساب درجات الأقسام
    const departmentScores: Record<string, number> = {};

    if (cfg.useKeywordMatching) {
        Object.entries(DEPARTMENT_KEYWORDS).forEach(([dept, keywords]) => {
            let score = 0;
            keywords.forEach(keyword => {
                if (text.includes(keyword.toLowerCase())) {
                    score += 1;
                }
            });
            departmentScores[dept] = score / keywords.length;
        });
    }

    // استخدام سجل التصنيفات السابقة
    if (cfg.useDepartmentHistory) {
        const history = loadClassificationHistory();
        Object.entries(history).forEach(([dept, count]) => {
            if (departmentScores[dept]) {
                departmentScores[dept] *= (1 + count * 0.01);
            }
        });
    }

    // ترتيب الأقسام حسب الدرجة
    const sortedDepts = Object.entries(departmentScores)
        .sort((a, b) => b[1] - a[1])
        .filter(([_, score]) => score > 0);

    const topDept = sortedDepts[0] || ['خدمة المواطنين', 0.5];
    const confidence = Math.min(topDept[1], 1);

    // تحديد الأولوية
    const priority = detectPriority(text);

    // تحديد الفئة
    const { category, subcategory } = detectCategory(text);

    // استخراج الوسوم
    const tags = extractTags(text);

    return {
        department: topDept[0],
        confidence,
        alternativeDepartments: sortedDepts.slice(1, 4).map(([name, score]) => ({
            name,
            confidence: Math.min(score, 1)
        })),
        category,
        subcategory,
        priority,
        tags,
        reasoning: generateReasoning(topDept[0], tags, confidence)
    };
}

/**
 * اكتشاف الأولوية
 */
function detectPriority(text: string): 'low' | 'medium' | 'high' | 'urgent' {
    for (const [priority, patterns] of Object.entries(PRIORITY_PATTERNS)) {
        for (const pattern of patterns) {
            if (pattern.test(text)) {
                return priority as 'low' | 'medium' | 'high' | 'urgent';
            }
        }
    }
    return 'medium';
}

/**
 * اكتشاف الفئة
 */
function detectCategory(text: string): { category: string; subcategory?: string } {
    for (const [cat, subcats] of Object.entries(CATEGORIES)) {
        for (const subcat of subcats) {
            if (text.includes(subcat.toLowerCase())) {
                return { category: cat, subcategory: subcat };
            }
        }
        if (text.includes(cat.toLowerCase())) {
            return { category: cat };
        }
    }
    return { category: 'عام' };
}

/**
 * استخراج الوسوم
 */
function extractTags(text: string): string[] {
    const tags: string[] = [];

    // كلمات مفتاحية عامة
    const tagPatterns = [
        { pattern: /ضريب/i, tag: 'ضريبة' },
        { pattern: /رسو?م/i, tag: 'رسوم' },
        { pattern: /شهاد/i, tag: 'شهادة' },
        { pattern: /براءة/i, tag: 'براءة ذمة' },
        { pattern: /اعتراض/i, tag: 'اعتراض' },
        { pattern: /تأخير/i, tag: 'تأخير' },
        { pattern: /دفع/i, tag: 'دفع' },
        { pattern: /استرداد/i, tag: 'استرداد' },
        { pattern: /تقسيط/i, tag: 'تقسيط' },
        { pattern: /عقار/i, tag: 'عقاري' },
        { pattern: /سيار|مركب/i, tag: 'مركبات' }
    ];

    tagPatterns.forEach(({ pattern, tag }) => {
        if (pattern.test(text) && !tags.includes(tag)) {
            tags.push(tag);
        }
    });

    return tags.slice(0, 5);
}

/**
 * توليد التعليل
 */
function generateReasoning(department: string, tags: string[], confidence: number): string {
    const confidenceText = confidence > 0.7 ? 'بدرجة ثقة عالية' :
        confidence > 0.4 ? 'بدرجة ثقة متوسطة' :
            'بدرجة ثقة منخفضة';

    const tagsText = tags.length > 0
        ? `بناءً على الكلمات المفتاحية: ${tags.join('، ')}`
        : 'بناءً على المحتوى العام';

    return `تم تصنيف الشكوى إلى قسم "${department}" ${confidenceText}. ${tagsText}.`;
}

/**
 * تحميل سجل التصنيفات
 */
function loadClassificationHistory(): Record<string, number> {
    try {
        const saved = localStorage.getItem('classification-history');
        return saved ? JSON.parse(saved) : {};
    } catch {
        return {};
    }
}

/**
 * تحديث سجل التصنيفات
 */
export function updateClassificationHistory(department: string): void {
    const history = loadClassificationHistory();
    history[department] = (history[department] || 0) + 1;
    localStorage.setItem('classification-history', JSON.stringify(history));
}

/**
 * تدريب المصنف بناءً على التغذية الراجعة
 */
export function trainClassifier(
    title: string,
    description: string,
    correctDepartment: string
): void {
    const text = `${title} ${description}`.toLowerCase();

    // استخراج كلمات مفتاحية جديدة
    const words = text.split(/\s+/).filter(w => w.length > 2);

    // تحميل الكلمات المفتاحية المخصصة
    const customKeywords = loadCustomKeywords();

    if (!customKeywords[correctDepartment]) {
        customKeywords[correctDepartment] = [];
    }

    // إضافة الكلمات الجديدة
    words.forEach(word => {
        if (!customKeywords[correctDepartment].includes(word)) {
            customKeywords[correctDepartment].push(word);
        }
    });

    // الحد من العدد
    customKeywords[correctDepartment] = customKeywords[correctDepartment].slice(-50);

    localStorage.setItem('custom-keywords', JSON.stringify(customKeywords));
}

/**
 * تحميل الكلمات المفتاحية المخصصة
 */
function loadCustomKeywords(): Record<string, string[]> {
    try {
        const saved = localStorage.getItem('custom-keywords');
        return saved ? JSON.parse(saved) : {};
    } catch {
        return {};
    }
}

/**
 * الحصول على اقتراحات التصنيف
 */
export function getClassificationSuggestions(partialText: string): string[] {
    if (partialText.length < 3) return [];

    const suggestions: string[] = [];
    const text = partialText.toLowerCase();

    Object.entries(DEPARTMENT_KEYWORDS).forEach(([dept, keywords]) => {
        keywords.forEach(keyword => {
            if (keyword.toLowerCase().startsWith(text)) {
                suggestions.push(keyword);
            }
        });
    });

    return [...new Set(suggestions)].slice(0, 5);
}

/**
 * تحليل الشكاوى المشابهة
 */
export function findSimilarTickets(
    title: string,
    description: string,
    existingTickets: Array<{ id: string; title: string; description: string; department: string }>
): Array<{ id: string; similarity: number }> {
    const text = `${title} ${description}`.toLowerCase();
    const words = new Set(text.split(/\s+/).filter(w => w.length > 2));

    const similarities = existingTickets.map(ticket => {
        const ticketText = `${ticket.title} ${ticket.description}`.toLowerCase();
        const ticketWords = new Set(ticketText.split(/\s+/).filter(w => w.length > 2));

        // حساب التشابه (Jaccard similarity)
        const intersection = [...words].filter(w => ticketWords.has(w)).length;
        const union = new Set([...words, ...ticketWords]).size;
        const similarity = union > 0 ? intersection / union : 0;

        return { id: ticket.id, similarity };
    });

    return similarities
        .filter(s => s.similarity > 0.2)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 5);
}

export default {
    classifyTicket,
    updateClassificationHistory,
    trainClassifier,
    getClassificationSuggestions,
    findSimilarTickets
};
