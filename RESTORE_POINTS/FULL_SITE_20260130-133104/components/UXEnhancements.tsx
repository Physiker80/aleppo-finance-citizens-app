import React, { useState, useEffect, useCallback } from 'react';

// ===== شريط تقدم الصفحة =====
export const ScrollProgressBar: React.FC = () => {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const updateProgress = () => {
            const scrollTop = window.scrollY;
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            const scrollPercent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
            setProgress(scrollPercent);
        };

        window.addEventListener('scroll', updateProgress, { passive: true });
        return () => window.removeEventListener('scroll', updateProgress);
    }, []);

    if (progress < 1) return null;

    return (
        <div className="fixed top-0 left-0 right-0 h-1 z-[9999] bg-gray-200/50 dark:bg-gray-700/50">
            <div
                className="h-full bg-gradient-to-r from-[#0f3c35] via-emerald-500 to-[#0f3c35] transition-all duration-150"
                style={{ width: `${progress}%` }}
            />
        </div>
    );
};

// ===== اختصارات لوحة المفاتيح =====
interface KeyboardShortcut {
    key: string;
    ctrlKey?: boolean;
    altKey?: boolean;
    shiftKey?: boolean;
    action: () => void;
    description: string;
}

export const useKeyboardShortcuts = (shortcuts: KeyboardShortcut[]) => {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            for (const shortcut of shortcuts) {
                const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();
                const ctrlMatch = shortcut.ctrlKey ? e.ctrlKey : !e.ctrlKey;
                const altMatch = shortcut.altKey ? e.altKey : !e.altKey;
                const shiftMatch = shortcut.shiftKey ? e.shiftKey : !e.shiftKey;

                if (keyMatch && ctrlMatch && altMatch && shiftMatch) {
                    e.preventDefault();
                    shortcut.action();
                    break;
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [shortcuts]);
};

// ===== مساعد الاختصارات (عرض قائمة الاختصارات) =====
export const KeyboardShortcutsHelp: React.FC<{
    shortcuts: KeyboardShortcut[];
    isOpen: boolean;
    onClose: () => void;
}> = ({ shortcuts, isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl animate-scaleIn" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        ⌨️ اختصارات لوحة المفاتيح
                    </h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">✕</button>
                </div>
                <div className="space-y-2">
                    {shortcuts.map((s, i) => (
                        <div key={i} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <span className="text-gray-700 dark:text-gray-300">{s.description}</span>
                            <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded text-sm font-mono">
                                {s.ctrlKey && 'Ctrl+'}{s.altKey && 'Alt+'}{s.shiftKey && 'Shift+'}{s.key.toUpperCase()}
                            </kbd>
                        </div>
                    ))}
                </div>
                <p className="mt-4 text-xs text-gray-500 dark:text-gray-400 text-center">
                    اضغط <kbd className="px-1 bg-gray-200 dark:bg-gray-600 rounded">?</kbd> في أي وقت لعرض هذه القائمة
                </p>
            </div>
        </div>
    );
};

// ===== شريط البحث الشامل (Spotlight) =====
interface SpotlightItem {
    id: string;
    title: string;
    description?: string;
    icon?: string;
    action: () => void;
    category?: string;
}

export const SpotlightSearch: React.FC<{
    items: SpotlightItem[];
    isOpen: boolean;
    onClose: () => void;
}> = ({ items, isOpen, onClose }) => {
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);

    const filteredItems = items.filter(item =>
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        item.description?.toLowerCase().includes(query.toLowerCase())
    );

    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setSelectedIndex(0);
        }
    }, [isOpen]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(i => Math.min(i + 1, filteredItems.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(i => Math.max(i - 1, 0));
        } else if (e.key === 'Enter' && filteredItems[selectedIndex]) {
            filteredItems[selectedIndex].action();
            onClose();
        } else if (e.key === 'Escape') {
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center pt-[15vh] z-[9999]" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-xl mx-4 shadow-2xl overflow-hidden animate-fadeInDown" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">🔍</span>
                        <input
                            type="text"
                            value={query}
                            onChange={e => { setQuery(e.target.value); setSelectedIndex(0); }}
                            onKeyDown={handleKeyDown}
                            placeholder="ابحث عن أي شيء..."
                            className="flex-1 bg-transparent text-lg outline-none text-gray-800 dark:text-white placeholder-gray-400"
                            autoFocus
                        />
                        <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-500">ESC</kbd>
                    </div>
                </div>
                <div className="max-h-80 overflow-y-auto">
                    {filteredItems.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            <span className="text-4xl block mb-2">🔎</span>
                            لا توجد نتائج
                        </div>
                    ) : (
                        filteredItems.map((item, i) => (
                            <div
                                key={item.id}
                                onClick={() => { item.action(); onClose(); }}
                                className={`p-3 flex items-center gap-3 cursor-pointer transition-colors ${i === selectedIndex ? 'bg-blue-50 dark:bg-blue-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                                    }`}
                            >
                                <span className="text-2xl">{item.icon || '📄'}</span>
                                <div className="flex-1">
                                    <div className="font-medium text-gray-800 dark:text-white">{item.title}</div>
                                    {item.description && (
                                        <div className="text-sm text-gray-500 dark:text-gray-400">{item.description}</div>
                                    )}
                                </div>
                                {item.category && (
                                    <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-500">
                                        {item.category}
                                    </span>
                                )}
                            </div>
                        ))
                    )}
                </div>
                <div className="p-2 border-t dark:border-gray-700 flex items-center justify-center gap-4 text-xs text-gray-500">
                    <span>↑↓ للتنقل</span>
                    <span>Enter للفتح</span>
                    <span>ESC للإغلاق</span>
                </div>
            </div>
        </div>
    );
};

// ===== جولة تعريفية (Onboarding Tour) =====
interface TourStep {
    target: string; // CSS selector
    title: string;
    content: string;
    position?: 'top' | 'bottom' | 'left' | 'right';
}

export const OnboardingTour: React.FC<{
    steps: TourStep[];
    isActive: boolean;
    onComplete: () => void;
}> = ({ steps, isActive, onComplete }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

    useEffect(() => {
        if (!isActive) return;

        const step = steps[currentStep];
        const target = document.querySelector(step.target);
        if (target) {
            setTargetRect(target.getBoundingClientRect());
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [currentStep, isActive, steps]);

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            onComplete();
        }
    };

    const handlePrev = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    if (!isActive || !targetRect) return null;

    const step = steps[currentStep];

    return (
        <>
            {/* الخلفية الداكنة مع فتحة للعنصر */}
            <div className="fixed inset-0 z-[9998]">
                <svg className="w-full h-full">
                    <defs>
                        <mask id="tour-mask">
                            <rect width="100%" height="100%" fill="white" />
                            <rect
                                x={targetRect.left - 8}
                                y={targetRect.top - 8}
                                width={targetRect.width + 16}
                                height={targetRect.height + 16}
                                rx="8"
                                fill="black"
                            />
                        </mask>
                    </defs>
                    <rect
                        width="100%"
                        height="100%"
                        fill="rgba(0,0,0,0.7)"
                        mask="url(#tour-mask)"
                    />
                </svg>
            </div>

            {/* بطاقة الشرح */}
            <div
                className="fixed z-[9999] bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-4 max-w-sm animate-fadeIn"
                style={{
                    top: targetRect.bottom + 16,
                    left: Math.max(16, Math.min(targetRect.left, window.innerWidth - 320)),
                }}
            >
                <div className="flex items-center gap-2 mb-2">
                    <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                        {currentStep + 1}/{steps.length}
                    </span>
                    <h4 className="font-bold text-gray-800 dark:text-white">{step.title}</h4>
                </div>
                <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">{step.content}</p>
                <div className="flex items-center justify-between">
                    <button
                        onClick={handlePrev}
                        disabled={currentStep === 0}
                        className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50"
                    >
                        السابق
                    </button>
                    <div className="flex gap-1">
                        {steps.map((_, i) => (
                            <div
                                key={i}
                                className={`w-2 h-2 rounded-full ${i === currentStep ? 'bg-blue-600' : 'bg-gray-300'}`}
                            />
                        ))}
                    </div>
                    <button
                        onClick={handleNext}
                        className="px-4 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                    >
                        {currentStep === steps.length - 1 ? 'إنهاء' : 'التالي'}
                    </button>
                </div>
                <button
                    onClick={onComplete}
                    className="absolute top-2 left-2 text-gray-400 hover:text-gray-600 text-sm"
                >
                    تخطي
                </button>
            </div>
        </>
    );
};

// ===== تقييم الخدمة بالنجوم =====
export const StarRating: React.FC<{
    value: number;
    onChange?: (value: number) => void;
    readonly?: boolean;
    size?: 'sm' | 'md' | 'lg';
}> = ({ value, onChange, readonly = false, size = 'md' }) => {
    const [hoverValue, setHoverValue] = useState<number | null>(null);

    const sizes = {
        sm: 'text-lg',
        md: 'text-2xl',
        lg: 'text-4xl',
    };

    return (
        <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(star => (
                <button
                    key={star}
                    type="button"
                    disabled={readonly}
                    onMouseEnter={() => !readonly && setHoverValue(star)}
                    onMouseLeave={() => setHoverValue(null)}
                    onClick={() => onChange?.(star)}
                    className={`${sizes[size]} transition-transform ${!readonly && 'hover:scale-110 cursor-pointer'} ${readonly && 'cursor-default'}`}
                >
                    {(hoverValue ?? value) >= star ? '⭐' : '☆'}
                </button>
            ))}
        </div>
    );
};

// ===== تقييم بالإيموجي =====
export const EmojiRating: React.FC<{
    value: number;
    onChange?: (value: number) => void;
    readonly?: boolean;
}> = ({ value, onChange, readonly = false }) => {
    const emojis = [
        { value: 1, emoji: '😠', label: 'سيء جداً' },
        { value: 2, emoji: '😕', label: 'سيء' },
        { value: 3, emoji: '😐', label: 'متوسط' },
        { value: 4, emoji: '😊', label: 'جيد' },
        { value: 5, emoji: '😍', label: 'ممتاز' },
    ];

    return (
        <div className="flex gap-2">
            {emojis.map(e => (
                <button
                    key={e.value}
                    type="button"
                    disabled={readonly}
                    onClick={() => onChange?.(e.value)}
                    className={`text-3xl p-2 rounded-lg transition-all ${value === e.value
                            ? 'bg-blue-100 dark:bg-blue-900 scale-110'
                            : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                        } ${readonly ? 'cursor-default' : 'cursor-pointer'}`}
                    title={e.label}
                >
                    {e.emoji}
                </button>
            ))}
        </div>
    );
};

// ===== الملء التلقائي الذكي =====
export const useAutoSave = <T extends object>(key: string, data: T) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            localStorage.setItem(`autosave_${key}`, JSON.stringify(data));
        }, 1000);
        return () => clearTimeout(timer);
    }, [key, data]);
};

export const loadAutoSave = <T extends object>(key: string): T | null => {
    try {
        const saved = localStorage.getItem(`autosave_${key}`);
        return saved ? JSON.parse(saved) : null;
    } catch {
        return null;
    }
};

export const clearAutoSave = (key: string) => {
    localStorage.removeItem(`autosave_${key}`);
};

export default {
    ScrollProgressBar,
    useKeyboardShortcuts,
    KeyboardShortcutsHelp,
    SpotlightSearch,
    OnboardingTour,
    StarRating,
    EmojiRating,
    useAutoSave,
    loadAutoSave,
    clearAutoSave,
};
