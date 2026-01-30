// =====================================================
// 🌙 Auto Theme Manager
// التبديل التلقائي للوضع الليلي/النهاري
// =====================================================

export interface ThemeSchedule {
    lightStart: string; // e.g., "06:00"
    darkStart: string;  // e.g., "18:00"
}

const DEFAULT_SCHEDULE: ThemeSchedule = {
    lightStart: '06:00',
    darkStart: '18:00'
};

/**
 * الحصول على جدول الوضع من localStorage
 */
export function getThemeSchedule(): ThemeSchedule {
    try {
        const stored = localStorage.getItem('themeSchedule');
        if (stored) {
            return JSON.parse(stored);
        }
    } catch { }
    return DEFAULT_SCHEDULE;
}

/**
 * حفظ جدول الوضع
 */
export function setThemeSchedule(schedule: ThemeSchedule): void {
    localStorage.setItem('themeSchedule', JSON.stringify(schedule));
}

/**
 * تحويل وقت نصي إلى دقائق منذ منتصف الليل
 */
function timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
}

/**
 * الحصول على الدقائق الحالية منذ منتصف الليل
 */
function getCurrentMinutes(): number {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
}

/**
 * تحديد الوضع المناسب حسب الوقت
 */
export function getThemeByTime(schedule?: ThemeSchedule): 'light' | 'dark' {
    const s = schedule || getThemeSchedule();
    const currentMinutes = getCurrentMinutes();
    const lightMinutes = timeToMinutes(s.lightStart);
    const darkMinutes = timeToMinutes(s.darkStart);

    // إذا كان الوقت بين بداية الوضع النهاري وبداية الوضع الليلي
    if (currentMinutes >= lightMinutes && currentMinutes < darkMinutes) {
        return 'light';
    }
    return 'dark';
}

/**
 * التحقق مما إذا كان الوضع التلقائي مفعلاً
 */
export function isAutoThemeEnabled(): boolean {
    return localStorage.getItem('autoTheme') === 'true';
}

/**
 * تفعيل/إلغاء الوضع التلقائي
 */
export function setAutoThemeEnabled(enabled: boolean): void {
    localStorage.setItem('autoTheme', enabled ? 'true' : 'false');
}

/**
 * الحصول على الوضع التالي ووقت التبديل
 */
export function getNextThemeChange(schedule?: ThemeSchedule): { theme: 'light' | 'dark'; minutesUntil: number } {
    const s = schedule || getThemeSchedule();
    const currentMinutes = getCurrentMinutes();
    const lightMinutes = timeToMinutes(s.lightStart);
    const darkMinutes = timeToMinutes(s.darkStart);

    const currentTheme = getThemeByTime(s);

    if (currentTheme === 'light') {
        // التبديل القادم إلى الوضع الليلي
        return {
            theme: 'dark',
            minutesUntil: darkMinutes - currentMinutes
        };
    } else {
        // التبديل القادم إلى الوضع النهاري
        let minutesUntil = lightMinutes - currentMinutes;
        if (minutesUntil < 0) {
            minutesUntil += 24 * 60; // أضف يوم كامل
        }
        return {
            theme: 'light',
            minutesUntil
        };
    }
}

/**
 * مراقب الوضع التلقائي
 */
export class AutoThemeWatcher {
    private intervalId: number | null = null;
    private onThemeChange: (theme: 'light' | 'dark') => void;
    private lastTheme: 'light' | 'dark' | null = null;

    constructor(onThemeChange: (theme: 'light' | 'dark') => void) {
        this.onThemeChange = onThemeChange;
    }

    start(): void {
        if (this.intervalId) return;

        // تحقق كل دقيقة
        this.intervalId = window.setInterval(() => {
            if (!isAutoThemeEnabled()) return;

            const newTheme = getThemeByTime();
            if (this.lastTheme !== newTheme) {
                this.lastTheme = newTheme;
                this.onThemeChange(newTheme);
            }
        }, 60000); // كل دقيقة

        // تحقق فوري
        if (isAutoThemeEnabled()) {
            const theme = getThemeByTime();
            this.lastTheme = theme;
            this.onThemeChange(theme);
        }
    }

    stop(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    /**
     * تفعيل الوضع التلقائي
     */
    enable(): void {
        setAutoThemeEnabled(true);
        const theme = getThemeByTime();
        this.lastTheme = theme;
        this.onThemeChange(theme);
    }

    /**
     * إلغاء الوضع التلقائي
     */
    disable(): void {
        setAutoThemeEnabled(false);
    }
}

/**
 * استخدام تفضيل النظام
 */
export function getSystemTheme(): 'light' | 'dark' {
    if (typeof window !== 'undefined' && window.matchMedia) {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
}

/**
 * مراقبة تغييرات تفضيل النظام
 */
export function watchSystemTheme(callback: (theme: 'light' | 'dark') => void): () => void {
    if (typeof window === 'undefined' || !window.matchMedia) {
        return () => { };
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
        callback(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
}

export default {
    getThemeSchedule,
    setThemeSchedule,
    getThemeByTime,
    isAutoThemeEnabled,
    setAutoThemeEnabled,
    getNextThemeChange,
    getSystemTheme,
    watchSystemTheme,
    AutoThemeWatcher
};
