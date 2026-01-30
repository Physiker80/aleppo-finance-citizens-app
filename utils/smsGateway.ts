// =====================================================
// 📱 SMS Gateway Integration
// تكامل بوابة الرسائل القصيرة
// =====================================================

export interface SMSConfig {
    provider: SMSProvider;
    apiKey: string;
    apiSecret?: string;
    senderId: string;
    baseUrl?: string;
    isEnabled: boolean;
    maxRetries: number;
    retryDelay: number;
}

export type SMSProvider = 'twilio' | 'nexmo' | 'messagebird' | 'local' | 'custom';

export interface SMSMessage {
    id: string;
    to: string;
    from: string;
    body: string;
    status: SMSStatus;
    direction: 'outgoing' | 'incoming';
    createdAt: number;
    sentAt?: number;
    deliveredAt?: number;
    failedAt?: number;
    error?: string;
    ticketId?: string;
    cost?: number;
}

export type SMSStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'queued';

export interface SMSTemplate {
    id: string;
    name: string;
    body: string;
    variables: string[];
    category: string;
}

const CONFIG_KEY = 'sms-config';
const MESSAGES_KEY = 'sms-messages';
const TEMPLATES_KEY = 'sms-templates';

// القوالب الافتراضية
const DEFAULT_TEMPLATES: SMSTemplate[] = [
    {
        id: 'ticket-created',
        name: 'تم إنشاء شكوى',
        body: 'تم استلام شكواكم برقم {ticketId}. سيتم الرد عليكم قريباً. مديرية مالية حلب',
        variables: ['ticketId'],
        category: 'شكاوى'
    },
    {
        id: 'ticket-updated',
        name: 'تحديث شكوى',
        body: 'تم تحديث حالة شكواكم رقم {ticketId} إلى: {status}. مديرية مالية حلب',
        variables: ['ticketId', 'status'],
        category: 'شكاوى'
    },
    {
        id: 'ticket-resolved',
        name: 'حل شكوى',
        body: 'تم حل شكواكم رقم {ticketId}. شكراً لتواصلكم معنا. مديرية مالية حلب',
        variables: ['ticketId'],
        category: 'شكاوى'
    },
    {
        id: 'payment-reminder',
        name: 'تذكير بالدفع',
        body: 'تذكير: لديكم مستحقات مالية بقيمة {amount} ل.س. يرجى التسديد قبل {dueDate}. مديرية مالية حلب',
        variables: ['amount', 'dueDate'],
        category: 'مالية'
    },
    {
        id: 'verification-code',
        name: 'رمز التحقق',
        body: 'رمز التحقق الخاص بك هو: {code}. صالح لمدة 10 دقائق.',
        variables: ['code'],
        category: 'أمان'
    }
];

// الإعدادات الافتراضية
const DEFAULT_CONFIG: SMSConfig = {
    provider: 'local',
    apiKey: '',
    senderId: 'ALEPPO-FIN',
    isEnabled: false,
    maxRetries: 3,
    retryDelay: 5000
};

/**
 * تحميل الإعدادات
 */
export function loadConfig(): SMSConfig {
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
export function saveConfig(config: Partial<SMSConfig>): void {
    const current = loadConfig();
    localStorage.setItem(CONFIG_KEY, JSON.stringify({ ...current, ...config }));
}

/**
 * تحميل الرسائل
 */
function loadMessages(): SMSMessage[] {
    try {
        const saved = localStorage.getItem(MESSAGES_KEY);
        return saved ? JSON.parse(saved) : [];
    } catch {
        return [];
    }
}

/**
 * حفظ الرسائل
 */
function saveMessages(messages: SMSMessage[]): void {
    localStorage.setItem(MESSAGES_KEY, JSON.stringify(messages));
}

/**
 * تحميل القوالب
 */
export function loadTemplates(): SMSTemplate[] {
    try {
        const saved = localStorage.getItem(TEMPLATES_KEY);
        const custom = saved ? JSON.parse(saved) : [];
        return [...DEFAULT_TEMPLATES, ...custom];
    } catch {
        return [...DEFAULT_TEMPLATES];
    }
}

/**
 * تنسيق رقم الهاتف
 */
function formatPhoneNumber(phone: string): string {
    // إزالة المسافات والشرطات
    let formatted = phone.replace(/[\s\-()]/g, '');

    // إضافة رمز سوريا إذا لم يكن موجوداً
    if (formatted.startsWith('0')) {
        formatted = '+963' + formatted.slice(1);
    } else if (!formatted.startsWith('+')) {
        formatted = '+963' + formatted;
    }

    return formatted;
}

/**
 * التحقق من صحة رقم الهاتف
 */
export function validatePhoneNumber(phone: string): { valid: boolean; error?: string } {
    const formatted = formatPhoneNumber(phone);

    if (!/^\+963\d{9}$/.test(formatted)) {
        return { valid: false, error: 'رقم الهاتف غير صالح' };
    }

    return { valid: true };
}

/**
 * تطبيق القالب
 */
export function applyTemplate(
    templateId: string,
    variables: Record<string, string>
): string {
    const templates = loadTemplates();
    const template = templates.find(t => t.id === templateId);

    if (!template) return '';

    let body = template.body;

    Object.entries(variables).forEach(([key, value]) => {
        body = body.replace(new RegExp(`{${key}}`, 'g'), value);
    });

    return body;
}

/**
 * إرسال رسالة SMS
 */
export async function sendSMS(
    to: string,
    body: string,
    options: {
        ticketId?: string;
        templateId?: string;
    } = {}
): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const config = loadConfig();

    if (!config.isEnabled) {
        return { success: false, error: 'خدمة SMS غير مفعلة' };
    }

    const validation = validatePhoneNumber(to);
    if (!validation.valid) {
        return { success: false, error: validation.error };
    }

    const formattedPhone = formatPhoneNumber(to);
    const messageId = `sms-${Date.now()}`;

    // إنشاء سجل الرسالة
    const message: SMSMessage = {
        id: messageId,
        to: formattedPhone,
        from: config.senderId,
        body,
        status: 'pending',
        direction: 'outgoing',
        createdAt: Date.now(),
        ticketId: options.ticketId
    };

    const messages = loadMessages();
    messages.push(message);
    saveMessages(messages);

    try {
        // محاكاة الإرسال (في الإنتاج، سيتم الاتصال بـ API)
        const result = await simulateSend(config, formattedPhone, body);

        // تحديث حالة الرسالة
        const index = messages.findIndex(m => m.id === messageId);
        if (index !== -1) {
            messages[index].status = result.success ? 'sent' : 'failed';
            messages[index].sentAt = result.success ? Date.now() : undefined;
            messages[index].error = result.error;
            messages[index].cost = result.cost;
            saveMessages(messages);
        }

        return {
            success: result.success,
            messageId: result.success ? messageId : undefined,
            error: result.error
        };
    } catch (error) {
        const index = messages.findIndex(m => m.id === messageId);
        if (index !== -1) {
            messages[index].status = 'failed';
            messages[index].failedAt = Date.now();
            messages[index].error = String(error);
            saveMessages(messages);
        }

        return { success: false, error: String(error) };
    }
}

/**
 * محاكاة الإرسال
 */
async function simulateSend(
    config: SMSConfig,
    to: string,
    body: string
): Promise<{ success: boolean; error?: string; cost?: number }> {
    // في الإنتاج، سيتم استبدال هذا بالاتصال الفعلي بـ API

    await new Promise(resolve => setTimeout(resolve, 500));

    // محاكاة نجاح بنسبة 95%
    if (Math.random() > 0.05) {
        return {
            success: true,
            cost: 5 // 5 ل.س لكل رسالة
        };
    }

    return {
        success: false,
        error: 'فشل في الاتصال بالخادم'
    };
}

/**
 * إرسال رسالة باستخدام قالب
 */
export async function sendTemplatedSMS(
    to: string,
    templateId: string,
    variables: Record<string, string>,
    options: { ticketId?: string } = {}
): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const body = applyTemplate(templateId, variables);

    if (!body) {
        return { success: false, error: 'القالب غير موجود' };
    }

    return sendSMS(to, body, { ...options, templateId });
}

/**
 * إرسال إشعار شكوى
 */
export async function sendTicketNotification(
    phone: string,
    ticketId: string,
    type: 'created' | 'updated' | 'resolved',
    additionalData?: Record<string, string>
): Promise<{ success: boolean; error?: string }> {
    const templateMap = {
        created: 'ticket-created',
        updated: 'ticket-updated',
        resolved: 'ticket-resolved'
    };

    const result = await sendTemplatedSMS(
        phone,
        templateMap[type],
        { ticketId, ...additionalData },
        { ticketId }
    );

    return result;
}

/**
 * إرسال رمز التحقق
 */
export async function sendVerificationCode(
    phone: string
): Promise<{ success: boolean; code?: string; error?: string }> {
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    const result = await sendTemplatedSMS(phone, 'verification-code', { code });

    if (result.success) {
        // تخزين الرمز مؤقتاً
        const codes = JSON.parse(localStorage.getItem('verification-codes') || '{}');
        codes[phone] = {
            code,
            expiresAt: Date.now() + 10 * 60 * 1000 // 10 دقائق
        };
        localStorage.setItem('verification-codes', JSON.stringify(codes));

        return { success: true, code };
    }

    return { success: false, error: result.error };
}

/**
 * التحقق من الرمز
 */
export function verifyCode(phone: string, code: string): boolean {
    const codes = JSON.parse(localStorage.getItem('verification-codes') || '{}');
    const stored = codes[formatPhoneNumber(phone)];

    if (!stored) return false;

    if (Date.now() > stored.expiresAt) {
        // منتهي الصلاحية
        delete codes[phone];
        localStorage.setItem('verification-codes', JSON.stringify(codes));
        return false;
    }

    return stored.code === code;
}

/**
 * الحصول على سجل الرسائل
 */
export function getMessageHistory(
    filters?: {
        ticketId?: string;
        status?: SMSStatus;
        direction?: 'outgoing' | 'incoming';
        startDate?: Date;
        endDate?: Date;
    }
): SMSMessage[] {
    let messages = loadMessages();

    if (filters) {
        if (filters.ticketId) {
            messages = messages.filter(m => m.ticketId === filters.ticketId);
        }
        if (filters.status) {
            messages = messages.filter(m => m.status === filters.status);
        }
        if (filters.direction) {
            messages = messages.filter(m => m.direction === filters.direction);
        }
        if (filters.startDate) {
            messages = messages.filter(m => m.createdAt >= filters.startDate!.getTime());
        }
        if (filters.endDate) {
            messages = messages.filter(m => m.createdAt <= filters.endDate!.getTime());
        }
    }

    return messages.sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * إحصائيات SMS
 */
export function getSMSStats(): {
    totalSent: number;
    delivered: number;
    failed: number;
    pending: number;
    totalCost: number;
    byDay: Array<{ date: string; count: number }>;
} {
    const messages = loadMessages().filter(m => m.direction === 'outgoing');

    const stats = {
        totalSent: messages.length,
        delivered: messages.filter(m => m.status === 'delivered').length,
        failed: messages.filter(m => m.status === 'failed').length,
        pending: messages.filter(m => m.status === 'pending' || m.status === 'sent').length,
        totalCost: messages.reduce((sum, m) => sum + (m.cost || 0), 0),
        byDay: [] as Array<{ date: string; count: number }>
    };

    // تجميع حسب اليوم
    const byDay = new Map<string, number>();
    messages.forEach(m => {
        const date = new Date(m.createdAt).toISOString().split('T')[0];
        byDay.set(date, (byDay.get(date) || 0) + 1);
    });

    stats.byDay = [...byDay.entries()]
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-30);

    return stats;
}

/**
 * إنشاء قالب مخصص
 */
export function createTemplate(
    name: string,
    body: string,
    category: string
): SMSTemplate {
    const variables = [...body.matchAll(/{(\w+)}/g)].map(m => m[1]);

    const template: SMSTemplate = {
        id: `custom-${Date.now()}`,
        name,
        body,
        variables,
        category
    };

    const saved = localStorage.getItem(TEMPLATES_KEY);
    const custom = saved ? JSON.parse(saved) : [];
    custom.push(template);
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(custom));

    return template;
}

export default {
    loadConfig,
    saveConfig,
    loadTemplates,
    sendSMS,
    sendTemplatedSMS,
    sendTicketNotification,
    sendVerificationCode,
    verifyCode,
    getMessageHistory,
    getSMSStats,
    createTemplate,
    validatePhoneNumber,
    applyTemplate
};
