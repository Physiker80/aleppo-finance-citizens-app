/**
 * صفحة مسح QR للتسجيل عند مدخل الدائرة
 * QR Scanner Page for Check-in at Entrance
 */

import React, { useState, useEffect, useContext, useRef } from 'react';
import { AppContext } from '../App';
import {
    Appointment,
    AppointmentStatus,
    SERVICE_LABELS,
    STATUS_LABELS,
    PRIORITY_LABELS,
    STATUS_COLORS,
    PRIORITY_COLORS
} from '../types/appointment';
import {
    getAppointmentById,
    checkInAppointment,
    getAppointmentsByDate
} from '../utils/appointmentManager';
import { QRScanner, startQRScanner, readQRCodeFromImage } from '../utils/appointmentQR';

interface CheckInResult {
    success: boolean;
    appointment?: Appointment;
    message: string;
    queuePosition?: number;
}

// مكون عرض نتيجة التسجيل
interface CheckInResultDisplayProps {
    result: CheckInResult;
    onDismiss: () => void;
}

const CheckInResultDisplay: React.FC<CheckInResultDisplayProps> = ({ result, onDismiss }) => {
    useEffect(() => {
        // إغلاق تلقائي بعد 5 ثواني
        const timer = setTimeout(onDismiss, 5000);
        return () => clearTimeout(timer);
    }, [onDismiss]);

    return (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4
                        ${result.success ? 'bg-green-500/90' : 'bg-red-500/90'}`}>
            <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl animate-scaleIn">
                <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6
                               ${result.success ? 'bg-green-100' : 'bg-red-100'}`}>
                    <span className="text-5xl">
                        {result.success ? '✅' : '❌'}
                    </span>
                </div>

                <h2 className={`text-2xl font-bold mb-4
                              ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                    {result.success ? 'تم التسجيل بنجاح!' : 'فشل التسجيل'}
                </h2>

                <p className="text-gray-600 text-lg mb-6">{result.message}</p>

                {result.appointment && result.success && (
                    <div className="bg-gray-50 rounded-2xl p-6 text-right mb-6">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-gray-500">رقم الموعد:</span>
                                <p className="font-bold text-[#0f3c35] font-mono text-lg">
                                    {result.appointment.id}
                                </p>
                            </div>
                            <div>
                                <span className="text-gray-500">الاسم:</span>
                                <p className="font-bold text-gray-800">
                                    {result.appointment.fullName}
                                </p>
                            </div>
                            <div>
                                <span className="text-gray-500">الخدمة:</span>
                                <p className="font-bold text-gray-800">
                                    {SERVICE_LABELS[result.appointment.serviceCategory]}
                                </p>
                            </div>
                            <div>
                                <span className="text-gray-500">الموعد:</span>
                                <p className="font-bold text-gray-800" dir="ltr">
                                    {result.appointment.timeSlot.startTime}
                                </p>
                            </div>
                        </div>

                        {result.queuePosition !== undefined && (
                            <div className="mt-4 pt-4 border-t border-gray-200">
                                <p className="text-gray-500">ترتيبك في الطابور:</p>
                                <p className="text-4xl font-bold text-[#0f3c35]">
                                    #{result.queuePosition}
                                </p>
                            </div>
                        )}
                    </div>
                )}

                <button
                    onClick={onDismiss}
                    className={`w-full py-3 rounded-xl font-bold text-white
                              ${result.success ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                >
                    متابعة المسح
                </button>

                <p className="text-sm text-gray-400 mt-4">
                    سيتم الإغلاق تلقائياً خلال 5 ثواني
                </p>
            </div>
        </div>
    );
};

// إحصائيات الوصول اليوم
interface TodayStatsProps {
    total: number;
    checkedIn: number;
    waiting: number;
    inProgress: number;
    completed: number;
}

const TodayStats: React.FC<TodayStatsProps> = ({ total, checkedIn, waiting, inProgress, completed }) => (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">
            📊 إحصائيات اليوم
        </h3>

        <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{total}</p>
                <p className="text-sm text-blue-600/70 dark:text-blue-400/70">إجمالي المواعيد</p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/30 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">{checkedIn}</p>
                <p className="text-sm text-green-600/70 dark:text-green-400/70">تم تسجيلهم</p>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-900/30 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{waiting}</p>
                <p className="text-sm text-yellow-600/70 dark:text-yellow-400/70">في الانتظار</p>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/30 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{completed}</p>
                <p className="text-sm text-purple-600/70 dark:text-purple-400/70">تم إنجازها</p>
            </div>
        </div>
    </div>
);

// آخر عمليات التسجيل
interface RecentCheckInsProps {
    appointments: Appointment[];
}

const RecentCheckIns: React.FC<RecentCheckInsProps> = ({ appointments }) => {
    const recentCheckIns = appointments
        .filter(apt => apt.status === AppointmentStatus.CheckedIn || apt.status === AppointmentStatus.InProgress)
        .sort((a, b) => new Date(b.checkedInAt || 0).getTime() - new Date(a.checkedInAt || 0).getTime())
        .slice(0, 5);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">
                ⏱️ آخر عمليات التسجيل
            </h3>

            {recentCheckIns.length === 0 ? (
                <p className="text-center text-gray-500 py-4">لا توجد عمليات تسجيل حتى الآن</p>
            ) : (
                <div className="space-y-3">
                    {recentCheckIns.map(apt => (
                        <div key={apt.id}
                            className="flex items-center justify-between p-3 bg-gray-50 
                                      dark:bg-gray-700 rounded-xl">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full
                                              flex items-center justify-center">
                                    <span className="text-green-600">✓</span>
                                </div>
                                <div>
                                    <p className="font-medium text-gray-800 dark:text-white">
                                        {apt.fullName}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {SERVICE_LABELS[apt.serviceCategory]}
                                    </p>
                                </div>
                            </div>
                            <div className="text-left">
                                <p className="text-sm font-mono text-[#0f3c35] dark:text-emerald-400">
                                    {apt.id}
                                </p>
                                {apt.checkedInAt && (
                                    <p className="text-xs text-gray-500">
                                        {new Date(apt.checkedInAt).toLocaleTimeString('ar-SY', {
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// الصفحة الرئيسية
export const QRCheckinPage: React.FC = () => {
    const appContext = useContext(AppContext);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isScanning, setIsScanning] = useState(true);
    const [checkInResult, setCheckInResult] = useState<CheckInResult | null>(null);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [manualId, setManualId] = useState('');
    const [showManualInput, setShowManualInput] = useState(false);
    const scannerRef = useRef<{ stop: () => void } | null>(null);

    // تحميل مواعيد اليوم
    const loadTodayAppointments = () => {
        const today = new Date().toISOString().split('T')[0];
        const todayAppointments = getAppointmentsByDate(today);
        setAppointments(todayAppointments);
    };

    useEffect(() => {
        loadTodayAppointments();
        const interval = setInterval(loadTodayAppointments, 10000);
        return () => clearInterval(interval);
    }, []);

    // بدء المسح
    useEffect(() => {
        if (videoRef.current && isScanning && !checkInResult) {
            scannerRef.current = startQRScanner(
                videoRef.current,
                handleQRScan,
                (error) => console.error('Scanner error:', error)
            );
        }

        return () => {
            scannerRef.current?.stop();
        };
    }, [isScanning, checkInResult]);

    // معالجة مسح QR
    const handleQRScan = (data: string) => {
        try {
            const qrData = JSON.parse(data);
            processCheckIn(qrData.id);
        } catch (error) {
            setCheckInResult({
                success: false,
                message: 'رمز QR غير صالح أو تالف'
            });
        }
    };

    // معالجة التسجيل
    const processCheckIn = (appointmentId: string) => {
        const appointment = getAppointmentById(appointmentId);

        if (!appointment) {
            setCheckInResult({
                success: false,
                message: `لم يتم العثور على موعد برقم: ${appointmentId}`
            });
            return;
        }

        // التحقق من التاريخ
        const today = new Date().toISOString().split('T')[0];
        if (appointment.date !== today) {
            setCheckInResult({
                success: false,
                appointment,
                message: `هذا الموعد ليس لليوم. التاريخ: ${new Date(appointment.date).toLocaleDateString('ar-SY')}`
            });
            return;
        }

        // التحقق من الحالة
        if (appointment.status === AppointmentStatus.CheckedIn) {
            setCheckInResult({
                success: false,
                appointment,
                message: 'تم تسجيل وصولك مسبقاً'
            });
            return;
        }

        if (appointment.status === AppointmentStatus.Completed) {
            setCheckInResult({
                success: false,
                appointment,
                message: 'تمت معاملتك بالفعل'
            });
            return;
        }

        if (appointment.status === AppointmentStatus.Cancelled) {
            setCheckInResult({
                success: false,
                appointment,
                message: 'تم إلغاء هذا الموعد'
            });
            return;
        }

        // تسجيل الوصول
        const checkInResult = checkInAppointment(appointmentId, 'entrance-scanner');

        if (checkInResult.success) {
            // حساب الترتيب في الطابور
            const queue = appointments
                .filter(apt => apt.status === AppointmentStatus.CheckedIn)
                .sort((a, b) => new Date(a.checkedInAt || 0).getTime() - new Date(b.checkedInAt || 0).getTime());
            const position = checkInResult.queuePosition || queue.length + 1;

            setCheckInResult({
                success: true,
                appointment: appointment,
                message: 'تم تسجيل وصولك بنجاح!',
                queuePosition: position
            });

            loadTodayAppointments();
        } else {
            setCheckInResult({
                success: false,
                message: checkInResult.message || 'حدث خطأ أثناء التسجيل'
            });
        }
    };

    // التسجيل اليدوي
    const handleManualCheckIn = (e: React.FormEvent) => {
        e.preventDefault();
        if (manualId.trim()) {
            processCheckIn(manualId.trim());
            setManualId('');
            setShowManualInput(false);
        }
    };

    // إغلاق نتيجة التسجيل
    const dismissResult = () => {
        setCheckInResult(null);
        setIsScanning(true);
    };

    // حساب الإحصائيات
    const stats = {
        total: appointments.length,
        checkedIn: appointments.filter(a => a.status === AppointmentStatus.CheckedIn).length,
        waiting: appointments.filter(a => a.status === AppointmentStatus.CheckedIn).length,
        inProgress: appointments.filter(a => a.status === AppointmentStatus.InProgress).length,
        completed: appointments.filter(a => a.status === AppointmentStatus.Completed).length
    };

    // التحقق من صلاحية الوصول
    if (!appContext?.isEmployeeLoggedIn) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
                <div className="text-center p-8">
                    <span className="text-6xl block mb-4">🔐</span>
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
                        يرجى تسجيل الدخول
                    </h2>
                    <p className="text-gray-500">هذه الصفحة للموظفين فقط</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#0f3c35] to-[#1a5c4f] text-white py-6 px-4">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <img
                            src="https://syrian.zone/syid/materials/logo.ai.svg"
                            alt="شعار الجمهورية العربية السورية"
                            className="w-20 h-20 drop-shadow-lg"
                        />
                        <div>
                            <p className="text-xs opacity-80 mb-1">الجمهورية العربية السورية</p>
                            <h1 className="text-xl font-bold">نقطة تسجيل الوصول</h1>
                            <p className="text-sm opacity-80">مديرية مالية محافظة حلب</p>
                        </div>
                    </div>

                    <div className="text-left">
                        <p className="text-sm opacity-80">التاريخ</p>
                        <p className="font-bold">
                            {new Date().toLocaleDateString('ar-SY', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            })}
                        </p>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-6xl mx-auto px-4 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* QR Scanner */}
                    <div className="lg:col-span-2">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
                            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                                <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                    <span>📷</span>
                                    ماسح رمز QR
                                </h3>

                                <button
                                    onClick={() => setShowManualInput(!showManualInput)}
                                    className="text-sm text-[#0f3c35] dark:text-emerald-400 hover:underline"
                                >
                                    {showManualInput ? 'إغلاق' : 'إدخال يدوي'}
                                </button>
                            </div>

                            {/* Manual Input */}
                            {showManualInput && (
                                <div className="p-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                                    <form onSubmit={handleManualCheckIn} className="flex gap-2">
                                        <input
                                            type="text"
                                            value={manualId}
                                            onChange={(e) => setManualId(e.target.value)}
                                            placeholder="أدخل رقم الموعد..."
                                            className="flex-1 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600
                                                     bg-white dark:bg-gray-800 text-gray-800 dark:text-white"
                                        />
                                        <button
                                            type="submit"
                                            className="px-6 py-2 bg-[#0f3c35] text-white rounded-lg hover:bg-[#1a5c4f]"
                                        >
                                            تسجيل
                                        </button>
                                    </form>
                                </div>
                            )}

                            {/* Camera View */}
                            <div className="relative aspect-video bg-black">
                                <video
                                    ref={videoRef}
                                    className="w-full h-full object-cover"
                                    playsInline
                                    muted
                                />

                                {/* Scanning Frame */}
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-64 h-64 border-4 border-white/30 rounded-3xl relative">
                                        <div className="absolute -top-1 -left-1 w-12 h-12 border-t-4 border-l-4 border-green-500 rounded-tl-2xl" />
                                        <div className="absolute -top-1 -right-1 w-12 h-12 border-t-4 border-r-4 border-green-500 rounded-tr-2xl" />
                                        <div className="absolute -bottom-1 -left-1 w-12 h-12 border-b-4 border-l-4 border-green-500 rounded-bl-2xl" />
                                        <div className="absolute -bottom-1 -right-1 w-12 h-12 border-b-4 border-r-4 border-green-500 rounded-br-2xl" />

                                        {/* Scanning Line */}
                                        <div className="absolute left-4 right-4 h-1 bg-green-500 animate-scanLine rounded-full shadow-lg shadow-green-500/50" />
                                    </div>
                                </div>

                                {/* Status Indicator */}
                                <div className="absolute bottom-4 left-4 right-4">
                                    <div className="bg-black/50 backdrop-blur rounded-xl p-3 text-center text-white">
                                        <p className="flex items-center justify-center gap-2">
                                            <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                                            جاهز للمسح - وجّه رمز QR نحو الكاميرا
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Instructions */}
                            <div className="p-6 text-center">
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full
                                                      flex items-center justify-center text-2xl">
                                            1️⃣
                                        </div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            أظهر تذكرة الموعد
                                        </p>
                                    </div>
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full
                                                      flex items-center justify-center text-2xl">
                                            2️⃣
                                        </div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            امسح رمز QR
                                        </p>
                                    </div>
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full
                                                      flex items-center justify-center text-2xl">
                                            3️⃣
                                        </div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            انتظر دورك
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        <TodayStats {...stats} />
                        <RecentCheckIns appointments={appointments} />
                    </div>
                </div>
            </div>

            {/* Check-in Result Modal */}
            {checkInResult && (
                <CheckInResultDisplay
                    result={checkInResult}
                    onDismiss={dismissResult}
                />
            )}

            {/* Styles */}
            <style>{`
                @keyframes scanLine {
                    0%, 100% { top: 10%; }
                    50% { top: 85%; }
                }
                .animate-scanLine {
                    animation: scanLine 2s ease-in-out infinite;
                }
                
                @keyframes scaleIn {
                    from { transform: scale(0.9); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
                .animate-scaleIn {
                    animation: scaleIn 0.3s ease-out;
                }
            `}</style>
        </div>
    );
};

export default QRCheckinPage;
