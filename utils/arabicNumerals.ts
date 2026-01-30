/**
 * دوال مساعدة لضمان استخدام الأرقام العربية (1234) في جميع أنحاء النظام
 * بدلاً من الأرقام الهندية (١٢٣٤)
 */

// إعدادات التنسيق للأرقام العربية
export const ARABIC_NUMERALS_LOCALE = 'ar-SY-u-nu-latn';

// إعدادات التاريخ والوقت
export const DATE_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'long',
  day: 'numeric'
};

export const TIME_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false
};

export const DATETIME_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
  ...DATE_FORMAT_OPTIONS,
  ...TIME_FORMAT_OPTIONS
};

/**
 * تنسيق الأرقام باستخدام الأرقام العربية
 * @param num الرقم المراد تنسيقه
 * @param options خيارات إضافية للتنسيق
 * @returns الرقم منسق بالأرقام العربية
 */
export function formatNumber(num: number, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(ARABIC_NUMERALS_LOCALE, options).format(num);
}

/**
 * تنسيق العملة باستخدام الأرقام العربية
 * @param amount المبلغ
 * @param currency العملة (افتراضي: ليرة سورية)
 * @returns المبلغ منسق بالأرقام العربية
 */
export function formatCurrency(amount: number, currency: string = 'SYP'): string {
  return new Intl.NumberFormat(ARABIC_NUMERALS_LOCALE, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0
  }).format(amount);
}

/**
 * تنسيق النسبة المئوية باستخدام الأرقام العربية
 * @param percentage النسبة (0-1)
 * @returns النسبة منسقة بالأرقام العربية
 */
export function formatPercentage(percentage: number): string {
  return new Intl.NumberFormat(ARABIC_NUMERALS_LOCALE, {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 1
  }).format(percentage);
}

/**
 * تنسيق التاريخ باستخدام الأرقام العربية
 * @param date التاريخ
 * @param options خيارات إضافية للتنسيق
 * @returns التاريخ منسق بالأرقام العربية
 */
export function formatDate(date: Date, options?: Intl.DateTimeFormatOptions): string {
  const formatOptions = options || DATE_FORMAT_OPTIONS;
  return new Intl.DateTimeFormat(ARABIC_NUMERALS_LOCALE, formatOptions).format(date);
}

/**
 * تنسيق الوقت باستخدام الأرقام العربية
 * @param date التاريخ والوقت
 * @param options خيارات إضافية للتنسيق
 * @returns الوقت منسق بالأرقام العربية
 */
export function formatTime(date: Date, options?: Intl.DateTimeFormatOptions): string {
  const formatOptions = options || TIME_FORMAT_OPTIONS;
  return new Intl.DateTimeFormat(ARABIC_NUMERALS_LOCALE, formatOptions).format(date);
}

/**
 * تنسيق التاريخ والوقت معاً باستخدام الأرقام العربية
 * @param date التاريخ والوقت
 * @param options خيارات إضافية للتنسيق
 * @returns التاريخ والوقت منسقان بالأرقام العربية
 */
export function formatDateTime(date: Date, options?: Intl.DateTimeFormatOptions): string {
  const formatOptions = options || DATETIME_FORMAT_OPTIONS;
  return new Intl.DateTimeFormat(ARABIC_NUMERALS_LOCALE, formatOptions).format(date);
}

/**
 * تنسيق تاريخ مختصر (يوم/شهر/سنة)
 * @param date التاريخ
 * @returns التاريخ المختصر بالأرقام العربية
 */
export function formatShortDate(date: Date): string {
  return new Intl.DateTimeFormat(ARABIC_NUMERALS_LOCALE, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
}

/**
 * تنسيق وقت مختصر (ساعة:دقيقة)
 * @param date التاريخ والوقت
 * @returns الوقت المختصر بالأرقام العربية
 */
export function formatShortTime(date: Date): string {
  return new Intl.DateTimeFormat(ARABIC_NUMERALS_LOCALE, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(date);
}

/**
 * تحويل أي أرقام هندية موجودة في النص إلى أرقام عربية
 * @param text النص المراد تحويله
 * @returns النص بعد تحويل الأرقام الهندية إلى عربية
 */
export function convertToArabicNumerals(text: string): string {
  const hindiToArabic: { [key: string]: string } = {
    '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
    '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9'
  };
  
  return text.replace(/[٠-٩]/g, (match) => hindiToArabic[match] || match);
}

/**
 * دالة مساعدة لتنسيق الأرقام الكبيرة (آلاف، ملايين، إلخ)
 * @param num الرقم
 * @returns الرقم منسق مع فواصل الآلاف
 */
export function formatLargeNumber(num: number): string {
  return formatNumber(num, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
}

/**
 * تنسيق المدة الزمنية (بالدقائق أو الساعات)
 * @param minutes عدد الدقائق
 * @returns المدة منسقة بالأرقام العربية
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${formatNumber(minutes)} دقيقة`;
  } else if (minutes < 1440) { // أقل من يوم
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
      return `${formatNumber(hours)} ساعة`;
    } else {
      return `${formatNumber(hours)} ساعة و ${formatNumber(remainingMinutes)} دقيقة`;
    }
  } else { // أكثر من يوم
    const days = Math.floor(minutes / 1440);
    const remainingHours = Math.floor((minutes % 1440) / 60);
    if (remainingHours === 0) {
      return `${formatNumber(days)} يوم`;
    } else {
      return `${formatNumber(days)} يوم و ${formatNumber(remainingHours)} ساعة`;
    }
  }
}

/**
 * تنسيق تاريخ نسبي (منذ كم يوم، إلخ)
 * @param date التاريخ
 * @returns التاريخ النسبي بالأرقام العربية
 */
export function formatRelativeDate(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffMinutes < 1) {
    return 'الآن';
  } else if (diffMinutes < 60) {
    return `منذ ${formatNumber(diffMinutes)} دقيقة`;
  } else if (diffHours < 24) {
    return `منذ ${formatNumber(diffHours)} ساعة`;
  } else if (diffDays < 30) {
    return `منذ ${formatNumber(diffDays)} يوم`;
  } else {
    return formatShortDate(date);
  }
}

// تصدير جميع الدوال كافتراضي
export default {
  ARABIC_NUMERALS_LOCALE,
  DATE_FORMAT_OPTIONS,
  TIME_FORMAT_OPTIONS,
  DATETIME_FORMAT_OPTIONS,
  formatNumber,
  formatCurrency,
  formatPercentage,
  formatDate,
  formatTime,
  formatDateTime,
  formatShortDate,
  formatShortTime,
  convertToArabicNumerals,
  formatLargeNumber,
  formatDuration,
  formatRelativeDate
};