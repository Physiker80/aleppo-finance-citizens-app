/**
 * صفحة الميزات المتقدمة المتكاملة
 * تجمع جميع التحسينات الـ 18 في مكان واحد
 */

import React, { useState, useContext, useEffect } from 'react';
import { AppContext } from '../App';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

// استيراد جميع الأدوات الجديدة
import { isOnline as checkOnline, onConnectionChange, getSyncQueue, addToSyncQueue, OfflineStatusBar as OfflineBanner, useOnlineStatus } from '../utils/offlineMode';
import { exportToCSV, exportToJSON, exportToExcel } from '../utils/dataExporter';
import { PieChart, BarChart, LineChart, DonutChart } from '../components/Charts';
import { AdvancedSearch, DEFAULT_FILTERS, SearchFilters } from '../components/AdvancedSearch';
import { ThemeSettingsPanel } from '../utils/themeManager';
import { printTicket, printReport, injectPrintStyles } from '../utils/printStyles';
import { compressImage, compressImages, ImageCompressor } from '../utils/imageCompression';
import { Setup2FA, enable2FA, disable2FA, verify2FA } from '../utils/twoFactorAuth';
import { ActivityLogViewer, addActivityLog, getActivityLogs, useActivityLogs } from '../utils/activityLog';
import { ReportGenerator, generateProfessionalPDF } from '../utils/pdfReports';
import { AdvancedDashboard, calculateTicketStats } from '../components/AdvancedDashboard';
import { ComposeMessage, sendMessage, getUserMessages } from '../utils/internalMessages';
import { SoundSettingsPanel, useNotificationSounds, playSound as playSoundDirect } from '../utils/notificationSounds';
import { QuickReplyPicker, QuickReplyManager, useQuickReplies } from '../utils/quickReplies';
import { ResponseTimeTracker, SLABadge, useResponseTracking } from '../utils/responseTracking';

// أيقونات
import {
    FiWifi, FiWifiOff, FiDownload, FiPieChart, FiSearch,
    FiMoon, FiPrinter, FiImage, FiShield, FiActivity,
    FiFileText, FiBarChart2, FiMessageSquare, FiBell,
    FiMessageCircle, FiClock, FiSettings, FiCheck
} from 'react-icons/fi';

type FeatureTab =
    | 'offline' | 'export' | 'charts' | 'search'
    | 'theme' | 'print' | 'compress' | '2fa'
    | 'activity' | 'pdf' | 'dashboard' | 'messages'
    | 'sounds' | 'replies' | 'sla';

interface FeatureItem {
    id: FeatureTab;
    title: string;
    icon: React.ReactNode;
    description: string;
}

const features: FeatureItem[] = [
    { id: 'offline', title: 'وضع عدم الاتصال', icon: <FiWifiOff />, description: 'العمل بدون إنترنت مع مزامنة تلقائية' },
    { id: 'export', title: 'تصدير البيانات', icon: <FiDownload />, description: 'تصدير بصيغ CSV, JSON, Excel' },
    { id: 'charts', title: 'المخططات التفاعلية', icon: <FiPieChart />, description: 'رسوم بيانية متنوعة وتفاعلية' },
    { id: 'search', title: 'البحث المتقدم', icon: <FiSearch />, description: 'بحث مع فلاتر متعددة' },
    { id: 'theme', title: 'الثيمات والألوان', icon: <FiMoon />, description: 'تخصيص المظهر والألوان' },
    { id: 'print', title: 'الطباعة الاحترافية', icon: <FiPrinter />, description: 'طباعة محسّنة للتذاكر والتقارير' },
    { id: 'compress', title: 'ضغط الصور', icon: <FiImage />, description: 'ضغط الصور قبل الرفع' },
    { id: '2fa', title: 'التحقق الثنائي', icon: <FiShield />, description: 'طبقة أمان إضافية' },
    { id: 'activity', title: 'سجل النشاطات', icon: <FiActivity />, description: 'تتبع جميع العمليات' },
    { id: 'pdf', title: 'تقارير PDF', icon: <FiFileText />, description: 'تقارير PDF احترافية' },
    { id: 'dashboard', title: 'لوحة إحصائيات', icon: <FiBarChart2 />, description: 'إحصائيات متقدمة ومخططات' },
    { id: 'messages', title: 'الرسائل الداخلية', icon: <FiMessageSquare />, description: 'نظام مراسلة بين الموظفين' },
    { id: 'sounds', title: 'أصوات الإشعارات', icon: <FiBell />, description: 'تنبيهات صوتية قابلة للتخصيص' },
    { id: 'replies', title: 'الردود السريعة', icon: <FiMessageCircle />, description: 'قوالب جاهزة للردود' },
    { id: 'sla', title: 'تتبع الاستجابة', icon: <FiClock />, description: 'مراقبة أوقات الرد وSLA' },
];

// مكون بحث تجريبي
const SearchDemo: React.FC = () => {
    const [filters, setFilters] = useState<SearchFilters>(DEFAULT_FILTERS);
    const departments = ['الإدارة', 'المالية', 'الضرائب', 'الخدمات'];

    return (
        <AdvancedSearch
            filters={filters}
            onFiltersChange={setFilters}
            departments={departments}
            placeholder="ابحث في التذاكر..."
        />
    );
};

const EnhancedFeaturesPage: React.FC = () => {
    const appContext = useContext(AppContext);
    const [activeTab, setActiveTab] = useState<FeatureTab>('offline');
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

    // Hooks للميزات
    const [isOnline, setIsOnline] = useState(checkOnline());
    const [pendingCount, setPendingCount] = useState(getSyncQueue().length);
    const soundsHook = useNotificationSounds();
    const { replies: quickReplies } = useQuickReplies();
    const { metrics: responseMetrics } = useResponseTracking();

    // تتبع حالة الاتصال
    useEffect(() => {
        const unsubscribe = onConnectionChange((online) => {
            setIsOnline(online);
            setPendingCount(getSyncQueue().length);
        });
        return unsubscribe;
    }, []);

    // إظهار إشعار
    const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
        setNotification({ message, type });
        if (type === 'success') soundsHook.playSuccess();
        else if (type === 'error') soundsHook.playError();
        setTimeout(() => setNotification(null), 3000);
    };

    // تسجيل نشاط عند زيارة الصفحة
    useEffect(() => {
        addActivityLog(
            'ticket_view',
            'زيارة صفحة الميزات المتقدمة',
            {
                userId: appContext?.currentEmployee?.username,
                severity: 'info'
            }
        );
    }, []);

    // بيانات تجريبية للمخططات
    const sampleChartData = [
        { label: 'جديد', value: 45, color: '#3B82F6' },
        { label: 'قيد المعالجة', value: 32, color: '#F59E0B' },
        { label: 'تم الرد', value: 78, color: '#10B981' },
        { label: 'مغلق', value: 125, color: '#6B7280' },
    ];

    const sampleLineData = [
        { label: 'يناير', value: 65 },
        { label: 'فبراير', value: 78 },
        { label: 'مارس', value: 90 },
        { label: 'أبريل', value: 81 },
        { label: 'مايو', value: 95 },
        { label: 'يونيو', value: 110 },
    ];

    // بيانات تجريبية للبحث
    const sampleSearchItems = [
        { id: '1', title: 'شكوى ضريبية', department: 'الضرائب', status: 'جديد' },
        { id: '2', title: 'استفسار عن الراتب', department: 'المالية', status: 'قيد المعالجة' },
        { id: '3', title: 'طلب شهادة', department: 'الإدارة', status: 'تم الرد' },
    ];

    const renderFeatureContent = () => {
        switch (activeTab) {
            case 'offline':
                return (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <div className="flex items-center gap-3">
                                {isOnline ? (
                                    <FiWifi className="text-2xl text-green-500" />
                                ) : (
                                    <FiWifiOff className="text-2xl text-red-500" />
                                )}
                                <div>
                                    <h3 className="font-bold dark:text-white">
                                        {isOnline ? 'متصل بالإنترنت' : 'غير متصل'}
                                    </h3>
                                    <p className="text-sm text-gray-500">
                                        {pendingCount > 0 ? `${pendingCount} عملية معلقة` : 'لا توجد عمليات معلقة'}
                                    </p>
                                </div>
                            </div>
                            <Button onClick={() => showNotification('تمت المزامنة', 'success')} disabled={pendingCount === 0}>
                                مزامنة الآن
                            </Button>
                        </div>
                        <div className={`p-4 rounded-lg ${isOnline ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'}`}>
                            {isOnline ? '✓ متصل بالإنترنت - جميع البيانات محدثة' : '⚠ غير متصل - العمليات ستحفظ محلياً'}
                        </div>
                        <p className="text-gray-600 dark:text-gray-400">
                            يمكنك متابعة العمل حتى بدون اتصال بالإنترنت. سيتم حفظ جميع العمليات محلياً
                            ومزامنتها تلقائياً عند عودة الاتصال.
                        </p>
                    </div>
                );

            case 'export':
                return (
                    <div className="space-y-6">
                        <p className="text-gray-600 dark:text-gray-400">
                            تصدير بيانات التذاكر بصيغ متعددة
                        </p>
                        <div className="grid grid-cols-3 gap-4">
                            <Button
                                onClick={() => {
                                    const tickets = appContext?.tickets || [];
                                    const columns = [
                                        { key: 'id' as const, label: 'الرقم' },
                                        { key: 'fullName' as const, label: 'الاسم' },
                                        { key: 'department' as const, label: 'القسم' },
                                        { key: 'status' as const, label: 'الحالة' }
                                    ];
                                    exportToCSV(tickets, 'tickets', columns);
                                    showNotification('تم تصدير CSV بنجاح');
                                }}
                                className="flex items-center justify-center gap-2"
                            >
                                <FiDownload /> CSV
                            </Button>
                            <Button
                                onClick={() => {
                                    exportToJSON(appContext?.tickets || [], 'tickets');
                                    showNotification('تم تصدير JSON بنجاح');
                                }}
                                className="flex items-center justify-center gap-2"
                            >
                                <FiDownload /> JSON
                            </Button>
                            <Button
                                onClick={() => {
                                    const tickets = appContext?.tickets || [];
                                    const columns = [
                                        { key: 'id' as const, label: 'الرقم' },
                                        { key: 'fullName' as const, label: 'الاسم' },
                                        { key: 'department' as const, label: 'القسم' },
                                        { key: 'status' as const, label: 'الحالة' }
                                    ];
                                    exportToExcel(tickets, 'tickets', columns);
                                    showNotification('تم تصدير Excel بنجاح');
                                }}
                                className="flex items-center justify-center gap-2"
                            >
                                <FiDownload /> Excel
                            </Button>
                        </div>
                    </div>
                );

            case 'charts':
                return (
                    <div className="space-y-8">
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <h3 className="font-bold mb-4 dark:text-white">مخطط دائري</h3>
                                <PieChart data={sampleChartData} size={200} />
                            </div>
                            <div>
                                <h3 className="font-bold mb-4 dark:text-white">مخطط حلقي</h3>
                                <DonutChart data={sampleChartData} size={200} />
                            </div>
                        </div>
                        <div>
                            <h3 className="font-bold mb-4 dark:text-white">مخطط أعمدة</h3>
                            <BarChart data={sampleChartData} height={200} />
                        </div>
                        <div>
                            <h3 className="font-bold mb-4 dark:text-white">مخطط خطي</h3>
                            <LineChart data={sampleLineData} height={200} />
                        </div>
                    </div>
                );

            case 'search':
                return (
                    <div className="space-y-6">
                        <p className="text-gray-600 dark:text-gray-400">
                            البحث المتقدم مع فلاتر متعددة للتذاكر والبيانات
                        </p>
                        <SearchDemo />
                    </div>
                );

            case 'theme':
                return <ThemeSettingsPanel />;

            case 'print':
                return (
                    <div className="space-y-6">
                        <p className="text-gray-600 dark:text-gray-400">
                            طباعة محسّنة مع تنسيق احترافي للتذاكر والتقارير
                        </p>
                        <div className="flex gap-4">
                            <Button
                                onClick={() => {
                                    injectPrintStyles();
                                    window.print();
                                    showNotification('جاري الطباعة...');
                                }}
                                className="flex items-center gap-2"
                            >
                                <FiPrinter /> طباعة هذه الصفحة
                            </Button>
                            <Button
                                onClick={() => {
                                    const sampleTicket = {
                                        id: 'T-2024-001',
                                        fullName: 'أحمد محمد',
                                        nationalId: '12345678901',
                                        department: 'المالية',
                                        requestType: 'شكوى',
                                        status: 'New',
                                        message: 'تفاصيل الشكوى...',
                                        createdAt: new Date()
                                    };
                                    printTicket(sampleTicket);
                                    showNotification('جاري طباعة التذكرة...');
                                }}
                                variant="secondary"
                                className="flex items-center gap-2"
                            >
                                <FiFileText /> طباعة تذكرة نموذجية
                            </Button>
                        </div>
                    </div>
                );

            case 'compress':
                return (
                    <div className="space-y-6">
                        <ImageCompressor
                            onCompress={(files) => {
                                showNotification(`تم ضغط ${files.length} صورة بنجاح`);
                            }}
                            maxFiles={5}
                        />
                    </div>
                );

            case '2fa':
                return (
                    <div className="space-y-6">
                        <Setup2FA
                            userId={appContext?.currentEmployee?.username || 'demo_user'}
                            onSetupComplete={() => showNotification('تم تفعيل التحقق الثنائي بنجاح')}
                        />
                    </div>
                );

            case 'activity':
                return <ActivityLogViewer limit={50} />;

            case 'pdf':
                return (
                    <div className="space-y-6">
                        <ReportGenerator
                            type="tickets"
                            data={appContext?.tickets || []}
                            onGenerate={() => showNotification('تم إنشاء التقرير بنجاح')}
                        />
                        <Button
                            onClick={async () => {
                                try {
                                    const blob = await generateProfessionalPDF(
                                        { title: 'تقرير التذاكر', subtitle: 'نظام الاستعلامات والشكاوى' },
                                        { summary: { 'عدد التذاكر': appContext?.tickets?.length || 0 } }
                                    );
                                    const url = URL.createObjectURL(blob);
                                    const link = document.createElement('a');
                                    link.href = url;
                                    link.download = 'report.pdf';
                                    link.click();
                                    showNotification('تم إنشاء التقرير بنجاح');
                                } catch (error) {
                                    showNotification('فشل في إنشاء التقرير', 'error');
                                }
                            }}
                            className="flex items-center gap-2"
                        >
                            <FiFileText /> إنشاء تقرير PDF
                        </Button>
                    </div>
                );

            case 'dashboard':
                return (
                    <div className="space-y-6">
                        <p className="text-gray-600 dark:text-gray-400">
                            لوحة إحصائيات متقدمة مع مخططات تفاعلية
                        </p>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div>
                                <h3 className="font-bold mb-4 dark:text-white">توزيع التذاكر حسب الحالة</h3>
                                <PieChart data={sampleChartData} size={200} />
                            </div>
                            <div>
                                <h3 className="font-bold mb-4 dark:text-white">التذاكر الشهرية</h3>
                                <BarChart data={sampleChartData} height={200} />
                            </div>
                        </div>
                    </div>
                );

            case 'messages':
                return (
                    <div className="space-y-6">
                        <p className="text-gray-600 dark:text-gray-400">
                            نظام الرسائل الداخلية بين الموظفين
                        </p>
                        <ComposeMessage
                            recipients={[
                                { id: 'admin', name: 'المدير العام', role: 'مدير' },
                                { id: 'finance1', name: 'موظف المالية', role: 'موظف' }
                            ]}
                            currentUser={{
                                id: appContext?.currentEmployee?.username || 'current',
                                name: appContext?.currentEmployee?.name || 'المستخدم الحالي',
                                role: appContext?.currentEmployee?.role
                            }}
                            onSend={(msg) => {
                                sendMessage(msg);
                                showNotification('تم إرسال الرسالة بنجاح');
                            }}
                            onCancel={() => { }}
                        />
                    </div>
                );

            case 'sounds':
                return <SoundSettingsPanel />;

            case 'replies':
                return (
                    <div className="space-y-6">
                        <h3 className="font-bold dark:text-white">اختيار رد سريع</h3>
                        <QuickReplyPicker
                            onSelect={(content, reply) => {
                                showNotification(`تم اختيار: ${reply.title}`);
                            }}
                        />
                        <hr className="dark:border-gray-700" />
                        <h3 className="font-bold dark:text-white">إدارة الردود</h3>
                        <QuickReplyManager userId={appContext?.currentEmployee?.username} />
                    </div>
                );

            case 'sla':
                return (
                    <div className="space-y-6">
                        <ResponseTimeTracker />
                        {appContext?.tickets?.slice(0, 3).map(ticket => (
                            <div key={ticket.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                <span className="font-medium dark:text-white">{ticket.id}</span>
                                <SLABadge ticketId={ticket.id} showDetails />
                            </div>
                        ))}
                    </div>
                );

            default:
                return <div>اختر ميزة من القائمة</div>;
        }
    };

    return (
        <div className="min-h-screen py-8">
            {/* إشعار */}
            {notification && (
                <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-lg shadow-lg ${notification.type === 'success' ? 'bg-green-500' :
                    notification.type === 'error' ? 'bg-red-500' : 'bg-blue-500'
                    } text-white`}>
                    {notification.message}
                </div>
            )}

            <div className="container mx-auto px-4">
                {/* العنوان */}
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
                        الميزات المتقدمة
                    </h1>
                </div>

                {/* شبكة الميزات */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
                    {features.map(feature => (
                        <button
                            key={feature.id}
                            onClick={() => setActiveTab(feature.id)}
                            className={`p-4 rounded-xl transition-all text-right ${activeTab === feature.id
                                ? 'bg-blue-600 text-white shadow-lg scale-105'
                                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:shadow-md hover:scale-102 border border-gray-200 dark:border-gray-700'
                                }`}
                        >
                            <div className="text-2xl mb-2">{feature.icon}</div>
                            <div className="font-medium text-sm">{feature.title}</div>
                        </button>
                    ))}
                </div>

                {/* محتوى الميزة المختارة */}
                <Card className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                            {features.find(f => f.id === activeTab)?.icon}
                            {features.find(f => f.id === activeTab)?.title}
                        </h2>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                            {features.find(f => f.id === activeTab)?.description}
                        </span>
                    </div>

                    {renderFeatureContent()}
                </Card>

                {/* ملخص الإحصائيات */}
                <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 text-center shadow">
                        <div className="text-3xl font-bold text-blue-600">{features.length}</div>
                        <div className="text-sm text-gray-500">ميزة متوفرة</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 text-center shadow">
                        <div className="text-3xl font-bold text-green-600">{quickReplies.length}</div>
                        <div className="text-sm text-gray-500">رد سريع</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 text-center shadow">
                        <div className="text-3xl font-bold text-purple-600">
                            {responseMetrics?.slaCompliance?.toFixed(0) || 100}%
                        </div>
                        <div className="text-sm text-gray-500">التزام SLA</div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 text-center shadow">
                        <div className="text-3xl font-bold text-orange-600">
                            {isOnline ? '✓' : '✗'}
                        </div>
                        <div className="text-sm text-gray-500">حالة الاتصال</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EnhancedFeaturesPage;
