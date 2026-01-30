import React, { useContext, useEffect, useMemo, useState } from 'react';
import { FOCUS_HIGHLIGHT_MS } from '../constants';
import { AppContext } from '../App';
import { DailyReport } from '../types';

const DailyOperationsPage: React.FC = () => {
  const ctx = useContext(AppContext);
  const [running, setRunning] = useState(false);
  const reports = ctx?.dailyReports || ctx?.listDailyReports?.() || [];
  const latest = useMemo(() => reports[0], [reports]);
  const [focusId, setFocusId] = useState<string | null>(null);

  const runChecks = async () => {
    if (running) return;
    setRunning(true);
    try {
      await ctx?.runDailyChecks?.();
    } finally {
      setRunning(false);
    }
  };

  const downloadCSV = async (r: DailyReport) => {
    const csv = await ctx?.exportDailyReport?.(r.id, 'csv');
    if (typeof csv === 'string') {
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${r.id}.csv`;
      a.click();
    }
  };

  const downloadPDF = async (r: DailyReport) => {
    const blob = await ctx?.exportDailyReport?.(r.id, 'pdf');
    if (blob instanceof Blob) {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${r.id}.pdf`;
      a.click();
    }
  };

  // Focus handling for ?focus=reportId
  useEffect(() => {
    const applyFocus = (id: string) => {
      if (!id) return;
      setFocusId(id);
      setTimeout(() => {
        const el = document.getElementById(`daily-${id}`);
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
  }, [reports.length]);

  return (
    <div dir="rtl" className="space-y-6">
      <h1 className="text-2xl font-semibold">إجراءات التشغيل اليومية (SOP 7.1)</h1>

      <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex items-center gap-3">
          <button onClick={runChecks} disabled={running} className={`px-4 py-2 rounded-md text-white ${running ? 'bg-gray-500' : 'bg-emerald-700 hover:bg-emerald-600'}`}>
            {running ? 'جارٍ التنفيذ…' : 'تشغيل فحوصات اليوم'}
          </button>
          <div className="text-sm text-gray-500">آخر تقرير: {latest ? new Date(latest.date).toLocaleString('ar-SY-u-nu-latn') : 'لا يوجد'}</div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <h2 className="font-medium mb-3">آخر تقرير</h2>
          {!latest && <div className="text-sm text-gray-500">لا توجد تقارير بعد</div>}
          {latest && (
            <div className="space-y-3 text-sm">
              <div><span className="text-gray-500">المعرف:</span> {latest.id}</div>
              <div><span className="text-gray-500">التاريخ:</span> {new Date(latest.date).toLocaleString('ar-SY-u-nu-latn')}</div>
              <div>
                <div className="font-medium mb-1">الفحوصات</div>
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

                <div className="rounded-md border border-gray-200 dark:border-gray-700 divide-y divide-gray-200/60 dark:divide-gray-700/60">
                  {latest.checks.map((c, idx) => (
                    <div key={idx} className="px-3 py-2 flex items-center justify-between">
                      <div>{c.name}</div>
                      <span className={`text-xs px-2 py-0.5 rounded ${c.status === 'OK' ? 'bg-emerald-600 text-white' : c.status === 'WARNING' ? 'bg-amber-600 text-white' : 'bg-rose-600 text-white'}`}>{c.status}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="font-medium mb-1">القضايا</div>
                <div className="rounded-md border border-gray-200 dark:border-gray-700 divide-y divide-gray-200/60 dark:divide-gray-700/60">
                  {latest.issues.length === 0 && <div className="px-3 py-2 text-gray-500">لا توجد قضايا</div>}
                  {latest.issues.map((i, idx) => (
                    <div key={idx} className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-[11px] px-2 py-0.5 rounded ${i.severity === 'CRITICAL' ? 'bg-rose-600 text-white' : i.severity === 'HIGH' ? 'bg-orange-600 text-white' : i.severity === 'MEDIUM' ? 'bg-amber-500 text-black' : 'bg-gray-600 text-white'}`}>{i.severity}</span>
                        <div>{i.description}</div>
                      </div>
                      {i.action && <div className="text-xs text-gray-400 mt-0.5">إجراء مقترح: {i.action}</div>}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="font-medium mb-1">القياسات</div>
                <div className="text-xs text-gray-400">
                  <div>DOM Content Loaded: {latest.metrics.domContentLoadedMs ?? '-'} ms</div>
                  <div>Page Load: {latest.metrics.loadTimeMs ?? '-'} ms</div>
                  <div>JS Heap: {latest.metrics.jsHeapUsedMB ?? '-'} / {latest.metrics.jsHeapTotalMB ?? '-'} MB</div>
                  <div>Timestamp: {latest.metrics.timestamp ? new Date(latest.metrics.timestamp).toLocaleString('ar-SY-u-nu-latn') : '-'}</div>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => downloadCSV(latest)} className="px-3 py-1.5 rounded-md bg-sky-700 text-white text-xs">تصدير CSV</button>
                <button onClick={() => downloadPDF(latest)} className="px-3 py-1.5 rounded-md bg-purple-700 text-white text-xs">تصدير PDF</button>
              </div>
            </div>
          )}
        </div>
        <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <h2 className="font-medium mb-3">السجل</h2>
          <div className="overflow-auto">
            <table className="min-w-full text-right text-sm">
              <thead>
                <tr className="text-xs text-gray-500">
                  <th className="py-2 px-3 font-medium">المعرف</th>
                  <th className="py-2 px-3 font-medium">التاريخ</th>
                  <th className="py-2 px-3 font-medium">الفحوصات</th>
                  <th className="py-2 px-3 font-medium">القضايا</th>
                  <th className="py-2 px-3 font-medium">تصدير</th>
                </tr>
              </thead>
              <tbody>
                {reports.map(r => (
                  <tr id={`daily-${r.id}`} key={r.id} className={`border-b border-gray-700/30 ${focusId===r.id?'ring-2 ring-amber-500 animate-pulse':''}`}>
                    <td className="py-2 px-3 text-xs">{r.id}</td>
                    <td className="py-2 px-3 text-xs">{new Date(r.date).toLocaleString('ar-SY-u-nu-latn')}</td>
                    <td className="py-2 px-3 text-xs">{r.checks.length}</td>
                    <td className="py-2 px-3 text-xs">{r.issues.length}</td>
                    <td className="py-2 px-3 text-xs">
                      <button onClick={() => downloadCSV(r)} className="px-2 py-1 rounded-md bg-sky-700 text-white text-[11px]">CSV</button>
                      <button onClick={() => downloadPDF(r)} className="ml-2 px-2 py-1 rounded-md bg-purple-700 text-white text-[11px]">PDF</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DailyOperationsPage;
