import React, { useMemo, useState } from 'react';
import Card from './ui/Card';
import { aiAssistant, type AutoReply, type RoutingSuggestion, type PeakPrediction } from '../utils/aiAssistant';
import { useDepartmentNames } from '../utils/departments';

type HistoryItem = { timestamp: string };

interface AIAssistPanelProps {
  title?: string;
  subtitle?: string;
  history?: HistoryItem[]; // For peak prediction
  className?: string;
}

const AIAssistPanel: React.FC<AIAssistPanelProps> = ({
  title = 'المساعد الذكي',
  subtitle = 'اقتراح ردود سريعة وتحديد القسم الأنسب وتحليل أوقات الذروة',
  history = [],
  className = ''
}) => {
  const [text, setText] = useState('');
  const [auto, setAuto] = useState<AutoReply | null>(null);
  const [route, setRoute] = useState<RoutingSuggestion | null>(null);
  const [peaks, setPeaks] = useState<PeakPrediction[] | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const departments = useDepartmentNames();
  const [selectedDept, setSelectedDept] = useState<string>('');

  const handleAnalyze = () => {
    const a = aiAssistant.autoReply(text);
    const r = aiAssistant.suggestDepartment(text);
    setAuto(a);
    setRoute(r);
    if (r?.department) setSelectedDept(r.department);
  };

  const handlePeaks = () => {
    const p = aiAssistant.predictPeaks(history || []);
    setPeaks(p);
  };

  const hasData = useMemo(() => (auto || route || (peaks && peaks.length)), [auto, route, peaks]);

  // Weekday sparkline based on history
  const weekdaySpark = useMemo(() => {
    const counts = new Array(7).fill(0);
    for (const h of history || []) {
      const d = new Date(h.timestamp);
      if (!isNaN(d.getTime())) counts[d.getDay()]++;
    }
    const max = Math.max(1, ...counts);
    const w = 140; const hgt = 36; const step = w / 6; // 7 points across width
    const points = counts.map((c, i) => {
      const x = i * step;
      const y = hgt - (c / max) * (hgt - 4) - 2; // padding 2px
      return `${x},${y}`;
    }).join(' ');
    return { counts, points, width: w, height: hgt };
  }, [history]);

  return (
    <Card className={`bg-white/20 dark:bg-gray-800/20 backdrop-blur rounded-2xl border border-gray-200/30 dark:border-gray-700/30 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">{title}</h3>
          <p className="text-xs text-gray-600 dark:text-gray-400">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCollapsed(c => !c)}
            className="px-3 py-1.5 rounded-lg text-sm bg-white/30 hover:bg-white/40 dark:bg-gray-700/40 dark:hover:bg-gray-700/60 text-gray-800 dark:text-gray-200 border border-gray-200/50 dark:border-gray-600/50"
            title={collapsed ? 'إظهار اللوحة' : 'إخفاء اللوحة'}
          >
            {collapsed ? 'إظهار' : 'إخفاء'}
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="space-y-4">
          <div>
            <label htmlFor="ai-assist-text" className="block text-sm mb-1 text-gray-700 dark:text-gray-300">نص الرسالة / تفاصيل الطلب</label>
            <textarea
              id="ai-assist-text"
              className="w-full min-h-[96px] p-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white/80 dark:bg-gray-800/70 text-gray-900 dark:text-gray-100"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="الصق نص الرسالة أو ملخص الطلب هنا..."
            />
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                onClick={handleAnalyze}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm"
                title="تحليل تلقائي للنص"
              >
                تحليل تلقائي
              </button>
              <button
                onClick={() => setRoute(aiAssistant.suggestDepartment(text))}
                className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-sm"
                title="اقتراح القسم المناسب"
              >
                اقتراح قسم
              </button>
              <button
                onClick={handlePeaks}
                className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm"
                title="عرض أوقات الذروة المتوقعة"
              >
                أوقات الذروة
              </button>
              {auto?.answer && (
                <>
                  <button
                    onClick={async () => { try { await navigator.clipboard.writeText(auto.answer); } catch {} }}
                    className="ml-auto px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs"
                    title="نسخ الرد المقترح"
                  >نسخ الرد</button>
                  <button
                    onClick={() => {
                      const ev = new CustomEvent('ai-assist-insert-reply', { detail: { text: auto.answer } });
                      window.dispatchEvent(ev);
                    }}
                    className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                    title="إدراج الرد في محرر الرد"
                  >إدراج في نموذج الرد</button>
                </>
              )}
            </div>
          </div>

          {hasData && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="relative overflow-hidden p-3 rounded-xl border border-emerald-200/50 dark:border-emerald-800/50 bg-emerald-50/50 dark:bg-emerald-900/10">
                <div className="absolute inset-y-0 right-0 w-1 bg-gradient-to-b from-emerald-300 via-emerald-500 to-emerald-600"></div>
                <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-emerald-300 via-emerald-500 to-emerald-600"></div>
                <div className="text-xs text-emerald-700 dark:text-emerald-300 mb-1">رد تلقائي</div>
                <div className="text-sm text-gray-800 dark:text-gray-100 min-h-[2.5rem]">
                  {auto?.answer || '—'}
                </div>
                {auto && (
                  <div className="mt-1 text-[10px] text-emerald-700/80 dark:text-emerald-300/80">الثقة: {(auto.confidence * 100).toFixed(0)}%</div>
                )}
              </div>

              <div className="relative overflow-hidden p-3 rounded-xl border border-cyan-200/50 dark:border-cyan-800/50 bg-cyan-50/50 dark:bg-cyan-900/10">
                <div className="absolute inset-y-0 right-0 w-1 bg-gradient-to-b from-cyan-300 via-cyan-500 to-cyan-600"></div>
                <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-cyan-300 via-cyan-500 to-cyan-600"></div>
                <div className="text-xs text-cyan-700 dark:text-cyan-300 mb-1">اقتراح تحويل</div>
                <div className="text-sm text-gray-800 dark:text-gray-100 min-h-[2.5rem] space-y-2">
                  {route ? (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-600 dark:text-gray-400">القسم المقترح:</span>
                        <span className="font-medium">{route.department}</span>
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">{route.reason}</div>
                      <div className="text-[10px] text-cyan-700/80 dark:text-cyan-300/80">الثقة: {(route.confidence * 100).toFixed(0)}%</div>
                    </>
                  ) : '—'}
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedDept}
                      onChange={(e) => setSelectedDept(e.target.value)}
                      className="px-2 py-1 rounded border border-gray-300 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 text-xs"
                      title="اختر القسم"
                    >
                      <option value="">— اختر القسم —</option>
                      {departments.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => {
                        if (!selectedDept) return;
                        const ev = new CustomEvent('ai-assist-select-department', { detail: { department: selectedDept } });
                        window.dispatchEvent(ev);
                      }}
                      className="px-3 py-1.5 rounded bg-cyan-600 hover:bg-cyan-700 text-white text-xs"
                    >تطبيق التحويل</button>
                  </div>
                </div>
              </div>

              <div className="relative overflow-hidden p-3 rounded-xl border border-indigo-200/50 dark:border-indigo-800/50 bg-indigo-50/50 dark:bg-indigo-900/10">
                <div className="absolute inset-y-0 right-0 w-1 bg-gradient-to-b from-indigo-300 via-indigo-500 to-indigo-600"></div>
                <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-indigo-300 via-indigo-500 to-indigo-600"></div>
                <div className="text-xs text-indigo-700 dark:text-indigo-300 mb-1">تحليل الذروة</div>
                <div className="text-sm text-gray-800 dark:text-gray-100 min-h-[2.5rem]">
                  {peaks && peaks.length ? (
                    <ul className="list-disc pr-5 space-y-0.5">
                      {peaks.map((p, i) => (
                        <li key={`${p.hour}-${i}`}>
                          {p.label}: الساعة {p.hour.toString().padStart(2, '0')}:00 — ثقة {(p.confidence * 100).toFixed(0)}%
                        </li>
                      ))}
                    </ul>
                  ) : '—'}
                </div>
                {/* Weekday sparkline */}
                <div className="mt-2">
                  <div className="text-[10px] text-gray-600 dark:text-gray-400 mb-1">نمط الأيام (السبت → الجمعة)</div>
                  <svg width={weekdaySpark.width} height={weekdaySpark.height} className="text-indigo-600 dark:text-indigo-400">
                    <polyline
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      points={weekdaySpark.points}
                    />
                  </svg>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

export default AIAssistPanel;
