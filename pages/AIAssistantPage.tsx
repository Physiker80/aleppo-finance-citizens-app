import React, { useMemo, useState, useContext } from 'react';
import { aiAssistant } from '../utils/aiAssistant';
import { AppContext } from '../App';

const AIAssistantPage: React.FC = () => {
  const app = useContext(AppContext);
  const [query, setQuery] = useState('');
  const [details, setDetails] = useState('');
  const [historyJson, setHistoryJson] = useState('');

  const reply = useMemo(() => (query ? aiAssistant.autoReply(query) : null), [query]);
  const routing = useMemo(() => (details ? aiAssistant.suggestDepartment(details) : null), [details]);
  const peaks = useMemo(() => {
    try {
      const parsed = historyJson ? JSON.parse(historyJson) : [];
      return aiAssistant.predictPeaks(parsed);
    } catch {
      return [];
    }
  }, [historyJson]);

  return (
    <div className="container mx-auto px-4">
      <h1 className="text-2xl font-bold mb-6">المساعد الذكي (تجريبي)</h1>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">الرد التلقائي على الاستفسارات الشائعة</h2>
        <textarea
          className="w-full p-3 rounded border bg-white/80 dark:bg-gray-800"
          placeholder="اكتب استفسارك هنا..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          rows={3}
        />
        {reply && (
          <div className="mt-3 p-3 rounded bg-green-50 dark:bg-green-900/30 border border-green-200/50">
            <div className="text-sm opacity-70">نية متوقعة: {reply.intent} — الثقة: {(reply.confidence * 100).toFixed(0)}%</div>
            <div className="mt-1">{reply.answer}</div>
          </div>
        )}
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">توجيه التذاكر للقسم المناسب</h2>
        <textarea
          className="w-full p-3 rounded border bg-white/80 dark:bg-gray-800"
          placeholder="اكتب تفاصيل التذكرة..."
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          rows={3}
        />
        {routing && (
          <div className="mt-3 p-3 rounded bg-blue-50 dark:bg-blue-900/30 border border-blue-200/50">
            <div>القسم المقترح: <span className="font-bold">{routing.department}</span></div>
            <div className="text-sm opacity-70">السبب: {routing.reason} — الثقة: {(routing.confidence * 100).toFixed(0)}%</div>
          </div>
        )}
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">التنبؤ بأوقات الذروة</h2>
        <textarea
          className="w-full p-3 rounded border bg-white/80 dark:bg-gray-800"
          placeholder='ألسّق بيانات تاريخية بصيغة JSON مثل [{"timestamp":"2025-09-23T08:00:00Z"},{"timestamp":"2025-09-23T09:30:00Z"}]'
          value={historyJson}
          onChange={(e) => setHistoryJson(e.target.value)}
          rows={4}
        />
        {!!peaks.length && (
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {peaks.map((p, idx) => (
              <div key={idx} className="p-3 rounded border bg-white/80 dark:bg-gray-800">
                <div className="font-bold">{p.label}</div>
                <div>الساعة: {p.hour}:00</div>
                <div className="text-sm opacity-70">الثقة: {(p.confidence * 100).toFixed(0)}%</div>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="text-xs opacity-60">
        هذا نموذج أولي يعمل محليًا بدون نماذج سحابية، ويمكن لاحقًا استبداله بموديلات أقوى عبر واجهات آمنة.
      </div>
    </div>
  );
};

export default AIAssistantPage;
