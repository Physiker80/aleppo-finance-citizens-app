import React from 'react';
import Mermaid from './Mermaid';

interface IssueLite {
  id: number; title: string; priority: 'critical'|'high'|'medium'|'low'; status: string; dependencies: number[];
}
interface SecurityStatusPayload {
  ok: boolean;
  generatedAt?: string | null;
  nextReview?: string | null;
  totals: { all:number; critical:number; high:number; medium:number; low:number; planned:number; in_progress:number; done:number; deferred:number };
  percentCompleteCriticalPath: number;
  remainingWeightedSum: number;
  issues: IssueLite[];
  mermaid: string;
  error?: string;
}

const priorityLabel: Record<string,string> = { critical: 'حرج', high: 'عالي', medium: 'متوسط', low: 'منخفض' };
const statusLabel: Record<string,string> = { planned:'مخطط', in_progress:'قيد التنفيذ', done:'منجز', deferred:'مؤجل' };

const SecurityStatusPanel: React.FC = () => {
  const [data, setData] = React.useState<SecurityStatusPayload | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showGraph, setShowGraph] = React.useState<boolean>(() => {
    try { return (localStorage.getItem('sec_status_show_graph') || 'false') === 'true'; } catch { return false; }
  });
  const svgContainerRef = React.useRef<HTMLDivElement | null>(null);
  const [priorityFilter, setPriorityFilter] = React.useState<string>('all');
  const [statusFilter, setStatusFilter] = React.useState<string>('all');

  async function fetchStatus() {
    setLoading(true); setError(null);
    const urls = ['/api/security/status','http://localhost:4000/api/security/status'];
    for (const u of urls) {
      try {
        const r = await fetch(u);
        if (r.ok) {
          const j: SecurityStatusPayload = await r.json();
          setData(j); setLoading(false); return;
        }
      } catch {/* try next */}
    }
    setError('تعذر جلب حالة الأمن');
    setLoading(false);
  }

  React.useEffect(() => { fetchStatus(); }, []);

  const progress = data?.percentCompleteCriticalPath ?? 0;

  const filteredIssues = React.useMemo(() => {
    if (!data) return [] as IssueLite[];
    return data.issues.filter(i => {
      if (priorityFilter !== 'all' && i.priority !== priorityFilter) return false;
      if (statusFilter !== 'all' && i.status !== statusFilter) return false;
      return true;
    });
  }, [data, priorityFilter, statusFilter]);

  // Build filtered mermaid spec (if graph open)
  const filteredMermaid = React.useMemo(() => {
    if (!data || !showGraph) return '';
    const baseIssues = filteredIssues;
    const colorMap: Record<string,string> = { critical:'#dc2626', high:'#f97316', medium:'#facc15', low:'#6b7280' };
    const lines = ['graph TD'];
    const safeId = (id:number) => `I${id}`;
    // Add nodes (same style semantics as backend)
    const statusDeco = (s:string) => {
      switch(s){
        case 'done': return '((✓))';
        case 'in_progress': return '(~)';
        case 'planned': return '(?)';
        case 'deferred': return '([✕])';
        default: return '(?)';
      }
    };
    for (const iss of baseIssues) {
      const nid = safeId(iss.id);
      const label = `${iss.id}: ${iss.title}`.replace(/[:`]/g,'');
      lines.push(`${nid}${statusDeco(iss.status)}:::p${iss.priority}---${nid}Label(\"${label}\")`);
    }
    // Edges only if both ends pass filter
    const idSet = new Set(baseIssues.map(i=>i.id));
    for (const iss of baseIssues) {
      for (const dep of iss.dependencies || []) {
        if (idSet.has(dep)) lines.push(`${safeId(dep)} --> ${safeId(iss.id)}`);
      }
    }
    Object.entries(colorMap).forEach(([k,v])=> lines.push(`classDef p${k} fill:${v},stroke:#333,stroke-width:1,color:#fff;`));
    return lines.join('\n');
  }, [data, filteredIssues, showGraph]);

  React.useEffect(() => {
    try { localStorage.setItem('sec_status_show_graph', String(showGraph)); } catch {}
  }, [showGraph]);

  function exportSvg() {
    try {
      if (!showGraph) return;
      const host = svgContainerRef.current;
      if (!host) return;
      const svgEl = host.querySelector('svg');
      if (!svgEl) return alert('لم يتم العثور على رسم SVG بعد.');
      const clone = svgEl.cloneNode(true) as SVGSVGElement;
      // Add RTL direction note as metadata comment
      const serializer = new XMLSerializer();
      let svgText = serializer.serializeToString(clone);
      if (!svgText.includes('<?xml')) {
        svgText = `<?xml version="1.0" encoding="UTF-8"?>\n` + svgText;
      }
      const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const date = new Date().toISOString().slice(0,10);
      a.download = `security-deps-${date}.svg`;
      document.body.appendChild(a);
      a.click();
      setTimeout(()=>{ document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
    } catch (e:any) {
      alert('تعذر إنشاء ملف SVG: ' + (e?.message || e));
    }
  }

  return (
    <div className="p-4 rounded-lg border border-rose-700/40 bg-rose-950/20">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
        <h3 className="font-bold">مؤشرات التقدم الأمني</h3>
        <div className="flex items-center gap-2">
          <button onClick={fetchStatus} className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600">تحديث</button>
          <button onClick={()=>setShowGraph(s=>!s)} className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600">{showGraph?'إخفاء الرسم':'عرض الرسم'}</button>
          {showGraph && (
            <button onClick={()=>exportSvg()} className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600">تنزيل SVG</button>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-3 mb-4 text-xs">
        <label className="flex items-center gap-1">الأولوية:
          <select value={priorityFilter} onChange={e=>setPriorityFilter(e.target.value)} className="bg-gray-900 border border-gray-700 rounded px-1 py-0.5">
            <option value="all">الكل</option>
            <option value="critical">حرج</option>
            <option value="high">عالي</option>
            <option value="medium">متوسط</option>
            <option value="low">منخفض</option>
          </select>
        </label>
        <label className="flex items-center gap-1">الحالة:
          <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="bg-gray-900 border border-gray-700 rounded px-1 py-0.5">
            <option value="all">الكل</option>
            <option value="planned">مخطط</option>
            <option value="in_progress">قيد التنفيذ</option>
            <option value="done">منجز</option>
            <option value="deferred">مؤجل</option>
          </select>
        </label>
      </div>
      {loading && <div className="text-sm">جارٍ التحميل...</div>}
      {error && <div className="text-sm text-red-500">{error}</div>}
      {data && (
        <div className="space-y-4">
          <div className="grid md:grid-cols-4 gap-3 text-sm">
            <Kpi label="إجمالي قضايا" value={data.totals.all} />
            <Kpi label="قيد التنفيذ" value={data.totals.in_progress} />
            <Kpi label="مخطط" value={data.totals.planned} />
            <Kpi label="منجز" value={data.totals.done} />
          </div>
          <div>
            <div className="text-xs mb-1">اكتمل المسار الحرج</div>
            <div className="w-full h-3 rounded bg-gray-300/40 dark:bg-gray-700 overflow-hidden">
              <div className="h-full bg-green-600" style={{width: `${progress}%`}} />
            </div>
            <div className="text-xs mt-1 font-mono">{progress}%</div>
          </div>
          <div className="text-xs text-gray-300/80 space-x-2 rtl:space-x-reverse">
            <span className="inline-block px-2 py-0.5 rounded bg-[#dc2626] text-white">حرج: {data.totals.critical}</span>
            <span className="inline-block px-2 py-0.5 rounded bg-[#f97316] text-white">عالي: {data.totals.high}</span>
            <span className="inline-block px-2 py-0.5 rounded bg-[#facc15] text-gray-900">متوسط: {data.totals.medium}</span>
            <span className="inline-block px-2 py-0.5 rounded bg-[#6b7280] text-white">منخفض: {data.totals.low}</span>
          </div>
          <div className="text-xs text-gray-400">الوزن المتبقي (مؤشر المخاطر): {data.remainingWeightedSum}</div>
          <IssueTable issues={filteredIssues.slice(0,12)} />
          {showGraph && (
            <div className="mt-4" ref={svgContainerRef}>
              <Mermaid chart={filteredMermaid || data.mermaid} className="overflow-auto max-w-full" />
            </div>
          )}
          <div className="text-[10px] text-gray-500 mt-2">آخر تحديث بيانات: {data.generatedAt? new Date(data.generatedAt).toLocaleString('ar-SY-u-nu-latn'): '—'} | مراجعة قادمة: {data.nextReview? new Date(data.nextReview).toLocaleDateString('ar-SY-u-nu-latn') : '—'}</div>
        </div>
      )}
    </div>
  );
};

const Kpi: React.FC<{label:string; value: React.ReactNode}> = ({label,value}) => (
  <div className="p-3 rounded bg-black/30 border border-white/5">
    <div className="text-xs text-gray-400 mb-1">{label}</div>
    <div className="text-xl font-bold">{value}</div>
  </div>
);

const IssueTable: React.FC<{issues: IssueLite[]}> = ({ issues }) => {
  return (
    <div className="overflow-x-auto border border-gray-700/40 rounded">
      <table className="min-w-full text-xs">
        <thead className="bg-gray-800/40 text-gray-300">
          <tr>
            <th className="px-2 py-1 text-right">#</th>
            <th className="px-2 py-1 text-right">العنوان</th>
            <th className="px-2 py-1 text-right">الأولوية</th>
            <th className="px-2 py-1 text-right">الحالة</th>
            <th className="px-2 py-1 text-right">التبعيات</th>
          </tr>
        </thead>
        <tbody>
          {issues.map(i => {
            const criticalUnfinished = i.priority === 'critical' && i.status !== 'done';
            return (
              <tr key={i.id} className={"odd:bg-gray-800/20 " + (criticalUnfinished ? 'bg-red-900/30' : '')}>
                <td className="px-2 py-1 font-mono flex items-center gap-1">{i.id}{criticalUnfinished && (<span className="text-[9px] px-1 py-0.5 rounded bg-red-600 text-white">حرج</span>)}</td>
                <td className="px-2 py-1 max-w-[200px] truncate" title={i.title}>{i.title}</td>
                <td className="px-2 py-1">{priorityLabel[i.priority]}</td>
                <td className="px-2 py-1">{statusLabel[i.status] || i.status}</td>
                <td className="px-2 py-1 font-mono">{i.dependencies.length? i.dependencies.join(','): '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default SecurityStatusPanel;
