/**
 * مكونات التكامل المتقدمة
 * Advanced Integration Components
 * - WhatsApp Share Button
 * - Location Map
 * - Calendar Integration
 */

import React, { useState, useEffect, useContext } from 'react';
import { Appointment, SERVICE_LABELS } from '../types/appointment';
import { AppContext } from '../App';
import { SiteConfig } from '../types';

// ==================== تكامل واتساب ====================

interface WhatsAppShareProps {
    appointment: Appointment;
    className?: string;
    variant?: 'button' | 'icon' | 'full';
}

/**
 * توليد نص التذكرة للمشاركة
 */
export const generateAppointmentTicketMessage = (appointment: Appointment, config?: SiteConfig): string => {
    const date = new Date(appointment.date).toLocaleDateString('ar-SY', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const dirName = config?.directorateName || 'مديرية مالية محافظة حلب';
    const address = config?.address || 'حلب - الجميلية - مبنى مديرية المالية';

    return `🎫 *تذكرة حجز موعد*
━━━━━━━━━━━━━━━
🏛️ ${dirName}
━━━━━━━━━━━━━━━

📋 *رقم الموعد:* ${appointment.id}

👤 *الاسم:* ${appointment.fullName}

📅 *التاريخ:* ${date}

⏰ *الوقت:* ${appointment.timeSlot.startTime}

📝 *نوع المعاملة:* ${SERVICE_LABELS[appointment.serviceCategory]}

${appointment.assignedCounter ? `🏢 *النافذة:* ${appointment.assignedCounter}` : ''}

━━━━━━━━━━━━━━━
⚠️ يرجى الحضور قبل 15 دقيقة
📍 العنوان: ${address}
━━━━━━━━━━━━━━━`;
};

/**
 * زر مشاركة واتساب
 */
export const WhatsAppShareButton: React.FC<WhatsAppShareProps> = ({
    appointment,
    className = '',
    variant = 'button'
}) => {
    const context = useContext(AppContext);
    const siteConfig = context?.siteConfig;

    const handleShare = () => {
        const message = generateAppointmentTicketMessage(appointment, siteConfig);
        const encodedMessage = encodeURIComponent(message);
        window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
    };

    if (variant === 'icon') {
        return (
            <button
                onClick={handleShare}
                className={`p-2 bg-green-500 hover:bg-green-600 text-white rounded-full 
                          transition-all shadow-lg hover:shadow-xl ${className}`}
                title="مشاركة عبر واتساب"
            >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
            </button>
        );
    }

    if (variant === 'full') {
        return (
            <button
                onClick={handleShare}
                className={`flex items-center justify-center gap-3 w-full py-3 px-6
                          bg-green-500 hover:bg-green-600 text-white font-bold
                          rounded-xl transition-all shadow-lg hover:shadow-xl ${className}`}
            >
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                <span>مشاركة عبر واتساب</span>
            </button>
        );
    }

    return (
        <button
            onClick={handleShare}
            className={`flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 
                      text-white font-medium rounded-lg transition-all ${className}`}
        >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            <span>واتساب</span>
        </button>
    );
};

// ==================== خريطة الوصول ====================

interface LocationMapProps {
    className?: string;
    showDirections?: boolean;
}

// موقع مديرية مالية حلب
// تم التحديث بناءً على الوصف: شارع خير الدين الأسدي مقابل جسر المالية
const FINANCE_LOCATION = {
    lat: 36.208187,
    lng: 37.140645,
    name: 'مديرية مالية محافظة حلب',
    address: 'حلب - الجميلية - شارع خير الدين الأسدي (مقابل جسر المالية)',
    phone: '021-2123456'
};

/**
 * مكون خريطة الوصول
 */
export const LocationMap: React.FC<LocationMapProps> = ({
    className = '',
    showDirections = true
}) => {
    const context = useContext(AppContext);
    const config = context?.siteConfig;
    const [showFullMap, setShowFullMap] = useState(false);

    const location = {
        lat: config?.location?.lat || FINANCE_LOCATION.lat,
        lng: config?.location?.lng || FINANCE_LOCATION.lng,
        name: config?.directorateName || FINANCE_LOCATION.name,
        address: config?.address || FINANCE_LOCATION.address,
        phone: config?.phone || FINANCE_LOCATION.phone
    };

    const openGoogleMaps = () => {
        const url = `https://www.google.com/maps/search/?api=1&query=${location.lat},${location.lng}`;
        window.open(url, '_blank');
    };

    const openDirections = () => {
        const url = `https://www.google.com/maps/dir/?api=1&destination=${location.lat},${location.lng}`;
        window.open(url, '_blank');
    };

    return (
        <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden ${className}`}>
            {/* خريطة مصغرة */}
            <div
                className="relative h-48 bg-gradient-to-br from-blue-100 to-blue-200 
                          dark:from-blue-900/30 dark:to-blue-800/30 cursor-pointer"
                onClick={() => setShowFullMap(!showFullMap)}
            >
                {/* صورة خريطة ثابتة */}
                <iframe
                    src={`https://maps.google.com/maps?q=${location.lat},${location.lng}&z=15&output=embed`}
                    className="w-full h-full border-0"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title={location.name}
                />

                {/* طبقة تفاعلية */}
                <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors 
                              flex items-center justify-center opacity-0 hover:opacity-100">
                    <span className="bg-white/90 dark:bg-gray-800/90 px-4 py-2 rounded-full 
                                   text-sm font-medium shadow-lg">
                        انقر للتكبير 🔍
                    </span>
                </div>
            </div>

            {/* معلومات الموقع */}
            <div className="p-4">
                <h3 className="font-bold text-gray-800 dark:text-white mb-2 flex items-center gap-2">
                    <span className="text-xl">📍</span>
                    {location.name}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {location.address}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">
                    📞 {location.phone}
                </p>

                {/* أزرار التوجيه */}
                {showDirections && (
                    <div className="flex gap-2">
                        <button
                            onClick={openGoogleMaps}
                            className="flex-1 flex items-center justify-center gap-2 py-2 px-4
                                     bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium
                                     rounded-lg transition-colors"
                        >
                            <span>🗺️</span>
                            عرض الخريطة
                        </button>
                        <button
                            onClick={openDirections}
                            className="flex-1 flex items-center justify-center gap-2 py-2 px-4
                                     bg-green-500 hover:bg-green-600 text-white text-sm font-medium
                                     rounded-lg transition-colors"
                        >
                            <span>🚗</span>
                            الاتجاهات
                        </button>
                    </div>
                )}
            </div>

            {/* نافذة منبثقة للخريطة الكاملة */}
            {showFullMap && (
                <div
                    className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
                    onClick={() => setShowFullMap(false)}
                >
                    <div
                        className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden 
                                  w-full max-w-3xl shadow-2xl"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="h-96">
                            <iframe
                                src={`https://maps.google.com/maps?q=${location.lat},${location.lng}&z=16&output=embed`}
                                className="w-full h-full border-0"
                                loading="lazy"
                                title={`${location.name} - عرض كامل`}
                            />
                        </div>
                        <div className="p-4 flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-gray-800 dark:text-white">
                                    {location.name}
                                </h3>
                                <p className="text-sm text-gray-500">{location.address}</p>
                            </div>
                            <button
                                onClick={() => setShowFullMap(false)}
                                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg 
                                         text-gray-700 dark:text-gray-300 hover:bg-gray-300 
                                         dark:hover:bg-gray-600"
                            >
                                إغلاق
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ==================== تقويم شخصي ====================

interface CalendarIntegrationProps {
    appointment: Appointment;
    className?: string;
}

/**
 * توليد رابط Google Calendar
 */
const generateGoogleCalendarUrl = (appointment: Appointment, config?: SiteConfig): string => {
    const startDate = new Date(`${appointment.date}T${appointment.timeSlot.startTime}:00`);
    const endDate = new Date(`${appointment.date}T${appointment.timeSlot.endTime}:00`);
    const address = config?.address || FINANCE_LOCATION.address;

    const formatDate = (date: Date) => date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    const params = new URLSearchParams({
        action: 'TEMPLATE',
        text: `موعد مديرية المالية - ${SERVICE_LABELS[appointment.serviceCategory]}`,
        dates: `${formatDate(startDate)}/${formatDate(endDate)}`,
        details: `رقم الموعد: ${appointment.id}\nنوع المعاملة: ${SERVICE_LABELS[appointment.serviceCategory]}\n\nيرجى الحضور قبل 15 دقيقة`,
        location: address,
        sf: 'true'
    });

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

/**
 * توليد ملف ICS للتقويم
 */
const generateICSFile = (appointment: Appointment, config?: SiteConfig): string => {
    const startDate = new Date(`${appointment.date}T${appointment.timeSlot.startTime}:00`);
    const endDate = new Date(`${appointment.date}T${appointment.timeSlot.endTime}:00`);
    const address = config?.address || FINANCE_LOCATION.address;

    const formatDate = (date: Date) => date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const now = formatDate(new Date());

    return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Aleppo Finance//Appointment System//AR
BEGIN:VEVENT
UID:${appointment.id}@aleppo-finance.gov.sy
DTSTAMP:${now}
DTSTART:${formatDate(startDate)}
DTEND:${formatDate(endDate)}
SUMMARY:موعد مديرية المالية - ${SERVICE_LABELS[appointment.serviceCategory]}
DESCRIPTION:رقم الموعد: ${appointment.id}\\nنوع المعاملة: ${SERVICE_LABELS[appointment.serviceCategory]}\\n\\nيرجى الحضور قبل 15 دقيقة
LOCATION:${address}
STATUS:CONFIRMED
BEGIN:VALARM
TRIGGER:-PT1H
ACTION:DISPLAY
DESCRIPTION:تذكير: موعدك في مديرية المالية بعد ساعة
END:VALARM
BEGIN:VALARM
TRIGGER:-P1D
ACTION:DISPLAY
DESCRIPTION:تذكير: لديك موعد غداً في مديرية المالية
END:VALARM
END:VEVENT
END:VCALENDAR`;
};

/**
 * مكون إضافة للتقويم
 */
export const CalendarIntegration: React.FC<CalendarIntegrationProps> = ({
    appointment,
    className = ''
}) => {
    const context = useContext(AppContext);
    const config = context?.siteConfig;
    const [showOptions, setShowOptions] = useState(false);

    const addToGoogleCalendar = () => {
        window.open(generateGoogleCalendarUrl(appointment, config), '_blank');
        setShowOptions(false);
    };

    const downloadICS = () => {
        const icsContent = generateICSFile(appointment, config);
        const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `موعد-${appointment.id}.ics`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setShowOptions(false);
    };

    const addToOutlook = () => {
        // Outlook Web
        const startDate = new Date(`${appointment.date}T${appointment.timeSlot.startTime}:00`);
        const endDate = new Date(`${appointment.date}T${appointment.timeSlot.endTime}:00`);
        const address = config?.address || FINANCE_LOCATION.address;

        const params = new URLSearchParams({
            path: '/calendar/action/compose',
            rru: 'addevent',
            startdt: startDate.toISOString(),
            enddt: endDate.toISOString(),
            subject: `موعد مديرية المالية - ${SERVICE_LABELS[appointment.serviceCategory]}`,
            body: `رقم الموعد: ${appointment.id}`,
            location: address
        });

        window.open(`https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`, '_blank');
        setShowOptions(false);
    };

    return (
        <div className={`relative ${className}`}>
            <button
                onClick={() => setShowOptions(!showOptions)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 
                         text-white font-medium rounded-lg transition-all"
            >
                <span>📅</span>
                <span>إضافة للتقويم</span>
                <svg
                    className={`w-4 h-4 transition-transform ${showOptions ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {/* قائمة الخيارات */}
            {showOptions && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 
                              rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 
                              overflow-hidden z-50 min-w-[200px]">
                    <button
                        onClick={addToGoogleCalendar}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 
                                 dark:hover:bg-gray-700 text-right transition-colors"
                    >
                        <span className="text-xl">📱</span>
                        <span className="text-gray-700 dark:text-gray-300">Google Calendar</span>
                    </button>
                    <button
                        onClick={addToOutlook}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 
                                 dark:hover:bg-gray-700 text-right transition-colors"
                    >
                        <span className="text-xl">📧</span>
                        <span className="text-gray-700 dark:text-gray-300">Outlook</span>
                    </button>
                    <button
                        onClick={downloadICS}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 
                                 dark:hover:bg-gray-700 text-right transition-colors 
                                 border-t border-gray-100 dark:border-gray-700"
                    >
                        <span className="text-xl">📥</span>
                        <span className="text-gray-700 dark:text-gray-300">تحميل ملف ICS</span>
                    </button>
                </div>
            )}
        </div>
    );
};

// ==================== أزرار المشاركة المجمعة ====================

interface ShareButtonsProps {
    appointment: Appointment;
    className?: string;
}

/**
 * مجموعة أزرار المشاركة
 */
export const AppointmentShareButtons: React.FC<ShareButtonsProps> = ({
    appointment,
    className = ''
}) => {
    return (
        <div className={`flex flex-wrap gap-3 ${className}`}>
            <WhatsAppShareButton appointment={appointment} />
            <CalendarIntegration appointment={appointment} />
        </div>
    );
};

export default {
    WhatsAppShareButton,
    LocationMap,
    CalendarIntegration,
    AppointmentShareButtons,
    generateAppointmentTicketMessage,
    FINANCE_LOCATION
};
