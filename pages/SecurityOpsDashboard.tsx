import React, { useContext, useEffect, useMemo, useState } from 'react';
import { AppContext } from '../App';
import { DonutChart, BarChart, ChartDatum, LineChart, StackedBarChart } from '../components/ui/Charts';
import Badge from '../components/ui/Badge';
import { formatArabicNumber } from '../constants';
import { governance as governanceSvc } from '../utils/securityGovernance';
import { auditLogger } from '../utils/auditLogger';
import { Incident, BCPPlan, DailyReport } from '../types';
import SecurityInfoButton from '../components/SecurityInfoButton';

type TimelineKind = 'INCIDENT' | 'BCP' | 'GOVERNANCE' | 'AUDIT' | 'DAILY' ;

type TimelineItem = {
  id: string;
  at: string; // ISO
  kind: TimelineKind;
  title: string;
  details?: string;
  severity?: 'CRITICAL'|'HIGH'|'MEDIUM'|'LOW'|'INFO';
  link?: string;
  refId?: string; // original entity id (incidentId/planId/reportId)
};

const kindColor: Record<TimelineKind, string> = {
  INCIDENT: '#ef4444', // red-500
  BCP: '#f59e0b',      // amber-500
  GOVERNANCE: '#8b5cf6', // violet-500
  AUDIT: '#06b6d4',    // cyan-500
  DAILY: '#10b981',    // emerald-500
};

const SecurityOpsDashboard: React.FC = () => {
  const ctx = useContext(AppContext);
  const isAdmin = ctx?.currentEmployee?.role === 'مدير';
  // Load persisted filters
  const persisted = useMemo(() => {
    try { const raw = localStorage.getItem('security_ops_filters'); return raw ? JSON.parse(raw) : null; } catch { return null; }
  }, []);
  const [from, setFrom] = useState<string>(persisted?.from || '');
  const [to, setTo] = useState<string>(persisted?.to || '');
  const [kinds, setKinds] = useState<Record<TimelineKind, boolean>>(persisted?.kinds || { INCIDENT: true, BCP: true, GOVERNANCE: true, AUDIT: true, DAILY: true });
  const [severityFilter, setSeverityFilter] = useState<'ALL'|'CRITICAL'|'HIGH'|'MEDIUM'|'LOW'|'INFO'>(persisted?.severityFilter || 'ALL');
  const [groupBy, setGroupBy] = useState<'day'|'week'>(persisted?.groupBy || 'day');
  const [trendType, setTrendType] = useState<'bar'|'line'>(persisted?.trendType || 'bar');
  const [stackSeverity, setStackSeverity] = useState<boolean>(persisted?.stackSeverity || false);
  // persist on change
  useEffect(() => {
    try {
      localStorage.setItem('security_ops_filters', JSON.stringify({ from, to, kinds, severityFilter, groupBy, trendType, stackSeverity }));
    } catch {}
  }, [from, to, kinds, severityFilter, groupBy, trendType, stackSeverity]);
  const nowIso = useMemo(()=> new Date().toISOString(), []);

  // Aggregate data sources
  const incidents = ctx?.incidents || [];
  const bcpPlans = ctx?.continuityPlans || [];
  const govState = ctx?.governanceState;

  // Pull audit logs directly from localStorage for now
  const [auditVersion, setAuditVersion] = useState(0);
  const auditLogs = useMemo(() => {
    try { const raw = localStorage.getItem('rbacAuditLogs'); return raw ? JSON.parse(raw) : []; } catch { return []; }
  }, [auditVersion]);
  useEffect(() => {
    const onStorage = (e: StorageEvent) => { if (e.key === 'rbacAuditLogs') setAuditVersion(v=>v+1); };
    window.addEventListener('storage', onStorage);
    const id = setInterval(()=> setAuditVersion(v=>v+1), 15000);
    return () => { window.removeEventListener('storage', onStorage); clearInterval(id); };
  }, []);

  const dailyReports = ctx?.dailyReports || [];

  const timeline: TimelineItem[] = useMemo(() => {
    const items: TimelineItem[] = [];
    // Incidents
    incidents.forEach(inc => {
      items.push({ id: `INC-${inc.id}`, refId: inc.id, at: inc.detectedAt, kind: 'INCIDENT', title: `حادث: ${inc.title}`, details: inc.description, severity: inc.severity });
      (inc.actions||[]).forEach(a => items.push({ id: `INCA-${a.id}`, at: a.at, kind: 'INCIDENT', title: `إجراء (${a.phase})`, details: `${a.action} → ${a.result}`, severity: a.result === 'FAILED' ? 'HIGH' : 'INFO' }));
      (inc.investigation?.timeline||[]).forEach((t, i) => items.push({ id: `INCT-${inc.id}-${i}`, at: t.at, kind: 'INCIDENT', title: `زمن ${t.event}`, details: t.meta ? JSON.stringify(t.meta) : undefined, severity: 'INFO' }));
    });
    // BCP plans
    bcpPlans.forEach(plan => {
      items.push({ id: `BCP-${plan.id}`, refId: plan.id, at: plan.startTime, kind: 'BCP', title: `خطة استمرارية: ${plan.disaster.type}`, details: plan.disaster.description, severity: plan.disaster.severity });
      (plan.actions||[]).forEach(a => items.push({ id: `BCPA-${a.id}`, at: a.at, kind: 'BCP', title: `إجراء (${a.phase})`, details: `${a.action} → ${a.result}`, severity: a.result === 'FAILED' ? 'HIGH' : 'INFO' }));
      if (plan.endTime) items.push({ id: `BCP-END-${plan.id}`, at: plan.endTime, kind: 'BCP', title: 'اكتمال الخطة', severity: 'INFO' });
    });
    // Governance violations
  (govState?.violations||[]).forEach(v => items.push({ id: `GOV-${v.id}`, at: v.timestamp, kind: 'GOVERNANCE', title: `انتهاك سياسة: ${v.policy}`, details: v.violations.join('؛ '), severity: 'MEDIUM', link: v.auditId ? `#/observability?auditId=${encodeURIComponent(v.auditId)}` : undefined }));
    // Audit logs
    auditLogs.forEach((a: any) => items.push({ id: `AUD-${a.id}`, at: a.timestamp || a.time || a.createdAt, kind: 'AUDIT', title: a.event || a.kind || 'تدقيق', details: a.details || a.message, severity: a.severity || 'INFO' }));
    // Daily reports
    dailyReports.forEach(r => {
      items.push({ id: `DLY-${r.id}`, refId: r.id, at: r.date, kind: 'DAILY', title: 'تقرير يومي مُنشأ', details: `Checks: ${r.checks?.length || 0}, Issues: ${r.issues?.length || 0}`, severity: (r.issues||[]).some(i=> i.severity==='CRITICAL' || i.severity==='HIGH') ? 'HIGH' : 'INFO' });
    });
    // Filter by date range
    const fromTs = from ? new Date(from).getTime() : -Infinity;
    const toTs = to ? new Date(to).getTime() : Infinity;
    const filtered = items.filter(it => {
      const t = new Date(it.at).getTime();
      return Number.isFinite(t) && t >= fromTs && t <= toTs;
    });
    return filtered.sort((a,b)=> new Date(a.at).getTime() - new Date(b.at).getTime());
  }, [incidents, bcpPlans, govState, auditLogs, dailyReports, from, to]);

  const filteredTimeline = useMemo(() => {
    return timeline.filter(it => kinds[it.kind] && (severityFilter==='ALL' || it.severity === severityFilter));
  }, [timeline, kinds, severityFilter]);

  // Charts data
  const incidentsBySeverity: ChartDatum[] = useMemo(() => {
    const counts: Record<string, number> = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    incidents.forEach(i => { counts[i.severity] = (counts[i.severity]||0)+1; });
    return [
      { label: 'حرج', value: counts.CRITICAL, color: '#ef4444' },
      { label: 'مرتفع', value: counts.HIGH, color: '#f97316' },
      { label: 'متوسط', value: counts.MEDIUM, color: '#f59e0b' },
      { label: 'منخفض', value: counts.LOW, color: '#84cc16' },
    ];
  }, [incidents]);

  const governanceBreakdown: ChartDatum[] = useMemo(() => {
  const v = govState?.violations || [];
    const byPolicy: Record<string, number> = {};
    v.forEach(x => { byPolicy[x.policy] = (byPolicy[x.policy]||0)+1; });
    return Object.keys(byPolicy).map((k,i) => ({ label: k, value: byPolicy[k], color: ['#8b5cf6','#22c55e','#06b6d4','#f97316','#ef4444'][i%5] }));
  }, [govState]);

  const bcpByPhase: ChartDatum[] = useMemo(() => {
    const counts: Record<string, number> = {};
    bcpPlans.forEach(p => (p.actions||[]).forEach(a => { counts[a.phase] = (counts[a.phase]||0)+1; }));
    return Object.keys(counts).map((k,i)=> ({ label: k, value: counts[k], color: ['#06b6d4','#22c55e','#f59e0b','#8b5cf6','#ef4444'][i%5] }));
  }, [bcpPlans]);

  // Incidents trend chart data (group by day/week)
  const incidentsTrend: ChartDatum[] = useMemo(() => {
    const map: Record<string, number> = {};
    const inRange = incidents.filter(i => {
      const t = new Date(i.detectedAt).getTime();
      const fromTs = from ? new Date(from).getTime() : -Infinity;
      const toTs = to ? new Date(to).getTime() : Infinity;
      return Number.isFinite(t) && t >= fromTs && t <= toTs;
    });
    for (const inc of inRange) {
      const d = new Date(inc.detectedAt);
      let key: string;
      if (groupBy === 'week') {
        // ISO week key: YYYY-Www
        const dt = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        const dayNum = (dt.getUTCDay() + 6) % 7; // 0=Mon
        dt.setUTCDate(dt.getUTCDate() - dayNum + 3);
        const firstThursday = new Date(Date.UTC(dt.getUTCFullYear(),0,4));
        const weekNo = 1 + Math.round(((dt.getTime() - firstThursday.getTime()) / 86400000 - 3) / 7);
        key = `${dt.getUTCFullYear()}-W${String(weekNo).padStart(2,'0')}`;
      } else {
        key = d.toISOString().slice(0,10);
      }
      map[key] = (map[key]||0)+1;
    }
    // Sort keys chronologically
    const keys = Object.keys(map).sort((a,b) => a.localeCompare(b));
    return keys.map((k,i) => ({ label: k, value: map[k], color: '#0ea5e9' }));
  }, [incidents, from, to, groupBy]);

  // Moving average (3-point simple MA) aligned to incidentsTrend
  const incidentsTrendMA: ChartDatum[] = useMemo(() => {
    if (!incidentsTrend.length) return [];
    const vals = incidentsTrend.map(d => d.value);
    const ma: ChartDatum[] = [];
    const win = 3;
    for (let i = 0; i < vals.length; i++) {
      let count = 0, sum = 0;
      for (let j = i - Math.floor(win/2); j <= i + Math.floor(win/2); j++) {
        if (j >= 0 && j < vals.length) { sum += vals[j]; count++; }
      }
      const avg = count ? +(sum / count).toFixed(2) : 0;
      ma.push({ label: incidentsTrend[i].label, value: avg, color: '#22c55e' });
    }
    return ma;
  }, [incidentsTrend]);

  // Severity-stacked trend data
  const incidentsTrendStacked = useMemo(() => {
    const severities: Array<'CRITICAL'|'HIGH'|'MEDIUM'|'LOW'> = ['CRITICAL','HIGH','MEDIUM','LOW'];
    const buckets = new Map<string, Record<string, number>>();
    const inRange = incidents.filter(i => {
      const t = new Date(i.detectedAt).getTime();
      const fromTs = from ? new Date(from).getTime() : -Infinity;
      const toTs = to ? new Date(to).getTime() : Infinity;
      return Number.isFinite(t) && t >= fromTs && t <= toTs;
    });
    for (const inc of inRange) {
      const d = new Date(inc.detectedAt);
      let key: string;
      if (groupBy === 'week') {
        const dt = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        const dayNum = (dt.getUTCDay() + 6) % 7; dt.setUTCDate(dt.getUTCDate() - dayNum + 3);
        const firstThursday = new Date(Date.UTC(dt.getUTCFullYear(),0,4));
        const weekNo = 1 + Math.round(((dt.getTime() - firstThursday.getTime()) / 86400000 - 3) / 7);
        key = `${dt.getUTCFullYear()}-W${String(weekNo).padStart(2,'0')}`;
      } else {
        key = d.toISOString().slice(0,10);
      }
      if (!buckets.has(key)) buckets.set(key, { CRITICAL:0, HIGH:0, MEDIUM:0, LOW:0 });
      const rec = buckets.get(key)!;
      const sev = (inc.severity || 'LOW') as any;
      if (rec[sev] !== undefined) rec[sev] += 1; else rec.LOW += 1;
    }
    const categories = Array.from(buckets.keys()).sort((a,b)=> a.localeCompare(b));
    const series = [
      { name: 'حرج', color: '#ef4444', values: categories.map(c => buckets.get(c)!.CRITICAL) },
      { name: 'مرتفع', color: '#f97316', values: categories.map(c => buckets.get(c)!.HIGH) },
      { name: 'متوسط', color: '#f59e0b', values: categories.map(c => buckets.get(c)!.MEDIUM) },
      { name: 'منخفض', color: '#84cc16', values: categories.map(c => buckets.get(c)!.LOW) },
    ];
    return { categories, series };
  }, [incidents, from, to, groupBy]);

  // Export helpers
  const exportTimelineCSV = () => {
    const header = ['id','date','kind','title','details','severity','link'];
    const rows = filteredTimeline.map(it => [
      it.id,
      new Date(it.at).toLocaleString('ar-SY-u-nu-latn'),
      it.kind,
      it.title.replace(/\n/g,' '),
      (it.details||'').replace(/\n/g,' '),
      it.severity || '',
      it.link || ''
    ]);
    const csv = [header, ...rows].map(r => r.map(field => {
      const s = String(field ?? '');
      if (s.includes(',') || s.includes('"') || s.includes('\n')) return '"' + s.replace(/"/g,'""') + '"';
      return s;
    }).join(',')).join('\n');
    const blob = new Blob(["\uFEFF"+csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'security_timeline.csv'; a.click();
    setTimeout(()=> URL.revokeObjectURL(url), 2000);
  };

  const exportTimelinePDF = async () => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
    const margin = 40; let y = margin;
    doc.setFontSize(14); doc.text('الخط الزمني للعمليات الأمنية', margin, y); y += 18;
    doc.setFontSize(10);
    const items = filteredTimeline.slice(0, 400); // safety cap
    items.forEach(it => {
      const line = `${new Date(it.at).toLocaleString('ar-SY-u-nu-latn')} • [${it.kind}] ${it.title}${it.severity ? ' • ' + it.severity : ''}`;
      const lines = doc.splitTextToSize(line, 515);
      if (y + lines.length*12 > 800) { doc.addPage(); y = margin; }
      doc.text(lines, margin, y);
      y += lines.length*12;
      if (it.details) {
        const dLines = doc.splitTextToSize(`— ${it.details}`, 515);
        if (y + dLines.length*12 > 800) { doc.addPage(); y = margin; }
        doc.text(dLines, margin, y);
        y += dLines.length*12;
      }
      y += 6;
    });
    doc.save('security_timeline.pdf');
  };

  // Export bucketed trend as CSV (both total series and per-severity stacked when enabled)
  const exportTrendCSV = () => {
    if (!stackSeverity) {
      const header = ['bucket', 'incidents'];
      const rows = incidentsTrend.map(d => [d.label, d.value]);
      const csv = [header, ...rows].map(r => r.join(',')).join('\n');
      const blob = new Blob(["\uFEFF"+csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `incidents_trend_${groupBy}.csv`; a.click();
      setTimeout(()=> URL.revokeObjectURL(url), 1500);
    } else {
      const cats = incidentsTrendStacked.categories;
      const series = incidentsTrendStacked.series;
      const header = ['bucket', ...series.map(s => s.name)];
      const rows: (string|number)[][] = cats.map((c, idx) => {
        const vals = series.map(s => s.values[idx] ?? 0);
        return [c, ...vals];
      });
      const csv = [header, ...rows].map(r => r.join(',')).join('\n');
      const blob = new Blob(["\uFEFF"+csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `incidents_trend_stacked_${groupBy}.csv`; a.click();
      setTimeout(()=> URL.revokeObjectURL(url), 1500);
    }
  };

  // Clear all audit logs with confirmation
  const clearAuditLogs = () => {
    const ok = window.confirm('هل تريد بالتأكيد مسح جميع سجلات التدقيق؟ هذا الإجراء لا يمكن التراجع عنه.');
    if (!ok) return;
    try {
      localStorage.setItem('rbacAuditLogs', '[]');
      setAuditVersion(v=>v+1);
      ctx?.addToast?.({ message: 'تم مسح سجلات التدقيق', type: 'info' });
    } catch (e) {
      ctx?.addToast?.({ message: 'تعذر مسح سجلات التدقيق', type: 'error' });
    }
  };

  // ----- Demo Data Seeding -----
  const seedDemoData = async () => {
    // 1) Seed Incidents (3 mixed severities, with minimal actions)
    const now = Date.now();
    const incs: Incident[] = [
      {
        id: `INC-DEMO-${Math.random().toString(36).slice(2,6)}`,
        title: 'محاولة اختراق عبر API',
        description: 'معدل طلبات مرتفع وغير معتاد على واجهة /auth',
        detectedAt: new Date(now - 1000 * 60 * 60 * 24 * 1).toISOString(),
        updatedAt: new Date(now - 1000 * 60 * 60 * 24 * 1 + 600000).toISOString(),
        status: 'CLOSED',
        phase: 'lessons_learned',
        severity: 'HIGH',
        type: 'bruteforce',
        affectedSystems: ['auth-api','gateway'],
        compromisedAccounts: [],
        affectedServices: ['login'],
        timeWindow: { from: new Date(now - 1000*60*60*26).toISOString(), to: new Date(now - 1000*60*60*23).toISOString() },
        impact: { scope: 'بوابة الدخول', dataLoss: false },
        investigation: { timeline: [{ at: new Date(now - 1000*60*60*24).toISOString(), event: 'rate_limit_triggered' }], rootCause: { summary: 'ضعف سياسة IP throttling' }, indicators: { bruteforce: true }, evidence: ['logs:auth'] },
        recovery: { steps: ['رفع حدود الجدار الناري'], validation: ['اختبار TED'], monitoring: ['SIEM rule added'] },
        actions: [
          { id: 'det-1', phase: 'detection', action: 'startDetailedLogging', result: 'SUCCESS', at: new Date(now - 1000*60*60*24 + 1000*60*5).toISOString() },
          { id: 'con-1', phase: 'containment', action: 'applyEmergencyFirewallRules', result: 'SUCCESS', at: new Date(now - 1000*60*60*24 + 1000*60*10).toISOString() },
          { id: 'rec-1', phase: 'recovery', action: 'updateSecurityRules', result: 'SUCCESS', at: new Date(now - 1000*60*60*24 + 1000*60*30).toISOString() },
        ],
        report: { summary: 'صد ومنع محاولات القوة الغاشمة على /auth', timeline: [], response: { strengths: [], weaknesses: [], improvements: [] }, recommendations: ['تعزيز حماية API'], actionItems: [] }
      },
      {
        id: `INC-DEMO-${Math.random().toString(36).slice(2,6)}`,
        title: 'تنبيه مالوير على محطة عمل',
        description: 'كشف توقيع مشبوه من مضاد الفيروسات',
        detectedAt: new Date(now - 1000 * 60 * 60 * 24 * 3).toISOString(),
        updatedAt: new Date(now - 1000 * 60 * 60 * 24 * 3 + 600000).toISOString(),
        status: 'CLOSED',
        phase: 'lessons_learned',
        severity: 'MEDIUM',
        type: 'endpoint_malware',
        affectedSystems: ['hr-workstation-12'],
        compromisedAccounts: ['hr1'],
        affectedServices: [],
        impact: { scope: 'محطة عمل واحدة', dataLoss: false },
        investigation: { timeline: [{ at: new Date(now - 1000*60*60*72).toISOString(), event: 'av_alert' }], rootCause: { summary: 'تحميل مرفق مشبوه' }, indicators: { malware: true }, evidence: ['av:alerts'] },
        recovery: { steps: ['إزالة البرمجية الخبيثة'], validation: ['فحص نهائي'], monitoring: [] },
        actions: [ { id: 'erad-1', phase: 'eradication', action: 'removeMalware', result: 'SUCCESS', at: new Date(now - 1000*60*60*72 + 1000*60*15).toISOString() } ]
      },
      {
        id: `INC-DEMO-${Math.random().toString(36).slice(2,6)}`,
        title: 'انقطاع في خدمة البريد',
        description: 'توقف جزئي لمخدم البريد الداخلي لمدة 40 دقيقة',
        detectedAt: new Date(now - 1000 * 60 * 60 * 24 * 7).toISOString(),
        updatedAt: new Date(now - 1000 * 60 * 60 * 24 * 7 + 3600000).toISOString(),
        status: 'CLOSED',
        phase: 'lessons_learned',
        severity: 'LOW',
        type: 'service_outage',
        affectedSystems: ['mail-server'],
        compromisedAccounts: [],
        affectedServices: ['mail'],
        impact: { scope: 'خدمة داخلية', dataLoss: false },
        investigation: { timeline: [{ at: new Date(now - 1000*60*60*168).toISOString(), event: 'service_outage' }], rootCause: { summary: 'تسرب موارد' }, indicators: {}, evidence: [] },
        recovery: { steps: ['إعادة تشغيل الخدمة'], validation: ['اختبار الإرسال'], monitoring: [] },
  actions: [ { id: 'srv-1', phase: 'recovery', action: 'restartService', result: 'SUCCESS', at: new Date(now - 1000*60*60*168 + 1000*60*40).toISOString() } ]
      }
    ];
    ctx?.replaceIncidents?.(incs);

    // 2) Seed BCP Plans (1 completed event)
    const plan: BCPPlan = {
      id: `BCP-DEMO-${Math.random().toString(36).slice(2,6)}`,
      disaster: { type: 'انقطاع مركز البيانات', severity: 'HIGH', description: 'توقف مفاجئ في البنية التحتية الأساسية', occurredAt: new Date(now - 1000*60*60*48).toISOString(), affectedSystems: ['db-core','api-gateway'], affectedServices: ['tickets','login'] },
      startTime: new Date(now - 1000*60*60*48).toISOString(),
      endTime: new Date(now - 1000*60*60*46).toISOString(),
      status: 'COMPLETED',
      phase: 'normalization',
      rto: { critical: 60, high: 240, medium: 1440, low: 4320 },
      rpo: { critical: 15, high: 60, medium: 240, low: 1440 },
      progress: 100,
      progressByPhase: { assessment: 100, team_activation: 100, failover: 100, data_recovery: 100, service_recovery: 100, validation: 100, normalization: 100 },
      sla: { rtoDeadline: new Date(now - 1000*60*60*47).toISOString(), rpoWindowMinutes: 60, breaches: [] },
      assessment: { affectedSystems: ['db-core','api-gateway'], affectedServices: ['tickets','login'], dataLoss: false, estimatedDowntimeHours: 4, notes: 'تقييم أولي' },
      team: { lead: 'admin', members: ['it1','network'] },
      failover: { primary: ['db-core','api-gateway'], secondary: ['db-core-secondary','api-gateway-secondary'], startTime: new Date(now - 1000*60*60*48).toISOString(), steps: [] },
      dataRecovery: { strategy: 'INCREMENTAL', recoveredPoints: [new Date(now - 1000*60*60*47).toISOString()], notes: '' },
      serviceRecovery: { services: [{ name: 'tickets', restarted: true, validated: true }, { name: 'login', restarted: true, validated: true }] },
      validation: { success: true, tests: ['اختبار أداء','تكامل'], results: ['ناجح','مطابق'] },
      normalization: { switchedBackAt: new Date(now - 1000*60*60*46).toISOString(), steps: ['إرجاع الحركة','إيقاف الثانوي'] },
      actions: [
        { id: 'assess', phase: 'assessment', action: 'assessDamage', result: 'SUCCESS', at: new Date(now - 1000*60*60*48 + 1000*60*15).toISOString() },
        { id: 'team', phase: 'team_activation', action: 'activateTeam', result: 'SUCCESS', at: new Date(now - 1000*60*60*48 + 1000*60*30).toISOString() },
        { id: 'fail', phase: 'failover', action: 'executeFailover', result: 'SUCCESS', at: new Date(now - 1000*60*60*47 + 1000*60*10).toISOString() },
        { id: 'reco', phase: 'data_recovery', action: 'recoverData', result: 'SUCCESS', at: new Date(now - 1000*60*60*47 + 1000*60*30).toISOString() },
        { id: 'srv', phase: 'service_recovery', action: 'recoverServices', result: 'SUCCESS', at: new Date(now - 1000*60*60*47 + 1000*60*45).toISOString() },
        { id: 'val', phase: 'validation', action: 'validateRecovery', result: 'SUCCESS', at: new Date(now - 1000*60*60*46 + 1000*60*10).toISOString() },
        { id: 'norm', phase: 'normalization', action: 'returnToNormal', result: 'SUCCESS', at: new Date(now - 1000*60*60*46 + 1000*60*20).toISOString() }
      ]
    };
    ctx?.replaceBCPPlans?.([plan]);

    // 3) Seed Daily Reports (last 3 days)
    const dlys: DailyReport[] = [0,1,2].map(idx => ({
      id: `DLY-DEMO-${idx}-${Math.random().toString(36).slice(2,4)}`,
      date: new Date(now - idx*24*60*60*1000).toISOString(),
      checks: [ { name: 'سجلات الأمان', status: 'OK' }, { name: 'النسخ الاحتياطية', status: 'OK' } ],
      issues: idx===1 ? [ { severity: 'HIGH', description: 'سعة التخزين تجاوزت 85%', action: 'توسيع السعة' } ] : [],
      metrics: { domContentLoadedMs: 900 + idx*50, loadTimeMs: 1600 + idx*70, jsHeapUsedMB: 130, jsHeapTotalMB: 260, timestamp: new Date(now - idx*24*60*60*1000).toISOString() },
      createdAt: new Date(now - idx*24*60*60*1000).toISOString()
    }));
    ctx?.replaceDailyReports?.(dlys);

    // 4) Governance demo violations & exceptions
    // Add one approved exception and one violation
  const ex = governanceSvc.addException({ policy: 'encryptionPolicy', scope: '*', reason: 'خادم قديم للاختبار', requestedBy: 'admin', expiresAt: new Date(now + 14*24*3600*1000).toISOString(), status: 'approved' });
  governanceSvc.approveException(ex.id, 'CISO');
  await governanceSvc.enforcePolicy('passwordPolicy', { password: 'weak' });
  await governanceSvc.enforcePolicy('encryptionPolicy', { tlsVersion: 'TLS 1.2', hstsEnabled: false, weakCiphers: ['RC4'] });

    // 5) Add a couple of audit logs
    auditLogger.logSystemConfigurationChange('demo.seed', null, { ok: true }, 'SYSTEM', 'تهيئة بيانات العرض');
    auditLogger.logSecurityViolation('SYSTEM', 'demo.violation', 'مثال مخالفة اختبارية', 'LOW');

    ctx?.addToast?.({ message: 'تم تحميل بيانات العرض التجريبية', type: 'success' });
  };

  const clearDemoData = () => {
    // Clear lists and localStorage keys used
    ctx?.replaceIncidents?.([]);
    ctx?.replaceBCPPlans?.([]);
    ctx?.replaceDailyReports?.([]);
    try {
      localStorage.removeItem('incidents');
      localStorage.removeItem('bcp_plans');
      localStorage.removeItem('daily_reports');
      // Keep governance but clear violations/exceptions minimally for a clean view
      const g = governanceSvc;
      (g.state.violations as any) = [];
      (g.state.exceptions as any) = [];
      g.onUpdate?.(g.state);
      localStorage.setItem('governance_state', JSON.stringify(g.state));
      // Do not clear audit logs entirely to retain platform history
    } catch {}
    ctx?.addToast?.({ message: 'تم مسح بيانات العرض', type: 'info' });
  };

  return (
    <div dir="rtl" className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">لوحة العمليات الأمنية</h1>
          <SecurityInfoButton context="secops" />
        </div>
        <div className="flex items-center gap-2 text-xs">
          <Badge className="bg-red-600 text-white">حادث</Badge>
          <Badge className="bg-amber-600 text-white">استمرارية</Badge>
          <Badge className="bg-purple-600 text-white">حوكمة</Badge>
          <Badge className="bg-cyan-600 text-white">تدقيق</Badge>
          <Badge className="bg-emerald-600 text-white">يومي</Badge>
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <label className="text-gray-600 dark:text-gray-300">من</label>
            <input type="date" className="bg-transparent border rounded p-2" value={from} onChange={e=>setFrom(e.target.value)} />
            <label className="text-gray-600 dark:text-gray-300">إلى</label>
            <input type="date" className="bg-transparent border rounded p-2" value={to} onChange={e=>setTo(e.target.value)} />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {(['INCIDENT','BCP','GOVERNANCE','AUDIT','DAILY'] as TimelineKind[]).map(k => (
              <label key={k} className="inline-flex items-center gap-1 cursor-pointer">
                <input type="checkbox" checked={kinds[k]} onChange={e=> setKinds(prev => ({ ...prev, [k]: e.target.checked }))} />
                <span className="text-xs">{k === 'INCIDENT' ? 'الحوادث' : k === 'BCP' ? 'الاستمرارية' : k === 'GOVERNANCE' ? 'الحوكمة' : k === 'AUDIT' ? 'التدقيق' : 'اليومية'}</span>
              </label>
            ))}
            <div className="flex items-center gap-2 ml-auto">
              <label className="text-gray-600 dark:text-gray-300">تجميع حسب</label>
              <select className="bg-transparent border rounded p-2" value={groupBy} onChange={e=>setGroupBy(e.target.value as any)}>
                <option value="day">اليوم</option>
                <option value="week">الأسبوع</option>
              </select>
            </div>
            <select className="bg-transparent border rounded p-2 ml-auto" value={severityFilter} onChange={e=>setSeverityFilter(e.target.value as any)}>
              <option value="ALL">كل الشدّات</option>
              <option value="CRITICAL">حرج</option>
              <option value="HIGH">مرتفع</option>
              <option value="MEDIUM">متوسط</option>
              <option value="LOW">منخفض</option>
              <option value="INFO">معلوماتي</option>
            </select>
            <div className="flex items-center gap-2 ml-auto">
              <label className="text-gray-600 dark:text-gray-300">نوع الرسم</label>
              <select className="bg-transparent border rounded p-2" value={trendType} onChange={e=>setTrendType(e.target.value as any)}>
                <option value="bar">أعمدة</option>
                <option value="line">خط</option>
              </select>
              <label className="inline-flex items-center gap-1 cursor-pointer">
                <input type="checkbox" checked={stackSeverity} onChange={e=> setStackSeverity(e.target.checked)} />
                <span className="text-xs">تراكم حسب الشدة</span>
              </label>
            </div>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={exportTimelineCSV} className="text-xs px-3 py-1.5 rounded bg-emerald-600 text-white hover:bg-emerald-700" title="تصدير CSV">تصدير CSV</button>
          <button onClick={exportTimelinePDF} className="text-xs px-3 py-1.5 rounded bg-sky-600 text-white hover:bg-sky-700" title="تصدير PDF">تصدير PDF</button>
          <button onClick={exportTrendCSV} className="text-xs px-3 py-1.5 rounded bg-amber-600 text-white hover:bg-amber-700" title="تصدير التوجه (CSV)">تصدير التوجه CSV</button>
          <span className="mx-2 opacity-40">|</span>
          <button onClick={seedDemoData} className="text-xs px-3 py-1.5 rounded bg-purple-600 text-white hover:bg-purple-700" title="تحميل بيانات عرض">تحميل بيانات عرض</button>
          <button onClick={clearDemoData} className="text-xs px-3 py-1.5 rounded bg-gray-600 text-white hover:bg-gray-700" title="مسح بيانات العرض">مسح بيانات العرض</button>
          <span className="mx-2 opacity-40">|</span>
          <button onClick={clearAuditLogs} className="text-xs px-3 py-1.5 rounded bg-rose-600 text-white hover:bg-rose-700" title="مسح سجلات التدقيق">مسح سجلات التدقيق</button>
        </div>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <h2 className="font-medium mb-3">الحوادث حسب الشدّة</h2>
          <DonutChart data={incidentsBySeverity} centerLabel="حادث" />
        </div>
        <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <h2 className="font-medium mb-3">انتهاكات الحوكمة حسب السياسة</h2>
          <BarChart data={governanceBreakdown} />
        </div>
        <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <h2 className="font-medium mb-3">إجراءات الاستمرارية حسب المرحلة</h2>
          <BarChart data={bcpByPhase} />
        </div>
      </div>

      {/* Trend Chart: Incidents over time */}
      <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <h2 className="font-medium mb-3">توجه الحوادث عبر الزمن ({groupBy === 'day' ? 'يومي' : 'أسبوعي'})</h2>
        {!stackSeverity ? (
          trendType === 'line' ? <LineChart data={incidentsTrend} overlay={incidentsTrendMA} overlayStroke="#16a34a" /> : <BarChart data={incidentsTrend} />
        ) : (
          <StackedBarChart categories={incidentsTrendStacked.categories} series={incidentsTrendStacked.series as any} />
        )}
      </div>

      {/* Unified Timeline */}
      <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <h2 className="font-medium mb-3">الخط الزمني الموحد</h2>
        {filteredTimeline.length === 0 ? (
          <div className="text-sm text-gray-500">لا توجد أحداث ضمن الفلاتر المحددة</div>
        ) : (
          <div className="relative">
            <div className="absolute right-4 top-0 bottom-0 w-px bg-gray-300 dark:bg-gray-700" />
            <ul className="space-y-4">
              {filteredTimeline.map(item => (
                <li key={item.id} className="relative pr-10">
                  <span className="absolute right-3 top-2 inline-block w-3 h-3 rounded-full ring-2 ring-white dark:ring-gray-900" style={{ background: kindColor[item.kind] }} />
                  <div className="text-xs text-gray-500 mb-1">{new Date(item.at).toLocaleString('ar-SY-u-nu-latn')}</div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{item.title}</span>
                    {item.severity && <Badge className={`${item.severity==='CRITICAL'?'bg-red-700': item.severity==='HIGH'?'bg-orange-600': item.severity==='MEDIUM'?'bg-amber-600': item.severity==='LOW'?'bg-lime-600':'bg-gray-500'} text-white`}>{item.severity}</Badge>}
                    {/* quick links */}
                    {item.kind === 'INCIDENT' && (
                      <a href={`#/incident-response?focus=${encodeURIComponent(item.refId || '')}`} className="text-xs text-sky-700 underline">تفاصيل الحادث</a>
                    )}
                    {item.kind === 'BCP' && (
                      <a href={`#/business-continuity?focus=${encodeURIComponent(item.refId || '')}`} className="text-xs text-sky-700 underline">تفاصيل الاستمرارية</a>
                    )}
                    {item.kind === 'DAILY' && (
                      <a href={`#/daily-ops?focus=${encodeURIComponent(item.refId || '')}`} className="text-xs text-sky-700 underline">تفاصيل اليومية</a>
                    )}
                    {item.link && (
                      <a href={item.link} className="text-xs text-sky-600 underline">فتح</a>
                    )}
                  </div>
                  {item.details && <div className="text-sm text-gray-700 dark:text-gray-300 mt-1 whitespace-pre-wrap break-words">{item.details}</div>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default SecurityOpsDashboard;
