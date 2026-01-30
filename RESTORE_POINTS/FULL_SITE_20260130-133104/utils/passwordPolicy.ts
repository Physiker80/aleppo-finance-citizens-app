// =====================================================
// 🔑 Password Policy System
// نظام سياسة كلمات المرور
// =====================================================

export interface PasswordPolicy {
    minLength: number;
    maxLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
    minSpecialChars: number;
    minNumbers: number;
    preventCommonPasswords: boolean;
    preventUserInfo: boolean; // منع استخدام اسم المستخدم في كلمة المرور
    expirationDays: number; // 0 = لا تنتهي
    preventReuse: number; // عدد كلمات المرور السابقة التي لا يمكن إعادة استخدامها
    minAgeDays: number; // الحد الأدنى لعمر كلمة المرور قبل تغييرها
}

export interface PasswordValidationResult {
    valid: boolean;
    score: number; // 0-100
    strength: 'weak' | 'fair' | 'good' | 'strong' | 'excellent';
    errors: string[];
    suggestions: string[];
}

export interface PasswordHistory {
    userId: string;
    hashes: string[];
    lastChanged: number;
}

const POLICY_KEY = 'password-policy';
const HISTORY_KEY = 'password-history';

// كلمات المرور الشائعة (عينة صغيرة)
const COMMON_PASSWORDS = [
    '123456', 'password', '12345678', 'qwerty', '123456789',
    'admin', 'admin123', 'password123', 'letmein', 'welcome',
    '1234567890', 'abc123', '111111', 'test', 'test123',
    'iloveyou', 'sunshine', 'princess', 'master', 'monkey',
    'كلمة المرور', 'باسورد', '١٢٣٤٥٦', 'ادمن', 'مدير'
];

const DEFAULT_POLICY: PasswordPolicy = {
    minLength: 8,
    maxLength: 128,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    minSpecialChars: 1,
    minNumbers: 1,
    preventCommonPasswords: true,
    preventUserInfo: true,
    expirationDays: 90,
    preventReuse: 5,
    minAgeDays: 1
};

/**
 * تحميل سياسة كلمات المرور
 */
export function loadPolicy(): PasswordPolicy {
    try {
        const saved = localStorage.getItem(POLICY_KEY);
        return saved ? { ...DEFAULT_POLICY, ...JSON.parse(saved) } : DEFAULT_POLICY;
    } catch {
        return DEFAULT_POLICY;
    }
}

/**
 * حفظ سياسة كلمات المرور
 */
export function savePolicy(policy: Partial<PasswordPolicy>): void {
    const current = loadPolicy();
    const updated = { ...current, ...policy };
    localStorage.setItem(POLICY_KEY, JSON.stringify(updated));
}

/**
 * التحقق من كلمة المرور
 */
export function validatePassword(
    password: string,
    username?: string,
    email?: string
): PasswordValidationResult {
    const policy = loadPolicy();
    const errors: string[] = [];
    const suggestions: string[] = [];
    let score = 0;

    // فحص الطول
    if (password.length < policy.minLength) {
        errors.push(`كلمة المرور يجب أن تكون ${policy.minLength} أحرف على الأقل`);
    } else {
        score += 20;
    }

    if (password.length > policy.maxLength) {
        errors.push(`كلمة المرور يجب ألا تتجاوز ${policy.maxLength} حرف`);
    }

    // فحص الأحرف الكبيرة
    const uppercaseCount = (password.match(/[A-Z]/g) || []).length;
    if (policy.requireUppercase && uppercaseCount === 0) {
        errors.push('يجب أن تحتوي على حرف كبير واحد على الأقل');
    } else if (uppercaseCount > 0) {
        score += 10;
    }

    // فحص الأحرف الصغيرة
    const lowercaseCount = (password.match(/[a-z]/g) || []).length;
    if (policy.requireLowercase && lowercaseCount === 0) {
        errors.push('يجب أن تحتوي على حرف صغير واحد على الأقل');
    } else if (lowercaseCount > 0) {
        score += 10;
    }

    // فحص الأرقام
    const numberCount = (password.match(/[0-9]/g) || []).length;
    if (policy.requireNumbers && numberCount < policy.minNumbers) {
        errors.push(`يجب أن تحتوي على ${policy.minNumbers} رقم على الأقل`);
    } else if (numberCount > 0) {
        score += 15;
    }

    // فحص الرموز الخاصة
    const specialChars = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/g;
    const specialCount = (password.match(specialChars) || []).length;
    if (policy.requireSpecialChars && specialCount < policy.minSpecialChars) {
        errors.push(`يجب أن تحتوي على ${policy.minSpecialChars} رمز خاص على الأقل (!@#$%^&*)`);
    } else if (specialCount > 0) {
        score += 15;
    }

    // فحص كلمات المرور الشائعة
    if (policy.preventCommonPasswords) {
        const lowerPassword = password.toLowerCase();
        if (COMMON_PASSWORDS.some(common => lowerPassword.includes(common))) {
            errors.push('كلمة المرور شائعة جداً وسهلة التخمين');
            score -= 20;
        }
    }

    // فحص معلومات المستخدم
    if (policy.preventUserInfo) {
        const lowerPassword = password.toLowerCase();

        if (username && lowerPassword.includes(username.toLowerCase())) {
            errors.push('كلمة المرور لا يجب أن تحتوي على اسم المستخدم');
            score -= 10;
        }

        if (email) {
            const emailParts = email.toLowerCase().split('@');
            if (emailParts[0] && lowerPassword.includes(emailParts[0])) {
                errors.push('كلمة المرور لا يجب أن تحتوي على جزء من البريد الإلكتروني');
                score -= 10;
            }
        }
    }

    // نقاط إضافية للطول
    if (password.length >= 12) score += 10;
    if (password.length >= 16) score += 10;

    // نقاط إضافية للتنوع
    const uniqueChars = new Set(password).size;
    if (uniqueChars >= password.length * 0.8) score += 10;

    // تحديد القوة
    score = Math.min(100, Math.max(0, score));
    let strength: PasswordValidationResult['strength'];

    if (score >= 90) strength = 'excellent';
    else if (score >= 70) strength = 'strong';
    else if (score >= 50) strength = 'good';
    else if (score >= 30) strength = 'fair';
    else strength = 'weak';

    // اقتراحات
    if (password.length < 12) {
        suggestions.push('استخدم كلمة مرور أطول (12 حرف أو أكثر)');
    }

    if (uppercaseCount < 2) {
        suggestions.push('أضف المزيد من الأحرف الكبيرة');
    }

    if (specialCount < 2) {
        suggestions.push('أضف المزيد من الرموز الخاصة');
    }

    if (numberCount < 2) {
        suggestions.push('أضف المزيد من الأرقام');
    }

    if (uniqueChars < password.length * 0.5) {
        suggestions.push('استخدم أحرف أكثر تنوعاً');
    }

    return {
        valid: errors.length === 0,
        score,
        strength,
        errors,
        suggestions
    };
}

/**
 * توليد كلمة مرور قوية
 */
export function generateStrongPassword(length: number = 16): string {
    const policy = loadPolicy();

    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';

    let chars = '';
    let password = '';

    // ضمان وجود كل نوع مطلوب
    if (policy.requireUppercase) {
        password += uppercase[Math.floor(Math.random() * uppercase.length)];
        chars += uppercase;
    }

    if (policy.requireLowercase) {
        password += lowercase[Math.floor(Math.random() * lowercase.length)];
        chars += lowercase;
    }

    if (policy.requireNumbers) {
        for (let i = 0; i < policy.minNumbers; i++) {
            password += numbers[Math.floor(Math.random() * numbers.length)];
        }
        chars += numbers;
    }

    if (policy.requireSpecialChars) {
        for (let i = 0; i < policy.minSpecialChars; i++) {
            password += special[Math.floor(Math.random() * special.length)];
        }
        chars += special;
    }

    // إكمال بقية الطول
    while (password.length < length) {
        const array = new Uint8Array(1);
        crypto.getRandomValues(array);
        password += chars[array[0] % chars.length];
    }

    // خلط الأحرف
    return password.split('').sort(() => Math.random() - 0.5).join('');
}

/**
 * حساب قوة كلمة المرور بصرياً
 */
export function getPasswordStrengthInfo(strength: PasswordValidationResult['strength']): {
    label: string;
    color: string;
    percentage: number;
} {
    const info: Record<PasswordValidationResult['strength'], { label: string; color: string; percentage: number }> = {
        weak: { label: 'ضعيفة', color: '#ef4444', percentage: 20 },
        fair: { label: 'مقبولة', color: '#f97316', percentage: 40 },
        good: { label: 'جيدة', color: '#eab308', percentage: 60 },
        strong: { label: 'قوية', color: '#22c55e', percentage: 80 },
        excellent: { label: 'ممتازة', color: '#10b981', percentage: 100 }
    };

    return info[strength];
}

/**
 * تحميل سجل كلمات المرور
 */
function loadPasswordHistory(): Record<string, PasswordHistory> {
    try {
        const saved = localStorage.getItem(HISTORY_KEY);
        return saved ? JSON.parse(saved) : {};
    } catch {
        return {};
    }
}

/**
 * حفظ سجل كلمات المرور
 */
function savePasswordHistory(history: Record<string, PasswordHistory>): void {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

/**
 * التحقق من إعادة استخدام كلمة المرور
 */
export async function checkPasswordReuse(
    userId: string,
    newPasswordHash: string
): Promise<boolean> {
    const policy = loadPolicy();
    if (policy.preventReuse === 0) return false;

    const history = loadPasswordHistory();
    const userHistory = history[userId];

    if (!userHistory) return false;

    // فحص آخر N كلمات مرور
    const recentHashes = userHistory.hashes.slice(-policy.preventReuse);
    return recentHashes.includes(newPasswordHash);
}

/**
 * إضافة كلمة مرور إلى السجل
 */
export function addToPasswordHistory(userId: string, passwordHash: string): void {
    const policy = loadPolicy();
    const history = loadPasswordHistory();

    if (!history[userId]) {
        history[userId] = {
            userId,
            hashes: [],
            lastChanged: Date.now()
        };
    }

    history[userId].hashes.push(passwordHash);
    history[userId].lastChanged = Date.now();

    // الاحتفاظ بآخر N+2 كلمات مرور فقط
    if (history[userId].hashes.length > policy.preventReuse + 2) {
        history[userId].hashes = history[userId].hashes.slice(-policy.preventReuse - 2);
    }

    savePasswordHistory(history);
}

/**
 * التحقق من انتهاء كلمة المرور
 */
export function isPasswordExpired(userId: string): {
    expired: boolean;
    daysUntilExpiry?: number;
    daysSinceChange: number;
} {
    const policy = loadPolicy();
    if (policy.expirationDays === 0) {
        return { expired: false, daysSinceChange: 0 };
    }

    const history = loadPasswordHistory();
    const userHistory = history[userId];

    if (!userHistory) {
        return { expired: true, daysSinceChange: Infinity };
    }

    const daysSinceChange = Math.floor(
        (Date.now() - userHistory.lastChanged) / (24 * 60 * 60 * 1000)
    );

    const daysUntilExpiry = policy.expirationDays - daysSinceChange;

    return {
        expired: daysUntilExpiry <= 0,
        daysUntilExpiry: Math.max(0, daysUntilExpiry),
        daysSinceChange
    };
}

/**
 * التحقق من إمكانية تغيير كلمة المرور (الحد الأدنى للعمر)
 */
export function canChangePassword(userId: string): {
    allowed: boolean;
    daysRemaining?: number;
} {
    const policy = loadPolicy();
    if (policy.minAgeDays === 0) {
        return { allowed: true };
    }

    const history = loadPasswordHistory();
    const userHistory = history[userId];

    if (!userHistory) {
        return { allowed: true };
    }

    const daysSinceChange = Math.floor(
        (Date.now() - userHistory.lastChanged) / (24 * 60 * 60 * 1000)
    );

    if (daysSinceChange >= policy.minAgeDays) {
        return { allowed: true };
    }

    return {
        allowed: false,
        daysRemaining: policy.minAgeDays - daysSinceChange
    };
}

/**
 * الحصول على متطلبات كلمة المرور كنص
 */
export function getPasswordRequirements(): string[] {
    const policy = loadPolicy();
    const requirements: string[] = [];

    requirements.push(`${policy.minLength} أحرف على الأقل`);

    if (policy.requireUppercase) {
        requirements.push('حرف كبير واحد على الأقل (A-Z)');
    }

    if (policy.requireLowercase) {
        requirements.push('حرف صغير واحد على الأقل (a-z)');
    }

    if (policy.requireNumbers) {
        requirements.push(`${policy.minNumbers} رقم على الأقل (0-9)`);
    }

    if (policy.requireSpecialChars) {
        requirements.push(`${policy.minSpecialChars} رمز خاص على الأقل (!@#$%^&*)`);
    }

    if (policy.preventCommonPasswords) {
        requirements.push('لا يمكن استخدام كلمات مرور شائعة');
    }

    if (policy.preventUserInfo) {
        requirements.push('لا يمكن أن تحتوي على اسم المستخدم');
    }

    return requirements;
}

export default {
    loadPolicy,
    savePolicy,
    validatePassword,
    generateStrongPassword,
    getPasswordStrengthInfo,
    checkPasswordReuse,
    addToPasswordHistory,
    isPasswordExpired,
    canChangePassword,
    getPasswordRequirements
};
