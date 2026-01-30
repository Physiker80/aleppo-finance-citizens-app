import React, { useState, useEffect } from 'react';
import { FiSun, FiMoon, FiDroplet, FiShield, FiCpu, FiSmile, FiLock, FiAlertTriangle, FiCheckCircle, FiRefreshCw } from 'react-icons/fi';

// صفحة تجريبية بسيطة للميزات
export default function FeaturesDemo() {
    const [activeTab, setActiveTab] = useState('theme');
    const [isDark, setIsDark] = useState(false);
    const [sentimentText, setSentimentText] = useState('');
    const [sentimentResult, setSentimentResult] = useState<any>(null);
    const [password, setPassword] = useState('');
    const [passwordResult, setPasswordResult] = useState<any>(null);
    const [ticketTitle, setTicketTitle] = useState('');
    const [classificationResult, setClassificationResult] = useState<any>(null);
    const [notification, setNotification] = useState<{ message: string; type: string } | null>(null);

    useEffect(() => {
        setIsDark(document.documentElement.classList.contains('dark'));
    }, []);

    // تبديل الوضع الداكن
    const toggleDarkMode = (mode: 'light' | 'dark' | 'auto') => {
        if (mode === 'dark') {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
            setIsDark(true);
        } else if (mode === 'light') {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
            setIsDark(false);
        } else {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (prefersDark) {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
            localStorage.setItem('theme', 'auto');
            setIsDark(prefersDark);
        }
        showNotification('تم تغيير الوضع', 'success');
    };

    // إظهار إشعار
    const showNotification = (message: string, type: string) => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 3000);
    };

    // تحليل المشاعر البسيط
    const analyzeSentiment = (text: string) => {
        const positiveWords = ['سعيد', 'ممتاز', 'رائع', 'شكراً', 'جيد', 'مبهر', 'محترم', 'سريع'];
        const negativeWords = ['غاضب', 'سيء', 'متأخر', 'مشكلة', 'خطأ', 'بطيء', 'سلبي', 'مزعج'];

        let score = 0;
        const words = text.split(/\s+/);
        const emotions: string[] = [];

        words.forEach(word => {
            if (positiveWords.some(p => word.includes(p))) {
                score += 1;
                emotions.push('😊');
            }
            if (negativeWords.some(n => word.includes(n))) {
                score -= 1;
                emotions.push('😠');
            }
        });

        return {
            sentiment: score > 0 ? 'positive' : score < 0 ? 'negative' : 'neutral',
            score: score,
            urgency: score < -1 ? 'عالي' : score < 0 ? 'متوسط' : 'عادي',
            emotions: [...new Set(emotions)]
        };
    };

    // فحص كلمة المرور
    const checkPassword = (pwd: string) => {
        const errors: string[] = [];
        let strength: 'weak' | 'medium' | 'strong' = 'weak';

        if (pwd.length < 8) errors.push('يجب أن تكون 8 أحرف على الأقل');
        if (!/[A-Z]/.test(pwd)) errors.push('يجب أن تحتوي على حرف كبير');
        if (!/[a-z]/.test(pwd)) errors.push('يجب أن تحتوي على حرف صغير');
        if (!/[0-9]/.test(pwd)) errors.push('يجب أن تحتوي على رقم');
        if (!/[!@#$%^&*]/.test(pwd)) errors.push('يجب أن تحتوي على رمز خاص');

        if (errors.length === 0) strength = 'strong';
        else if (errors.length <= 2) strength = 'medium';

        return { valid: errors.length === 0, errors, strength };
    };

    // تصنيف الشكوى
    const classifyTicket = (title: string) => {
        const departments: Record<string, string[]> = {
            'ضريبة الدخل': ['ضريبة', 'دخل', 'إقرار', 'تصريح'],
            'الرواتب والأجور': ['راتب', 'أجر', 'معاش', 'تعويض'],
            'الديوان العام': ['ديوان', 'إداري', 'رسمي'],
            'المعلوماتية': ['نظام', 'تقني', 'موقع', 'إلكتروني'],
            'الشكاوى والاستعلامات': ['شكوى', 'استعلام', 'سؤال']
        };

        let bestMatch = 'الشكاوى والاستعلامات';
        let maxScore = 0;

        Object.entries(departments).forEach(([dept, keywords]) => {
            const score = keywords.filter(k => title.includes(k)).length;
            if (score > maxScore) {
                maxScore = score;
                bestMatch = dept;
            }
        });

        const isUrgent = ['عاجل', 'طارئ', 'فوري', 'ضروري'].some(w => title.includes(w));

        return {
            department: bestMatch,
            priority: isUrgent ? 'high' : maxScore > 1 ? 'medium' : 'low',
            confidence: Math.min(0.5 + maxScore * 0.2, 0.95)
        };
    };

    const tabs = [
        { id: 'theme', label: 'الثيمات', icon: <FiDroplet /> },
        { id: 'toast', label: 'الإشعارات', icon: <FiAlertTriangle /> },
        { id: 'sentiment', label: 'تحليل المشاعر', icon: <FiSmile /> },
        { id: 'password', label: 'كلمة المرور', icon: <FiLock /> },
        { id: 'ai', label: 'الذكاء الاصطناعي', icon: <FiCpu /> },
    ];

    // ألوان الثيمات
    const themes = [
        { name: 'الأخضر السوري', primary: '#0f3c35' },
        { name: 'الأزرق الملكي', primary: '#1e3a8a' },
        { name: 'البنفسجي', primary: '#7c3aed' },
        { name: 'الأحمر', primary: '#dc2626' },
        { name: 'البرتقالي', primary: '#ea580c' },
        { name: 'الوردي', primary: '#db2777' },
    ];

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                {/* الإشعار */}
                {notification && (
                    <div className={`fixed top-4 left-4 right-4 md:left-auto md:right-4 md:w-80 p-4 rounded-lg shadow-lg z-50 ${notification.type === 'success' ? 'bg-green-500' :
                            notification.type === 'error' ? 'bg-red-500' :
                                notification.type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
                        } text-white`}>
                        {notification.message}
                    </div>
                )}

                {/* العنوان */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
                        🧪 تجربة التحسينات
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        جرب جميع الميزات الجديدة مباشرة
                    </p>
                </div>

                {/* التبويبات */}
                <div className="flex flex-wrap gap-2 mb-6 justify-center">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${activeTab === tab.id
                                    ? 'bg-blue-600 text-white shadow-lg'
                                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                        >
                            {tab.icon}
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* المحتوى */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">

                    {/* الثيمات */}
                    {activeTab === 'theme' && (
                        <div className="space-y-6">
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                <FiDroplet /> تخصيص الثيمات والألوان
                            </h2>

                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="p-4 border dark:border-gray-700 rounded-xl">
                                    <h3 className="font-semibold mb-4 dark:text-white">الوضع الداكن/الفاتح</h3>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => toggleDarkMode('light')}
                                            className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg ${!isDark ? 'ring-2 ring-yellow-500' : ''} bg-yellow-100 text-yellow-800 hover:bg-yellow-200`}
                                        >
                                            <FiSun /> فاتح
                                        </button>
                                        <button
                                            onClick={() => toggleDarkMode('dark')}
                                            className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg ${isDark ? 'ring-2 ring-gray-500' : ''} bg-gray-800 text-white hover:bg-gray-700`}
                                        >
                                            <FiMoon /> داكن
                                        </button>
                                        <button
                                            onClick={() => toggleDarkMode('auto')}
                                            className="flex-1 flex items-center justify-center gap-2 p-3 bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200"
                                        >
                                            <FiRefreshCw /> تلقائي
                                        </button>
                                    </div>
                                </div>

                                <div className="p-4 border dark:border-gray-700 rounded-xl">
                                    <h3 className="font-semibold mb-4 dark:text-white">ثيمات ألوان</h3>
                                    <div className="grid grid-cols-3 gap-2">
                                        {themes.map(theme => (
                                            <button
                                                key={theme.name}
                                                onClick={() => {
                                                    document.documentElement.style.setProperty('--primary-color', theme.primary);
                                                    showNotification(`تم تطبيق ${theme.name}`, 'success');
                                                }}
                                                className="p-3 rounded-lg text-white text-sm font-medium hover:opacity-90"
                                                style={{ backgroundColor: theme.primary }}
                                            >
                                                {theme.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* الإشعارات */}
                    {activeTab === 'toast' && (
                        <div className="space-y-6">
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                <FiAlertTriangle /> نظام الإشعارات
                            </h2>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <button
                                    onClick={() => showNotification('تم الحفظ بنجاح!', 'success')}
                                    className="p-4 bg-green-100 text-green-800 rounded-lg hover:bg-green-200 text-center"
                                >
                                    ✅ نجاح
                                </button>
                                <button
                                    onClick={() => showNotification('حدث خطأ!', 'error')}
                                    className="p-4 bg-red-100 text-red-800 rounded-lg hover:bg-red-200 text-center"
                                >
                                    ❌ خطأ
                                </button>
                                <button
                                    onClick={() => showNotification('تنبيه هام!', 'warning')}
                                    className="p-4 bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200 text-center"
                                >
                                    ⚠️ تحذير
                                </button>
                                <button
                                    onClick={() => showNotification('معلومة جديدة', 'info')}
                                    className="p-4 bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 text-center"
                                >
                                    ℹ️ معلومة
                                </button>
                            </div>
                        </div>
                    )}

                    {/* تحليل المشاعر */}
                    {activeTab === 'sentiment' && (
                        <div className="space-y-6">
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                <FiSmile /> تحليل المشاعر
                            </h2>

                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <textarea
                                        value={sentimentText}
                                        onChange={e => setSentimentText(e.target.value)}
                                        placeholder="اكتب نصاً لتحليل المشاعر..."
                                        className="w-full p-4 border dark:border-gray-700 rounded-lg h-32 dark:bg-gray-700 dark:text-white"
                                    />

                                    <button
                                        onClick={() => setSentimentResult(analyzeSentiment(sentimentText))}
                                        className="w-full p-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                                    >
                                        تحليل المشاعر 🔍
                                    </button>

                                    <div className="flex gap-2 flex-wrap">
                                        <button onClick={() => setSentimentText('أنا سعيد جداً بالخدمة الممتازة')} className="px-3 py-1 bg-green-100 text-green-800 rounded text-sm">إيجابي</button>
                                        <button onClick={() => setSentimentText('أنا غاضب من التأخير الكبير')} className="px-3 py-1 bg-red-100 text-red-800 rounded text-sm">سلبي</button>
                                        <button onClick={() => setSentimentText('أريد الاستعلام عن موضوع')} className="px-3 py-1 bg-gray-100 text-gray-800 rounded text-sm">محايد</button>
                                    </div>
                                </div>

                                {sentimentResult && (
                                    <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                                        <h3 className="font-semibold mb-4 dark:text-white">النتيجة:</h3>
                                        <div className={`p-4 rounded-lg text-center text-2xl font-bold mb-4 ${sentimentResult.sentiment === 'positive' ? 'bg-green-100 text-green-800' :
                                                sentimentResult.sentiment === 'negative' ? 'bg-red-100 text-red-800' :
                                                    'bg-gray-200 text-gray-800'
                                            }`}>
                                            {sentimentResult.sentiment === 'positive' ? '😊 إيجابي' :
                                                sentimentResult.sentiment === 'negative' ? '😠 سلبي' : '😐 محايد'}
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-sm">
                                            <div className="p-2 bg-white dark:bg-gray-600 rounded">
                                                <span className="text-gray-500 dark:text-gray-400">النتيجة:</span>
                                                <span className="font-bold mr-2 dark:text-white">{sentimentResult.score}</span>
                                            </div>
                                            <div className="p-2 bg-white dark:bg-gray-600 rounded">
                                                <span className="text-gray-500 dark:text-gray-400">الإلحاح:</span>
                                                <span className="font-bold mr-2 dark:text-white">{sentimentResult.urgency}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* كلمة المرور */}
                    {activeTab === 'password' && (
                        <div className="space-y-6">
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                <FiLock /> فحص قوة كلمة المرور
                            </h2>

                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <input
                                        type="text"
                                        value={password}
                                        onChange={e => {
                                            setPassword(e.target.value);
                                            setPasswordResult(checkPassword(e.target.value));
                                        }}
                                        placeholder="اكتب كلمة مرور للفحص..."
                                        className="w-full p-4 border dark:border-gray-700 rounded-lg text-lg dark:bg-gray-700 dark:text-white"
                                    />

                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                        <p>متطلبات كلمة المرور:</p>
                                        <ul className="list-disc mr-4 mt-2 space-y-1">
                                            <li>8 أحرف على الأقل</li>
                                            <li>حرف كبير + حرف صغير</li>
                                            <li>رقم واحد على الأقل</li>
                                            <li>رمز خاص (!@#$...)</li>
                                        </ul>
                                    </div>
                                </div>

                                {passwordResult && (
                                    <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                                        <div className="mb-4">
                                            <div className="flex justify-between mb-2">
                                                <span className="dark:text-white">القوة:</span>
                                                <span className={`font-bold ${passwordResult.strength === 'strong' ? 'text-green-600' :
                                                        passwordResult.strength === 'medium' ? 'text-yellow-600' : 'text-red-600'
                                                    }`}>
                                                    {passwordResult.strength === 'strong' ? 'قوية 💪' :
                                                        passwordResult.strength === 'medium' ? 'متوسطة 👍' : 'ضعيفة ⚠️'}
                                                </span>
                                            </div>
                                            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                                                <div className={`h-full transition-all ${passwordResult.strength === 'strong' ? 'bg-green-500 w-full' :
                                                        passwordResult.strength === 'medium' ? 'bg-yellow-500 w-2/3' : 'bg-red-500 w-1/3'
                                                    }`} />
                                            </div>
                                        </div>

                                        <div className={`p-3 rounded-lg ${passwordResult.valid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {passwordResult.valid ? (
                                                <span className="flex items-center gap-2"><FiCheckCircle /> كلمة المرور قوية!</span>
                                            ) : (
                                                <div>
                                                    <p className="font-bold mb-1">يجب إصلاح:</p>
                                                    <ul className="list-disc mr-4 text-sm">
                                                        {passwordResult.errors.map((err: string, i: number) => (
                                                            <li key={i}>{err}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* الذكاء الاصطناعي */}
                    {activeTab === 'ai' && (
                        <div className="space-y-6">
                            <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                                <FiCpu /> التصنيف الذكي للشكاوى
                            </h2>

                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <textarea
                                        value={ticketTitle}
                                        onChange={e => setTicketTitle(e.target.value)}
                                        placeholder="اكتب عنوان أو وصف الشكوى..."
                                        className="w-full p-4 border dark:border-gray-700 rounded-lg h-32 dark:bg-gray-700 dark:text-white"
                                    />

                                    <button
                                        onClick={() => setClassificationResult(classifyTicket(ticketTitle))}
                                        className="w-full p-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                                    >
                                        تصنيف تلقائي 🤖
                                    </button>

                                    <div className="flex gap-2 flex-wrap">
                                        <button onClick={() => setTicketTitle('استعلام عن ضريبة الدخل السنوية')} className="px-3 py-1 bg-blue-100 text-blue-800 rounded text-sm">ضرائب</button>
                                        <button onClick={() => setTicketTitle('مشكلة في الراتب الشهري')} className="px-3 py-1 bg-green-100 text-green-800 rounded text-sm">رواتب</button>
                                        <button onClick={() => setTicketTitle('شكوى عاجلة جداً')} className="px-3 py-1 bg-red-100 text-red-800 rounded text-sm">عاجل</button>
                                    </div>
                                </div>

                                {classificationResult && (
                                    <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-xl space-y-3">
                                        <h3 className="font-semibold dark:text-white">نتيجة التصنيف:</h3>
                                        <div className="p-3 bg-blue-100 text-blue-800 rounded-lg">
                                            <span className="text-sm">القسم:</span>
                                            <p className="font-bold text-lg">{classificationResult.department}</p>
                                        </div>
                                        <div className={`p-3 rounded-lg ${classificationResult.priority === 'high' ? 'bg-red-100 text-red-800' :
                                                classificationResult.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                                    'bg-green-100 text-green-800'
                                            }`}>
                                            <span className="text-sm">الأولوية:</span>
                                            <p className="font-bold text-lg">
                                                {classificationResult.priority === 'high' ? '🔴 عالية' :
                                                    classificationResult.priority === 'medium' ? '🟡 متوسطة' : '🟢 منخفضة'}
                                            </p>
                                        </div>
                                        <div className="p-3 bg-purple-100 text-purple-800 rounded-lg">
                                            <span className="text-sm">الثقة:</span>
                                            <p className="font-bold text-lg">{Math.round(classificationResult.confidence * 100)}%</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* رابط العودة */}
                <div className="text-center mt-8">
                    <a href="#/dashboard" className="text-blue-600 hover:underline dark:text-blue-400">
                        ← العودة للوحة التحكم
                    </a>
                </div>
            </div>
        </div>
    );
}
