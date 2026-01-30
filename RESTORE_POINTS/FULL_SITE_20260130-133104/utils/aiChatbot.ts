// =====================================================
// 🤖 AI Chatbot System
// نظام المحادثة الآلية (شات بوت)
// =====================================================

export interface ChatMessage {
    id: string;
    role: 'user' | 'bot' | 'system';
    content: string;
    timestamp: number;
    metadata?: {
        intent?: string;
        confidence?: number;
        action?: string;
        entities?: Record<string, string>;
    };
}

export interface ChatSession {
    id: string;
    messages: ChatMessage[];
    context: ChatContext;
    startedAt: number;
    lastActivity: number;
}

export interface ChatContext {
    userId?: string;
    userName?: string;
    currentTicketId?: string;
    lastIntent?: string;
    collectedData?: Record<string, unknown>;
    step?: string;
}

export interface Intent {
    name: string;
    patterns: string[];
    responses: string[];
    action?: string;
    followUp?: string;
    entities?: string[];
}

// الأنماط والردود
const INTENTS: Intent[] = [
    {
        name: 'greeting',
        patterns: ['مرحب', 'السلام', 'أهلاً', 'صباح', 'مساء', 'هاي', 'هلا'],
        responses: [
            'مرحباً بك في نظام الاستعلامات والشكاوى! كيف يمكنني مساعدتك اليوم؟',
            'أهلاً وسهلاً! أنا هنا لمساعدتك. ماذا تود أن تعرف؟',
            'السلام عليكم! يسعدني خدمتك. كيف أستطيع مساعدتك؟'
        ]
    },
    {
        name: 'submit_ticket',
        patterns: ['تقديم شكوى', 'شكوى جديدة', 'أريد تقديم', 'رفع شكوى', 'تسجيل شكوى'],
        responses: [
            'يسعدني مساعدتك في تقديم شكوى جديدة. ما هو موضوع شكواك؟'
        ],
        action: 'start_ticket_submission',
        followUp: 'collect_ticket_title'
    },
    {
        name: 'track_ticket',
        patterns: ['متابعة شكوى', 'تتبع', 'أين وصلت', 'حالة الشكوى', 'رقم الشكوى'],
        responses: [
            'لمتابعة شكواك، يرجى إدخال رقم الشكوى:'
        ],
        action: 'track_ticket',
        followUp: 'collect_ticket_id',
        entities: ['ticket_id']
    },
    {
        name: 'departments',
        patterns: ['الأقسام', 'قسم', 'أقسام', 'إيرادات', 'حسابات', 'قانوني'],
        responses: [
            'لدينا عدة أقسام:\n• الإيرادات\n• الحسابات\n• الشؤون القانونية\n• خدمة المواطنين\n• الديوان\n\nأي قسم تريد الاستفسار عنه؟'
        ]
    },
    {
        name: 'working_hours',
        patterns: ['أوقات الدوام', 'ساعات العمل', 'متى تفتح', 'مواعيد'],
        responses: [
            'أوقات الدوام الرسمية:\n• من الأحد إلى الخميس\n• من الساعة 8 صباحاً حتى 3 مساءً\n• الجمعة والسبت: عطلة رسمية'
        ]
    },
    {
        name: 'contact_info',
        patterns: ['رقم الهاتف', 'اتصال', 'تواصل', 'عنوان', 'موقع'],
        responses: [
            'معلومات التواصل:\n📍 العنوان: حلب - شارع المالية\n📞 الهاتف: 021-XXXXXXX\n📧 البريد: info@aleppo-finance.gov.sy'
        ]
    },
    {
        name: 'taxes',
        patterns: ['ضريبة', 'ضرائب', 'رسوم', 'تكليف', 'ربط ضريبي'],
        responses: [
            'للاستفسار عن الضرائب والرسوم:\n• ضريبة الدخل: قسم الإيرادات\n• ضريبة العقارات: قسم الإيرادات\n• براءة الذمة: خدمة المواطنين\n\nهل تريد تفاصيل أكثر عن نوع معين؟'
        ]
    },
    {
        name: 'certificate',
        patterns: ['شهادة', 'براءة ذمة', 'وثيقة', 'تصديق'],
        responses: [
            'للحصول على الشهادات والوثائق:\n1. تقديم طلب في خدمة المواطنين\n2. إرفاق المستندات المطلوبة\n3. دفع الرسوم المقررة\n4. استلام الشهادة\n\nهل تريد معرفة المستندات المطلوبة؟'
        ]
    },
    {
        name: 'help',
        patterns: ['مساعدة', 'كيف', 'ماذا', 'شرح', 'دليل'],
        responses: [
            'يمكنني مساعدتك في:\n• تقديم شكوى جديدة\n• متابعة شكوى سابقة\n• الاستفسار عن الضرائب\n• معرفة أوقات الدوام\n• معلومات التواصل\n\nماذا تريد أن تعرف؟'
        ]
    },
    {
        name: 'thanks',
        patterns: ['شكر', 'شكراً', 'ممتن', 'أحسنت'],
        responses: [
            'العفو! سعيد بخدمتك. هل هناك شيء آخر؟',
            'على الرحب والسعة! لا تتردد في السؤال إذا احتجت أي مساعدة أخرى.'
        ]
    },
    {
        name: 'goodbye',
        patterns: ['وداع', 'مع السلامة', 'إلى اللقاء', 'باي'],
        responses: [
            'مع السلامة! نتمنى أن نكون قد قدمنا لك الخدمة المطلوبة.',
            'إلى اللقاء! لا تتردد في العودة إذا احتجت أي مساعدة.'
        ]
    }
];

// الردود الافتراضية
const DEFAULT_RESPONSES = [
    'عذراً، لم أفهم سؤالك جيداً. هل يمكنك إعادة صياغته؟',
    'يمكنك سؤالي عن: تقديم شكوى، متابعة شكوى، أوقات الدوام، أو معلومات التواصل.',
    'للحصول على مساعدة، اكتب "مساعدة" أو اختر من الخيارات المتاحة.'
];

const SESSIONS_KEY = 'chat-sessions';

/**
 * توليد معرف فريد
 */
function generateId(): string {
    return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * تحميل الجلسات
 */
function loadSessions(): Record<string, ChatSession> {
    try {
        const saved = localStorage.getItem(SESSIONS_KEY);
        return saved ? JSON.parse(saved) : {};
    } catch {
        return {};
    }
}

/**
 * حفظ الجلسات
 */
function saveSessions(sessions: Record<string, ChatSession>): void {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

/**
 * الحصول على جلسة أو إنشاء واحدة جديدة
 */
export function getOrCreateSession(sessionId?: string): ChatSession {
    const sessions = loadSessions();

    if (sessionId && sessions[sessionId]) {
        sessions[sessionId].lastActivity = Date.now();
        saveSessions(sessions);
        return sessions[sessionId];
    }

    const newSession: ChatSession = {
        id: sessionId || generateId(),
        messages: [],
        context: {},
        startedAt: Date.now(),
        lastActivity: Date.now()
    };

    // رسالة ترحيبية
    newSession.messages.push({
        id: generateId(),
        role: 'bot',
        content: 'مرحباً بك في نظام مديرية مالية حلب! 👋\nكيف يمكنني مساعدتك اليوم؟',
        timestamp: Date.now()
    });

    sessions[newSession.id] = newSession;
    saveSessions(sessions);

    return newSession;
}

/**
 * اكتشاف النية
 */
function detectIntent(text: string): { intent: Intent | null; confidence: number } {
    const lowerText = text.toLowerCase();
    let bestMatch: Intent | null = null;
    let bestScore = 0;

    INTENTS.forEach(intent => {
        let score = 0;

        intent.patterns.forEach(pattern => {
            if (lowerText.includes(pattern)) {
                score += 1;
            }
        });

        const normalizedScore = score / intent.patterns.length;

        if (normalizedScore > bestScore) {
            bestScore = normalizedScore;
            bestMatch = intent;
        }
    });

    return {
        intent: bestScore > 0.2 ? bestMatch : null,
        confidence: bestScore
    };
}

/**
 * استخراج الكيانات
 */
function extractEntities(text: string): Record<string, string> {
    const entities: Record<string, string> = {};

    // استخراج رقم الشكوى
    const ticketIdMatch = text.match(/(\d{4,})/);
    if (ticketIdMatch) {
        entities.ticket_id = ticketIdMatch[1];
    }

    // استخراج رقم الهاتف
    const phoneMatch = text.match(/(\d{10,})/);
    if (phoneMatch) {
        entities.phone = phoneMatch[1];
    }

    // استخراج البريد الإلكتروني
    const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/);
    if (emailMatch) {
        entities.email = emailMatch[0];
    }

    return entities;
}

/**
 * معالجة رسالة المستخدم
 */
export function processMessage(
    sessionId: string,
    userMessage: string
): ChatMessage {
    const sessions = loadSessions();
    const session = sessions[sessionId];

    if (!session) {
        throw new Error('Session not found');
    }

    // إضافة رسالة المستخدم
    const userMsg: ChatMessage = {
        id: generateId(),
        role: 'user',
        content: userMessage,
        timestamp: Date.now()
    };
    session.messages.push(userMsg);

    // اكتشاف النية
    const { intent, confidence } = detectIntent(userMessage);
    const entities = extractEntities(userMessage);

    // تحديد الرد
    let response: string;
    let action: string | undefined;

    if (session.context.step) {
        // معالجة خطوة في سير العمل
        const stepResponse = handleWorkflowStep(session, userMessage, entities);
        response = stepResponse.response;
        action = stepResponse.action;
    } else if (intent) {
        // رد عادي بناءً على النية
        response = intent.responses[Math.floor(Math.random() * intent.responses.length)];
        action = intent.action;

        if (intent.followUp) {
            session.context.step = intent.followUp;
            session.context.lastIntent = intent.name;
        }
    } else {
        // رد افتراضي
        response = DEFAULT_RESPONSES[Math.floor(Math.random() * DEFAULT_RESPONSES.length)];
    }

    // إضافة رسالة البوت
    const botMsg: ChatMessage = {
        id: generateId(),
        role: 'bot',
        content: response,
        timestamp: Date.now(),
        metadata: {
            intent: intent?.name,
            confidence,
            action,
            entities
        }
    };
    session.messages.push(botMsg);

    // تحديث السياق
    session.context.collectedData = {
        ...session.context.collectedData,
        ...entities
    };
    session.lastActivity = Date.now();

    saveSessions(sessions);

    return botMsg;
}

/**
 * معالجة خطوة في سير العمل
 */
function handleWorkflowStep(
    session: ChatSession,
    userInput: string,
    entities: Record<string, string>
): { response: string; action?: string } {
    const step = session.context.step;

    switch (step) {
        case 'collect_ticket_id':
            if (entities.ticket_id) {
                session.context.currentTicketId = entities.ticket_id;
                session.context.step = undefined;
                return {
                    response: `جاري البحث عن الشكوى رقم ${entities.ticket_id}...\n\n⏳ يمكنك متابعة حالة شكواك من خلال صفحة "تتبع الشكوى" على الموقع.`,
                    action: 'show_ticket_status'
                };
            }
            return {
                response: 'يرجى إدخال رقم الشكوى (أرقام فقط):'
            };

        case 'collect_ticket_title':
            session.context.collectedData = {
                ...session.context.collectedData,
                title: userInput
            };
            session.context.step = 'collect_ticket_description';
            return {
                response: 'ممتاز! الآن، يرجى كتابة تفاصيل الشكوى:'
            };

        case 'collect_ticket_description':
            session.context.collectedData = {
                ...session.context.collectedData,
                description: userInput
            };
            session.context.step = 'confirm_ticket';
            const data = session.context.collectedData as { title: string };
            return {
                response: `شكراً لك! إليك ملخص شكواك:\n\n📝 العنوان: ${data.title}\n📄 التفاصيل: ${userInput}\n\nهل تريد تقديم الشكوى؟ (نعم/لا)`
            };

        case 'confirm_ticket':
            if (userInput.includes('نعم')) {
                session.context.step = undefined;
                return {
                    response: '✅ تم تسجيل شكواك بنجاح!\n\nسيتم مراجعتها والرد عليك في أقرب وقت.\nللمتابعة، احتفظ برقم الشكوى.',
                    action: 'submit_ticket'
                };
            } else {
                session.context.step = undefined;
                session.context.collectedData = {};
                return {
                    response: 'تم إلغاء تقديم الشكوى. كيف يمكنني مساعدتك بشكل آخر؟'
                };
            }

        default:
            session.context.step = undefined;
            return {
                response: 'كيف يمكنني مساعدتك؟'
            };
    }
}

/**
 * الحصول على الأزرار السريعة
 */
export function getQuickReplies(context: ChatContext): string[] {
    if (context.step === 'confirm_ticket') {
        return ['نعم، قدم الشكوى', 'لا، إلغاء'];
    }

    return [
        'تقديم شكوى',
        'متابعة شكوى',
        'أوقات الدوام',
        'معلومات التواصل'
    ];
}

/**
 * حذف جلسة
 */
export function deleteSession(sessionId: string): void {
    const sessions = loadSessions();
    delete sessions[sessionId];
    saveSessions(sessions);
}

/**
 * مسح الجلسات القديمة
 */
export function cleanOldSessions(maxAgeDays: number = 7): number {
    const sessions = loadSessions();
    const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;

    let deleted = 0;
    Object.entries(sessions).forEach(([id, session]) => {
        if (session.lastActivity < cutoff) {
            delete sessions[id];
            deleted++;
        }
    });

    saveSessions(sessions);
    return deleted;
}

/**
 * الحصول على إحصائيات المحادثات
 */
export function getChatStats(): {
    totalSessions: number;
    totalMessages: number;
    averageMessagesPerSession: number;
    topIntents: Array<{ intent: string; count: number }>;
} {
    const sessions = loadSessions();
    const intentCounts = new Map<string, number>();

    let totalMessages = 0;

    Object.values(sessions).forEach(session => {
        totalMessages += session.messages.length;

        session.messages.forEach(msg => {
            if (msg.metadata?.intent) {
                intentCounts.set(
                    msg.metadata.intent,
                    (intentCounts.get(msg.metadata.intent) || 0) + 1
                );
            }
        });
    });

    const sessionCount = Object.keys(sessions).length;

    return {
        totalSessions: sessionCount,
        totalMessages,
        averageMessagesPerSession: sessionCount > 0 ? totalMessages / sessionCount : 0,
        topIntents: [...intentCounts.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([intent, count]) => ({ intent, count }))
    };
}

export default {
    getOrCreateSession,
    processMessage,
    getQuickReplies,
    deleteSession,
    cleanOldSessions,
    getChatStats
};
