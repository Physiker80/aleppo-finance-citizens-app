// =====================================================
// ⏱️ Session Timeout Manager
// إدارة انتهاء الجلسة التلقائي للأمان
// =====================================================

import { auditLogger } from './auditLogger';

export interface SessionTimeoutConfig {
    /** وقت الخمول قبل التحذير (بالدقائق) */
    warningTime: number;
    /** وقت الخمول قبل تسجيل الخروج (بالدقائق) */
    logoutTime: number;
    /** وقت التحذير قبل تسجيل الخروج (بالثواني) */
    warningDuration: number;
    /** تفعيل/تعطيل */
    enabled: boolean;
}

export interface SessionTimeoutCallbacks {
    onWarning?: (remainingSeconds: number) => void;
    onLogout?: () => void;
    onActivity?: () => void;
}

const DEFAULT_CONFIG: SessionTimeoutConfig = {
    warningTime: 25, // تحذير بعد 25 دقيقة
    logoutTime: 30,  // خروج بعد 30 دقيقة
    warningDuration: 300, // 5 دقائق للتحذير
    enabled: true
};

class SessionTimeoutManager {
    private config: SessionTimeoutConfig;
    private callbacks: SessionTimeoutCallbacks = {};
    private warningTimer: ReturnType<typeof setTimeout> | null = null;
    private logoutTimer: ReturnType<typeof setTimeout> | null = null;
    private countdownInterval: ReturnType<typeof setInterval> | null = null;
    private lastActivity: number = Date.now();
    private isWarningShown: boolean = false;
    private activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];

    constructor(config: Partial<SessionTimeoutConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.handleActivity = this.handleActivity.bind(this);
    }

    /**
     * بدء مراقبة الجلسة
     */
    start(callbacks: SessionTimeoutCallbacks = {}): void {
        if (!this.config.enabled) return;

        this.callbacks = callbacks;
        this.lastActivity = Date.now();
        this.isWarningShown = false;

        // إضافة مستمعي الأحداث
        this.activityEvents.forEach(event => {
            document.addEventListener(event, this.handleActivity, { passive: true });
        });

        // بدء المؤقتات
        this.resetTimers();

        console.log('[SessionTimeout] Started monitoring session');
    }

    /**
     * إيقاف مراقبة الجلسة
     */
    stop(): void {
        // إزالة مستمعي الأحداث
        this.activityEvents.forEach(event => {
            document.removeEventListener(event, this.handleActivity);
        });

        // إلغاء المؤقتات
        this.clearTimers();

        console.log('[SessionTimeout] Stopped monitoring session');
    }

    /**
     * تحديث الإعدادات
     */
    updateConfig(config: Partial<SessionTimeoutConfig>): void {
        this.config = { ...this.config, ...config };

        if (this.config.enabled) {
            this.resetTimers();
        } else {
            this.stop();
        }
    }

    /**
     * التعامل مع نشاط المستخدم
     */
    private handleActivity(): void {
        const now = Date.now();

        // تجاهل النشاط المتكرر بسرعة (أقل من 1 ثانية)
        if (now - this.lastActivity < 1000) return;

        this.lastActivity = now;

        // إذا كان التحذير ظاهراً، أخفه
        if (this.isWarningShown) {
            this.isWarningShown = false;
            this.callbacks.onActivity?.();
        }

        // إعادة تعيين المؤقتات
        this.resetTimers();
    }

    /**
     * إعادة تعيين المؤقتات
     */
    private resetTimers(): void {
        this.clearTimers();

        const warningMs = this.config.warningTime * 60 * 1000;
        const logoutMs = this.config.logoutTime * 60 * 1000;

        // مؤقت التحذير
        this.warningTimer = setTimeout(() => {
            this.showWarning();
        }, warningMs);

        // مؤقت تسجيل الخروج
        this.logoutTimer = setTimeout(() => {
            this.performLogout();
        }, logoutMs);
    }

    /**
     * مسح المؤقتات
     */
    private clearTimers(): void {
        if (this.warningTimer) {
            clearTimeout(this.warningTimer);
            this.warningTimer = null;
        }
        if (this.logoutTimer) {
            clearTimeout(this.logoutTimer);
            this.logoutTimer = null;
        }
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
        }
    }

    /**
     * إظهار التحذير
     */
    private showWarning(): void {
        this.isWarningShown = true;

        let remainingSeconds = this.config.warningDuration;

        // إرسال التحذير الأول
        this.callbacks.onWarning?.(remainingSeconds);

        // عد تنازلي
        this.countdownInterval = setInterval(() => {
            remainingSeconds--;

            if (remainingSeconds > 0) {
                this.callbacks.onWarning?.(remainingSeconds);
            }
        }, 1000);

        console.log('[SessionTimeout] Warning shown - logout in', this.config.warningDuration, 'seconds');
    }

    /**
     * تنفيذ تسجيل الخروج
     */
    private performLogout(): void {
        this.clearTimers();

        // تسجيل في سجل التدقيق
        auditLogger.log({
            action: 'SESSION_TIMEOUT',
            resourceType: 'Session',
            resourceId: 'current',
            details: {
                reason: 'inactivity',
                lastActivity: new Date(this.lastActivity).toISOString(),
                timeoutMinutes: this.config.logoutTime
            },
            outcome: 'success'
        });

        console.log('[SessionTimeout] Session expired due to inactivity');

        this.callbacks.onLogout?.();
    }

    /**
     * تمديد الجلسة يدوياً
     */
    extend(): void {
        this.lastActivity = Date.now();
        this.isWarningShown = false;
        this.resetTimers();

        console.log('[SessionTimeout] Session extended manually');
    }

    /**
     * الحصول على الوقت المتبقي
     */
    getRemainingTime(): number {
        const elapsed = Date.now() - this.lastActivity;
        const totalMs = this.config.logoutTime * 60 * 1000;
        return Math.max(0, totalMs - elapsed);
    }

    /**
     * التحقق من حالة التحذير
     */
    isWarning(): boolean {
        return this.isWarningShown;
    }

    /**
     * الحصول على الإعدادات الحالية
     */
    getConfig(): SessionTimeoutConfig {
        return { ...this.config };
    }
}

// Export singleton
export const sessionTimeout = new SessionTimeoutManager();

export default sessionTimeout;
