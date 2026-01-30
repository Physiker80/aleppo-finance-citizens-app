import React, { useContext, useEffect, useMemo, useState } from 'react';
import { FOCUS_HIGHLIGHT_MS } from '../constants';
import { AppContext } from '../App';
import { Incident, IncidentSeverity, NewIncidentInput } from '../types';

const severities: { label: string; value: IncidentSeverity }[] = [
  { label: 'حرجة', value: 'CRITICAL' },
  { label: 'عالية', value: 'HIGH' },
  { label: 'متوسطة', value: 'MEDIUM' },
  { label: 'منخفضة', value: 'LOW' },
];

const IncidentResponsePage: React.FC = () => {
  const app = useContext(AppContext);
  const [form, setForm] = useState<NewIncidentInput>({ title: '', description: '', severity: 'MEDIUM', affectedSystems: [], compromisedAccounts: [], affectedServices: [] });
  const [selected, setSelected] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);

  const incidents = app?.incidents || app?.listIncidents?.() || [];
  const current = useMemo(() => incidents.find(i => i.id === selected) || incidents[0], [incidents, selected]);

  const handleCreate = async (autoRun = false) => {
    const input: NewIncidentInput = {
      ...form,
      affectedSystems: (form.affectedSystems || []),
      compromisedAccounts: (form.compromisedAccounts || []),
      affectedServices: (form.affectedServices || []),
    };
    const inc = autoRun ? await app?.runIncidentPlan?.(input) : await app?.createIncident?.(input);
    if (inc) setSelected(inc.id);
  };

  // Focus handling: parse ?focus=incidentId from hash and scroll/highlight
  useEffect(() => {
    const applyFocus = (id: string) => {
      if (!id) return;
      setSelected(id);
      setFocusId(id);
      // Scroll after DOM paints
      setTimeout(() => {
        const el = document.getElementById(`incident-${id}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Remove focus param from hash to prevent retriggers
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
  }, [incidents.length]);

  return (
    <div className="rtl text-right space-y-6">
      <h1 className="text-2xl font-bold">الاستجابة للحوادث الأمنية</h1>
      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-1 bg-white dark:bg-gray-800 rounded-xl p-4 border dark:border-gray-700 shadow-sm">
          <h2 className="font-semibold mb-3">إنشاء حادث جديد</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-sm mb-1">العنوان</label>
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

              <input className="w-full rounded-md border px-3 py-2 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700" value={form.title} onChange={(e)=>setForm(f=>({...f,title:e.target.value}))} />
            </div>
            <div>
              <label className="block text-sm mb-1">الوصف</label>
              <textarea className="w-full rounded-md border px-3 py-2 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700" value={form.description} onChange={(e)=>setForm(f=>({...f,description:e.target.value}))} />
            </div>
            <div>
              <label className="block text-sm mb-1">الشدة</label>
              <select className="w-full rounded-md border px-3 py-2 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700" value={form.severity} onChange={(e)=>setForm(f=>({...f,severity:e.target.value as IncidentSeverity}))}>
                {severities.map(s=> <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm mb-1">الأنظمة المتأثرة (مفصولة بفواصل)</label>
              <input className="w-full rounded-md border px-3 py-2 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700" onChange={(e)=>setForm(f=>({...f,affectedSystems:e.target.value.split(',').map(s=>s.trim()).filter(Boolean)}))} />
            </div>
            <div>
              <label className="block text-sm mb-1">الحسابات المخترقة (مفصولة بفواصل)</label>
              <input className="w-full rounded-md border px-3 py-2 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700" onChange={(e)=>setForm(f=>({...f,compromisedAccounts:e.target.value.split(',').map(s=>s.trim()).filter(Boolean)}))} />
            </div>
            <div>
              <label className="block text-sm mb-1">الخدمات المتأثرة (مفصولة بفواصل)</label>
              <input className="w-full rounded-md border px-3 py-2 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700" onChange={(e)=>setForm(f=>({...f,affectedServices:e.target.value.split(',').map(s=>s.trim()).filter(Boolean)}))} />
            </div>
            <div className="flex gap-2">
              <button onClick={()=>handleCreate(false)} className="px-3 py-2 rounded-md bg-emerald-700 text-white">إنشاء</button>
              <button onClick={()=>handleCreate(true)} className="px-3 py-2 rounded-md bg-indigo-700 text-white">إنشاء وتشغيل الخطة</button>
            </div>
          </div>
        </div>
        <div className="md:col-span-2 space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border dark:border-gray-700 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">الحوادث</h2>
              <span className="text-xs text-gray-500">الإجمالي: {incidents.length}</span>
            </div>
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="text-gray-600 dark:text-gray-300">
                  <tr>
                    <th className="p-2">المعرف</th>
                    <th className="p-2">العنوان</th>
                    <th className="p-2">الشدة</th>
                    <th className="p-2">المرحلة</th>
                    <th className="p-2">الحالة</th>
                    <th className="p-2">آخر تحديث</th>
                  </tr>
                </thead>
                <tbody>
                  {incidents.map((i: Incident) => (
                    <tr id={`incident-${i.id}`} key={i.id} className={`border-t dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer ${selected===i.id?'bg-amber-50/50 dark:bg-amber-900/20':''} ${focusId===i.id?'ring-2 ring-amber-500 animate-pulse':''}`} onClick={()=>setSelected(i.id)}>
                      <td className="p-2 font-mono text-xs">{i.id}</td>
                      <td className="p-2">{i.title}</td>
                      <td className="p-2">{i.severity}</td>
                      <td className="p-2">{i.phase}</td>
                      <td className="p-2">{i.status}</td>
                      <td className="p-2">{new Date(i.updatedAt).toLocaleString('ar-SY-u-nu-latn')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {current && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border dark:border-gray-700 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">تفاصيل الحادث</h2>
                <span className="text-xs text-gray-500">{current.id}</span>
              </div>
              <div className="mt-3 grid md:grid-cols-3 gap-3 text-sm">
                <div><span className="text-gray-500">العنوان:</span> {current.title}</div>
                <div><span className="text-gray-500">الشدة:</span> {current.severity}</div>
                <div><span className="text-gray-500">المرحلة:</span> {current.phase}</div>
                <div><span className="text-gray-500">الحالة:</span> {current.status}</div>
                <div><span className="text-gray-500">اكتشاف:</span> {new Date(current.detectedAt).toLocaleString('ar-SY-u-nu-latn')}</div>
                <div><span className="text-gray-500">تحديث:</span> {new Date(current.updatedAt).toLocaleString('ar-SY-u-nu-latn')}</div>
              </div>
              <div className="mt-4">
                <h3 className="font-medium mb-2">الإجراءات</h3>
                <ul className="space-y-1 text-xs">
                  {current.actions.map(a => (
                    <li key={a.id} className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-700">{a.phase}</span>
                      <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800">{a.action}</span>
                      <span className={`px-2 py-0.5 rounded ${a.result==='SUCCESS'?'bg-emerald-200/60 dark:bg-emerald-900/40':a.result==='FAILED'?'bg-rose-200/60 dark:bg-rose-900/40':'bg-gray-200 dark:bg-gray-700'}`}>{a.result}</span>
                      <span className="text-gray-500">{new Date(a.at).toLocaleString('ar-SY-u-nu-latn')}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default IncidentResponsePage;