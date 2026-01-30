/**
 * نظام الردود السريعة المحفوظة
 * قوالب جاهزة للرد على التذاكر والرسائل
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';

// ==================== أنواع البيانات ====================
export interface QuickReply {
    id: string;
    title: string;
    content: string;
    category: string;
    tags: string[];
    shortcut?: string; // مفتاح اختصار سريع
    variables?: string[]; // متغيرات قابلة للتخصيص مثل {اسم_المواطن}
    usageCount: number;
    lastUsed?: string;
    createdAt: string;
    createdBy?: string;
    isGlobal?: boolean; // متاح لجميع الموظفين
}

export interface QuickReplyCategory {
    id: string;
    name: string;
    icon: string;
    color: string;
}

// ==================== ثوابت ====================
const STORAGE_KEY = 'quick_replies';
const CATEGORIES_KEY = 'quick_reply_categories';

const DEFAULT_CATEGORIES: QuickReplyCategory[] = [
    { id: 'general', name: 'عام', icon: '📋', color: 'blue' },
    { id: 'greeting', name: 'ترحيب', icon: '👋', color: 'green' },
    { id: 'closing', name: 'إغلاق', icon: '✅', color: 'teal' },
    { id: 'info', name: 'معلومات', icon: 'ℹ️', color: 'purple' },
    { id: 'followup', name: 'متابعة', icon: '🔄', color: 'orange' },
    { id: 'rejection', name: 'اعتذار', icon: '⚠️', color: 'red' }
];

const DEFAULT_REPLIES: QuickReply[] = [
    {
        id: 'default_1',
        title: 'ترحيب',
        content: 'السلام عليكم ورحمة الله وبركاته،\n\nنشكرك على تواصلك مع مديرية مالية حلب.\n\n{محتوى_الرد}\n\nمع أطيب التحيات،\n{اسم_الموظف}',
        category: 'greeting',
        tags: ['ترحيب', 'بداية'],
        variables: ['محتوى_الرد', 'اسم_الموظف'],
        usageCount: 0,
        createdAt: new Date().toISOString(),
        isGlobal: true
    },
    {
        id: 'default_2',
        title: 'طلب مستندات إضافية',
        content: 'نشكرك على تواصلك معنا.\n\nللتمكن من معالجة طلبك، نرجو منك تزويدنا بالمستندات التالية:\n- {المستند_1}\n- {المستند_2}\n\nنرجو إرسالها في أقرب وقت ممكن.\n\nمع التقدير.',
        category: 'info',
        tags: ['مستندات', 'طلب'],
        variables: ['المستند_1', 'المستند_2'],
        usageCount: 0,
        createdAt: new Date().toISOString(),
        isGlobal: true
    },
    {
        id: 'default_3',
        title: 'إغلاق مع حل',
        content: 'تم معالجة طلبك بنجاح.\n\n{تفاصيل_الحل}\n\nفي حال وجود أي استفسارات إضافية، لا تتردد في التواصل معنا.\n\nمع أطيب التمنيات.',
        category: 'closing',
        tags: ['إغلاق', 'حل'],
        variables: ['تفاصيل_الحل'],
        usageCount: 0,
        createdAt: new Date().toISOString(),
        isGlobal: true
    },
    {
        id: 'default_4',
        title: 'متابعة',
        content: 'تحية طيبة،\n\nنود إعلامك بأن طلبك رقم {رقم_الطلب} قيد المعالجة حالياً.\n\n{تفاصيل_المتابعة}\n\nسنوافيك بالتحديثات قريباً.',
        category: 'followup',
        tags: ['متابعة', 'تحديث'],
        variables: ['رقم_الطلب', 'تفاصيل_المتابعة'],
        usageCount: 0,
        createdAt: new Date().toISOString(),
        isGlobal: true
    },
    {
        id: 'default_5',
        title: 'اعتذار عن عدم الاختصاص',
        content: 'نشكرك على تواصلك معنا.\n\nنود إعلامك بأن الموضوع المطروح لا يقع ضمن اختصاص مديرية مالية حلب.\n\nننصحك بالتوجه إلى {الجهة_المختصة} للحصول على المساعدة المطلوبة.\n\nمع أطيب التمنيات.',
        category: 'rejection',
        tags: ['اعتذار', 'تحويل'],
        variables: ['الجهة_المختصة'],
        usageCount: 0,
        createdAt: new Date().toISOString(),
        isGlobal: true
    }
];

// ==================== إدارة الردود السريعة ====================

/**
 * الحصول على جميع الردود السريعة
 */
export const getQuickReplies = (): QuickReply[] => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        const replies = stored ? JSON.parse(stored) : [];

        // إضافة الردود الافتراضية إذا لم تكن موجودة
        if (replies.length === 0) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_REPLIES));
            return DEFAULT_REPLIES;
        }

        return replies;
    } catch {
        return DEFAULT_REPLIES;
    }
};

/**
 * الحصول على التصنيفات
 */
export const getCategories = (): QuickReplyCategory[] => {
    try {
        const stored = localStorage.getItem(CATEGORIES_KEY);
        return stored ? JSON.parse(stored) : DEFAULT_CATEGORIES;
    } catch {
        return DEFAULT_CATEGORIES;
    }
};

/**
 * إضافة رد سريع جديد
 */
export const addQuickReply = (reply: Omit<QuickReply, 'id' | 'usageCount' | 'createdAt'>): QuickReply => {
    const newReply: QuickReply = {
        ...reply,
        id: `qr_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        usageCount: 0,
        createdAt: new Date().toISOString()
    };

    const replies = getQuickReplies();
    replies.push(newReply);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(replies));

    return newReply;
};

/**
 * تحديث رد سريع
 */
export const updateQuickReply = (id: string, updates: Partial<QuickReply>): void => {
    const replies = getQuickReplies();
    const index = replies.findIndex(r => r.id === id);

    if (index !== -1) {
        replies[index] = { ...replies[index], ...updates };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(replies));
    }
};

/**
 * حذف رد سريع
 */
export const deleteQuickReply = (id: string): void => {
    const replies = getQuickReplies().filter(r => r.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(replies));
};

/**
 * تسجيل استخدام الرد
 */
export const recordUsage = (id: string): void => {
    const replies = getQuickReplies();
    const index = replies.findIndex(r => r.id === id);

    if (index !== -1) {
        replies[index].usageCount = (replies[index].usageCount || 0) + 1;
        replies[index].lastUsed = new Date().toISOString();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(replies));
    }
};

/**
 * استبدال المتغيرات في النص
 */
export const replaceVariables = (
    content: string,
    variables: Record<string, string>
): string => {
    let result = content;

    Object.entries(variables).forEach(([key, value]) => {
        const regex = new RegExp(`\\{${key}\\}`, 'g');
        result = result.replace(regex, value);
    });

    return result;
};

/**
 * استخراج المتغيرات من النص
 */
export const extractVariables = (content: string): string[] => {
    const matches = content.match(/\{([^}]+)\}/g);
    if (!matches) return [];
    return [...new Set(matches.map(m => m.slice(1, -1)))];
};

/**
 * البحث في الردود
 */
export const searchQuickReplies = (
    query: string,
    category?: string
): QuickReply[] => {
    const replies = getQuickReplies();
    const lowerQuery = query.toLowerCase();

    return replies.filter(reply => {
        if (category && reply.category !== category) return false;

        const searchText = `${reply.title} ${reply.content} ${reply.tags.join(' ')}`.toLowerCase();
        return searchText.includes(lowerQuery);
    });
};

/**
 * الحصول على الردود الأكثر استخداماً
 */
export const getMostUsedReplies = (limit: number = 5): QuickReply[] => {
    const replies = getQuickReplies();
    return replies
        .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
        .slice(0, limit);
};

// ==================== مكونات React ====================

interface QuickReplyPickerProps {
    onSelect: (content: string, reply: QuickReply) => void;
    variables?: Record<string, string>;
}

export const QuickReplyPicker: React.FC<QuickReplyPickerProps> = ({
    onSelect,
    variables = {}
}) => {
    const [replies, setReplies] = useState<QuickReply[]>([]);
    const [categories] = useState(getCategories());
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showVariableEditor, setShowVariableEditor] = useState(false);
    const [selectedReply, setSelectedReply] = useState<QuickReply | null>(null);
    const [customVariables, setCustomVariables] = useState<Record<string, string>>(variables);

    useEffect(() => {
        setReplies(getQuickReplies());
    }, []);

    const filteredReplies = useMemo(() => {
        let result = replies;

        if (selectedCategory) {
            result = result.filter(r => r.category === selectedCategory);
        }

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(r =>
                r.title.toLowerCase().includes(query) ||
                r.content.toLowerCase().includes(query) ||
                r.tags.some(t => t.toLowerCase().includes(query))
            );
        }

        return result;
    }, [replies, selectedCategory, searchQuery]);

    const handleSelect = (reply: QuickReply) => {
        const replyVariables = extractVariables(reply.content);

        if (replyVariables.length > 0) {
            setSelectedReply(reply);
            setCustomVariables(prev => {
                const updated = { ...prev };
                replyVariables.forEach(v => {
                    if (!updated[v]) updated[v] = '';
                });
                return updated;
            });
            setShowVariableEditor(true);
        } else {
            recordUsage(reply.id);
            onSelect(reply.content, reply);
        }
    };

    const handleConfirmVariables = () => {
        if (selectedReply) {
            const content = replaceVariables(selectedReply.content, customVariables);
            recordUsage(selectedReply.id);
            onSelect(content, selectedReply);
            setShowVariableEditor(false);
            setSelectedReply(null);
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* البحث */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="بحث في الردود السريعة..."
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
            </div>

            {/* التصنيفات */}
            <div className="flex gap-2 p-4 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
                <button
                    onClick={() => setSelectedCategory(null)}
                    className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${!selectedCategory
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}
                >
                    الكل
                </button>
                {categories.map(cat => (
                    <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${selectedCategory === cat.id
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                            }`}
                    >
                        {cat.icon} {cat.name}
                    </button>
                ))}
            </div>

            {/* قائمة الردود */}
            <div className="max-h-80 overflow-y-auto">
                {filteredReplies.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                        لا توجد ردود مطابقة
                    </div>
                ) : (
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                        {filteredReplies.map(reply => (
                            <button
                                key={reply.id}
                                onClick={() => handleSelect(reply)}
                                className="w-full p-4 text-right hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-medium text-gray-800 dark:text-white">
                                        {reply.title}
                                    </span>
                                    {reply.usageCount > 0 && (
                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                            استخدم {reply.usageCount} مرة
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                                    {reply.content.substring(0, 100)}...
                                </p>
                                {reply.tags.length > 0 && (
                                    <div className="flex gap-1 mt-2">
                                        {reply.tags.slice(0, 3).map(tag => (
                                            <span
                                                key={tag}
                                                className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded"
                                            >
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* محرر المتغيرات */}
            {showVariableEditor && selectedReply && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg p-6">
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">
                            تخصيص المتغيرات
                        </h3>

                        <div className="space-y-4 mb-6">
                            {extractVariables(selectedReply.content).map(variable => (
                                <div key={variable}>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        {variable}
                                    </label>
                                    <input
                                        type="text"
                                        value={customVariables[variable] || ''}
                                        onChange={(e) => setCustomVariables(prev => ({
                                            ...prev,
                                            [variable]: e.target.value
                                        }))}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                        placeholder={`أدخل ${variable}`}
                                    />
                                </div>
                            ))}
                        </div>

                        {/* معاينة */}
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                معاينة:
                            </label>
                            <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                                {replaceVariables(selectedReply.content, customVariables)}
                            </p>
                        </div>

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => {
                                    setShowVariableEditor(false);
                                    setSelectedReply(null);
                                }}
                                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                            >
                                إلغاء
                            </button>
                            <button
                                onClick={handleConfirmVariables}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                            >
                                استخدام الرد
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

interface QuickReplyManagerProps {
    userId?: string;
}

export const QuickReplyManager: React.FC<QuickReplyManagerProps> = ({ userId }) => {
    const [replies, setReplies] = useState<QuickReply[]>([]);
    const [categories] = useState(getCategories());
    const [isEditing, setIsEditing] = useState(false);
    const [editingReply, setEditingReply] = useState<Partial<QuickReply>>({});
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    useEffect(() => {
        setReplies(getQuickReplies());
    }, []);

    const refresh = () => setReplies(getQuickReplies());

    const handleSave = () => {
        if (!editingReply.title || !editingReply.content || !editingReply.category) return;

        if (editingReply.id) {
            updateQuickReply(editingReply.id, editingReply);
        } else {
            addQuickReply({
                title: editingReply.title,
                content: editingReply.content,
                category: editingReply.category,
                tags: editingReply.tags || [],
                shortcut: editingReply.shortcut,
                createdBy: userId
            });
        }

        setIsEditing(false);
        setEditingReply({});
        refresh();
    };

    const handleDelete = (id: string) => {
        if (confirm('هل أنت متأكد من حذف هذا الرد السريع؟')) {
            deleteQuickReply(id);
            refresh();
        }
    };

    const handleEdit = (reply: QuickReply) => {
        setEditingReply(reply);
        setIsEditing(true);
    };

    const filteredReplies = selectedCategory
        ? replies.filter(r => r.category === selectedCategory)
        : replies;

    return (
        <div className="space-y-6">
            {/* شريط الأدوات */}
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                    إدارة الردود السريعة
                </h2>
                <button
                    onClick={() => {
                        setEditingReply({ category: 'general', tags: [] });
                        setIsEditing(true);
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                >
                    + رد جديد
                </button>
            </div>

            {/* التصنيفات */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                <button
                    onClick={() => setSelectedCategory(null)}
                    className={`px-4 py-2 rounded-lg whitespace-nowrap ${!selectedCategory
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}
                >
                    الكل ({replies.length})
                </button>
                {categories.map(cat => {
                    const count = replies.filter(r => r.category === cat.id).length;
                    return (
                        <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`px-4 py-2 rounded-lg whitespace-nowrap ${selectedCategory === cat.id
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                }`}
                        >
                            {cat.icon} {cat.name} ({count})
                        </button>
                    );
                })}
            </div>

            {/* قائمة الردود */}
            <div className="grid gap-4 md:grid-cols-2">
                {filteredReplies.map(reply => (
                    <div
                        key={reply.id}
                        className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow border border-gray-200 dark:border-gray-700"
                    >
                        <div className="flex items-start justify-between mb-2">
                            <h3 className="font-bold text-gray-800 dark:text-white">{reply.title}</h3>
                            <div className="flex gap-1">
                                <button
                                    onClick={() => handleEdit(reply)}
                                    className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded"
                                >
                                    ✏️
                                </button>
                                <button
                                    onClick={() => handleDelete(reply.id)}
                                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                                >
                                    🗑️
                                </button>
                            </div>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 mb-3">
                            {reply.content}
                        </p>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                            <div className="flex gap-1">
                                {reply.tags.slice(0, 2).map(tag => (
                                    <span key={tag} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                            <span>استخدم {reply.usageCount} مرة</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* نموذج التعديل/الإضافة */}
            {isEditing && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg p-6">
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">
                            {editingReply.id ? 'تعديل الرد' : 'رد جديد'}
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    العنوان
                                </label>
                                <input
                                    type="text"
                                    value={editingReply.title || ''}
                                    onChange={(e) => setEditingReply(prev => ({ ...prev, title: e.target.value }))}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    التصنيف
                                </label>
                                <select
                                    value={editingReply.category || ''}
                                    onChange={(e) => setEditingReply(prev => ({ ...prev, category: e.target.value }))}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                >
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    المحتوى
                                    <span className="text-xs text-gray-500 mr-2">
                                        (استخدم {'{'}اسم_المتغير{'}'} للمتغيرات)
                                    </span>
                                </label>
                                <textarea
                                    value={editingReply.content || ''}
                                    onChange={(e) => setEditingReply(prev => ({ ...prev, content: e.target.value }))}
                                    rows={6}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    الوسوم (مفصولة بفاصلة)
                                </label>
                                <input
                                    type="text"
                                    value={(editingReply.tags || []).join(', ')}
                                    onChange={(e) => setEditingReply(prev => ({
                                        ...prev,
                                        tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean)
                                    }))}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => {
                                    setIsEditing(false);
                                    setEditingReply({});
                                }}
                                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                            >
                                إلغاء
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={!editingReply.title || !editingReply.content}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
                            >
                                حفظ
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ==================== Hook للاستخدام ====================
export const useQuickReplies = (category?: string) => {
    const [replies, setReplies] = useState<QuickReply[]>([]);

    useEffect(() => {
        const all = getQuickReplies();
        setReplies(category ? all.filter(r => r.category === category) : all);
    }, [category]);

    const mostUsed = useMemo(() => getMostUsedReplies(5), [replies]);
    const categories = getCategories();

    const refresh = useCallback(() => {
        const all = getQuickReplies();
        setReplies(category ? all.filter(r => r.category === category) : all);
    }, [category]);

    return {
        replies,
        mostUsed,
        categories,
        refresh,
        add: addQuickReply,
        update: updateQuickReply,
        remove: deleteQuickReply,
        search: searchQuickReplies
    };
};
