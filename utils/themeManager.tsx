/**
 * نظام إدارة المظهر المتقدم
 * وضع القراءة الليلية المحسّن + تخصيص الألوان + عرض البطاقات المتعدد
 */

import React, { useState, useEffect, createContext, useContext } from 'react';

// ==================== أنواع المظهر ====================
export type ThemeMode = 'light' | 'dark' | 'auto' | 'sepia' | 'high-contrast';
export type ViewMode = 'grid' | 'list' | 'compact';
export type AccentColor = 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'teal' | 'custom';

export interface ThemeSettings {
    mode: ThemeMode;
    accentColor: AccentColor;
    customAccentColor?: string;
    fontSize: 'small' | 'medium' | 'large';
    reducedMotion: boolean;
    viewMode: ViewMode;
    sidebarCollapsed: boolean;
}

const DEFAULT_SETTINGS: ThemeSettings = {
    mode: 'auto',
    accentColor: 'teal',
    fontSize: 'medium',
    reducedMotion: false,
    viewMode: 'grid',
    sidebarCollapsed: false
};

// ==================== ألوان التمييز ====================
export const ACCENT_COLORS: Record<AccentColor, { primary: string; hover: string; light: string }> = {
    blue: { primary: '#3b82f6', hover: '#2563eb', light: '#dbeafe' },
    green: { primary: '#10b981', hover: '#059669', light: '#d1fae5' },
    purple: { primary: '#8b5cf6', hover: '#7c3aed', light: '#ede9fe' },
    orange: { primary: '#f59e0b', hover: '#d97706', light: '#fef3c7' },
    red: { primary: '#ef4444', hover: '#dc2626', light: '#fee2e2' },
    teal: { primary: '#0f3c35', hover: '#0a2a25', light: '#ccfbf1' },
    custom: { primary: '#0f3c35', hover: '#0a2a25', light: '#ccfbf1' }
};

// ==================== Context للمظهر ====================
interface ThemeContextType {
    settings: ThemeSettings;
    updateSettings: (updates: Partial<ThemeSettings>) => void;
    resetSettings: () => void;
    effectiveMode: 'light' | 'dark';
    accentColors: { primary: string; hover: string; light: string };
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within ThemeProvider');
    }
    return context;
};

// ==================== مزود المظهر ====================
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [settings, setSettings] = useState<ThemeSettings>(() => {
        try {
            const stored = localStorage.getItem('themeSettings');
            return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SETTINGS;
        } catch {
            return DEFAULT_SETTINGS;
        }
    });

    const [systemDark, setSystemDark] = useState(() =>
        window.matchMedia('(prefers-color-scheme: dark)').matches
    );

    // مراقبة تفضيلات النظام
    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
        mediaQuery.addEventListener('change', handler);
        return () => mediaQuery.removeEventListener('change', handler);
    }, []);

    // حساب الوضع الفعلي
    const effectiveMode: 'light' | 'dark' =
        settings.mode === 'auto' ? (systemDark ? 'dark' : 'light') :
            settings.mode === 'sepia' ? 'light' :
                settings.mode === 'high-contrast' ? 'dark' :
                    settings.mode;

    // ألوان التمييز الفعلية
    const accentColors = settings.accentColor === 'custom' && settings.customAccentColor
        ? { primary: settings.customAccentColor, hover: settings.customAccentColor, light: `${settings.customAccentColor}20` }
        : ACCENT_COLORS[settings.accentColor];

    // تطبيق المظهر على الـ document
    useEffect(() => {
        const root = document.documentElement;

        // إزالة جميع الأصناف السابقة
        root.classList.remove('light', 'dark', 'sepia', 'high-contrast');

        // إضافة الصنف الجديد
        if (settings.mode === 'sepia') {
            root.classList.add('light', 'sepia');
        } else if (settings.mode === 'high-contrast') {
            root.classList.add('dark', 'high-contrast');
        } else {
            root.classList.add(effectiveMode);
        }

        // تطبيق حجم الخط
        const fontSizes = { small: '14px', medium: '16px', large: '18px' };
        root.style.fontSize = fontSizes[settings.fontSize];

        // تطبيق تقليل الحركة
        if (settings.reducedMotion) {
            root.style.setProperty('--animation-duration', '0.01ms');
        } else {
            root.style.removeProperty('--animation-duration');
        }

        // تطبيق لون التمييز
        root.style.setProperty('--accent-primary', accentColors.primary);
        root.style.setProperty('--accent-hover', accentColors.hover);
        root.style.setProperty('--accent-light', accentColors.light);

        // حفظ الإعدادات
        localStorage.setItem('themeSettings', JSON.stringify(settings));
    }, [settings, effectiveMode, accentColors]);

    const updateSettings = (updates: Partial<ThemeSettings>) => {
        setSettings(prev => ({ ...prev, ...updates }));
    };

    const resetSettings = () => {
        setSettings(DEFAULT_SETTINGS);
    };

    return (
        <ThemeContext.Provider value={{ settings, updateSettings, resetSettings, effectiveMode, accentColors }}>
            {children}
        </ThemeContext.Provider>
    );
};

// ==================== مكون إعدادات المظهر ====================
export const ThemeSettingsPanel: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
    const { settings, updateSettings, resetSettings, effectiveMode } = useTheme();

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">إعدادات المظهر</h3>
                {onClose && (
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                        ✕
                    </button>
                )}
            </div>

            {/* وضع المظهر */}
            <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">الوضع</label>
                <div className="grid grid-cols-5 gap-2">
                    {[
                        { value: 'light', label: '☀️', title: 'فاتح' },
                        { value: 'dark', label: '🌙', title: 'داكن' },
                        { value: 'auto', label: '🌓', title: 'تلقائي' },
                        { value: 'sepia', label: '📜', title: 'بني' },
                        { value: 'high-contrast', label: '◐', title: 'تباين عالي' }
                    ].map(mode => (
                        <button
                            key={mode.value}
                            onClick={() => updateSettings({ mode: mode.value as ThemeMode })}
                            title={mode.title}
                            className={`p-3 rounded-xl text-2xl transition-all ${settings.mode === mode.value
                                    ? 'bg-blue-100 dark:bg-blue-900 ring-2 ring-blue-500'
                                    : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                                }`}
                        >
                            {mode.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* لون التمييز */}
            <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">لون التمييز</label>
                <div className="flex flex-wrap gap-2">
                    {(Object.keys(ACCENT_COLORS) as AccentColor[]).filter(c => c !== 'custom').map(color => (
                        <button
                            key={color}
                            onClick={() => updateSettings({ accentColor: color })}
                            className={`w-10 h-10 rounded-full transition-all ${settings.accentColor === color ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-105'
                                }`}
                            style={{ backgroundColor: ACCENT_COLORS[color].primary }}
                            title={color}
                        />
                    ))}
                    <div className="relative">
                        <input
                            type="color"
                            value={settings.customAccentColor || '#0f3c35'}
                            onChange={(e) => updateSettings({ accentColor: 'custom', customAccentColor: e.target.value })}
                            className="w-10 h-10 rounded-full cursor-pointer"
                            title="لون مخصص"
                        />
                    </div>
                </div>
            </div>

            {/* حجم الخط */}
            <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">حجم الخط</label>
                <div className="flex gap-2">
                    {[
                        { value: 'small', label: 'صغير' },
                        { value: 'medium', label: 'متوسط' },
                        { value: 'large', label: 'كبير' }
                    ].map(size => (
                        <button
                            key={size.value}
                            onClick={() => updateSettings({ fontSize: size.value as ThemeSettings['fontSize'] })}
                            className={`flex-1 py-2 px-4 rounded-lg transition-colors ${settings.fontSize === size.value
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                }`}
                        >
                            {size.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* عرض البطاقات */}
            <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">عرض البطاقات</label>
                <div className="flex gap-2">
                    {[
                        { value: 'grid', label: '⊞', title: 'شبكة' },
                        { value: 'list', label: '☰', title: 'قائمة' },
                        { value: 'compact', label: '▤', title: 'مضغوط' }
                    ].map(view => (
                        <button
                            key={view.value}
                            onClick={() => updateSettings({ viewMode: view.value as ViewMode })}
                            title={view.title}
                            className={`flex-1 py-3 rounded-lg text-xl transition-colors ${settings.viewMode === view.value
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                }`}
                        >
                            {view.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* خيارات إضافية */}
            <div className="mb-6 space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={settings.reducedMotion}
                        onChange={(e) => updateSettings({ reducedMotion: e.target.checked })}
                        className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-gray-700 dark:text-gray-300">تقليل الحركة</span>
                </label>
            </div>

            {/* زر إعادة التعيين */}
            <button
                onClick={resetSettings}
                className="w-full py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
                إعادة تعيين للافتراضي
            </button>
        </div>
    );
};

// ==================== أنماط CSS للأوضاع المختلفة ====================
export const themeStyles = `
  /* وضع Sepia */
  .sepia {
    filter: sepia(20%);
    background-color: #fdf6e3 !important;
  }
  .sepia * {
    border-color: #d4c4a8 !important;
  }

  /* وضع التباين العالي */
  .high-contrast {
    filter: contrast(1.2);
  }
  .high-contrast * {
    border-color: #fff !important;
  }

  /* متغيرات CSS للألوان */
  :root {
    --accent-primary: #0f3c35;
    --accent-hover: #0a2a25;
    --accent-light: #ccfbf1;
  }

  /* تطبيق لون التمييز */
  .accent-bg { background-color: var(--accent-primary); }
  .accent-bg-hover:hover { background-color: var(--accent-hover); }
  .accent-text { color: var(--accent-primary); }
  .accent-border { border-color: var(--accent-primary); }
`;
