import React, { useEffect, useMemo, useRef, useState } from 'react';
import SecurityStatusPanel from '../components/SecurityStatusPanel';
import SecurityStatusFlowchart from '../components/SecurityStatusFlowchart';
import { getCsrfToken, CSRF_HEADER } from '../utils/apiClient';
import { auditLogger } from '../utils/auditLogger';

// Helper: SHA-256 hex
async function sha256Hex(text: string): Promise<string> {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

const ObservabilityPage: React.FC = () => {
  // ===== Render instrumentation (post-render effect to avoid state during render) =====
  const renderEventsKey = 'render_events_observability';
  const renderSeqRef = useRef<number>(0);
  const lastRenderTimeRef = useRef<number | null>(null);
  const [renderStats, setRenderStats] = useState<{ count: number; lastMs: number | null; avgDt: number | null; recent: any[] }>({ count: 0, lastMs: null, avgDt: null, recent: [] });
  const pendingRenderRef = useRef<boolean>(false);
  // Mark that a render occurred; we'll flush once per animation frame
  pendingRenderRef.current = true;
  useEffect(() => {
    // Use rAF to batch multiple quick renders
    let frame: number;
    const flush = () => {
      if (!pendingRenderRef.current) return; // nothing to log
      pendingRenderRef.current = false;
      try {
        const now = performance.now();
        const seq = ++renderSeqRef.current;
        const prev = lastRenderTimeRef.current;
        const dt = prev != null ? now - prev : null;
        lastRenderTimeRef.current = now;
        let arr: any[] = [];
        try {
          const raw = localStorage.getItem(renderEventsKey);
          if (raw) { arr = JSON.parse(raw); if (!Array.isArray(arr)) arr = []; }
        } catch { arr = []; }
        arr.push({ t: Date.now(), seq, dt: dt != null ? Number(dt.toFixed(1)) : null });
        while (arr.length > 100) arr.shift();
        try { localStorage.setItem(renderEventsKey, JSON.stringify(arr)); } catch {}
        const count = arr.length;
        const lastMs = arr[arr.length - 1]?.dt ?? null;
        const intervals = arr.map(e => e.dt).filter((v: any) => typeof v === 'number');
        const avgDt = intervals.length ? Number((intervals.reduce((a: number, b: number) => a + b, 0) / intervals.length).toFixed(1)) : null;
        setRenderStats({ count, lastMs, avgDt, recent: arr.slice(-10).reverse() });
        if (typeof window !== 'undefined') {
          (window as any).debugRenderEvents = () => JSON.parse(localStorage.getItem(renderEventsKey) || '[]');
          (window as any).clearRenderEvents = () => { localStorage.removeItem(renderEventsKey); console.info('Render events cleared'); setRenderStats({ count:0, lastMs:null, avgDt:null, recent: []}); };
        }
      } catch {/* ignore */}
    };
    frame = requestAnimationFrame(flush);
    return () => cancelAnimationFrame(frame);
  });
  const [showRenderDiag, setShowRenderDiag] = useState<boolean>(() => (localStorage.getItem('render_diag_visible') || 'false') === 'true');
  useEffect(() => { try { localStorage.setItem('render_diag_visible', String(showRenderDiag)); } catch {} }, [showRenderDiag]);

  const [unlocked, setUnlocked] = useState(false);
  const [pwd, setPwd] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<null | {status: string; score: number; summary: string; details: string; recommendations: string[]}>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [errors, setErrors] = useState<any[]>([]);
  const [errorStats, setErrorStats] = useState<{totalErrors:number; totalCount:number; top:any[]} | null>(null);
  const [loadingErrors, setLoadingErrors] = useState(false);
  const [grafanaUp, setGrafanaUp] = useState<boolean | null>(null);
  const [promUp, setPromUp] = useState<boolean | null>(null);
  // Analytics Dashboard (server-provided aggregates)
  const [dash, setDash] = useState<null | {
    ok: boolean;
    minutes: number;
    series: Array<{ minuteTs: number; total: number }>;
    topRoutes: Array<{ route: string; count: number }>;
    anomalies: Array<{ minuteTs: number; count: number; mean: number; std: number; z: number; routesTop?: Array<[string, number]> }>;
    outOfHoursTop: Array<{ hour: number; count: number }>;
    usersTop: Array<{ id: string; count: number }>;
    generatedAt?: string;
  }>(null);
  const [dashLoading, setDashLoading] = useState(false);
  const [dashError, setDashError] = useState<string | null>(null);
  const [dashAuto, setDashAuto] = useState<boolean>(() => (localStorage.getItem('obs_dash_auto') || 'false') === 'true');
  const [dashMs, setDashMs] = useState<number>(() => {
    const v = Number(localStorage.getItem('obs_dash_ms')); return !isNaN(v) && v >= 5000 ? v : 30000;
  });
  const dashTimerRef = useRef<number | null>(null);
  // Live metrics state
  const [metrics, setMetrics] = useState<null | {
    time: string;
    uptimeSec: number;
    totalRequests: number;
    byStatus: { ['2xx']: number; ['3xx']: number; ['4xx']: number; ['5xx']: number; other: number };
    routesTop: { route: string; count: number }[];
    ipsTop?: { ip: string; count: number; lastSeen?: number }[];
    latency: { avgMs: number | null; p50Ms: number | null; p95Ms: number | null; p99Ms: number | null };
  }>(null);
  const [rps, setRps] = useState<number | null>(null);
  const [errRate, setErrRate] = useState<number | null>(null);
  const [spark, setSpark] = useState<number[]>([]);
  const [sparkErr, setSparkErr] = useState<number[]>([]);
  const lastSampleRef = useRef<{ t: number; total: number; errs: number } | null>(null);
  const pollRef = useRef<number | null>(null);
  const [windowSec, setWindowSec] = useState<number>(() => Number(localStorage.getItem('obs_windowSec') || 60));
  const [routeFilter, setRouteFilter] = useState<string>('');
  const [paused, setPaused] = useState<boolean>(() => (localStorage.getItem('obs_paused') || 'false') === 'true');
  // زيادة القيمة الافتراضية لتقليل الإحساس بالتحديث المتكرر (من 2000ms إلى 5000ms)
  const [pollMs, setPollMs] = useState<number>(() => {
    const stored = Number(localStorage.getItem('obs_pollMs'));
    if (!isNaN(stored) && stored > 0) return stored;
    return 5000; // افتراضي جديد
  });
  const [allowlist, setAllowlist] = useState<string[]>([]);
  const [allowlistSaving, setAllowlistSaving] = useState(false);
  const [testRouteMode, setTestRouteMode] = useState(false);
  const [testRoute, setTestRoute] = useState('');
  const [testRouteResult, setTestRouteResult] = useState<any | null>(null);
  // IP tracking state
  const [ipFilter, setIpFilter] = useState('');
  const [testIpMode, setTestIpMode] = useState(false);
  const [testIp, setTestIp] = useState('');
  const [testIpResult, setTestIpResult] = useState<any | null>(null);
  const [ipAllowlist, setIpAllowlist] = useState<string[]>([]);
  const [ipAllowlistSaving, setIpAllowlistSaving] = useState(false);

  // ===== Audit log viewer state & deep-link focus =====
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditFilter, setAuditFilter] = useState('');
  const [onlySecurity, setOnlySecurity] = useState(false);
  const [focusAuditId, setFocusAuditId] = useState<string | null>(null);
  const [auditLoadedAt, setAuditLoadedAt] = useState<number>(0);

  const refreshAuditLogs = () => {
    try {
      const logs = auditLogger.getAllLogs(500);
      setAuditLogs(logs);
      setAuditLoadedAt(Date.now());
    } catch { setAuditLogs([]); }
  };

  // Auto-scroll to focused audit row when auditId exists
  useEffect(() => {
    if (!focusAuditId) return;
    // Wait a tick to ensure DOM rendered
    const id = window.setTimeout(() => {
      try {
        const el = (document.getElementById(`audit-${focusAuditId}`) || document.querySelector(`[data-audit-id="${focusAuditId}"]`)) as HTMLElement | null;
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('ring-2','ring-amber-500');
          setTimeout(() => { try { el.classList.remove('ring-2','ring-amber-500'); } catch {} }, 2500);
        }
      } catch {}
    }, 150);
    return () => window.clearTimeout(id);
  }, [focusAuditId, auditLogs]);

  const parseAuditIdFromHash = () => {
    try {
      const hash = window.location.hash || '';
      const idx = hash.indexOf('?');
      if (idx === -1) { setFocusAuditId(null); return; }
      const qs = new URLSearchParams(hash.slice(idx + 1));
      const id = qs.get('auditId');
      setFocusAuditId(id);
    } catch { setFocusAuditId(null); }
  };

  // CSP violations viewer state
  const [cspItems, setCspItems] = useState<any[]>([]);
  const [cspLoading, setCspLoading] = useState(false);
  const [cspLimit, setCspLimit] = useState<number>(100);
  const [cspDirectiveFilter, setCspDirectiveFilter] = useState<string>('');
  const [cspDomainFilter, setCspDomainFilter] = useState<string>('');

  const getHost = (url?: string) => {
    if (!url) return '';
    try {
      // Support data:, blob: and relative paths: return empty host for those
      if (/^(data:|blob:)/i.test(url)) return '';
      const u = new URL(url, window.location.origin);
      return u.host.toLowerCase();
    } catch {
      return '';
    }
  };

  const filteredCspItems = useMemo(() => {
    const dir = cspDirectiveFilter.trim().toLowerCase();
    const dom = cspDomainFilter.trim().toLowerCase();
    return cspItems.filter((it) => {
      const vdir = String(it['violated-directive'] || it['effective-directive'] || '').toLowerCase();
      if (dir && !vdir.includes(dir)) return false;
      if (dom) {
        const blocked = getHost(it['blocked-uri']);
        const documentHost = getHost(it['document-uri']);
        if (!blocked.includes(dom) && !documentHost.includes(dom)) return false;
      }
      return true;
    });
  }, [cspItems, cspDirectiveFilter, cspDomainFilter]);

  const exportCspJson = () => {
    const data = JSON.stringify(filteredCspItems, null, 2);
    const blob = new Blob([data], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `csp-violations-${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCspCsv = () => {
    const rows = [
      ['time','violated-directive','effective-directive','blocked-uri','document-uri','source-file','line-number','status-code']
    ];
    for (const it of filteredCspItems) {
      rows.push([
        new Date(it.at).toISOString(),
        String(it['violated-directive'] ?? ''),
        String(it['effective-directive'] ?? ''),
        String(it['blocked-uri'] ?? ''),
        String(it['document-uri'] ?? ''),
        String(it['source-file'] ?? ''),
        it['line-number'] != null ? String(it['line-number']) : '',
        it['status-code'] != null ? String(it['status-code']) : ''
      ]);
    }
    const esc = (v: string) => '"' + v.replace(/"/g,'""') + '"';
    const csv = rows.map(r => r.map(esc).join(',')).join('\n');
    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8' }); // BOM for Excel
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `csp-violations-${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // API and Metrics keys (for protected backend endpoints)
  const [apiKey, setApiKey] = useState<string>(() => {
    try { return localStorage.getItem('obs_api_key') || ''; } catch { return ''; }
  });
  const [metricsKey, setMetricsKey] = useState<string>(() => {
    try { return localStorage.getItem('obs_metrics_key') || ''; } catch { return ''; }
  });

  // إعداد جديد: تعطيل أزرار إعادة التحميل الإدارية عالمياً
  const [disableReloadAdmin, setDisableReloadAdmin] = useState<boolean>(() => {
    try { return (localStorage.getItem('admin_disable_reload_actions') || 'false') === 'true'; } catch { return false; }
  });

  function toggleDisableReloadAdmin(v: boolean) {
    try {
      localStorage.setItem('admin_disable_reload_actions', String(v));
      setDisableReloadAdmin(v);
      // بث حدث مخصص ليتمكن Header من التحديث فوراً (storage لا يُطلق داخل نفس التبويب)
      try { window.dispatchEvent(new Event('adminReloadSettingsChanged')); } catch {}
    } catch {
      alert('تعذر حفظ الإعداد');
    }
  }

  const getApiKey = () => {
    try { return (localStorage.getItem('obs_api_key') || '').trim() || null; } catch { return null; }
  };
  const getMetricsKey = () => {
    try {
      const m = (localStorage.getItem('obs_metrics_key') || '').trim();
      if (m) return m;
      const a = (localStorage.getItem('obs_api_key') || '').trim();
      return a || null;
    } catch { return null; }
  };

  function saveKeys() {
    try {
      localStorage.setItem('obs_api_key', (apiKey || '').trim());
      localStorage.setItem('obs_metrics_key', (metricsKey || '').trim());
      alert('تم حفظ مفاتيح الواجهة الخلفية بنجاح.');
    } catch {
      alert('تعذر حفظ المفاتيح');
    }
  }

  const hasPassword = useMemo(() => !!localStorage.getItem('observabilityPasswordHash'), []);

  useEffect(() => {
    // Auto-unlock if no password configured or if session is already unlocked
    const configured = localStorage.getItem('observabilityPasswordHash');
    if (!configured) {
      setUnlocked(true);
      return;
    }
    const sessionOk = sessionStorage.getItem('observabilitySessionOk') === 'true';
    if (sessionOk) setUnlocked(true);
  }, []);

  // Load errors when unlocked
  useEffect(() => {
    if (unlocked) {
      refreshErrors().catch(()=>{});
      refreshLinksStatus().catch(()=>{});
      startMetricsPolling();
      loadAllowlist().catch(()=>{});
      loadIpAllowlist().catch(()=>{});
      refreshCspViolations().catch(()=>{});
      // Load audit logs and parse focus audit id
      refreshAuditLogs();
      parseAuditIdFromHash();
      const onHash = () => parseAuditIdFromHash();
      window.addEventListener('hashchange', onHash);
      // Keep audit logs in sync if storage changes (from other tabs) or periodically
      const storageListener = (e: StorageEvent) => { if (e.key === 'rbacAuditLogs') refreshAuditLogs(); };
      window.addEventListener('storage', storageListener);
      const pollId = window.setInterval(refreshAuditLogs, 10000);
      return () => {
        window.removeEventListener('hashchange', onHash);
        window.removeEventListener('storage', storageListener);
        window.clearInterval(pollId);
      };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlocked]);

  async function unlock(e: React.FormEvent) {
    e.preventDefault();
    try {
      const configured = localStorage.getItem('observabilityPasswordHash');
      if (!configured) {
        setUnlocked(true);
        return;
      }
      const hex = await sha256Hex(pwd);
      if (hex === configured) {
        sessionStorage.setItem('observabilitySessionOk', 'true');
        setUnlocked(true);
        setMsg(null);
      } else {
        setMsg('كلمة المرور غير صحيحة');
      }
    } catch (err: any) {
      setMsg(`حدث خطأ: ${err?.message || err}`);
    }
  }

  function lock() {
    sessionStorage.removeItem('observabilitySessionOk');
    setUnlocked(false);
  }

  const [traceEnabled, setTraceEnabled] = useState<boolean>(() => (localStorage.getItem('VITE_TRACING_ENABLED') || 'false') === 'true');
  const [uxEnabled, setUxEnabled] = useState<boolean>(() => (localStorage.getItem('VITE_UX_ENABLED') || 'false') === 'true');
  const [lastRequestId, setLastRequestId] = useState<string | null>(null);

  function applyObservabilityToggles() {
    try {
      localStorage.setItem('VITE_TRACING_ENABLED', String(traceEnabled));
      localStorage.setItem('VITE_UX_ENABLED', String(uxEnabled));
      alert('تم الحفظ. يرجى إعادة تحميل الصفحة لتطبيق الإعدادات.');
    } catch {
      alert('تعذر حفظ الإعدادات');
    }
  }

  async function pingTraceId() {
    try {
      const r = await fetch('/api/trace-id');
      const j = await r.json();
      setLastRequestId(j.request_id || null);
    } catch {
      setLastRequestId(null);
    }
  }

  async function sendDemoTrace() {
    const tryFetch = async (url: string) => {
      try { return await fetch(url, { method: 'GET' }); } catch { return null as any; }
    };
    let r = await tryFetch('/api/demo-trace');
    if (r && r.ok) {
      const j = await r.json();
      alert(`تم تنفيذ طلب تجريبي خلال ${j.ms}ms`);
      return;
    }
    const directUrl = 'http://localhost:4000/api/demo-trace';
    const r2 = await tryFetch(directUrl);
    if (r2 && r2.ok) {
      const j = await r2.json();
      alert(`تم تنفيذ طلب تجريبي خلال ${j.ms}ms (عبر ${directUrl})`);
      return;
    }
    const body1 = r ? await r.text().catch(() => '') : '';
    const body2 = r2 ? await r2.text().catch(() => '') : '';
    alert(
      `فشل الطلب التجريبي\n` +
      `Proxy: ${r ? r.status + ' ' + r.statusText : 'no-response'}\n` +
      (body1 ? `${body1}\n` : '') +
      `Direct 4000: ${r2 ? r2.status + ' ' + r2.statusText : 'no-response'}\n` +
      (body2 ? `${body2}\n` : '') +
      `ملاحظة: تأكد أن الخلفية تعمل على 4000 (npm run server) وأن المنفذ غير مشغول.`
    );
  }

  async function testApiHealth() {
    const tryTxt = async (url: string) => {
      try { const r = await fetch(url); const txt = await r.text(); return { r, txt } as const; } catch { return null; }
    };
    const viaProxy = await tryTxt('/api/health');
    if (viaProxy?.r) {
      alert(`/api/health → ${viaProxy.r.status} ${viaProxy.r.statusText}\n${viaProxy.txt}`);
      if (viaProxy.r.ok) return;
    }
    const direct = await tryTxt('http://localhost:4000/api/health');
    if (direct?.r) {
      alert(`http://localhost:4000/api/health → ${direct.r.status} ${direct.r.statusText}\n${direct.txt}`);
      return;
    }
    alert('تعذر الوصول إلى /api/health عبر الوكيل أو مباشرة. يرجى التأكد من تشغيل الخادم: npm run server');
  }

  async function refreshErrors() {
    setLoadingErrors(true);
    setMsg(null);
    try {
      const tryJson = async <T,>(urls: string[]): Promise<T | null> => {
        for (const u of urls) {
          try {
            const r = await fetch(u);
            if (r.ok) return await r.json();
          } catch {}
        }
        return null;
      };

      const stats = await tryJson<any>([
        'http://localhost:4000/api/errors-stats',
        '/api/errors-stats'
      ]);
      if (stats) {
        setErrorStats({ totalErrors: stats.totalErrors || 0, totalCount: stats.totalCount || 0, top: stats.top || [] });
      }

      const items = await tryJson<any>([
        'http://localhost:4000/api/errors',
        '/api/errors'
      ]);
      if (items) {
        setErrors(items.items || []);
      }
    } catch (e:any) {
      setMsg(`تعذر جلب الأخطاء: ${e?.message || e}`);
    } finally {
      setLoadingErrors(false);
    }
  }

  async function triggerDemoError() {
    try {
      const r = await fetch('/api/demo-error');
      const txt = await r.text();
      // Expected to be error JSON; ignore body, just refresh
      await refreshErrors();
      alert(`تم توليد خطأ تجريبي. الاستجابة: ${txt.slice(0,200)}`);
    } catch (e:any) {
      alert(`تعذر توليد الخطأ: ${e?.message || e}`);
    }
  }

  async function resolveError(id: string) {
    try {
      const hk = getApiKey();
      const csrf = getCsrfToken();
      const headers: Record<string,string> = {};
      if (hk) headers['x-api-key'] = hk;
      if (csrf) headers[CSRF_HEADER] = csrf;
      const r = await fetch(`/api/errors/${id}/resolve`, { method: 'POST', headers });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      await refreshErrors();
    } catch (e:any) {
      alert(`تعذر التعليم كمحلول: ${e?.message || e}`);
    }
  }

  // Reachability checks for Grafana/Prometheus without CORS
  async function checkReachable(url: string, timeoutMs = 2500): Promise<boolean> {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      await fetch(url, { mode: 'no-cors', signal: ctrl.signal });
      clearTimeout(t);
      return true;
    } catch {
      clearTimeout(t);
      try {
        const ok = await new Promise<boolean>((resolve) => {
          const img = new Image();
          const done = (v: boolean) => { try { img.onload = null as any; img.onerror = null as any; } catch {} ; resolve(v); };
          img.onload = () => done(true);
          img.onerror = () => done(false);
          img.src = (url.replace(/\/$/, '')) + '/favicon.ico?_=' + Date.now();
          setTimeout(() => done(false), timeoutMs);
        });
        return ok;
      } catch { return false; }
    }
  }

  async function refreshLinksStatus() {
    try {
      const [g, p] = await Promise.all([
        checkReachable('http://localhost:3001/'),
        checkReachable('http://localhost:9090/')
      ]);
      setGrafanaUp(g);
      setPromUp(p);
    } catch {
      setGrafanaUp(false);
      setPromUp(false);
    }
  }

  async function tryJson<T>(urls: string[]): Promise<T | null> {
    for (const u of urls) {
      try { const r = await fetch(u); if (r.ok) return await r.json(); } catch {}
    }
    return null;
  }

  // Fetch server analytics dashboard (with proxy and localhost fallbacks)
  async function refreshAnalytics() {
    setDashLoading(true);
    setDashError(null);
    try {
      const data = await tryJson<any>([
        '/api/analytics/dashboard',
        'http://localhost:4000/api/analytics/dashboard'
      ]);
      if (data?.ok) setDash(data);
      else setDashError('تعذر جلب لوحة التحليلات');
    } catch (e: any) {
      setDashError(e?.message || String(e));
    } finally {
      setDashLoading(false);
    }
  }

  // Auto-refresh lifecycle
  useEffect(() => {
    if (!dashAuto) return;
    // immediate fetch then schedule
    refreshAnalytics().catch(()=>{});
    dashTimerRef.current && window.clearInterval(dashTimerRef.current);
    dashTimerRef.current = window.setInterval(() => {
      refreshAnalytics().catch(()=>{});
    }, dashMs);
    return () => { if (dashTimerRef.current) window.clearInterval(dashTimerRef.current); dashTimerRef.current = null; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashAuto, dashMs]);

  // Persist dash settings
  useEffect(() => { try { localStorage.setItem('obs_dash_auto', String(dashAuto)); } catch {} }, [dashAuto]);
  useEffect(() => { try { localStorage.setItem('obs_dash_ms', String(dashMs)); } catch {} }, [dashMs]);

  async function loadAllowlist() {
    const data = await tryJson<{ok:boolean; allowlist:string[]}>([
      'http://localhost:4000/api/route-allowlist',
      '/api/route-allowlist'
    ]);
    if (data?.ok && Array.isArray(data.allowlist)) setAllowlist(data.allowlist);
  }

  async function loadIpAllowlist() {
    const urls = [ 'http://localhost:4000/api/ip-allowlist', '/api/ip-allowlist' ];
    let data: {ok:boolean; allowlist:string[]} | null = null;
    const hk = getMetricsKey();
    for (const u of urls) {
      try {
        const r = await fetch(u, { headers: hk ? { 'x-api-key': hk } : undefined });
        if (r.ok) { data = await r.json(); break; }
      } catch {}
    }
    if (data?.ok && Array.isArray(data.allowlist)) setIpAllowlist(data.allowlist);
  }

  async function saveAllowlistServer() {
    setAllowlistSaving(true);
    try {
      const urls = [ 'http://localhost:4000/api/route-allowlist', '/api/route-allowlist' ];
      for (const u of urls) {
        try {
          const hk = getApiKey();
          const headers: Record<string,string> = { 'Content-Type': 'application/json' };
          if (hk) headers['x-api-key'] = hk;
          const csrf = getCsrfToken();
          if (csrf) headers[CSRF_HEADER] = csrf;
          const r = await fetch(u, { method: 'POST', headers, body: JSON.stringify({ allowlist }) });
          if (r.ok) { await r.json().catch(()=>null); break; }
        } catch {}
      }
      alert('تم حفظ قائمة المسارات المسموح بها.');
    } catch (e:any) {
      alert(`تعذر حفظ القائمة: ${e?.message || e}`);
    } finally { setAllowlistSaving(false); }
  }

  async function saveIpAllowlistServer() {
    setIpAllowlistSaving(true);
    try {
      const urls = [ 'http://localhost:4000/api/ip-allowlist', '/api/ip-allowlist' ];
      for (const u of urls) {
        try {
          const hk = getApiKey();
          const headers: Record<string,string> = { 'Content-Type': 'application/json' };
          if (hk) headers['x-api-key'] = hk;
          const csrf = getCsrfToken();
          if (csrf) headers[CSRF_HEADER] = csrf;
          const r = await fetch(u, { method: 'POST', headers, body: JSON.stringify({ allowlist: ipAllowlist }) });
          if (r.ok) { await r.json().catch(()=>null); break; }
        } catch {}
      }
      alert('تم حفظ قائمة عناوين IP المسموح بها.');
    } catch (e:any) {
      alert(`تعذر حفظ القائمة: ${e?.message || e}`);
    } finally { setIpAllowlistSaving(false); }
  }

  async function refreshCspViolations() {
    setCspLoading(true);
    try {
      const urls = [ `/api/csp-violations?limit=${cspLimit}`, `http://localhost:4000/api/csp-violations?limit=${cspLimit}` ];
      let data: any = null;
      const hk = getMetricsKey();
      for (const u of urls) {
        try {
          const r = await fetch(u, { headers: hk ? { 'x-api-key': hk } : undefined });
          if (r.ok) { data = await r.json(); break; }
        } catch {}
      }
      if (data?.ok && Array.isArray(data.items)) setCspItems(data.items);
      else setCspItems([]);
    } catch { setCspItems([]); }
    finally { setCspLoading(false); }
  }

  async function runTestRoute() {
    setTestRouteResult(null);
    const q = encodeURIComponent(testRoute.trim());
    if (!q) return;
    const urls = [
      `http://localhost:4000/api/metrics-summary?route=${q}`,
      `/api/metrics-summary?route=${q}`
    ];
    let data: any = null;
    const hk = getMetricsKey();
    for (const u of urls) {
      try {
        const r = await fetch(u, { headers: hk ? { 'x-api-key': hk } : undefined });
        if (r.ok) { data = await r.json(); break; }
      } catch {}
    }
    if (data?.routeLatency) setTestRouteResult(data.routeLatency);
    else setTestRouteResult({ error: 'لا توجد بيانات كافية أو أن المسار غير موجود في المقاييس بعد.' });
  }

  async function runTestIp() {
    setTestIpResult(null);
    const q = testIp.trim();
    if (!q) return;
    const urls = [
      `http://localhost:4000/api/ip-stats?ip=${encodeURIComponent(q)}`,
      `/api/ip-stats?ip=${encodeURIComponent(q)}`
    ];
    let data: any = null;
    const hk = getMetricsKey();
    for (const u of urls) {
      try {
        const r = await fetch(u, { headers: hk ? { 'x-api-key': hk } : undefined });
        if (r.ok) { data = await r.json(); break; }
      } catch {}
    }
    if (data?.item) setTestIpResult(data.item);
    else setTestIpResult({ error: 'لا توجد بيانات كافية لهذا العنوان.' });
  }

  // ---- Live Metrics Polling ----
  function stopMetricsPolling() {
    if (pollRef.current) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  async function fetchMetricsSummary() {
    const urls = [
      'http://localhost:4000/api/metrics-summary',
      '/api/metrics-summary'
    ];
    for (const u of urls) {
      try {
        const hk = getMetricsKey();
        const r = await fetch(u, { headers: hk ? { 'x-api-key': hk } : undefined });
        if (r.ok) return await r.json();
      } catch {}
    }
    return null;
  }

  function pushSparkline(arr: number[], val: number, limit = 60) {
    const next = arr.concat([Number.isFinite(val) ? val : 0]);
    while (next.length > limit) next.shift();
    return next;
  }

  async function pollOnce() {
    if (paused) return;
    const data = await fetchMetricsSummary();
    if (!data?.ok) return;
    setMetrics(data);
    const t = Date.now();
    const total = Number(data.totalRequests) || 0;
    const errs = Number((data.byStatus?.['4xx'] || 0) + (data.byStatus?.['5xx'] || 0));
    if (lastSampleRef.current) {
      const dt = Math.max(1, (t - lastSampleRef.current.t) / 1000);
      const dReq = Math.max(0, total - lastSampleRef.current.total);
      const dErr = Math.max(0, errs - lastSampleRef.current.errs);
      const curRps = dReq / dt;
      const curErrRate = dReq > 0 ? (dErr / dReq) * 100 : 0;
      setRps(curRps);
      setErrRate(curErrRate);
      const limit = Math.max(1, Math.round(windowSec * 1000 / pollMs));
      setSpark(prev => pushSparkline(prev, curRps, limit));
      setSparkErr(prev => pushSparkline(prev, curErrRate, limit));
    }
    lastSampleRef.current = { t, total, errs };
  }

  function startMetricsPolling() {
    stopMetricsPolling();
    // Prime one fetch immediately
    pollOnce();
    pollRef.current = window.setInterval(pollOnce, pollMs);
  }

  useEffect(() => {
    return () => stopMetricsPolling();
  }, []);

  // Persist controls
  useEffect(() => { try { localStorage.setItem('obs_windowSec', String(windowSec)); } catch {} }, [windowSec]);
  useEffect(() => { try { localStorage.setItem('obs_paused', String(paused)); } catch {} }, [paused]);
  useEffect(() => {
    try { localStorage.setItem('obs_pollMs', String(pollMs)); } catch {}
    // restart the interval when pollMs changes
    if (unlocked) startMetricsPolling();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pollMs]);

  if (!unlocked) {
    return (
      <div className="container mx-auto px-4 py-10">
        <div className="max-w-md mx-auto bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6" dir="rtl">
          <h1 className="text-xl font-bold mb-4">مراقبة وتتبع (Observability)</h1>
          {hasPassword ? (
            <form onSubmit={unlock} className="space-y-3">
              <label className="block text-sm">أدخل كلمة المرور
                <input type="password" className="mt-1 w-full p-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-800" value={pwd} onChange={e=>setPwd(e.target.value)} />
              </label>
              {msg && <div className="text-sm text-red-600 dark:text-red-400">{msg}</div>}
              <button type="submit" className="px-4 py-2 rounded bg-blue-600 text-white text-sm hover:bg-blue-700">دخول</button>
            </form>
          ) : (
            <div className="text-sm text-gray-700 dark:text-gray-300">لا توجد كلمة مرور مضبوطة لهذه الصفحة. تم الفتح تلقائياً.</div>
          )}
        </div>
      </div>
    );
  }

  const runSmartAnalysis = async () => {
    setMsg(null);
    setAnalyzing(true);
    setAnalysis(null);
    try {
      // Probe health via proxy then direct
      let healthOk = false;
      try {
        const r = await fetch('/api/health');
        healthOk = r.ok;
      } catch {}
      if (!healthOk) {
        try {
          const r2 = await fetch('http://localhost:4000/api/health');
          healthOk = r2.ok;
        } catch {}
      }

      // Read last request id if any
      let lastRequestId: string | undefined = undefined;
      try {
        const r = await fetch('/api/trace-id');
        if (r.ok) {
          const j = await r.json();
          lastRequestId = j?.request_id;
        }
      } catch {}

      // Get OTEL backend env info
      let otelInfo: any = undefined;
      try {
        const r = await fetch('/api/otel-info');
        if (r.ok) otelInfo = await r.json();
      } catch {}

      // Prepare frontend flags snapshot
      const tracingEnabled = (localStorage.getItem('VITE_TRACING_ENABLED') || 'false') === 'true';
      const viteOtlpHttpUrl = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_OTLP_HTTP_URL) || '/otel/v1/traces';

      const payload = {
        frontend: { tracingEnabled, viteOtlpHttpUrl },
        probes: { healthOk },
        lastRequestId,
        otelInfo,
      };

      const csrf = getCsrfToken();
      const headers: Record<string,string> = { 'Content-Type': 'application/json' };
      if (csrf) headers[CSRF_HEADER] = csrf;
      const resp = await fetch('/api/ai/observability', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      if (!resp.ok) throw new Error(`خطأ في التحليل: ${resp.status}`);
      const data = await resp.json();
      if (!data?.ok) throw new Error(data?.error || 'فشل التحليل');
      setAnalysis({ status: data.status, score: data.score, summary: data.summary, details: data.details, recommendations: data.recommendations || [] });
    } catch (e: any) {
      setMsg(`تعذر إجراء التحليل: ${e?.message || e}`);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8" dir="rtl">
      {/* Floating render diagnostics panel */}
      <div className="fixed bottom-4 left-4 z-50 text-[11px] font-mono select-none">
        <button
          onClick={()=>setShowRenderDiag(v=>!v)}
          className="px-2 py-1 rounded bg-gray-800 text-gray-100 shadow border border-gray-700 hover:bg-gray-700"
          title="عرض/إخفاء لوحة تتبع إعادة التصيير"
        >{showRenderDiag ? 'إخفاء الرصد' : 'إظهار الرصد'}</button>
        {showRenderDiag && (
          <div className="mt-2 w-72 max-h-72 overflow-auto p-2 rounded bg-gray-900/95 backdrop-blur border border-gray-700 shadow-lg space-y-1">
            <div className="flex items-center justify-between">
              <div className="font-bold text-emerald-300">Render Monitor</div>
              <button
                onClick={()=>{ try { localStorage.removeItem(renderEventsKey); setRenderStats({ count:0, lastMs:null, avgDt:null, recent: []}); } catch {} }}
                className="text-xs px-2 py-0.5 rounded bg-red-700/70 hover:bg-red-700 text-white"
              >مسح</button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-300">
              <div>العدد: <span className="text-white font-semibold">{renderStats.count}</span></div>
              <div>آخر Δms: <span className="text-white font-semibold">{renderStats.lastMs!=null?renderStats.lastMs:'—'}</span></div>
              <div>متوسط Δms: <span className="text-white font-semibold">{renderStats.avgDt!=null?renderStats.avgDt:'—'}</span></div>
              <div>أحداث حديثة: {renderStats.recent.length}</div>
            </div>
            <div className="mt-1 border-t border-gray-700 pt-1 space-y-0.5">
              {renderStats.recent.map(ev => (
                <div key={ev.seq} className="flex items-center justify-between text-[10px] text-gray-400">
                  <span className="text-gray-300">#{ev.seq}</span>
                  <span>{ev.dt!=null?ev.dt+'ms':'初'}</span>
                  <span className="opacity-60">{new Date(ev.t).toLocaleTimeString('ar-SY-u-nu-latn',{ hour12:false })}</span>
                </div>
              ))}
              {!renderStats.recent.length && <div className="text-[10px] text-gray-500">لا أحداث</div>}
            </div>
            <div className="mt-1 text-[10px] text-gray-500 leading-snug">
              يتم تسجيل كل إعادة تصيير للمكوّن. إن تضاعف العدد بسرعة دون إعادة تحميل فهذا يعني إعادة تصيير داخلية وليس إعادة تحميل المتصفح.
            </div>
          </div>
        )}
      </div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">مراقبة وتتبع النظام</h1>
        <div className="flex gap-2">
          <button onClick={()=>window.open('#/tools','_self')} className="px-3 py-2 rounded border border-gray-300 dark:border-gray-600 text-sm">رجوع للأدوات</button>
          <button onClick={()=>window.open('#/advanced-analytics','_self')} className="px-3 py-2 rounded border border-gray-300 dark:border-gray-600 text-sm">تحليلات متقدمة</button>
          <button onClick={lock} className="px-3 py-2 rounded border border-red-300 text-red-700 bg-red-50 hover:bg-red-100 dark:border-red-700 dark:text-red-300 dark:bg-red-900/30 text-sm">قفل الصفحة</button>
        </div>
      </div>

      <div className="space-y-4">
        {/* لوحة تحليلات الحركة (ملخص الخادم) */}
        <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="font-bold">لوحة تحليلات الحركة</h3>
              <div className="text-xs text-gray-500">ملخص مهيأ من الخادم: السلسلة الزمنية، الشذوذات، خارج الدوام، المستخدمون والمسارات الأكثر نشاطاً</div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <label className="flex items-center gap-1">
                <input type="checkbox" checked={dashAuto} onChange={(e)=>setDashAuto(e.target.checked)} />
                <span>تحديث تلقائي</span>
              </label>
              <select className="px-2 py-0.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800" value={dashMs} onChange={(e)=>setDashMs(Number(e.target.value))}>
                <option value={10000}>10s</option>
                <option value={30000}>30s</option>
                <option value={60000}>60s</option>
              </select>
              <button onClick={refreshAnalytics} disabled={dashLoading} className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600">{dashLoading?'جارٍ...':'تحديث'}</button>
            </div>
          </div>

          {dashError && (
            <div className="text-sm text-red-600 dark:text-red-400 mb-2">{dashError}</div>
          )}

          <div className="grid md:grid-cols-3 gap-4">
            {/* Series sparkline */}
            <div className="p-3 rounded border border-gray-200 dark:border-gray-800">
              <div className="text-xs text-gray-500">الحجم عبر الدقائق (آخر {dash?.minutes ?? '—'} دقيقة)</div>
              <Sparkline data={(dash?.series || []).map(s=>s.total)} color="#0ea5e9" />
              <div className="text-[11px] text-gray-500">آخر تحديث: {dash?.generatedAt ? new Date(dash.generatedAt).toLocaleString('ar-SY-u-nu-latn') : '—'}</div>
            </div>
            {/* Top routes */}
            <div className="p-3 rounded border border-gray-200 dark:border-gray-800">
              <div className="font-semibold mb-2">أكثر المسارات نشاطاً</div>
              <div className="space-y-1 text-sm max-h-40 overflow-auto">
                {(dash?.topRoutes || []).slice(0,8).map((r, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="font-mono truncate max-w-[70%]" title={r.route}>{r.route}</div>
                    <div className="text-gray-600 dark:text-gray-300">{r.count}</div>
                  </div>
                ))}
                {!dash?.topRoutes?.length && <div className="text-gray-500">—</div>}
              </div>
            </div>
            {/* Out of hours hot hours */}
            <div className="p-3 rounded border border-gray-200 dark:border-gray-800">
              <div className="font-semibold mb-2">نشاط خارج أوقات الدوام</div>
              <div className="space-y-1 text-sm max-h-40 overflow-auto">
                {(dash?.outOfHoursTop || []).slice(0,8).map((h,i)=> (
                  <div key={i} className="flex items-center justify-between">
                    <div>الساعة {h.hour.toString().padStart(2,'0')}:00</div>
                    <div className="text-gray-600 dark:text-gray-300">{h.count}</div>
                  </div>
                ))}
                {!dash?.outOfHoursTop?.length && <div className="text-gray-500">—</div>}
              </div>
            </div>
          </div>

          {/* Anomalies + Users */}
          <div className="grid md:grid-cols-2 gap-4 mt-4">
            <div className="p-3 rounded border border-gray-200 dark:border-gray-800">
              <div className="font-semibold mb-2">الشذوذات الأخيرة</div>
              <div className="space-y-1 text-sm max-h-48 overflow-auto">
                {(dash?.anomalies || []).slice(-8).reverse().map((a, i)=> (
                  <div key={i} className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs text-gray-500">{new Date(a.minuteTs).toLocaleString('ar-SY-u-nu-latn')}</div>
                      <div>العدد {a.count} — z={a.z.toFixed(2)} • μ={a.mean.toFixed(1)} σ={a.std.toFixed(1)}</div>
                      {!!a.routesTop?.length && (
                        <div className="text-[11px] text-gray-500">أبرز المسارات: {a.routesTop.map(([r,c])=>`${r}(${c})`).join('، ')}</div>
                      )}
                    </div>
                  </div>
                ))}
                {!dash?.anomalies?.length && <div className="text-gray-500">—</div>}
              </div>
            </div>
            <div className="p-3 rounded border border-gray-200 dark:border-gray-800">
              <div className="font-semibold mb-2">أكثر المستخدمين نشاطاً</div>
              <div className="space-y-1 text-sm max-h-48 overflow-auto">
                {(dash?.usersTop || []).slice(0,10).map((u,i)=> (
                  <div key={i} className="flex items-center justify-between">
                    <div className="font-mono truncate max-w-[70%]" title={u.id}>{u.id}</div>
                    <div className="text-gray-600 dark:text-gray-300">{u.count}</div>
                  </div>
                ))}
                {!dash?.usersTop?.length && <div className="text-gray-500">—</div>}
              </div>
            </div>
          </div>
        </div>
        {paused && (
          <div className="p-3 rounded border border-yellow-500/50 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 text-sm flex items-center justify-between">
            <div>الوضع متوقف مؤقتاً: تم إيقاف التحديثات الحية.</div>
            <div className="text-xs">ملاحظة: حالة الإيقاف والتكوينات تُحفَظ في المتصفح وتستمر بعد إعادة التحميل.</div>
          </div>
        )}
  {/* Live Summary Cards */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
            <div className="text-xs text-gray-500">معدل الطلبات</div>
            <div className="text-2xl font-bold">{rps !== null ? rps.toFixed(1) : '—'} <span className="text-sm font-normal">طلب/ثانية</span></div>
            <Sparkline data={spark} color="#16a34a" />
          </div>
          <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
            <div className="text-xs text-gray-500">معدل الأخطاء</div>
            <div className="flex items-end justify-between gap-2">
              <div className="text-2xl font-bold">{errRate !== null ? errRate.toFixed(1) : '—'} <span className="text-sm font-normal">%</span></div>
              <div className="text-xs text-gray-500">1m/5m نافذة</div>
            </div>
            <Sparkline data={sparkErr} color="#dc2626" showMinMax />
          </div>
          <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
            <div className="text-xs text-gray-500">زمن الاستجابة (p95)</div>
            <div className="text-2xl font-bold">{metrics?.latency?.p95Ms != null ? metrics.latency.p95Ms.toFixed(0) : '—'} <span className="text-sm font-normal">مللي ثانية</span></div>
            <div className="text-xs text-gray-500 mt-1">المتوسط: {metrics?.latency?.avgMs != null ? metrics.latency.avgMs.toFixed(0) : '—'}ms • p99: {metrics?.latency?.p99Ms != null ? metrics.latency.p99Ms.toFixed(0) : '—'}ms</div>
          </div>
        </div>

        {/* Window + Controls + Status distribution + Top routes */}
  <div className="grid md:grid-cols-2 gap-4">
          <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold">توزيع الحالات</div>
              <div className="text-xs flex items-center gap-1">
                <span>نافذة:</span>
                <select className="px-2 py-0.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800" value={windowSec} onChange={(e)=>setWindowSec(Number(e.target.value))}>
                  <option value={30}>30s</option>
                  <option value={60}>1m</option>
                  <option value={300}>5m</option>
                  <option value={600}>10m</option>
                </select>
                <span className="mx-1">|</span>
                <span>تواتر:</span>
                <select className="px-2 py-0.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800" value={pollMs} onChange={(e)=>setPollMs(Number(e.target.value))}>
                  <option value={1000}>1s</option>
                  <option value={2000}>2s</option>
                  <option value={5000}>5s</option>
                </select>
                <button className={`px-2 py-0.5 rounded ${paused?'bg-yellow-600 text-white':'border border-gray-300 dark:border-gray-600'}`} onClick={()=>setPaused(p=>!p)}>{paused?'استئناف':'إيقاف'}</button>
                <button className="px-2 py-0.5 rounded border border-gray-300 dark:border-gray-600" onClick={()=>{ setSpark([]); setSparkErr([]); setRps(null); setErrRate(null); lastSampleRef.current = null; }}>مسح</button>
              </div>
            </div>
            {/* Status small bars */}
            <StatusBars byStatus={metrics?.byStatus} />
          </div>
          <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
            <div className="font-semibold mb-2">أكثر المسارات استخداماً</div>
            <div className="mb-2">
              <input value={routeFilter} onChange={(e)=>setRouteFilter(e.target.value)} placeholder="تصفية حسب المسار" className="w-full text-sm p-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800" />
            </div>
            <div className="space-y-2 text-sm max-h-56 overflow-auto">
              {metrics?.routesTop?.length ? metrics.routesTop
                .filter(r => !routeFilter || r.route.toLowerCase().includes(routeFilter.toLowerCase()))
                .map((r, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="font-mono truncate max-w-[70%]" title={r.route}>{r.route}</div>
                  <div className="text-gray-600 dark:text-gray-300">{r.count}</div>
                </div>
              )) : <div className="text-gray-500">—</div>}
            </div>
            <div className="mt-3 border-t border-gray-200 dark:border-gray-800 pt-3">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={testRouteMode} onChange={(e)=>setTestRouteMode(e.target.checked)} />
                <span>تجربة مسار محدد وقراءة p95/p99</span>
              </label>
              {testRouteMode && (
                <div className="mt-2 space-y-2">
                  <input value={testRoute} onChange={(e)=>setTestRoute(e.target.value)} placeholder="/api/metrics-summary" className="w-full text-sm p-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800" />
                  <button onClick={runTestRoute} className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 text-sm">تشغيل الاختبار</button>
                  {testRouteResult && (
                    <div className="text-xs text-gray-700 dark:text-gray-300">
                      {testRouteResult.error ? (
                        <div className="text-red-600 dark:text-red-400">{testRouteResult.error}</div>
                      ) : (
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                          <div><div className="text-[11px] text-gray-500">count</div><div className="font-semibold">{testRouteResult.count}</div></div>
                          <div><div className="text-[11px] text-gray-500">avg</div><div className="font-semibold">{testRouteResult.avgMs!=null?testRouteResult.avgMs.toFixed(0):'—'} ms</div></div>
                          <div><div className="text-[11px] text-gray-500">p50</div><div className="font-semibold">{testRouteResult.p50Ms!=null?testRouteResult.p50Ms.toFixed(0):'—'} ms</div></div>
                          <div><div className="text-[11px] text-gray-500">p95</div><div className="font-semibold">{testRouteResult.p95Ms!=null?testRouteResult.p95Ms.toFixed(0):'—'} ms</div></div>
                          <div><div className="text-[11px] text-gray-500">p99</div><div className="font-semibold">{testRouteResult.p99Ms!=null?testRouteResult.p99Ms.toFixed(0):'—'} ms</div></div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Top IPs */}
        <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <div className="font-semibold mb-2">أكثر عناوين IP نشاطاً</div>
          <div className="mb-2">
            <input value={ipFilter} onChange={(e)=>setIpFilter(e.target.value)} placeholder="تصفية حسب IP" className="w-full text-sm p-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800" />
          </div>
          <div className="space-y-2 text-sm max-h-56 overflow-auto">
            {metrics?.ipsTop?.length ? metrics.ipsTop
              .filter((r:any) => !ipFilter || r.ip.toLowerCase().includes(ipFilter.toLowerCase()))
              .map((r:any, idx:number) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="font-mono truncate max-w-[70%]" title={r.ip}>{r.ip}</div>
                <div className="text-gray-600 dark:text-gray-300">{r.count}</div>
              </div>
            )) : <div className="text-gray-500">—</div>}
          </div>
          <div className="mt-3 border-t border-gray-200 dark:border-gray-800 pt-3">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={testIpMode} onChange={(e)=>setTestIpMode(e.target.checked)} />
              <span>عرض تفاصيل IP محدد</span>
            </label>
            {testIpMode && (
              <div className="mt-2 space-y-2">
                <input value={testIp} onChange={(e)=>setTestIp(e.target.value)} placeholder="127.0.0.1" className="w-full text-sm p-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800" />
                <button onClick={runTestIp} className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 text-sm">قراءة التفاصيل</button>
                {testIpResult && (
                  <div className="text-xs text-gray-700 dark:text-gray-300">
                    {testIpResult.error ? (
                      <div className="text-red-600 dark:text-red-400">{testIpResult.error}</div>
                    ) : (
                      <div className="space-y-1">
                        <div>الإجمالي: <span className="font-semibold">{testIpResult.total}</span> — آخر ظهور: {testIpResult.lastSeen? new Date(testIpResult.lastSeen).toLocaleString('ar-SY-u-nu-latn') : '—'}</div>
                        <div className="text-xs">توزيع الحالات:</div>
                        <StatusBars byStatus={testIpResult.byStatus} small />
                        <div className="text-xs mt-2">أكثر المسارات:</div>
                        <div className="space-y-1">
                          {testIpResult.routes?.map((r:any, i:number)=> (
                            <div key={i} className="flex items-center justify-between text-xs">
                              <div className="font-mono truncate max-w-[70%]" title={r.route}>{r.route}</div>
                              <div className="text-gray-600 dark:text-gray-300">{r.count}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

  {/* CSP Violations */}
        
        <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <div className="flex items-center justify-between mb-2 gap-3">
            <div className="flex items-center gap-2">
              <h3 className="font-bold">تقارير مخالفة CSP (الأحدث)</h3>
              <span className="text-xs text-gray-500">{filteredCspItems.length}/{cspItems.length}</span>
            </div>
            <div className="flex items-center gap-2 text-sm flex-wrap">
              <input
                type="text"
                placeholder="تصفية حسب التوجيه (مثال: script-src)"
                className="w-56 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                value={cspDirectiveFilter}
                onChange={(e)=>setCspDirectiveFilter(e.target.value)}
              />
              <input
                type="text"
                placeholder="تصفية حسب النطاق/الدومين"
                className="w-48 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
                value={cspDomainFilter}
                onChange={(e)=>setCspDomainFilter(e.target.value)}
              />
              <label className="flex items-center gap-1">
                <span>العدد</span>
                <input type="number" className="w-24 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800" min={10} max={500} value={cspLimit}
                  onChange={e=>setCspLimit(() => {
                    const v = Math.max(10, Math.min(500, Number(e.target.value)||100));
                    return v;
                  })}
                />
              </label>
              <button onClick={refreshCspViolations} disabled={cspLoading} className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600">{cspLoading?'جارٍ التحديث…':'تحديث'}</button>
              <button onClick={exportCspJson} className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600">تصدير JSON</button>
              <button onClick={exportCspCsv} className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600">تصدير CSV</button>
            </div>
          </div>
          <div className="overflow-x-auto border border-gray-200 dark:border-gray-800 rounded">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="p-2 text-right">الزمن</th>
                  <th className="p-2 text-right">التوجيه المخالف</th>
                  <th className="p-2 text-right">العنصر المحجوب</th>
                  <th className="p-2 text-right">المستند</th>
                  <th className="p-2 text-right">المصدر</th>
                  <th className="p-2 text-right">حالة</th>
                </tr>
              </thead>
              <tbody>
                {filteredCspItems.length === 0 && (
                  <tr><td className="p-3 text-gray-500" colSpan={6}>لا توجد مخالفات حديثة.</td></tr>
                )}
                {filteredCspItems.map((it, idx) => (
                  <tr key={idx} className="border-t border-gray-100 dark:border-gray-800">
                    <td className="p-2 whitespace-nowrap">{new Date(it.at).toLocaleString('ar-SY-u-nu-latn')}</td>
                    <td className="p-2">{it['violated-directive'] || it['effective-directive'] || '—'}</td>
                    <td className="p-2 break-all">{it['blocked-uri'] || '—'}</td>
                    <td className="p-2 break-all">{it['document-uri'] || '—'}</td>
                    <td className="p-2 break-all">{it['source-file'] || '—'}{it['line-number']?`:${it['line-number']}`:''}</td>
                    <td className="p-2">{it['status-code'] ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Route details if filter matches perRoute from metrics */}
        {routeFilter && (metrics as any)?.perRoute && (
          <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
            <div className="font-semibold mb-2">تفاصيل المسارات المطابقة</div>
            <div className="space-y-2 text-sm">
              {((metrics as any).perRoute as Array<{route:string; total:number; byStatus:any}>).filter(r => r.route.toLowerCase().includes(routeFilter.toLowerCase())).slice(0,10).map((r, idx) => (
                <div key={idx} className="p-2 rounded border border-gray-100 dark:border-gray-800">
                  <div className="flex items-center justify-between">
                    <div className="font-mono truncate max-w-[70%]" title={r.route}>{r.route}</div>
                    <div className="text-gray-600 dark:text-gray-300">{r.total}</div>
                  </div>
                  <div className="mt-2"><StatusBars byStatus={r.byStatus} small /></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Security Status Panel */}
        <div className="mt-6">
          <SecurityStatusPanel />
        </div>

        {/* Security Status Flowchart */}
        <details open className="mt-6 p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <summary className="font-bold cursor-pointer">عرض مخطط الحالة الأمنية التفاعلي</summary>
          <div className="mt-4 h-[720px]">
            <SecurityStatusFlowchart />
          </div>
        </details>

        {/* Per-route latency drilldown */}
        {routeFilter && (
          <RouteLatencyCard route={routeFilter} />
        )}
        <div className="grid md:grid-cols-2 gap-4">
          <label className="flex items-center gap-2 p-3 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40">
            <input type="checkbox" checked={traceEnabled} onChange={(e)=>setTraceEnabled(e.target.checked)} />
            <span className="text-sm">تفعيل تتبّع OpenTelemetry في الواجهة الأمامية</span>
          </label>
          <label className="flex items-center gap-2 p-3 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40">
            <input type="checkbox" checked={uxEnabled} onChange={(e)=>setUxEnabled(e.target.checked)} />
            <span className="text-sm">تفعيل مراقبة تجربة المستخدم (Clarity/Hotjar)</span>
          </label>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={applyObservabilityToggles} className="px-4 py-2 rounded bg-blue-600 text-white text-sm hover:bg-blue-700">حفظ الإعدادات</button>
          <button onClick={pingTraceId} className="px-4 py-2 rounded border border-gray-300 dark:border-gray-600 text-sm">قراءة request_id</button>
          <button onClick={sendDemoTrace} className="px-4 py-2 rounded border border-gray-300 dark:border-gray-600 text-sm">طلب تجريبي (Trace)</button>
          <button onClick={testApiHealth} className="px-4 py-2 rounded border border-gray-300 dark:border-gray-600 text-sm">فحص صحة الـ API</button>
          <button onClick={refreshErrors} className="px-4 py-2 rounded border border-gray-300 dark:border-gray-600 text-sm">تحديث الأخطاء</button>
          <button onClick={triggerDemoError} className="px-4 py-2 rounded border border-gray-300 dark:border-gray-600 text-sm">توليد خطأ تجريبي</button>
          {grafanaUp ? (
            <a href="http://localhost:3001/" target="_blank" rel="noreferrer" className="px-4 py-2 rounded border border-gray-300 dark:border-gray-600 text-sm">فتح Grafana</a>
          ) : (
            <button disabled title={grafanaUp===false ? 'غير متاح: شغّل docker compose أو Grafana محلياً' : 'جارٍ الفحص...'} className="px-4 py-2 rounded border border-gray-200 dark:border-gray-700 text-sm text-gray-400 cursor-not-allowed">فتح Grafana</button>
          )}
          {promUp ? (
            <a href="http://localhost:9090/" target="_blank" rel="noreferrer" className="px-4 py-2 rounded border border-gray-300 dark:border-gray-600 text-sm">فتح Prometheus</a>
          ) : (
            <button disabled title={promUp===false ? 'غير متاح: شغّل docker compose أو Prometheus محلياً' : 'جارٍ الفحص...'} className="px-4 py-2 rounded border border-gray-200 dark:border-gray-700 text-sm text-gray-400 cursor-not-allowed">فتح Prometheus</button>
          )}
          <button onClick={refreshLinksStatus} className="px-4 py-2 rounded border border-gray-300 dark:border-gray-600 text-sm">فحص روابط Grafana/Prometheus</button>
        </div>
        {/* API/Metrics Keys controls */}
        <div className="mt-3 p-3 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40">
          <div className="text-sm font-semibold mb-2">مفاتيح الواجهة الخلفية (x-api-key)</div>
          <div className="grid md:grid-cols-2 gap-2">
            <label className="text-xs">
              <div className="mb-1">API Key (للطلبات المحمية مثل POST /api/route-allowlist)</div>
              <input type="password" value={apiKey} onChange={e=>setApiKey(e.target.value)} className="w-full p-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800" placeholder="أدخل المفتاح" />
            </label>
            <label className="text-xs">
              <div className="mb-1">Metrics Key (لقراءة المقاييس عند تفعيل الحماية؛ يَقبل تركه فارغاً إذا كان مماثلاً لـ API Key)</div>
              <input type="password" value={metricsKey} onChange={e=>setMetricsKey(e.target.value)} className="w-full p-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800" placeholder="أدخل المفتاح" />
            </label>
          </div>
          <div className="mt-2">
            <button onClick={saveKeys} className="px-3 py-1.5 rounded border border-gray-300 dark:border-gray-600 text-xs">حفظ المفاتيح</button>
          </div>
        </div>
        <div className="text-sm text-gray-700 dark:text-gray-300">
          <div>آخر request_id: <span className="font-mono">{lastRequestId || '—'}</span></div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">لتوجيه المتصفح إلى المجمع بدون CORS: نرسل إلى <code>/otel/v1/traces</code> ثم يقوم الخادم بالتمرير إلى <code>OTEL_FORWARD_URL</code>.</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">الحالة: Grafana {grafanaUp===null?'—':grafanaUp?'متاح':'غير متاح'} | Prometheus {promUp===null?'—':promUp?'متاح':'غير متاح'}</div>
        </div>
      {/* Errors Section */}
      <div className="mt-6 p-4 rounded-lg border border-red-700/30 bg-red-950/10">
        <div className="flex items-center justify-between">
          <h3 className="font-bold">أخطاء الخادم (آخر 24 ساعة)</h3>
          <button onClick={refreshErrors} className="px-3 py-1.5 rounded border border-gray-300 dark:border-gray-600 text-xs">تحديث</button>
        </div>
        {loadingErrors ? (
          <div className="text-sm mt-2">جارٍ التحميل...</div>
        ) : (
          <>
            {errorStats && (
              <div className="text-sm text-gray-800 dark:text-gray-200 mt-2">
                <div>عدد الأنواع: {errorStats.totalErrors} | مجموع التكرارات: {errorStats.totalCount}</div>
                {errorStats.top?.length > 0 && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">الأكثر تكراراً: {errorStats.top.map(t=>`${t.message} (${t.count})`).join('، ')}</div>
                )}
              </div>
            )}
            <div className="mt-3 divide-y divide-gray-200 dark:divide-gray-800 border border-gray-200 dark:border-gray-800 rounded">
              {errors.length === 0 && (
                <div className="p-3 text-sm text-gray-500">لا توجد أخطاء مسجلة.</div>
              )}
              {errors.map((e:any)=> (
                <div key={e.id} className="p-3 flex items-start gap-3">
                  <div className="flex-1">
                    <div className="text-sm font-semibold">{e.message}</div>
                    <div className="text-xs text-gray-500">المسار: <span className="font-mono">{e.route}</span> — مرات: {e.count} — آخر مرة: {new Date(e.lastAt).toLocaleString('ar-SY-u-nu-latn')}</div>
                    {e.stack && (
                      <details className="mt-1">
                        <summary className="text-xs cursor-pointer">التفاصيل</summary>
                        <pre className="text-xs whitespace-pre-wrap mt-1">{e.stack}</pre>
                      </details>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded ${e.resolved ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'}`}>{e.resolved ? 'محلول' : 'غير محلول'}</span>
                    {!e.resolved && (
                      <button onClick={()=>resolveError(e.id)} className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600">تعليم كمحلول</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      {/* Audit Log Viewer */}
      <div className="mt-6 p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900" id="audit-log-viewer">
        <div className="flex items-center justify-between mb-2 gap-2">
          <div className="flex items-center gap-2">
            <h3 className="font-bold">سجل التدقيق (الأحدث)</h3>
            <span className="text-xs text-gray-500">{auditLogs.length} عنصر</span>
            {!!focusAuditId && (
              <span className="text-[11px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200" title="المعرف المستهدف من الرابط">
                focus: {focusAuditId}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm flex-wrap">
            <input
              type="text"
              placeholder="بحث في السجل (المعرف/السبب/الجهة/الإجراء)"
              className="w-64 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
              value={auditFilter}
              onChange={(e)=>setAuditFilter(e.target.value)}
            />
            <label className="flex items-center gap-1">
              <input type="checkbox" checked={onlySecurity} onChange={(e)=>setOnlySecurity(e.target.checked)} />
              <span>عرض مخالفات الأمان فقط</span>
            </label>
            <button onClick={refreshAuditLogs} className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600">تحديث</button>
            <span className="text-[11px] text-gray-500">آخر تحميل: {auditLoadedAt? new Date(auditLoadedAt).toLocaleTimeString('ar-SY-u-nu-latn',{ hour12:false }): '—'}</span>
          </div>
        </div>
        <div className="overflow-x-auto border border-gray-200 dark:border-gray-800 rounded" style={{maxHeight: '420px'}}>
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="p-2 text-right">الزمن</th>
                <th className="p-2 text-right">المعرف</th>
                <th className="p-2 text-right">الجهة</th>
                <th className="p-2 text-right">الإجراء</th>
                <th className="p-2 text-right">نفّذ بواسطة</th>
                <th className="p-2 text-right">السبب/الوصف</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs
                .filter(l => {
                  if (onlySecurity) {
                    const r = String(l.reason||'').toLowerCase();
                    if (!(r.includes('security') || r.includes('مخالفة'))) return false;
                  }
                  const q = auditFilter.trim().toLowerCase();
                  if (!q) return true;
                  const hay = `${l.id} ${l.entityType} ${l.action} ${l.performedBy} ${l.reason || ''}`.toLowerCase();
                  return hay.includes(q);
                })
                .map((l) => (
                  <tr key={l.id} id={`audit-${l.id}`} data-audit-id={l.id}
                    className={`border-t border-gray-100 dark:border-gray-800 ${focusAuditId === l.id ? 'bg-yellow-50 dark:bg-yellow-900/20' : ''}`}
                  >
                    <td className="p-2 whitespace-nowrap">{new Date(l.timestamp).toLocaleString('ar-SY-u-nu-latn')}</td>
                    <td className="p-2 font-mono text-[12px]">{l.id}</td>
                    <td className="p-2">{l.entityType}</td>
                    <td className="p-2">{l.action}</td>
                    <td className="p-2">{l.performedBy}</td>
                    <td className="p-2 break-all">{l.reason || '—'}</td>
                  </tr>
                ))}
              {auditLogs.length === 0 && (
                <tr><td className="p-3 text-gray-500" colSpan={6}>لا توجد سجلات تدقيق محفوظة.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      </div>
        <div className="mt-6 p-4 rounded-lg border border-emerald-700/30 bg-emerald-950/20">
          <h3 className="font-bold mb-2">التحليل الذكي لحالة المراقبة والتتبع</h3>
          <p className="text-sm text-emerald-200/80 mb-3">يجمع هذا التحليل لقطات من الإعدادات الحالية ويقدّم ملخصاً عملياً مع توصيات لتحسين التتبّع.</p>
          <button onClick={runSmartAnalysis} disabled={analyzing} className="px-3 py-2 rounded bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50">
            {analyzing ? 'جارٍ التحليل...' : 'تشغيل التحليل الذكي'}
          </button>

          {analysis && (
            <div className="mt-4 space-y-2">
              <div className="text-sm">الحالة: <span className="font-semibold">{analysis.status.toUpperCase()}</span> — الدرجة: <span className="font-semibold">{analysis.score}%</span></div>
              <div className="text-sm">الملخص: {analysis.summary}</div>
              <pre className="mt-2 p-3 rounded bg-black/30 text-xs whitespace-pre-wrap">{analysis.details}</pre>
              {analysis.recommendations?.length > 0 && (
                <div className="mt-2">
                  <div className="text-sm font-semibold mb-1">توصيات:</div>
                  <ul className="list-disc pr-5 space-y-1 text-sm">
                    {analysis.recommendations.map((r, idx) => (
                      <li key={idx}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
        {/* Allowlist editor */}
        <div className="mt-6 p-4 rounded-lg border border-blue-700/30 bg-blue-950/10">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold">قائمة المسارات المسموح بها للتصدير إلى Grafana</h3>
            <button onClick={saveAllowlistServer} disabled={allowlistSaving} className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 text-sm">{allowlistSaving?'جارٍ الحفظ...':'حفظ'}</button>
          </div>
          <div className="text-xs text-gray-500 mb-2">سيتم حفظ هذه القائمة على الخادم (ملف محلي) واستخدامها لتقييد المقاييس المصدرة لكل مسار لتجنب زيادة البطاقات.</div>
          <AllowlistEditor list={allowlist} onChange={setAllowlist} />
        </div>
        {/* IP Allowlist editor */}
        <div className="mt-6 p-4 rounded-lg border border-purple-700/30 bg-purple-950/10">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold">قائمة عناوين IP المسموح بها للتصدير إلى Grafana</h3>
            <button onClick={saveIpAllowlistServer} disabled={ipAllowlistSaving} className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 text-sm">{ipAllowlistSaving?'جارٍ الحفظ...':'حفظ'}</button>
          </div>
          <div className="text-xs text-gray-500 mb-2">تُستخدم لتقييد المقاييس لكل IP ومنع تضخم عدد البطاقات في Prometheus/Grafana.</div>
          <AllowlistEditor list={ipAllowlist} onChange={setIpAllowlist} />
        </div>
        {/* إعداد الحماية من إعادة التحميل */}
        <div className="mt-6 p-4 rounded-lg border border-amber-600/40 bg-amber-900/20">
          <h3 className="font-bold mb-2">حماية من إعادة التحميل اليدوي</h3>
          <p className="text-xs text-amber-200/80 mb-3">يمكن تعطيل أزرار إعادة التحميل (مسح أعلام الواجهة / تحديث التطبيق الآن) في واجهة المدير لحماية الجلسة من التحديث غير المقصود أثناء التحليل.</p>
          <label className="flex items-center gap-2 text-sm mb-2">
            <input type="checkbox" checked={disableReloadAdmin} onChange={e=>toggleDisableReloadAdmin(e.target.checked)} />
            <span>تعطيل أزرار إعادة التحميل الإدارية</span>
          </label>
          <div className="text-xs text-amber-300/80">الحالة الحالية: {disableReloadAdmin ? '🔒 معطّل - الأزرار لن تعمل' : 'مفعّل - الأزرار متاحة'}.</div>
        </div>
    </div>
  );
};
export default ObservabilityPage;

// Tiny sparkline component using SVG
const Sparkline: React.FC<{ data: number[]; color?: string; showMinMax?: boolean }> = ({ data, color = '#16a34a', showMinMax = false }) => {
  const w = 220;
  const h = 40;
  const pad = 4;
  const n = data.length;
  if (!n) return <div className="h-10" />;
  const max = Math.max(1, ...data);
  const min = 0; // clamp to 0 baseline
  const points = data.map((v, i) => {
    const x = pad + (i * (w - pad * 2)) / Math.max(1, n - 1);
    const y = h - pad - ((v - min) / Math.max(1, max - min)) * (h - pad * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const last = data[n - 1] ?? 0;
  return (
    <svg width={w} height={h} className="mt-2">
      <polyline fill="none" stroke={color} strokeWidth="2" points={points} />
      <circle cx={pad + (w - pad * 2)} cy={h - pad - ((last - min) / Math.max(1, max - min)) * (h - pad * 2)} r="2.5" fill={color} />
      {showMinMax && (
        <>
          {/* Min/Max overlays */}
          <line x1={pad} x2={w - pad} y1={h - pad - ((0 - min) / Math.max(1, max - min)) * (h - pad * 2)} y2={h - pad - ((0 - min) / Math.max(1, max - min)) * (h - pad * 2)} stroke="#64748b" strokeDasharray="3,3" opacity="0.5" />
          <line x1={pad} x2={w - pad} y1={h - pad - ((max - min) / Math.max(1, max - min)) * (h - pad * 2)} y2={h - pad - ((max - min) / Math.max(1, max - min)) * (h - pad * 2)} stroke="#64748b" strokeDasharray="3,3" opacity="0.5" />
          <text x={pad} y={12} fill="#94a3b8" fontSize="9">max {max.toFixed(1)}</text>
          <text x={pad} y={h - 2} fill="#94a3b8" fontSize="9">min 0.0</text>
        </>
      )}
    </svg>
  );
};

// Simple horizontal bars for status codes
const StatusBars: React.FC<{ byStatus?: { ['2xx']: number; ['3xx']: number; ['4xx']: number; ['5xx']: number; other: number }, small?: boolean }> = ({ byStatus, small }) => {
  const entries: Array<{k: string; v: number; color: string}> = [
    { k: '2xx', v: byStatus?.['2xx'] || 0, color: '#16a34a' },
    { k: '3xx', v: byStatus?.['3xx'] || 0, color: '#06b6d4' },
    { k: '4xx', v: byStatus?.['4xx'] || 0, color: '#f59e0b' },
    { k: '5xx', v: byStatus?.['5xx'] || 0, color: '#dc2626' },
    { k: 'other', v: byStatus?.other || 0, color: '#6b7280' },
  ];
  const total = entries.reduce((a, b) => a + b.v, 0) || 1;
  return (
    <div className="space-y-2">
      {entries.map(e => (
        <div key={e.k} className="flex items-center gap-2">
          <div className="w-10 text-xs text-gray-600 dark:text-gray-300 text-right">{e.k}</div>
          <div className="flex-1 h-2 rounded bg-gray-200 dark:bg-gray-800 overflow-hidden">
            <div style={{ width: `${(e.v/total)*100}%`, backgroundColor: e.color }} className="h-full" />
          </div>
          {!small && <div className="w-16 text-xs text-gray-600 dark:text-gray-300 text-left">{e.v}</div>}
        </div>
      ))}
    </div>
  );
};

// Per-route latency card, calling /api/metrics-summary?route=...
const RouteLatencyCard: React.FC<{ route: string }> = ({ route }) => {
  const [data, setData] = React.useState<any | null>(null);
  const [loading, setLoading] = React.useState(false);
  useEffect(() => {
    let alive = true;
    const run = async () => {
      setLoading(true);
      try {
        const urls = [
          `http://localhost:4000/api/metrics-summary?route=${encodeURIComponent(route)}`,
          `/api/metrics-summary?route=${encodeURIComponent(route)}`,
        ];
        for (const u of urls) {
          try {
            // Read metrics key (or API key fallback) directly from localStorage
            let hk: string | null = null;
            try {
              const m = (localStorage.getItem('obs_metrics_key') || '').trim();
              hk = m || (localStorage.getItem('obs_api_key') || '').trim() || null;
            } catch {}
            const r = await fetch(u, { headers: hk ? { 'x-api-key': hk } : undefined });
            if (r.ok) { const j = await r.json(); if (alive) setData(j?.routeLatency || null); break; }
          } catch {}
        }
      } finally { if (alive) setLoading(false); }
    };
    run();
    return () => { alive = false; };
  }, [route]);
  return (
    <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
      <div className="font-semibold mb-2">زمن الاستجابة للمسار</div>
      <div className="text-xs text-gray-500 mb-2">المسار: <span className="font-mono">{route}</span></div>
      {loading ? <div className="text-sm">جارٍ التحميل...</div> : (
        data ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div><div className="text-xs text-gray-500">العدد</div><div className="font-bold">{data.count}</div></div>
            <div><div className="text-xs text-gray-500">المتوسط</div><div className="font-bold">{data.avgMs!=null?data.avgMs.toFixed(0):'—'} ms</div></div>
            <div><div className="text-xs text-gray-500">p50</div><div className="font-bold">{data.p50Ms!=null?data.p50Ms.toFixed(0):'—'} ms</div></div>
            <div><div className="text-xs text-gray-500">p95</div><div className="font-bold">{data.p95Ms!=null?data.p95Ms.toFixed(0):'—'} ms</div></div>
            <div><div className="text-xs text-gray-500">p99</div><div className="font-bold">{data.p99Ms!=null?data.p99Ms.toFixed(0):'—'} ms</div></div>
          </div>
        ) : <div className="text-sm text-gray-500">لا توجد بيانات كافية لهذا المسار بعد.</div>
      )}
    </div>
  );
};

// Allowlist editor (simple textarea with one route per line)
const AllowlistEditor: React.FC<{ list: string[]; onChange: (v: string[]) => void }> = ({ list, onChange }) => {
  const [text, setText] = React.useState(list.join('\n'));
  useEffect(() => { setText(list.join('\n')); }, [list]);
  const sync = (val: string) => {
    setText(val);
    const arr = val.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
    onChange(arr);
  };
  return (
    <div>
      <textarea className="w-full h-32 text-sm p-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 font-mono" value={text} onChange={e=>sync(e.target.value)} />
      <div className="text-xs text-gray-500 mt-1">مثال: /api/metrics-summary\n/api/errors\n/api/send-receipt</div>
    </div>
  );
};
