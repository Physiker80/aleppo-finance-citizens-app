/**
 * التحليلات المتقدمة للمواعيد
 * Advanced Appointment Analytics
 */

import React, { useState, useMemo } from 'react';

// ==================== أنواع البيانات ====================

interface AppointmentAnalytics {
    id: string;
    date: string;
    time: string;
    status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no-show';
    serviceType: string;
    createdAt: string;
    citizenId?: string;
    waitTime?: number; // بالدقائق
}

interface KPI {
    id: string;
    label: string;
    value: number;
    target: number;
    unit: string;
    trend: 'up' | 'down' | 'stable';
    trendValue: number;
    color: string;
    icon: string;
}

interface TrendData {
    label: string;
    current: number;
    previous: number;
}

// ==================== الألوان ====================

const ANALYTICS_COLORS = {
    primary: '#0f3c35',
    secondary: '#1a5c4f',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#3b82f6',
    purple: '#8b5cf6'
};

// ==================== مكون مؤشر الأداء الرئيسي ====================

interface KPICardProps {
    kpi: KPI;
}

export const KPICard: React.FC<KPICardProps> = ({ kpi }) => {
    const progress = Math.min((kpi.value / kpi.target) * 100, 100);
    const isAchieved = kpi.value >= kpi.target;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 
                      border border-gray-100 dark:border-gray-700
                      hover:shadow-xl transition-all duration-300">
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                    <span className="text-2xl">{kpi.icon}</span>
                    <div>
                        <h3 className="text-sm text-gray-500 dark:text-gray-400">{kpi.label}</h3>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold" style={{ color: kpi.color }}>
                                {kpi.value}
                            </span>
                            <span className="text-sm text-gray-400">{kpi.unit}</span>
                        </div>
                    </div>
                </div>
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs
                              ${kpi.trend === 'up' ? 'bg-green-100 text-green-600' :
                        kpi.trend === 'down' ? 'bg-red-100 text-red-600' :
                            'bg-gray-100 text-gray-600'}`}>
                    {kpi.trend === 'up' ? '↑' : kpi.trend === 'down' ? '↓' : '→'}
                    {Math.abs(kpi.trendValue)}%
                </div>
            </div>

            {/* شريط التقدم */}
            <div className="space-y-2">
                <div className="flex justify-between text-xs">
                    <span className="text-gray-500">التقدم نحو الهدف</span>
                    <span className={isAchieved ? 'text-green-500' : 'text-gray-500'}>
                        {progress.toFixed(0)}%
                    </span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                            width: `${progress}%`,
                            backgroundColor: isAchieved ? ANALYTICS_COLORS.success : kpi.color
                        }}
                    />
                </div>
                <div className="text-xs text-gray-400">
                    الهدف: {kpi.target} {kpi.unit}
                </div>
            </div>
        </div>
    );
};

// ==================== مكون الرسم البياني الخطي ====================

interface LineChartProps {
    data: { label: string; value: number }[];
    title: string;
    color?: string;
    height?: number;
}

export const AppointmentLineChart: React.FC<LineChartProps> = ({
    data,
    title,
    color = ANALYTICS_COLORS.primary,
    height = 200
}) => {
    const maxValue = Math.max(...data.map(d => d.value), 1);
    const minValue = Math.min(...data.map(d => d.value), 0);
    const range = maxValue - minValue || 1;

    // إنشاء نقاط الخط
    const points = data.map((item, index) => {
        const x = (index / (data.length - 1)) * 100;
        const y = 100 - ((item.value - minValue) / range) * 100;
        return `${x},${y}`;
    }).join(' ');

    // إنشاء منطقة التعبئة
    const areaPoints = `0,100 ${points} 100,100`;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 
                      border border-gray-100 dark:border-gray-700">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">{title}</h3>
            <div className="relative" style={{ height }}>
                <svg
                    className="w-full h-full"
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                >
                    {/* خطوط الشبكة */}
                    {[0, 25, 50, 75, 100].map((y) => (
                        <line
                            key={y}
                            x1="0"
                            y1={y}
                            x2="100"
                            y2={y}
                            stroke="#e5e7eb"
                            strokeWidth="0.2"
                            className="dark:stroke-gray-700"
                        />
                    ))}

                    {/* منطقة التعبئة */}
                    <polygon
                        points={areaPoints}
                        fill={`${color}20`}
                    />

                    {/* الخط */}
                    <polyline
                        points={points}
                        fill="none"
                        stroke={color}
                        strokeWidth="0.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />

                    {/* النقاط */}
                    {data.map((item, index) => {
                        const x = (index / (data.length - 1)) * 100;
                        const y = 100 - ((item.value - minValue) / range) * 100;
                        return (
                            <circle
                                key={index}
                                cx={x}
                                cy={y}
                                r="1.5"
                                fill="white"
                                stroke={color}
                                strokeWidth="0.5"
                                className="cursor-pointer hover:r-2"
                            />
                        );
                    })}
                </svg>

                {/* التسميات */}
                <div className="flex justify-between mt-2">
                    {data.map((item, index) => (
                        <span key={index} className="text-xs text-gray-400">
                            {item.label}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
};

// ==================== مكون المقارنة ====================

interface ComparisonCardProps {
    title: string;
    current: number;
    previous: number;
    unit?: string;
    icon: string;
}

export const ComparisonCard: React.FC<ComparisonCardProps> = ({
    title,
    current,
    previous,
    unit = '',
    icon
}) => {
    const change = previous > 0 ? ((current - previous) / previous) * 100 : 0;
    const isPositive = change >= 0;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 
                      border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">{icon}</span>
                <h3 className="text-sm text-gray-500 dark:text-gray-400">{title}</h3>
            </div>
            <div className="flex items-end justify-between">
                <div>
                    <p className="text-3xl font-bold text-gray-800 dark:text-white">
                        {current}
                        <span className="text-sm text-gray-400 mr-1">{unit}</span>
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                        السابق: {previous} {unit}
                    </p>
                </div>
                <div className={`flex items-center gap-1 px-3 py-2 rounded-lg
                              ${isPositive ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                    <svg className={`w-4 h-4 ${!isPositive && 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                    <span className="text-sm font-medium">{Math.abs(change).toFixed(1)}%</span>
                </div>
            </div>
        </div>
    );
};

// ==================== مكون التقرير المفصل ====================

interface DetailedReportProps {
    appointments: AppointmentAnalytics[];
    title?: string;
}

export const DetailedReport: React.FC<DetailedReportProps> = ({
    appointments,
    title = 'التقرير المفصل'
}) => {
    const [sortBy, setSortBy] = useState<'date' | 'status' | 'service'>('date');
    const [filterStatus, setFilterStatus] = useState<string>('all');

    const filteredAppointments = useMemo(() => {
        let result = [...appointments];

        if (filterStatus !== 'all') {
            result = result.filter(a => a.status === filterStatus);
        }

        result.sort((a, b) => {
            switch (sortBy) {
                case 'date':
                    return new Date(b.date).getTime() - new Date(a.date).getTime();
                case 'status':
                    return a.status.localeCompare(b.status);
                case 'service':
                    return a.serviceType.localeCompare(b.serviceType);
                default:
                    return 0;
            }
        });

        return result;
    }, [appointments, sortBy, filterStatus]);

    const statusOptions = [
        { value: 'all', label: 'الكل' },
        { value: 'pending', label: 'قيد الانتظار' },
        { value: 'confirmed', label: 'مؤكد' },
        { value: 'completed', label: 'مكتمل' },
        { value: 'cancelled', label: 'ملغى' },
        { value: 'no-show', label: 'لم يحضر' }
    ];

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg 
                      border border-gray-100 dark:border-gray-700 overflow-hidden">
            {/* الهيدر */}
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 
                          flex flex-wrap items-center justify-between gap-4">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white">{title}</h3>
                <div className="flex items-center gap-4">
                    {/* فلتر الحالة */}
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm
                                 border-0 focus:ring-2 focus:ring-[#0f3c35]"
                    >
                        {statusOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>

                    {/* الترتيب */}
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as 'date' | 'status' | 'service')}
                        className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm
                                 border-0 focus:ring-2 focus:ring-[#0f3c35]"
                    >
                        <option value="date">ترتيب بالتاريخ</option>
                        <option value="status">ترتيب بالحالة</option>
                        <option value="service">ترتيب بالخدمة</option>
                    </select>

                    {/* زر التصدير */}
                    <button
                        onClick={() => {
                            const csv = [
                                ['رقم الموعد', 'التاريخ', 'الوقت', 'الخدمة', 'الحالة'].join(','),
                                ...filteredAppointments.map(a =>
                                    [a.id, a.date, a.time, a.serviceType, a.status].join(',')
                                )
                            ].join('\n');

                            const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
                            const url = URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = 'appointments_report.csv';
                            link.click();
                        }}
                        className="px-4 py-2 bg-[#0f3c35] text-white rounded-lg text-sm
                                 hover:bg-[#1a5c4f] transition-colors flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        تصدير CSV
                    </button>
                </div>
            </div>

            {/* عداد النتائج */}
            <div className="px-6 py-2 bg-gray-50 dark:bg-gray-900/50 text-sm text-gray-500">
                عدد النتائج: {filteredAppointments.length} من {appointments.length}
            </div>

            {/* الجدول */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-900/50">
                        <tr>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">#</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">رقم الموعد</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">التاريخ</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">الوقت</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">الخدمة</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">الحالة</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">وقت الانتظار</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {filteredAppointments.slice(0, 20).map((apt, index) => (
                            <tr key={apt.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/30">
                                <td className="px-4 py-3 text-sm text-gray-400">{index + 1}</td>
                                <td className="px-4 py-3 text-sm font-mono text-gray-800 dark:text-gray-200">{apt.id}</td>
                                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{apt.date}</td>
                                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{apt.time}</td>
                                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{apt.serviceType}</td>
                                <td className="px-4 py-3">
                                    <StatusBadge status={apt.status} />
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                                    {apt.waitTime ? `${apt.waitTime} دقيقة` : '-'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// مكون شارة الحالة
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const styles: Record<string, { bg: string; text: string; label: string }> = {
        pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'قيد الانتظار' },
        confirmed: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'مؤكد' },
        completed: { bg: 'bg-green-100', text: 'text-green-700', label: 'مكتمل' },
        cancelled: { bg: 'bg-red-100', text: 'text-red-700', label: 'ملغى' },
        'no-show': { bg: 'bg-gray-100', text: 'text-gray-700', label: 'لم يحضر' }
    };

    const style = styles[status] || styles.pending;

    return (
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
            {style.label}
        </span>
    );
};

// ==================== مكون التحليلات الشاملة ====================

interface AppointmentAnalyticsPageProps {
    appointments?: AppointmentAnalytics[];
}

export const AppointmentAnalyticsPage: React.FC<AppointmentAnalyticsPageProps> = ({
    appointments = []
}) => {
    // حساب مؤشرات الأداء
    const kpis = useMemo((): KPI[] => {
        const total = appointments.length;
        const completed = appointments.filter(a => a.status === 'completed').length;
        const noShow = appointments.filter(a => a.status === 'no-show').length;
        const cancelled = appointments.filter(a => a.status === 'cancelled').length;
        const avgWait = appointments.reduce((sum, a) => sum + (a.waitTime || 0), 0) / (total || 1);

        return [
            {
                id: '1',
                label: 'معدل الإنجاز',
                value: total ? Math.round((completed / total) * 100) : 0,
                target: 85,
                unit: '%',
                trend: 'up',
                trendValue: 5,
                color: ANALYTICS_COLORS.success,
                icon: '✅'
            },
            {
                id: '2',
                label: 'معدل الحضور',
                value: total ? Math.round(((total - noShow) / total) * 100) : 100,
                target: 90,
                unit: '%',
                trend: 'up',
                trendValue: 3,
                color: ANALYTICS_COLORS.info,
                icon: '👥'
            },
            {
                id: '3',
                label: 'متوسط الانتظار',
                value: Math.round(avgWait),
                target: 15,
                unit: 'دقيقة',
                trend: 'down',
                trendValue: 10,
                color: ANALYTICS_COLORS.warning,
                icon: '⏱️'
            },
            {
                id: '4',
                label: 'معدل الإلغاء',
                value: total ? Math.round((cancelled / total) * 100) : 0,
                target: 10,
                unit: '%',
                trend: 'down',
                trendValue: 2,
                color: ANALYTICS_COLORS.danger,
                icon: '❌'
            }
        ];
    }, [appointments]);

    // بيانات الرسم البياني الخطي (آخر 7 أيام)
    const weeklyData = useMemo(() => {
        const days = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
        return days.map(day => ({
            label: day,
            value: Math.floor(Math.random() * 20) + 5 // بيانات تجريبية
        }));
    }, []);

    return (
        <div className="space-y-6">
            {/* العنوان */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white">التحليلات المتقدمة</h2>
                    <p className="text-sm text-gray-500">إحصائيات ومؤشرات أداء نظام المواعيد</p>
                </div>
                <button
                    onClick={() => window.print()}
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300
                             rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors
                             flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    طباعة التقرير
                </button>
            </div>

            {/* مؤشرات الأداء */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {kpis.map(kpi => (
                    <KPICard key={kpi.id} kpi={kpi} />
                ))}
            </div>

            {/* الرسوم البيانية */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <AppointmentLineChart
                    data={weeklyData}
                    title="المواعيد خلال الأسبوع"
                    color={ANALYTICS_COLORS.primary}
                />
                <div className="grid grid-cols-2 gap-4">
                    <ComparisonCard
                        title="المواعيد هذا الأسبوع"
                        current={appointments.length}
                        previous={Math.floor(appointments.length * 0.8)}
                        icon="📅"
                    />
                    <ComparisonCard
                        title="المكتملة"
                        current={appointments.filter(a => a.status === 'completed').length}
                        previous={Math.floor(appointments.filter(a => a.status === 'completed').length * 0.9)}
                        icon="✓"
                    />
                    <ComparisonCard
                        title="الملغاة"
                        current={appointments.filter(a => a.status === 'cancelled').length}
                        previous={Math.floor(appointments.filter(a => a.status === 'cancelled').length * 1.2)}
                        icon="✗"
                    />
                    <ComparisonCard
                        title="متوسط الانتظار"
                        current={12}
                        previous={15}
                        unit="دقيقة"
                        icon="⏱️"
                    />
                </div>
            </div>

            {/* التقرير المفصل */}
            <DetailedReport appointments={appointments} />
        </div>
    );
};

export default AppointmentAnalyticsPage;
