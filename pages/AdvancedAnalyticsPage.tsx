import React, { useEffect, useMemo, useRef, useState, Suspense } from 'react';

// Lightweight inline chart primitives (SVG) to avoid extra deps
const LineChart: React.FC<{ data: Array<{ x: number; y: number }>; color?: string; width?: number; height?: number; pad?: number }> = ({ data, color = '#0ea5e9', width = 520, height = 160, pad = 8 }) => {
  if (!data.length) return <div className="h-40" />;
  const xs = data.map(d => d.x);
  const ys = data.map(d => d.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(0, ...ys), maxY = Math.max(...ys);
  const sx = (x: number) => pad + (maxX === minX ? 0 : (x - minX) / (maxX - minX)) * (width - pad * 2);
  const sy = (y: number) => height - pad - (maxY === minY ? 0 : (y - minY) / (maxY - minY)) * (height - pad * 2);
  const pts = data.map(d => `${sx(d.x).toFixed(1)},${sy(d.y).toFixed(1)}`).join(' ');
  return (
    <svg width={width} height={height} className="block">
      <rect x={0} y={0} width={width} height={height} fill="none" />
      <polyline fill="none" stroke={color} strokeWidth={2} points={pts} />
    </svg>
  );
};

const BarChart: React.FC<{ items: Array<{ label: string; value: number }>; width?: number; height?: number }>
  = ({ items, width = 520, height = 180 }) => {
  if (!items.length) return <div className="h-40" />;
  const max = Math.max(1, ...items.map(i => i.value));
  const bw = Math.max(6, Math.floor((width - 20) / items.length));
  return (
    <svg width={width} height={height} className="block">
      {items.map((it, i) => {
        const h = Math.round(((it.value / max) * (height - 30)));
        const x = 10 + i * bw;
        const y = height - 20 - h;
        return (
          <g key={i}>
            <rect x={x} y={y} width={bw - 2} height={h} fill="#16a34a" />
            <text x={x + (bw - 2) / 2} y={height - 6} fontSize="10" fill="#64748b" textAnchor="middle" style={{ direction: 'rtl' }}>
              {it.label.replace('/api/', '')}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

const AdvancedAnalyticsPage: React.FC = () => {
  const [series, setSeries] = useState<Array<{ minuteTs: number; total: number; routesTop?: Array<[string, number]> }>>([]);
  const [anoms, setAnoms] = useState<Array<{ minuteTs: number; count: number; z: number }>>([]);
  const [topRoutes, setTopRoutes] = useState<Array<{ route: string; count: number }>>([]);
  const [route, setRoute] = useState<string>('');
  const [routeLatency, setRouteLatency] = useState<{ route: string; count: number; avgMs: number|null; p50Ms: number|null; p95Ms: number|null; p99Ms: number|null } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [minutes, setMinutes] = useState<number>(120);

  const fetchJson = async (urls: string[]) => {
    for (const u of urls) {
      try { const r = await fetch(u); if (r.ok) return await r.json(); } catch {}
    }
    return null;
  };

  const refresh = async () => {
    setLoading(true); setError(null);
    try {
      const dash = await fetchJson(['/api/analytics/dashboard', 'http://localhost:4000/api/analytics/dashboard']);
      if (dash?.ok) {
        setSeries(dash.series || []);
        setTopRoutes(dash.topRoutes || []);
      }
      const an = await fetchJson([`/api/analytics/anomalies?window=60&z=3`, `http://localhost:4000/api/analytics/anomalies?window=60&z=3`]);
      if (an?.ok) setAnoms(an.items || []);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally { setLoading(false); }
  };

  useEffect(() => { refresh().catch(()=>{}); }, []);

  const timeseries = useMemo(() => {
    const tail = series.slice(-(minutes));
    return tail.map((s, i) => ({ x: i, y: s.total }));
  }, [series, minutes]);

  const anomaliesSeries = useMemo(() => anoms.map((a, i) => ({ x: i, y: a.count })), [anoms]);

  const runRouteLatency = async () => {
    const q = route.trim(); if (!q) { setRouteLatency(null); return; }
    const urls = [
      `http://localhost:4000/api/metrics-summary?route=${encodeURIComponent(q)}`,
      `/api/metrics-summary?route=${encodeURIComponent(q)}`
    ];
    for (const u of urls) {
      try {
        const key = (localStorage.getItem('obs_metrics_key') || '').trim() || (localStorage.getItem('obs_api_key') || '').trim();
        const r = await fetch(u, { headers: key ? { 'x-api-key': key } : undefined });
        if (r.ok) { const j = await r.json(); setRouteLatency(j?.routeLatency || null); break; }
      } catch {}
    }
  };

  return (
    <div className="container mx-auto px-4 py-8" dir="rtl">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">تحليلات متقدمة</h1>
        <div className="flex gap-2">
          <button onClick={()=>window.history.back()} className="px-3 py-2 rounded border border-gray-300 dark:border-gray-600 text-sm">رجوع</button>
          <button onClick={refresh} disabled={loading} className="px-3 py-2 rounded border border-gray-300 dark:border-gray-600 text-sm">{loading? 'جارٍ...' : 'تحديث'}</button>
        </div>
      </div>

      {error && <div className="mb-3 text-sm text-red-600 dark:text-red-400">{error}</div>}

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="font-semibold">الحجم عبر الزمن</div>
              <div className="text-xs text-gray-500">آخر {minutes} نقطة (دقيقة/نقطة)</div>
            </div>
            <select className="px-2 py-0.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm" value={minutes} onChange={e=>setMinutes(Number(e.target.value))}>
              <option value={60}>60</option>
              <option value={120}>120</option>
              <option value={240}>240</option>
            </select>
          </div>
          <LineChart data={timeseries} color="#0ea5e9" />
        </div>

        <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <div className="font-semibold mb-2">أبرز المسارات (حسب العدد)</div>
          <BarChart items={topRoutes.slice(0, 12).map(r => ({ label: r.route, value: r.count }))} />
        </div>

        <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <div className="font-semibold mb-2">الشذوذات (حجم الطلبات في نقاط الشذوذ)</div>
          <LineChart data={anomaliesSeries} color="#ef4444" />
        </div>

        <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <div className="font-semibold mb-2">تحليل زمن الاستجابة لمسار محدد</div>
          <div className="flex items-center gap-2 mb-2">
            <input value={route} onChange={(e)=>setRoute(e.target.value)} placeholder="/api/metrics-summary" className="flex-1 text-sm p-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800" />
            <button onClick={runRouteLatency} className="px-3 py-2 rounded border border-gray-300 dark:border-gray-600 text-sm">تحليل</button>
          </div>
          {routeLatency ? (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
              <div><div className="text-[11px] text-gray-500">count</div><div className="font-semibold">{routeLatency.count}</div></div>
              <div><div className="text-[11px] text-gray-500">avg</div><div className="font-semibold">{routeLatency.avgMs!=null?routeLatency.avgMs.toFixed(0):'—'} ms</div></div>
              <div><div className="text-[11px] text-gray-500">p50</div><div className="font-semibold">{routeLatency.p50Ms!=null?routeLatency.p50Ms.toFixed(0):'—'} ms</div></div>
              <div><div className="text-[11px] text-gray-500">p95</div><div className="font-semibold">{routeLatency.p95Ms!=null?routeLatency.p95Ms.toFixed(0):'—'} ms</div></div>
              <div><div className="text-[11px] text-gray-500">p99</div><div className="font-semibold">{routeLatency.p99Ms!=null?routeLatency.p99Ms.toFixed(0):'—'} ms</div></div>
            </div>
          ) : (
            <div className="text-sm text-gray-500">أدخل مساراً ثم اضغط تحليل لقراءة p50/p95/p99</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdvancedAnalyticsPage;
