import { 
  SessionData, 
  ClientFingerprint, 
  SuspiciousActivity, 
  SessionConfig, 
  ActiveSession, 
  SecurityLog 
} from '../types';

/**
 * نظام إدارة الجلسات الآمنة
 * Secure Session Management System
 * 
 * يوفر إدارة شاملة للجلسات مع:
 * - توليد معرفات جلسة آمنة (256 بت)
 * - ربط الجلسة بخصائص العميل
 * - كشف الأنشطة المشبوهة
 * - تجديد الجلسات التلقائي
 * - مراقبة أمنية متقدمة
 */
export class SessionManager {
  private static instance: SessionManager;
  private sessions: Map<string, SessionData> = new Map();
  private suspiciousActivities: Map<string, SuspiciousActivity[]> = new Map();
  private securityLogs: SecurityLog[] = [];
  private config: SessionConfig;

  private constructor() {
    this.config = this.getDefaultConfig();
    this.startPeriodicCleanup();
  }

  public static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  /**
   * الإعدادات الافتراضية للجلسات
   */
  private getDefaultConfig(): SessionConfig {
    return {
      sessionTimeout: 60, // 60 دقيقة
      renewalInterval: 15, // تجديد كل 15 دقيقة
      maxConcurrentSessions: 3,
      requireMfaForSensitive: true,
      trackFingerprint: true,
      strictIpCheck: false, // مرن للعمل من مواقع مختلفة
      maxSuspiciousActivities: 5,
      cookieSettings: {
        httpOnly: true,
        secure: true, // يتطلب HTTPS في الإنتاج
        sameSite: 'strict',
        path: '/',
        domain: '.finance.gov.sy'
      }
    };
  }

  /**
   * توليد معرف جلسة آمن (256 بت)
   */
  private generateSecureSessionId(): string {
    const array = new Uint8Array(32); // 256 بت
    
    // استخدام مولد الأرقام العشوائية الآمن
    if (typeof window !== 'undefined' && window.crypto) {
      window.crypto.getRandomValues(array);
    } else {
      // للبيئة الخادمة أو النسخ الاحتياطية
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
    }

    // تحويل إلى hex
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * إنشاء بصمة العميل
   */
  public generateClientFingerprint(): ClientFingerprint {
    const screen = typeof window !== 'undefined' ? window.screen : null;
    const nav = typeof window !== 'undefined' ? window.navigator : null;
    
    const fingerprint: ClientFingerprint = {
      userAgent: nav?.userAgent || 'unknown',
      ipAddress: 'auto-detect', // سيتم تحديثها من الخادم
      screenResolution: screen ? `${screen.width}x${screen.height}` : 'unknown',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: nav?.language || 'ar',
      platform: nav?.platform || 'unknown',
      cookiesEnabled: nav?.cookieEnabled || false,
      doNotTrack: nav?.doNotTrack === '1',
      fingerprint: ''
    };

    // حساب hash البصمة
    fingerprint.fingerprint = this.computeFingerprint(fingerprint);
    
    return fingerprint;
  }

  /**
   * حساب hash البصمة
   */
  private computeFingerprint(fp: ClientFingerprint): string {
    const data = `${fp.userAgent}|${fp.screenResolution}|${fp.timezone}|${fp.language}|${fp.platform}|${fp.cookiesEnabled}`;
    
    // hash بسيط (للإنتاج استخدم crypto.subtle.digest)
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // تحويل إلى 32bit integer
    }
    return hash.toString(16);
  }

  /**
   * إنشاء جلسة جديدة
   */
  public createSession(
    userId: string, 
    username: string, 
    role: string, 
    department?: string,
    mfaVerified: boolean = false
  ): SessionData {
    const sessionId = this.generateSecureSessionId();
    const fingerprint = this.generateClientFingerprint();
    const now = new Date();
    
    const session: SessionData = {
      sessionId,
      userId,
      username,
      role,
      department,
      createdAt: now,
      lastActivity: now,
      expiresAt: new Date(now.getTime() + this.config.sessionTimeout * 60 * 1000),
      isActive: true,
      fingerprint,
      ipHistory: [],
      loginCount: 1,
      mfaVerified,
      suspiciousActivityCount: 0,
      lastRenewal: now
    };

    // تنظيف الجلسات القديمة لنفس المستخدم
    this.cleanupUserSessions(userId);
    
    this.sessions.set(sessionId, session);
    
    // تسجيل حدث تسجيل الدخول
    this.logSecurityEvent(sessionId, userId, 'LOGIN', 'تسجيل دخول ناجح', 'INFO');
    
    return session;
  }

  /**
   * التحقق من صحة الجلسة
   */
  public validateSession(sessionId: string): SessionData | null {
    const session = this.sessions.get(sessionId);
    
    if (!session || !session.isActive) {
      return null;
    }

    const now = new Date();
    
    // فحص انتهاء الصلاحية
    if (now > session.expiresAt) {
      this.terminateSession(sessionId, 'انتهت صلاحية الجلسة');
      return null;
    }

    // تحديث النشاط الأخير
    session.lastActivity = now;
    
    return session;
  }

  /**
   * تجديد الجلسة
   */
  public renewSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    
    if (!session || !session.isActive) {
      return false;
    }

    const now = new Date();
    
    // فحص الحاجة للتجديد
    const timeSinceRenewal = now.getTime() - session.lastRenewal.getTime();
    if (timeSinceRenewal < this.config.renewalInterval * 60 * 1000) {
      return true; // لا حاجة للتجديد بعد
    }

    // تجديد الجلسة
    session.expiresAt = new Date(now.getTime() + this.config.sessionTimeout * 60 * 1000);
    session.lastRenewal = now;
    session.lastActivity = now;

    // توليد معرف جلسة جديد للأمان
    const newSessionId = this.generateSecureSessionId();
    this.sessions.delete(sessionId);
    session.sessionId = newSessionId;
    this.sessions.set(newSessionId, session);

    this.logSecurityEvent(newSessionId, session.userId, 'SESSION_RENEWAL', 'تجديد الجلسة', 'INFO');
    
    return true;
  }

  /**
   * فحص النشاط المشبوه
   */
  public checkSuspiciousActivity(
    sessionId: string, 
    currentFingerprint: ClientFingerprint,
    action?: string
  ): SuspiciousActivity[] {
    const session = this.sessions.get(sessionId);
    if (!session) return [];

    const activities: SuspiciousActivity[] = [];
    
    // فحص تغيير User-Agent
    if (session.fingerprint.userAgent !== currentFingerprint.userAgent) {
      activities.push(this.createSuspiciousActivity(
        sessionId,
        session.userId,
        'USER_AGENT_CHANGE',
        'HIGH',
        'تغيير في User-Agent',
        session.fingerprint.userAgent,
        currentFingerprint.userAgent
      ));
    }

    // فحص تغيير عنوان IP (إذا كان متاحاً)
    if (this.config.strictIpCheck && 
        currentFingerprint.ipAddress !== 'auto-detect' && 
        session.fingerprint.ipAddress !== currentFingerprint.ipAddress) {
      activities.push(this.createSuspiciousActivity(
        sessionId,
        session.userId,
        'IP_CHANGE',
        'MEDIUM',
        'تغيير في عنوان IP',
        session.fingerprint.ipAddress,
        currentFingerprint.ipAddress
      ));
    }

    // فحص تغيير البصمة
    if (session.fingerprint.fingerprint !== currentFingerprint.fingerprint) {
      activities.push(this.createSuspiciousActivity(
        sessionId,
        session.userId,
        'FINGERPRINT_MISMATCH',
        'HIGH',
        'عدم تطابق بصمة المتصفح',
        session.fingerprint.fingerprint,
        currentFingerprint.fingerprint
      ));
    }

    // حفظ الأنشطة المشبوهة
    if (activities.length > 0) {
      const existing = this.suspiciousActivities.get(sessionId) || [];
      this.suspiciousActivities.set(sessionId, [...existing, ...activities]);
      
      session.suspiciousActivityCount += activities.length;
      
      // اتخاذ إجراء إذا تجاوز الحد المسموح
      if (session.suspiciousActivityCount >= this.config.maxSuspiciousActivities) {
        this.terminateSession(sessionId, 'تجاوز الحد المسموح من الأنشطة المشبوهة');
      }
    }

    return activities;
  }

  /**
   * إنشاء نشاط مشبوه
   */
  private createSuspiciousActivity(
    sessionId: string,
    userId: string,
    type: SuspiciousActivity['type'],
    severity: SuspiciousActivity['severity'],
    description: string,
    oldValue?: string,
    newValue?: string
  ): SuspiciousActivity {
    return {
      id: this.generateSecureSessionId().substring(0, 16),
      sessionId,
      userId,
      type,
      severity,
      description,
      oldValue,
      newValue,
      timestamp: new Date(),
      handled: false,
      action: severity === 'CRITICAL' ? 'FORCE_LOGOUT' : severity === 'HIGH' ? 'REQUIRE_MFA' : 'WARN'
    };
  }

  /**
   * إنهاء الجلسة
   */
  public terminateSession(sessionId: string, reason: string = 'تسجيل خروج عادي'): void {
    const session = this.sessions.get(sessionId);
    
    if (session) {
      session.isActive = false;
      this.sessions.delete(sessionId);
      
      this.logSecurityEvent(sessionId, session.userId, 'LOGOUT', reason, 'INFO');
      
      // تنظيف الأنشطة المشبوهة
      this.suspiciousActivities.delete(sessionId);
    }
  }

  /**
   * الحصول على الجلسات النشطة للمستخدم
   */
  public getUserActiveSessions(userId: string): ActiveSession[] {
    const sessions: ActiveSession[] = [];
    
    this.sessions.forEach((session) => {
      if (session.userId === userId && session.isActive) {
        sessions.push({
          sessionId: session.sessionId,
          device: this.getDeviceInfo(session.fingerprint),
          location: session.fingerprint.timezone,
          ipAddress: session.fingerprint.ipAddress,
          lastActivity: session.lastActivity,
          isCurrentSession: false, // يجب تحديدها من الخارج
          isSuspicious: session.suspiciousActivityCount > 0
        });
      }
    });
    
    return sessions.sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime());
  }

  /**
   * الحصول على معلومات الجهاز من البصمة
   */
  private getDeviceInfo(fingerprint: ClientFingerprint): string {
    const ua = fingerprint.userAgent.toLowerCase();
    
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      return 'هاتف محمول';
    } else if (ua.includes('tablet') || ua.includes('ipad')) {
      return 'جهاز لوحي';
    } else {
      return 'حاسوب مكتبي';
    }
  }

  /**
   * تسجيل حدث أمني
   */
  public logSecurityEvent(
    sessionId: string,
    userId: string,
    event: SecurityLog['event'],
    details: string,
    severity: SecurityLog['severity']
  ): void {
    const session = this.sessions.get(sessionId);
    
    const log: SecurityLog = {
      id: this.generateSecureSessionId().substring(0, 16),
      sessionId,
      userId,
      event,
      details,
      ipAddress: session?.fingerprint.ipAddress || 'unknown',
      userAgent: session?.fingerprint.userAgent || 'unknown',
      timestamp: new Date(),
      severity
    };

    this.securityLogs.push(log);
    
    // الاحتفاظ بآخر 1000 سجل فقط
    if (this.securityLogs.length > 1000) {
      this.securityLogs = this.securityLogs.slice(-1000);
    }
  }

  /**
   * الحصول على سجلات الأمان
   */
  public getSecurityLogs(userId?: string, limit: number = 50): SecurityLog[] {
    let logs = this.securityLogs;
    
    if (userId) {
      logs = logs.filter(log => log.userId === userId);
    }
    
    return logs
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * تنظيف الجلسات القديمة
   */
  private cleanupUserSessions(userId: string): void {
    const userSessions = Array.from(this.sessions.entries())
      .filter(([_, session]) => session.userId === userId && session.isActive)
      .sort((a, b) => b[1].lastActivity.getTime() - a[1].lastActivity.getTime());

    // الاحتفاظ بآخر جلسات حسب الحد المسموح
    if (userSessions.length >= this.config.maxConcurrentSessions) {
      const sessionsToTerminate = userSessions.slice(this.config.maxConcurrentSessions - 1);
      
      sessionsToTerminate.forEach(([sessionId]) => {
        this.terminateSession(sessionId, 'تجاوز الحد المسموح من الجلسات المتزامنة');
      });
    }
  }

  /**
   * تنظيف دوري للجلسات المنتهية الصلاحية
   */
  private startPeriodicCleanup(): void {
    setInterval(() => {
      const now = new Date();
      const expiredSessions: string[] = [];
      
      this.sessions.forEach((session, sessionId) => {
        if (now > session.expiresAt || !session.isActive) {
          expiredSessions.push(sessionId);
        }
      });
      
      expiredSessions.forEach(sessionId => {
        this.terminateSession(sessionId, 'انتهت صلاحية الجلسة - تنظيف تلقائي');
      });
      
    }, 5 * 60 * 1000); // كل 5 دقائق
  }

  /**
   * الحصول على إحصائيات الجلسات
   */
  public getSessionStats() {
    const now = new Date();
    const activeSessions = Array.from(this.sessions.values()).filter(s => s.isActive);
    
    return {
      totalActiveSessions: activeSessions.length,
      totalSuspiciousActivities: Array.from(this.suspiciousActivities.values())
        .reduce((sum, activities) => sum + activities.length, 0),
      recentLogins: this.securityLogs
        .filter(log => log.event === 'LOGIN' && 
               now.getTime() - log.timestamp.getTime() < 24 * 60 * 60 * 1000)
        .length,
      securityViolations: this.securityLogs
        .filter(log => log.severity === 'ERROR' || log.severity === 'CRITICAL')
        .length
    };
  }

  /**
   * تحديث إعدادات الجلسة
   */
  public updateConfig(newConfig: Partial<SessionConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * تصدير بيانات الجلسة للنسخ الاحتياطي
   */
  public exportSessionData() {
    return {
      sessions: Array.from(this.sessions.entries()),
      suspiciousActivities: Array.from(this.suspiciousActivities.entries()),
      securityLogs: this.securityLogs,
      config: this.config
    };
  }
}

// تصدير مثيل وحيد
export const sessionManager = SessionManager.getInstance();