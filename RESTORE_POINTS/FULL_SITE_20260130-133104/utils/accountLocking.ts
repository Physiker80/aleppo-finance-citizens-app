// =====================================================
// 🔐 Account Locking System
// نظام قفل الحساب التلقائي
// =====================================================

export interface AccountLockConfig {
    maxFailedAttempts: number;
    lockDurationMinutes: number;
    progressiveLocking: boolean;
    notifyOnLock: boolean;
    requireAdminUnlock: boolean;
}

export interface FailedAttempt {
    timestamp: number;
    ipAddress?: string;
    userAgent?: string;
    reason: string;
}

export interface AccountLockStatus {
    userId: string;
    isLocked: boolean;
    lockedAt?: number;
    lockedUntil?: number;
    failedAttempts: FailedAttempt[];
    lockCount: number; // عدد مرات القفل
    requiresAdminUnlock: boolean;
}

const STORAGE_KEY = 'account-locks';
const CONFIG_KEY = 'account-lock-config';

const DEFAULT_CONFIG: AccountLockConfig = {
    maxFailedAttempts: 5,
    lockDurationMinutes: 30,
    progressiveLocking: true, // مضاعفة مدة القفل مع كل مرة
    notifyOnLock: true,
    requireAdminUnlock: false // بعد عدة مرات قفل
};

/**
 * تحميل إعدادات القفل
 */
export function loadConfig(): AccountLockConfig {
    try {
        const saved = localStorage.getItem(CONFIG_KEY);
        return saved ? { ...DEFAULT_CONFIG, ...JSON.parse(saved) } : DEFAULT_CONFIG;
    } catch {
        return DEFAULT_CONFIG;
    }
}

/**
 * حفظ إعدادات القفل
 */
export function saveConfig(config: Partial<AccountLockConfig>): void {
    const current = loadConfig();
    const updated = { ...current, ...config };
    localStorage.setItem(CONFIG_KEY, JSON.stringify(updated));
}

/**
 * تحميل حالات القفل
 */
function loadLockStatuses(): Record<string, AccountLockStatus> {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved) : {};
    } catch {
        return {};
    }
}

/**
 * حفظ حالات القفل
 */
function saveLockStatuses(statuses: Record<string, AccountLockStatus>): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(statuses));
}

/**
 * الحصول على حالة قفل حساب
 */
export function getAccountLockStatus(userId: string): AccountLockStatus {
    const statuses = loadLockStatuses();

    if (!statuses[userId]) {
        return {
            userId,
            isLocked: false,
            failedAttempts: [],
            lockCount: 0,
            requiresAdminUnlock: false
        };
    }

    const status = statuses[userId];

    // التحقق من انتهاء فترة القفل
    if (status.isLocked && status.lockedUntil && !status.requiresAdminUnlock) {
        if (Date.now() >= status.lockedUntil) {
            // فتح الحساب تلقائياً
            status.isLocked = false;
            status.lockedAt = undefined;
            status.lockedUntil = undefined;
            status.failedAttempts = [];
            statuses[userId] = status;
            saveLockStatuses(statuses);
        }
    }

    return status;
}

/**
 * تسجيل محاولة فاشلة
 */
export function recordFailedAttempt(
    userId: string,
    reason: string = 'كلمة مرور خاطئة',
    ipAddress?: string,
    userAgent?: string
): { locked: boolean; attemptsRemaining: number; lockedUntil?: Date } {
    const config = loadConfig();
    const statuses = loadLockStatuses();

    let status = statuses[userId] || {
        userId,
        isLocked: false,
        failedAttempts: [],
        lockCount: 0,
        requiresAdminUnlock: false
    };

    // إذا كان الحساب مقفلاً بالفعل
    if (status.isLocked) {
        return {
            locked: true,
            attemptsRemaining: 0,
            lockedUntil: status.lockedUntil ? new Date(status.lockedUntil) : undefined
        };
    }

    // تنظيف المحاولات القديمة (أكثر من 24 ساعة)
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    status.failedAttempts = status.failedAttempts.filter(a => a.timestamp >= dayAgo);

    // إضافة المحاولة الجديدة
    status.failedAttempts.push({
        timestamp: Date.now(),
        ipAddress,
        userAgent,
        reason
    });

    const attemptsRemaining = config.maxFailedAttempts - status.failedAttempts.length;

    // التحقق من الحاجة للقفل
    if (status.failedAttempts.length >= config.maxFailedAttempts) {
        status.isLocked = true;
        status.lockedAt = Date.now();
        status.lockCount++;

        // حساب مدة القفل
        let lockMinutes = config.lockDurationMinutes;
        if (config.progressiveLocking) {
            // مضاعفة مع كل مرة قفل (حد أقصى 24 ساعة)
            lockMinutes = Math.min(lockMinutes * Math.pow(2, status.lockCount - 1), 24 * 60);
        }

        status.lockedUntil = Date.now() + lockMinutes * 60 * 1000;

        // بعد 3 مرات قفل، يتطلب فتح من المسؤول
        if (status.lockCount >= 3 && config.requireAdminUnlock) {
            status.requiresAdminUnlock = true;
            status.lockedUntil = undefined; // لا ينتهي تلقائياً
        }

        // إشعار بالقفل
        if (config.notifyOnLock) {
            notifyAccountLocked(userId, status);
        }

        statuses[userId] = status;
        saveLockStatuses(statuses);

        return {
            locked: true,
            attemptsRemaining: 0,
            lockedUntil: status.lockedUntil ? new Date(status.lockedUntil) : undefined
        };
    }

    statuses[userId] = status;
    saveLockStatuses(statuses);

    return {
        locked: false,
        attemptsRemaining
    };
}

/**
 * تسجيل محاولة ناجحة (إعادة تعيين العداد)
 */
export function recordSuccessfulLogin(userId: string): void {
    const statuses = loadLockStatuses();

    if (statuses[userId]) {
        statuses[userId].failedAttempts = [];
        statuses[userId].isLocked = false;
        statuses[userId].lockedAt = undefined;
        statuses[userId].lockedUntil = undefined;
        saveLockStatuses(statuses);
    }
}

/**
 * قفل حساب يدوياً
 */
export function lockAccount(
    userId: string,
    reason: string,
    adminId: string,
    duration?: number // دقائق، undefined = دائم
): AccountLockStatus {
    const statuses = loadLockStatuses();

    let status = statuses[userId] || {
        userId,
        isLocked: false,
        failedAttempts: [],
        lockCount: 0,
        requiresAdminUnlock: false
    };

    status.isLocked = true;
    status.lockedAt = Date.now();
    status.lockedUntil = duration ? Date.now() + duration * 60 * 1000 : undefined;
    status.requiresAdminUnlock = !duration;
    status.lockCount++;

    status.failedAttempts.push({
        timestamp: Date.now(),
        reason: `قفل يدوي بواسطة ${adminId}: ${reason}`
    });

    statuses[userId] = status;
    saveLockStatuses(statuses);

    // تسجيل في سجل التدقيق
    try {
        const auditLog = require('./auditLog');
        auditLog.addAuditLog({
            action: 'ACCOUNT_LOCKED',
            userId: adminId,
            userName: adminId,
            resourceType: 'account',
            resourceId: userId,
            description: `قفل حساب ${userId}: ${reason}`,
            details: { reason, duration, permanent: !duration }
        });
    } catch { }

    return status;
}

/**
 * فتح حساب
 */
export function unlockAccount(userId: string, adminId?: string): boolean {
    const statuses = loadLockStatuses();

    if (!statuses[userId]) {
        return false;
    }

    statuses[userId].isLocked = false;
    statuses[userId].lockedAt = undefined;
    statuses[userId].lockedUntil = undefined;
    statuses[userId].requiresAdminUnlock = false;
    statuses[userId].failedAttempts = [];

    saveLockStatuses(statuses);

    // تسجيل في سجل التدقيق
    if (adminId) {
        try {
            const auditLog = require('./auditLog');
            auditLog.addAuditLog({
                action: 'ACCOUNT_UNLOCKED',
                userId: adminId,
                userName: adminId,
                resourceType: 'account',
                resourceId: userId,
                description: `فتح حساب ${userId}`
            });
        } catch { }
    }

    return true;
}

/**
 * الحصول على جميع الحسابات المقفلة
 */
export function getLockedAccounts(): AccountLockStatus[] {
    const statuses = loadLockStatuses();

    return Object.values(statuses)
        .filter(s => s.isLocked)
        .map(s => getAccountLockStatus(s.userId)) // تحديث الحالة
        .filter(s => s.isLocked);
}

/**
 * الحصول على الوقت المتبقي للقفل
 */
export function getRemainingLockTime(userId: string): {
    locked: boolean;
    remainingMinutes?: number;
    requiresAdmin: boolean;
} {
    const status = getAccountLockStatus(userId);

    if (!status.isLocked) {
        return { locked: false, requiresAdmin: false };
    }

    if (status.requiresAdminUnlock || !status.lockedUntil) {
        return { locked: true, requiresAdmin: true };
    }

    const remaining = status.lockedUntil - Date.now();
    if (remaining <= 0) {
        return { locked: false, requiresAdmin: false };
    }

    return {
        locked: true,
        remainingMinutes: Math.ceil(remaining / 60000),
        requiresAdmin: false
    };
}

/**
 * تنسيق الوقت المتبقي
 */
export function formatRemainingTime(minutes: number): string {
    if (minutes < 60) {
        return `${minutes} دقيقة`;
    }

    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (mins === 0) {
        return `${hours} ساعة`;
    }

    return `${hours} ساعة و ${mins} دقيقة`;
}

/**
 * إشعار بقفل الحساب
 */
function notifyAccountLocked(userId: string, status: AccountLockStatus): void {
    console.warn(`[SECURITY] Account locked: ${userId}`, {
        lockCount: status.lockCount,
        lockedUntil: status.lockedUntil ? new Date(status.lockedUntil).toISOString() : 'permanent',
        requiresAdmin: status.requiresAdminUnlock,
        failedAttempts: status.failedAttempts.length
    });

    // يمكن إضافة إشعار للمسؤولين هنا
}

/**
 * التحقق من إمكانية تسجيل الدخول
 */
export function canAttemptLogin(userId: string): {
    allowed: boolean;
    reason?: string;
    remainingMinutes?: number;
    attemptsRemaining?: number;
} {
    const status = getAccountLockStatus(userId);

    if (!status.isLocked) {
        const config = loadConfig();
        const attemptsRemaining = config.maxFailedAttempts - status.failedAttempts.length;

        return {
            allowed: true,
            attemptsRemaining
        };
    }

    if (status.requiresAdminUnlock) {
        return {
            allowed: false,
            reason: 'الحساب مقفل ويتطلب تدخل المسؤول'
        };
    }

    if (status.lockedUntil) {
        const remaining = status.lockedUntil - Date.now();
        if (remaining > 0) {
            return {
                allowed: false,
                reason: `الحساب مقفل مؤقتاً`,
                remainingMinutes: Math.ceil(remaining / 60000)
            };
        }
    }

    return { allowed: true };
}

/**
 * تنظيف السجلات القديمة
 */
export function cleanupOldLockRecords(): void {
    const statuses = loadLockStatuses();
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    let modified = false;

    Object.keys(statuses).forEach(userId => {
        const status = statuses[userId];

        // حذف الحسابات غير المقفلة التي ليس لديها محاولات فاشلة حديثة
        if (!status.isLocked && status.failedAttempts.length === 0) {
            if (!status.lockedAt || status.lockedAt < weekAgo) {
                delete statuses[userId];
                modified = true;
            }
        }

        // تنظيف المحاولات القديمة
        const oldLength = status.failedAttempts.length;
        status.failedAttempts = status.failedAttempts.filter(a => a.timestamp >= weekAgo);
        if (status.failedAttempts.length !== oldLength) {
            modified = true;
        }
    });

    if (modified) {
        saveLockStatuses(statuses);
    }
}

export default {
    loadConfig,
    saveConfig,
    getAccountLockStatus,
    recordFailedAttempt,
    recordSuccessfulLogin,
    lockAccount,
    unlockAccount,
    getLockedAccounts,
    getRemainingLockTime,
    formatRemainingTime,
    canAttemptLogin,
    cleanupOldLockRecords
};
