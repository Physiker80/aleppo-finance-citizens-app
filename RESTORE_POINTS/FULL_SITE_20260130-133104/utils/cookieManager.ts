import { CookiePreferences, CookieCategory, CookieDetails, DataCollection } from '../types';

export class CookieManager {
  private static instance: CookieManager;
  private readonly CONSENT_VERSION = '1.0';
  private readonly STORAGE_KEY = 'cookie_preferences';

  private constructor() {}

  static getInstance(): CookieManager {
    if (!CookieManager.instance) {
      CookieManager.instance = new CookieManager();
    }
    return CookieManager.instance;
  }

  // Default cookie categories with Arabic descriptions
  getCookieCategories(): CookieCategory[] {
    return [
      {
        id: 'essential',
        name: 'ملفات تعريف الارتباط الأساسية',
        description: 'هذه الملفات ضرورية لعمل الموقع بشكل صحيح ولا يمكن تعطيلها في أنظمتنا. عادة ما يتم تعيينها فقط استجابة للإجراءات التي تقوم بها والتي تعادل طلب الخدمات، مثل تعيين تفضيلات الخصوصية أو تسجيل الدخول أو ملء النماذج.',
        required: true,
        enabled: true,
        cookies: [
          {
            name: 'session_id',
            description: 'معرف الجلسة الآمن',
            purpose: 'المصادقة وإدارة جلسة المستخدم',
            duration: '24 ساعة',
            type: 'essential'
          },
          {
            name: 'csrf_token',
            description: 'رمز الحماية من التزوير',
            purpose: 'الحماية من هجمات التزوير عبر المواقع',
            duration: 'جلسة واحدة',
            type: 'essential'
          },
          {
            name: 'cookie_consent',
            description: 'تفضيلات ملفات تعريف الارتباط',
            purpose: 'حفظ موافقتك على استخدام ملفات تعريف الارتباط',
            duration: '365 يوم',
            type: 'essential'
          }
        ]
      },
      {
        id: 'security',
        name: 'ملفات تعريف الارتباط الأمنية',
        description: 'تستخدم هذه الملفات لحماية حسابك وبياناتك من التهديدات الأمنية، بما في ذلك اكتشاف الأنشطة المشبوهة والمصادقة متعددة العوامل.',
        required: false,
        enabled: true,
        cookies: [
          {
            name: 'fingerprint_hash',
            description: 'بصمة المتصفح المشفرة',
            purpose: 'اكتشاف الوصول غير المصرح به',
            duration: '30 يوم',
            type: 'security'
          },
          {
            name: 'mfa_challenge',
            description: 'حالة تحدي المصادقة متعددة العوامل',
            purpose: 'تتبع حالة المصادقة الإضافية',
            duration: '15 دقيقة',
            type: 'security'
          },
          {
            name: 'last_activity',
            description: 'طابع زمني للنشاط الأخير',
            purpose: 'مراقبة جلسة المستخدم والأمان',
            duration: '24 ساعة',
            type: 'security'
          }
        ]
      },
      {
        id: 'functional',
        name: 'ملفات تعريف الارتباط الوظيفية',
        description: 'تتيح هذه الملفات للموقع توفير وظائف محسنة وتخصيص شخصي. قد يتم تعيينها بواسطتنا أو بواسطة مقدمي خدمات خارجيين أضفنا خدماتهم إلى صفحاتنا.',
        required: false,
        enabled: false,
        cookies: [
          {
            name: 'language_preference',
            description: 'تفضيلات اللغة',
            purpose: 'حفظ اختيارك للغة المفضلة',
            duration: '365 يوم',
            type: 'functional'
          },
          {
            name: 'theme_preference',
            description: 'تفضيلات المظهر',
            purpose: 'حفظ اختيارك للمظهر المفضل (فاتح/داكن)',
            duration: '365 يوم',
            type: 'functional'
          },
          {
            name: 'form_drafts',
            description: 'مسودات النماذج',
            purpose: 'حفظ النماذج غير المكتملة تلقائياً',
            duration: '7 أيام',
            type: 'functional'
          }
        ]
      },
      {
        id: 'analytics',
        name: 'ملفات تعريف الارتباط التحليلية',
        description: 'تساعدنا هذه الملفات في فهم كيفية تفاعل الزوار مع موقعنا من خلال جمع المعلومات والإبلاغ عنها بشكل مجهول.',
        required: false,
        enabled: false,
        cookies: [
          {
            name: 'analytics_session',
            description: 'معرف جلسة التحليلات',
            purpose: 'تتبع جلسة المستخدم لأغراض التحليل',
            duration: '30 دقيقة',
            type: 'analytics'
          },
          {
            name: 'page_views',
            description: 'عداد مشاهدات الصفحة',
            purpose: 'قياس أداء الصفحات وشعبيتها',
            duration: '24 ساعة',
            type: 'analytics'
          },
          {
            name: 'user_journey',
            description: 'مسار المستخدم',
            purpose: 'فهم كيفية تنقل المستخدمين عبر الموقع',
            duration: '7 أيام',
            type: 'analytics'
          }
        ]
      }
    ];
  }

  // Data collection details in Arabic
  getDataCollectionDetails(): DataCollection[] {
    return [
      {
        category: 'بيانات التعريف الشخصي',
        dataType: 'الاسم، البريد الإلكتروني، رقم الهاتف، الرقم الوطني',
        purpose: 'تحديد هوية المستخدم وتوفير الخدمات المطلوبة',
        retention: 'حسب القوانين الحكومية السورية',
        processing: 'تتم معالجة البيانات محلياً في خوادم الحكومة السورية',
        sharing: 'لا تتم مشاركة البيانات مع أطراف خارجية إلا بموجب القانون'
      },
      {
        category: 'بيانات الاستعلامات والشكاوى',
        dataType: 'تفاصيل الاستعلام، الملفات المرفقة، تواريخ التقديم',
        purpose: 'معالجة الاستعلامات والشكاوى والرد عليها',
        retention: 'يتم الاحتفاظ بالبيانات لمدة 5 سنوات كحد أدنى',
        processing: 'تتم المعالجة من قبل الموظفين المخولين في مديرية المالية',
        sharing: 'قد تتم مشاركة البيانات مع الجهات الحكومية ذات الصلة'
      },
      {
        category: 'بيانات تقنية',
        dataType: 'عنوان IP، نوع المتصفح، نظام التشغيل، الطوابع الزمنية',
        purpose: 'ضمان أمان النظام ومراقبة الأنشطة المشبوهة',
        retention: '90 يوم للسجلات الأمنية',
        processing: 'تتم المعالجة تلقائياً بواسطة أنظمة الأمان',
        sharing: 'قد تتم مشاركة البيانات مع الجهات الأمنية عند الضرورة'
      },
      {
        category: 'ملفات تعريف الارتباط',
        dataType: 'معرفات الجلسة، تفضيلات المستخدم، بيانات الأمان',
        purpose: 'تحسين تجربة المستخدم وضمان أمان النظام',
        retention: 'من بضع دقائق إلى سنة واحدة حسب النوع',
        processing: 'تتم المعالجة محلياً في متصفح المستخدم والخادم',
        sharing: 'لا تتم مشاركة بيانات ملفات تعريف الارتباط مع أطراف خارجية'
      }
    ];
  }

  // Save user preferences
  savePreferences(preferences: CookiePreferences): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(preferences));
    } catch (error) {
      console.error('Failed to save cookie preferences:', error);
    }
  }

  // Load user preferences
  loadPreferences(): CookiePreferences | null {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const preferences = JSON.parse(stored);
        // Convert timestamp strings back to Date objects
        preferences.consentTimestamp = new Date(preferences.consentTimestamp);
        preferences.lastUpdated = new Date(preferences.lastUpdated);
        return preferences;
      }
    } catch (error) {
      console.error('Failed to load cookie preferences:', error);
    }
    return null;
  }

  // Check if user has given consent
  hasValidConsent(): boolean {
    const preferences = this.loadPreferences();
    return preferences !== null && preferences.acceptedVersion === this.CONSENT_VERSION;
  }

  // Create default preferences
  createDefaultPreferences(): CookiePreferences {
    return {
      consentTimestamp: new Date(),
      lastUpdated: new Date(),
      categories: {
        essential: true,
        functional: false,
        analytics: false,
        marketing: false,
        security: true
      },
      acceptedVersion: this.CONSENT_VERSION,
      ipAddress: this.getUserIP(),
      userAgent: navigator.userAgent
    };
  }

  // Get user IP (placeholder - in production this would be from server)
  private getUserIP(): string {
    // In a real application, this would be provided by the server
    return 'Unknown';
  }

  // Accept all cookies
  acceptAll(): void {
    const preferences = this.createDefaultPreferences();
    preferences.categories = {
      essential: true,
      functional: true,
      analytics: true,
      marketing: true,
      security: true
    };
    this.savePreferences(preferences);
  }

  // Accept only essential cookies
  acceptEssential(): void {
    const preferences = this.createDefaultPreferences();
    this.savePreferences(preferences);
  }

  // Update specific category preference
  updateCategoryPreference(category: keyof CookiePreferences['categories'], enabled: boolean): void {
    const preferences = this.loadPreferences() || this.createDefaultPreferences();
    preferences.categories[category] = enabled;
    preferences.lastUpdated = new Date();
    this.savePreferences(preferences);
  }

  // Get current consent version
  getConsentVersion(): string {
    return this.CONSENT_VERSION;
  }

  // Check if specific cookie category is enabled
  isCategoryEnabled(category: keyof CookiePreferences['categories']): boolean {
    const preferences = this.loadPreferences();
    return preferences?.categories[category] ?? false;
  }

  // Clear all cookie preferences (for testing)
  clearPreferences(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear cookie preferences:', error);
    }
  }
}