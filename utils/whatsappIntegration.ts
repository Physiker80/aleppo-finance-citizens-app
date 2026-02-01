// =====================================================
// 💬 WhatsApp Integration
// تكامل واتساب
// =====================================================

export interface WhatsAppConfig {
    provider: 'whatsapp-business-api' | 'twilio' | 'messagebird' | 'local';
    apiKey: string;
    phoneNumberId: string;
    businessAccountId?: string;
    webhookUrl?: string;
    isEnabled: boolean;
}

export interface WhatsAppMessage {
    id: string;
    to: string;
    from: string;
    type: MessageType;
    content: MessageContent;
    status: WhatsAppStatus;
    direction: 'outgoing' | 'incoming';
    createdAt: number;
    sentAt?: number;
    deliveredAt?: number;
    readAt?: number;
    failedAt?: number;
    error?: string;
    ticketId?: string;
    conversationId?: string;
}

export type MessageType = 'text' | 'template' | 'image' | 'document' | 'location' | 'contact' | 'interactive';

export interface MessageContent {
    text?: string;
    templateName?: string;
    templateParams?: string[];
    mediaUrl?: string;
    mediaCaption?: string;
    fileName?: string;
    latitude?: number;
    longitude?: number;
    buttons?: Array<{ id: string; title: string }>;
    listItems?: Array<{ id: string; title: string; description?: string }>;
}

export type WhatsAppStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface WhatsAppTemplate {
    id: string;
    name: string;
    language: string;
    category: 'AUTHENTICATION' | 'MARKETING' | 'UTILITY';
    status: 'APPROVED' | 'PENDING' | 'REJECTED';
    components: TemplateComponent[];
}

export interface TemplateComponent {
    type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
    format?: 'TEXT' | 'IMAGE' | 'DOCUMENT' | 'VIDEO';
    text?: string;
    buttons?: Array<{ type: string; text: string; url?: string }>;
}

export interface Conversation {
    id: string;
    participantPhone: string;
    participantName?: string;
    ticketId?: string;
    messages: WhatsAppMessage[];
    startedAt: number;
    lastMessageAt: number;
    status: 'active' | 'closed';
}

const CONFIG_KEY = 'whatsapp-config';
const MESSAGES_KEY = 'whatsapp-messages';
const CONVERSATIONS_KEY = 'whatsapp-conversations';

// القوالب المعتمدة
const APPROVED_TEMPLATES: WhatsAppTemplate[] = [
    {
        id: 'ticket_confirmation',
        name: 'ticket_confirmation',
        language: 'ar',
        category: 'UTILITY',
        status: 'APPROVED',
        components: [
            { type: 'HEADER', format: 'TEXT', text: '🎫 تأكيد استلام الشكوى' },
            { type: 'BODY', text: 'مرحباً {{1}}،\n\nتم استلام شكواكم بنجاح.\n\n📋 رقم الشكوى: {{2}}\n📅 التاريخ: {{3}}\n\nسيتم مراجعة شكواكم والرد عليكم في أقرب وقت ممكن.' },
            { type: 'FOOTER', text: '{{4}}' },
            { type: 'BUTTONS', buttons: [{ type: 'URL', text: 'تتبع الشكوى', url: 'https://example.com/track/{{2}}' }] }
        ]
    },
    {
        id: 'ticket_status_update',
        name: 'ticket_status_update',
        language: 'ar',
        category: 'UTILITY',
        status: 'APPROVED',
        components: [
            { type: 'HEADER', format: 'TEXT', text: '📢 تحديث حالة الشكوى' },
            { type: 'BODY', text: 'مرحباً،\n\nتم تحديث حالة شكواكم رقم {{1}}:\n\n🔄 الحالة الجديدة: {{2}}\n💬 ملاحظات: {{3}}\n\nشكراً لصبركم.' },
            { type: 'FOOTER', text: '{{4}}' }
        ]
    },
    {
        id: 'payment_reminder',
        name: 'payment_reminder',
        language: 'ar',
        category: 'UTILITY',
        status: 'APPROVED',
        components: [
            { type: 'HEADER', format: 'TEXT', text: '💰 تذكير بالدفع' },
            { type: 'BODY', text: 'عزيزي المواطن،\n\nنذكركم بوجود مستحقات مالية:\n\n💵 المبلغ: {{1}} ل.س\n📅 تاريخ الاستحقاق: {{2}}\n📝 التفاصيل: {{3}}\n\nيرجى التسديد في الموعد المحدد لتجنب الغرامات.' },
            { type: 'FOOTER', text: '{{4}}' }
        ]
    }
];

// الإعدادات الافتراضية
const DEFAULT_CONFIG: WhatsAppConfig = {
    provider: 'local',
    apiKey: '',
    phoneNumberId: '',
    isEnabled: false
};

/**
 * تحميل الإعدادات
 */
export function loadConfig(): WhatsAppConfig {
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
export function saveConfig(config: Partial<WhatsAppConfig>): void {
    const current = loadConfig();
    localStorage.setItem(CONFIG_KEY, JSON.stringify({ ...current, ...config }));
}

/**
 * تحميل الرسائل
 */
function loadMessages(): WhatsAppMessage[] {
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
function saveMessages(messages: WhatsAppMessage[]): void {
    localStorage.setItem(MESSAGES_KEY, JSON.stringify(messages));
}

/**
 * تحميل المحادثات
 */
function loadConversations(): Conversation[] {
    try {
        const saved = localStorage.getItem(CONVERSATIONS_KEY);
        return saved ? JSON.parse(saved) : [];
    } catch {
        return [];
    }
}

/**
 * حفظ المحادثات
 */
function saveConversations(conversations: Conversation[]): void {
    localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(conversations));
}

/**
 * تنسيق رقم الهاتف للواتساب
 */
function formatWhatsAppNumber(phone: string): string {
    let formatted = phone.replace(/[\s\-()]/g, '');

    if (formatted.startsWith('0')) {
        formatted = '963' + formatted.slice(1);
    } else if (formatted.startsWith('+')) {
        formatted = formatted.slice(1);
    }

    return formatted;
}

/**
 * الحصول على القوالب المعتمدة
 */
export function getApprovedTemplates(): WhatsAppTemplate[] {
    return APPROVED_TEMPLATES;
}

/**
 * إرسال رسالة نصية
 */
export async function sendTextMessage(
    to: string,
    text: string,
    options: { ticketId?: string; conversationId?: string } = {}
): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const config = loadConfig();

    if (!config.isEnabled) {
        return { success: false, error: 'خدمة واتساب غير مفعلة' };
    }

    const formattedPhone = formatWhatsAppNumber(to);
    const messageId = `wa-${Date.now()}`;

    const message: WhatsAppMessage = {
        id: messageId,
        to: formattedPhone,
        from: config.phoneNumberId,
        type: 'text',
        content: { text },
        status: 'pending',
        direction: 'outgoing',
        createdAt: Date.now(),
        ticketId: options.ticketId,
        conversationId: options.conversationId
    };

    const messages = loadMessages();
    messages.push(message);
    saveMessages(messages);

    // تحديث المحادثة
    updateConversation(formattedPhone, message, options.ticketId);

    try {
        // محاكاة الإرسال
        await simulateSend(message);

        const index = messages.findIndex(m => m.id === messageId);
        if (index !== -1) {
            messages[index].status = 'sent';
            messages[index].sentAt = Date.now();
            saveMessages(messages);
        }

        return { success: true, messageId };
    } catch (error) {
        const index = messages.findIndex(m => m.id === messageId);
        if (index !== -1) {
            messages[index].status = 'failed';
            messages[index].error = String(error);
            saveMessages(messages);
        }

        return { success: false, error: String(error) };
    }
}

/**
 * إرسال رسالة قالب
 */
export async function sendTemplateMessage(
    to: string,
    templateName: string,
    params: string[],
    options: { ticketId?: string } = {}
): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const config = loadConfig();

    if (!config.isEnabled) {
        return { success: false, error: 'خدمة واتساب غير مفعلة' };
    }

    const template = APPROVED_TEMPLATES.find(t => t.name === templateName);
    if (!template) {
        return { success: false, error: 'القالب غير موجود' };
    }

    const formattedPhone = formatWhatsAppNumber(to);
    const messageId = `wa-${Date.now()}`;

    // بناء نص الرسالة من القالب
    let text = '';
    template.components.forEach(comp => {
        if (comp.text) {
            let compText = comp.text;
            params.forEach((param, i) => {
                compText = compText.replace(`{{${i + 1}}}`, param);
            });
            text += compText + '\n\n';
        }
    });

    const message: WhatsAppMessage = {
        id: messageId,
        to: formattedPhone,
        from: config.phoneNumberId,
        type: 'template',
        content: {
            text: text.trim(),
            templateName,
            templateParams: params
        },
        status: 'pending',
        direction: 'outgoing',
        createdAt: Date.now(),
        ticketId: options.ticketId
    };

    const messages = loadMessages();
    messages.push(message);
    saveMessages(messages);

    updateConversation(formattedPhone, message, options.ticketId);

    try {
        await simulateSend(message);

        const index = messages.findIndex(m => m.id === messageId);
        if (index !== -1) {
            messages[index].status = 'sent';
            messages[index].sentAt = Date.now();
            saveMessages(messages);
        }

        return { success: true, messageId };
    } catch (error) {
        return { success: false, error: String(error) };
    }
}

/**
 * محاكاة الإرسال
 */
async function simulateSend(message: WhatsAppMessage): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 800));

    if (Math.random() < 0.02) {
        throw new Error('فشل في الإرسال');
    }
}

/**
 * تحديث المحادثة
 */
function updateConversation(
    phone: string,
    message: WhatsAppMessage,
    ticketId?: string
): void {
    const conversations = loadConversations();
    let conversation = conversations.find(c => c.participantPhone === phone);

    if (!conversation) {
        conversation = {
            id: `conv-${Date.now()}`,
            participantPhone: phone,
            ticketId,
            messages: [],
            startedAt: Date.now(),
            lastMessageAt: Date.now(),
            status: 'active'
        };
        conversations.push(conversation);
    }

    conversation.messages.push(message);
    conversation.lastMessageAt = Date.now();

    if (ticketId && !conversation.ticketId) {
        conversation.ticketId = ticketId;
    }

    saveConversations(conversations);
}

/**
 * إرسال إشعار شكوى
 */
export async function sendTicketNotification(
    phone: string,
    ticketId: string,
    type: 'created' | 'updated' | 'resolved',
    data: {
        citizenName?: string;
        status?: string;
        notes?: string;
        date?: string;
    }
): Promise<{ success: boolean; error?: string }> {
    let directorate = 'المديرية المالية';
    try {
        const saved = localStorage.getItem('site_config');
        if (saved) directorate = JSON.parse(saved).directorateName || directorate;
    } catch {}

    switch (type) {
        case 'created':
            return sendTemplateMessage(phone, 'ticket_confirmation', [
                data.citizenName || 'المواطن',
                ticketId,
                data.date || new Date().toLocaleDateString('ar-SY'),
                directorate
            ], { ticketId });

        case 'updated':
            return sendTemplateMessage(phone, 'ticket_status_update', [
                ticketId,
                data.status || 'قيد المعالجة',
                data.notes || 'لا توجد ملاحظات',
                directorate
            ], { ticketId });

        case 'resolved':
            return sendTemplateMessage(phone, 'ticket_status_update', [
                ticketId,
                'تم الحل',
                data.notes || 'شكراً لتواصلكم معنا',
                directorate
            ], { ticketId });

        default:
            return { success: false, error: 'نوع غير معروف' };
    }
}

/**
 * إرسال رسالة تفاعلية مع أزرار
 */
export async function sendInteractiveMessage(
    to: string,
    body: string,
    buttons: Array<{ id: string; title: string }>,
    options: { ticketId?: string } = {}
): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const config = loadConfig();

    if (!config.isEnabled) {
        return { success: false, error: 'خدمة واتساب غير مفعلة' };
    }

    const formattedPhone = formatWhatsAppNumber(to);
    const messageId = `wa-${Date.now()}`;

    const message: WhatsAppMessage = {
        id: messageId,
        to: formattedPhone,
        from: config.phoneNumberId,
        type: 'interactive',
        content: { text: body, buttons },
        status: 'pending',
        direction: 'outgoing',
        createdAt: Date.now(),
        ticketId: options.ticketId
    };

    const messages = loadMessages();
    messages.push(message);
    saveMessages(messages);

    updateConversation(formattedPhone, message, options.ticketId);

    try {
        await simulateSend(message);

        const index = messages.findIndex(m => m.id === messageId);
        if (index !== -1) {
            messages[index].status = 'sent';
            messages[index].sentAt = Date.now();
            saveMessages(messages);
        }

        return { success: true, messageId };
    } catch (error) {
        return { success: false, error: String(error) };
    }
}

/**
 * الحصول على المحادثات
 */
export function getConversations(
    filters?: {
        ticketId?: string;
        status?: 'active' | 'closed';
    }
): Conversation[] {
    let conversations = loadConversations();

    if (filters?.ticketId) {
        conversations = conversations.filter(c => c.ticketId === filters.ticketId);
    }

    if (filters?.status) {
        conversations = conversations.filter(c => c.status === filters.status);
    }

    return conversations.sort((a, b) => b.lastMessageAt - a.lastMessageAt);
}

/**
 * الحصول على رسائل شكوى
 */
export function getTicketMessages(ticketId: string): WhatsAppMessage[] {
    return loadMessages()
        .filter(m => m.ticketId === ticketId)
        .sort((a, b) => a.createdAt - b.createdAt);
}

/**
 * إحصائيات واتساب
 */
export function getWhatsAppStats(): {
    totalMessages: number;
    sent: number;
    delivered: number;
    read: number;
    failed: number;
    activeConversations: number;
    byDay: Array<{ date: string; count: number }>;
} {
    const messages = loadMessages().filter(m => m.direction === 'outgoing');
    const conversations = loadConversations();

    const stats = {
        totalMessages: messages.length,
        sent: messages.filter(m => m.status !== 'pending' && m.status !== 'failed').length,
        delivered: messages.filter(m => m.status === 'delivered' || m.status === 'read').length,
        read: messages.filter(m => m.status === 'read').length,
        failed: messages.filter(m => m.status === 'failed').length,
        activeConversations: conversations.filter(c => c.status === 'active').length,
        byDay: [] as Array<{ date: string; count: number }>
    };

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

export default {
    loadConfig,
    saveConfig,
    getApprovedTemplates,
    sendTextMessage,
    sendTemplateMessage,
    sendTicketNotification,
    sendInteractiveMessage,
    getConversations,
    getTicketMessages,
    getWhatsAppStats
};
