/**
 * لوحة تحكم المواعيد للمدراء والموظفين
 * Appointment Dashboard for Administrators
 */

import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '../App';
import {
    Appointment,
    AppointmentStatus,
    ServiceCategory,
    AppointmentPriority,
    Counter,
    AppointmentStats,
    QueueEntry,
    SERVICE_LABELS,
    STATUS_LABELS,
    PRIORITY_LABELS,
    STATUS_COLORS,
    PRIORITY_COLORS,
    BlockedSlot,
    BlockedReason,
    BLOCKED_REASON_LABELS,
    UpcomingHourReport,
    ExpectedVisitor
} from '../types/appointment';
import {
    getAppointments,
    getAppointmentsByDate,
    getAppointmentStats,
    getQueue,
    getCounters,
    saveCounters,
    checkInAppointment,
    callNextInQueue,
    completeAppointment,
    cancelAppointment,
    updateAppointment,
    getUpcomingVisitors,
    getDailyVisitorReport,
    getBlockedSlots,
    addBlockedSlot,
    removeBlockedSlot,
    runScheduledTasks
} from '../utils/appointmentManager';
import { QRScanner } from '../utils/appointmentQR';

// ==================== مكونات فرعية ====================

// بطاقة الإحصائيات
interface StatCardProps {
    title: string;
    value: number | string;
    icon: string;
    color: string;
    trend?: { value: number; isUp: boolean };
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, trend }) => (
    <div className={`${color} rounded-2xl p-6 text-white shadow-lg`}>
        <div className="flex items-start justify-between">
            <div>
                <p className="text-sm opacity-80">{title}</p>
                <p className="text-3xl font-bold mt-1">{value}</p>
                {trend && (
                    <p className={`text-sm mt-2 ${trend.isUp ? 'text-green-300' : 'text-red-300'}`}>
                        {trend.isUp ? '↑' : '↓'} {trend.value}% مقارنة بالأمس
                    </p>
                )}
            </div>
            <span className="text-4xl opacity-80">{icon}</span>
        </div>
    </div>
);

// جدول المواعيد
interface AppointmentTableProps {
    appointments: Appointment[];
    onAction: (appointment: Appointment, action: 'checkin' | 'call' | 'complete' | 'cancel') => void;
}

const AppointmentTable: React.FC<AppointmentTableProps> = ({ appointments, onAction }) => {
    if (appointments.length === 0) {
        return (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <span className="text-4xl block mb-4">📭</span>
                لا توجد مواعيد
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">رقم</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">الاسم</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">الخدمة</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">الوقت</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">الحالة</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">الأولوية</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">الإجراءات</th>
                    </tr>
                </thead>
                <tbody>
                    {appointments.map((apt) => (
                        <tr key={apt.id} className="border-b border-gray-100 dark:border-gray-800 
                                                   hover:bg-gray-50 dark:hover:bg-gray-800/50">
                            <td className="py-3 px-4 font-mono text-[#0f3c35] dark:text-emerald-400">
                                {apt.id}
                            </td>
                            <td className="py-3 px-4 font-medium text-gray-800 dark:text-white">
                                {apt.fullName}
                            </td>
                            <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
                                {SERVICE_LABELS[apt.serviceCategory]}
                            </td>
                            <td className="py-3 px-4 text-gray-600 dark:text-gray-300" dir="ltr">
                                {apt.timeSlot.startTime}
                            </td>
                            <td className="py-3 px-4">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium
                                                ${STATUS_COLORS[apt.status]}`}>
                                    {STATUS_LABELS[apt.status]}
                                </span>
                            </td>
                            <td className="py-3 px-4">
                                {apt.priority !== AppointmentPriority.Normal && (
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium
                                                    ${PRIORITY_COLORS[apt.priority]}`}>
                                        {PRIORITY_LABELS[apt.priority]}
                                    </span>
                                )}
                            </td>
                            <td className="py-3 px-4">
                                <div className="flex gap-2">
                                    {apt.status === AppointmentStatus.Confirmed && (
                                        <button
                                            onClick={() => onAction(apt, 'checkin')}
                                            className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 
                                                     text-blue-600 dark:text-blue-400 rounded text-xs
                                                     hover:bg-blue-200 dark:hover:bg-blue-900/50"
                                        >
                                            تسجيل وصول
                                        </button>
                                    )}
                                    {apt.status === AppointmentStatus.CheckedIn && (
                                        <button
                                            onClick={() => onAction(apt, 'call')}
                                            className="px-2 py-1 bg-green-100 dark:bg-green-900/30 
                                                     text-green-600 dark:text-green-400 rounded text-xs
                                                     hover:bg-green-200 dark:hover:bg-green-900/50"
                                        >
                                            مناداة
                                        </button>
                                    )}
                                    {apt.status === AppointmentStatus.InProgress && (
                                        <button
                                            onClick={() => onAction(apt, 'complete')}
                                            className="px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 
                                                     text-emerald-600 dark:text-emerald-400 rounded text-xs
                                                     hover:bg-emerald-200 dark:hover:bg-emerald-900/50"
                                        >
                                            إنهاء
                                        </button>
                                    )}
                                    {(apt.status === AppointmentStatus.Pending ||
                                        apt.status === AppointmentStatus.Confirmed) && (
                                            <button
                                                onClick={() => onAction(apt, 'cancel')}
                                                className="px-2 py-1 bg-red-100 dark:bg-red-900/30 
                                                     text-red-600 dark:text-red-400 rounded text-xs
                                                     hover:bg-red-200 dark:hover:bg-red-900/50"
                                            >
                                                إلغاء
                                            </button>
                                        )}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

// مكون النافذة (الشباك)
interface CounterCardProps {
    counter: Counter;
    currentAppointment?: Appointment;
    queueLength: number;
    onStatusChange: (counterId: number, isActive: boolean) => void;
    onCallNext: (counterId: number) => void;
    onComplete: (counterId: number) => void;
}

const CounterCard: React.FC<CounterCardProps> = ({
    counter,
    currentAppointment,
    queueLength,
    onStatusChange,
    onCallNext,
    onComplete
}) => {
    return (
        <div className={`rounded-2xl p-6 shadow-lg border-2 transition-all
            ${counter.isActive
                ? 'bg-white dark:bg-gray-800 border-green-500'
                : 'bg-gray-100 dark:bg-gray-900 border-gray-300 dark:border-gray-700'
            }`}
        >
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold
                        ${counter.isActive ? 'bg-green-500 text-white' : 'bg-gray-400 text-white'}`}>
                        {counter.name}
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-800 dark:text-white">
                            النافذة {counter.name}
                        </h3>
                        <p className="text-sm text-gray-500">
                            {counter.assignedEmployee || 'غير محدد'}
                        </p>
                    </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                    <input
                        type="checkbox"
                        checked={counter.isActive}
                        onChange={(e) => onStatusChange(counter.id, e.target.checked)}
                        className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-300 peer-focus:ring-2 peer-focus:ring-green-300 
                                  rounded-full peer dark:bg-gray-700 
                                  peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full
                                  peer-checked:after:border-white after:content-[''] after:absolute 
                                  after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 
                                  after:border after:rounded-full after:h-5 after:w-5 after:transition-all 
                                  peer-checked:bg-green-600"></div>
                </label>
            </div>

            {counter.isActive && (
                <>
                    {currentAppointment ? (
                        <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-4 mb-4">
                            <p className="text-xs text-blue-600 dark:text-blue-400 mb-1">قيد الخدمة:</p>
                            <p className="font-bold text-blue-800 dark:text-blue-200">
                                {currentAppointment.fullName}
                            </p>
                            <p className="text-sm text-blue-600 dark:text-blue-400">
                                {SERVICE_LABELS[currentAppointment.serviceCategory]}
                            </p>

                            <button
                                onClick={() => onComplete(counter.id)}
                                className="w-full mt-3 py-2 bg-green-500 hover:bg-green-600 
                                         text-white rounded-lg text-sm font-medium"
                            >
                                ✓ إنهاء الخدمة
                            </button>
                        </div>
                    ) : (
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 mb-4 text-center">
                            <p className="text-gray-500 dark:text-gray-400">لا يوجد مراجع حالياً</p>
                        </div>
                    )}

                    <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">
                            في الانتظار: <strong>{queueLength}</strong>
                        </span>

                        <button
                            onClick={() => onCallNext(counter.id)}
                            disabled={queueLength === 0 || !!currentAppointment}
                            className="px-4 py-2 bg-[#0f3c35] hover:bg-[#1a5c4f] text-white 
                                     rounded-lg text-sm font-medium disabled:opacity-50 
                                     disabled:cursor-not-allowed"
                        >
                            📢 مناداة التالي
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

// لوحة الطابور
interface QueueBoardProps {
    queue: QueueEntry[];
    appointments: Appointment[];
}

const QueueBoard: React.FC<QueueBoardProps> = ({ queue, appointments }) => {
    // الحصول على المواعيد قيد الخدمة
    const inProgressAppointments = appointments.filter(
        apt => apt.status === AppointmentStatus.InProgress
    );

    return (
        <div className="bg-gradient-to-br from-[#0f3c35] to-[#1a5c4f] rounded-2xl p-6 text-white">
            <h3 className="text-xl font-bold mb-6 text-center">🏛️ شاشة المناداة</h3>

            {/* قيد الخدمة */}
            <div className="mb-6">
                <h4 className="text-sm opacity-80 mb-3">قيد الخدمة الآن:</h4>
                <div className="grid grid-cols-2 gap-3">
                    {inProgressAppointments.map(apt => (
                        <div key={apt.id} className="bg-white/20 backdrop-blur rounded-xl p-4 text-center">
                            <p className="text-3xl font-bold font-mono">{apt.id}</p>
                            <p className="text-sm opacity-80">النافذة {apt.assignedCounter}</p>
                        </div>
                    ))}
                    {inProgressAppointments.length === 0 && (
                        <p className="col-span-2 text-center opacity-60">لا يوجد مراجعين حالياً</p>
                    )}
                </div>
            </div>

            {/* قائمة الانتظار */}
            <div>
                <h4 className="text-sm opacity-80 mb-3">التالي في الانتظار:</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                    {queue.slice(0, 10).map((entry, index) => {
                        const apt = appointments.find(a => a.id === entry.appointmentId);
                        if (!apt) return null;

                        return (
                            <div key={entry.appointmentId}
                                className={`flex items-center justify-between px-4 py-2 rounded-lg
                                    ${index === 0 ? 'bg-yellow-500/30' : 'bg-white/10'}`}>
                                <span className="font-mono">{apt.id}</span>
                                <span className="text-sm opacity-80">{apt.fullName}</span>
                                {entry.priority !== AppointmentPriority.Normal && (
                                    <span className="text-xs bg-yellow-500 text-yellow-900 px-2 py-1 rounded">
                                        {PRIORITY_LABELS[entry.priority]}
                                    </span>
                                )}
                            </div>
                        );
                    })}
                    {queue.length === 0 && (
                        <p className="text-center opacity-60">لا يوجد أحد في الانتظار</p>
                    )}
                </div>
            </div>
        </div>
    );
};

// ==================== مكون المراجعين المتوقعين ====================
interface UpcomingVisitorsCardProps {
    reports: UpcomingHourReport[];
}

const UpcomingVisitorsCard: React.FC<UpcomingVisitorsCardProps> = ({ reports }) => {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                    <span>👥</span>
                    المراجعون المتوقعون
                </h3>
                <span className="text-sm text-gray-500">الساعات القادمة</span>
            </div>

            <div className="space-y-4">
                {reports.map((report, idx) => (
                    <div key={report.hour} className="border-b border-gray-100 dark:border-gray-700 pb-4 last:border-0">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <span className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold
                                    ${idx === 0 ? 'bg-green-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                                    {report.hour.split(':')[0]}
                                </span>
                                <div>
                                    <p className="font-medium text-gray-800 dark:text-white">
                                        الساعة {report.hour}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        {report.expectedCount} مراجع متوقع
                                    </p>
                                </div>
                            </div>
                            <div className="text-left">
                                <div className="w-24 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full rounded-full ${report.capacityPercentage >= 80 ? 'bg-red-500' :
                                                report.capacityPercentage >= 50 ? 'bg-yellow-500' : 'bg-green-500'
                                            }`}
                                        style={{ width: `${Math.min(report.capacityPercentage, 100)}%` }}
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mt-1">{report.capacityPercentage}% من السعة</p>
                            </div>
                        </div>

                        {report.visitors.length > 0 && (
                            <div className="mr-12 space-y-2">
                                {report.visitors.slice(0, 5).map(visitor => (
                                    <div key={visitor.appointmentId}
                                        className="flex items-center justify-between text-sm p-2 bg-gray-50 
                                                   dark:bg-gray-700 rounded-lg">
                                        <div className="flex items-center gap-2">
                                            <span className="text-gray-800 dark:text-white">{visitor.citizenName}</span>
                                            {visitor.priority !== AppointmentPriority.Normal && (
                                                <span className={`text-xs px-2 py-0.5 rounded ${PRIORITY_COLORS[visitor.priority]}`}>
                                                    {PRIORITY_LABELS[visitor.priority]}
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-gray-500">
                                            {SERVICE_LABELS[visitor.serviceCategory]}
                                        </span>
                                    </div>
                                ))}
                                {report.visitors.length > 5 && (
                                    <p className="text-xs text-gray-500 text-center">
                                        +{report.visitors.length - 5} آخرين
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                ))}

                {reports.length === 0 && (
                    <p className="text-center text-gray-500 py-8">
                        لا يوجد مراجعين متوقعين
                    </p>
                )}
            </div>
        </div>
    );
};

// ==================== مكون إدارة الفترات المحظورة ====================
interface BlockedSlotsManagerProps {
    blockedSlots: BlockedSlot[];
    onAdd: (slot: Omit<BlockedSlot, 'id' | 'createdAt'>) => void;
    onRemove: (id: string) => void;
    currentEmployee: string;
}

const BlockedSlotsManager: React.FC<BlockedSlotsManagerProps> = ({
    blockedSlots,
    onAdd,
    onRemove,
    currentEmployee
}) => {
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        startTime: '08:00',
        endTime: '14:00',
        reason: BlockedReason.Maintenance as BlockedReason,
        description: ''
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onAdd({
            ...formData,
            createdBy: currentEmployee
        });
        setShowForm(false);
        setFormData({
            date: new Date().toISOString().split('T')[0],
            startTime: '08:00',
            endTime: '14:00',
            reason: BlockedReason.Maintenance,
            description: ''
        });
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                    <span>🚫</span>
                    الفترات المحظورة
                </h3>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm"
                >
                    {showForm ? 'إلغاء' : '+ إضافة حظر'}
                </button>
            </div>

            {showForm && (
                <form onSubmit={handleSubmit} className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                التاريخ
                            </label>
                            <input
                                type="date"
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700
                                         bg-white dark:bg-gray-800"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                من الساعة
                            </label>
                            <input
                                type="time"
                                value={formData.startTime}
                                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700
                                         bg-white dark:bg-gray-800"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                إلى الساعة
                            </label>
                            <input
                                type="time"
                                value={formData.endTime}
                                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700
                                         bg-white dark:bg-gray-800"
                                required
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                السبب
                            </label>
                            <select
                                value={formData.reason}
                                onChange={(e) => setFormData({ ...formData, reason: e.target.value as BlockedReason })}
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700
                                         bg-white dark:bg-gray-800"
                            >
                                {Object.entries(BLOCKED_REASON_LABELS).map(([key, label]) => (
                                    <option key={key} value={key}>{label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                وصف إضافي
                            </label>
                            <input
                                type="text"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="وصف اختياري..."
                                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700
                                         bg-white dark:bg-gray-800"
                            />
                        </div>
                    </div>
                    <button
                        type="submit"
                        className="w-full py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium"
                    >
                        تأكيد الحظر
                    </button>
                </form>
            )}

            <div className="space-y-3">
                {blockedSlots.map(slot => (
                    <div key={slot.id} className="flex items-center justify-between p-4 bg-red-50 
                                                 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                        <div>
                            <p className="font-medium text-red-800 dark:text-red-200">
                                {new Date(slot.date).toLocaleDateString('ar-SY')}
                            </p>
                            <p className="text-sm text-red-600 dark:text-red-400">
                                من {slot.startTime} إلى {slot.endTime}
                            </p>
                            <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                                {BLOCKED_REASON_LABELS[slot.reason]}
                                {slot.description && ` - ${slot.description}`}
                            </p>
                        </div>
                        <button
                            onClick={() => onRemove(slot.id)}
                            className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"
                        >
                            🗑️
                        </button>
                    </div>
                ))}

                {blockedSlots.length === 0 && (
                    <p className="text-center text-gray-500 py-8">
                        لا توجد فترات محظورة حالياً
                    </p>
                )}
            </div>
        </div>
    );
};

// ==================== الصفحة الرئيسية ====================

export const AppointmentDashboardPage: React.FC = () => {
    const appContext = useContext(AppContext);
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [stats, setStats] = useState<AppointmentStats | null>(null);
    const [counters, setCounters] = useState<Counter[]>([]);
    const [queue, setQueue] = useState<QueueEntry[]>([]);
    const [activeTab, setActiveTab] = useState<'overview' | 'appointments' | 'counters' | 'queue' | 'upcoming' | 'blocked'>('overview');
    const [showQRScanner, setShowQRScanner] = useState(false);
    const [statusFilter, setStatusFilter] = useState<AppointmentStatus | 'all'>('all');
    const [upcomingVisitors, setUpcomingVisitors] = useState<UpcomingHourReport[]>([]);
    const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>([]);

    // تحميل البيانات
    const loadData = () => {
        const dayAppointments = getAppointmentsByDate(selectedDate);
        setAppointments(dayAppointments);
        setStats(getAppointmentStats());
        setCounters(getCounters());
        setQueue(getQueue());
        setUpcomingVisitors(getUpcomingVisitors(4)); // الساعات الأربع القادمة
        setBlockedSlots(getBlockedSlots());
    };

    useEffect(() => {
        // تشغيل المهام المجدولة عند فتح الصفحة
        runScheduledTasks();

        loadData();
        // تحديث كل 30 ثانية
        const interval = setInterval(loadData, 30000);
        return () => clearInterval(interval);
    }, [selectedDate]);

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

    // الحصول على اسم الموظف الحالي
    const currentEmployeeName = appContext?.currentEmployee?.username || 'المستخدم';

    // معالجة إجراءات الموعد
    const handleAppointmentAction = (appointment: Appointment, action: 'checkin' | 'call' | 'complete' | 'cancel') => {
        switch (action) {
            case 'checkin':
                checkInAppointment(appointment.id, currentEmployeeName);
                break;
            case 'call':
                const counter = counters.find(c => c.isActive && !c.currentAppointment);
                if (counter) {
                    callNextInQueue(counter.id, currentEmployeeName);
                }
                break;
            case 'complete':
                if (appointment.assignedCounter) {
                    completeAppointment(appointment.id, currentEmployeeName);
                }
                break;
            case 'cancel':
                cancelAppointment(appointment.id, 'تم الإلغاء من قبل الموظف', currentEmployeeName);
                break;
        }
        loadData();
    };

    // معالجة حالة النافذة
    const handleCounterStatusChange = (counterId: number, isActive: boolean) => {
        const allCounters = getCounters();
        const counterIndex = allCounters.findIndex(c => c.id === counterId);
        if (counterIndex !== -1) {
            allCounters[counterIndex].isActive = isActive;
            saveCounters(allCounters);
        }
        loadData();
    };

    // معالجة مناداة التالي
    const handleCallNext = (counterId: number) => {
        callNextInQueue(counterId, currentEmployeeName);
        loadData();
    };

    // معالجة إنهاء الخدمة
    const handleCompleteService = (counterId: number) => {
        const counter = counters.find(c => c.id === counterId);
        if (counter?.currentAppointment) {
            completeAppointment(counter.currentAppointment, currentEmployeeName);
            loadData();
        }
    };

    // معالجة مسح QR
    const handleQRScan = (data: string) => {
        setShowQRScanner(false);
        try {
            const qrData = JSON.parse(data);
            if (qrData.id) {
                checkInAppointment(qrData.id, currentEmployeeName);
                loadData();
                alert(`تم تسجيل وصول الموعد: ${qrData.id}`);
            }
        } catch (error) {
            alert('رمز QR غير صالح');
        }
    };

    // تصفية المواعيد
    const filteredAppointments = statusFilter === 'all'
        ? appointments
        : appointments.filter(apt => apt.status === statusFilter);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
                                لوحة إدارة المواعيد
                            </h1>
                            <p className="text-gray-500 dark:text-gray-400">
                                مرحباً، {currentEmployeeName}
                            </p>
                        </div>

                        <div className="flex items-center gap-4">
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700
                                         bg-white dark:bg-gray-800 text-gray-800 dark:text-white"
                            />

                            <button
                                onClick={() => setShowQRScanner(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-[#0f3c35] text-white 
                                         rounded-lg hover:bg-[#1a5c4f]"
                            >
                                <span>📷</span>
                                مسح QR
                            </button>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-2 mt-4 flex-wrap">
                        {[
                            { id: 'overview', label: 'نظرة عامة', icon: '📊' },
                            { id: 'appointments', label: 'المواعيد', icon: '📅' },
                            { id: 'counters', label: 'النوافذ', icon: '🏢' },
                            { id: 'queue', label: 'الطابور', icon: '👥' },
                            { id: 'upcoming', label: 'المتوقعون', icon: '🕐' },
                            { id: 'blocked', label: 'الفترات المحظورة', icon: '🚫' }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors
                                    ${activeTab === tab.id
                                        ? 'bg-[#0f3c35] text-white'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                                    }`}
                            >
                                <span>{tab.icon}</span>
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-4 py-6">
                {/* نظرة عامة */}
                {activeTab === 'overview' && stats && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <StatCard
                                title="مواعيد اليوم"
                                value={stats.today.total}
                                icon="📅"
                                color="bg-gradient-to-br from-blue-500 to-blue-600"
                            />
                            <StatCard
                                title="تم إنجازها"
                                value={stats.today.completed}
                                icon="✅"
                                color="bg-gradient-to-br from-green-500 to-green-600"
                            />
                            <StatCard
                                title="في الانتظار"
                                value={stats.today.pending}
                                icon="⏳"
                                color="bg-gradient-to-br from-yellow-500 to-yellow-600"
                            />
                            <StatCard
                                title="متوسط الانتظار"
                                value={`${stats.averageWaitTime} د`}
                                icon="⏱️"
                                color="bg-gradient-to-br from-purple-500 to-purple-600"
                            />
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* توزيع الخدمات */}
                            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
                                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">
                                    توزيع المواعيد حسب الخدمة
                                </h3>
                                <div className="space-y-3">
                                    {Object.entries(stats.byService).map(([service, count]) => {
                                        const percentage = stats.today.total > 0
                                            ? Math.round((count / stats.today.total) * 100)
                                            : 0;
                                        return (
                                            <div key={service}>
                                                <div className="flex justify-between text-sm mb-1">
                                                    <span className="text-gray-600 dark:text-gray-300">
                                                        {SERVICE_LABELS[service as ServiceCategory]}
                                                    </span>
                                                    <span className="font-medium">{count}</span>
                                                </div>
                                                <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-[#0f3c35] rounded-full transition-all"
                                                        style={{ width: `${percentage}%` }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* شاشة المناداة */}
                            <QueueBoard queue={queue} appointments={appointments} />
                        </div>
                    </div>
                )}

                {/* المواعيد */}
                {activeTab === 'appointments' && (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg">
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                                    مواعيد {new Date(selectedDate).toLocaleDateString('ar-SY')}
                                </h3>

                                <div className="flex gap-2">
                                    <select
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value as any)}
                                        className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700
                                                 bg-white dark:bg-gray-800"
                                    >
                                        <option value="all">جميع الحالات</option>
                                        {Object.entries(STATUS_LABELS).map(([key, label]) => (
                                            <option key={key} value={key}>{label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <AppointmentTable
                            appointments={filteredAppointments}
                            onAction={handleAppointmentAction}
                        />
                    </div>
                )}

                {/* النوافذ */}
                {activeTab === 'counters' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {counters.map(counter => {
                            const currentAppointment = appointments.find(
                                apt => apt.id === counter.currentAppointment
                            );
                            const counterQueue = queue.filter(
                                q => !counters.some(c => c.currentAppointment === q.appointmentId)
                            );

                            return (
                                <CounterCard
                                    key={counter.id}
                                    counter={counter}
                                    currentAppointment={currentAppointment}
                                    queueLength={counterQueue.length}
                                    onStatusChange={handleCounterStatusChange}
                                    onCallNext={handleCallNext}
                                    onComplete={handleCompleteService}
                                />
                            );
                        })}
                    </div>
                )}

                {/* الطابور */}
                {activeTab === 'queue' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <QueueBoard queue={queue} appointments={appointments} />

                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">
                                تفاصيل الطابور
                            </h3>

                            <div className="space-y-3">
                                {queue.map((entry, index) => {
                                    const apt = appointments.find(a => a.id === entry.appointmentId);
                                    if (!apt) return null;

                                    return (
                                        <div key={entry.appointmentId}
                                            className="flex items-center justify-between p-4 bg-gray-50 
                                                      dark:bg-gray-700 rounded-xl">
                                            <div className="flex items-center gap-4">
                                                <span className="w-8 h-8 bg-[#0f3c35] text-white rounded-full
                                                              flex items-center justify-center font-bold">
                                                    {index + 1}
                                                </span>
                                                <div>
                                                    <p className="font-medium text-gray-800 dark:text-white">
                                                        {apt.fullName}
                                                    </p>
                                                    <p className="text-sm text-gray-500">
                                                        {SERVICE_LABELS[apt.serviceCategory]}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="text-left">
                                                <p className="text-sm text-gray-500" dir="ltr">
                                                    {apt.timeSlot.startTime}
                                                </p>
                                                {entry.priority !== AppointmentPriority.Normal && (
                                                    <span className={`text-xs px-2 py-1 rounded
                                                        ${PRIORITY_COLORS[entry.priority]}`}>
                                                        {PRIORITY_LABELS[entry.priority]}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}

                                {queue.length === 0 && (
                                    <p className="text-center text-gray-500 py-8">
                                        لا يوجد أحد في الطابور حالياً
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* المراجعون المتوقعون */}
                {activeTab === 'upcoming' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <UpcomingVisitorsCard reports={upcomingVisitors} />

                        {/* ملخص اليوم */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
                            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                                <span>📈</span>
                                ملخص اليوم
                            </h3>

                            {(() => {
                                const dailyReport = getDailyVisitorReport(selectedDate);
                                return (
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                                                <p className="text-3xl font-bold text-blue-600">{dailyReport.totalExpected}</p>
                                                <p className="text-sm text-gray-500">إجمالي المتوقعين</p>
                                            </div>
                                            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
                                                <p className="text-3xl font-bold text-green-600">{dailyReport.arrived}</p>
                                                <p className="text-sm text-gray-500">وصلوا</p>
                                            </div>
                                            <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl">
                                                <p className="text-3xl font-bold text-yellow-600">{dailyReport.pending}</p>
                                                <p className="text-sm text-gray-500">في الانتظار</p>
                                            </div>
                                        </div>

                                        <div>
                                            <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-3">
                                                توزيع الساعات
                                            </h4>
                                            <div className="space-y-2">
                                                {dailyReport.hourlyBreakdown.map(hour => (
                                                    <div key={hour.hour} className="flex items-center gap-3">
                                                        <span className="w-14 text-sm text-gray-500">{hour.hour}</span>
                                                        <div className="flex-1 h-6 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full ${hour.capacityPercentage >= 80 ? 'bg-red-500' :
                                                                        hour.capacityPercentage >= 50 ? 'bg-yellow-500' : 'bg-green-500'
                                                                    }`}
                                                                style={{ width: `${Math.min(hour.capacityPercentage, 100)}%` }}
                                                            />
                                                        </div>
                                                        <span className="w-8 text-sm font-medium">{hour.expectedCount}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                )}

                {/* الفترات المحظورة */}
                {activeTab === 'blocked' && (
                    <BlockedSlotsManager
                        blockedSlots={blockedSlots}
                        currentEmployee={currentEmployeeName}
                        onAdd={(slot) => {
                            addBlockedSlot(slot);
                            loadData();
                        }}
                        onRemove={(id) => {
                            removeBlockedSlot(id);
                            loadData();
                        }}
                    />
                )}
            </div>

            {/* QR Scanner Modal */}
            {showQRScanner && (
                <QRScanner
                    onScan={handleQRScan}
                    onClose={() => setShowQRScanner(false)}
                />
            )}
        </div>
    );
};

export default AppointmentDashboardPage;
