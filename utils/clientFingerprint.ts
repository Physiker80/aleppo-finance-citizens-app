import { ClientFingerprint } from '../types';

/**
 * أدوات بصمة العميل
 * Client Fingerprinting Utilities
 * 
 * يوفر أدوات متقدمة لتوليد وتحليل بصمة العميل:
 * - جمع خصائص المتصفح والجهاز
 * - حساب hash البصمة
 * - مقارنة البصمات
 * - كشف التغييرات المشبوهة
 */
export class ClientFingerprintManager {
  
  /**
   * توليد بصمة شاملة للعميل
   */
  public static generateFingerprint(): ClientFingerprint {
    const fingerprint: ClientFingerprint = {
      userAgent: this.getUserAgent(),
      ipAddress: 'auto-detect', // سيتم تحديثها من الخادم
      screenResolution: this.getScreenResolution(),
      timezone: this.getTimezone(),
      language: this.getLanguage(),
      platform: this.getPlatform(),
      cookiesEnabled: this.getCookiesEnabled(),
      doNotTrack: this.getDoNotTrack(),
      fingerprint: ''
    };

    // إضافة خصائص إضافية للدقة
    const additionalData = this.getAdditionalFingerprints();
    
    // حساب البصمة النهائية
    fingerprint.fingerprint = this.computeFingerprint({
      ...fingerprint,
      ...additionalData
    });

    return fingerprint;
  }

  /**
   * الحصول على User-Agent
   */
  private static getUserAgent(): string {
    if (typeof window !== 'undefined' && window.navigator) {
      return window.navigator.userAgent;
    }
    return 'server-side';
  }

  /**
   * الحصول على دقة الشاشة
   */
  private static getScreenResolution(): string {
    if (typeof window !== 'undefined' && window.screen) {
      const screen = window.screen;
      return `${screen.width}x${screen.height}@${screen.colorDepth}bit`;
    }
    return 'unknown';
  }

  /**
   * الحصول على المنطقة الزمنية
   */
  private static getTimezone(): string {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch (e) {
      // احتياطي للمتصفحات القديمة
      const offset = new Date().getTimezoneOffset();
      const hours = Math.abs(Math.floor(offset / 60));
      const minutes = Math.abs(offset % 60);
      const sign = offset > 0 ? '-' : '+';
      return `UTC${sign}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
  }

  /**
   * الحصول على اللغة
   */
  private static getLanguage(): string {
    if (typeof window !== 'undefined' && window.navigator) {
      return window.navigator.language || 'ar';
    }
    return 'ar';
  }

  /**
   * الحصول على المنصة
   */
  private static getPlatform(): string {
    if (typeof window !== 'undefined' && window.navigator) {
      return window.navigator.platform || 'unknown';
    }
    return 'server';
  }

  /**
   * فحص تمكين الكوكيز
   */
  private static getCookiesEnabled(): boolean {
    if (typeof window !== 'undefined' && window.navigator) {
      return window.navigator.cookieEnabled;
    }
    return false;
  }

  /**
   * الحصول على إعداد Do Not Track
   */
  private static getDoNotTrack(): boolean {
    if (typeof window !== 'undefined' && window.navigator) {
      return window.navigator.doNotTrack === '1';
    }
    return false;
  }

  /**
   * جمع خصائص إضافية للبصمة
   */
  private static getAdditionalFingerprints(): any {
    const data: any = {};

    if (typeof window !== 'undefined') {
      // خصائص الشاشة الإضافية
      if (window.screen) {
        data.availWidth = window.screen.availWidth;
        data.availHeight = window.screen.availHeight;
        data.pixelDepth = window.screen.pixelDepth;
      }

      // معلومات المتصفح
      if (window.navigator) {
        data.hardwareConcurrency = window.navigator.hardwareConcurrency || 0;
        data.deviceMemory = (window.navigator as any).deviceMemory || 0;
        data.maxTouchPoints = window.navigator.maxTouchPoints || 0;
      }

      // خصائص النافذة
      data.innerWidth = window.innerWidth;
      data.innerHeight = window.innerHeight;
      data.outerWidth = window.outerWidth;
      data.outerHeight = window.outerHeight;

      // فحص الإضافات (plugins) - بحذر لأسباب الخصوصية
      if (window.navigator.plugins) {
        data.pluginsCount = window.navigator.plugins.length;
      }

      // معلومات التوقيت
      if (window.performance && window.performance.timing) {
        data.connectionRtt = (window.navigator as any).connection?.rtt || 0;
        data.connectionType = (window.navigator as any).connection?.effectiveType || 'unknown';
      }

      // كشف الخصائص المتقدمة
      data.webgl = this.getWebGLFingerprint();
      data.canvas = this.getCanvasFingerprint();
      data.fonts = this.getFontFingerprint();
    }

    return data;
  }

  /**
   * بصمة WebGL
   */
  private static getWebGLFingerprint(): string {
    try {
      if (typeof window === 'undefined') return 'server-side';
      
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') as WebGLRenderingContext;
      
      if (!gl) return 'no-webgl';
      
      const renderer = gl.getParameter(gl.RENDERER);
      const vendor = gl.getParameter(gl.VENDOR);
      
      return `${vendor}|${renderer}`.substring(0, 50); // تحديد الطول للأمان
    } catch (e) {
      return 'webgl-error';
    }
  }

  /**
   * بصمة Canvas
   */
  private static getCanvasFingerprint(): string {
    try {
      if (typeof window === 'undefined') return 'server-side';
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) return 'no-canvas';
      
      // رسم نص باللغة العربية
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('بوابة الخدمات الإلكترونية 🏛️', 2, 2);
      
      // تحويل إلى hash
      const imageData = canvas.toDataURL();
      return this.simpleHash(imageData).toString();
    } catch (e) {
      return 'canvas-error';
    }
  }

  /**
   * بصمة الخطوط المتاحة
   */
  private static getFontFingerprint(): string {
    try {
      if (typeof window === 'undefined') return 'server-side';
      
      // قائمة الخطوط الشائعة للاختبار
      const testFonts = [
        'Arial', 'Times New Roman', 'Helvetica', 'Georgia', 
        'Verdana', 'Tahoma', 'Calibri', 'Trebuchet MS',
        'Cairo', 'Amiri', 'Scheherazade', 'Noto Sans Arabic'
      ];
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return 'no-canvas';
      
      const baseline = 'مرحبا'; // نص اختبار باللغة العربية
      ctx.font = '72px serif';
      ctx.fillText(baseline, 10, 100);
      const baselineData = canvas.toDataURL();
      
      const availableFonts: string[] = [];
      
      testFonts.forEach(font => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = `72px "${font}", serif`;
        ctx.fillText(baseline, 10, 100);
        
        if (canvas.toDataURL() !== baselineData) {
          availableFonts.push(font);
        }
      });
      
      return availableFonts.join(',');
    } catch (e) {
      return 'font-error';
    }
  }

  /**
   * حساب hash البصمة الشاملة
   */
  private static computeFingerprint(data: any): string {
    // تجميع البيانات في string واحد
    const components = [
      data.userAgent,
      data.screenResolution,
      data.timezone,
      data.language,
      data.platform,
      data.cookiesEnabled?.toString(),
      data.doNotTrack?.toString(),
      data.availWidth?.toString(),
      data.availHeight?.toString(),
      data.pixelDepth?.toString(),
      data.hardwareConcurrency?.toString(),
      data.deviceMemory?.toString(),
      data.maxTouchPoints?.toString(),
      data.webgl,
      data.canvas,
      data.fonts
    ].join('|');

    return this.simpleHash(components).toString(16);
  }

  /**
   * hash بسيط (للإنتاج استخدم crypto.subtle.digest)
   */
  private static simpleHash(str: string): number {
    let hash = 0;
    if (str.length === 0) return hash;
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // تحويل إلى 32bit integer
    }
    
    return Math.abs(hash);
  }

  /**
   * مقارنة بصمتين
   */
  public static compareFingerprints(
    fp1: ClientFingerprint, 
    fp2: ClientFingerprint
  ): {
    similarity: number;
    differences: string[];
    isSuspicious: boolean;
  } {
    const differences: string[] = [];
    let matches = 0;
    const totalChecks = 7;

    // فحص المطابقات
    if (fp1.userAgent === fp2.userAgent) matches++;
    else differences.push('User-Agent مختلف');

    if (fp1.screenResolution === fp2.screenResolution) matches++;
    else differences.push('دقة الشاشة مختلفة');

    if (fp1.timezone === fp2.timezone) matches++;
    else differences.push('المنطقة الزمنية مختلفة');

    if (fp1.language === fp2.language) matches++;
    else differences.push('اللغة مختلفة');

    if (fp1.platform === fp2.platform) matches++;
    else differences.push('المنصة مختلفة');

    if (fp1.cookiesEnabled === fp2.cookiesEnabled) matches++;
    else differences.push('إعداد الكوكيز مختلف');

    if (fp1.doNotTrack === fp2.doNotTrack) matches++;
    else differences.push('إعداد Do Not Track مختلف');

    const similarity = matches / totalChecks;
    
    // اعتبار التغيير مشبوهاً إذا كانت نسبة التطابق أقل من 70%
    const isSuspicious = similarity < 0.7;

    return {
      similarity,
      differences,
      isSuspicious
    };
  }

  /**
   * تحديث عنوان IP في البصمة
   */
  public static updateIpAddress(fingerprint: ClientFingerprint, ipAddress: string): ClientFingerprint {
    const updated = { ...fingerprint };
    updated.ipAddress = ipAddress;
    
    // إعادة حساب hash البصمة مع IP الجديد
    updated.fingerprint = this.computeFingerprint(updated);
    
    return updated;
  }

  /**
   * التحقق من تغيير IP
   */
  public static isIpChangeSignificant(oldIp: string, newIp: string): boolean {
    if (oldIp === newIp) return false;
    if (oldIp === 'auto-detect' || newIp === 'auto-detect') return false;
    
    // فحص إذا كان التغيير في نفس الشبكة المحلية
    try {
      const oldParts = oldIp.split('.');
      const newParts = newIp.split('.');
      
      if (oldParts.length === 4 && newParts.length === 4) {
        // نفس الشبكة الفرعية /24
        if (oldParts[0] === newParts[0] && 
            oldParts[1] === newParts[1] && 
            oldParts[2] === newParts[2]) {
          return false; // تغيير في نفس الشبكة المحلية
        }
      }
    } catch (e) {
      // في حالة IPv6 أو تنسيق مختلف
    }
    
    return true; // تغيير كبير في IP
  }

  /**
   * تصدير البصمة للتخزين
   */
  public static serializeFingerprint(fingerprint: ClientFingerprint): string {
    return JSON.stringify({
      ua: fingerprint.userAgent.substring(0, 100), // تحديد الطول
      sr: fingerprint.screenResolution,
      tz: fingerprint.timezone,
      lg: fingerprint.language,
      pt: fingerprint.platform,
      ce: fingerprint.cookiesEnabled,
      dt: fingerprint.doNotTrack,
      fp: fingerprint.fingerprint
    });
  }

  /**
   * استرداد البصمة من التخزين
   */
  public static deserializeFingerprint(serialized: string): ClientFingerprint | null {
    try {
      const data = JSON.parse(serialized);
      return {
        userAgent: data.ua || 'unknown',
        ipAddress: 'auto-detect',
        screenResolution: data.sr || 'unknown',
        timezone: data.tz || 'UTC',
        language: data.lg || 'ar',
        platform: data.pt || 'unknown',
        cookiesEnabled: data.ce || false,
        doNotTrack: data.dt || false,
        fingerprint: data.fp || ''
      };
    } catch (e) {
      return null;
    }
  }
}

// تصدير دالة سريعة لتوليد البصمة
export const generateClientFingerprint = () => ClientFingerprintManager.generateFingerprint();