/**
 * نظام إدارة المواعيد
 * Appointment Management System
 */

import {
    Appointment,
    AppointmentStatus,
    AppointmentPriority,
    ServiceCategory,
    TimeSlot,
    Counter,
    AppointmentSettings,
    AppointmentStats,
    QueueEntry,
    AppointmentLog,
    DEFAULT_APPOINTMENT_SETTINGS,
    SERVICE_LABELS,
    BlockedSlot,
    BlockedReason,
    BookingThrottle,
    ThrottleSettings,
    DEFAULT_THROTTLE_SETTINGS,
    SlotAvailability,
    ExpectedVisitor,
    UpcomingHourReport,
    DepartmentCapacity
} from '../types/appointment';

// ==================== ثوابت التخزين ====================
const APPOINTMENTS_KEY = 'appointments';
const SETTINGS_KEY = 'appointment_settings';
const COUNTERS_KEY = 'appointment_counters';
const LOGS_KEY = 'appointment_logs';
const QUEUE_KEY = 'appointment_queue';
const BLOCKED_SLOTS_KEY = 'blocked_slots';
const THROTTLE_KEY = 'booking_throttle';
const CAPACITY_KEY = 'department_capacity';

// ==================== إدارة الإعدادات ====================

export const getAppointmentSettings = (): AppointmentSettings => {
    try {
        const stored = localStorage.getItem(SETTINGS_KEY);
        return stored ? { ...DEFAULT_APPOINTMENT_SETTINGS, ...JSON.parse(stored) } : DEFAULT_APPOINTMENT_SETTINGS;
    } catch {
        return DEFAULT_APPOINTMENT_SETTINGS;
    }
};

export const saveAppointmentSettings = (settings: Partial<AppointmentSettings>): void => {
    const current = getAppointmentSettings();
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...current, ...settings }));
};

// ==================== إدارة المواعيد ====================

export const getAppointments = (): Appointment[] => {
    try {
        const stored = localStorage.getItem(APPOINTMENTS_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
};

export const saveAppointments = (appointments: Appointment[]): void => {
    localStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(appointments));
};

/**
 * إنشاء موعد جديد
 */
export const createAppointment = (
    data: Omit<Appointment, 'id' | 'status' | 'isVerified' | 'createdAt' | 'syncStatus'>
): Appointment => {
    const appointments = getAppointments();

    const appointment: Appointment = {
        ...data,
        id: generateAppointmentId(),
        status: AppointmentStatus.Pending,
        isVerified: false,
        createdAt: new Date().toISOString(),
        syncStatus: 'synced'
    };

    appointments.push(appointment);
    saveAppointments(appointments);

    // تسجيل النشاط
    logAppointmentAction(appointment.id, 'created', 'system');

    return appointment;
};

/**
 * تحديث موعد
 */
export const updateAppointment = (
    id: string,
    updates: Partial<Appointment>,
    performedBy: string = 'system'
): Appointment | null => {
    const appointments = getAppointments();
    const index = appointments.findIndex(a => a.id === id);

    if (index === -1) return null;

    appointments[index] = { ...appointments[index], ...updates };
    saveAppointments(appointments);

    return appointments[index];
};

/**
 * الحصول على موعد بالرقم
 */
export const getAppointmentById = (id: string): Appointment | null => {
    const appointments = getAppointments();
    return appointments.find(a => a.id === id) || null;
};

/**
 * البحث عن مواعيد المراجع
 */
export const getAppointmentsByCitizen = (citizenId: string): Appointment[] => {
    const appointments = getAppointments();
    return appointments.filter(a => a.citizenId === citizenId);
};

/**
 * الحصول على مواعيد يوم معين
 */
export const getAppointmentsByDate = (date: string): Appointment[] => {
    const appointments = getAppointments();
    return appointments.filter(a => a.date === date);
};

/**
 * إلغاء موعد
 */
export const cancelAppointment = (
    id: string,
    reason: string,
    performedBy: string
): boolean => {
    const appointment = updateAppointment(id, {
        status: AppointmentStatus.Cancelled,
        cancelledAt: new Date().toISOString(),
        cancellationReason: reason
    });

    if (appointment) {
        logAppointmentAction(id, 'cancelled', performedBy, { reason });
        return true;
    }
    return false;
};

/**
 * تأكيد موعد
 */
export const confirmAppointment = (
    id: string,
    qrCode: string,
    performedBy: string = 'system'
): Appointment | null => {
    const appointment = updateAppointment(id, {
        status: AppointmentStatus.Confirmed,
        isVerified: true,
        qrCode,
        confirmedAt: new Date().toISOString()
    });

    if (appointment) {
        logAppointmentAction(id, 'confirmed', performedBy);
    }

    return appointment;
};

/**
 * تسجيل حضور المراجع
 */
export const checkInAppointment = (
    id: string,
    performedBy: string
): { success: boolean; queuePosition?: number; message: string } => {
    const appointment = getAppointmentById(id);

    if (!appointment) {
        return { success: false, message: 'الموعد غير موجود' };
    }

    if (appointment.status !== AppointmentStatus.Confirmed) {
        return { success: false, message: 'الموعد غير مؤكد' };
    }

    // التحقق من التاريخ
    const today = new Date().toISOString().split('T')[0];
    if (appointment.date !== today) {
        return { success: false, message: 'هذا الموعد ليس لليوم' };
    }

    const updated = updateAppointment(id, {
        status: AppointmentStatus.CheckedIn,
        checkedInAt: new Date().toISOString()
    });

    if (updated) {
        logAppointmentAction(id, 'checked_in', performedBy);

        // إضافة للطابور
        const position = addToQueue(appointment);

        return {
            success: true,
            queuePosition: position,
            message: `تم تسجيل حضورك. رقمك في الطابور: ${position}`
        };
    }

    return { success: false, message: 'فشل في تسجيل الحضور' };
};

// ==================== إدارة الفترات الزمنية ====================

/**
 * توليد الفترات الزمنية لتاريخ معين
 */
export const generateTimeSlots = (date: string): TimeSlot[] => {
    const settings = getAppointmentSettings();
    const appointments = getAppointmentsByDate(date);

    // التحقق من أيام العطل
    const dayOfWeek = new Date(date).getDay();
    if (settings.weekendDays.includes(dayOfWeek) || settings.holidays.includes(date)) {
        return [];
    }

    const slots: TimeSlot[] = [];
    const [startHour, startMin] = settings.workStartTime.split(':').map(Number);
    const [endHour, endMin] = settings.workEndTime.split(':').map(Number);

    let currentTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;
    let slotIndex = 0;

    while (currentTime < endTime) {
        const hours = Math.floor(currentTime / 60);
        const minutes = currentTime % 60;
        const startTimeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

        const endSlotTime = currentTime + settings.slotDurationMinutes;
        const endHours = Math.floor(endSlotTime / 60);
        const endMinutes = endSlotTime % 60;
        const endTimeStr = `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;

        // حساب الحجوزات الحالية
        const currentBookings = appointments.filter(
            a => a.timeSlot.startTime === startTimeStr &&
                a.status !== AppointmentStatus.Cancelled
        ).length;

        slots.push({
            id: `slot_${date}_${slotIndex}`,
            startTime: startTimeStr,
            endTime: endTimeStr,
            maxCapacity: settings.maxAppointmentsPerSlot,
            currentBookings,
            isAvailable: currentBookings < settings.maxAppointmentsPerSlot
        });

        currentTime = endSlotTime;
        slotIndex++;
    }

    return slots;
};

/**
 * التحقق من توفر فترة زمنية
 */
export const isSlotAvailable = (date: string, slotId: string): boolean => {
    const slots = generateTimeSlots(date);
    const slot = slots.find(s => s.id === slotId);
    return slot?.isAvailable || false;
};

// ==================== إدارة النوافذ/الكاونترات ====================

export const getCounters = (): Counter[] => {
    try {
        const stored = localStorage.getItem(COUNTERS_KEY);
        if (stored) return JSON.parse(stored);

        // إنشاء نوافذ افتراضية
        const settings = getAppointmentSettings();
        const defaultCounters: Counter[] = [];

        for (let i = 1; i <= settings.totalCounters; i++) {
            defaultCounters.push({
                id: i,
                name: `النافذة ${i}`,
                isActive: true,
                serviceCategories: Object.values(ServiceCategory),
                queueLength: 0,
                averageServiceTime: 15
            });
        }

        localStorage.setItem(COUNTERS_KEY, JSON.stringify(defaultCounters));
        return defaultCounters;
    } catch {
        return [];
    }
};

export const saveCounters = (counters: Counter[]): void => {
    localStorage.setItem(COUNTERS_KEY, JSON.stringify(counters));
};

/**
 * توزيع الأعباء - اختيار أفضل نافذة
 */
export const assignOptimalCounter = (
    serviceCategory: ServiceCategory,
    priority: AppointmentPriority
): Counter | null => {
    const counters = getCounters();

    // فلترة النوافذ النشطة التي تقدم الخدمة المطلوبة
    const availableCounters = counters.filter(
        c => c.isActive && c.serviceCategories.includes(serviceCategory)
    );

    if (availableCounters.length === 0) return null;

    // اختيار النافذة ذات الطابور الأقصر
    return availableCounters.reduce((min, curr) =>
        curr.queueLength < min.queueLength ? curr : min
    );
};

// ==================== إدارة الطابور ====================

export const getQueue = (): QueueEntry[] => {
    try {
        const stored = localStorage.getItem(QUEUE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
};

export const saveQueue = (queue: QueueEntry[]): void => {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
};

/**
 * إضافة للطابور
 */
export const addToQueue = (appointment: Appointment): number => {
    const queue = getQueue();
    const settings = getAppointmentSettings();

    // حساب الموقع بناءً على الأولوية
    let position: number;

    if (settings.priorityQueueEnabled && appointment.priority !== AppointmentPriority.Normal) {
        // الأولوية العالية تدخل مبكراً
        const priorityOrder: AppointmentPriority[] = [
            AppointmentPriority.Emergency,
            AppointmentPriority.Wounded,
            AppointmentPriority.Disabled,
            AppointmentPriority.Elderly,
            AppointmentPriority.VIP,
            AppointmentPriority.Normal
        ];

        const appointmentPriorityIndex = priorityOrder.indexOf(appointment.priority);

        // البحث عن أول موقع مناسب
        position = queue.findIndex(entry => {
            const entryPriorityIndex = priorityOrder.indexOf(entry.priority);
            return entryPriorityIndex > appointmentPriorityIndex;
        });

        if (position === -1) position = queue.length;
    } else {
        position = queue.length;
    }

    const entry: QueueEntry = {
        appointmentId: appointment.id,
        position: position + 1,
        estimatedWaitMinutes: position * 15, // تقدير مبدئي
        priority: appointment.priority,
        serviceCategory: appointment.serviceCategory,
        checkedInAt: new Date().toISOString()
    };

    queue.splice(position, 0, entry);

    // إعادة ترقيم المواقع
    queue.forEach((e, i) => {
        e.position = i + 1;
        e.estimatedWaitMinutes = i * 15;
    });

    saveQueue(queue);

    // تحديث طول الطابور في النافذة
    if (appointment.assignedCounter) {
        const counters = getCounters();
        const counter = counters.find(c => c.id === appointment.assignedCounter);
        if (counter) {
            counter.queueLength = queue.filter(
                e => getAppointmentById(e.appointmentId)?.assignedCounter === counter.id
            ).length;
            saveCounters(counters);
        }
    }

    return entry.position;
};

/**
 * استدعاء التالي في الطابور
 */
export const callNextInQueue = (
    counterId: number,
    employeeId: string
): Appointment | null => {
    const queue = getQueue();
    const counters = getCounters();
    const counter = counters.find(c => c.id === counterId);

    if (!counter) return null;

    // البحث عن أول موعد متوافق مع خدمات النافذة
    const nextIndex = queue.findIndex(entry => {
        const appointment = getAppointmentById(entry.appointmentId);
        return appointment &&
            counter.serviceCategories.includes(appointment.serviceCategory) &&
            appointment.status === AppointmentStatus.CheckedIn;
    });

    if (nextIndex === -1) return null;

    const nextEntry = queue[nextIndex];
    const appointment = getAppointmentById(nextEntry.appointmentId);

    if (!appointment) return null;

    // تحديث الموعد
    updateAppointment(appointment.id, {
        status: AppointmentStatus.InProgress,
        assignedCounter: counterId,
        assignedEmployee: employeeId,
        startedAt: new Date().toISOString()
    });

    // إزالة من الطابور
    queue.splice(nextIndex, 1);

    // إعادة ترقيم
    queue.forEach((e, i) => {
        e.position = i + 1;
        e.estimatedWaitMinutes = i * 15;
    });

    saveQueue(queue);

    // تحديث النافذة
    counter.currentAppointment = appointment.id;
    counter.queueLength = queue.length;
    saveCounters(counters);

    logAppointmentAction(appointment.id, 'started', employeeId, { counterId });

    return { ...appointment, status: AppointmentStatus.InProgress };
};

/**
 * إنهاء معالجة موعد
 */
export const completeAppointment = (
    id: string,
    employeeId: string,
    notes?: string
): boolean => {
    const appointment = getAppointmentById(id);
    if (!appointment) return false;

    updateAppointment(id, {
        status: AppointmentStatus.Completed,
        completedAt: new Date().toISOString(),
        notes
    });

    // تحرير النافذة
    if (appointment.assignedCounter) {
        const counters = getCounters();
        const counter = counters.find(c => c.id === appointment.assignedCounter);
        if (counter) {
            counter.currentAppointment = undefined;
            saveCounters(counters);
        }
    }

    logAppointmentAction(id, 'completed', employeeId);

    return true;
};

// ==================== الإحصائيات ====================

export const getAppointmentStats = (date?: string): AppointmentStats => {
    const targetDate = date || new Date().toISOString().split('T')[0];
    const appointments = getAppointmentsByDate(targetDate);

    const stats: AppointmentStats = {
        today: {
            total: appointments.length,
            completed: appointments.filter(a => a.status === AppointmentStatus.Completed).length,
            pending: appointments.filter(a => a.status === AppointmentStatus.Pending).length,
            noShow: appointments.filter(a => a.status === AppointmentStatus.NoShow).length,
            cancelled: appointments.filter(a => a.status === AppointmentStatus.Cancelled).length,
            inProgress: appointments.filter(a => a.status === AppointmentStatus.InProgress).length
        },
        byService: {} as Record<ServiceCategory, number>,
        byCounter: {},
        byHour: {},
        averageWaitTime: 0,
        averageServiceTime: 0,
        peakHours: [],
        busiestDays: []
    };

    // تجميع حسب الخدمة
    Object.values(ServiceCategory).forEach(cat => {
        stats.byService[cat] = appointments.filter(a => a.serviceCategory === cat).length;
    });

    // تجميع حسب الساعة
    appointments.forEach(a => {
        const hour = a.timeSlot.startTime.split(':')[0];
        stats.byHour[hour] = (stats.byHour[hour] || 0) + 1;
    });

    // حساب ساعات الذروة
    const hourCounts = Object.entries(stats.byHour).sort((a, b) => b[1] - a[1]);
    stats.peakHours = hourCounts.slice(0, 3).map(([hour]) => hour + ':00');

    // حساب متوسط وقت الانتظار
    const completedWithTimes = appointments.filter(
        a => a.status === AppointmentStatus.Completed && a.checkedInAt && a.startedAt
    );

    if (completedWithTimes.length > 0) {
        const totalWait = completedWithTimes.reduce((sum, a) => {
            const checkedIn = new Date(a.checkedInAt!).getTime();
            const started = new Date(a.startedAt!).getTime();
            return sum + (started - checkedIn) / 60000;
        }, 0);
        stats.averageWaitTime = Math.round(totalWait / completedWithTimes.length);
    }

    // حساب متوسط وقت الخدمة
    const completedWithService = appointments.filter(
        a => a.status === AppointmentStatus.Completed && a.startedAt && a.completedAt
    );

    if (completedWithService.length > 0) {
        const totalService = completedWithService.reduce((sum, a) => {
            const started = new Date(a.startedAt!).getTime();
            const completed = new Date(a.completedAt!).getTime();
            return sum + (completed - started) / 60000;
        }, 0);
        stats.averageServiceTime = Math.round(totalService / completedWithService.length);
    }

    return stats;
};

// ==================== سجل النشاطات ====================

export const logAppointmentAction = (
    appointmentId: string,
    action: AppointmentLog['action'],
    performedBy: string,
    details?: Record<string, any>
): void => {
    try {
        const logs = JSON.parse(localStorage.getItem(LOGS_KEY) || '[]');

        logs.push({
            id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
            appointmentId,
            action,
            performedBy,
            performedAt: new Date().toISOString(),
            details
        });

        // الاحتفاظ بآخر 1000 سجل
        localStorage.setItem(LOGS_KEY, JSON.stringify(logs.slice(-1000)));
    } catch (e) {
        console.error('Error logging appointment action:', e);
    }
};

export const getAppointmentLogs = (appointmentId?: string): AppointmentLog[] => {
    try {
        const logs = JSON.parse(localStorage.getItem(LOGS_KEY) || '[]');
        if (appointmentId) {
            return logs.filter((l: AppointmentLog) => l.appointmentId === appointmentId);
        }
        return logs;
    } catch {
        return [];
    }
};

// ==================== توليد المعرفات ====================

const generateAppointmentId = (): string => {
    const date = new Date();
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');

    // عداد يومي
    const counterKey = `appt_counter_${year}${month}${day}`;
    let counter = parseInt(localStorage.getItem(counterKey) || '0') + 1;
    localStorage.setItem(counterKey, counter.toString());

    return `APT-${year}${month}${day}-${counter.toString().padStart(4, '0')}`;
};

// ==================== التحقق من التوفر ====================

/**
 * التحقق من إمكانية الحجز لتاريخ معين
 */
export const canBookOnDate = (date: string): { available: boolean; reason?: string } => {
    const settings = getAppointmentSettings();
    const targetDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // التحقق من التاريخ ليس في الماضي
    if (targetDate < today) {
        return { available: false, reason: 'لا يمكن الحجز في تاريخ سابق' };
    }

    // التحقق من الحد الأقصى للحجز المسبق
    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + settings.maxAdvanceBookingDays);
    if (targetDate > maxDate) {
        return { available: false, reason: `لا يمكن الحجز لأكثر من ${settings.maxAdvanceBookingDays} يوم مسبقاً` };
    }

    // التحقق من يوم العطلة
    const dayOfWeek = targetDate.getDay();
    if (settings.weekendDays.includes(dayOfWeek)) {
        return { available: false, reason: 'هذا اليوم عطلة أسبوعية' };
    }

    // التحقق من العطل الرسمية
    if (settings.holidays.includes(date)) {
        return { available: false, reason: 'هذا اليوم عطلة رسمية' };
    }

    // التحقق من السعة اليومية
    const dayAppointments = getAppointmentsByDate(date).filter(
        a => a.status !== AppointmentStatus.Cancelled
    );
    if (dayAppointments.length >= settings.maxAppointmentsPerDay) {
        return { available: false, reason: 'اكتمل الحد الأقصى للمواعيد في هذا اليوم' };
    }

    return { available: true };
};

// ==================== دعم العمل بدون إنترنت ====================

/**
 * مزامنة المواعيد المحلية
 */
export const syncOfflineAppointments = async (): Promise<{
    synced: number;
    failed: number;
    conflicts: Appointment[];
}> => {
    const appointments = getAppointments();
    const pending = appointments.filter(a => a.syncStatus === 'pending');

    let synced = 0;
    const conflicts: Appointment[] = [];

    for (const appointment of pending) {
        try {
            // في الإنتاج: إرسال للخادم
            // await api.syncAppointment(appointment);

            appointment.syncStatus = 'synced';
            appointment.lastSyncedAt = new Date().toISOString();
            synced++;
        } catch (error: any) {
            if (error.code === 'CONFLICT') {
                appointment.syncStatus = 'conflict';
                conflicts.push(appointment);
            }
        }
    }

    saveAppointments(appointments);

    return {
        synced,
        failed: pending.length - synced - conflicts.length,
        conflicts
    };
};
// ==================== إدارة الفترات المحظورة (Blocked Slots) ====================

export const getBlockedSlots = (): BlockedSlot[] => {
    try {
        const stored = localStorage.getItem(BLOCKED_SLOTS_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
};

export const saveBlockedSlots = (slots: BlockedSlot[]): void => {
    localStorage.setItem(BLOCKED_SLOTS_KEY, JSON.stringify(slots));
};

/**
 * إضافة فترة محظورة
 */
export const addBlockedSlot = (
    data: Omit<BlockedSlot, 'id' | 'createdAt'>
): BlockedSlot => {
    const slots = getBlockedSlots();

    const newSlot: BlockedSlot = {
        ...data,
        id: `blocked_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        createdAt: new Date().toISOString()
    };

    slots.push(newSlot);
    saveBlockedSlots(slots);

    return newSlot;
};

/**
 * إزالة فترة محظورة
 */
export const removeBlockedSlot = (id: string): boolean => {
    const slots = getBlockedSlots();
    const index = slots.findIndex(s => s.id === id);

    if (index === -1) return false;

    slots.splice(index, 1);
    saveBlockedSlots(slots);

    return true;
};

/**
 * الحصول على الفترات المحظورة لتاريخ معين
 */
export const getBlockedSlotsForDate = (date: string, departmentId?: string): BlockedSlot[] => {
    const slots = getBlockedSlots();

    return slots.filter(slot => {
        const matchesDate = slot.date === date;
        const matchesDepartment = !departmentId || !slot.departmentId || slot.departmentId === departmentId;
        return matchesDate && matchesDepartment;
    });
};

/**
 * حساب عدد الفترات المحظورة لفترة زمنية معينة
 */
export const countBlockedSlotsForTime = (
    date: string,
    startTime: string,
    endTime: string,
    departmentId?: string
): number => {
    const blockedSlots = getBlockedSlotsForDate(date, departmentId);

    return blockedSlots.filter(slot => {
        // التحقق من التداخل الزمني
        return slot.startTime < endTime && slot.endTime > startTime;
    }).length;
};

// ==================== خوارزمية توزيع الضغط (Throttling) ====================

export const getThrottleSettings = (): ThrottleSettings => {
    try {
        const stored = localStorage.getItem('throttle_settings');
        return stored ? { ...DEFAULT_THROTTLE_SETTINGS, ...JSON.parse(stored) } : DEFAULT_THROTTLE_SETTINGS;
    } catch {
        return DEFAULT_THROTTLE_SETTINGS;
    }
};

export const saveThrottleSettings = (settings: Partial<ThrottleSettings>): void => {
    const current = getThrottleSettings();
    localStorage.setItem('throttle_settings', JSON.stringify({ ...current, ...settings }));
};

export const getBookingThrottle = (nationalId: string): BookingThrottle | null => {
    try {
        const stored = localStorage.getItem(THROTTLE_KEY);
        const throttles: BookingThrottle[] = stored ? JSON.parse(stored) : [];
        return throttles.find(t => t.nationalId === nationalId) || null;
    } catch {
        return null;
    }
};

export const updateBookingThrottle = (nationalId: string): void => {
    try {
        const stored = localStorage.getItem(THROTTLE_KEY);
        const throttles: BookingThrottle[] = stored ? JSON.parse(stored) : [];

        const existingIndex = throttles.findIndex(t => t.nationalId === nationalId);
        const today = new Date().toISOString().split('T')[0];

        if (existingIndex !== -1) {
            throttles[existingIndex].lastBookingDate = today;
            throttles[existingIndex].bookingsThisWeek++;
            throttles[existingIndex].bookingsThisMonth++;
            throttles[existingIndex].totalBookings++;
        } else {
            throttles.push({
                nationalId,
                lastBookingDate: today,
                bookingsThisWeek: 1,
                bookingsThisMonth: 1,
                totalBookings: 1
            });
        }

        localStorage.setItem(THROTTLE_KEY, JSON.stringify(throttles));
    } catch (e) {
        console.error('Error updating throttle:', e);
    }
};

/**
 * إعادة تعيين عدادات الأسبوع/الشهر (يجب تشغيلها عبر Cron Job)
 */
export const resetThrottleCounters = (period: 'week' | 'month'): void => {
    try {
        const stored = localStorage.getItem(THROTTLE_KEY);
        const throttles: BookingThrottle[] = stored ? JSON.parse(stored) : [];

        throttles.forEach(t => {
            if (period === 'week') {
                t.bookingsThisWeek = 0;
            } else {
                t.bookingsThisMonth = 0;
            }
        });

        localStorage.setItem(THROTTLE_KEY, JSON.stringify(throttles));
    } catch (e) {
        console.error('Error resetting throttle:', e);
    }
};

/**
 * التحقق من إمكانية الحجز للمواطن (خوارزمية منع الاحتكار)
 * $$Available = MaxPerWeek - CurrentWeekBookings$$
 */
export const canCitizenBook = (
    nationalId: string,
    priority: AppointmentPriority = AppointmentPriority.Normal
): { allowed: boolean; reason?: string; nextAvailableDate?: string } => {
    const settings = getThrottleSettings();

    // التحقق من الأولويات المستثناة
    if (settings.exemptPriorities.includes(priority)) {
        return { allowed: true };
    }

    const throttle = getBookingThrottle(nationalId);

    if (!throttle) {
        return { allowed: true };
    }

    // التحقق من الحد الأسبوعي
    if (throttle.bookingsThisWeek >= settings.maxBookingsPerWeek) {
        const lastBooking = new Date(throttle.lastBookingDate);
        const nextAvailable = new Date(lastBooking);
        nextAvailable.setDate(nextAvailable.getDate() + settings.cooldownDays);

        return {
            allowed: false,
            reason: `لقد استنفدت الحد الأقصى للحجوزات الأسبوعية (${settings.maxBookingsPerWeek})`,
            nextAvailableDate: nextAvailable.toISOString().split('T')[0]
        };
    }

    // التحقق من الحد الشهري
    if (throttle.bookingsThisMonth >= settings.maxBookingsPerMonth) {
        return {
            allowed: false,
            reason: `لقد استنفدت الحد الأقصى للحجوزات الشهرية (${settings.maxBookingsPerMonth})`
        };
    }

    // التحقق من فترة الانتظار بين الحجوزات
    const lastBooking = new Date(throttle.lastBookingDate);
    const today = new Date();
    const daysSinceLastBooking = Math.floor((today.getTime() - lastBooking.getTime()) / (1000 * 60 * 60 * 24));

    if (daysSinceLastBooking < settings.cooldownDays) {
        const nextAvailable = new Date(lastBooking);
        nextAvailable.setDate(nextAvailable.getDate() + settings.cooldownDays);

        return {
            allowed: false,
            reason: `يجب الانتظار ${settings.cooldownDays - daysSinceLastBooking} يوم قبل الحجز التالي`,
            nextAvailableDate: nextAvailable.toISOString().split('T')[0]
        };
    }

    return { allowed: true };
};

// ==================== حساب المواعيد المتاحة ====================

/**
 * المعادلة الرئيسية لحساب المواعيد المتاحة:
 * $$Available\ Slots = Total\ Capacity - (Confirmed\ Bookings + Blocked\ Slots)$$
 */
export const calculateSlotAvailability = (
    date: string,
    startTime: string,
    endTime: string,
    departmentId?: string
): SlotAvailability => {
    const settings = getAppointmentSettings();
    const appointments = getAppointmentsByDate(date);

    // 1. السعة الكلية
    const totalCapacity = settings.maxAppointmentsPerSlot;

    // 2. الحجوزات المؤكدة
    const confirmedBookings = appointments.filter(a =>
        a.timeSlot.startTime === startTime &&
        a.status !== AppointmentStatus.Cancelled &&
        a.status !== AppointmentStatus.NoShow
    ).length;

    // 3. الفترات المحظورة
    const blockedSlots = countBlockedSlotsForTime(date, startTime, endTime, departmentId);

    // 4. تطبيق المعادلة
    const availableSlots = Math.max(0, totalCapacity - (confirmedBookings + blockedSlots));

    // 5. تحديد السبب إن لم يكن متاحاً
    let unavailabilityReason: string | undefined;
    if (availableSlots === 0) {
        if (blockedSlots > 0) {
            unavailabilityReason = 'الفترة محجوبة للصيانة الإدارية';
        } else {
            unavailabilityReason = 'اكتملت الحجوزات لهذه الفترة';
        }
    }

    return {
        slotId: `slot_${date}_${startTime}`,
        date,
        startTime,
        endTime,
        totalCapacity,
        confirmedBookings,
        blockedSlots,
        availableSlots,
        isAvailable: availableSlots > 0,
        unavailabilityReason
    };
};

/**
 * الحصول على كل فترات التوفر ليوم معين
 */
export const getDayAvailability = (date: string, departmentId?: string): SlotAvailability[] => {
    const settings = getAppointmentSettings();
    const availabilities: SlotAvailability[] = [];

    const [startHour, startMin] = settings.workStartTime.split(':').map(Number);
    const [endHour, endMin] = settings.workEndTime.split(':').map(Number);

    let currentTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    while (currentTime < endTime) {
        const hours = Math.floor(currentTime / 60);
        const minutes = currentTime % 60;
        const startTimeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

        const slotEnd = currentTime + settings.slotDurationMinutes;
        const endHours = Math.floor(slotEnd / 60);
        const endMinutes = slotEnd % 60;
        const endTimeStr = `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;

        availabilities.push(calculateSlotAvailability(date, startTimeStr, endTimeStr, departmentId));

        currentTime = slotEnd;
    }

    return availabilities;
};

// ==================== المراجعون المتوقعون (Dashboard Feature) ====================

/**
 * الحصول على المراجعين المتوقعين في الساعة القادمة
 */
export const getUpcomingVisitors = (hoursAhead: number = 1): UpcomingHourReport[] => {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    const appointments = getAppointmentsByDate(today);
    const reports: UpcomingHourReport[] = [];
    const settings = getAppointmentSettings();

    for (let h = 0; h < hoursAhead; h++) {
        const targetHour = currentHour + h;
        const hourStr = `${targetHour.toString().padStart(2, '0')}:00`;
        const nextHourStr = `${(targetHour + 1).toString().padStart(2, '0')}:00`;

        // فلترة المواعيد للساعة المحددة
        const hourAppointments = appointments.filter(a => {
            const appointmentHour = parseInt(a.timeSlot.startTime.split(':')[0]);
            return appointmentHour === targetHour &&
                a.status !== AppointmentStatus.Cancelled &&
                a.status !== AppointmentStatus.NoShow;
        });

        const visitors: ExpectedVisitor[] = hourAppointments.map(a => ({
            appointmentId: a.id,
            citizenName: a.fullName,
            nationalId: a.citizenId,
            phoneNumber: a.phoneNumber,
            scheduledTime: a.timeSlot.startTime,
            serviceCategory: a.serviceCategory,
            priority: a.priority,
            status: a.status,
            notes: a.notes
        }));

        // حساب نسبة الاستخدام
        const capacityPercentage = Math.round((hourAppointments.length / settings.maxAppointmentsPerSlot) * 100);

        reports.push({
            hour: hourStr,
            expectedCount: visitors.length,
            visitors,
            capacityPercentage: Math.min(capacityPercentage, 100)
        });
    }

    return reports;
};

/**
 * الحصول على تقرير المراجعين لليوم بالكامل
 */
export const getDailyVisitorReport = (date?: string): {
    totalExpected: number;
    arrived: number;
    pending: number;
    hourlyBreakdown: UpcomingHourReport[];
} => {
    const targetDate = date || new Date().toISOString().split('T')[0];
    const appointments = getAppointmentsByDate(targetDate);
    const settings = getAppointmentSettings();

    const [startHour] = settings.workStartTime.split(':').map(Number);
    const [endHour] = settings.workEndTime.split(':').map(Number);

    const hourlyBreakdown: UpcomingHourReport[] = [];

    for (let h = startHour; h < endHour; h++) {
        const hourStr = `${h.toString().padStart(2, '0')}:00`;

        const hourAppointments = appointments.filter(a => {
            const appointmentHour = parseInt(a.timeSlot.startTime.split(':')[0]);
            return appointmentHour === h;
        });

        const visitors: ExpectedVisitor[] = hourAppointments.map(a => ({
            appointmentId: a.id,
            citizenName: a.fullName,
            nationalId: a.citizenId,
            phoneNumber: a.phoneNumber,
            scheduledTime: a.timeSlot.startTime,
            serviceCategory: a.serviceCategory,
            priority: a.priority,
            status: a.status,
            notes: a.notes
        }));

        hourlyBreakdown.push({
            hour: hourStr,
            expectedCount: visitors.length,
            visitors,
            capacityPercentage: Math.round((visitors.length / settings.maxAppointmentsPerSlot) * 100)
        });
    }

    const totalExpected = appointments.filter(a =>
        a.status !== AppointmentStatus.Cancelled
    ).length;

    const arrived = appointments.filter(a =>
        a.status === AppointmentStatus.CheckedIn ||
        a.status === AppointmentStatus.InProgress ||
        a.status === AppointmentStatus.Completed
    ).length;

    const pending = appointments.filter(a =>
        a.status === AppointmentStatus.Confirmed ||
        a.status === AppointmentStatus.Pending
    ).length;

    return {
        totalExpected,
        arrived,
        pending,
        hourlyBreakdown
    };
};

// ==================== تحديث يومي تلقائي (Cron Job Simulation) ====================

/**
 * تحديث حالة المواعيد المتأخرة
 */
export const updateExpiredAppointments = (): number => {
    const appointments = getAppointments();
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    let updated = 0;

    appointments.forEach(a => {
        // تحويل المواعيد المؤكدة التي لم يحضر أصحابها إلى "لم يحضر"
        if (a.status === AppointmentStatus.Confirmed && a.date === today) {
            // إذا مر أكثر من 30 دقيقة على موعده
            const slotEnd = a.timeSlot.endTime;
            if (currentTime > slotEnd) {
                a.status = AppointmentStatus.NoShow;
                logAppointmentAction(a.id, 'cancelled', 'system', { reason: 'لم يحضر' });
                updated++;
            }
        }

        // إلغاء المواعيد المعلقة التي لم تُؤكد خلال 24 ساعة
        if (a.status === AppointmentStatus.Pending) {
            const createdAt = new Date(a.createdAt);
            const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

            if (hoursSinceCreation > 24) {
                a.status = AppointmentStatus.Cancelled;
                a.cancellationReason = 'لم يتم التأكيد خلال 24 ساعة';
                logAppointmentAction(a.id, 'cancelled', 'system', { reason: 'auto-expire' });
                updated++;
            }
        }
    });

    if (updated > 0) {
        saveAppointments(appointments);
    }

    return updated;
};

/**
 * تشغيل المهام المجدولة (يُستدعى عند فتح التطبيق)
 */
export const runScheduledTasks = (): void => {
    // تحديث المواعيد المنتهية
    updateExpiredAppointments();

    // إعادة تعيين العدادات الأسبوعية (كل يوم أحد)
    const today = new Date();
    if (today.getDay() === 0) {
        const lastReset = localStorage.getItem('last_weekly_reset');
        const todayStr = today.toISOString().split('T')[0];

        if (lastReset !== todayStr) {
            resetThrottleCounters('week');
            localStorage.setItem('last_weekly_reset', todayStr);
        }
    }

    // إعادة تعيين العدادات الشهرية (أول كل شهر)
    if (today.getDate() === 1) {
        const lastReset = localStorage.getItem('last_monthly_reset');
        const monthStr = `${today.getFullYear()}-${today.getMonth() + 1}`;

        if (lastReset !== monthStr) {
            resetThrottleCounters('month');
            localStorage.setItem('last_monthly_reset', monthStr);
        }
    }
};