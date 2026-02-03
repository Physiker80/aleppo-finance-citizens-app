/**
 * صفحة حجز المواعيد للمواطنين
 * Public Appointment Booking Page - 3 Steps Process
 */

import React, { useState, useEffect, useContext } from 'react';
import {
    Appointment,
    ServiceCategory,
    AppointmentPriority,
    TimeSlot,
    SERVICE_LABELS,
    PRIORITY_LABELS,
    DEFAULT_APPOINTMENT_SETTINGS
} from '../types/appointment';
import { validateNationalId, validateSyrianPhone, OTPInput, sendOTPviaSMS, verifyOTP } from '../utils/appointmentOTP';
import {
    createAppointment,
    generateTimeSlots,
    isSlotAvailable,
    canBookOnDate,
    confirmAppointment,
    canCitizenBook,
    calculateSlotAvailability,
    updateBookingThrottle,
    syncAppointmentToCloud,
    setupAutoSync
} from '../utils/appointmentManager';
import { QRCodeDisplay, AppointmentTicket, generateAppointmentQRData } from '../utils/appointmentQR';
import {
    WhatsAppShareButton,
    LocationMap,
    CalendarIntegration,
    AppointmentShareButtons
} from '../components/IntegrationComponents';
import { AppContext } from '../App';
import { SiteConfig } from '../types';

// أيقونات الخدمات
const SERVICE_ICONS: Record<ServiceCategory, string> = {
    [ServiceCategory.TaxPayment]: '💰',
    [ServiceCategory.TaxObjection]: '⚖️',
    [ServiceCategory.TaxExemption]: '📋',
    [ServiceCategory.TaxCertificate]: '📄',
    [ServiceCategory.PropertyAssessment]: '🏠',
    [ServiceCategory.CommercialLicense]: '🏪',
    [ServiceCategory.FinancialInquiry]: '❓',
    [ServiceCategory.DocumentCollection]: '📁',
    [ServiceCategory.ComplaintSubmission]: '📝',
    [ServiceCategory.Other]: '📎'
};

// دالة للحصول على الفترات المتاحة
const getAvailableSlots = (date: string): TimeSlot[] => {
    const allSlots = generateTimeSlots(date);
    return allSlots.filter(slot => slot.isAvailable && slot.currentBookings < slot.maxCapacity);
};

// مكون الخطوة
interface StepIndicatorProps {
    currentStep: number;
    steps: string[];
}

const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep, steps }) => {
    return (
        <div className="flex items-center justify-center mb-8">
            {steps.map((step, index) => (
                <React.Fragment key={index}>
                    <div className="flex flex-col items-center">
                        <div className={`
                            w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg
                            transition-all duration-300
                            ${index < currentStep
                                ? 'bg-green-500 text-white'
                                : index === currentStep
                                    ? 'bg-[#0f3c35] text-white scale-110'
                                    : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                            }
                        `}>
                            {index < currentStep ? '✓' : index + 1}
                        </div>
                        <span className={`
                            mt-2 text-xs font-medium
                            ${index === currentStep
                                ? 'text-[#0f3c35] dark:text-emerald-400'
                                : 'text-gray-500'
                            }
                        `}>
                            {step}
                        </span>
                    </div>
                    {index < steps.length - 1 && (
                        <div className={`
                            w-16 h-1 mx-2 rounded
                            ${index < currentStep
                                ? 'bg-green-500'
                                : 'bg-gray-200 dark:bg-gray-700'
                            }
                        `} />
                    )}
                </React.Fragment>
            ))}
        </div>
    );
};

// الخطوة 1: التحقق من الهوية
interface Step1Props {
    onVerified: (data: { phone: string; nationalId: string; fullName: string; email?: string }) => void;
}

// مكون التحقق من OTP مضمن
const OTPVerificationComponent: React.FC<{
    phone: string;
    onVerified: () => void;
    onCancel: () => void;
}> = ({ phone, onVerified, onCancel }) => {
    const [otp, setOtp] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [generatedOTP, setGeneratedOTP] = useState('');
    const [countdown, setCountdown] = useState(300); // 5 دقائق

    useEffect(() => {
        // توليد OTP وهمي للتجربة
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        setGeneratedOTP(code);
        console.log(`[محاكاة SMS] تم إرسال رمز التحقق ${code} إلى ${phone}`);
        alert(`للتجربة فقط: رمز التحقق هو ${code}`);
    }, [phone]);

    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

    const handleVerify = () => {
        setIsLoading(true);
        setError('');

        setTimeout(() => {
            if (otp === generatedOTP) {
                onVerified();
            } else {
                setError('رمز التحقق غير صحيح');
            }
            setIsLoading(false);
        }, 500);
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="max-w-md mx-auto text-center">
            <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full 
                          flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl">📱</span>
            </div>

            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
                التحقق من رقم الهاتف
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
                تم إرسال رمز التحقق إلى {phone}
            </p>

            <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full px-4 py-4 text-center text-2xl font-mono tracking-widest
                         border-2 border-gray-200 dark:border-gray-700 rounded-xl
                         bg-white dark:bg-gray-800 text-gray-800 dark:text-white
                         focus:outline-none focus:border-[#0f3c35]"
                placeholder="------"
                maxLength={6}
                dir="ltr"
            />

            {error && <p className="text-red-500 mt-2">{error}</p>}

            <p className="text-sm text-gray-500 mt-4">
                ينتهي الرمز خلال: <span className="font-bold">{formatTime(countdown)}</span>
            </p>

            <div className="flex gap-4 mt-6">
                <button
                    onClick={onCancel}
                    className="flex-1 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 
                             dark:text-gray-300 rounded-xl font-medium"
                >
                    رجوع
                </button>
                <button
                    onClick={handleVerify}
                    disabled={otp.length !== 6 || isLoading}
                    className="flex-1 py-3 bg-[#0f3c35] text-white rounded-xl font-bold
                             disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? 'جاري التحقق...' : 'تأكيد'}
                </button>
            </div>
        </div>
    );
};

// دالة التحقق من صحة البريد الإلكتروني
const validateEmail = (email: string): boolean => {
    if (!email) return true; // اختياري
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

const Step1Verification: React.FC<Step1Props> = ({ onVerified }) => {
    const [step, setStep] = useState<'input' | 'otp'>('input');
    const [phone, setPhone] = useState('');
    const [nationalId, setNationalId] = useState('');
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [errors, setErrors] = useState<{ phone?: string; nationalId?: string; fullName?: string; email?: string }>({});

    const validateInputs = (): boolean => {
        const newErrors: typeof errors = {};

        if (!fullName.trim() || fullName.length < 3) {
            newErrors.fullName = 'يرجى إدخال الاسم الثلاثي';
        }

        const phoneValidation = validateSyrianPhone(phone);
        if (!phoneValidation.valid) {
            newErrors.phone = phoneValidation.message || 'رقم هاتف غير صحيح';
        }

        const idValidation = validateNationalId(nationalId);
        if (!idValidation.valid) {
            newErrors.nationalId = idValidation.message || 'الرقم الوطني غير صحيح';
        }

        if (email && !validateEmail(email)) {
            newErrors.email = 'البريد الإلكتروني غير صحيح';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validateInputs()) {
            setStep('otp');
        }
    };

    if (step === 'otp') {
        return (
            <OTPVerificationComponent
                phone={phone}
                onVerified={() => onVerified({ phone, nationalId, fullName, email: email || undefined })}
                onCancel={() => setStep('input')}
            />
        );
    }

    return (
        <div className="max-w-md mx-auto">
            <div className="text-center mb-6">
                <div className="w-20 h-20 bg-[#0f3c35]/10 dark:bg-emerald-900/30 rounded-full 
                              flex items-center justify-center mx-auto mb-4">
                    <span className="text-4xl">🔐</span>
                </div>
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                    التحقق من الهوية
                </h2>
                <p className="text-gray-500 dark:text-gray-400 mt-2">
                    للحفاظ على أمان المواعيد، يرجى إدخال بياناتك
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        الاسم الثلاثي
                    </label>
                    <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className={`w-full px-4 py-3 rounded-xl border-2 
                                  ${errors.fullName ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'}
                                  bg-white dark:bg-gray-800 text-gray-800 dark:text-white
                                  focus:outline-none focus:border-[#0f3c35] dark:focus:border-emerald-500`}
                        placeholder="مثال: أحمد محمد علي"
                    />
                    {errors.fullName && (
                        <p className="text-red-500 text-sm mt-1">{errors.fullName}</p>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        رقم الهاتف
                    </label>
                    <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        className={`w-full px-4 py-3 rounded-xl border-2 text-left dir-ltr
                                  ${errors.phone ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'}
                                  bg-white dark:bg-gray-800 text-gray-800 dark:text-white
                                  focus:outline-none focus:border-[#0f3c35] dark:focus:border-emerald-500`}
                        placeholder="09XXXXXXXX"
                        dir="ltr"
                    />
                    {errors.phone && (
                        <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        الرقم الوطني
                    </label>
                    <input
                        type="text"
                        value={nationalId}
                        onChange={(e) => setNationalId(e.target.value.replace(/\D/g, '').slice(0, 11))}
                        className={`w-full px-4 py-3 rounded-xl border-2 text-left
                                  ${errors.nationalId ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'}
                                  bg-white dark:bg-gray-800 text-gray-800 dark:text-white
                                  focus:outline-none focus:border-[#0f3c35] dark:focus:border-emerald-500`}
                        placeholder="XXXXXXXXXXX"
                        dir="ltr"
                    />
                    {errors.nationalId && (
                        <p className="text-red-500 text-sm mt-1">{errors.nationalId}</p>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        البريد الإلكتروني <span className="text-gray-400 text-xs">(اختياري - لإرسال تذكرة الموعد)</span>
                    </label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={`w-full px-4 py-3 rounded-xl border-2 text-left
                                  ${errors.email ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'}
                                  bg-white dark:bg-gray-800 text-gray-800 dark:text-white
                                  focus:outline-none focus:border-[#0f3c35] dark:focus:border-emerald-500`}
                        placeholder="example@email.com"
                        dir="ltr"
                    />
                    {errors.email && (
                        <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        سيتم إرسال بطاقة تذكرة الموعد إلى بريدك الإلكتروني
                    </p>
                </div>

                <button
                    type="submit"
                    className="w-full py-3 bg-[#0f3c35] hover:bg-[#1a5c4f] text-white 
                             font-bold rounded-xl transition-colors"
                >
                    متابعة ← إرسال رمز التحقق
                </button>
            </form>
        </div>
    );
};

// الخطوة 2: اختيار الخدمة والموعد
interface Step2Props {
    onSelect: (data: {
        service: ServiceCategory;
        date: string;
        timeSlot: TimeSlot;
        priority: AppointmentPriority;
        notes?: string;
    }) => void;
    onBack: () => void;
}

const Step2Selection: React.FC<Step2Props> = ({ onSelect, onBack }) => {
    const [selectedService, setSelectedService] = useState<ServiceCategory | null>(null);
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
    const [priority, setPriority] = useState<AppointmentPriority>(AppointmentPriority.Normal);
    const [notes, setNotes] = useState('');
    const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
    const [isLoadingSlots, setIsLoadingSlots] = useState(false);

    // توليد التواريخ المتاحة (الـ 14 يوم القادمة)
    const getAvailableDates = (): { date: string; dayName: string; dayNum: string; monthName: string; year: string; available: boolean }[] => {
        const dates = [];
        const today = new Date();

        for (let i = 1; i <= 14; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);

            const dateStr = date.toISOString().split('T')[0];
            const dayOfWeek = date.getDay();

            // التحقق من أيام العمل (ليس الجمعة أو السبت)
            const isWorkDay = dayOfWeek !== 5 && dayOfWeek !== 6;
            const canBook = isWorkDay && canBookOnDate(dateStr);

            dates.push({
                date: dateStr,
                dayName: date.toLocaleDateString('ar-SY', { weekday: 'long' }),
                dayNum: date.getDate().toString(),
                monthName: date.toLocaleDateString('ar-SY', { month: 'long' }),
                year: date.getFullYear().toString(),
                available: canBook
            });
        }

        return dates;
    };

    // تحميل الفترات المتاحة عند اختيار التاريخ
    useEffect(() => {
        if (selectedDate && selectedService) {
            setIsLoadingSlots(true);
            // محاكاة تحميل الفترات
            setTimeout(() => {
                const slots = getAvailableSlots(selectedDate);
                setAvailableSlots(slots);
                setIsLoadingSlots(false);
            }, 500);
        }
    }, [selectedDate, selectedService]);

    const handleSubmit = () => {
        if (selectedService && selectedDate && selectedSlot) {
            onSelect({
                service: selectedService,
                date: selectedDate,
                timeSlot: selectedSlot,
                priority,
                notes: notes.trim() || undefined
            });
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            {/* اختيار الخدمة */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                    <span className="w-8 h-8 bg-[#0f3c35] text-white rounded-full flex items-center justify-center text-sm">1</span>
                    اختر نوع المعاملة
                </h3>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {Object.entries(SERVICE_LABELS).map(([key, label]) => {
                        const serviceKey = key as ServiceCategory;
                        return (
                            <button
                                key={key}
                                onClick={() => setSelectedService(serviceKey)}
                                className={`p-4 rounded-xl border-2 transition-all text-center
                                    ${selectedService === serviceKey
                                        ? 'border-[#0f3c35] bg-[#0f3c35]/10 dark:bg-emerald-900/30'
                                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                                    }`}
                            >
                                <span className="text-2xl block mb-2">{SERVICE_ICONS[serviceKey]}</span>
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {label}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* اختيار التاريخ */}
            {selectedService && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg animate-fadeIn">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                        <span className="w-8 h-8 bg-[#0f3c35] text-white rounded-full flex items-center justify-center text-sm">2</span>
                        اختر التاريخ
                    </h3>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                        {getAvailableDates().map(({ date, dayName, dayNum, monthName, year, available }) => (
                            <button
                                key={date}
                                onClick={() => available && setSelectedDate(date)}
                                disabled={!available}
                                className={`relative p-4 rounded-2xl transition-all text-center border-2
                                    ${!available
                                        ? 'bg-gray-100 dark:bg-gray-700/50 text-gray-400 cursor-not-allowed border-gray-200 dark:border-gray-600'
                                        : selectedDate === date
                                            ? 'bg-gradient-to-br from-[#0f3c35] to-[#1a5c4f] text-white border-[#0f3c35] shadow-lg scale-105'
                                            : 'bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 border-gray-200 dark:border-gray-600 hover:border-[#0f3c35] dark:hover:border-emerald-500'
                                    }`}
                            >
                                {/* اسم اليوم */}
                                <div className={`text-xs font-medium mb-1 ${selectedDate === date ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>
                                    {dayName}
                                </div>
                                {/* رقم اليوم */}
                                <div className={`text-3xl font-bold mb-1 ${selectedDate === date ? 'text-white' : 'text-gray-800 dark:text-white'}`}>
                                    {dayNum}
                                </div>
                                {/* اسم الشهر */}
                                <div className={`text-sm font-semibold ${selectedDate === date ? 'text-white/90' : 'text-[#0f3c35] dark:text-emerald-400'}`}>
                                    {monthName}
                                </div>
                                {/* السنة */}
                                <div className={`text-xs mt-1 ${selectedDate === date ? 'text-white/70' : 'text-gray-400 dark:text-gray-500'}`}>
                                    {year}
                                </div>
                                {/* علامة التحديد */}
                                {selectedDate === date && (
                                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-md">
                                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                )}
                                {/* علامة عدم التوفر */}
                                {!available && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <span className="text-gray-400 text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                                            غير متاح
                                        </span>
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* اختيار الوقت */}
            {selectedDate && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg animate-fadeIn">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                        <span className="w-8 h-8 bg-[#0f3c35] text-white rounded-full flex items-center justify-center text-sm">3</span>
                        اختر الوقت
                    </h3>

                    {isLoadingSlots ? (
                        <div className="flex justify-center py-8">
                            <div className="animate-spin w-8 h-8 border-4 border-[#0f3c35] border-t-transparent rounded-full" />
                        </div>
                    ) : availableSlots.length === 0 ? (
                        <p className="text-center text-gray-500 py-8">
                            لا توجد أوقات متاحة في هذا اليوم
                        </p>
                    ) : (
                        <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                            {availableSlots.map((slot) => (
                                <button
                                    key={slot.id}
                                    onClick={() => setSelectedSlot(slot)}
                                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all
                                        ${selectedSlot?.id === slot.id
                                            ? 'bg-[#0f3c35] text-white'
                                            : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                                        }`}
                                    dir="ltr"
                                >
                                    {slot.startTime}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* الأولوية والملاحظات */}
            {selectedSlot && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg animate-fadeIn">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">
                        معلومات إضافية
                    </h3>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                هل لديك أولوية خاصة؟
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {[
                                    { value: AppointmentPriority.Normal, label: 'عادي' },
                                    { value: AppointmentPriority.Elderly, label: 'كبار السن' },
                                    { value: AppointmentPriority.Disabled, label: 'ذوي الهمم' },
                                    { value: AppointmentPriority.Wounded, label: 'الجرحى' }
                                ].map(({ value, label }) => (
                                    <button
                                        key={value}
                                        onClick={() => setPriority(value)}
                                        className={`px-4 py-2 rounded-lg text-sm transition-all
                                            ${priority === value
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200'
                                            }`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                ملاحظات (اختياري)
                            </label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={3}
                                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700
                                         bg-white dark:bg-gray-800 text-gray-800 dark:text-white
                                         focus:outline-none focus:border-[#0f3c35] resize-none"
                                placeholder="أي تفاصيل إضافية..."
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* أزرار التنقل */}
            <div className="flex gap-4">
                <button
                    onClick={onBack}
                    className="flex-1 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 
                             dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300
                             font-bold rounded-xl transition-colors"
                >
                    ← رجوع
                </button>
                <button
                    onClick={handleSubmit}
                    disabled={!selectedService || !selectedDate || !selectedSlot}
                    className="flex-1 py-3 bg-[#0f3c35] hover:bg-[#1a5c4f] disabled:bg-gray-400
                             text-white font-bold rounded-xl transition-colors disabled:cursor-not-allowed"
                >
                    تأكيد الموعد ←
                </button>
            </div>
        </div>
    );
};

// الخطوة 3: التأكيد والتذكرة
interface Step3Props {
    appointment: Appointment;
    onNewBooking: () => void;
}

const Step3Confirmation: React.FC<Step3Props> = ({ appointment, onNewBooking }) => {
    const [showTicket, setShowTicket] = useState(false);

    return (
        <div className="max-w-md mx-auto text-center">
            {!showTicket ? (
                <div className="animate-fadeIn">
                    <div className="w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full 
                                  flex items-center justify-center mx-auto mb-6">
                        <span className="text-5xl">✅</span>
                    </div>

                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                        تم حجز موعدك بنجاح!
                    </h2>

                    <p className="text-gray-500 dark:text-gray-400 mb-2">
                        سيتم إرسال رسالة تأكيد إلى هاتفك
                    </p>

                    {appointment.email && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 
                                       rounded-xl p-3 mb-4 flex items-center justify-center gap-2">
                            <span className="text-blue-600 dark:text-blue-400">📧</span>
                            <p className="text-sm text-blue-700 dark:text-blue-300">
                                تم إرسال التذكرة إلى: <strong dir="ltr">{appointment.email}</strong>
                            </p>
                        </div>
                    )}

                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg mb-6 text-right">
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-gray-500">رقم الموعد:</span>
                                <span className="font-bold font-mono text-[#0f3c35] dark:text-emerald-400">
                                    {appointment.id}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">التاريخ:</span>
                                <span className="font-medium">
                                    {new Date(appointment.date).toLocaleDateString('ar-SY')}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">الوقت:</span>
                                <span className="font-medium" dir="ltr">
                                    {appointment.timeSlot.startTime}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">الخدمة:</span>
                                <span className="font-medium">
                                    {SERVICE_LABELS[appointment.serviceCategory]}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <button
                            onClick={() => setShowTicket(true)}
                            className="w-full py-3 bg-[#0f3c35] hover:bg-[#1a5c4f] text-white 
                                     font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                        >
                            <span>📋</span>
                            عرض التذكرة مع رمز QR
                        </button>

                        {/* أزرار المشاركة والتكامل */}
                        <AppointmentShareButtons
                            appointment={appointment}
                        />

                        <button
                            onClick={onNewBooking}
                            className="w-full py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 
                                     dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300
                                     font-bold rounded-xl transition-colors"
                        >
                            حجز موعد جديد
                        </button>
                    </div>

                    {/* خريطة الموقع */}
                    <div className="mt-6">
                        <LocationMap showDirections={true} />
                    </div>

                    <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">
                        💡 تذكير: يرجى الحضور قبل 15 دقيقة من موعدك
                    </p>
                </div>
            ) : (
                <div className="animate-fadeIn">
                    <AppointmentTicket appointment={appointment} />

                    <button
                        onClick={() => setShowTicket(false)}
                        className="mt-6 px-6 py-2 text-gray-600 dark:text-gray-400 hover:underline"
                    >
                        ← العودة
                    </button>
                </div>
            )}
        </div>
    );
};

// دالة إرسال البريد الإلكتروني مع تذكرة الموعد
const sendAppointmentEmailNotification = async (appointment: Appointment, email: string, config?: SiteConfig | null): Promise<void> => {
    const dirName = config?.directorateName || 'مديرية مالية محافظة حلب';
    
    // تفاصيل الموعد للإرسال
    const appointmentDetails = {
        id: appointment.id,
        date: new Date(appointment.date).toLocaleDateString('ar-SY', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }),
        time: appointment.timeSlot.startTime,
        service: SERVICE_LABELS[appointment.serviceCategory],
        name: appointment.fullName
    };

    console.log(`[Email] محاولة إرسال تذكرة الموعد إلى ${email}`);
    console.log('تفاصيل الموعد:', appointmentDetails);

    // محاولة إرسال البريد عبر EmailJS (إذا كان متاحاً)
    try {
        // التحقق من وجود EmailJS
        if (typeof (window as any).emailjs !== 'undefined') {
            await (window as any).emailjs.send(
                'service_id', // استبدل بـ Service ID الخاص بك من EmailJS
                'template_id', // استبدل بـ Template ID الخاص بك من EmailJS
                {
                    to_email: email,
                    to_name: appointment.fullName,
                    appointment_id: appointment.id,
                    appointment_date: appointmentDetails.date,
                    appointment_time: appointmentDetails.time,
                    service_type: appointmentDetails.service,
                    reply_to: 'noreply@aleppo-finance.gov.sy',
                    directorate_name: dirName
                }
            );
            console.log('✅ تم إرسال البريد بنجاح');
        } else {
            // استخدام mailto كبديل
            const subject = encodeURIComponent(`تذكرة حجز موعد - ${appointment.id}`);
            const body = encodeURIComponent(
                `تذكرة حجز موعد - ${dirName}\n\n` +
                `رقم الموعد: ${appointment.id}\n` +
                `الاسم: ${appointment.fullName}\n` +
                `التاريخ: ${appointmentDetails.date}\n` +
                `الوقت: ${appointmentDetails.time}\n` +
                `نوع المعاملة: ${appointmentDetails.service}\n\n` +
                `يرجى الحضور قبل 15 دقيقة من موعدك.\n` +
                `قم بإظهار هذه الرسالة أو رمز QR عند مدخل المديرية.`
            );

            // فتح تطبيق البريد الافتراضي
            window.open(`mailto:${email}?subject=${subject}&body=${body}`, '_blank');
            console.log('📧 تم فتح تطبيق البريد الإلكتروني');
        }
    } catch (error) {
        console.error('خطأ في إرسال البريد:', error);
    }

    // حفظ حالة إرسال البريد في localStorage للتتبع
    const emailLog = JSON.parse(localStorage.getItem('appointment_email_log') || '[]');
    emailLog.push({
        appointmentId: appointment.id,
        email: email,
        sentAt: new Date().toISOString(),
        status: 'sent'
    });
    localStorage.setItem('appointment_email_log', JSON.stringify(emailLog));
};

// الصفحة الرئيسية
export const AppointmentBookingPage: React.FC = () => {
    const context = useContext(AppContext);
    const config = context?.siteConfig;

    const [currentStep, setCurrentStep] = useState(0);
    const [verifiedData, setVerifiedData] = useState<{
        phone: string;
        nationalId: string;
        fullName: string;
        email?: string;
    } | null>(null);
    const [bookedAppointment, setBookedAppointment] = useState<Appointment | null>(null);
    const [bookingError, setBookingError] = useState<string | null>(null);

    const steps = ['التحقق', 'اختيار الموعد', 'التأكيد'];

    // تفعيل المزامنة التلقائية مع السحابة
    useEffect(() => {
        setupAutoSync();
    }, []);

    const handleVerification = (data: { phone: string; nationalId: string; fullName: string; email?: string }) => {
        // التحقق من خوارزمية منع الاحتكار قبل المتابعة
        const throttleCheck = canCitizenBook(data.nationalId);

        if (!throttleCheck.allowed) {
            setBookingError(
                throttleCheck.reason +
                (throttleCheck.nextAvailableDate
                    ? `\n\nيمكنك الحجز بعد: ${new Date(throttleCheck.nextAvailableDate).toLocaleDateString('ar-SY')}`
                    : '')
            );
            return;
        }

        setBookingError(null);
        setVerifiedData(data);
        setCurrentStep(1);
    };

    const handleSelection = (data: {
        service: ServiceCategory;
        date: string;
        timeSlot: TimeSlot;
        priority: AppointmentPriority;
        notes?: string;
    }) => {
        if (!verifiedData) return;

        // التحقق من توفر الفترة الزمنية باستخدام المعادلة الجديدة
        const slotAvailability = calculateSlotAvailability(
            data.date,
            data.timeSlot.startTime,
            data.timeSlot.endTime
        );

        if (!slotAvailability.isAvailable) {
            setBookingError(slotAvailability.unavailabilityReason || 'الفترة غير متاحة');
            return;
        }

        // إنشاء الموعد
        const appointment = createAppointment({
            citizenId: verifiedData.nationalId,
            fullName: verifiedData.fullName,
            phoneNumber: verifiedData.phone,
            email: verifiedData.email,
            serviceCategory: data.service,
            date: data.date,
            timeSlot: data.timeSlot,
            priority: data.priority,
            notes: data.notes
        });

        // تحديث عداد الحجوزات للمواطن
        updateBookingThrottle(verifiedData.nationalId);

        // تأكيد الموعد وتوليد QR
        const qrData = generateAppointmentQRData(appointment);
        confirmAppointment(appointment.id, qrData, 'system');

        // مزامنة الموعد مع السحابة (Supabase)
        if (navigator.onLine) {
            syncAppointmentToCloud(appointment).then(result => {
                if (result.success) {
                    console.log('✅ تم مزامنة الموعد مع السحابة:', appointment.id);
                } else {
                    console.warn('⚠️ فشل مزامنة الموعد:', result.error);
                }
            });
        }

        // إرسال البريد الإلكتروني مع التذكرة إذا تم توفير البريد
        if (verifiedData.email) {
            sendAppointmentEmailNotification(appointment, verifiedData.email, config);
        }

        setBookingError(null);
        setBookedAppointment(appointment);
        setCurrentStep(2);
    };

    const handleNewBooking = () => {
        setCurrentStep(0);
        setVerifiedData(null);
        setBookedAppointment(null);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 
                       dark:from-gray-900 dark:to-gray-800 py-8 px-4">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center gap-4 mb-4">
                        <img
                            src="https://syrian.zone/syid/materials/logo.ai.svg"
                            alt="شعار الجمهورية العربية السورية"
                            className="w-32 h-32 drop-shadow-lg"
                        />
                    </div>
                    <h1 className="text-2xl md:text-3xl font-bold text-[#0f3c35] dark:text-emerald-400">
                        نظام حجز المواعيد الإلكتروني
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-2 text-lg">
                        {config?.directorateName || 'مديرية مالية محافظة حلب'}
                    </p>
                    <p className="text-gray-500 dark:text-gray-500 mt-1 text-sm">
                        احجز موعدك مسبقاً لتجنب الانتظار
                    </p>
                </div>

                {/* Step Indicator */}
                <StepIndicator currentStep={currentStep} steps={steps} />

                {/* Error Message */}
                {bookingError && (
                    <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 
                                   dark:border-red-800 rounded-xl text-center">
                        <span className="text-2xl block mb-2">⚠️</span>
                        <p className="text-red-700 dark:text-red-300 whitespace-pre-line">
                            {bookingError}
                        </p>
                        <button
                            onClick={() => setBookingError(null)}
                            className="mt-3 text-sm text-red-600 dark:text-red-400 hover:underline"
                        >
                            إغلاق
                        </button>
                    </div>
                )}

                {/* Content */}
                <div className="mt-8">
                    {currentStep === 0 && (
                        <Step1Verification onVerified={handleVerification} />
                    )}

                    {currentStep === 1 && (
                        <Step2Selection
                            onSelect={handleSelection}
                            onBack={() => setCurrentStep(0)}
                        />
                    )}

                    {currentStep === 2 && bookedAppointment && (
                        <Step3Confirmation
                            appointment={bookedAppointment}
                            onNewBooking={handleNewBooking}
                        />
                    )}
                </div>

                {/* Footer */}
                <div className="mt-12 text-center text-sm text-gray-400 dark:text-gray-500">
                    <p>للمساعدة اتصل على: {config?.phone || '021-2234567'}</p>
                    <p className="mt-1">ساعات العمل: {config?.workingHours || '08:00 - 14:00 (الأحد - الخميس)'}</p>
                </div>
            </div>

            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fadeIn {
                    animation: fadeIn 0.3s ease-out;
                }
            `}</style>
        </div>
    );
};

export default AppointmentBookingPage;
