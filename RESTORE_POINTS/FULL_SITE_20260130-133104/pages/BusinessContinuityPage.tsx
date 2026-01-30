import React, { useContext, useEffect, useMemo, useState } from 'react';
import { FOCUS_HIGHLIGHT_MS } from '../constants';
import { AppContext } from '../App';
import { BCPPlan, DisasterSeverity, NewBCPInput } from '../types';

const severityOptions: { value: DisasterSeverity; label: string }[] = [
  { value: 'CRITICAL', label: 'حرج جداً' },
  { value: 'HIGH', label: 'مرتفع' },
  { value: 'MEDIUM', label: 'متوسط' },
  { value: 'LOW', label: 'منخفض' },
];

const BusinessContinuityPage: React.FC = () => {
  const ctx = useContext(AppContext);
  const [form, setForm] = useState<NewBCPInput>({ type: '', severity: 'HIGH', description: '', affectedSystems: [], affectedServices: [] });
  const [systemsText, setSystemsText] = useState('db-core, api-gateway');
  const [servicesText, setServicesText] = useState('الطلبات, الشكاوى');
  const plans = ctx?.continuityPlans || [];
  const [focusId, setFocusId] = useState<string | null>(null);

  const handleCreate = async (autoRun = false) => {
    const input: NewBCPInput = {
      type: form.type || 'كارثة غير محددة',
      severity: form.severity,
      description: form.description,
      affectedSystems: systemsText.split(',').map(s => s.trim()).filter(Boolean),
      affectedServices: servicesText.split(',').map(s => s.trim()).filter(Boolean)
    };
    if (autoRun) {
      await ctx?.runBCP?.(input);
    } else {
      await ctx?.createBCP?.(input);
    }
  };

  const PlanRow: React.FC<{ p: BCPPlan }> = ({ p }) => (
    <tr id={`bcp-${p.id}`} className={`border-b border-gray-700/30 ${focusId===p.id?'ring-2 ring-amber-500 animate-pulse':''}`}>
      <td className="py-2 px-3 text-xs">{p.id}</td>
      <td className="py-2 px-3 text-xs">{p.disaster.type}</td>
      <td className="py-2 px-3 text-xs">{p.disaster.severity}</td>
      <td className="py-2 px-3 text-xs">{p.phase}</td>
      <td className="py-2 px-3 text-xs">{p.status}</td>
      <td className="py-2 px-3 text-xs">{new Date(p.startTime).toLocaleString('ar-SY-u-nu-latn')}</td>
    </tr>
  );

  const latest = useMemo(() => plans[0], [plans]);

  // Focus handling for ?focus=planId
  useEffect(() => {
    const applyFocus = (id: string) => {
      if (!id) return;
      setFocusId(id);
      setTimeout(() => {
        const el = document.getElementById(`bcp-${id}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Remove focus param to avoid retrigger
        try {
          const h = window.location.hash || '';
          const qIdx = h.indexOf('?');
          if (qIdx !== -1) {
            const base = h.slice(0, qIdx);
            const params = new URLSearchParams(h.slice(qIdx + 1));
            params.delete('focus');
            const next = params.toString();
            window.location.hash = next ? `${base}?${next}` : base;
          }
        } catch {}
      }, 60);
      const t = setTimeout(() => setFocusId(null), FOCUS_HIGHLIGHT_MS);
      return () => clearTimeout(t);
    };
    const fromHash = () => {
      const h = window.location.hash || '';
      const qIdx = h.indexOf('?');
      if (qIdx === -1) return;
      const params = new URLSearchParams(h.slice(qIdx + 1));
      const f = params.get('focus');
      if (f) applyFocus(f);
    };
    fromHash();
    const onHash = () => fromHash();
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [plans.length]);



  const downloadCSV = async (p: BCPPlan) => {
    const csv = await ctx?.exportBCP?.(p.id, 'csv');
    if (typeof csv === 'string') {
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${p.id}.csv`;
      a.click();
    }
  };
  const downloadPDF = async (p: BCPPlan) => {
    const blob = await ctx?.exportBCP?.(p.id, 'pdf');
    if (blob instanceof Blob) {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${p.id}.pdf`;
      a.click();
    }
  };

  return (
    <>
    <div dir="rtl" className="space-y-6">
      <h1 className="text-2xl font-semibold">خطة استمرارية الأعمال</h1>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <h2 className="font-medium mb-3">إنشاء خطة جديدة</h2>
          <div className="space-y-3 text-sm">
            <div>
              <label className="block mb-1">نوع الكارثة</label>
              <input value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="w-full rounded-md border px-3 py-2 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700" placeholder="انقطاع مركز البيانات" />
            </div>
            <div>
              <label className="block mb-1">الدرجة</label>
              <select value={form.severity} onChange={e => setForm({ ...form, severity: e.target.value as DisasterSeverity })} className="w-full rounded-md border px-3 py-2 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700">
                {severityOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block mb-1">الوصف</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full rounded-md border px-3 py-2 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700" rows={3} placeholder="تفاصيل موجزة عن الحادث" />
            </div>
            <div>
              <label className="block mb-1">الأنظمة المتأثرة (مفصولة بفواصل)</label>
              <input value={systemsText} onChange={e => setSystemsText(e.target.value)} className="w-full rounded-md border px-3 py-2 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700" />
            </div>
            <div>
              <label className="block mb-1">الخدمات المتأثرة (مفصولة بفواصل)</label>
              <input value={servicesText} onChange={e => setServicesText(e.target.value)} className="w-full rounded-md border px-3 py-2 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700" />
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => handleCreate(false)} className="px-4 py-2 rounded-md bg-emerald-700 text-white">إنشاء فقط</button>
              <button onClick={() => handleCreate(true)} className="px-4 py-2 rounded-md bg-indigo-700 text-white">إنشاء + تفعيل الخطة</button>
            </div>
          </div>
        </div>
        <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <h2 className="font-medium mb-3">آخر خطة</h2>
          {!latest && <div className="text-sm text-gray-500">لا توجد خطط بعد</div>}
          {latest && (
            <div className="space-y-2 text-sm">
              <div><span className="text-gray-500">المعرف:</span> {latest.id}</div>
              <div><span className="text-gray-500">الحدث:</span> {latest.disaster.type} - {latest.disaster.severity}</div>
              <div><span className="text-gray-500">الحالة:</span> {latest.status} / {latest.phase}</div>
              <div className="flex items-center gap-3">
                <div className="text-gray-500">التقدم:</div>
                <div className="flex-1 h-2 rounded bg-gray-700/20">
                  <div className="h-2 rounded bg-emerald-600" style={{ width: `${latest.progress || 0}%` }} />
                </div>
                <div className="text-xs">{latest.progress || 0}%</div>
              </div>
              {latest.sla?.rtoDeadline && (
                <div className="text-xs text-amber-400">موعد RTO: {new Date(latest.sla.rtoDeadline).toLocaleString('ar-SY-u-nu-latn')}</div>
              )}
              {latest.sla?.breaches && latest.sla.breaches.length > 0 && (
                <div className="text-xs text-red-400">تجاوز SLA: {latest.sla.breaches.map(b => b.kind).join(', ')}</div>
              )}
              <div className="flex flex-wrap gap-2 pt-2">
                {(['assessment','team_activation','failover','data_recovery','service_recovery','validation','normalization'] as const).map(phase => (
                  <button key={phase} onClick={() => ctx?.runBCPPhase?.(latest.id, phase)} className="px-3 py-1.5 rounded-md bg-gray-700 text-white text-xs">
                    تنفيذ {phase}
                  </button>
                ))}
                <button onClick={() => downloadCSV(latest)} className="px-3 py-1.5 rounded-md bg-sky-700 text-white text-xs">تصدير CSV</button>
                <button onClick={() => downloadPDF(latest)} className="px-3 py-1.5 rounded-md bg-purple-700 text-white text-xs">تصدير PDF</button>
                <button onClick={() => ctx?.submitBCPEvidence?.(latest.id, { kind: 'forensic-snapshot', ref: 'snap-001' })} className="px-3 py-1.5 rounded-md bg-amber-700 text-white text-xs">إرسال أدلة (وهمية)</button>
                <button onClick={() => ctx?.requestBCPBackup?.(latest.id, 'primary-db')} className="px-3 py-1.5 rounded-md bg-rose-700 text-white text-xs">طلب نسخ احتياطي (وهمي)</button>
              </div>
              <div className="mt-3">
                <div className="font-medium mb-1">سجل الإجراءات</div>
                <div className="max-h-64 overflow-auto border rounded-md border-gray-200 dark:border-gray-700 divide-y divide-gray-200/60 dark:divide-gray-700/60">
                  {(latest.actions || []).map(a => (
                    <div key={a.id} className="px-3 py-2">
                      <div className="flex items-center justify-between">
                        <div className="text-xs">{a.phase} → {a.action}</div>
                        <div className="text-[11px] text-gray-500">{new Date(a.at).toLocaleString('ar-SY-u-nu-latn')}</div>
                      </div>
                      {a.details && <div className="text-[12px] text-gray-400 mt-0.5">{a.details}</div>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <h2 className="font-medium mb-3">جميع الخطط</h2>
        <div className="overflow-auto">
          <table className="min-w-full text-right text-sm">
            <thead>
              <tr className="text-xs text-gray-500">
                <th className="py-2 px-3 font-medium">المعرف</th>
                <th className="py-2 px-3 font-medium">الحدث</th>
                <th className="py-2 px-3 font-medium">الدرجة</th>
                <th className="py-2 px-3 font-medium">المرحلة</th>
                <th className="py-2 px-3 font-medium">الحالة</th>
                <th className="py-2 px-3 font-medium">البدء</th>
              </tr>
            </thead>
            <tbody>
              {plans.map(p => <PlanRow key={p.id} p={p} />)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
    {focusId && (
      <div className="fixed bottom-4 right-4 z-50 bg-amber-600 text-white px-3 py-2 rounded-lg shadow-lg text-xs" role="status" aria-live="polite">
        تم التركيز على العنصر: <span className="font-mono">{focusId}</span>
        <button onClick={()=>setFocusId(null)} className="ml-2 px-2 py-0.5 bg-black/20 rounded">إغلاق</button>
      </div>
    )}
    {focusId && (
      <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="fixed bottom-4 left-4 z-50 px-3 py-2 rounded-lg shadow-lg text-xs bg-gray-800 text-white opacity-90 hover:opacity-100">
        إلى الأعلى
      </button>
    )}
    </>
  );
};

export default BusinessContinuityPage;
