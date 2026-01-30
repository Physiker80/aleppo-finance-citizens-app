/**
 * مرغم الأرقام العربية اللاتينية - لضمان عدم ظهور الأرقام الهندية مطلقاً
 * يتولى إجبار جميع الدوال والواجهات على استخدام الأرقام العربية اللاتينية (0123456789)
 * بدلاً من الأرقام الهندية (٠١٢٣٤٥٦٧٨٩)
 */

// المنطقة المعيارية للأرقام العربية اللاتينية
export const ARABIC_LATIN_LOCALE = 'ar-SY-u-nu-latn';

/**
 * إعدادات التنسيق الافتراضية للتواريخ والأوقات
 */
export const DEFAULT_DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'long', 
  day: 'numeric'
};

export const DEFAULT_TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false
};

export const DEFAULT_DATETIME_OPTIONS: Intl.DateTimeFormatOptions = {
  ...DEFAULT_DATE_OPTIONS,
  ...DEFAULT_TIME_OPTIONS
};

/**
 * دالة تنسيق التاريخ والوقت بالأرقام العربية اللاتينية
 * @param date التاريخ المراد تنسيقه
 * @param options إعدادات التنسيق الإضافية
 * @returns التاريخ منسق بالأرقام العربية اللاتينية
 */
export function formatDateTimeArabic(
  date: Date | string | number, 
  options: Intl.DateTimeFormatOptions = DEFAULT_DATETIME_OPTIONS
): string {
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  return new Intl.DateTimeFormat(ARABIC_LATIN_LOCALE, options).format(dateObj);
}

/**
 * دالة تنسيق التاريخ فقط بالأرقام العربية اللاتينية  
 * @param date التاريخ المراد تنسيقه
 * @param options إعدادات التنسيق الإضافية
 * @returns التاريخ منسق بالأرقام العربية اللاتينية
 */
export function formatDateArabic(
  date: Date | string | number,
  options: Intl.DateTimeFormatOptions = DEFAULT_DATE_OPTIONS
): string {
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  return new Intl.DateTimeFormat(ARABIC_LATIN_LOCALE, options).format(dateObj);
}

/**
 * دالة تنسيق الوقت فقط بالأرقام العربية اللاتينية
 * @param date التاريخ المراد استخراج الوقت منه
 * @param options إعدادات التنسيق الإضافية
 * @returns الوقت منسق بالأرقام العربية اللاتينية
 */
export function formatTimeArabic(
  date: Date | string | number,
  options: Intl.DateTimeFormatOptions = DEFAULT_TIME_OPTIONS
): string {
  const dateObj = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  return new Intl.DateTimeFormat(ARABIC_LATIN_LOCALE, options).format(dateObj);
}

/**
 * دالة تنسيق الأرقام بالأرقام العربية اللاتينية
 * @param number الرقم المراد تنسيقه
 * @param options إعدادات التنسيق الإضافية
 * @returns الرقم منسق بالأرقام العربية اللاتينية
 */
export function formatNumberArabic(
  number: number,
  options?: Intl.NumberFormatOptions
): string {
  return new Intl.NumberFormat(ARABIC_LATIN_LOCALE, options).format(number);
}

/**
 * دالة تحويل أي أرقام هندية موجودة إلى أرقام عربية لاتينية
 * @param text النص المحتوي على أرقام هندية
 * @returns النص بعد تحويل الأرقام الهندية إلى عربية لاتينية
 */
export function convertHindiToArabicNumerals(text: string): string {
  const hindiToArabic = {
    '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
    '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9'
  } as const;

  return text.replace(/[٠-٩]/g, (match) => hindiToArabic[match as keyof typeof hindiToArabic] || match);
}

/**
 * إعادة تعريف دوال JavaScript الأصلية لإجبار استخدام الأرقام العربية اللاتينية
 */
export function enforceArabicNumeralsGlobally() {
  // حفظ المراجع الأصلية
  const originalToLocaleString = Date.prototype.toLocaleString;
  const originalToLocaleDateString = Date.prototype.toLocaleDateString;
  const originalToLocaleTimeString = Date.prototype.toLocaleTimeString;

  // إعادة تعريف Date.prototype.toLocaleString
  Date.prototype.toLocaleString = function(
    locales?: string | string[], 
    options?: Intl.DateTimeFormatOptions
  ) {
    // إذا تم استدعاء الدالة بدون معاملات أو بمنطقة عربية
    if (!locales || (typeof locales === 'string' && locales.startsWith('ar'))) {
      return originalToLocaleString.call(this, ARABIC_LATIN_LOCALE, options || DEFAULT_DATETIME_OPTIONS);
    }
    return originalToLocaleString.call(this, locales, options);
  };

  // إعادة تعريف Date.prototype.toLocaleDateString
  Date.prototype.toLocaleDateString = function(
    locales?: string | string[], 
    options?: Intl.DateTimeFormatOptions
  ) {
    if (!locales || (typeof locales === 'string' && locales.startsWith('ar'))) {
      return originalToLocaleDateString.call(this, ARABIC_LATIN_LOCALE, options || DEFAULT_DATE_OPTIONS);
    }
    return originalToLocaleDateString.call(this, locales, options);
  };

  // إعادة تعريف Date.prototype.toLocaleTimeString
  Date.prototype.toLocaleTimeString = function(
    locales?: string | string[], 
    options?: Intl.DateTimeFormatOptions
  ) {
    if (!locales || (typeof locales === 'string' && locales.startsWith('ar'))) {
      return originalToLocaleTimeString.call(this, ARABIC_LATIN_LOCALE, options || DEFAULT_TIME_OPTIONS);
    }
    return originalToLocaleTimeString.call(this, locales, options);
  };

  console.log('✅ تم تطبيق مرغم الأرقام العربية اللاتينية بنجاح');
}

/**
 * دالة مراقب DOM لتحويل أي أرقام هندية قد تظهر في الواجهة
 */
export function setupDOMNumeralWatcher() {
  // مراقب لتحويل أي محتوى نصي يحتوي على أرقام هندية
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.TEXT_NODE) {
            const textContent = node.textContent;
            if (textContent && /[٠-٩]/.test(textContent)) {
              node.textContent = convertHindiToArabicNumerals(textContent);
            }
          } else if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            // فحص محتوى العنصر وعناصره الفرعية
            element.querySelectorAll('*').forEach((child) => {
              if (child.textContent && /[٠-٩]/.test(child.textContent)) {
                child.textContent = convertHindiToArabicNumerals(child.textContent);
              }
            });
          }
        });
      } else if (mutation.type === 'characterData') {
        const textContent = mutation.target.textContent;
        if (textContent && /[٠-٩]/.test(textContent)) {
          mutation.target.textContent = convertHindiToArabicNumerals(textContent);
        }
      }
    });
  });

  // بدء مراقبة الصفحة
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
  });

  console.log('✅ تم تفعيل مراقب الأرقام الهندية في DOM');
  return observer;
}

/**
 * تهيئة النظام الكامل لضمان استخدام الأرقام العربية اللاتينية
 */
export function initializeArabicNumeralsSystem() {
  // تطبيق المرغم العام
  enforceArabicNumeralsGlobally();
  
  // تفعيل مراقب DOM
  const domObserver = setupDOMNumeralWatcher();
  
  // إضافة استماع لإعادة التحميل للحفاظ على الإعدادات
  window.addEventListener('beforeunload', () => {
    localStorage.setItem('arabicNumeralsForced', 'true');
  });

  // التحقق من الحالة عند تحميل الصفحة
  if (localStorage.getItem('arabicNumeralsForced') === 'true') {
    console.log('✅ نظام الأرقام العربية اللاتينية مفعل ومحفوظ');
  }

  return {
    domObserver,
    formatDateTimeArabic,
    formatDateArabic,
    formatTimeArabic,
    formatNumberArabic,
    convertHindiToArabicNumerals
  };
}

// تصدير افتراضي للوحدة
export default {
  ARABIC_LATIN_LOCALE,
  DEFAULT_DATE_OPTIONS,
  DEFAULT_TIME_OPTIONS,
  DEFAULT_DATETIME_OPTIONS,
  formatDateTimeArabic,
  formatDateArabic,
  formatTimeArabic,
  formatNumberArabic,
  convertHindiToArabicNumerals,
  enforceArabicNumeralsGlobally,
  setupDOMNumeralWatcher,
  initializeArabicNumeralsSystem
};