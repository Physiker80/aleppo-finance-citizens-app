// =====================================================
// 🎨 Color Customization System
// نظام تخصيص الألوان للمستخدم
// =====================================================

export interface ColorScheme {
    id: string;
    name: string;
    primary: string;
    primaryLight: string;
    primaryDark: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    success: string;
    error: string;
    warning: string;
    info: string;
}

// المخططات اللونية المحددة مسبقاً
export const COLOR_PRESETS: ColorScheme[] = [
    {
        id: 'syrian-green',
        name: 'الأخضر السوري',
        primary: '#0f3c35',
        primaryLight: '#1a5c52',
        primaryDark: '#082923',
        secondary: '#2d6a4f',
        accent: '#40916c',
        background: '#f8fafc',
        surface: '#ffffff',
        text: '#1e293b',
        textSecondary: '#64748b',
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6'
    },
    {
        id: 'royal-blue',
        name: 'الأزرق الملكي',
        primary: '#1e3a8a',
        primaryLight: '#3b82f6',
        primaryDark: '#1e3a5f',
        secondary: '#6366f1',
        accent: '#8b5cf6',
        background: '#f1f5f9',
        surface: '#ffffff',
        text: '#1e293b',
        textSecondary: '#64748b',
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#0ea5e9'
    },
    {
        id: 'burgundy',
        name: 'العنابي',
        primary: '#7f1d1d',
        primaryLight: '#b91c1c',
        primaryDark: '#450a0a',
        secondary: '#9f1239',
        accent: '#be123c',
        background: '#fef2f2',
        surface: '#ffffff',
        text: '#1c1917',
        textSecondary: '#57534e',
        success: '#15803d',
        error: '#dc2626',
        warning: '#d97706',
        info: '#2563eb'
    },
    {
        id: 'golden',
        name: 'الذهبي',
        primary: '#92400e',
        primaryLight: '#d97706',
        primaryDark: '#78350f',
        secondary: '#b45309',
        accent: '#f59e0b',
        background: '#fffbeb',
        surface: '#ffffff',
        text: '#292524',
        textSecondary: '#78716c',
        success: '#16a34a',
        error: '#dc2626',
        warning: '#ea580c',
        info: '#2563eb'
    },
    {
        id: 'ocean',
        name: 'المحيط',
        primary: '#0c4a6e',
        primaryLight: '#0284c7',
        primaryDark: '#082f49',
        secondary: '#0369a1',
        accent: '#38bdf8',
        background: '#f0f9ff',
        surface: '#ffffff',
        text: '#0f172a',
        textSecondary: '#475569',
        success: '#059669',
        error: '#e11d48',
        warning: '#ea580c',
        info: '#06b6d4'
    },
    {
        id: 'purple',
        name: 'البنفسجي',
        primary: '#581c87',
        primaryLight: '#9333ea',
        primaryDark: '#3b0764',
        secondary: '#7c3aed',
        accent: '#a855f7',
        background: '#faf5ff',
        surface: '#ffffff',
        text: '#1e1b4b',
        textSecondary: '#6b7280',
        success: '#22c55e',
        error: '#f43f5e',
        warning: '#f97316',
        info: '#6366f1'
    },
    {
        id: 'dark-mode',
        name: 'الوضع الداكن',
        primary: '#3b82f6',
        primaryLight: '#60a5fa',
        primaryDark: '#2563eb',
        secondary: '#8b5cf6',
        accent: '#a78bfa',
        background: '#0f172a',
        surface: '#1e293b',
        text: '#f1f5f9',
        textSecondary: '#94a3b8',
        success: '#22c55e',
        error: '#f87171',
        warning: '#fbbf24',
        info: '#38bdf8'
    },
    {
        id: 'high-contrast',
        name: 'تباين عالي',
        primary: '#000000',
        primaryLight: '#374151',
        primaryDark: '#000000',
        secondary: '#1f2937',
        accent: '#4b5563',
        background: '#ffffff',
        surface: '#ffffff',
        text: '#000000',
        textSecondary: '#111827',
        success: '#166534',
        error: '#991b1b',
        warning: '#92400e',
        info: '#1e40af'
    }
];

const STORAGE_KEY = 'user-color-scheme';
const CUSTOM_SCHEMES_KEY = 'custom-color-schemes';

/**
 * حفظ المخطط اللوني المحدد
 */
export function saveColorScheme(schemeId: string): void {
    localStorage.setItem(STORAGE_KEY, schemeId);
}

/**
 * الحصول على المخطط اللوني المحفوظ
 */
export function getSavedSchemeId(): string {
    return localStorage.getItem(STORAGE_KEY) || 'syrian-green';
}

/**
 * حفظ مخططات مخصصة
 */
export function saveCustomSchemes(schemes: ColorScheme[]): void {
    localStorage.setItem(CUSTOM_SCHEMES_KEY, JSON.stringify(schemes));
}

/**
 * تحميل المخططات المخصصة
 */
export function loadCustomSchemes(): ColorScheme[] {
    try {
        const saved = localStorage.getItem(CUSTOM_SCHEMES_KEY);
        return saved ? JSON.parse(saved) : [];
    } catch {
        return [];
    }
}

/**
 * الحصول على جميع المخططات (محددة مسبقاً + مخصصة)
 */
export function getAllSchemes(): ColorScheme[] {
    return [...COLOR_PRESETS, ...loadCustomSchemes()];
}

/**
 * الحصول على مخطط بواسطة ID
 */
export function getSchemeById(id: string): ColorScheme | undefined {
    return getAllSchemes().find(s => s.id === id);
}

/**
 * الحصول على المخطط النشط
 */
export function getActiveScheme(): ColorScheme {
    const savedId = getSavedSchemeId();
    return getSchemeById(savedId) || COLOR_PRESETS[0];
}

/**
 * تطبيق المخطط اللوني على CSS Variables
 */
export function applyColorScheme(scheme: ColorScheme): void {
    const root = document.documentElement;

    root.style.setProperty('--color-primary', scheme.primary);
    root.style.setProperty('--color-primary-light', scheme.primaryLight);
    root.style.setProperty('--color-primary-dark', scheme.primaryDark);
    root.style.setProperty('--color-secondary', scheme.secondary);
    root.style.setProperty('--color-accent', scheme.accent);
    root.style.setProperty('--color-background', scheme.background);
    root.style.setProperty('--color-surface', scheme.surface);
    root.style.setProperty('--color-text', scheme.text);
    root.style.setProperty('--color-text-secondary', scheme.textSecondary);
    root.style.setProperty('--color-success', scheme.success);
    root.style.setProperty('--color-error', scheme.error);
    root.style.setProperty('--color-warning', scheme.warning);
    root.style.setProperty('--color-info', scheme.info);

    // Tailwind overrides
    root.style.setProperty('--tw-color-primary', scheme.primary);

    // Update meta theme-color
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
        metaTheme.setAttribute('content', scheme.primary);
    }

    // Save preference
    saveColorScheme(scheme.id);
}

/**
 * إنشاء مخطط مخصص
 */
export function createCustomScheme(name: string, baseScheme: ColorScheme, overrides: Partial<ColorScheme>): ColorScheme {
    const custom: ColorScheme = {
        ...baseScheme,
        ...overrides,
        id: `custom-${Date.now()}`,
        name
    };

    const customs = loadCustomSchemes();
    customs.push(custom);
    saveCustomSchemes(customs);

    return custom;
}

/**
 * حذف مخطط مخصص
 */
export function deleteCustomScheme(id: string): void {
    const customs = loadCustomSchemes().filter(s => s.id !== id);
    saveCustomSchemes(customs);
}

/**
 * تحويل لون HEX إلى RGB
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

/**
 * تحويل RGB إلى HEX
 */
export function rgbToHex(r: number, g: number, b: number): string {
    return '#' + [r, g, b].map(x => {
        const hex = x.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    }).join('');
}

/**
 * تفتيح لون
 */
export function lightenColor(hex: string, percent: number): string {
    const rgb = hexToRgb(hex);
    if (!rgb) return hex;

    const factor = percent / 100;
    return rgbToHex(
        Math.min(255, Math.round(rgb.r + (255 - rgb.r) * factor)),
        Math.min(255, Math.round(rgb.g + (255 - rgb.g) * factor)),
        Math.min(255, Math.round(rgb.b + (255 - rgb.b) * factor))
    );
}

/**
 * تغميق لون
 */
export function darkenColor(hex: string, percent: number): string {
    const rgb = hexToRgb(hex);
    if (!rgb) return hex;

    const factor = 1 - (percent / 100);
    return rgbToHex(
        Math.round(rgb.r * factor),
        Math.round(rgb.g * factor),
        Math.round(rgb.b * factor)
    );
}

/**
 * إنشاء مخطط من لون أساسي واحد
 */
export function generateSchemeFromColor(primaryColor: string, name: string): ColorScheme {
    const isDark = isColorDark(primaryColor);

    return {
        id: `generated-${Date.now()}`,
        name,
        primary: primaryColor,
        primaryLight: lightenColor(primaryColor, 20),
        primaryDark: darkenColor(primaryColor, 20),
        secondary: adjustHue(primaryColor, 30),
        accent: adjustHue(primaryColor, -30),
        background: isDark ? '#0f172a' : '#f8fafc',
        surface: isDark ? '#1e293b' : '#ffffff',
        text: isDark ? '#f1f5f9' : '#1e293b',
        textSecondary: isDark ? '#94a3b8' : '#64748b',
        success: '#10b981',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6'
    };
}

/**
 * هل اللون داكن؟
 */
export function isColorDark(hex: string): boolean {
    const rgb = hexToRgb(hex);
    if (!rgb) return false;
    const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
    return luminance < 0.5;
}

/**
 * تعديل Hue
 */
function adjustHue(hex: string, degrees: number): string {
    const rgb = hexToRgb(hex);
    if (!rgb) return hex;

    // Convert RGB to HSL
    const r = rgb.r / 255, g = rgb.g / 255, b = rgb.b / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
        }
    }

    // Adjust hue
    h = (h + degrees / 360) % 1;
    if (h < 0) h += 1;

    // Convert back to RGB
    function hue2rgb(p: number, q: number, t: number) {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
    }

    let r2, g2, b2;
    if (s === 0) {
        r2 = g2 = b2 = l;
    } else {
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r2 = hue2rgb(p, q, h + 1 / 3);
        g2 = hue2rgb(p, q, h);
        b2 = hue2rgb(p, q, h - 1 / 3);
    }

    return rgbToHex(Math.round(r2 * 255), Math.round(g2 * 255), Math.round(b2 * 255));
}

/**
 * تهيئة المخطط اللوني عند التحميل
 */
export function initializeColorScheme(): void {
    const scheme = getActiveScheme();
    applyColorScheme(scheme);
}

// Auto-initialize on load
if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeColorScheme);
    } else {
        initializeColorScheme();
    }
}

export default {
    COLOR_PRESETS,
    getActiveScheme,
    applyColorScheme,
    createCustomScheme,
    deleteCustomScheme,
    generateSchemeFromColor
};
