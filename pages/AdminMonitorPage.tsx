import React, { useContext, useMemo, useState } from 'react';
import { AppContext } from '../App';
import Card from '../components/ui/Card';
import { RequestStatus, Ticket, ContactMessageStatus } from '../types';

// دوال مساعدة لحساب الفروقات الزمنية
const diffMinutes = (a: Date, b: Date) => Math.max(0, (b.getTime() - a.getTime()) / 60000);
const formatDuration = (mins: number) => {
  if (!isFinite(mins) || mins <= 0) return '—';
  if (mins < 60) return `${Math.round(mins)} دقيقة`;
  const h = mins / 60;
  if (h < 24) return `${h.toFixed(1)} ساعة`;
  const d = h / 24;
  if (d < 30) return `${d.toFixed(1)} يوم`;
  const mo = d / 30;
  return `${mo.toFixed(1)} شهر`;
};

interface RangeFilter {
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
}

const todayISO = () => new Date().toISOString().slice(0,10);
const addDays = (base: Date, days: number) => new Date(base.getTime() + days*86400000);

// رسم مخطط أعمدة صغير باستخدام CSS فقط
const MiniBarChart: React.FC<{ data: { label: string; value: number; }[]; maxHeight?: number; }> = ({ data, maxHeight = 80 }) => {
  const maxVal = Math.max(1, ...data.map(d => d.value));
  return (
    <div className="flex items-end gap-1 h-24 mt-3">
      {data.map((d,i) => {
        const h = (d.value / maxVal) * maxHeight;
        return (
          <div key={i} className="flex flex-col items-center w-6">
            <div className="text-[10px] mb-1 tabular-nums text-gray-600 dark:text-gray-400" title={`${d.value}`}>{d.value}</div>
            <div className="w-4 rounded-t bg-gradient-to-t from-blue-400/50 to-blue-300 dark:from-blue-700 dark:to-blue-500 transition-all" style={{height: h || 2}} />
            <div className="text-[9px] mt-1 rotate-[-45deg] origin-top-right text-gray-500 dark:text-gray-500" title={d.label}>{d.label}</div>
          </div>
        );
      })}
    </div>
  );
};

const StatusBadge: React.FC<{ status: RequestStatus }> = ({ status }) => {
  const map: Record<RequestStatus,string> = {
    [RequestStatus.New]: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    [RequestStatus.InProgress]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
    [RequestStatus.Answered]: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    [RequestStatus.Closed]: 'bg-gray-200 text-gray-800 dark:bg-gray-700/40 dark:text-gray-300',
  };
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${map[status]}`}>{status}</span>;
};

const AdminMonitorPage: React.FC = () => {
  const ctx = useContext(AppContext);
  const tickets = ctx?.tickets || [];
  const messages = ctx?.contactMessages || [];
  const notifications = ctx?.notifications || [];

  const [range, setRange] = useState<RangeFilter>(() => {
    const to = todayISO();
    const from = new Date();
    from.setDate(from.getDate() - 30);
    return { from: from.toISOString().slice(0,10), to };
  });
  const [departmentFilter, setDepartmentFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const rangedTickets = useMemo(() => {
    const fromDate = new Date(range.from + 'T00:00:00');
    const toDate = new Date(range.to + 'T23:59:59');
    return tickets.filter(t => {
      const inRange = t.submissionDate >= fromDate && t.submissionDate <= toDate;
      if (!inRange) return false;
      if (departmentFilter && String(t.department) !== departmentFilter) return false;
      if (statusFilter && t.status !== statusFilter) return false;
      return true;
    });
  }, [tickets, range, departmentFilter, statusFilter]);

  // مجموعات حسب الحالة
  const byStatus = useMemo(() => {
    const base: Record<RequestStatus, Ticket[]> = {
      [RequestStatus.New]: [],
      [RequestStatus.InProgress]: [],
      [RequestStatus.Answered]: [],
      [RequestStatus.Closed]: [],
    };
    rangedTickets.forEach(t => { base[t.status].push(t); });
    return base;
  }, [rangedTickets]);

  // متوسط زمن بدء المعالجة (من تاريخ الإرسال إلى startedAt)
  const avgStartMins = useMemo(() => {
    const diffs: number[] = [];
    rangedTickets.forEach(t => { if (t.startedAt) diffs.push(diffMinutes(t.submissionDate, t.startedAt)); });
    if (!diffs.length) return 0;
    return diffs.reduce((a,b)=>a+b,0)/diffs.length;
  }, [rangedTickets]);

  // متوسط أول رد (submission -> answeredAt)
  const avgFirstAnswerMins = useMemo(() => {
    const diffs: number[] = [];
    rangedTickets.forEach(t => { if (t.answeredAt) diffs.push(diffMinutes(t.submissionDate, t.answeredAt)); });
    if (!diffs.length) return 0;
    return diffs.reduce((a,b)=>a+b,0)/diffs.length;
  }, [rangedTickets]);

  // متوسط الإغلاق (submission -> closedAt)
  const avgClosureMins = useMemo(() => {
    const diffs: number[] = [];
    rangedTickets.forEach(t => { if (t.closedAt) diffs.push(diffMinutes(t.submissionDate, t.closedAt)); });
    if (!diffs.length) return 0;
    return diffs.reduce((a,b)=>a+b,0)/diffs.length;
  }, [rangedTickets]);

  // تذاكر متقادمة (جديد ولم يبدأ بعد لأكثر من X يوم)
  const STALE_DAYS = 3;
  const staleCount = useMemo(() => {
    const now = new Date();
    return rangedTickets.filter(t => t.status === RequestStatus.New && diffMinutes(t.submissionDate, now) > STALE_DAYS*24*60).length;
  }, [rangedTickets]);

  // التوزيع حسب القسم
  const deptDistribution = useMemo(() => {
    const map = new Map<string, number>();
    rangedTickets.forEach(t => { map.set(String(t.department), (map.get(String(t.department))||0) + 1); });
    return Array.from(map.entries()).sort((a,b)=>b[1]-a[1]);
  }, [rangedTickets]);

  // آخر 14 يوم
  const LATN_LOCALE = 'ar-SY-u-nu-latn';
  const last14DaysChart = useMemo(() => {
    const arr: { label: string; value: number; date: string; }[] = [];
    const now = new Date();
    for (let i=13;i>=0;i--) {
      const d = addDays(now, -i);
      const label = d.toLocaleDateString(LATN_LOCALE, { month: 'numeric', day: 'numeric' });
      const iso = d.toISOString().slice(0,10);
      const v = tickets.filter(t => t.submissionDate.toISOString().slice(0,10) === iso).length;
      arr.push({ label, value: v, date: iso });
    }
    return arr;
  }, [tickets]);

  // رسائل التواصل ضمن النطاق
  const rangedMessages = useMemo(() => {
    const fromDate = new Date(range.from + 'T00:00:00');
    const toDate = new Date(range.to + 'T23:59:59');
    return messages.filter(m => m.submissionDate >= fromDate && m.submissionDate <= toDate);
  }, [messages, range]);

  const messageByStatus = useMemo(() => {
    const base: Record<ContactMessageStatus, number> = {
      [ContactMessageStatus.New]: 0,
      [ContactMessageStatus.InProgress]: 0,
      [ContactMessageStatus.Closed]: 0,
    };
    rangedMessages.forEach(m => { base[m.status]++; });
    return base;
  }, [rangedMessages]);

  // معدل إنجاز = نسبة التذاكر المغلقة ضمن النطاق
  const completionRate = rangedTickets.length ? (byStatus[RequestStatus.Closed].length / rangedTickets.length)*100 : 0;

  // إشعارات جديدة غير مقروءة
  const unreadNotifications = notifications.filter(n=>!n.read).length;

  const departmentsList = useMemo(() => {
    try {
      const raw = localStorage.getItem('departmentsList');
      if (!raw) return [] as string[];
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch { return [];}  
  }, []);

  // --- "تحليل ذكي" (محلي – محاكاة) ---
  // لا يوجد اتصال بخدمة خارجية هنا؛ نطبّق قواعد تقييم لإعطاء درجة ونصائح.
  interface AiAnalysisResult {
    score: number; // 0 - 100
    grade: string; // توصيف موجز
    color: string; // Tailwind color classes للاستخدام النصي
    summary: string;
    recommendations: string[];
    factors: { label: string; value: number; weight: number; partial: number; explain: string; }[];
  }

  const [analysisSeed, setAnalysisSeed] = useState(0); // لتغيير التنويع النصي

  const aiAnalysis = useMemo<AiAnalysisResult>(() => {
    // عوامل قابلة للقياس
    const total = rangedTickets.length;
    const open = total ? total - byStatus[RequestStatus.Closed].length : 0;
    const openRatio = total ? open / total : 0; // أقل أفضل
    const closureRatio = total ? byStatus[RequestStatus.Closed].length / total : 0; // أعلى أفضل
    const avgStart = avgStartMins; // بالدقائق
    const avgAnswer = avgFirstAnswerMins;
    const avgClose = avgClosureMins;
    const staleRatio = total ? staleCount / total : 0; // أقل أفضل

    // تحويل القيم إلى درجات 0-100 بخوارزميات بسيطة (منحنيات قطعية)
    const speedScore = avgAnswer === 0 ? 50 : Math.max(0, Math.min(100, 100 - (avgAnswer / 60) * 15)); // كل ساعة تخفض 15 نقطة تقريبا
    const startScore = avgStart === 0 ? 50 : Math.max(0, Math.min(100, 100 - (avgStart / 60) * 12));
    const closureScore = Math.max(0, Math.min(100, closureRatio * 110)); // سماح بتجاوز بسيط لو عالي
    const backlogScore = Math.max(0, Math.min(100, 100 - openRatio * 120));
    const staleScore = Math.max(0, Math.min(100, 100 - staleRatio * 160));
    const durationPenalty = avgClose ? Math.max(0, 100 - (avgClose / (60 * 24)) * 8) : 60; // كل يوم يقلل 8 نقاط

    // أوزان
    const factors = [
      { label: 'سرعة أول رد', value: avgAnswer, weight: 0.18, partial: speedScore * 0.18, explain: `متوسط أول رد: ${formatDuration(avgAnswer)}` },
      { label: 'زمن بدء المعالجة', value: avgStart, weight: 0.12, partial: startScore * 0.12, explain: `متوسط بدء: ${formatDuration(avgStart)}` },
      { label: 'معدل الإغلاق', value: closureRatio, weight: 0.25, partial: closureScore * 0.25, explain: `معدل الإغلاق: ${(closureRatio*100).toFixed(1)}%` },
      { label: 'حجم التكدس (مفتوح)', value: openRatio, weight: 0.2, partial: backlogScore * 0.2, explain: `نسبة المفتوح: ${(openRatio*100).toFixed(1)}%` },
      { label: 'تذاكر متقادمة', value: staleRatio, weight: 0.15, partial: staleScore * 0.15, explain: `نسبة المتقادمة: ${(staleRatio*100).toFixed(1)}%` },
      { label: 'مدة الإغلاق', value: avgClose, weight: 0.1, partial: durationPenalty * 0.1, explain: `متوسط الإغلاق: ${formatDuration(avgClose)}` },
    ];
    const rawScore = factors.reduce((a,f) => a + f.partial, 0);
    const score = Math.round(Math.max(0, Math.min(100, rawScore)));

    let grade: string; let color: string; let summary: string;
    if (score >= 85) { grade = 'ممتاز'; color = 'text-emerald-600 dark:text-emerald-400'; summary = 'الأداء العام مرتفع مع استجابة فعّالة وإغلاق جيد.'; }
    else if (score >= 70) { grade = 'جيد'; color = 'text-blue-600 dark:text-blue-400'; summary = 'الأداء مستقر؛ توجد مجالات لتحسين السرعة وتقليل التكدس.'; }
    else if (score >= 55) { grade = 'مقبول'; color = 'text-amber-600 dark:text-amber-400'; summary = 'مستوى متوسط، يلزم تدخل لتحسين أزمنة الرد ورفع الإغلاق.'; }
    else { grade = 'حرِج'; color = 'text-red-600 dark:text-red-400'; summary = 'المؤشرات تشير إلى بطء وتكدس؛ يلزم خطة عاجلة.'; }

    const recs: string[] = [];
    if (speedScore < 60) recs.push('تخصيص فريق مناوبة لتسريع أول رد وتقليل الزمن الابتدائي.');
    if (backlogScore < 65) recs.push('تصفية التكدس الحالي عبر حملة معالجة مركّزة (فرز سريع ثم تحويل).');
    if (staleScore < 70) recs.push('مراجعة التذاكر المتقادمة يومياً وتعيين أولوية فورية لها.');
    if (closureScore < 70) recs.push('تحديد هدف إغلاق أسبوعي واضح وربطه بتقارير متابعة.');
    if (durationPenalty < 65) recs.push('تحليل أسباب الإطالة في دورة حياة التذكرة (مراحل الانتظار، نقص معلومات).');
    if (!recs.length && score >= 85) recs.push('استمر بنفس المنهج لكن أضف مراقبة استباقية لمنع التراجع.');
    if (!recs.length) recs.push('تجميع مزيد من البيانات لتحسين دقة التوصيات.');

    // تنويع طفيف بالصياغة بناء على seed
    const variants = [
      'تم التقييم استناداً إلى مؤشرات زمنية ونسب تشغيلية محلية (بدون اتصال خارجي).',
      'الخلاصة مبنية على نموذج ترجيح داخلي يحاكي التحليل الذكي.',
      'الحسابات تتم محلياً وتعتمد تحويل الأرقام إلى درجات مُطبَّعة 0-100.'
    ];
    const variant = variants[analysisSeed % variants.length];
    recs.push(variant);

    return { score, grade, color, summary, recommendations: recs, factors };
  }, [rangedTickets, byStatus, avgStartMins, avgFirstAnswerMins, avgClosureMins, completionRate, staleCount, analysisSeed]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end gap-6">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">مركز المراقبة والتحليلات</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">نظرة شاملة مباشرة عن أداء النظام وحركة الطلبات والرسائل.</p>
        </div>
        <Card className="w-full md:w-auto md:min-w-[380px] flex flex-col gap-3">
          <div className="flex gap-3">
            <label className="flex flex-col text-xs font-medium flex-1">من
              <input type="date" value={range.from} max={range.to} onChange={e=>setRange(r=>({...r, from: e.target.value}))} className="mt-1 rounded border-gray-300 dark:border-gray-600 bg-white/70 dark:bg-gray-800/70 text-sm" />
            </label>
            <label className="flex flex-col text-xs font-medium flex-1">إلى
              <input type="date" value={range.to} min={range.from} max={todayISO()} onChange={e=>setRange(r=>({...r, to: e.target.value}))} className="mt-1 rounded border-gray-300 dark:border-gray-600 bg-white/70 dark:bg-gray-800/70 text-sm" />
            </label>
          </div>
          <div className="flex gap-3">
            <label className="flex flex-col text-xs font-medium flex-1">القسم
              <select value={departmentFilter} onChange={e=>setDepartmentFilter(e.target.value)} className="mt-1 rounded border-gray-300 dark:border-gray-600 bg-white/70 dark:bg-gray-800/70 text-sm">
                <option value="">الكل</option>
                {departmentsList.map(d=> <option key={d} value={d}>{d}</option>)}
              </select>
            </label>
            <label className="flex flex-col text-xs font-medium flex-1">الحالة
              <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="mt-1 rounded border-gray-300 dark:border-gray-600 bg-white/70 dark:bg-gray-800/70 text-sm">
                <option value="">الكل</option>
                {Object.values(RequestStatus).map(s=> <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
          </div>
          <div className="flex gap-2 flex-wrap text-[11px] text-gray-600 dark:text-gray-400">
            <span>التذاكر ضمن النطاق: <strong>{rangedTickets.length}</strong></span>
            <span>الرسائل: <strong>{rangedMessages.length}</strong></span>
            <span>إشعارات غير مقروءة: <strong>{unreadNotifications}</strong></span>
          </div>
        </Card>
      </div>

      {/* مؤشرات عليا */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">إجمالي التذاكر (النطاق)</h3>
          <p className="mt-3 text-3xl font-bold text-blue-600 dark:text-blue-400 tabular-nums">{rangedTickets.length}</p>
          <div className="mt-2 flex gap-2 flex-wrap text-xs">
            {Object.values(RequestStatus).map(s => (
              <span key={s} className="px-2 py-0.5 rounded bg-white/50 dark:bg-gray-800/60 border border-white/30 dark:border-gray-700/50">{s}: {byStatus[s as RequestStatus].length}</span>
            ))}
          </div>
        </Card>
        <Card>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">متوسط زمن أول معالجة</h3>
          <p className="mt-3 text-3xl font-bold text-amber-600 dark:text-amber-400">{formatDuration(avgStartMins)}</p>
          <p className="mt-2 text-[11px] text-gray-500 dark:text-gray-400">من الإرسال إلى بدء المعالجة</p>
        </Card>
        <Card>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">متوسط زمن أول رد</h3>
          <p className="mt-3 text-3xl font-bold text-green-600 dark:text-green-400">{formatDuration(avgFirstAnswerMins)}</p>
          <p className="mt-2 text-[11px] text-gray-500 dark:text-gray-400">من الإرسال إلى الرد</p>
        </Card>
        <Card>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">معدل الإغلاق</h3>
          <p className="mt-3 text-3xl font-bold text-indigo-600 dark:text-indigo-400">{completionRate.toFixed(1)}%</p>
          <p className="mt-2 text-[11px] text-gray-500 dark:text-gray-400">مغلق / إجمالي التذاكر</p>
        </Card>
      </div>

      {/* مخطط 14 يوم */}
      <Card>
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">التذاكر خلال آخر 14 يوم</h3>
        <MiniBarChart data={last14DaysChart} />
        <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
          إجمالي: {last14DaysChart.reduce((a,b)=>a+b.value,0)} • متوسط يومي: {(last14DaysChart.reduce((a,b)=>a+b.value,0)/14).toFixed(2)}
        </div>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* توزيع حسب القسم */}
        <Card className="xl:col-span-1">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">أعلى الأقسام (عدد التذاكر)</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {deptDistribution.slice(0,8).map(([dep,count],i) => {
              const pct = rangedTickets.length ? (count / rangedTickets.length)*100 : 0;
              return (
                <li key={dep} className="flex flex-col">
                  <div className="flex justify-between"><span className="font-medium truncate">{i+1}. {dep || 'غير محدد'}</span><span className="tabular-nums text-gray-600 dark:text-gray-400">{count} ({pct.toFixed(1)}%)</span></div>
                  <div className="h-2 rounded bg-gray-200 dark:bg-gray-700 overflow-hidden mt-1">
                    <div className="h-full bg-gradient-to-r from-blue-500 to-blue-300 dark:from-blue-600 dark:to-blue-400" style={{width: pct+'%'}} />
                  </div>
                </li>
              );
            })}
            {!deptDistribution.length && <li className="text-gray-500 dark:text-gray-400">لا توجد بيانات</li>}
          </ul>
        </Card>

        {/* أعمار التذاكر و التذاكر المتقادمة */}
        <Card className="xl:col-span-1">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">الصحة التشغيلية</h3>
          <div className="mt-4 space-y-4 text-sm">
            <div className="flex justify-between"><span>تذاكر جديدة متقادمة (&gt; {STALE_DAYS} أيام)</span><span className="font-semibold text-red-600 dark:text-red-400">{staleCount}</span></div>
            <div className="flex justify-between"><span>عدد التذاكر قيد المعالجة</span><span className="font-semibold">{byStatus[RequestStatus.InProgress].length}</span></div>
            <div className="flex justify-between"><span>عدد التذاكر المفتوحة (غير مغلقة)</span><span className="font-semibold">{rangedTickets.length - byStatus[RequestStatus.Closed].length}</span></div>
            <div className="flex justify-between"><span>متوسط زمن الإغلاق</span><span className="font-semibold">{formatDuration(avgClosureMins)}</span></div>
            <div className="flex justify-between"><span>إجمالي الإشعارات (الكل)</span><span className="font-semibold">{notifications.length}</span></div>
            <div className="flex justify-between"><span>غير مقروء</span><span className="font-semibold">{unreadNotifications}</span></div>
          </div>
        </Card>

        {/* رسائل التواصل */}
        <Card className="xl:col-span-1">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">رسائل التواصل (النطاق)</h3>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between"><span>إجمالي</span><span className="font-semibold">{rangedMessages.length}</span></div>
            <div className="flex justify-between"><span>جديد</span><span className="font-semibold">{messageByStatus[ContactMessageStatus.New]}</span></div>
            <div className="flex justify-between"><span>قيد المعالجة</span><span className="font-semibold">{messageByStatus[ContactMessageStatus.InProgress]}</span></div>
            <div className="flex justify-between"><span>مغلق</span><span className="font-semibold">{messageByStatus[ContactMessageStatus.Closed]}</span></div>
          </div>
          <div className="mt-5">
            <h4 className="text-sm font-semibold mb-2">أحدث 5 رسائل</h4>
            <ul className="space-y-2 text-xs max-h-48 overflow-auto pr-1">
              {rangedMessages.slice().sort((a,b)=> b.submissionDate.getTime() - a.submissionDate.getTime()).slice(0,5).map(m => (
                <li key={m.id} className="p-2 rounded bg-white/60 dark:bg-gray-800/60 border border-white/30 dark:border-gray-700/40">
                  <div className="flex justify-between"><span className="font-medium truncate" title={m.subject || m.type}>{m.subject || m.type}</span><span className="text-gray-500 dark:text-gray-400 ml-2 rtl:ml-0 rtl:mr-2">{m.submissionDate.toLocaleDateString(LATN_LOCALE, { month: 'short', day: 'numeric'})}</span></div>
                  <div className="mt-1 line-clamp-2 text-gray-600 dark:text-gray-400" style={{display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical'}}>{m.message}</div>
                </li>
              ))}
              {!rangedMessages.length && <li className="text-gray-500 dark:text-gray-400">لا توجد رسائل</li>}
            </ul>
          </div>
        </Card>
      </div>

      {/* جدول عينات لأحدث التذاكر */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">أحدث التذاكر (10)</h3>
          <div className="text-xs text-gray-500 dark:text-gray-400">يتم تطبيق نفس مرشحات النطاق/القسم/الحالة</div>
        </div>
        <div className="overflow-auto rounded border border-white/30 dark:border-gray-700/40">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 dark:bg-gray-800/70 text-gray-700 dark:text-gray-300">
              <tr className="text-xs">
                <th className="px-3 py-2 text-right">المعرف</th>
                <th className="px-3 py-2 text-right">الاسم</th>
                <th className="px-3 py-2 text-right">القسم</th>
                <th className="px-3 py-2 text-right">الحالة</th>
                <th className="px-3 py-2 text-right">تاريخ الإرسال</th>
                <th className="px-3 py-2 text-right">بدء</th>
                <th className="px-3 py-2 text-right">رد</th>
                <th className="px-3 py-2 text-right">إغلاق</th>
                <th className="px-3 py-2 text-right">زمن أول رد</th>
                <th className="px-3 py-2 text-right">زمن الإغلاق</th>
              </tr>
            </thead>
            <tbody>
              {rangedTickets.slice().sort((a,b)=> b.submissionDate.getTime() - a.submissionDate.getTime()).slice(0,10).map(t => {
                const firstAns = t.answeredAt ? formatDuration(diffMinutes(t.submissionDate, t.answeredAt)) : '—';
                const closureDur = t.closedAt ? formatDuration(diffMinutes(t.submissionDate, t.closedAt)) : '—';
                return (
                  <tr key={t.id} className="odd:bg-white/70 even:bg-white/40 dark:odd:bg-gray-900/50 dark:even:bg-gray-900/30 border-b border-white/20 dark:border-gray-800/60">
                    <td className="px-3 py-1.5 font-mono text-xs whitespace-nowrap">{t.id}</td>
                    <td className="px-3 py-1.5 whitespace-nowrap max-w-[140px] truncate" title={t.fullName}>{t.fullName}</td>
                    <td className="px-3 py-1.5 whitespace-nowrap max-w-[120px] truncate" title={t.department}>{t.department}</td>
                    <td className="px-3 py-1.5 whitespace-nowrap"><StatusBadge status={t.status} /></td>
                    <td className="px-3 py-1.5 whitespace-nowrap" title={t.submissionDate.toLocaleString()}>{t.submissionDate.toLocaleDateString(LATN_LOCALE,{month:'short',day:'numeric'})}</td>
                    <td className="px-3 py-1.5 whitespace-nowrap" title={t.startedAt?.toLocaleString() || ''}>{t.startedAt ? t.startedAt.toLocaleDateString(LATN_LOCALE,{month:'short',day:'numeric'}) : '—'}</td>
                    <td className="px-3 py-1.5 whitespace-nowrap" title={t.answeredAt?.toLocaleString() || ''}>{t.answeredAt ? t.answeredAt.toLocaleDateString(LATN_LOCALE,{month:'short',day:'numeric'}) : '—'}</td>
                    <td className="px-3 py-1.5 whitespace-nowrap" title={t.closedAt?.toLocaleString() || ''}>{t.closedAt ? t.closedAt.toLocaleDateString(LATN_LOCALE,{month:'short',day:'numeric'}) : '—'}</td>
                    <td className="px-3 py-1.5 whitespace-nowrap">{firstAns}</td>
                    <td className="px-3 py-1.5 whitespace-nowrap">{closureDur}</td>
                  </tr>
                );
              })}
              {!rangedTickets.length && (
                <tr>
                  <td colSpan={10} className="text-center py-6 text-gray-500 dark:text-gray-400">لا توجد بيانات ضمن نطاق البحث.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* كرت التحليل الذكي */}
      <Card>
        <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">تحليل ذكي للأداء التشغيلي</h3>
          <button
            onClick={() => setAnalysisSeed(s => s + 1)}
            className="text-xs px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white shadow focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >تحديث التقييم</button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">درجة مركبة (0–100)</p>
              <div className="mt-2 flex items-end gap-4">
                <div className="text-5xl font-extrabold tabular-nums leading-none select-all {aiAnalysis.color}"><span className={aiAnalysis.color}>{aiAnalysis.score}</span></div>
                <div className="mb-1">
                  <div className={`text-xl font-bold ${aiAnalysis.color}`}>{aiAnalysis.grade}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{aiAnalysis.summary}</div>
                </div>
              </div>
              <div className="mt-4 h-3 rounded bg-gray-200 dark:bg-gray-700 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-red-500 via-amber-400 to-emerald-500" style={{width: aiAnalysis.score + '%'}} />
              </div>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">العوامل المساهمة</h4>
              <ul className="space-y-1.5 text-xs">
                {aiAnalysis.factors.map(f => (
                  <li key={f.label} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-0.5 p-2 rounded bg-white/60 dark:bg-gray-800/60 border border-white/30 dark:border-gray-700/40">
                    <div className="font-medium text-gray-800 dark:text-gray-200">{f.label}</div>
                    <div className="flex items-center gap-3 text-[11px] text-gray-600 dark:text-gray-400">
                      <span>{f.explain}</span>
                      <span className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-800/30 text-indigo-700 dark:text-indigo-300 font-semibold">{(f.partial).toFixed(1)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="lg:col-span-3 space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">التوصيات</h4>
              <ul className="list-disc pr-5 space-y-1 text-sm text-gray-700 dark:text-gray-300 marker:text-indigo-500 dark:marker:text-indigo-300">
                {aiAnalysis.recommendations.map((r,i) => <li key={i}>{r}</li>)}
              </ul>
            </div>
            <div className="text-[11px] text-gray-500 dark:text-gray-500 leading-relaxed bg-gray-50 dark:bg-gray-800/40 p-3 rounded border border-gray-200 dark:border-gray-700">
              هذا التحليل محلي (لا يتم إرسال البيانات لخادم خارجي). الصيغة تستعمل تحويلات قياسية لزمن الرد، الإغلاق، نسبة التكدس ونسبة التذاكر المتقادمة لإنتاج درجة نهائية مرجعية.
            </div>
          </div>
        </div>
      </Card>

      <div className="text-[11px] text-gray-500 dark:text-gray-500 leading-relaxed">
        ملاحظات: يتم الاعتماد على الطوابع الزمنية المخزنة محلياً. أي حذف لبيانات التخزين المحلي (LocalStorage) سيُفقد السجل التاريخي. يُنصح بنسخ احتياطي دوري أو ترحيل هذه البيانات إلى واجهة برمجية خلفية مستقبلية.
      </div>
    </div>
  );
};

export default AdminMonitorPage;
