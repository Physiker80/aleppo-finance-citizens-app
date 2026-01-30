/**
 * أنواع بيانات نظام حجز المواعيد
 * Appointment Booking System Types
 */

// ==================== حالات الموعد ====================
export enum AppointmentStatus {
    Pending = 'pending',           // في انتظار التأكيد
    Confirmed = 'confirmed',       // مؤكد
    CheckedIn = 'checked_in',      // تم تسجيل الحضور
    InProgress = 'in_progress',    // قيد المعالجة
    Completed = 'completed',       // مكتمل
    Cancelled = 'cancelled',       // ملغي
    NoShow = 'no_show',           // لم يحضر
    Rescheduled = 'rescheduled'   // تم إعادة الجدولة
}

// ==================== أنواع المعاملات ====================
export enum ServiceCategory {
    TaxPayment = 'tax_payment',                    // دفع ضريبة
    TaxObjection = 'tax_objection',               // اعتراض على تكليف
    TaxExemption = 'tax_exemption',               // طلب إعفاء ضريبي
    TaxCertificate = 'tax_certificate',           // شهادة براءة ذمة
    PropertyAssessment = 'property_assessment',    // تقييم عقاري
    CommercialLicense = 'commercial_license',     // رخصة تجارية
    FinancialInquiry = 'financial_inquiry',       // استعلام مالي
    DocumentCollection = 'document_collection',   // استلام وثائق
    ComplaintSubmission = 'complaint_submission', // تقديم شكوى
    Other = 'other'                               // أخرى
}

// ==================== أولوية الموعد ====================
export enum AppointmentPriority {
    Normal = 'normal',       // عادي
    Elderly = 'elderly',     // كبار السن
    Disabled = 'disabled',   // ذوي الاحتياجات الخاصة
    Wounded = 'wounded',     // جرحى الحرب
    Emergency = 'emergency', // طارئ
    VIP = 'vip'             // شخصية مهمة
}

// ==================== معلومات الموعد ====================
export interface Appointment {
    id: string;

    // معلومات المراجع
    citizenId: string;           // الرقم الوطني
    fullName: string;
    phoneNumber: string;
    email?: string;

    // معلومات الموعد
    date: string;                // التاريخ YYYY-MM-DD
    timeSlot: TimeSlot;
    serviceCategory: ServiceCategory;
    serviceDescription?: string;

    // الحالة والأولوية
    status: AppointmentStatus;
    priority: AppointmentPriority;

    // التوزيع
    assignedCounter?: number;    // رقم النافذة
    assignedEmployee?: string;   // اسم المستخدم للموظف

    // التحقق
    isVerified: boolean;
    verificationCode?: string;
    qrCode?: string;

    // التوقيت
    createdAt: string;
    confirmedAt?: string;
    checkedInAt?: string;
    startedAt?: string;
    completedAt?: string;
    cancelledAt?: string;

    // ملاحظات
    notes?: string;
    cancellationReason?: string;

    // للعمل بدون إنترنت
    syncStatus: 'synced' | 'pending' | 'conflict';
    lastSyncedAt?: string;
}

// ==================== الفترة الزمنية ====================
export interface TimeSlot {
    id: string;
    startTime: string;     // HH:MM
    endTime: string;       // HH:MM
    maxCapacity: number;   // الحد الأقصى للمراجعين
    currentBookings: number;
    isAvailable: boolean;
}

// ==================== النافذة/الكاونتر ====================
export interface Counter {
    id: number;
    name: string;
    isActive: boolean;
    assignedEmployee?: string;
    currentAppointment?: string; // appointment id
    serviceCategories: ServiceCategory[]; // الخدمات التي تقدمها النافذة
    queueLength: number;
    averageServiceTime: number; // بالدقائق
}

// ==================== إعدادات النظام ====================
export interface AppointmentSettings {
    // ساعات العمل
    workStartTime: string;      // HH:MM
    workEndTime: string;        // HH:MM
    slotDurationMinutes: number; // مدة الفترة بالدقائق

    // السعة
    maxAppointmentsPerSlot: number;
    maxAppointmentsPerDay: number;
    maxAdvanceBookingDays: number; // أقصى عدد أيام للحجز المسبق

    // النوافذ
    totalCounters: number;

    // التحقق
    requirePhoneVerification: boolean;
    requireNationalId: boolean;

    // الإشعارات
    sendSmsConfirmation: boolean;
    sendSmsReminder: boolean;
    reminderHoursBefore: number;

    // الاستثناءات
    allowEmergencyAppointments: boolean;
    priorityQueueEnabled: boolean;

    // أيام العطل
    holidays: string[]; // YYYY-MM-DD
    weekendDays: number[]; // 0 = Sunday, 5 = Friday, 6 = Saturday
}

// ==================== إحصائيات المواعيد ====================
export interface AppointmentStats {
    today: {
        total: number;
        completed: number;
        pending: number;
        noShow: number;
        cancelled: number;
        inProgress: number;
    };

    byService: Record<ServiceCategory, number>;
    byCounter: Record<number, number>;
    byHour: Record<string, number>;

    averageWaitTime: number;      // بالدقائق
    averageServiceTime: number;   // بالدقائق

    peakHours: string[];
    busiestDays: string[];
}

// ==================== طابور الانتظار ====================
export interface QueueEntry {
    appointmentId: string;
    position: number;
    estimatedWaitMinutes: number;
    priority: AppointmentPriority;
    serviceCategory: ServiceCategory;
    checkedInAt: string;
}

// ==================== التحقق بـ OTP ====================
export interface OTPVerification {
    id: string;
    phoneNumber: string;
    nationalId?: string;
    code: string;
    expiresAt: string;
    attempts: number;
    maxAttempts: number;
    isUsed: boolean;
    createdAt: string;
}

// ==================== سجل النظام ====================
export interface AppointmentLog {
    id: string;
    appointmentId: string;
    action: 'created' | 'confirmed' | 'checked_in' | 'started' | 'completed' | 'cancelled' | 'rescheduled' | 'transferred';
    performedBy: string;
    performedAt: string;
    details?: Record<string, any>;
}

// ==================== تقرير الموظف ====================
export interface EmployeePerformance {
    employeeId: string;
    employeeName: string;
    counter: number;

    appointmentsHandled: number;
    averageServiceTime: number;

    byService: Record<ServiceCategory, number>;
    ratings?: {
        average: number;
        count: number;
    };
}

// ==================== ثوابت ====================
export const SERVICE_LABELS: Record<ServiceCategory, string> = {
    [ServiceCategory.TaxPayment]: 'دفع ضريبة',
    [ServiceCategory.TaxObjection]: 'اعتراض على تكليف',
    [ServiceCategory.TaxExemption]: 'طلب إعفاء ضريبي',
    [ServiceCategory.TaxCertificate]: 'شهادة براءة ذمة',
    [ServiceCategory.PropertyAssessment]: 'تقييم عقاري',
    [ServiceCategory.CommercialLicense]: 'رخصة تجارية',
    [ServiceCategory.FinancialInquiry]: 'استعلام مالي',
    [ServiceCategory.DocumentCollection]: 'استلام وثائق',
    [ServiceCategory.ComplaintSubmission]: 'تقديم شكوى',
    [ServiceCategory.Other]: 'أخرى'
};

export const STATUS_LABELS: Record<AppointmentStatus, string> = {
    [AppointmentStatus.Pending]: 'في الانتظار',
    [AppointmentStatus.Confirmed]: 'مؤكد',
    [AppointmentStatus.CheckedIn]: 'تم الحضور',
    [AppointmentStatus.InProgress]: 'قيد المعالجة',
    [AppointmentStatus.Completed]: 'مكتمل',
    [AppointmentStatus.Cancelled]: 'ملغي',
    [AppointmentStatus.NoShow]: 'لم يحضر',
    [AppointmentStatus.Rescheduled]: 'تم إعادة الجدولة'
};

export const PRIORITY_LABELS: Record<AppointmentPriority, string> = {
    [AppointmentPriority.Normal]: 'عادي',
    [AppointmentPriority.Elderly]: 'كبار السن',
    [AppointmentPriority.Disabled]: 'ذوي الاحتياجات الخاصة',
    [AppointmentPriority.Wounded]: 'جرحى الحرب',
    [AppointmentPriority.Emergency]: 'طارئ',
    [AppointmentPriority.VIP]: 'شخصية مهمة'
};

export const STATUS_COLORS: Record<AppointmentStatus, string> = {
    [AppointmentStatus.Pending]: 'bg-yellow-100 text-yellow-800',
    [AppointmentStatus.Confirmed]: 'bg-blue-100 text-blue-800',
    [AppointmentStatus.CheckedIn]: 'bg-purple-100 text-purple-800',
    [AppointmentStatus.InProgress]: 'bg-orange-100 text-orange-800',
    [AppointmentStatus.Completed]: 'bg-green-100 text-green-800',
    [AppointmentStatus.Cancelled]: 'bg-red-100 text-red-800',
    [AppointmentStatus.NoShow]: 'bg-gray-100 text-gray-800',
    [AppointmentStatus.Rescheduled]: 'bg-indigo-100 text-indigo-800'
};

export const PRIORITY_COLORS: Record<AppointmentPriority, string> = {
    [AppointmentPriority.Normal]: 'bg-gray-100 text-gray-800',
    [AppointmentPriority.Elderly]: 'bg-blue-100 text-blue-800',
    [AppointmentPriority.Disabled]: 'bg-purple-100 text-purple-800',
    [AppointmentPriority.Wounded]: 'bg-red-100 text-red-800',
    [AppointmentPriority.Emergency]: 'bg-red-200 text-red-900',
    [AppointmentPriority.VIP]: 'bg-yellow-100 text-yellow-800'
};

// ==================== الإعدادات الافتراضية ====================
export const DEFAULT_APPOINTMENT_SETTINGS: AppointmentSettings = {
    workStartTime: '08:00',
    workEndTime: '14:00',
    slotDurationMinutes: 15,

    maxAppointmentsPerSlot: 5,
    maxAppointmentsPerDay: 100,
    maxAdvanceBookingDays: 14,

    totalCounters: 5,

    requirePhoneVerification: true,
    requireNationalId: true,

    sendSmsConfirmation: true,
    sendSmsReminder: true,
    reminderHoursBefore: 24,

    allowEmergencyAppointments: true,
    priorityQueueEnabled: true,

    holidays: [],
    weekendDays: [5, 6] // الجمعة والسبت
};
// ==================== القدرة الاستيعابية للأقسام ====================
export interface DepartmentCapacity {
    id: string;
    departmentName: string;
    serviceCategory: ServiceCategory;

    // السعة بحسب الساعة
    hourlyCapacity: Record<string, number>; // "08:00" -> 10
    defaultHourlyCapacity: number;

    // الموظفون المتاحون
    availableEmployees: number;

    // إعدادات إضافية
    isActive: boolean;
    description?: string;
}

// ==================== الفترات المحظورة ====================
export interface BlockedSlot {
    id: string;
    date: string;              // YYYY-MM-DD
    startTime: string;         // HH:MM
    endTime: string;           // HH:MM
    reason: BlockedReason;
    description?: string;
    departmentId?: string;     // null = كل الأقسام
    createdBy: string;
    createdAt: string;
}

export enum BlockedReason {
    Maintenance = 'maintenance',         // صيانة
    Emergency = 'emergency',             // طوارئ
    Meeting = 'meeting',                 // اجتماع
    Holiday = 'holiday',                 // عطلة
    Training = 'training',               // تدريب
    SystemUpdate = 'system_update',      // تحديث النظام
    Other = 'other'                      // أخرى
}

export const BLOCKED_REASON_LABELS: Record<BlockedReason, string> = {
    [BlockedReason.Maintenance]: 'صيانة إدارية',
    [BlockedReason.Emergency]: 'حالة طوارئ',
    [BlockedReason.Meeting]: 'اجتماع',
    [BlockedReason.Holiday]: 'عطلة',
    [BlockedReason.Training]: 'تدريب الموظفين',
    [BlockedReason.SystemUpdate]: 'تحديث النظام',
    [BlockedReason.Other]: 'سبب آخر'
};

// ==================== قيود الحجز (Throttling) ====================
export interface BookingThrottle {
    nationalId: string;
    lastBookingDate: string;
    bookingsThisWeek: number;
    bookingsThisMonth: number;
    totalBookings: number;
}

export interface ThrottleSettings {
    maxBookingsPerWeek: number;        // الحد الأقصى للحجوزات أسبوعياً
    maxBookingsPerMonth: number;       // الحد الأقصى شهرياً
    cooldownDays: number;              // أيام الانتظار بين الحجوزات
    exemptPriorities: AppointmentPriority[]; // الأولويات المستثناة
}

export const DEFAULT_THROTTLE_SETTINGS: ThrottleSettings = {
    maxBookingsPerWeek: 1,
    maxBookingsPerMonth: 4,
    cooldownDays: 7,
    exemptPriorities: [
        AppointmentPriority.Emergency,
        AppointmentPriority.Wounded,
        AppointmentPriority.Disabled
    ]
};

// ==================== حساب المواعيد المتاحة ====================
export interface SlotAvailability {
    slotId: string;
    date: string;
    startTime: string;
    endTime: string;

    totalCapacity: number;        // السعة الكلية
    confirmedBookings: number;    // الحجوزات المؤكدة
    blockedSlots: number;         // الفترات المحظورة
    availableSlots: number;       // المتاح = الكلي - (مؤكد + محظور)

    isAvailable: boolean;
    unavailabilityReason?: string;
}

// ==================== المراجعون المتوقعون ====================
export interface ExpectedVisitor {
    appointmentId: string;
    citizenName: string;
    nationalId: string;
    phoneNumber: string;

    scheduledTime: string;
    serviceCategory: ServiceCategory;
    priority: AppointmentPriority;

    status: AppointmentStatus;
    notes?: string;
}

export interface UpcomingHourReport {
    hour: string;              // "09:00"
    expectedCount: number;
    visitors: ExpectedVisitor[];
    capacityPercentage: number;
}