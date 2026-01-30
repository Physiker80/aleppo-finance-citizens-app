/**
 * نظام الرسائل الداخلية
 * تواصل بين الموظفين داخل النظام
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';

// ==================== أنواع البيانات ====================
export interface InternalMessage {
    id: string;
    senderId: string;
    senderName: string;
    senderRole?: string;
    recipientId: string;
    recipientName: string;
    subject: string;
    content: string;
    priority: 'low' | 'normal' | 'high' | 'urgent';
    status: 'sent' | 'delivered' | 'read';
    attachments?: Array<{
        name: string;
        size: number;
        type: string;
        url: string;
    }>;
    relatedTicketId?: string;
    parentMessageId?: string; // للردود
    createdAt: string;
    readAt?: string;
    isDeleted?: boolean;
    isStarred?: boolean;
}

export interface MessageThread {
    id: string;
    participants: Array<{ id: string; name: string }>;
    subject: string;
    lastMessage: InternalMessage;
    unreadCount: number;
    messages: InternalMessage[];
}

export interface MessageStats {
    total: number;
    unread: number;
    sent: number;
    starred: number;
}

// ==================== ثوابت ====================
const STORAGE_KEY = 'internal_messages';
const THREADS_KEY = 'message_threads';

const PRIORITY_CONFIG = {
    low: { label: 'منخفضة', color: 'gray', icon: '⬇️' },
    normal: { label: 'عادية', color: 'blue', icon: '➡️' },
    high: { label: 'مرتفعة', color: 'orange', icon: '⬆️' },
    urgent: { label: 'عاجلة', color: 'red', icon: '🔴' }
};

// ==================== إدارة الرسائل ====================

/**
 * الحصول على جميع الرسائل
 */
export const getMessages = (): InternalMessage[] => {
    try {
        const messages = localStorage.getItem(STORAGE_KEY);
        return messages ? JSON.parse(messages) : [];
    } catch {
        return [];
    }
};

/**
 * الحصول على رسائل المستخدم
 */
export const getUserMessages = (userId: string): {
    inbox: InternalMessage[];
    sent: InternalMessage[];
    starred: InternalMessage[];
    unread: InternalMessage[];
} => {
    const allMessages = getMessages().filter(m => !m.isDeleted);

    return {
        inbox: allMessages.filter(m => m.recipientId === userId),
        sent: allMessages.filter(m => m.senderId === userId),
        starred: allMessages.filter(m =>
            (m.recipientId === userId || m.senderId === userId) && m.isStarred
        ),
        unread: allMessages.filter(m => m.recipientId === userId && m.status !== 'read')
    };
};

/**
 * إرسال رسالة جديدة
 */
export const sendMessage = (message: Omit<InternalMessage, 'id' | 'status' | 'createdAt'>): InternalMessage => {
    const newMessage: InternalMessage = {
        ...message,
        id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        status: 'sent',
        createdAt: new Date().toISOString()
    };

    const messages = getMessages();
    messages.unshift(newMessage);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));

    // إنشاء إشعار (يمكن ربطه بنظام الإشعارات)
    const notification = {
        id: `notif_${Date.now()}`,
        type: 'internal_message',
        title: `رسالة جديدة من ${message.senderName}`,
        body: message.subject,
        recipientId: message.recipientId,
        createdAt: new Date().toISOString(),
        read: false
    };

    // حفظ الإشعار
    const notifications = JSON.parse(localStorage.getItem('internal_notifications') || '[]');
    notifications.unshift(notification);
    localStorage.setItem('internal_notifications', JSON.stringify(notifications));

    return newMessage;
};

/**
 * تحديث حالة الرسالة
 */
export const updateMessageStatus = (messageId: string, status: InternalMessage['status']): void => {
    const messages = getMessages();
    const index = messages.findIndex(m => m.id === messageId);

    if (index !== -1) {
        messages[index].status = status;
        if (status === 'read') {
            messages[index].readAt = new Date().toISOString();
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }
};

/**
 * تمييز رسالة بنجمة
 */
export const toggleMessageStar = (messageId: string): void => {
    const messages = getMessages();
    const index = messages.findIndex(m => m.id === messageId);

    if (index !== -1) {
        messages[index].isStarred = !messages[index].isStarred;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }
};

/**
 * حذف رسالة
 */
export const deleteMessage = (messageId: string): void => {
    const messages = getMessages();
    const index = messages.findIndex(m => m.id === messageId);

    if (index !== -1) {
        messages[index].isDeleted = true;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }
};

/**
 * الرد على رسالة
 */
export const replyToMessage = (
    originalMessage: InternalMessage,
    reply: {
        content: string;
        senderId: string;
        senderName: string;
        senderRole?: string;
    }
): InternalMessage => {
    return sendMessage({
        ...reply,
        recipientId: originalMessage.senderId,
        recipientName: originalMessage.senderName,
        subject: originalMessage.subject.startsWith('رد:')
            ? originalMessage.subject
            : `رد: ${originalMessage.subject}`,
        priority: originalMessage.priority,
        parentMessageId: originalMessage.id,
        relatedTicketId: originalMessage.relatedTicketId
    });
};

/**
 * الحصول على إحصائيات الرسائل
 */
export const getMessageStats = (userId: string): MessageStats => {
    const userMessages = getUserMessages(userId);

    return {
        total: userMessages.inbox.length + userMessages.sent.length,
        unread: userMessages.unread.length,
        sent: userMessages.sent.length,
        starred: userMessages.starred.length
    };
};

// ==================== مكونات React ====================

interface MessageBadgeProps {
    count: number;
}

export const MessageBadge: React.FC<MessageBadgeProps> = ({ count }) => {
    if (count === 0) return null;

    return (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center text-xs font-bold text-white bg-red-500 rounded-full px-1">
            {count > 99 ? '99+' : count}
        </span>
    );
};

interface MessageListItemProps {
    message: InternalMessage;
    isSelected?: boolean;
    onClick: () => void;
    onStar: () => void;
    onDelete: () => void;
}

export const MessageListItem: React.FC<MessageListItemProps> = ({
    message,
    isSelected,
    onClick,
    onStar,
    onDelete
}) => {
    const isUnread = message.status !== 'read';
    const priorityConfig = PRIORITY_CONFIG[message.priority];

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'الآن';
        if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
        if (diffHours < 24) return `منذ ${diffHours} ساعة`;
        if (diffDays < 7) return `منذ ${diffDays} يوم`;
        return date.toLocaleDateString('ar-SY');
    };

    return (
        <div
            onClick={onClick}
            className={`p-4 cursor-pointer transition-all border-b border-gray-200 dark:border-gray-700 ${isSelected
                    ? 'bg-blue-50 dark:bg-blue-900/30'
                    : isUnread
                        ? 'bg-white dark:bg-gray-800'
                        : 'bg-gray-50 dark:bg-gray-800/50'
                } hover:bg-gray-100 dark:hover:bg-gray-700/50`}
        >
            <div className="flex items-start gap-3">
                {/* أيقونة الأولوية */}
                {message.priority !== 'normal' && (
                    <span className="text-lg">{priorityConfig.icon}</span>
                )}

                {/* المحتوى */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                        <span className={`font-medium truncate ${isUnread ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                            {message.senderName}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                            {formatDate(message.createdAt)}
                        </span>
                    </div>

                    <div className={`text-sm truncate ${isUnread ? 'font-medium text-gray-800 dark:text-gray-200' : 'text-gray-600 dark:text-gray-400'}`}>
                        {message.subject}
                    </div>

                    <div className="text-xs text-gray-500 dark:text-gray-500 truncate mt-1">
                        {message.content.substring(0, 80)}...
                    </div>
                </div>

                {/* الأزرار */}
                <div className="flex flex-col items-center gap-1">
                    <button
                        onClick={(e) => { e.stopPropagation(); onStar(); }}
                        className={`p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded ${message.isStarred ? 'text-yellow-500' : 'text-gray-400'
                            }`}
                    >
                        {message.isStarred ? '⭐' : '☆'}
                    </button>

                    {isUnread && (
                        <span className="w-2 h-2 bg-blue-500 rounded-full" />
                    )}
                </div>
            </div>
        </div>
    );
};

interface ComposeMessageProps {
    recipients: Array<{ id: string; name: string; role?: string }>;
    onSend: (message: Omit<InternalMessage, 'id' | 'status' | 'createdAt'>) => void;
    onCancel: () => void;
    replyTo?: InternalMessage;
    currentUser: { id: string; name: string; role?: string };
}

export const ComposeMessage: React.FC<ComposeMessageProps> = ({
    recipients,
    onSend,
    onCancel,
    replyTo,
    currentUser
}) => {
    const [recipientId, setRecipientId] = useState(replyTo?.senderId || '');
    const [subject, setSubject] = useState(
        replyTo ? (replyTo.subject.startsWith('رد:') ? replyTo.subject : `رد: ${replyTo.subject}`) : ''
    );
    const [content, setContent] = useState('');
    const [priority, setPriority] = useState<InternalMessage['priority']>(replyTo?.priority || 'normal');

    const handleSend = () => {
        if (!recipientId || !subject.trim() || !content.trim()) return;

        const recipient = recipients.find(r => r.id === recipientId);
        if (!recipient) return;

        onSend({
            senderId: currentUser.id,
            senderName: currentUser.name,
            senderRole: currentUser.role,
            recipientId: recipient.id,
            recipientName: recipient.name,
            subject: subject.trim(),
            content: content.trim(),
            priority,
            parentMessageId: replyTo?.id
        });
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">
                {replyTo ? 'رد على الرسالة' : 'رسالة جديدة'}
            </h3>

            <div className="space-y-4">
                {/* المستلم */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        إلى:
                    </label>
                    <select
                        value={recipientId}
                        onChange={(e) => setRecipientId(e.target.value)}
                        disabled={!!replyTo}
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white disabled:opacity-50"
                    >
                        <option value="">اختر المستلم</option>
                        {recipients.filter(r => r.id !== currentUser.id).map(r => (
                            <option key={r.id} value={r.id}>
                                {r.name} {r.role ? `(${r.role})` : ''}
                            </option>
                        ))}
                    </select>
                </div>

                {/* الموضوع */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        الموضوع:
                    </label>
                    <input
                        type="text"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="موضوع الرسالة"
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                </div>

                {/* الأولوية */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        الأولوية:
                    </label>
                    <div className="flex gap-2">
                        {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                            <button
                                key={key}
                                onClick={() => setPriority(key as InternalMessage['priority'])}
                                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${priority === key
                                        ? `bg-${config.color}-100 text-${config.color}-700 dark:bg-${config.color}-900/30 dark:text-${config.color}-400 ring-2 ring-${config.color}-500`
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                    }`}
                            >
                                {config.icon} {config.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* المحتوى */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        الرسالة:
                    </label>
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="اكتب رسالتك هنا..."
                        rows={6}
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white resize-none"
                    />
                </div>

                {/* الأزرار */}
                <div className="flex justify-end gap-3">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        إلغاء
                    </button>
                    <button
                        onClick={handleSend}
                        disabled={!recipientId || !subject.trim() || !content.trim()}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        إرسال
                    </button>
                </div>
            </div>
        </div>
    );
};

interface MessageViewerProps {
    message: InternalMessage;
    onReply: () => void;
    onDelete: () => void;
    onClose: () => void;
}

export const MessageViewer: React.FC<MessageViewerProps> = ({
    message,
    onReply,
    onDelete,
    onClose
}) => {
    useEffect(() => {
        // تحديث حالة القراءة
        if (message.status !== 'read') {
            updateMessageStatus(message.id, 'read');
        }
    }, [message.id]);

    const priorityConfig = PRIORITY_CONFIG[message.priority];

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 h-full flex flex-col">
            {/* الترويسة */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                        {message.subject}
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                        ✕
                    </button>
                </div>

                <div className="flex items-center justify-between text-sm">
                    <div className="text-gray-600 dark:text-gray-400">
                        <span className="font-medium">{message.senderName}</span>
                        {message.senderRole && <span className="text-gray-500"> ({message.senderRole})</span>}
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-xs bg-${priorityConfig.color}-100 text-${priorityConfig.color}-700`}>
                            {priorityConfig.icon} {priorityConfig.label}
                        </span>
                        <span className="text-gray-500 dark:text-gray-400">
                            {new Date(message.createdAt).toLocaleString('ar-SY')}
                        </span>
                    </div>
                </div>
            </div>

            {/* المحتوى */}
            <div className="flex-1 p-4 overflow-y-auto">
                <div className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {message.content}
                </div>
            </div>

            {/* الأزرار */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                <button
                    onClick={onDelete}
                    className="px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                >
                    🗑️ حذف
                </button>
                <button
                    onClick={onReply}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                    ↩️ رد
                </button>
            </div>
        </div>
    );
};

// ==================== صفحة الرسائل الكاملة ====================

interface InternalMessagesPageProps {
    currentUser: { id: string; name: string; role?: string };
    employees: Array<{ id: string; name: string; role?: string; username: string }>;
}

export const InternalMessagesPage: React.FC<InternalMessagesPageProps> = ({
    currentUser,
    employees
}) => {
    const [activeFolder, setActiveFolder] = useState<'inbox' | 'sent' | 'starred'>('inbox');
    const [selectedMessage, setSelectedMessage] = useState<InternalMessage | null>(null);
    const [isComposing, setIsComposing] = useState(false);
    const [replyTo, setReplyTo] = useState<InternalMessage | null>(null);
    const [messages, setMessages] = useState(getUserMessages(currentUser.id));

    const refreshMessages = useCallback(() => {
        setMessages(getUserMessages(currentUser.id));
    }, [currentUser.id]);

    useEffect(() => {
        refreshMessages();
        const interval = setInterval(refreshMessages, 30000); // تحديث كل 30 ثانية
        return () => clearInterval(interval);
    }, [refreshMessages]);

    const currentMessages = messages[activeFolder];
    const stats = getMessageStats(currentUser.id);

    const handleSendMessage = (message: Omit<InternalMessage, 'id' | 'status' | 'createdAt'>) => {
        sendMessage(message);
        setIsComposing(false);
        setReplyTo(null);
        refreshMessages();
    };

    const handleReply = (message: InternalMessage) => {
        setReplyTo(message);
        setIsComposing(true);
        setSelectedMessage(null);
    };

    const handleDelete = (messageId: string) => {
        deleteMessage(messageId);
        setSelectedMessage(null);
        refreshMessages();
    };

    const handleStar = (messageId: string) => {
        toggleMessageStar(messageId);
        refreshMessages();
    };

    const recipients = employees.map(e => ({
        id: e.id || e.username,
        name: e.name || e.username,
        role: e.role
    }));

    return (
        <div className="h-[calc(100vh-200px)] flex gap-4">
            {/* القائمة الجانبية */}
            <div className="w-64 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
                {/* زر إنشاء رسالة */}
                <button
                    onClick={() => { setIsComposing(true); setReplyTo(null); setSelectedMessage(null); }}
                    className="m-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                    ✏️ رسالة جديدة
                </button>

                {/* المجلدات */}
                <div className="flex-1 overflow-y-auto">
                    {[
                        { key: 'inbox', label: 'الوارد', icon: '📥', count: stats.unread },
                        { key: 'sent', label: 'المرسل', icon: '📤', count: 0 },
                        { key: 'starred', label: 'المميزة', icon: '⭐', count: stats.starred }
                    ].map(folder => (
                        <button
                            key={folder.key}
                            onClick={() => { setActiveFolder(folder.key as typeof activeFolder); setSelectedMessage(null); setIsComposing(false); }}
                            className={`w-full flex items-center justify-between px-4 py-3 text-right transition-colors ${activeFolder === folder.key
                                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                        >
                            <span className="flex items-center gap-2">
                                <span>{folder.icon}</span>
                                <span>{folder.label}</span>
                            </span>
                            {folder.count > 0 && (
                                <span className="min-w-[20px] h-[20px] flex items-center justify-center text-xs font-bold text-white bg-blue-500 rounded-full">
                                    {folder.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* قائمة الرسائل */}
            <div className="w-80 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="font-bold text-gray-800 dark:text-white">
                        {activeFolder === 'inbox' ? 'الوارد' : activeFolder === 'sent' ? 'المرسل' : 'المميزة'}
                    </h3>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {currentMessages.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                            لا توجد رسائل
                        </div>
                    ) : (
                        currentMessages.map(message => (
                            <MessageListItem
                                key={message.id}
                                message={message}
                                isSelected={selectedMessage?.id === message.id}
                                onClick={() => { setSelectedMessage(message); setIsComposing(false); }}
                                onStar={() => handleStar(message.id)}
                                onDelete={() => handleDelete(message.id)}
                            />
                        ))
                    )}
                </div>
            </div>

            {/* عرض الرسالة / إنشاء رسالة */}
            <div className="flex-1">
                {isComposing ? (
                    <ComposeMessage
                        recipients={recipients}
                        onSend={handleSendMessage}
                        onCancel={() => { setIsComposing(false); setReplyTo(null); }}
                        replyTo={replyTo || undefined}
                        currentUser={currentUser}
                    />
                ) : selectedMessage ? (
                    <MessageViewer
                        message={selectedMessage}
                        onReply={() => handleReply(selectedMessage)}
                        onDelete={() => handleDelete(selectedMessage.id)}
                        onClose={() => setSelectedMessage(null)}
                    />
                ) : (
                    <div className="h-full flex items-center justify-center bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
                        <div className="text-center text-gray-500 dark:text-gray-400">
                            <div className="text-5xl mb-4">📬</div>
                            <p>اختر رسالة لعرضها</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// ==================== Hook للاستخدام ====================
export const useInternalMessages = (userId: string) => {
    const [messages, setMessages] = useState(getUserMessages(userId));
    const [stats, setStats] = useState(getMessageStats(userId));

    const refresh = useCallback(() => {
        setMessages(getUserMessages(userId));
        setStats(getMessageStats(userId));
    }, [userId]);

    useEffect(() => {
        refresh();
        const interval = setInterval(refresh, 30000);
        return () => clearInterval(interval);
    }, [refresh]);

    return { messages, stats, refresh, sendMessage, deleteMessage, toggleMessageStar };
};
