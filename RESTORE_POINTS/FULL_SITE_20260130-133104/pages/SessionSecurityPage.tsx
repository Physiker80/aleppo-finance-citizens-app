import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '../App';
import { sessionManager } from '../utils/sessionManager';
import { aiSecurityEngine, AISecurityAnalysis } from '../utils/aiSecurityAnalytics';
// Security guide now integrated into the page header as a floating modal
import { securityReportGenerator } from '../utils/securityReportGenerator';
import { ActiveSession, SecurityLog, SessionConfig } from '../types';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import SessionMonitor from '../components/SessionMonitor';
import { formatDateTime as formatDateTimeAr } from '../utils/arabicNumerals';
// Removed static back button icon; using global BackToDashboardFab instead
import { ChevronDown } from 'lucide-react';
import { FiInfo } from 'react-icons/fi';
import Mermaid from '../components/Mermaid';

/**
 * صفحة أمان الجلسات
 * Session Security Management Page
 * 
 * صفحة شاملة لإدارة أمان الجلسات تتضمن:
 * - عرض الجلسات النشطة
 * - إدارة إعدادات الأمان
 * - سجلات الأمان المفصلة
 * - إعدادات الحماية المتقدمة
 */
const SessionSecurityPage: React.FC = () => {
  const appContext = useContext(AppContext);
  const [showGuide, setShowGuide] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowGuide(false); };
    if (showGuide) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [showGuide]);
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [securityLogs, setSecurityLogs] = useState<SecurityLog[]>([]);
  const [aiAnalysis, setAiAnalysis] = useState<AISecurityAnalysis | null>(null);
  const [sessionStats, setSessionStats] = useState({
    totalActiveSessions: 0,
    totalSuspiciousActivities: 0,
    recentLogins: 0,
    securityViolations: 0
  });
  const [activeTab, setActiveTab] = useState<'monitor' | 'sessions' | 'logs' | 'settings' | 'diagram' | 'aianalytics' | 'csp'>('monitor');
  const [cspItems, setCspItems] = useState<any[]>([]);
  const [cspTotal, setCspTotal] = useState<number>(0);
  const [cspLimit, setCspLimit] = useState<number>(() => {
    try { const v = Number(localStorage.getItem('csp_panel_limit') || '100'); return Math.max(1, Math.min(500, v||100)); } catch { return 100; }
  });
  const [cspKey, setCspKey] = useState<string>(() => localStorage.getItem('csp_panel_api_key') || '');
  const [cspError, setCspError] = useState<string>('');
  const [cspTimeRange, setCspTimeRange] = useState<string>(() => localStorage.getItem('csp_panel_time_range') || '6h');
  const [cspDirectiveFilter, setCspDirectiveFilter] = useState<string>('');
  const [cspBlockedFilter, setCspBlockedFilter] = useState<string>('');
  const [seedCount, setSeedCount] = useState<number>(15);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showReportMenu, setShowReportMenu] = useState(false);
  // Security Monitoring (backend SecurityMonitor) state
  const [secKey, setSecKey] = useState<string>(() => localStorage.getItem('secmon_api_key') || localStorage.getItem('csp_panel_api_key') || '');
  const [secAlerts, setSecAlerts] = useState<any[]>([]);
  const [secBlocklist, setSecBlocklist] = useState<any[]>([]);
  const [secError, setSecError] = useState<string>('');
  const [secLastUpdated, setSecLastUpdated] = useState<Date | null>(null);
  const [secLoading, setSecLoading] = useState<boolean>(false);
  // Alerts quick filters and toasts
  const [alertSeverityFilter, setAlertSeverityFilter] = useState<string>('');
  const [alertIpFilter, setAlertIpFilter] = useState<string>('');
  const [toasts, setToasts] = useState<Array<{ id: number; kind: 'success'|'error'|'info'; message: string }>>([]);
  const pushToast = (kind: 'success'|'error'|'info', message: string) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts(prev => [...prev, { id, kind, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  };

  // Throttle informational toasts to avoid duplicates
  const lastInfoToastRef = React.useRef<number>(0);
  const pushInfoOnce = (message: string, ms: number = 60000) => {
    const now = Date.now();
    if (now - (lastInfoToastRef.current || 0) > ms) {
      lastInfoToastRef.current = now;
      pushToast('info', message);
    }
  };

  // التحقق من معاملات الـ URL لتحديد علامة التبويب
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.hash.split('?')[1]);
    const tab = urlParams.get('tab');
    if (tab && ['monitor', 'sessions', 'logs', 'settings', 'diagram', 'aianalytics', 'csp'].includes(tab)) {
      setActiveTab(tab as any);
    }
  }, []);

  // Load SecurityMonitor data (alerts + blocklist)
  const loadSecurityMonitoring = React.useCallback(async () => {
    setSecLoading(true);
    const tryFetchPair = async (base: string | null) => {
      const headers: Record<string, string> = {};
      if (secKey.trim()) headers['x-api-key'] = secKey.trim();
      const prefix = base ? base.replace(/\/$/, '') : '';
      const aUrl = prefix + '/api/security/alerts';
      const bUrl = prefix + '/api/security/blocklist';
      const [r1, r2] = await Promise.all([fetch(aUrl, { headers }), fetch(bUrl, { headers })]);
      return { r1, r2 } as const;
    };

    try {
      setSecError('');
      // 1) Try relative first
      let { r1, r2 } = await tryFetchPair(null);
      // 2) If either fails (>=400), try localhost:4000 fallback once
      if (!r1.ok || !r2.ok) {
        try {
          ({ r1, r2 } = await tryFetchPair('http://localhost:4000'));
        } catch {}
      }

      // Handle auth error explicitly
      if (r1.status === 401 || r2.status === 401) {
        setSecError('غير مصرح: تحقق من x-api-key');
        setSecAlerts([]);
        setSecBlocklist([]);
        return;
      }

      // For non-OK but not auth (e.g., 5xx), degrade gracefully: show empty and a subtle toast
      if (!r1.ok || !r2.ok) {
  if (!r1.ok) pushInfoOnce(`تعذر تحميل التنبيهات (HTTP ${r1.status}). سيتم عرض قائمة فارغة مؤقتاً.`);
  if (!r2.ok) pushInfoOnce(`تعذر تحميل قائمة الحظر (HTTP ${r2.status}). سيتم عرض قائمة فارغة مؤقتاً.`);
        setSecError('');
        setSecAlerts([]);
        setSecBlocklist([]);
        setSecLastUpdated(new Date());
        return;
      }

      let j1: any = { alerts: [] }, j2: any = { items: [] };
      try { j1 = await r1.json(); } catch { /* ignore parse error */ }
      try { j2 = await r2.json(); } catch { /* ignore parse error */ }
      const alerts = Array.isArray(j1.alerts) ? j1.alerts : Array.isArray(j1.items) ? j1.items : [];
      const items = Array.isArray(j2.items) ? j2.items : [];
      setSecAlerts(alerts);
      setSecBlocklist(items);
      setSecLastUpdated(new Date());
    } catch (e: any) {
      // Network or unexpected error: degrade gracefully
  pushInfoOnce('تعذر تحميل بيانات المراقبة الأمنية. سيتم عرض بيانات فارغة مؤقتاً.');
      setSecError('');
      setSecAlerts([]);
      setSecBlocklist([]);
      setSecLastUpdated(new Date());
    }
    finally {
      setSecLoading(false);
    }
  }, [secKey]);

  // Periodic refresh when monitor tab active
  useEffect(() => {
    if (activeTab !== 'monitor') return;
    loadSecurityMonitoring();
    const id = setInterval(loadSecurityMonitoring, 15000);
    return () => clearInterval(id);
  }, [activeTab, loadSecurityMonitoring]);

  // Helpers for alerts filtering and counts
  const normalizedSeverity = (a: any): string => (a.severity || a.level || 'INFO');
  const filteredAlerts = React.useMemo(() => {
    const sevFilter = alertSeverityFilter.trim().toUpperCase();
    const ipFilter = alertIpFilter.trim().toLowerCase();
    return secAlerts.filter((a: any) => {
      const sev = normalizedSeverity(a).toUpperCase();
      const sevMatch = !sevFilter || (sevFilter === 'WARN' ? (sev === 'WARN' || sev === 'MEDIUM') : sev === sevFilter);
      const ip = (a.ip || a.ipAddress || '').toLowerCase();
      const ipMatch = !ipFilter || ip.includes(ipFilter);
      return sevMatch && ipMatch;
    });
  }, [secAlerts, alertSeverityFilter, alertIpFilter]);
  const alertCounts = React.useMemo(() => {
    const c = { CRITICAL: 0, HIGH: 0, WARN: 0, INFO: 0 } as Record<string, number>;
    for (const a of secAlerts) {
      const s = normalizedSeverity(a).toUpperCase();
      if (s === 'CRITICAL') c.CRITICAL++;
      else if (s === 'HIGH') c.HIGH++;
      else if (s === 'WARN' || s === 'MEDIUM') c.WARN++;
      else c.INFO++;
    }
    return c;
  }, [secAlerts]);

  // Load CSP violations list
  const loadCspViolations = React.useCallback(async () => {
    try {
      setCspError('');
      const rangeMap: Record<string, number> = {
        '1h': 1 * 60 * 60 * 1000,
        '6h': 6 * 60 * 60 * 1000,
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
        'all': 0
      };
      const sinceMs = rangeMap[cspTimeRange] ?? rangeMap['6h'];
      const params = new URLSearchParams({ limit: String(Math.max(1, Math.min(500, cspLimit))) });
      if (sinceMs > 0) params.set('sinceMs', String(sinceMs));
      const url = `/api/csp-violations?${params.toString()}`;
      const headers: Record<string, string> = {};
      if (cspKey.trim()) headers['x-api-key'] = cspKey.trim();
      const res = await fetch(url, { headers });
      if (!res.ok) {
        let msg = `HTTP ${res.status}`;
        try { const j = await res.json(); if (j?.error) msg += ` - ${j.error}`; } catch {}
        if (res.status === 401) msg += ' (تحقق من مفتاح x-api-key)';
        setCspItems([]); setCspTotal(0); setCspError(msg); return;
      }
      const data = await res.json();
      setCspItems(Array.isArray(data.items) ? data.items : []);
      setCspTotal(Number(data.total || 0));
    } catch (e: any) {
      setCspError(String(e?.message || e));
    }
  }, [cspKey, cspLimit, cspTimeRange]);

  useEffect(() => {
    if (activeTab === 'csp') loadCspViolations();
  }, [activeTab, loadCspViolations]);

  // Helper to get filtered list according to directive and blocked-uri text filters
  const filteredItems = React.useCallback(() => {
    const dir = cspDirectiveFilter.trim();
    const blk = cspBlockedFilter.trim();
    let items = cspItems;
    if (dir) items = items.filter(it => String(it['violated-directive'] || '') === dir);
    if (blk) items = items.filter(it => String(it['blocked-uri'] || '') === blk);
    return items;
  }, [cspItems, cspDirectiveFilter, cspBlockedFilter]);

  // Distinct values for dropdowns
  const directiveOptions = React.useMemo(() => {
    const set = new Set<string>();
    for (const it of cspItems) {
      const v = String(it['violated-directive'] || '').trim();
      if (v) set.add(v);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [cspItems]);
  const blockedUriOptions = React.useMemo(() => {
    const set = new Set<string>();
    for (const it of cspItems) {
      const v = String(it['blocked-uri'] || '').trim();
      if (v) set.add(v);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [cspItems]);

  // Dev-only helper: generate seed violations
  const isDevHost = typeof window !== 'undefined' && /^(localhost|127\.|192\.168\.|10\.)/.test(window.location.hostname || '');
  const generateRandomViolation = (): any => {
    const directives = ['script-src', 'style-src', 'img-src', 'connect-src', 'font-src'];
    const blockedDomains = ['http://evil.example.com', 'https://cdn-unknown.com/lib.js', 'data:', 'blob:', 'http://insecure.local/script.js'];
    const pages = ['/index.html', '/#/dashboard', '/#/tickets', '/#/session-security', '/#/help'];
    const vd = directives[Math.floor(Math.random() * directives.length)] + " 'self'";
    const bu = blockedDomains[Math.floor(Math.random() * blockedDomains.length)];
    const page = pages[Math.floor(Math.random() * pages.length)];
    return {
      'document-uri': window.location.origin + page,
      referrer: document.referrer || '',
      disposition: 'report',
      'blocked-uri': bu,
      'violated-directive': vd,
      'effective-directive': vd.split(' ')[0],
      'original-policy': "default-src 'self'; script-src 'self'; style-src 'self'", 
      'status-code': 200,
      'source-file': page,
      'line-number': Math.floor(Math.random() * 500) + 1,
      'column-number': Math.floor(Math.random() * 120) + 1
    };
  };
  const handleSeedViolations = async () => {
    try {
      const headers: Record<string, string> = { 'content-type': 'application/json' };
      // Seed N items
      const n = Math.max(1, Math.min(200, Number(seedCount) || 10));
      const jobs: Promise<Response>[] = [];
      for (let i = 0; i < n; i++) {
        const payload = { 'csp-report': generateRandomViolation() };
        jobs.push(fetch('/api/csp-report', { method: 'POST', headers, body: JSON.stringify(payload) }));
      }
      await Promise.allSettled(jobs);
      await loadCspViolations();
      alert(`تم توليد ${n} سجلات تجريبية لـ CSP`);
    } catch (e) {
      alert('تعذر توليد البيانات');
    }
  };

  // التحقق من تسجيل الدخول
  if (!appContext?.isEmployeeLoggedIn || !appContext.currentEmployee) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <div className="text-center p-8">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 mx-auto mb-4 rounded-full flex items-center justify-center shadow-lg">
              <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm"></div>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              مطلوب تسجيل الدخول
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              يجب تسجيل الدخول للوصول إلى إعدادات أمان الجلسات
            </p>
            <Button onClick={() => window.location.hash = '#/login'}>
              تسجيل الدخول
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const currentUserId = appContext.currentEmployee.username;

  // إخفاء القائمة عند الضغط خارجها
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.report-dropdown')) {
        setShowReportMenu(false);
      }
    };

    if (showReportMenu) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showReportMenu]);

  /**
   * تحديث البيانات
   */
  const updateData = React.useCallback(async () => {
    try {
      setIsAnalyzing(true);
      const sessions = sessionManager.getUserActiveSessions(currentUserId);
      setActiveSessions(sessions);

      const stats = sessionManager.getSessionStats();
      setSessionStats(stats);

      const logs = sessionManager.getSecurityLogs(currentUserId, 50);
      setSecurityLogs(logs);

      // إجراء التحليل الذكي
      if (sessions.length > 0 || logs.length > 0) {
        // تحويل الجلسات لتشمل userId
        const extendedSessions = sessions.map(session => ({
          ...session,
          userId: currentUserId // إضافة userId للجلسة
        }));

        // الحصول على قائمة الموظفين من localStorage
        const employees = JSON.parse(localStorage.getItem('employees') || '[]');
        const analysis = await aiSecurityEngine.performComprehensiveAnalysis(
          extendedSessions,
          logs,
          employees
        );
        setAiAnalysis(analysis);
      }
    } catch (error) {
      console.error('خطأ في تحديث بيانات الأمان:', error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    updateData();
    const interval = setInterval(updateData, 30000); // تحديث كل 30 ثانية
    return () => clearInterval(interval);
  }, [updateData]);

  /**
   * إنهاء جلسة
   */
  const terminateSession = async (sessionId: string) => {
    try {
      sessionManager.terminateSession(sessionId, 'إنهاء يدوي من صفحة الأمان');
      updateData();
      
      // إذا كانت الجلسة الحالية
      const currentSession = activeSessions.find(s => s.isCurrentSession);
      if (currentSession?.sessionId === sessionId) {
        appContext.employeeLogout();
        window.location.hash = '#/login';
      }
    } catch (error) {
      console.error('خطأ في إنهاء الجلسة:', error);
    }
  };

  /**
   * إنهاء جميع الجلسات
   */
  const terminateAllSessions = async () => {
    if (!confirm('هل أنت متأكد من إنهاء جميع الجلسات؟ سيتم تسجيل خروجك من جميع الأجهزة.')) {
      return;
    }

    try {
      // إنهاء جميع جلسات المستخدم الحالي
      activeSessions.forEach(session => {
        sessionManager.terminateSession(session.sessionId, 'إنهاء جماعي من صفحة الأمان');
      });
      appContext.employeeLogout();
      window.location.hash = '#/login';
    } catch (error) {
      console.error('خطأ في إنهاء جميع الجلسات:', error);
    }
  };

  /**
   * توليد تقرير أمني ذكي محدث
   */
  const handleGenerateReport = async (type: 'daily' | 'weekly' | 'monthly' | 'yearly') => {
    try {
      if (!aiAnalysis) {
        alert('يجب إجراء التحليل الذكي أولاً');
        return;
      }

      // تحويل الجلسات لتشمل userId
      const extendedSessions = activeSessions.map(session => ({
        ...session,
        userId: currentUserId
      }));

      const reportData = securityReportGenerator.generateSecurityReport(
        type,
        aiAnalysis,
        extendedSessions,
        securityLogs
      );
      
      const htmlContent = securityReportGenerator.generateHTMLReport(reportData);
      
      // إنشاء وتنزيل ملف HTML
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `security_report_${type}_${new Date().toISOString().split('T')[0]}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const typeLabels = {
        'daily': 'اليومي',
        'weekly': 'الأسبوعي', 
        'monthly': 'الشهري',
        'yearly': 'السنوي'
      };

      alert(`تم إنشاء التقرير الأمني ${typeLabels[type]} بنجاح!`);
    } catch (error) {
      console.error('خطأ في إنشاء التقرير:', error);
      alert('حدث خطأ في إنشاء التقرير');
    }
  };

  /**
   * إنشاء تقرير أمني
   */
  const generateSecurityReport = (type: string) => {
    const now = new Date();
    const reportData = {
      generatedAt: now.toISOString(),
      type,
      stats: sessionStats,
      activeSessions: activeSessions.length,
      recentActivities: securityLogs.slice(0, 10),
      securityScore: calculateSecurityScore(),
      recommendations: generateSecurityRecommendations()
    };

    return reportData;
  };

  /**
   * حساب نقاط الأمان
   */
  const calculateSecurityScore = () => {
    if (aiAnalysis) {
      return aiAnalysis.securityScore;
    }
    
    let score = 100;
    
    // خصم نقاط بناء على المخاطر
    score -= sessionStats.securityViolations * 5;
    score -= Math.min(sessionStats.totalSuspiciousActivities * 2, 20);
    
    // مكافآت للسلوك الآمن
    if (sessionStats.totalActiveSessions < 5) score += 5;
    
    return Math.max(0, Math.min(100, score));
  };

  /**
   * إنشاء توصيات أمنية
   */
  const generateSecurityRecommendations = () => {
    if (aiAnalysis && aiAnalysis.recommendations.length > 0) {
      return aiAnalysis.recommendations.slice(0, 3).map(rec => rec.description);
    }
    
    const recommendations = [];
    
    if (sessionStats.securityViolations > 0) {
      recommendations.push('يُنصح بمراجعة الانتهاكات الأمنية واتخاذ الإجراءات اللازمة');
    }
    
    if (sessionStats.totalSuspiciousActivities > 5) {
      recommendations.push('هناك أنشطة مشبوهة متعددة، يُنصح بتقوية إعدادات الأمان');
    }
    
    if (activeSessions.length > 10) {
      recommendations.push('عدد الجلسات النشطة مرتفع، يُنصح بإنهاء الجلسات غير الضرورية');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('الوضع الأمني جيد، استمر في اتباع أفضل الممارسات الأمنية');
    }
    
    return recommendations;
  };

  /**
   * إنشاء HTML للتقرير
   */
  const createReportHTML = (data: any, type: string) => {
    const typeLabel = type === 'daily' ? 'يومي' : type === 'weekly' ? 'أسبوعي' : type === 'monthly' ? 'شهري' : 'سنوي';
    
    return `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>تقرير الأمان ${typeLabel} - ${new Date().toLocaleDateString('ar-SY')}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
          .container { max-width: 800px; margin: 0 auto; background: white; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); overflow: hidden; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
          .content { padding: 30px; }
          .metric { background: #f8f9ff; border-left: 4px solid #667eea; padding: 15px; margin: 10px 0; border-radius: 5px; }
          .metric-title { font-weight: bold; color: #333; }
          .metric-value { font-size: 1.2em; color: #667eea; margin-top: 5px; }
          .recommendations { background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; background: #f8f9fa; color: #666; font-size: 0.9em; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>تقرير الأمان ${typeLabel}</h1>
            <p>مديرية مالية حلب - نظام الاستعلامات والشكاوى</p>
            <p>تاريخ الإنشاء: ${new Date().toLocaleDateString('ar-SY')}</p>
          </div>
          <div class="content">
            <div class="metric">
              <div class="metric-title">نقاط الأمان العامة</div>
              <div class="metric-value">${data.securityScore}/100</div>
            </div>
            <div class="metric">
              <div class="metric-title">الجلسات النشطة</div>
              <div class="metric-value">${data.stats.totalActiveSessions}</div>
            </div>
            <div class="metric">
              <div class="metric-title">الأنشطة المشبوهة</div>
              <div class="metric-value">${data.stats.totalSuspiciousActivities}</div>
            </div>
            <div class="metric">
              <div class="metric-title">الانتهاكات الأمنية</div>
              <div class="metric-value">${data.stats.securityViolations}</div>
            </div>
            
            <h3>التوصيات الأمنية</h3>
            <div class="recommendations">
              ${data.recommendations.map((rec: string) => `<p>• ${rec}</p>`).join('')}
            </div>
          </div>
          <div class="footer">
            <p>تم إنشاء هذا التقرير بواسطة نظام التحليل الذكي للأمان</p>
            <p>© 2025 مديرية مالية حلب - جميع الحقوق محفوظة</p>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  /**
   * تصدير سجلات الأمان
   */
  const exportSecurityLogs = () => {
    try {
      const data = {
        userId: currentUserId,
        exportDate: new Date().toISOString(),
        sessions: activeSessions,
        logs: securityLogs,
        stats: sessionStats
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `security-logs-${currentUserId}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('خطأ في تصدير السجلات:', error);
    }
  };

  /**
   * تحديد نوع الجهاز
   */
  const getDeviceIcon = (device: string) => {
    if (device.includes('محمول') || device.includes('هاتف')) {
      return <div className="w-3 h-3 bg-blue-500 rounded-full"></div>;
    }
    return <div className="w-3 h-3 bg-green-500 rounded-full"></div>;
  };

  /**
   * تنسيق الوقت
   */
  const formatDateTimeLocal = (date: Date) => {
    return new Intl.DateTimeFormat('ar-SY-u-nu-latn', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  /**
   * الحصول على لون شدة التهديد
   */
  const getSeverityColor = (severity: string) => {
    const colors = {
      'CRITICAL': 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/20',
      'ERROR': 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/20',
      'WARN': 'text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/20',
      'INFO': 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/20'
    };
    return colors[severity as keyof typeof colors] || colors.INFO;
  };

  return (
    <div className="container mx-auto px-4 py-8 min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-slate-800 dark:to-indigo-900">
      {/* رأس الصفحة المحدث */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-6 p-8 bg-white/80 dark:bg-gray-800/80 rounded-3xl shadow-2xl backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50">
          <div className="flex items-center space-x-4 rtl:space-x-reverse">
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={() => setShowGuide(true)}
                  aria-controls="session-guide-dialog"
                  aria-haspopup="dialog"
                  className="text-right hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded"
                  title="عرض دليل القسم الأمني"
                >
                  <span className="text-3xl md:text-4xl font-extrabold tracking-wide text-[#0f3c35] dark:text-emerald-200">
                    أمان الجلسات
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowGuide(true)}
                  aria-controls="session-guide-dialog"
                  aria-haspopup="dialog"
                  className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-emerald-50 dark:bg-gray-800 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700 hover:bg-emerald-100 dark:hover:bg-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                  aria-label="عرض دليل القسم الأمني"
                  title="عرض دليل القسم الأمني"
                >
                  <FiInfo className="text-[18px]" />
                </button>
                <span
                  className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-[#0f3c35] text-white dark:bg-emerald-700"
                  title="مسار حساس"
                  aria-label="مسار حساس"
                >
                  مسار حساس
                </span>
                {/* Accent underline for the title (full-width on wrap) */}
                <div className="w-full"></div>
                <div className="mt-1 h-1 w-24 rounded-full bg-gradient-to-r from-[#0f3c35] to-emerald-500 dark:from-emerald-300 dark:to-teal-300"></div>
              </div>
              <p className="text-gray-700 dark:text-gray-300 text-base mt-2">
                مراقبة الجلسات، التحليل الذكي، السجلات، وسياسات المحتوى الأمنية (CSP)
              </p>
            </div>
          </div>
            {/* Title-integrated info button used above; removed external SecurityInfoButton */}
            {/* Back to dashboard button removed per policy; floating FAB handles this */}
        </div>

        {showGuide && (
          <div
            id="session-guide-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="session-guide-title"
            className="fixed inset-0 z-[10000] flex items-center justify-center p-3"
          >
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/60"
              onClick={() => setShowGuide(false)}
              aria-hidden="true"
              title="انقر للإغلاق"
            />

            {/* Panel */}
            <div className="relative z-10 max-h-[90vh] w-[min(100%,900px)] overflow-auto rounded-xl bg-white dark:bg-gray-900 shadow-2xl ring-1 ring-emerald-200 dark:ring-gray-700 p-5 rtl:text-right">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 id="session-guide-title" className="text-xl font-bold text-emerald-800 dark:text-emerald-300">دليل الأمان: أمان الجلسات</h2>
                  <p className="mt-2 text-gray-700 dark:text-gray-300 leading-7 max-w-[68ch]">
                    يضمن أمان الجلسات حماية حساب المستخدم من الاستحواذ عبر تتبع الجلسات النشطة، فحص الانحرافات، وإنهاء الجلسات المشبوهة. اتبع أفضل الممارسات لتقليل المخاطر.
                  </p>
                </div>
                <button
                  onClick={() => setShowGuide(false)}
                  className="shrink-0 rounded-full border border-gray-300 dark:border-gray-700 p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
                  aria-label="إغلاق"
                  title="إغلاق"
                >
                  ✖
                </button>
              </div>

              <div className="mt-6">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">المخطط التوضيحي (تفاعلي)</h3>
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-3 overflow-x-auto">
                  <Mermaid chart={`flowchart TD\n  A[بداية الجلسة: تسجيل الدخول] --> B{تحقق الصلاحيات}\n  B -- مسموح --> C[إنشاء جلسة]\n  C --> D{مراقبة النشاط}\n  D -- طبيعي --> E[استمرار الجلسة]\n  D -- مشبوه --> F[تنبيه] --> G[إنهاء الجلسة/طلب MFA]\n  E --> H[تسجيل الخروج]`}/>
                </div>
              </div>

              <div className="mt-6 h-px bg-gray-200 dark:bg-gray-700" />

              <div className="mt-6">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">الخطوات العملية</h3>
                <div className="mt-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4">
                  <ol className="list-decimal pr-6 rtl:pr-0 rtl:pl-6 text-gray-800 dark:text-gray-300 space-y-2 leading-7 text-[0.95rem] max-w-[68ch]">
                    <li>مراجعة الجلسات النشطة بانتظام وإنهاء الجلسة غير المعروفة.</li>
                    <li>تفعيل تنبيهات الشذوذ وربطها بإجراءات تلقائية عند اللزوم.</li>
                    <li>فرض المصادقة متعددة العوامل للعمليات الحساسة.</li>
                    <li>تحديد مدة صلاحية معقولة للجلسة وتقليصها للمهام عالية الحساسية.</li>
                  </ol>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowGuide(false)}
                  className="inline-flex items-center px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        )}

        {/* إحصائيات سريعة */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card className="bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/20 dark:to-cyan-900/30 border-blue-300 dark:border-blue-700/50 shadow-md">
            <div className="flex items-center p-1">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl flex items-center justify-center shadow-md">
                  <div className="w-4 h-4 bg-white rounded-full"></div>
                </div>
              </div>
              <div className="mr-4 flex-1">
                <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">الجلسات النشطة</p>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                  {sessionStats.totalActiveSessions}
                </p>
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-red-100 to-pink-100 dark:from-red-900/20 dark:to-pink-900/30 border-red-300 dark:border-red-700/50 shadow-md">
            <div className="flex items-center p-1">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-gradient-to-r from-red-600 to-pink-600 rounded-xl flex items-center justify-center shadow-md">
                  <div className="w-4 h-4 bg-white rounded-full"></div>
                </div>
              </div>
              <div className="mr-4 flex-1">
                <p className="text-sm font-semibold text-red-800 dark:text-red-300">أنشطة مشبوهة</p>
                <p className="text-2xl font-bold text-red-700 dark:text-red-400">
                  {sessionStats.totalSuspiciousActivities}
                </p>
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/30 border-green-300 dark:border-green-700/50 shadow-md">
            <div className="flex items-center p-1">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl flex items-center justify-center shadow-md">
                  <div className="w-4 h-4 bg-white rounded-full"></div>
                </div>
              </div>
              <div className="mr-4 flex-1">
                <p className="text-sm font-semibold text-green-800 dark:text-green-300">دخول حديث</p>
                <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                  {sessionStats.recentLogins}
                </p>
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-900/20 dark:to-amber-900/30 border-orange-300 dark:border-orange-700/50 shadow-md">
            <div className="flex items-center p-1">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-gradient-to-r from-orange-600 to-amber-600 rounded-xl flex items-center justify-center shadow-md">
                  <div className="w-4 h-4 bg-white rounded-full"></div>
                </div>
              </div>
              <div className="mr-4 flex-1">
                <p className="text-sm font-semibold text-orange-800 dark:text-orange-300">انتهاكات أمنية</p>
                <p className="text-2xl font-bold text-orange-700 dark:text-orange-400">
                  {sessionStats.securityViolations}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* شريط التبويب */}
        <div className="sticky top-2 z-20 rounded-2xl p-2 bg-gray-100/80 dark:bg-gray-800/60 backdrop-blur supports-backdrop-blur:bg-white/70 dark:supports-backdrop-blur:bg-gray-900/50 border border-gray-200 dark:border-gray-700 shadow-sm">
          <nav className="flex space-x-2 rtl:space-x-reverse">
            {[
              { id: 'monitor', label: 'المراقبة المباشرة', color: 'blue', badge: (filteredAlerts?.length || 0) },
              { id: 'aianalytics', label: '🤖 التحليل الذكي', color: 'violet', badge: (aiAnalysis ? (aiAnalysis.threatLevel === 'LOW' ? 'منخفض' : aiAnalysis.threatLevel === 'MEDIUM' ? 'متوسط' : aiAnalysis.threatLevel === 'HIGH' ? 'مرتفع' : 'حرج') : null) },
              { id: 'sessions', label: 'الجلسات النشطة', color: 'green', badge: activeSessions.length },
              { id: 'logs', label: 'سجلات الأمان', color: 'purple', badge: securityLogs.length },
              { id: 'csp', label: 'CSP سياسة المحتوى', color: 'teal', badge: (filteredItems()?.length || 0) },
              { id: 'diagram', label: 'المخطط البصري', color: 'cyan' },
              { id: 'settings', label: 'الإعدادات', color: 'orange' }
            ].map((tab: any) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 rtl:space-x-reverse py-3 px-6 rounded-xl font-semibold text-sm flex-1 justify-center ${
                  activeTab === tab.id
                    ? `bg-white dark:bg-gray-800 text-${tab.color}-600 shadow-lg`
                    : 'text-gray-700 dark:text-gray-400 bg-gradient-to-r from-gray-50 to-gray-100 dark:bg-gray-700 shadow-sm hover:from-gray-100 hover:to-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${
                  activeTab === tab.id 
                    ? `bg-${tab.color}-600` 
                    : `bg-${tab.color}-500`
                }`}></div>
                <span className="flex items-center gap-2">
                  {tab.label}
                  {tab.badge != null && (
                    typeof tab.badge === 'number' ? (
                      <span className="text-[11px] leading-none px-2 py-0.5 rounded-full bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200">{tab.badge}</span>
                    ) : (
                      <span className={`text-[11px] leading-none px-2 py-0.5 rounded-full ${
                        tab.id === 'aianalytics'
                          ? (aiAnalysis?.threatLevel === 'LOW' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                             aiAnalysis?.threatLevel === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                             aiAnalysis?.threatLevel === 'HIGH' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' :
                             'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300')
                          : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                      }`}>{tab.badge}</span>
                    )
                  )}
                </span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* محتوى التبويب */}
      <div>
        {activeTab === 'monitor' && (
          <div className="space-y-6">
            <Card className="bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/30 border-blue-300 dark:border-blue-700/50">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center">
                  <div className="w-3 h-3 bg-white rounded-full"></div>
                </div>
                <h3 className="text-2xl font-bold text-blue-800 dark:text-blue-200">
                  المراقبة المباشرة للجلسات الأمنة
                </h3>
              </div>
              <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                <SessionMonitor
                  currentUserId={currentUserId}
                  onSessionAlert={(activity) => {
                    console.log('نشاط مشبوه:', activity);
                    updateData();
                  }}
                  onForceLogout={() => {
                    appContext.employeeLogout();
                    window.location.hash = '#/login';
                  }}
                />
              </div>
            </Card>

            {/* Security Monitoring (backend SecurityMonitor) */}
            <Card className="bg-gradient-to-r from-rose-100 to-orange-100 dark:from-rose-900/20 dark:to-orange-900/30 border-rose-300 dark:border-rose-700/50">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-rose-600 to-orange-600 rounded-xl flex items-center justify-center">
                    <div className="w-3 h-3 bg-white rounded-full"></div>
                  </div>
                  <h3 className="text-2xl font-bold text-rose-800 dark:text-rose-200">
                    المراقبة الأمنية (التنبيهات وقائمة الحظر)
                  </h3>
                </div>
                <div className="flex gap-2 rtl:space-x-reverse flex-wrap justify-end">
                  <input
                    type="password"
                    placeholder="x-api-key (اختياري)"
                    className="p-2 rounded-lg border border-rose-300 dark:border-rose-700 dark:bg-gray-800 dark:text-gray-100"
                    value={secKey}
                    onChange={(e) => { setSecKey(e.target.value); localStorage.setItem('secmon_api_key', e.target.value); }}
                  />
                  <Button variant="secondary" onClick={loadSecurityMonitoring} className="bg-rose-50 dark:bg-gray-700 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-600 font-semibold">تحديث الآن</Button>
                </div>
              </div>

              {secError && (
                <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 mb-4">
                  خطأ: {secError}
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Alerts */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="text-xl font-bold text-gray-800 dark:text-gray-200">التنبيهات الأخيرة</h4>
                      <div className="mt-2 flex gap-2 text-xs">
                        <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300">حرج: {alertCounts.CRITICAL}</span>
                        <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300">مرتفع: {alertCounts.HIGH}</span>
                        <span className="px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300">تحذير: {alertCounts.WARN}</span>
                        <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300">معلومات: {alertCounts.INFO}</span>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                      {secLoading && (
                        <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-300">
                          <span className="inline-block w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></span>
                          جاري التحديث…
                        </span>
                      )}
                      <span>آخر تحديث: {secLastUpdated ? formatDateTimeAr(secLastUpdated) : '—'}</span>
                    </div>
                  </div>

                  {/* Quick Filters */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                    <select
                      className="p-2 rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-100"
                      value={alertSeverityFilter}
                      onChange={(e) => setAlertSeverityFilter(e.target.value)}
                      title="تصفية حسب الشدة"
                      aria-label="تصفية حسب الشدة"
                    >
                      <option value="">كل الشدات</option>
                      <option value="CRITICAL">حرج</option>
                      <option value="HIGH">مرتفع</option>
                      <option value="WARN">تحذير/متوسط</option>
                      <option value="INFO">معلومات</option>
                    </select>
                    <input
                      type="text"
                      placeholder="تصفية حسب IP"
                      className="p-2 rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-100"
                      value={alertIpFilter}
                      onChange={(e) => setAlertIpFilter(e.target.value)}
                      aria-label="تصفية حسب IP"
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => { setAlertSeverityFilter(''); setAlertIpFilter(''); }}
                        className="flex-1 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600"
                      >مسح المرشحات</Button>
                      <Button
                        variant="secondary"
                        onClick={() => {
                          try {
                            const items = filteredAlerts;
                            const blob = new Blob([JSON.stringify({ items, total: items.length, generatedAt: new Date().toISOString() }, null, 2)], { type: 'application/json' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url; a.download = `security-alerts-${Date.now()}.json`;
                            document.body.appendChild(a); a.click(); document.body.removeChild(a);
                            URL.revokeObjectURL(url);
                          } catch {}
                        }}
                        className="flex-1 bg-emerald-50 dark:bg-gray-700 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-600"
                      >تصدير JSON</Button>
                    </div>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {filteredAlerts.length === 0 ? (
                      <div className="text-center py-8 text-gray-600 dark:text-gray-400">لا توجد تنبيهات</div>
                    ) : (
                      <ul className="space-y-3">
                        {filteredAlerts.slice(0, 50).map((a: any, idx: number) => (
                          <li key={a.id || idx} className="p-3 rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                                    (a.severity === 'CRITICAL' || a.level === 'CRITICAL') ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300' :
                                    (a.severity === 'HIGH' || a.level === 'HIGH') ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300' :
                                    (a.severity === 'MEDIUM' || a.level === 'WARN' || a.level === 'MEDIUM') ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300' :
                                    'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
                                  }`}>
                                    {a.severity || a.level || 'INFO'}
                                  </span>
                                  <span className="font-semibold text-gray-800 dark:text-gray-200">{a.title || a.type || 'تنبيه أمني'}</span>
                                </div>
                                <div className="text-sm text-gray-700 dark:text-gray-300 break-words">{a.message || a.details || a.description || ''}</div>
                                <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                                  <span>IP:</span>
                                  <code dir="ltr" className="font-mono bg-gray-100 dark:bg-gray-900/40 px-1.5 py-0.5 rounded text-gray-800 dark:text-gray-200">{a.ip || a.ipAddress || 'غير محدد'}</code>
                                  {(a.ip || a.ipAddress) && (
                                    <button
                                      type="button"
                                      className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                      title="نسخ IP"
                                      aria-label="نسخ IP"
                                      onClick={() => { try { navigator.clipboard.writeText(String(a.ip || a.ipAddress)); pushToast('success', 'تم نسخ عنوان IP'); } catch {} }}
                                    >
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v12h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
                                    </button>
                                  )}
                                </div>
                              </div>
                              <div className="text-xs text-gray-600 dark:text-gray-400 ml-3 whitespace-nowrap">{a.at ? a.at : (a.timestamp ? formatDateTimeAr(new Date(a.timestamp)) : '')}</div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="flex justify-end mt-3 gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => {
                        try {
                          const items = filteredAlerts;
                          const headers = ['at','title','severity','ip','message'];
                          const rows = [headers.join(',')];
                          const esc = (v: any) => {
                            const s = (v == null ? '' : String(v));
                            if (/[",\n]/.test(s)) return '"' + s.replace(/\"/g, '""') + '"';
                            return s;
                          };
                          items.forEach((a: any) => {
                            const row = [a.at || '', a.title || a.type || '', normalizedSeverity(a), a.ip || a.ipAddress || '', a.message || a.details || a.description || ''];
                            rows.push(row.map(esc).join(','));
                          });
                          const csv = '\uFEFF' + rows.join('\n');
                          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
                          const url = URL.createObjectURL(blob);
                          const aEl = document.createElement('a');
                          aEl.href = url; aEl.download = `security-alerts-${Date.now()}.csv`;
                          document.body.appendChild(aEl); aEl.click(); document.body.removeChild(aEl);
                          URL.revokeObjectURL(url);
                        } catch (e) { pushToast('error', 'تعذر إنشاء CSV'); }
                      }}
                      className="bg-cyan-50 dark:bg-gray-700 text-cyan-700 dark:text-cyan-300 border-cyan-300 dark:border-cyan-600"
                    >تصدير CSV</Button>
                    <Button
                      variant="secondary"
                      onClick={async () => {
                        try {
                          const mod = await import('xlsx');
                          const XLSX: any = (mod as any).default || mod;
                          const items = filteredAlerts.map((a: any) => ({
                            at: a.at || '',
                            title: a.title || a.type || '',
                            severity: normalizedSeverity(a),
                            ip: a.ip || a.ipAddress || '',
                            message: a.message || a.details || a.description || ''
                          }));
                          const ws = XLSX.utils.json_to_sheet(items);
                          const wb = XLSX.utils.book_new();
                          XLSX.utils.book_append_sheet(wb, ws, 'Alerts');
                          XLSX.writeFile(wb, `security-alerts-${Date.now()}.xlsx`);
                        } catch (e) { pushToast('error', 'تعذر إنشاء Excel'); }
                      }}
                      className="bg-teal-50 dark:bg-gray-700 text-teal-700 dark:text-teal-300 border-teal-300 dark:border-teal-600"
                    >تصدير Excel</Button>
                  </div>
                </div>

                {/* Blocklist */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xl font-bold text-gray-800 dark:text-gray-200">قائمة الحظر</h4>
                    <div className="text-xs text-gray-500 dark:text-gray-400">العناصر: {secBlocklist.length}</div>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {secBlocklist.length === 0 ? (
                      <div className="text-center py-8 text-gray-600 dark:text-gray-400">لا توجد عناوين IP محظورة</div>
                    ) : (
                      <table className="min-w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
                          <tr>
                            <th className="px-3 py-2 text-right">عنوان IP</th>
                            <th className="px-3 py-2 text-right">محظور حتى</th>
                            <th className="px-3 py-2 text-right">السبب</th>
                            <th className="px-3 py-2 text-right">إجراء</th>
                          </tr>
                        </thead>
                        <tbody>
                          {secBlocklist.map((it: any, idx: number) => (
                            <tr key={it.ip || idx} className="border-b border-gray-100 dark:border-gray-700 odd:bg-gray-50 dark:odd:bg-gray-900/30">
                              <td className="px-3 py-2">{it.ip || it.address || '—'}</td>
                              <td className="px-3 py-2">{it.blockedUntil ? formatDateTimeAr(new Date(it.blockedUntil)) : '—'}</td>
                              <td className="px-3 py-2 break-all">{it.reason || it.type || ''}</td>
                              <td className="px-3 py-2 text-left">
                                <Button
                                  variant="secondary"
                                  onClick={async () => {
                                    try {
                                      const headers: Record<string, string> = { 'content-type': 'application/json' };
                                      if (secKey.trim()) headers['x-api-key'] = secKey.trim();
                                      const res = await fetch('/api/security/blocklist/unblock', {
                                        method: 'POST',
                                        headers,
                                        body: JSON.stringify({ ip: it.ip || it.address })
                                      });
                                      if (!res.ok) {
                                        let msg = `HTTP ${res.status}`;
                                        try { const j = await res.json(); if (j?.error) msg += ` - ${j.error}`; } catch {}
                                        throw new Error(msg);
                                      }
                                      await loadSecurityMonitoring();
                                      pushToast('success', `تم فك الحظر عن ${it.ip || it.address}`);
                                    } catch (e: any) {
                                      pushToast('error', 'تعذر فك الحظر: ' + (e?.message || e));
                                    }
                                  }}
                                  className="text-rose-700 border-rose-300 bg-rose-50 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-600 font-semibold"
                                >فك الحظر</Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>
            </Card>
            {/* Toasts */}
            {toasts.length > 0 && (
              <div className="fixed bottom-6 right-6 space-y-2 z-50">
                {toasts.map(t => (
                  <div key={t.id} className={`px-4 py-3 rounded-lg shadow-lg text-sm font-medium border backdrop-blur-sm ${
                    t.kind === 'success' ? 'bg-green-50/90 dark:bg-green-900/30 text-green-800 dark:text-green-200 border-green-300 dark:border-green-700' :
                    t.kind === 'error' ? 'bg-red-50/90 dark:bg-red-900/30 text-red-800 dark:text-red-200 border-red-300 dark:border-red-700' :
                    'bg-blue-50/90 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-700'
                  }`}>
                    {t.message}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'csp' && (
          <div className="space-y-6">
            <Card className="bg-gradient-to-r from-teal-100 to-emerald-100 dark:from-teal-900/20 dark:to-emerald-900/30 border-teal-300 dark:border-teal-700/50">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-teal-600 to-emerald-700 rounded-xl flex items-center justify-center">
                    <div className="w-3 h-3 bg-white rounded-full"></div>
                  </div>
                  <h3 className="text-2xl font-bold text-teal-800 dark:text-teal-200">
                    تقارير سياسة أمان المحتوى (CSP)
                  </h3>
                </div>
                <div className="flex gap-2 rtl:space-x-reverse flex-wrap justify-end">
                  <input
                    type="password"
                    placeholder="x-api-key (اختياري)"
                    className="p-2 rounded-lg border border-teal-300 dark:border-teal-700 dark:bg-gray-800 dark:text-gray-100"
                    value={cspKey}
                    onChange={(e) => { setCspKey(e.target.value); localStorage.setItem('csp_panel_api_key', e.target.value); }}
                  />
                  <select
                    className="p-2 rounded-lg border border-teal-300 dark:border-teal-700 dark:bg-gray-800 dark:text-gray-100"
                    value={cspTimeRange}
                    onChange={(e) => { setCspTimeRange(e.target.value); localStorage.setItem('csp_panel_time_range', e.target.value); }}
                    title="نطاق الزمن"
                  >
                    <option value="1h">آخر ساعة</option>
                    <option value="6h">آخر 6 ساعات</option>
                    <option value="24h">آخر 24 ساعة</option>
                    <option value="7d">آخر 7 أيام</option>
                    <option value="all">الكل</option>
                  </select>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    className="w-24 p-2 rounded-lg border border-teal-300 dark:border-teal-700 dark:bg-gray-800 dark:text-gray-100"
                    value={cspLimit}
                    onChange={(e) => { const n = Math.max(1, Math.min(500, Number(e.target.value)||100)); setCspLimit(n); localStorage.setItem('csp_panel_limit', String(n)); }}
                  />
                  <Button variant="secondary" onClick={loadCspViolations} className="bg-teal-50 dark:bg-gray-700 text-teal-700 dark:text-teal-300 border-teal-300 dark:border-teal-600 font-semibold">تحديث</Button>
                </div>
              </div>

              {cspError && (
                <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 mb-4">
                  خطأ: {cspError}
                </div>
              )}

              <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                {/* Filters row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                  <select
                    className="p-2 rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-100"
                    value={cspDirectiveFilter}
                    onChange={(e) => setCspDirectiveFilter(e.target.value)}
                    title="تصفية حسب violated-directive"
                    aria-label="تصفية حسب violated-directive"
                  >
                    <option value="">كل التوجيهات</option>
                    {directiveOptions.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                  <select
                    className="p-2 rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-100"
                    value={cspBlockedFilter}
                    onChange={(e) => setCspBlockedFilter(e.target.value)}
                    title="تصفية حسب blocked-uri"
                    aria-label="تصفية حسب blocked-uri"
                  >
                    <option value="">كل المصادر</option>
                    {blockedUriOptions.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => { setCspDirectiveFilter(''); setCspBlockedFilter(''); }}
                      className="flex-1 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600"
                    >مسح المرشحات</Button>
                    <Button
                      variant="secondary"
                      onClick={async () => {
                        try {
                          const items = filteredItems();
                          const blob = new Blob([JSON.stringify({ items, total: items.length, generatedAt: new Date().toISOString() }, null, 2)], { type: 'application/json' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url; a.download = `csp-violations-${Date.now()}.json`;
                          document.body.appendChild(a); a.click(); document.body.removeChild(a);
                          URL.revokeObjectURL(url);
                        } catch {}
                      }}
                      className="flex-1 bg-emerald-50 dark:bg-gray-700 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-600"
                    >تصدير JSON</Button>
                    <Button
                      variant="secondary"
                      onClick={async () => {
                        try {
                          const data = filteredItems();
                          const mod = await import('xlsx');
                          // Some bundlers expose default export; fallback to namespace
                          const XLSX: any = (mod as any).default || mod;
                          const ws = XLSX.utils.json_to_sheet(data);
                          const wb = XLSX.utils.book_new();
                          XLSX.utils.book_append_sheet(wb, ws, 'CSP');
                          XLSX.writeFile(wb, `csp-violations-${Date.now()}.xlsx`);
                        } catch (e) {
                          alert('تعذر إنشاء ملف Excel');
                        }
                      }}
                      className="flex-1 bg-teal-50 dark:bg-gray-700 text-teal-700 dark:text-teal-300 border-teal-300 dark:border-teal-600"
                    >تصدير Excel</Button>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        try {
                          const items = filteredItems();
                          const headers = ['at','document-uri','blocked-uri','violated-directive','status-code'];
                          const rows = [headers.join(',')];
                          const esc = (v: any) => {
                            const s = (v == null ? '' : String(v));
                            if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
                            return s;
                          };
                          items.forEach(it => {
                            rows.push(headers.map(h => esc((it as any)[h])).join(','));
                          });
                          const csv = '\uFEFF' + rows.join('\n');
                          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url; a.download = `csp-violations-${Date.now()}.csv`;
                          document.body.appendChild(a); a.click(); document.body.removeChild(a);
                          URL.revokeObjectURL(url);
                        } catch (e) { alert('تعذر إنشاء CSV'); }
                      }}
                      className="flex-1 bg-cyan-50 dark:bg-gray-700 text-cyan-700 dark:text-cyan-300 border-cyan-300 dark:border-cyan-600"
                    >تصدير CSV</Button>
                  </div>
                </div>

                {/* Dev seeding tools */}
                {isDevHost && (
                  <div className="flex items-center gap-3 mb-4 text-sm">
                    <span className="text-gray-600 dark:text-gray-400">أدوات المطور (Dev فقط):</span>
                    <input
                      type="number"
                      min={1}
                      max={200}
                      className="w-24 p-2 rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-900/50 dark:text-gray-100"
                      value={seedCount}
                      onChange={(e) => setSeedCount(Math.max(1, Math.min(200, Number(e.target.value)||10)))}
                      title="عدد السجلات"
                    />
                    <Button variant="secondary" onClick={handleSeedViolations} className="bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600">
                      توليد بيانات تجريبية
                    </Button>
                    <span className="text-xs text-gray-500">يرسل POST إلى /api/csp-report</span>
                  </div>
                )}

                {/* CSP rollout tip */}
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  ملاحظة: التحكم في التشدد يتم عبر المتغيرات: <code>CSP_ENABLED</code>, <code>CSP_REPORT_ONLY</code>, <code>CSP_AUTO_ENFORCE_DATE</code>, و<code>CSP_EXTRA_*_SRC</code>.
                </div>

                <div className="flex items-center justify-between mb-3 text-sm text-gray-600 dark:text-gray-400">
                  <span>
                    الإجمالي: <span className="font-bold text-teal-700 dark:text-teal-300">{cspTotal}</span>
                    <span className="mx-2">|</span>
                    المعروض بعد التصفية: <span className="font-bold text-teal-700 dark:text-teal-300">{filteredItems().length}</span>
                  </span>
                  <span>النطاق الزمني: {cspTimeRange === 'all' ? 'الكل' : cspTimeRange}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
                      <tr>
                        <th className="px-3 py-2 text-right">الوقت</th>
                        <th className="px-3 py-2 text-right">الصفحة</th>
                        <th className="px-3 py-2 text-right">المصدر المحجوب</th>
                        <th className="px-3 py-2 text-right">التوجيه المخالف</th>
                        <th className="px-3 py-2 text-right">الكود</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredItems().length === 0 ? (
                        <tr>
                          <td className="px-3 py-4 text-center text-gray-500 dark:text-gray-400" colSpan={5}>لا توجد بيانات</td>
                        </tr>
                      ) : (
                        filteredItems().map((item, idx) => (
                          <tr key={idx} className="border-b border-gray-100 dark:border-gray-700 odd:bg-gray-50 dark:odd:bg-gray-900/30">
                            <td className="px-3 py-2">{item.at || ''}</td>
                            <td className="px-3 py-2 break-all">{item['document-uri'] || ''}</td>
                            <td className="px-3 py-2 break-all">{item['blocked-uri'] || ''}</td>
                            <td className="px-3 py-2">{item['violated-directive'] || ''}</td>
                            <td className="px-3 py-2">{item['status-code'] || ''}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'sessions' && (
          <div className="space-y-6">
            <Card className="bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/30 border-green-300 dark:border-green-700/50">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-green-600 to-emerald-700 rounded-xl flex items-center justify-center">
                    <div className="w-3 h-3 bg-white rounded-full"></div>
                  </div>
                  <h3 className="text-2xl font-bold text-green-800 dark:text-green-200">
                    الجلسات النشطة ({activeSessions.length})
                  </h3>
                </div>
                <div className="flex space-x-2 rtl:space-x-reverse">
                  <Button
                    variant="secondary"
                    onClick={updateData}
                    className="bg-green-50 dark:bg-gray-700 text-green-700 dark:text-green-300 border-green-300 dark:border-green-600 font-semibold"
                  >
                    تحديث
                  </Button>
                  <Button
                    variant="primary"
                    onClick={terminateAllSessions}
                    className="bg-red-600 text-white font-semibold border-red-600"
                  >
                    إنهاء جميع الجلسات
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                {activeSessions.length === 0 ? (
                  <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                    <div className="w-16 h-16 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                      <div className="w-6 h-6 bg-white rounded-full"></div>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 text-lg font-medium">لا توجد جلسات نشطة</p>
                  </div>
                ) : (
                  activeSessions.map((session) => (
                    <div
                      key={session.sessionId}
                      className={`p-6 rounded-xl border-2 shadow-sm ${
                        session.isCurrentSession
                          ? 'border-blue-300 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-600'
                          : session.isSuspicious
                          ? 'border-red-300 bg-red-50 dark:bg-red-900/20 dark:border-red-600'
                          : 'border-gray-300 bg-white dark:bg-gray-800 dark:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4 rtl:space-x-reverse">
                          {getDeviceIcon(session.device)}
                          <div>
                            <div className="flex items-center space-x-3 rtl:space-x-reverse mb-2">
                              <h4 className="font-bold text-lg text-gray-900 dark:text-gray-100">
                                {session.device}
                              </h4>
                              {session.isCurrentSession && (
                                <span className="bg-green-200 text-green-800 dark:bg-green-800/30 dark:text-green-300 text-sm px-3 py-1 rounded-full font-semibold">
                                  الجلسة الحالية
                                </span>
                              )}
                              {session.isSuspicious && (
                                <span className="bg-red-200 text-red-800 dark:bg-red-800/30 dark:text-red-300 text-sm px-3 py-1 rounded-full font-semibold">
                                  مشبوهة
                                </span>
                              )}
                            </div>
                            <div className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                              <p><span className="font-semibold">الموقع:</span> {session.location}</p>
                              <p><span className="font-semibold">عنوان IP:</span> {session.ipAddress}</p>
                              <p><span className="font-semibold">آخر نشاط:</span> {formatDateTimeLocal(session.lastActivity)}</p>
                            </div>
                          </div>
                        </div>
                        
                        {!session.isCurrentSession && (
                          <Button
                            variant="secondary"
                            onClick={() => terminateSession(session.sessionId)}
                            className="text-red-700 border-red-300 bg-red-50 dark:bg-red-900/20 dark:text-red-400 dark:border-red-600 font-semibold"
                          >
                            إنهاء الجلسة
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="space-y-6">
            <Card className="bg-gradient-to-r from-purple-100 to-violet-100 dark:from-purple-900/20 dark:to-violet-900/30 border-purple-300 dark:border-purple-700/50">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-violet-700 rounded-xl flex items-center justify-center">
                    <div className="w-3 h-3 bg-white rounded-full"></div>
                  </div>
                  <h3 className="text-2xl font-bold text-purple-800 dark:text-purple-200">
                    سجلات الأمان ({securityLogs.length})
                  </h3>
                </div>
                <div className="flex space-x-2 rtl:space-x-reverse">
                  <Button
                    variant="secondary"
                    onClick={updateData}
                    className="bg-purple-50 dark:bg-gray-700 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-600 font-semibold"
                  >
                    تحديث
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={exportSecurityLogs}
                    className="bg-green-50 dark:bg-gray-700 text-green-700 dark:text-purple-300 border-green-300 dark:border-purple-600 font-semibold"
                  >
                    تصدير السجلات
                  </Button>
                </div>
              </div>

              <div className="space-y-4 max-h-96 overflow-y-auto bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                {securityLogs.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gradient-to-r from-purple-400 to-violet-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                      <div className="w-6 h-6 bg-white rounded-full"></div>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 text-lg font-medium">لا توجد سجلات أمان</p>
                  </div>
                ) : (
                  securityLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-5 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3 rtl:space-x-reverse">
                          <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                          <span className="font-bold text-lg text-gray-900 dark:text-gray-100">
                            {log.event}
                          </span>
                          <span className={`text-sm px-3 py-1 rounded-full font-semibold ${getSeverityColor(log.severity)}`}>
                            {log.severity}
                          </span>
                        </div>
                        <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                          {formatDateTimeLocal(log.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300 mb-3 leading-relaxed">
                        {log.details}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 p-2 rounded-lg">
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                          <span>IP: {log.ipAddress}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                          <span>User-Agent: {log.userAgent.substring(0, 60)}...</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-8">
            <Card className="bg-gradient-to-br from-slate-50 to-gray-50 dark:from-slate-900/50 dark:to-gray-900/60 border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-gradient-to-r from-slate-500 to-gray-600 rounded-xl flex items-center justify-center">
                  <div className="w-3 h-3 bg-white rounded-full"></div>
                </div>
                <h3 className="text-2xl font-bold bg-gradient-to-r from-slate-700 to-gray-800 dark:from-slate-300 dark:to-gray-400 bg-clip-text text-transparent">
                  إعدادات أمان الجلسات
                </h3>
              </div>
              
              <div className="space-y-8">
                {/* إعدادات أساسية */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/30 p-6 rounded-2xl border border-blue-200 dark:border-blue-700/50">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                    <h4 className="text-xl font-bold text-blue-800 dark:text-blue-200">
                      الإعدادات الأساسية
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm shadow-sm">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                        <label className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                          مدة انتهاء الجلسة (دقائق)
                        </label>
                      </div>
                      <input
                        type="number"
                        defaultValue={60}
                        className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        <label className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                          عدد الجلسات المسموحة
                        </label>
                      </div>
                      <input
                        type="number"
                        defaultValue={3}
                        className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                {/* إعدادات متقدمة */}
                <div className="bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/30 p-6 rounded-2xl border border-purple-200 dark:border-purple-700/50">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 bg-purple-500 rounded-full"></div>
                      <h4 className="text-xl font-bold text-purple-800 dark:text-purple-200">
                        الإعدادات المتقدمة
                      </h4>
                    </div>
                    <Button
                      variant="secondary"
                      onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                      className="bg-gradient-to-r from-purple-600 to-violet-600 text-white border-0 px-4 py-2 shadow-md font-semibold"
                    >
                      {showAdvancedSettings ? 'إخفاء' : 'عرض'} الإعدادات المتقدمة
                    </Button>
                  </div>

                  {showAdvancedSettings && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                <label className="font-semibold text-gray-900 dark:text-gray-100">
                                  تتبع بصمة المتصفح
                                </label>
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                                مراقبة خصائص المتصفح للكشف عن التغييرات المشبوهة
                              </p>
                            </div>
                            <input
                              type="checkbox"
                              defaultChecked
                              className="h-5 w-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>

                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm shadow-sm">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                <label className="font-semibold text-gray-900 dark:text-gray-100">
                                  فحص صارم لعنوان IP
                                </label>
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                                تنبيه عند تغيير عنوان IP
                              </p>
                            </div>
                            <input
                              type="checkbox"
                              className="h-5 w-5 text-green-600 rounded focus:ring-2 focus:ring-green-500"
                            />
                          </div>
                        </div>

                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm shadow-sm">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                                <label className="font-semibold text-gray-900 dark:text-gray-100">
                                  طلب المصادقة متعددة العوامل للعمليات الحساسة
                                </label>
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                                مصادقة إضافية للعمليات الهامة
                              </p>
                            </div>
                            <input
                              type="checkbox"
                              defaultChecked
                              className="h-5 w-5 text-orange-600 rounded focus:ring-2 focus:ring-orange-500"
                            />
                          </div>
                        </div>

                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm shadow-sm">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                                <label className="font-semibold text-gray-900 dark:text-gray-100">
                                  تسجيل مفصل للأنشطة
                                </label>
                              </div>
                              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                                حفظ سجل مفصل لجميع الأنشطة
                              </p>
                            </div>
                            <input
                              type="checkbox"
                              defaultChecked
                              className="h-5 w-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="pt-6 border-t border-purple-200 dark:border-purple-700">
                        <Button 
                          variant="primary" 
                          className="bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 text-white border-0 px-6 py-3 shadow-lg hover:shadow-xl transition-all duration-300"
                        >
                          حفظ الإعدادات
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'diagram' && (
          <div className="space-y-6">
            <Card className="bg-gradient-to-r from-cyan-100 to-blue-100 dark:from-cyan-900/20 dark:to-blue-900/30 border-cyan-300 dark:border-cyan-700/50">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-gradient-to-r from-cyan-600 to-blue-700 rounded-xl flex items-center justify-center">
                  <div className="w-3 h-3 bg-white rounded-full"></div>
                </div>
                <h3 className="text-2xl font-bold text-cyan-800 dark:text-cyan-200">
                  المخطط البصري لأمان الجلسات
                </h3>
              </div>

              {/* مخطط الإحصائيات العامة */}
              <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 mb-6">
                <div className="flex items-center justify-between mb-6">
                  <h4 className="text-xl font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                    <div className="w-3 h-3 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"></div>
                    نظرة عامة على الأمان
                  </h4>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    آخر تحديث: {formatDateTimeLocal(new Date())}
                  </div>
                </div>

                {/* مخطط الدونات للإحصائيات */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                  <div className="text-center">
                    <div className="relative mx-auto mb-3" style={{ width: '80px', height: '80px' }}>
                      <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                        <path
                          className="text-gray-200 dark:text-gray-700"
                          stroke="currentColor"
                          strokeWidth="3"
                          fill="transparent"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        <path
                          className="text-green-500"
                          stroke="currentColor"
                          strokeWidth="3"
                          fill="transparent"
                          strokeDasharray={`${(sessionStats.totalActiveSessions / 10) * 100}, 100`}
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-lg font-bold text-green-600">{sessionStats.totalActiveSessions}</span>
                      </div>
                    </div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">الجلسات النشطة</p>
                  </div>

                  <div className="text-center">
                    <div className="relative mx-auto mb-3" style={{ width: '80px', height: '80px' }}>
                      <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                        <path
                          className="text-gray-200 dark:text-gray-700"
                          stroke="currentColor"
                          strokeWidth="3"
                          fill="transparent"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        <path
                          className="text-yellow-500"
                          stroke="currentColor"
                          strokeWidth="3"
                          fill="transparent"
                          strokeDasharray={`${(sessionStats.totalSuspiciousActivities / 5) * 100}, 100`}
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-lg font-bold text-yellow-600">{sessionStats.totalSuspiciousActivities}</span>
                      </div>
                    </div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">أنشطة مشبوهة</p>
                  </div>

                  <div className="text-center">
                    <div className="relative mx-auto mb-3" style={{ width: '80px', height: '80px' }}>
                      <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                        <path
                          className="text-gray-200 dark:text-gray-700"
                          stroke="currentColor"
                          strokeWidth="3"
                          fill="transparent"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        <path
                          className="text-blue-500"
                          stroke="currentColor"
                          strokeWidth="3"
                          fill="transparent"
                          strokeDasharray={`${(sessionStats.recentLogins / 20) * 100}, 100`}
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-lg font-bold text-blue-600">{sessionStats.recentLogins}</span>
                      </div>
                    </div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">عمليات دخول حديثة</p>
                  </div>

                  <div className="text-center">
                    <div className="relative mx-auto mb-3" style={{ width: '80px', height: '80px' }}>
                      <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                        <path
                          className="text-gray-200 dark:text-gray-700"
                          stroke="currentColor"
                          strokeWidth="3"
                          fill="transparent"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        <path
                          className="text-red-500"
                          stroke="currentColor"
                          strokeWidth="3"
                          fill="transparent"
                          strokeDasharray={`${(sessionStats.securityViolations / 3) * 100}, 100`}
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-lg font-bold text-red-600">{sessionStats.securityViolations}</span>
                      </div>
                    </div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">انتهاكات أمنية</p>
                  </div>
                </div>

                {/* مخطط تدفق الجلسات */}
                <div className="bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-900/50 dark:to-slate-900/60 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
                  <h5 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
                    <div className="w-2 h-2 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"></div>
                    مخطط تدفق حالة الجلسات
                  </h5>
                  
                  <div className="flex flex-col md:flex-row items-center justify-between space-y-6 md:space-y-0 md:space-x-8 rtl:space-x-reverse">
                    {/* بداية الجلسة */}
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center shadow-lg mb-2">
                        <div className="w-6 h-6 bg-white rounded-full"></div>
                      </div>
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 text-center">تسجيل الدخول</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">بداية الجلسة</p>
                    </div>

                    {/* سهم */}
                    <div className="hidden md:block">
                      <div className="w-8 h-0.5 bg-gradient-to-r from-green-400 to-blue-400"></div>
                    </div>

                    {/* التحقق من الأمان */}
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center shadow-lg mb-2">
                        <div className="w-6 h-6 bg-white rounded-full"></div>
                      </div>
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 text-center">التحقق من الأمان</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">فحص الصلاحيات</p>
                    </div>

                    {/* سهم */}
                    <div className="hidden md:block">
                      <div className="w-8 h-0.5 bg-gradient-to-r from-blue-400 to-purple-400"></div>
                    </div>

                    {/* الجلسة النشطة */}
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-violet-500 rounded-full flex items-center justify-center shadow-lg mb-2">
                        <div className="w-6 h-6 bg-white rounded-full"></div>
                      </div>
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 text-center">جلسة نشطة</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">الاستخدام العادي</p>
                    </div>

                    {/* سهم */}
                    <div className="hidden md:block">
                      <div className="w-8 h-0.5 bg-gradient-to-r from-purple-400 to-red-400"></div>
                    </div>

                    {/* إنهاء الجلسة */}
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg mb-2">
                        <div className="w-6 h-6 bg-white rounded-full"></div>
                      </div>
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 text-center">تسجيل الخروج</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">إنهاء آمن</p>
                    </div>
                  </div>
                </div>

                {/* مستويات الأمان */}
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/30 p-6 rounded-xl border border-indigo-200 dark:border-indigo-700/50 mt-6">
                  <h5 className="text-lg font-bold text-indigo-800 dark:text-indigo-200 mb-4 flex items-center gap-2">
                    <div className="w-2 h-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"></div>
                    مستويات الأمان
                  </h5>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* أمان منخفض */}
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-green-200 dark:border-green-700/50">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="font-semibold text-green-700 dark:text-green-300">أمان منخفض</span>
                      </div>
                      <div className="text-2xl font-bold text-green-600 mb-1">{Math.floor(Math.random() * 5) + 1}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">عدد الجلسات</div>
                    </div>

                    {/* أمان متوسط */}
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-yellow-200 dark:border-yellow-700/50">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                        <span className="font-semibold text-yellow-700 dark:text-yellow-300">أمان متوسط</span>
                      </div>
                      <div className="text-2xl font-bold text-yellow-600 mb-1">{Math.floor(Math.random() * 3) + 1}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">عدد الجلسات</div>
                    </div>

                    {/* أمان عالي */}
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-red-200 dark:border-red-700/50">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <span className="font-semibold text-red-700 dark:text-red-300">أمان عالي</span>
                      </div>
                      <div className="text-2xl font-bold text-red-600 mb-1">{Math.floor(Math.random() * 2)}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">عدد الجلسات</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* أزرار التحكم */}
              <div className="flex justify-end space-x-3 rtl:space-x-reverse mt-6">
                <Button
                  variant="secondary"
                  onClick={updateData}
                  className="bg-cyan-50 dark:bg-gray-700 text-cyan-700 dark:text-cyan-300 border-cyan-300 dark:border-cyan-600 font-semibold"
                >
                  تحديث المخطط
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => window.print()}
                  className="bg-blue-50 dark:bg-gray-700 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-600 font-semibold"
                >
                  طباعة المخطط
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* تبويب التحليل الذكي للأمان */}
        {activeTab === 'aianalytics' && (
          <div className="space-y-6">
            {/* حالة التحليل */}
            {isAnalyzing && (
              <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/30 border-blue-300 dark:border-blue-700/50">
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 ml-4"></div>
                  <div>
                    <h3 className="text-xl font-bold text-blue-800 dark:text-blue-200">جاري التحليل الذكي...</h3>
                    <p className="text-blue-600 dark:text-blue-400 mt-1">تحليل البيانات الأمنية باستخدام الذكاء الاصطناعي</p>
                  </div>
                </div>
              </Card>
            )}

            {/* نتائج التحليل الذكي */}
            {!isAnalyzing && aiAnalysis && (
              <>
                {/* بطاقة النقاط والمستوى العام */}
                <Card className="bg-gradient-to-br from-violet-100/50 to-purple-100/50 dark:from-violet-900/20 dark:to-purple-900/30 border-violet-300/50 dark:border-violet-700/50 shadow-xl backdrop-blur-sm">
                  <div className="p-8">
                    <div className="flex items-center justify-between mb-8">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-gradient-to-r from-violet-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                          <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-sm"></div>
                        </div>
                        <div>
                          <h3 className="text-3xl font-bold text-violet-800 dark:text-violet-200 mb-2">
                            التحليل الذكي المتقدم
                          </h3>
                          <p className="text-violet-600 dark:text-violet-300 text-lg">
                            تحليل شامل مدعوم بالذكاء الاصطناعي
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md border border-gray-200 dark:border-gray-700">
                          <div className="text-4xl font-bold text-violet-700 dark:text-violet-300 mb-1">
                            {aiAnalysis.securityScore}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">نقاط الأمان من 100</div>
                        </div>
                      </div>
                    </div>

                    {/* مستوى التهديد */}
                    <div className="bg-white/80 dark:bg-gray-800/80 rounded-2xl p-8 border border-gray-200/50 dark:border-gray-700/50 shadow-lg backdrop-blur-sm mb-8">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">
                            مستوى التهديد الحالي
                          </h4>
                          <div className={`inline-flex items-center px-6 py-3 rounded-full text-lg font-bold shadow-lg ${
                            aiAnalysis.threatLevel === 'LOW' ? 'bg-gradient-to-r from-green-500 to-green-600 text-white' :
                            aiAnalysis.threatLevel === 'MEDIUM' ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white' :
                            aiAnalysis.threatLevel === 'HIGH' ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white' :
                            'bg-gradient-to-r from-red-500 to-red-600 text-white'
                          }`}>
                            <div className={`w-3 h-3 rounded-full mr-2 ${
                              aiAnalysis.threatLevel === 'LOW' ? 'bg-green-300' :
                              aiAnalysis.threatLevel === 'MEDIUM' ? 'bg-yellow-300' :
                              aiAnalysis.threatLevel === 'HIGH' ? 'bg-orange-300' :
                              'bg-red-300'
                            }`}></div>
                            {aiAnalysis.threatLevel === 'LOW' && 'منخفض'}
                            {aiAnalysis.threatLevel === 'MEDIUM' && 'متوسط'}
                            {aiAnalysis.threatLevel === 'HIGH' && 'مرتفع'}
                            {aiAnalysis.threatLevel === 'CRITICAL' && 'حرج'}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">آخر تحليل</div>
                          <div className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                            {new Date().toLocaleTimeString('ar-SY')}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* الإحصائيات المتقدمة */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-center shadow-sm">
                        <div className="text-2xl mb-2">⚠️</div>
                        <div className="text-2xl font-bold text-red-700 dark:text-red-300 mb-1">{aiAnalysis.riskFactors.length}</div>
                        <div className="text-xs font-medium text-red-600 dark:text-red-400">عوامل خطر</div>
                      </div>
                      
                      <div className="bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-4 text-center shadow-sm">
                        <div className="text-2xl mb-2">🔍</div>
                        <div className="text-2xl font-bold text-orange-700 dark:text-orange-300 mb-1">{aiAnalysis.anomalies.length}</div>
                        <div className="text-xs font-medium text-orange-600 dark:text-orange-400">حالات شاذة</div>
                      </div>
                      
                      <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 text-center shadow-sm">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mb-3 shadow-md">
                          <div className="w-5 h-5 rounded bg-white/30"></div>
                        </div>
                        <div className="text-2xl font-bold text-blue-700 dark:text-blue-300 mb-1">{aiAnalysis.predictions.length}</div>
                        <div className="text-xs font-medium text-blue-600 dark:text-blue-400">تنبؤات</div>
                      </div>
                      
                      <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 text-center shadow-sm">
                        <div className="text-2xl mb-2">💡</div>
                        <div className="text-2xl font-bold text-green-700 dark:text-green-300 mb-1">{aiAnalysis.recommendations.length}</div>
                        <div className="text-xs font-medium text-green-600 dark:text-green-400">توصيات</div>
                      </div>
                    </div>
                  </div>
                </Card>

                {/* تحليل المخاطر المتقدم */}
                {aiAnalysis.riskFactors.length > 0 && (
                  <Card className="bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/30 border-red-300 dark:border-red-700/50">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-8 h-8 bg-gradient-to-r from-red-600 to-pink-700 rounded-xl flex items-center justify-center">
                        <div className="text-white text-lg">⚠️</div>
                      </div>
                      <h3 className="text-2xl font-bold text-red-800 dark:text-red-200">
                        تحليل عوامل المخاطر ({aiAnalysis.riskFactors.length})
                      </h3>
                    </div>
                    
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                      {aiAnalysis.riskFactors.slice(0, 5).map((risk, index) => (
                        <div key={risk.id} className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                                risk.severity === 'CRITICAL' ? 'bg-red-600' :
                                risk.severity === 'HIGH' ? 'bg-orange-500' :
                                risk.severity === 'MEDIUM' ? 'bg-yellow-500' : 'bg-green-500'
                              }`}>
                                {index + 1}
                              </div>
                              <div>
                                <h4 className="font-bold text-lg text-gray-900 dark:text-gray-100">{risk.description}</h4>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                                    risk.severity === 'CRITICAL' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300' :
                                    risk.severity === 'HIGH' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300' :
                                    risk.severity === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300' :
                                    'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                                  }`}>
                                    {risk.severity}
                                  </span>
                                  <span className="text-sm text-gray-600 dark:text-gray-400">
                                    النوع: {risk.type}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-red-600 dark:text-red-400">{risk.score}</div>
                              <div className="text-xs text-gray-500">نقاط المخاطر</div>
                            </div>
                          </div>
                          
                          {risk.evidence.length > 0 && (
                            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                              <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">أدلة:</div>
                              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                                {risk.evidence.map((evidence, i) => (
                                  <li key={i}>• {evidence}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {/* التنبؤات الذكية */}
                {aiAnalysis.predictions.length > 0 && (
                  <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/30 border-blue-300 dark:border-blue-700/50">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center">
                        <div className="text-white text-lg">🔮</div>
                      </div>
                      <h3 className="text-2xl font-bold text-blue-800 dark:text-blue-200">
                        التنبؤات الأمنية الذكية ({aiAnalysis.predictions.length})
                      </h3>
                    </div>
                    
                    <div className="space-y-4">
                      {aiAnalysis.predictions.map((prediction, index) => (
                        <div key={index} className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h4 className="font-bold text-lg text-gray-900 dark:text-gray-100 mb-2">{prediction.description}</h4>
                              <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                                <span>احتمالية: <span className="font-bold text-blue-600">{Math.round(prediction.probability * 100)}%</span></span>
                                <span>الإطار الزمني: <span className="font-bold">{prediction.timeWindow}</span></span>
                                <span>الثقة: <span className="font-bold">{Math.round(prediction.confidence * 100)}%</span></span>
                              </div>
                            </div>
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center shadow-md ${
                              prediction.probability > 0.7 ? 'bg-gradient-to-br from-red-500 to-red-600' :
                              prediction.probability > 0.4 ? 'bg-gradient-to-br from-orange-500 to-orange-600' :
                              'bg-gradient-to-br from-green-500 to-green-600'
                            }`}>
                              <div className={`w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white font-bold ${
                                prediction.probability > 0.7 ? 'text-red-100' :
                                prediction.probability > 0.4 ? 'text-orange-100' :
                                'text-green-100'
                              }`}>
                                {prediction.type === 'POTENTIAL_BREACH' ? '!' :
                                 prediction.type === 'SUSPICIOUS_ACTIVITY' ? '?' :
                                 prediction.type === 'SYSTEM_OVERLOAD' ? '⟳' : '✓'}
                              </div>
                            </div>
                          </div>
                          
                          {prediction.preventiveActions.length > 0 && (
                            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                              <div className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">الإجراءات الوقائية المقترحة:</div>
                              <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                                {prediction.preventiveActions.map((action, i) => (
                                  <li key={i}>• {action}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {/* التوصيات الذكية */}
                {aiAnalysis.recommendations.length > 0 && (
                  <Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/30 border-green-300 dark:border-green-700/50">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-8 h-8 bg-gradient-to-r from-green-600 to-emerald-700 rounded-xl flex items-center justify-center">
                        <div className="text-white text-lg">💡</div>
                      </div>
                      <h3 className="text-2xl font-bold text-green-800 dark:text-green-200">
                        التوصيات الذكية ({aiAnalysis.recommendations.length})
                      </h3>
                    </div>
                    
                    <div className="space-y-4">
                      {aiAnalysis.recommendations.slice(0, 3).map((rec) => (
                        <div key={rec.id} className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                  rec.priority === 'URGENT' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300' :
                                  rec.priority === 'HIGH' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300' :
                                  rec.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300' :
                                  'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                                }`}>
                                  {rec.priority}
                                </span>
                                <span className="text-sm text-gray-600 dark:text-gray-400">{rec.category}</span>
                              </div>
                              <h4 className="font-bold text-lg text-gray-900 dark:text-gray-100 mb-2">{rec.title}</h4>
                              <p className="text-gray-700 dark:text-gray-300 mb-3">{rec.description}</p>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 text-sm">
                            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                              <div className="font-medium text-gray-700 dark:text-gray-300">التأثير المتوقع</div>
                              <div className="text-gray-600 dark:text-gray-400 mt-1">{rec.expectedImpact}</div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                              <div className="font-medium text-gray-700 dark:text-gray-300">صعوبة التنفيذ</div>
                              <div className="text-gray-600 dark:text-gray-400 mt-1">{rec.implementationDifficulty}</div>
                            </div>
                            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                              <div className="font-medium text-gray-700 dark:text-gray-300">التكلفة المقدرة</div>
                              <div className="text-gray-600 dark:text-gray-400 mt-1">{rec.estimatedCost}</div>
                            </div>
                          </div>
                          
                          {rec.actionItems.length > 0 && (
                            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                              <div className="text-sm font-medium text-green-800 dark:text-green-300 mb-2">خطوات التنفيذ:</div>
                              <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
                                {rec.actionItems.map((item, i) => (
                                  <li key={i}>• {item}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {/* تحليل السلوك */}
                {aiAnalysis.behaviorAnalysis && aiAnalysis.behaviorAnalysis.deviations.length > 0 && (
                  <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/30 border-purple-300 dark:border-purple-700/50">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-indigo-700 rounded-xl flex items-center justify-center">
                        <div className="text-white text-lg">🎭</div>
                      </div>
                      <h3 className="text-2xl font-bold text-purple-800 dark:text-purple-200">
                        تحليل السلوك والانحرافات ({aiAnalysis.behaviorAnalysis.deviations.length})
                      </h3>
                    </div>
                    
                    <div className="space-y-4 max-h-64 overflow-y-auto">
                      {aiAnalysis.behaviorAnalysis.deviations.slice(0, 5).map((deviation, index) => (
                        <div key={index} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="font-bold text-gray-900 dark:text-gray-100">{deviation.userId}</span>
                                <span className="text-sm text-gray-600 dark:text-gray-400">({deviation.type})</span>
                              </div>
                              <p className="text-gray-700 dark:text-gray-300">{deviation.description}</p>
                            </div>
                            <div className="text-right ml-4">
                              <div className="text-lg font-bold text-purple-600 dark:text-purple-400">
                                {Math.round(deviation.severity * 100)}%
                              </div>
                              <div className="text-xs text-gray-500">شدة الانحراف</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {/* الاتجاهات الأمنية */}
                {aiAnalysis.trends && aiAnalysis.trends.length > 0 && (
                  <Card className="bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/30 border-teal-300 dark:border-teal-700/50">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-8 h-8 bg-gradient-to-r from-teal-600 to-cyan-700 rounded-xl flex items-center justify-center shadow-md">
                        <div className="w-4 h-4 rounded bg-white/30"></div>
                      </div>
                      <h3 className="text-2xl font-bold text-teal-800 dark:text-teal-200">
                        الاتجاهات الأمنية ({aiAnalysis.trends.length})
                      </h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {aiAnalysis.trends.map((trend, index) => (
                        <div key={index} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-bold text-gray-900 dark:text-gray-100">{trend.metric}</h4>
                            <div className={`px-3 py-1 rounded-full text-xs font-bold text-white shadow-sm ${
                              trend.direction === 'INCREASING' ? 'bg-gradient-to-r from-red-500 to-red-600' :
                              trend.direction === 'DECREASING' ? 'bg-gradient-to-r from-green-500 to-green-600' :
                              'bg-gradient-to-r from-gray-500 to-gray-600'
                            }`}>
                              <span className="mr-1">
                                {trend.direction === 'INCREASING' ? '↗' :
                                 trend.direction === 'DECREASING' ? '↘' : '→'}
                              </span>
                              {trend.direction}
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{trend.description}</p>
                          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                            <span>التغيير: {trend.changeRate}%</span>
                            <span>الفترة: {trend.period}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {/* أزرار الإجراءات */}
                <div className="flex justify-center space-x-6 rtl:space-x-reverse mt-8">
                  <Button
                    variant="primary"
                    onClick={updateData}
                    disabled={isAnalyzing}
                    className="bg-gradient-to-r from-violet-600 to-purple-600 text-white border-0 px-10 py-4 text-lg font-bold shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl"
                  >
                    إعادة التحليل
                  </Button>
                  <div className="relative report-dropdown">
                    <Button
                      variant="secondary"
                      onClick={() => setShowReportMenu(!showReportMenu)}
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-0 px-10 py-4 text-lg font-bold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-3 rounded-xl"
                    >
                      تقرير تفصيلي
                      <ChevronDown className={`h-5 w-5 transition-transform ${showReportMenu ? 'rotate-180' : ''}`} />
                    </Button>
                    
                    {showReportMenu && (
                      <div className="absolute top-full left-0 mt-3 bg-white/95 dark:bg-gray-800/95 rounded-xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 z-50 min-w-[220px] backdrop-blur-md">
                        <button
                          onClick={() => {
                            handleGenerateReport('daily');
                            setShowReportMenu(false);
                          }}
                          className="w-full text-right px-6 py-4 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 dark:hover:from-blue-900/20 dark:hover:to-indigo-900/20 transition-all duration-200 text-gray-800 dark:text-gray-200 rounded-t-xl font-medium"
                        >
                          تقرير يومي
                        </button>
                        <button
                          onClick={() => {
                            handleGenerateReport('weekly');
                            setShowReportMenu(false);
                          }}
                          className="w-full text-right px-6 py-4 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 dark:hover:from-blue-900/20 dark:hover:to-indigo-900/20 transition-all duration-200 text-gray-800 dark:text-gray-200 font-medium"
                        >
                          تقرير أسبوعي
                        </button>
                        <button
                          onClick={() => {
                            handleGenerateReport('monthly');
                            setShowReportMenu(false);
                          }}
                          className="w-full text-right px-6 py-4 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 dark:hover:from-blue-900/20 dark:hover:to-indigo-900/20 transition-all duration-200 text-gray-800 dark:text-gray-200 font-medium"
                        >
                          تقرير شهري
                        </button>
                        <button
                          onClick={() => {
                            handleGenerateReport('yearly');
                            setShowReportMenu(false);
                          }}
                          className="w-full text-right px-6 py-4 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 dark:hover:from-blue-900/20 dark:hover:to-indigo-900/20 transition-all duration-200 text-gray-800 dark:text-gray-200 rounded-b-xl font-medium"
                        >
                          تقرير سنوي
                        </button>
                      </div>
                    )}
                  </div>
                  <Button
                    variant="secondary"
                    onClick={exportSecurityLogs}
                    className="bg-gradient-to-r from-green-600 to-emerald-600 text-white border-0 px-10 py-4 text-lg font-bold shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl"
                  >
                    تصدير البيانات
                  </Button>
                </div>
              </>
            )}

            {/* حالة عدم وجود بيانات */}
            {!isAnalyzing && !aiAnalysis && (
              <Card className="bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-800/50 dark:to-slate-800/60 border-gray-200 dark:border-gray-700 backdrop-blur-sm">
                <div className="text-center py-16">
                  <div className="w-24 h-24 bg-gradient-to-br from-gray-400 to-slate-500 rounded-full mx-auto mb-6 flex items-center justify-center shadow-lg">
                    <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm"></div>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-700 dark:text-gray-300 mb-4">
                    لا توجد بيانات للتحليل
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto leading-relaxed">
                    يتطلب التحليل الذكي وجود جلسات نشطة أو سجلات أمان لإجراء التحليل
                  </p>
                  <Button
                    variant="primary"
                    onClick={updateData}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-0 px-8 py-3 font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    تحديث البيانات
                  </Button>
                </div>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SessionSecurityPage;
