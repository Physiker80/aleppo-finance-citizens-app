/**
 * نظام التحقق من الهوية OTP
 * Identity Verification System
 */

import { OTPVerification } from '../types/appointment';

// ==================== ثوابت ====================
const OTP_STORAGE_KEY = 'otp_verifications';
const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 5;
const MAX_ATTEMPTS = 3;
const COOLDOWN_MINUTES = 15;

// ==================== توليد كود OTP ====================
export const generateOTP = (): string => {
    let otp = '';
    for (let i = 0; i < OTP_LENGTH; i++) {
        otp += Math.floor(Math.random() * 10);
    }
    return otp;
};

// ==================== إدارة OTP ====================

/**
 * الحصول على جميع التحققات
 */
const getStoredOTPs = (): OTPVerification[] => {
    try {
        const stored = localStorage.getItem(OTP_STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
};

/**
 * حفظ التحققات
 */
const saveOTPs = (otps: OTPVerification[]): void => {
    localStorage.setItem(OTP_STORAGE_KEY, JSON.stringify(otps));
};

/**
 * تنظيف التحققات المنتهية
 */
const cleanExpiredOTPs = (): void => {
    const otps = getStoredOTPs();
    const now = new Date().toISOString();
    const valid = otps.filter(otp => otp.expiresAt > now || !otp.isUsed);
    saveOTPs(valid);
};

/**
 * إنشاء تحقق جديد
 */
export const createOTPVerification = (
    phoneNumber: string,
    nationalId?: string
): { verification: OTPVerification; code: string } | { error: string } => {
    cleanExpiredOTPs();

    const otps = getStoredOTPs();
    const now = new Date();

    // التحقق من عدم وجود تحقق نشط لنفس الرقم
    const existingActive = otps.find(
        otp => otp.phoneNumber === phoneNumber &&
            otp.expiresAt > now.toISOString() &&
            !otp.isUsed
    );

    if (existingActive) {
        // التحقق من عدد المحاولات
        if (existingActive.attempts >= MAX_ATTEMPTS) {
            return { error: `تجاوزت الحد الأقصى للمحاولات. يرجى الانتظار ${COOLDOWN_MINUTES} دقيقة.` };
        }
        return {
            verification: existingActive,
            code: existingActive.code
        };
    }

    // إنشاء كود جديد
    const code = generateOTP();
    const expiresAt = new Date(now.getTime() + OTP_EXPIRY_MINUTES * 60 * 1000);

    const verification: OTPVerification = {
        id: `otp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        phoneNumber,
        nationalId,
        code,
        expiresAt: expiresAt.toISOString(),
        attempts: 0,
        maxAttempts: MAX_ATTEMPTS,
        isUsed: false,
        createdAt: now.toISOString()
    };

    otps.push(verification);
    saveOTPs(otps);

    return { verification, code };
};

/**
 * التحقق من كود OTP
 */
export const verifyOTP = (
    phoneNumber: string,
    code: string,
    nationalId?: string
): { success: boolean; message: string; remainingAttempts?: number } => {
    const otps = getStoredOTPs();
    const now = new Date().toISOString();

    const verification = otps.find(
        otp => otp.phoneNumber === phoneNumber &&
            !otp.isUsed &&
            otp.expiresAt > now
    );

    if (!verification) {
        return {
            success: false,
            message: 'لم يتم العثور على رمز تحقق صالح. يرجى طلب رمز جديد.'
        };
    }

    // التحقق من عدد المحاولات
    if (verification.attempts >= MAX_ATTEMPTS) {
        return {
            success: false,
            message: `تجاوزت الحد الأقصى للمحاولات. يرجى طلب رمز جديد بعد ${COOLDOWN_MINUTES} دقيقة.`,
            remainingAttempts: 0
        };
    }

    // زيادة عداد المحاولات
    verification.attempts++;

    // التحقق من الكود
    if (verification.code !== code) {
        saveOTPs(otps);
        const remaining = MAX_ATTEMPTS - verification.attempts;
        return {
            success: false,
            message: `رمز التحقق غير صحيح. المحاولات المتبقية: ${remaining}`,
            remainingAttempts: remaining
        };
    }

    // التحقق من الرقم الوطني إذا كان مطلوباً
    if (nationalId && verification.nationalId && verification.nationalId !== nationalId) {
        saveOTPs(otps);
        const remaining = MAX_ATTEMPTS - verification.attempts;
        return {
            success: false,
            message: 'الرقم الوطني غير متطابق.',
            remainingAttempts: remaining
        };
    }

    // نجاح التحقق
    verification.isUsed = true;
    saveOTPs(otps);

    return {
        success: true,
        message: 'تم التحقق بنجاح!'
    };
};

/**
 * إعادة إرسال OTP
 */
export const resendOTP = (
    phoneNumber: string
): { success: boolean; code?: string; message: string; waitSeconds?: number } => {
    const otps = getStoredOTPs();
    const now = new Date();

    // البحث عن آخر تحقق
    const lastOTP = otps
        .filter(otp => otp.phoneNumber === phoneNumber)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

    if (lastOTP) {
        const createdAt = new Date(lastOTP.createdAt);
        const secondsSinceCreated = (now.getTime() - createdAt.getTime()) / 1000;

        // منع إعادة الإرسال خلال 60 ثانية
        if (secondsSinceCreated < 60) {
            return {
                success: false,
                message: 'يرجى الانتظار قبل طلب رمز جديد.',
                waitSeconds: Math.ceil(60 - secondsSinceCreated)
            };
        }

        // إلغاء الرمز القديم
        lastOTP.isUsed = true;
    }

    // إنشاء رمز جديد
    const result = createOTPVerification(phoneNumber, lastOTP?.nationalId);

    if ('error' in result) {
        return { success: false, message: result.error };
    }

    saveOTPs(otps);

    return {
        success: true,
        code: result.code,
        message: 'تم إرسال رمز تحقق جديد.'
    };
};

// ==================== محاكاة إرسال SMS ====================

/**
 * إرسال SMS (محاكاة)
 * في الإنتاج يتم استبدال هذا بـ API حقيقي
 */
export const sendSMS = async (
    phoneNumber: string,
    message: string
): Promise<{ success: boolean; message: string }> => {
    // محاكاة تأخير الإرسال
    await new Promise(resolve => setTimeout(resolve, 500));

    // في بيئة التطوير، نطبع الرسالة في الـ console
    console.log(`📱 SMS to ${phoneNumber}:`, message);

    // تخزين الرسالة للاختبار
    const smsLog = JSON.parse(localStorage.getItem('sms_log') || '[]');
    smsLog.push({
        phoneNumber,
        message,
        sentAt: new Date().toISOString()
    });
    localStorage.setItem('sms_log', JSON.stringify(smsLog.slice(-50)));

    return { success: true, message: 'تم إرسال الرسالة بنجاح' };
};

/**
 * إرسال رمز التحقق عبر SMS
 */
export const sendOTPviaSMS = async (
    phoneNumber: string,
    code: string
): Promise<{ success: boolean; message: string }> => {
    const message = `رمز التحقق الخاص بك لحجز موعد في المديرية هو: ${code}\nصالح لمدة ${OTP_EXPIRY_MINUTES} دقائق.`;
    return sendSMS(phoneNumber, message);
};

// ==================== التحقق من الرقم الوطني ====================

/**
 * التحقق من صحة الرقم الوطني السوري
 */
export const validateNationalId = (nationalId: string): { valid: boolean; message?: string } => {
    // إزالة المسافات
    const cleaned = nationalId.replace(/\s/g, '');

    // التحقق من الطول (11 رقم للرقم الوطني السوري)
    if (cleaned.length !== 11) {
        return { valid: false, message: 'الرقم الوطني يجب أن يتكون من 11 رقماً' };
    }

    // التحقق من أنه أرقام فقط
    if (!/^\d+$/.test(cleaned)) {
        return { valid: false, message: 'الرقم الوطني يجب أن يحتوي على أرقام فقط' };
    }

    return { valid: true };
};

/**
 * التحقق من صحة رقم الهاتف السوري
 */
export const validateSyrianPhone = (phone: string): { valid: boolean; message?: string; formatted?: string } => {
    // إزالة المسافات والرموز
    let cleaned = phone.replace(/[\s\-\(\)]/g, '');

    // إزالة كود الدولة إذا وجد
    if (cleaned.startsWith('+963')) {
        cleaned = '0' + cleaned.slice(4);
    } else if (cleaned.startsWith('00963')) {
        cleaned = '0' + cleaned.slice(5);
    } else if (cleaned.startsWith('963')) {
        cleaned = '0' + cleaned.slice(3);
    }

    // التحقق من الطول
    if (cleaned.length !== 10) {
        return { valid: false, message: 'رقم الهاتف غير صحيح' };
    }

    // التحقق من أنه يبدأ بـ 09
    if (!cleaned.startsWith('09')) {
        return { valid: false, message: 'رقم الهاتف يجب أن يبدأ بـ 09' };
    }

    // التحقق من مزود الخدمة
    const prefix = cleaned.slice(0, 4);
    const validPrefixes = ['0911', '0912', '0913', '0914', '0931', '0932', '0933', '0934', '0935', '0936', '0937', '0938', '0939', '0941', '0942', '0943', '0944', '0945', '0946', '0947', '0948', '0949', '0950', '0951', '0952', '0953', '0954', '0955', '0956', '0957', '0958', '0959', '0991', '0992', '0993', '0994', '0995', '0996', '0997', '0998', '0999'];

    if (!validPrefixes.includes(prefix)) {
        return { valid: false, message: 'رقم الهاتف غير صحيح' };
    }

    return {
        valid: true,
        formatted: cleaned
    };
};

// ==================== مكون React للتحقق ====================
import React, { useState, useEffect, useRef } from 'react';

interface OTPInputProps {
    length?: number;
    onComplete: (code: string) => void;
    disabled?: boolean;
}

export const OTPInput: React.FC<OTPInputProps> = ({
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

        // التحقق من الاكتمال
        if (newValues.every(v => v) && newValues.join('').length === length) {
            onComplete(newValues.join(''));
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && !values[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').slice(0, length);
        if (/^\d+$/.test(pastedData)) {
            const newValues = pastedData.split('').concat(Array(length).fill('')).slice(0, length);
            setValues(newValues);
            if (newValues.every(v => v)) {
                onComplete(newValues.join(''));
            }
        }
    };

    return (
        <div className="flex gap-2 justify-center" dir="ltr">
            {values.map((value, index) => (
                <input
                    key={index}
                    ref={(el) => { inputRefs.current[index] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={value}
                    onChange={(e) => handleChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={handlePaste}
                    disabled={disabled}
                    className={`w-12 h-14 text-center text-2xl font-bold border-2 rounded-xl 
                        ${disabled ? 'bg-gray-100 text-gray-400' : 'bg-white dark:bg-gray-800'}
                        ${value ? 'border-blue-500' : 'border-gray-300 dark:border-gray-600'}
                        focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none
                        transition-all`}
                />
            ))}
        </div>
    );
};

interface PhoneVerificationProps {
    onVerified: (phoneNumber: string) => void;
    nationalId?: string;
}

export const PhoneVerification: React.FC<PhoneVerificationProps> = ({
    onVerified,
    nationalId
}) => {
    const [step, setStep] = useState<'phone' | 'otp'>('phone');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [phoneError, setPhoneError] = useState('');
    const [otpError, setOtpError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const [sentCode, setSentCode] = useState<string | null>(null);

    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

    const handleSendOTP = async () => {
        setPhoneError('');

        // التحقق من الرقم
        const validation = validateSyrianPhone(phoneNumber);
        if (!validation.valid) {
            setPhoneError(validation.message || 'رقم غير صحيح');
            return;
        }

        setIsLoading(true);

        try {
            const result = createOTPVerification(validation.formatted!, nationalId);

            if ('error' in result) {
                setPhoneError(result.error);
                return;
            }

            // إرسال SMS
            await sendOTPviaSMS(validation.formatted!, result.code);

            // للتطوير: نعرض الكود
            setSentCode(result.code);
            console.log('🔐 OTP Code:', result.code);

            setPhoneNumber(validation.formatted!);
            setStep('otp');
            setCountdown(60);
        } catch (error) {
            setPhoneError('حدث خطأ. يرجى المحاولة مرة أخرى.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOTP = async (code: string) => {
        setOtpError('');
        setIsLoading(true);

        try {
            const result = verifyOTP(phoneNumber, code, nationalId);

            if (!result.success) {
                setOtpError(result.message);
                return;
            }

            onVerified(phoneNumber);
        } catch (error) {
            setOtpError('حدث خطأ. يرجى المحاولة مرة أخرى.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleResend = async () => {
        if (countdown > 0) return;

        setIsLoading(true);
        const result = resendOTP(phoneNumber);

        if (!result.success) {
            setOtpError(result.message);
            if (result.waitSeconds) {
                setCountdown(result.waitSeconds);
            }
        } else {
            setSentCode(result.code || null);
            setCountdown(60);
            setOtpError('');
        }

        setIsLoading(false);
    };

    if (step === 'phone') {
        return (
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        رقم الهاتف
                    </label>
                    <input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="09XXXXXXXX"
                        className={`w-full px-4 py-3 text-lg border-2 rounded-xl text-left
                            ${phoneError ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'}
                            focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none
                            bg-white dark:bg-gray-800`}
                        dir="ltr"
                    />
                    {phoneError && (
                        <p className="mt-2 text-sm text-red-500">{phoneError}</p>
                    )}
                </div>

                <button
                    onClick={handleSendOTP}
                    disabled={isLoading || !phoneNumber}
                    className={`w-full py-3 rounded-xl font-medium text-white transition-all
                        ${isLoading || !phoneNumber
                            ? 'bg-gray-400 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                    {isLoading ? 'جاري الإرسال...' : 'إرسال رمز التحقق'}
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="text-center">
                <p className="text-gray-600 dark:text-gray-400">
                    تم إرسال رمز التحقق إلى
                </p>
                <p className="text-lg font-bold text-gray-800 dark:text-white mt-1" dir="ltr">
                    {phoneNumber}
                </p>

                {/* للتطوير فقط */}
                {sentCode && (
                    <div className="mt-2 p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                        <p className="text-sm text-yellow-800 dark:text-yellow-200">
                            🔐 رمز التحقق (للتطوير): <strong>{sentCode}</strong>
                        </p>
                    </div>
                )}
            </div>

            <OTPInput
                onComplete={handleVerifyOTP}
                disabled={isLoading}
            />

            {otpError && (
                <p className="text-center text-sm text-red-500">{otpError}</p>
            )}

            <div className="flex flex-col items-center gap-2">
                {countdown > 0 ? (
                    <p className="text-sm text-gray-500">
                        إعادة الإرسال بعد {countdown} ثانية
                    </p>
                ) : (
                    <button
                        onClick={handleResend}
                        disabled={isLoading}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                        إعادة إرسال الرمز
                    </button>
                )}

                <button
                    onClick={() => setStep('phone')}
                    className="text-gray-500 hover:text-gray-700 text-sm"
                >
                    تغيير رقم الهاتف
                </button>
            </div>
        </div>
    );
};
