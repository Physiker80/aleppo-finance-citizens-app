import React, { useEffect, useState, useCallback } from 'react';
import { sessionTimeout } from '../utils/sessionTimeout';

interface SessionTimeoutWarningProps {
    onExtend: () => void;
    onLogout: () => void;
}

/**
 * 🔔 مكون تحذير انتهاء الجلسة
 * يظهر عندما يكون المستخدم غير نشط لفترة طويلة
 */
const SessionTimeoutWarning: React.FC<SessionTimeoutWarningProps> = ({ onExtend, onLogout }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [remainingSeconds, setRemainingSeconds] = useState(0);

    // التعامل مع تحذير انتهاء الجلسة
    const handleWarning = useCallback((seconds: number) => {
        setRemainingSeconds(seconds);
        setIsVisible(true);
    }, []);

    // التعامل مع تسجيل الخروج
    const handleLogout = useCallback(() => {
        setIsVisible(false);
        onLogout();
    }, [onLogout]);

    // التعامل مع النشاط
    const handleActivity = useCallback(() => {
        setIsVisible(false);
    }, []);

    // تمديد الجلسة
    const handleExtend = useCallback(() => {
        sessionTimeout.extend();
        setIsVisible(false);
        onExtend();
    }, [onExtend]);

    // بدء المراقبة عند التركيب
    useEffect(() => {
        sessionTimeout.start({
            onWarning: handleWarning,
            onLogout: handleLogout,
            onActivity: handleActivity
        });

        return () => {
            sessionTimeout.stop();
        };
    }, [handleWarning, handleLogout, handleActivity]);

    // تنسيق الوقت المتبقي
    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md mx-4 text-center transform animate-scale-in">
                {/* أيقونة التحذير */}
                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center animate-pulse">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>

                {/* العنوان */}
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                    جلستك على وشك الانتهاء
                </h2>

                {/* الرسالة */}
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                    لم يتم اكتشاف أي نشاط. سيتم تسجيل خروجك تلقائياً خلال:
                </p>

                {/* العد التنازلي */}
                <div className="mb-8">
                    <div className={`text-5xl font-mono font-bold ${remainingSeconds <= 60 ? 'text-red-500 animate-pulse' : 'text-orange-500'
                        }`}>
                        {formatTime(remainingSeconds)}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                        دقيقة : ثانية
                    </p>
                </div>

                {/* شريط التقدم */}
                <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-8">
                    <div
                        className="h-full bg-gradient-to-r from-orange-400 to-red-500 transition-all duration-1000 ease-linear"
                        style={{
                            width: `${(remainingSeconds / 300) * 100}%`
                        }}
                    />
                </div>

                {/* الأزرار */}
                <div className="flex gap-4">
                    <button
                        onClick={handleExtend}
                        className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all transform hover:scale-105 shadow-lg"
                    >
                        تمديد الجلسة
                    </button>
                    <button
                        onClick={handleLogout}
                        className="flex-1 px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
                    >
                        تسجيل الخروج
                    </button>
                </div>

                {/* نصيحة */}
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-6">
                    💡 حرّك الماوس أو اضغط أي مفتاح للبقاء متصلاً
                </p>
            </div>
        </div>
    );
};

export default SessionTimeoutWarning;
