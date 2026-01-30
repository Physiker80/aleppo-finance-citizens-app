/**
 * نظام التحقق الثنائي (2FA)
 * مصادقة إضافية بكلمة مرور لمرة واحدة
 */

import React, { useState, useEffect, useRef } from 'react';

// ==================== أنواع النظام ====================
export interface TwoFactorSettings {
    enabled: boolean;
    secret?: string;
    backupCodes?: string[];
    lastVerified?: string;
    method: 'totp' | 'email' | 'sms';
}

export interface VerificationResult {
    success: boolean;
    message: string;
    remainingAttempts?: number;
}

// ==================== توليد الأكواد ====================

/**
 * توليد كود عشوائي
 */
export const generateCode = (length: number = 6): string => {
    const digits = '0123456789';
    let code = '';
    for (let i = 0; i < length; i++) {
        code += digits[Math.floor(Math.random() * digits.length)];
    }
    return code;
};

/**
 * توليد مفتاح سري
 */
export const generateSecret = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let secret = '';
    for (let i = 0; i < 32; i++) {
        secret += chars[Math.floor(Math.random() * chars.length)];
    }
    return secret;
};

/**
 * توليد أكواد احتياطية
 */
export const generateBackupCodes = (count: number = 10): string[] => {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
        const code = `${generateCode(4)}-${generateCode(4)}`;
        codes.push(code);
    }
    return codes;
};

/**
 * توليد كود TOTP (محاكاة - في الواقع يحتاج مكتبة متخصصة)
 */
export const generateTOTP = (secret: string): string => {
    // محاكاة بسيطة - في التطبيق الحقيقي استخدم مكتبة TOTP
    const timeSlice = Math.floor(Date.now() / 30000);
    const hash = simpleHash(secret + timeSlice);
    return String(hash).slice(-6).padStart(6, '0');
};

const simpleHash = (str: string): number => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash);
};

// ==================== إدارة 2FA ====================

const STORAGE_KEY = '2fa_settings';
const ATTEMPTS_KEY = '2fa_attempts';
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 دقيقة

/**
 * الحصول على إعدادات 2FA للمستخدم
 */
export const get2FASettings = (userId: string): TwoFactorSettings | null => {
    try {
        const allSettings = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        return allSettings[userId] || null;
    } catch {
        return null;
    }
};

/**
 * حفظ إعدادات 2FA
 */
export const save2FASettings = (userId: string, settings: TwoFactorSettings): void => {
    try {
        const allSettings = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        allSettings[userId] = settings;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(allSettings));
    } catch (error) {
        console.error('Error saving 2FA settings:', error);
    }
};

/**
 * تفعيل 2FA للمستخدم
 */
export const enable2FA = (userId: string, method: 'totp' | 'email' | 'sms' = 'totp'): {
    secret: string;
    backupCodes: string[];
    qrCodeUrl?: string;
} => {
    const secret = generateSecret();
    const backupCodes = generateBackupCodes();

    const settings: TwoFactorSettings = {
        enabled: true,
        secret,
        backupCodes,
        method,
        lastVerified: new Date().toISOString()
    };

    save2FASettings(userId, settings);

    // في التطبيق الحقيقي، هنا يتم توليد QR Code للتطبيقات المصادقة
    const qrCodeUrl = `otpauth://totp/SyrianFinance:${userId}?secret=${secret}&issuer=SyrianFinance`;

    return { secret, backupCodes, qrCodeUrl };
};

/**
 * إلغاء تفعيل 2FA
 */
export const disable2FA = (userId: string): void => {
    const settings: TwoFactorSettings = {
        enabled: false,
        method: 'totp'
    };
    save2FASettings(userId, settings);
};

/**
 * التحقق من محاولات الدخول
 */
const getAttempts = (userId: string): { count: number; lockedUntil?: number } => {
    try {
        const attempts = JSON.parse(localStorage.getItem(ATTEMPTS_KEY) || '{}');
        return attempts[userId] || { count: 0 };
    } catch {
        return { count: 0 };
    }
};

const setAttempts = (userId: string, count: number, lockedUntil?: number): void => {
    try {
        const attempts = JSON.parse(localStorage.getItem(ATTEMPTS_KEY) || '{}');
        attempts[userId] = { count, lockedUntil };
        localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(attempts));
    } catch (error) {
        console.error('Error saving attempts:', error);
    }
};

/**
 * التحقق من الكود
 */
export const verify2FA = (userId: string, code: string): VerificationResult => {
    const settings = get2FASettings(userId);

    if (!settings?.enabled) {
        return { success: true, message: 'التحقق الثنائي غير مفعل' };
    }

    // التحقق من القفل
    const attempts = getAttempts(userId);
    if (attempts.lockedUntil && Date.now() < attempts.lockedUntil) {
        const remainingMinutes = Math.ceil((attempts.lockedUntil - Date.now()) / 60000);
        return {
            success: false,
            message: `الحساب مقفل. حاول مرة أخرى بعد ${remainingMinutes} دقيقة`
        };
    }

    // التحقق من الكود الاحتياطي
    const normalizedCode = code.replace(/\s|-/g, '').toUpperCase();
    const backupIndex = settings.backupCodes?.findIndex(bc =>
        bc.replace(/-/g, '') === normalizedCode
    );

    if (backupIndex !== undefined && backupIndex >= 0) {
        // استخدام الكود الاحتياطي (يُستخدم مرة واحدة)
        const newBackupCodes = [...(settings.backupCodes || [])];
        newBackupCodes.splice(backupIndex, 1);
        save2FASettings(userId, { ...settings, backupCodes: newBackupCodes });
        setAttempts(userId, 0);
        return { success: true, message: 'تم التحقق بالكود الاحتياطي' };
    }

    // التحقق من كود TOTP
    const expectedCode = generateTOTP(settings.secret || '');
    if (code === expectedCode) {
        save2FASettings(userId, { ...settings, lastVerified: new Date().toISOString() });
        setAttempts(userId, 0);
        return { success: true, message: 'تم التحقق بنجاح' };
    }

    // فشل التحقق
    const newCount = attempts.count + 1;
    if (newCount >= MAX_ATTEMPTS) {
        setAttempts(userId, newCount, Date.now() + LOCKOUT_DURATION);
        return {
            success: false,
            message: `تم تجاوز عدد المحاولات. الحساب مقفل لمدة 15 دقيقة`,
            remainingAttempts: 0
        };
    }

    setAttempts(userId, newCount);
    return {
        success: false,
        message: 'كود التحقق غير صحيح',
        remainingAttempts: MAX_ATTEMPTS - newCount
    };
};

/**
 * إرسال كود التحقق (محاكاة)
 */
export const sendVerificationCode = async (
    userId: string,
    method: 'email' | 'sms',
    destination: string
): Promise<{ success: boolean; code: string }> => {
    const code = generateCode();

    // في التطبيق الحقيقي، هنا يتم إرسال الكود عبر البريد أو SMS
    console.log(`Sending ${method} to ${destination}: ${code}`);

    // حفظ الكود مؤقتاً (يجب أن يكون في السيرفر في التطبيق الحقيقي)
    localStorage.setItem(`temp_2fa_${userId}`, JSON.stringify({
        code,
        expires: Date.now() + 5 * 60 * 1000 // 5 دقائق
    }));

    return { success: true, code };
};

// ==================== مكونات React ====================

interface TwoFactorInputProps {
    length?: number;
    onComplete: (code: string) => void;
    disabled?: boolean;
}

export const TwoFactorInput: React.FC<TwoFactorInputProps> = ({
    length = 6,
    onComplete,
    disabled = false
}) => {
    const [values, setValues] = useState<string[]>(Array(length).fill(''));
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    const handleChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return;

        const newValues = [...values];
        newValues[index] = value.slice(-1);
        setValues(newValues);

        // الانتقال للحقل التالي
        if (value && index < length - 1) {
            inputRefs.current[index + 1]?.focus();
        }

        // التحقق من اكتمال الكود
        const code = newValues.join('');
        if (code.length === length && !newValues.includes('')) {
            onComplete(code);
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Backspace' && !values[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
        const newValues = [...values];

        for (let i = 0; i < pastedData.length; i++) {
            newValues[i] = pastedData[i];
        }

        setValues(newValues);

        if (pastedData.length === length) {
            onComplete(pastedData);
        } else {
            inputRefs.current[pastedData.length]?.focus();
        }
    };

    return (
        <div className="flex gap-2 justify-center" dir="ltr">
            {values.map((value, index) => (
                <input
                    key={index}
                    ref={el => inputRefs.current[index] = el}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={value}
                    disabled={disabled}
                    onChange={e => handleChange(index, e.target.value)}
                    onKeyDown={e => handleKeyDown(index, e)}
                    onPaste={handlePaste}
                    className="w-10 h-12 text-center text-xl font-bold border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white disabled:opacity-50"
                />
            ))}
        </div>
    );
};

// ==================== مكون إعداد 2FA ====================
export const Setup2FA: React.FC<{ userId: string; onSetupComplete: () => void }> = ({ userId, onSetupComplete }) => {
    const [step, setStep] = useState<'intro' | 'qr' | 'verify'>('intro');
    const [secret, setSecret] = useState('');
    const [qrUrl, setQrUrl] = useState('');
    const [backupCodes, setBackupCodes] = useState<string[]>([]);
    const [error, setError] = useState('');

    const startSetup = () => {
        const { secret, qrCodeUrl, backupCodes } = enable2FA(userId);
        setSecret(secret);
        setQrUrl(qrCodeUrl || '');
        setBackupCodes(backupCodes);
        setStep('qr');
    };

    const handleVerify = (code: string) => {
        const result = verify2FA(userId, code);
        if (result.success) {
            onSetupComplete();
        } else {
            setError(result.message);
        }
    };

    if (step === 'intro') {
        return (
            <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                <h3 className="text-lg font-bold mb-2 dark:text-white">تفعيل التحقق الثنائي</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                    قم بحماية حسابك بإضافة طبقة أمان إضافية. ستحتاج إلى تطبيق مثل Google Authenticator.
                </p>
                <button
                    onClick={startSetup}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full"
                >
                    البدء
                </button>
            </div>
        );
    }

    return (
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            <h3 className="text-lg font-bold mb-4 dark:text-white">
                {step === 'qr' ? 'امسح الرمز المربع' : 'أدخل كود التحقق'}
            </h3>

            {step === 'qr' && (
                <div className="space-y-4">
                    <div className="flex justify-center p-4 bg-white rounded border">
                        {/* في التطبيق الحقيقي استخدم مكتبة QR Code هنا */}
                        <div className="text-center">
                            <p className="font-mono bg-gray-100 p-2 rounded mb-2">{secret}</p>
                            <p className="text-sm text-gray-500">أدخل هذا المفتاح في تطبيق المصادقة إذا لم يعمل الرمز المربع</p>
                        </div>
                    </div>

                    <div className="bg-yellow-50 p-3 rounded text-sm text-yellow-800 border border-yellow-200">
                        <strong>احتفظ بالأكواد الاحتياطية:</strong>
                        <div className="grid grid-cols-2 gap-2 mt-2 font-mono">
                            {backupCodes.slice(0, 4).map(code => (
                                <span key={code}>{code}</span>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={() => setStep('verify')}
                        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full"
                    >
                        التالي
                    </button>
                </div>
            )}

            {step === 'verify' && (
                <div className="space-y-4">
                    <TwoFactorInput onComplete={handleVerify} />
                    {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                </div>
            )}
        </div>
    );
};
