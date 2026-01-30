// =====================================================
// 💡 AI Response Suggestions
// اقتراحات الرد بالذكاء الاصطناعي
// =====================================================

export interface ResponseSuggestion {
    id: string;
    text: string;
    confidence: number;
    category: string;
    tone: 'formal' | 'friendly' | 'apologetic' | 'informative';
    isTemplate: boolean;
    variables?: string[];
}

export interface SuggestionContext {
    ticketTitle: string;
    ticketDescription: string;
    department: string;
    priority: string;
    previousResponses?: string[];
    citizenName?: string;
}

// قوالب الردود حسب الفئة
const RESPONSE_TEMPLATES: Record<string, Array<{
    text: string;
    tone: ResponseSuggestion['tone'];
    variables?: string[];
}>> = {
    'استلام': [
        {
            text: 'تم استلام شكواكم بنجاح، وسيتم دراستها والرد عليكم في أقرب وقت ممكن.',
            tone: 'formal'
        },
        {
            text: 'شكراً لتواصلكم معنا. تم تسجيل شكواكم برقم {ticketId} وسنعمل على معالجتها بأسرع وقت.',
            tone: 'friendly',
            variables: ['ticketId']
        }
    ],
    'قيد المعالجة': [
        {
            text: 'شكواكم قيد الدراسة حالياً من قبل الجهة المختصة. نرجو منكم الصبر وسيتم الرد عليكم قريباً.',
            tone: 'formal'
        },
        {
            text: 'نحيطكم علماً بأن شكواكم تحت الإجراء، وسيتم إبلاغكم فور الانتهاء من دراستها.',
            tone: 'informative'
        }
    ],
    'طلب معلومات': [
        {
            text: 'للتمكن من معالجة طلبكم، نرجو منكم تزويدنا بالمستندات التالية: {documents}',
            tone: 'formal',
            variables: ['documents']
        },
        {
            text: 'نحتاج إلى بعض المعلومات الإضافية لإتمام معالجة شكواكم. يرجى تزويدنا بـ: {requiredInfo}',
            tone: 'friendly',
            variables: ['requiredInfo']
        }
    ],
    'اعتذار': [
        {
            text: 'نعتذر عن أي إزعاج قد تسببت به هذه المشكلة، ونؤكد لكم أننا نعمل على حلها بأسرع وقت ممكن.',
            tone: 'apologetic'
        },
        {
            text: 'نأسف للتأخير في الرد على شكواكم، ونحيطكم علماً بأنه تم اتخاذ الإجراءات اللازمة لتسريع المعالجة.',
            tone: 'apologetic'
        }
    ],
    'تحويل': [
        {
            text: 'تم تحويل شكواكم إلى {department} المختص للنظر فيها واتخاذ الإجراء المناسب.',
            tone: 'formal',
            variables: ['department']
        }
    ],
    'إغلاق': [
        {
            text: 'تم حل شكواكم بنجاح. نشكركم على تواصلكم معنا ونتمنى أن نكون قد قدمنا لكم الخدمة المطلوبة.',
            tone: 'friendly'
        },
        {
            text: 'تم إنجاز المطلوب في شكواكم. في حال وجود أي استفسار آخر، يرجى التواصل معنا.',
            tone: 'formal'
        }
    ],
    'رفض': [
        {
            text: 'نأسف لإبلاغكم بأنه تعذر قبول طلبكم للأسباب التالية: {reasons}',
            tone: 'formal',
            variables: ['reasons']
        },
        {
            text: 'بعد دراسة شكواكم، تبين أنها لا تستوفي الشروط المطلوبة. يمكنكم الاعتراض خلال 15 يوماً.',
            tone: 'formal'
        }
    ],
    'ضرائب': [
        {
            text: 'بخصوص استفساركم الضريبي، نفيدكم بأن {response}. لمزيد من التفاصيل، يرجى مراجعة قسم الإيرادات.',
            tone: 'informative',
            variables: ['response']
        },
        {
            text: 'تم احتساب الضريبة المستحقة عليكم بمبلغ {amount} ل.س. يرجى التسديد خلال المهلة المحددة.',
            tone: 'formal',
            variables: ['amount']
        }
    ],
    'براءة ذمة': [
        {
            text: 'تم إصدار براءة الذمة المطلوبة. يمكنكم استلامها من مكتب خدمة المواطنين خلال أوقات الدوام الرسمي.',
            tone: 'formal'
        },
        {
            text: 'لإصدار براءة الذمة، يرجى تسديد المستحقات المترتبة عليكم أولاً والبالغة {amount} ل.س.',
            tone: 'informative',
            variables: ['amount']
        }
    ]
};

// كلمات مفتاحية للاكتشاف
const CATEGORY_KEYWORDS: Record<string, string[]> = {
    'استلام': ['جديد', 'تقديم', 'استلام'],
    'قيد المعالجة': ['متابعة', 'حالة', 'أين وصلت'],
    'طلب معلومات': ['مستندات', 'أوراق', 'وثائق', 'معلومات'],
    'اعتذار': ['تأخير', 'مشكلة', 'خطأ', 'سوء'],
    'تحويل': ['تحويل', 'قسم آخر', 'اختصاص'],
    'إغلاق': ['حل', 'انتهى', 'تم'],
    'رفض': ['رفض', 'عدم قبول', 'لا يمكن'],
    'ضرائب': ['ضريبة', 'ضرائب', 'رسوم', 'تكليف'],
    'براءة ذمة': ['براءة', 'ذمة', 'شهادة']
};

/**
 * الحصول على اقتراحات الرد
 */
export function getSuggestions(context: SuggestionContext): ResponseSuggestion[] {
    const suggestions: ResponseSuggestion[] = [];
    const text = `${context.ticketTitle} ${context.ticketDescription}`.toLowerCase();

    // اكتشاف الفئات المناسبة
    const matchedCategories = detectCategories(text);

    // إضافة القوالب المناسبة
    matchedCategories.forEach(category => {
        const templates = RESPONSE_TEMPLATES[category] || [];

        templates.forEach((template, index) => {
            const processed = processTemplate(template.text, context);

            suggestions.push({
                id: `${category}-${index}`,
                text: processed.text,
                confidence: calculateConfidence(category, text),
                category,
                tone: template.tone,
                isTemplate: true,
                variables: processed.missingVariables
            });
        });
    });

    // إضافة اقتراحات مخصصة من السجل
    const customSuggestions = getCustomSuggestions(context);
    suggestions.push(...customSuggestions);

    // ترتيب حسب الثقة
    return suggestions
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 8);
}

/**
 * اكتشاف الفئات المناسبة
 */
function detectCategories(text: string): string[] {
    const matches: Array<{ category: string; score: number }> = [];

    Object.entries(CATEGORY_KEYWORDS).forEach(([category, keywords]) => {
        let score = 0;
        keywords.forEach(keyword => {
            if (text.includes(keyword)) {
                score++;
            }
        });

        if (score > 0) {
            matches.push({ category, score: score / keywords.length });
        }
    });

    // إرجاع الفئات الأعلى
    return matches
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map(m => m.category);
}

/**
 * معالجة القالب
 */
function processTemplate(
    template: string,
    context: SuggestionContext
): { text: string; missingVariables: string[] } {
    let text = template;
    const missingVariables: string[] = [];

    // استبدال المتغيرات المعروفة
    const variables: Record<string, string | undefined> = {
        citizenName: context.citizenName,
        department: context.department
    };

    Object.entries(variables).forEach(([key, value]) => {
        if (value) {
            text = text.replace(new RegExp(`{${key}}`, 'g'), value);
        }
    });

    // اكتشاف المتغيرات المفقودة
    const variablePattern = /{(\w+)}/g;
    let match;
    while ((match = variablePattern.exec(text)) !== null) {
        missingVariables.push(match[1]);
    }

    return { text, missingVariables };
}

/**
 * حساب درجة الثقة
 */
function calculateConfidence(category: string, text: string): number {
    const keywords = CATEGORY_KEYWORDS[category] || [];
    let matchCount = 0;

    keywords.forEach(keyword => {
        if (text.includes(keyword)) {
            matchCount++;
        }
    });

    return keywords.length > 0 ? Math.min(matchCount / keywords.length + 0.3, 1) : 0.5;
}

/**
 * الحصول على اقتراحات مخصصة
 */
function getCustomSuggestions(context: SuggestionContext): ResponseSuggestion[] {
    const history = loadResponseHistory();
    const suggestions: ResponseSuggestion[] = [];

    // البحث عن ردود مشابهة سابقة
    history
        .filter(h => h.department === context.department)
        .slice(-5)
        .forEach((h, index) => {
            suggestions.push({
                id: `custom-${index}`,
                text: h.response,
                confidence: 0.4,
                category: 'سابق',
                tone: 'formal',
                isTemplate: false
            });
        });

    return suggestions;
}

/**
 * تحميل سجل الردود
 */
function loadResponseHistory(): Array<{ department: string; response: string }> {
    try {
        const saved = localStorage.getItem('response-history');
        return saved ? JSON.parse(saved) : [];
    } catch {
        return [];
    }
}

/**
 * حفظ رد في السجل
 */
export function saveToHistory(department: string, response: string): void {
    const history = loadResponseHistory();

    // تجنب التكرار
    if (!history.some(h => h.response === response)) {
        history.push({ department, response });

        // الحد الأقصى 100 رد
        const trimmed = history.slice(-100);
        localStorage.setItem('response-history', JSON.stringify(trimmed));
    }
}

/**
 * إكمال الرد التلقائي
 */
export function autocompleteResponse(
    partialText: string,
    context: SuggestionContext
): string[] {
    const suggestions: string[] = [];

    // اقتراحات من القوالب
    Object.values(RESPONSE_TEMPLATES).flat().forEach(template => {
        const processed = processTemplate(template.text, context).text;
        if (processed.toLowerCase().startsWith(partialText.toLowerCase())) {
            suggestions.push(processed);
        }
    });

    // اقتراحات من السجل
    loadResponseHistory().forEach(h => {
        if (h.response.toLowerCase().startsWith(partialText.toLowerCase())) {
            suggestions.push(h.response);
        }
    });

    return [...new Set(suggestions)].slice(0, 5);
}

/**
 * تحسين الرد
 */
export function improveResponse(response: string): string {
    let improved = response;

    // تحسينات لغوية بسيطة
    const improvements: Array<[RegExp, string]> = [
        [/\s+/g, ' '], // إزالة المسافات الزائدة
        [/،\s*،/g, '،'], // إزالة الفواصل المكررة
        [/\.\s*\./g, '.'], // إزالة النقاط المكررة
        [/^\s+|\s+$/g, ''], // إزالة المسافات في البداية والنهاية
    ];

    improvements.forEach(([pattern, replacement]) => {
        improved = improved.replace(pattern, replacement);
    });

    // التأكد من وجود نقطة في النهاية
    if (improved && !/[.،!؟]$/.test(improved)) {
        improved += '.';
    }

    return improved;
}

/**
 * تغيير نبرة الرد
 */
export function changeTone(
    response: string,
    targetTone: ResponseSuggestion['tone']
): string {
    let modified = response;

    const toneModifiers: Record<ResponseSuggestion['tone'], Array<[string, string]>> = {
        formal: [
            ['شكراً', 'نشكركم'],
            ['يرجى', 'يُرجى'],
            ['نرجو', 'نرجو منكم التكرم']
        ],
        friendly: [
            ['نشكركم', 'شكراً لك'],
            ['يُرجى', 'من فضلك'],
            ['نفيدكم', 'نود إخبارك']
        ],
        apologetic: [
            ['نفيدكم', 'نعتذر ونفيدكم'],
            ['تم', 'نأسف، ولكن تم']
        ],
        informative: [
            ['نفيدكم', 'للعلم،'],
            ['يرجى', 'ننصحك بـ']
        ]
    };

    const modifiers = toneModifiers[targetTone] || [];
    modifiers.forEach(([from, to]) => {
        modified = modified.replace(new RegExp(from, 'g'), to);
    });

    return modified;
}

/**
 * إنشاء رد من الصفر
 */
export function generateResponse(context: SuggestionContext): string {
    const suggestions = getSuggestions(context);

    if (suggestions.length > 0) {
        return suggestions[0].text;
    }

    // رد افتراضي
    return `السيد/ة ${context.citizenName || 'المواطن'} الكريم/ة،\n\nبخصوص شكواكم المتعلقة بـ "${context.ticketTitle}"، نحيطكم علماً بأننا نعمل على دراستها وسيتم الرد عليكم في أقرب وقت.\n\nمع التحية`;
}

export default {
    getSuggestions,
    saveToHistory,
    autocompleteResponse,
    improveResponse,
    changeTone,
    generateResponse
};
