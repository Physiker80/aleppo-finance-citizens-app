// =====================================================
// 🔐 Security Enhancements
// تحسينات الأمان الإضافية
// =====================================================

/**
 * تنظيف المدخلات من XSS
 */
export function sanitizeInput(input: string): string {
    if (typeof input !== 'string') return '';

    return input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;')
        .replace(/`/g, '&#x60;')
        .replace(/=/g, '&#x3D;');
}

/**
 * تنظيف HTML
 */
export function sanitizeHTML(html: string): string {
    const div = document.createElement('div');
    div.textContent = html;
    return div.innerHTML;
}

/**
 * التحقق من صحة البريد الإلكتروني
 */
export function isValidEmail(email: string): boolean {
    const pattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return pattern.test(email);
}

/**
 * التحقق من صحة رقم الهاتف السوري
 */
export function isValidSyrianPhone(phone: string): boolean {
    // أرقام سوريا تبدأ بـ 09 أو 00963 أو +963
    const pattern = /^(\+963|00963|0)?9\d{8}$/;
    return pattern.test(phone.replace(/\s/g, ''));
}

/**
 * التحقق من صحة الرقم الوطني السوري
 */
export function isValidNationalId(id: string): boolean {
    // الرقم الوطني السوري يتكون من 11 رقم
    const pattern = /^\d{11}$/;
    return pattern.test(id.replace(/\s/g, ''));
}

/**
 * التحقق من قوة كلمة المرور
 */
export interface PasswordStrength {
    score: number; // 0-4
    label: 'ضعيفة جداً' | 'ضعيفة' | 'متوسطة' | 'قوية' | 'قوية جداً';
    suggestions: string[];
}

export function checkPasswordStrength(password: string): PasswordStrength {
    let score = 0;
    const suggestions: string[] = [];

    // الطول
    if (password.length >= 8) score++;
    else suggestions.push('يجب أن تكون 8 أحرف على الأقل');

    if (password.length >= 12) score++;

    // أحرف كبيرة
    if (/[A-Z]/.test(password)) score++;
    else suggestions.push('أضف حرفاً كبيراً');

    // أحرف صغيرة
    if (/[a-z]/.test(password)) score++;
    else suggestions.push('أضف حرفاً صغيراً');

    // أرقام
    if (/\d/.test(password)) score++;
    else suggestions.push('أضف رقماً');

    // رموز خاصة
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;
    else suggestions.push('أضف رمزاً خاصاً');

    // تقليل النتيجة للأنماط الشائعة
    if (/^[0-9]+$/.test(password)) score = Math.max(0, score - 2);
    if (/^[a-zA-Z]+$/.test(password)) score = Math.max(0, score - 1);
    if (/(.)\1{2,}/.test(password)) score = Math.max(0, score - 1); // تكرار أحرف

    const normalizedScore = Math.min(4, Math.floor(score / 1.5));
    const labels: PasswordStrength['label'][] = ['ضعيفة جداً', 'ضعيفة', 'متوسطة', 'قوية', 'قوية جداً'];

    return {
        score: normalizedScore,
        label: labels[normalizedScore],
        suggestions
    };
}

/**
 * توليد كلمة مرور عشوائية
 */
export function generatePassword(length: number = 16): string {
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';

    const allChars = uppercase + lowercase + numbers + symbols;

    let password = '';

    // ضمان وجود حرف من كل نوع
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];

    // إكمال الباقي
    for (let i = password.length; i < length; i++) {
        password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    // خلط الحروف
    return password.split('').sort(() => Math.random() - 0.5).join('');
}

/**
 * تشفير نص بسيط (Base64 + XOR)
 */
export function simpleEncrypt(text: string, key: string): string {
    let result = '';
    for (let i = 0; i < text.length; i++) {
        result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return btoa(result);
}

/**
 * فك تشفير نص بسيط
 */
export function simpleDecrypt(encrypted: string, key: string): string {
    try {
        const decoded = atob(encrypted);
        let result = '';
        for (let i = 0; i < decoded.length; i++) {
            result += String.fromCharCode(decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length));
        }
        return result;
    } catch {
        return '';
    }
}

/**
 * إنشاء توقيع HMAC بسيط
 */
export async function createHMAC(message: string, key: string): Promise<string> {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(key);
    const messageData = encoder.encode(message);

    const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
    return Array.from(new Uint8Array(signature))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

/**
 * التحقق من HMAC
 */
export async function verifyHMAC(message: string, signature: string, key: string): Promise<boolean> {
    const expected = await createHMAC(message, key);
    return expected === signature;
}

/**
 * إنشاء رمز CSRF
 */
export function generateCSRFToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * حماية من Rate Limiting
 */
class RateLimiter {
    private attempts: Map<string, number[]> = new Map();
    private maxAttempts: number;
    private windowMs: number;

    constructor(maxAttempts: number = 5, windowMs: number = 60000) {
        this.maxAttempts = maxAttempts;
        this.windowMs = windowMs;
    }

    check(key: string): boolean {
        const now = Date.now();
        const attempts = this.attempts.get(key) || [];

        // إزالة المحاولات القديمة
        const recentAttempts = attempts.filter(time => now - time < this.windowMs);

        if (recentAttempts.length >= this.maxAttempts) {
            return false; // محظور
        }

        recentAttempts.push(now);
        this.attempts.set(key, recentAttempts);
        return true; // مسموح
    }

    getRemainingAttempts(key: string): number {
        const now = Date.now();
        const attempts = this.attempts.get(key) || [];
        const recentAttempts = attempts.filter(time => now - time < this.windowMs);
        return Math.max(0, this.maxAttempts - recentAttempts.length);
    }

    getTimeUntilReset(key: string): number {
        const attempts = this.attempts.get(key) || [];
        if (attempts.length === 0) return 0;

        const oldestAttempt = Math.min(...attempts);
        const resetTime = oldestAttempt + this.windowMs;
        return Math.max(0, resetTime - Date.now());
    }

    reset(key: string): void {
        this.attempts.delete(key);
    }
}

/**
 * تتبع محاولات تسجيل الدخول
 */
export const loginRateLimiter = new RateLimiter(5, 5 * 60 * 1000); // 5 محاولات / 5 دقائق

/**
 * تتبع طلبات API
 */
export const apiRateLimiter = new RateLimiter(100, 60 * 1000); // 100 طلب / دقيقة

/**
 * كشف الأنماط المشبوهة
 */
export function detectSuspiciousPattern(input: string): boolean {
    const suspiciousPatterns = [
        /<script/i,
        /javascript:/i,
        /on\w+\s*=/i,
        /eval\s*\(/i,
        /document\./i,
        /window\./i,
        /\bor\b.*=.*\bor\b/i, // SQL injection
        /union\s+select/i,
        /drop\s+table/i,
        /--.*$/,
        /\/\*.*\*\//
    ];

    return suspiciousPatterns.some(pattern => pattern.test(input));
}

/**
 * تسجيل أحداث الأمان
 */
export interface SecurityEvent {
    type: 'login_attempt' | 'login_success' | 'login_failure' | 'suspicious_activity' | 'rate_limit' | 'csrf_mismatch';
    timestamp: Date;
    ip?: string;
    userAgent?: string;
    userId?: string;
    details?: Record<string, unknown>;
}

class SecurityLogger {
    private events: SecurityEvent[] = [];
    private maxEvents: number = 1000;

    log(event: Omit<SecurityEvent, 'timestamp'>): void {
        const fullEvent: SecurityEvent = {
            ...event,
            timestamp: new Date(),
            userAgent: navigator.userAgent
        };

        this.events.push(fullEvent);

        // الحفاظ على الحد الأقصى
        if (this.events.length > this.maxEvents) {
            this.events = this.events.slice(-this.maxEvents);
        }

        // حفظ في localStorage
        try {
            localStorage.setItem('security_events', JSON.stringify(this.events.slice(-100)));
        } catch {
            // تجاهل أخطاء التخزين
        }

        console.log('[Security]', fullEvent.type, fullEvent.details);
    }

    getEvents(type?: SecurityEvent['type']): SecurityEvent[] {
        if (type) {
            return this.events.filter(e => e.type === type);
        }
        return [...this.events];
    }

    getRecentEvents(minutes: number = 60): SecurityEvent[] {
        const cutoff = new Date(Date.now() - minutes * 60 * 1000);
        return this.events.filter(e => e.timestamp >= cutoff);
    }

    clear(): void {
        this.events = [];
        localStorage.removeItem('security_events');
    }
}

export const securityLogger = new SecurityLogger();

/**
 * Content Security Policy helpers
 */
export function generateNonce(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array));
}

export default {
    sanitizeInput,
    sanitizeHTML,
    isValidEmail,
    isValidSyrianPhone,
    isValidNationalId,
    checkPasswordStrength,
    generatePassword,
    simpleEncrypt,
    simpleDecrypt,
    createHMAC,
    verifyHMAC,
    generateCSRFToken,
    loginRateLimiter,
    apiRateLimiter,
    detectSuspiciousPattern,
    securityLogger,
    generateNonce
};
