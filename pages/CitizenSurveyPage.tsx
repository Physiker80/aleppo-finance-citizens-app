import React, { useContext, useMemo, useState } from 'react';
import { AppContext } from '../App';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import TextArea from '../components/ui/TextArea';
import Button from '../components/ui/Button';
import { CitizenSurvey } from '../types';

const ratingOptions = [1,2,3,4,5];

const CitizenSurveyPage: React.FC = () => {
  const app = useContext(AppContext);
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [wouldRecommend, setWouldRecommend] = useState<string>('');
  const [ticketId, setTicketId] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [category, setCategory] = useState('');
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const surveys = app?.surveys || [];

  const stats = useMemo(() => {
    if (!surveys.length) return { avg: 0, count: 0, dist: {} as Record<number, number>, recommendYes: 0, recommendTotal: 0 };
    const dist: Record<number, number> = {1:0,2:0,3:0,4:0,5:0};
    let sum = 0; let recommendYes = 0; let recommendTotal = 0;
    surveys.forEach(s => { dist[s.rating] = (dist[s.rating]||0)+1; sum += s.rating; if (typeof s.wouldRecommend === 'boolean') { recommendTotal++; if (s.wouldRecommend) recommendYes++; }});
    return { avg: sum / surveys.length, count: surveys.length, dist, recommendYes, recommendTotal };
  }, [surveys]);

  const resetForm = () => {
    setRating(null); setComment(''); setWouldRecommend(''); setTicketId(''); setContactEmail(''); setCategory('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!app) return;
    if (!rating) { setError('الرجاء اختيار تقييم من 1 إلى 5'); return; }
    setError(null);
    setSubmitting(true);
    const id = app.addSurvey({ rating, comment: comment.trim() || undefined, wouldRecommend: wouldRecommend? wouldRecommend==='yes': undefined, ticketId: ticketId.trim() || undefined, contactEmail: contactEmail.trim() || undefined, category: category.trim() || undefined });
    setTimeout(() => {
      setSubmitting(false);
      setSubmittedId(id);
      resetForm();
    }, 400);
  };

  return (
    <div className="space-y-8">
      <Card className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">استبيان رضا المواطنين</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">نقدّر رأيك. يساعدنا هذا الاستبيان في تحسين جودة الخدمة. لن يستغرق أكثر من دقيقة واحدة.</p>
        {submittedId && (
          <div className="mb-6 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 text-green-700 dark:text-green-300">
            <p className="font-semibold">شكراً لمشاركتك! تم تسجيل الاستبيان بنجاح.</p>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block font-medium mb-2">التقييم العام للخدمة *</label>
            <div className="flex flex-row-reverse justify-end gap-3">
              {ratingOptions.map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRating(r)}
                  className={`w-12 h-12 rounded-full text-lg font-bold transition-all border ${rating===r? 'bg-[#0f3c35] text-white border-[#0f3c35]' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 border-gray-300 dark:border-gray-600'}`}
                  aria-label={`تقييم ${r}`}
                >{r}</button>
              ))}
            </div>
            <p className="mt-2 text-sm text-gray-500">1 = سيئ جداً، 5 = ممتاز</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <Input id="ticketId" label="رقم الطلب (اختياري)" value={ticketId} onChange={e=>setTicketId(e.target.value)} placeholder="إن وجد" />
            <Input id="contactEmail" label="بريد للتواصل (اختياري)" type="email" value={contactEmail} onChange={e=>setContactEmail(e.target.value)} placeholder="example@mail.com" />
          </div>
          <Input id="category" label="نوع المعاملة / القسم (اختياري)" value={category} onChange={e=>setCategory(e.target.value)} placeholder="مثال: الديوان العام" />
          <div>
            <label className="block font-medium mb-2">هل توصي بالخدمة لغيرك؟ (اختياري)</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="wouldRecommend" value="yes" checked={wouldRecommend==='yes'} onChange={e=>setWouldRecommend(e.target.value)} />
                <span>نعم</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="wouldRecommend" value="no" checked={wouldRecommend==='no'} onChange={e=>setWouldRecommend(e.target.value)} />
                <span>لا</span>
              </label>
              <button type="button" onClick={()=>setWouldRecommend('')} className="text-xs text-gray-500 hover:underline">مسح</button>
            </div>
          </div>
          <TextArea id="comment" label="ملاحظات إضافية (اختياري)" value={comment} onChange={e=>setComment(e.target.value)} placeholder="اكتب رأيك هنا" className="min-h-[120px]" />
          {error && <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded text-red-700 dark:text-red-300 text-sm">{error}</div>}
          <div>
            <Button type="submit" disabled={submitting || !rating} className="w-full py-4 text-lg font-semibold">
              {submitting ? 'جاري الإرسال...' : 'إرسال الاستبيان'}
            </Button>
          </div>
        </form>
      </Card>

      <Card className="max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold mb-6">إحصاءات سريعة</h2>
        {stats.count === 0 ? (
          <p className="text-gray-500">لا توجد بيانات بعد.</p>
        ) : (
          <div className="space-y-6">
            <div className="grid sm:grid-cols-3 gap-6">
              <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-center">
                <div className="text-sm text-gray-500 mb-1">عدد المشاركات</div>
                <div className="text-2xl font-bold">{stats.count}</div>
              </div>
              <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-center">
                <div className="text-sm text-gray-500 mb-1">المتوسط العام</div>
                <div className="text-2xl font-bold">{stats.avg.toFixed(2)}</div>
              </div>
              <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-center">
                <div className="text-sm text-gray-500 mb-1">نسبة التوصية</div>
                <div className="text-2xl font-bold">{stats.recommendTotal? Math.round((stats.recommendYes/stats.recommendTotal)*100): 0}%</div>
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-3">التوزيع حسب التقييم</h3>
              <div className="space-y-2">
                {ratingOptions.slice().reverse().map(r => {
                  const count = stats.dist[r] || 0; const pct = stats.count? (count / stats.count)*100 : 0;
                  return (
                    <div key={r} className="flex items-center gap-3">
                      <div className="w-10 text-sm font-medium">{r}★</div>
                      <div className="flex-1 h-3 rounded bg-gray-200 dark:bg-gray-700 overflow-hidden">
                        <div className="h-full bg-emerald-600 dark:bg-emerald-500" style={{width: pct+'%'}}></div>
                      </div>
                      <div className="w-12 text-sm text-gray-600 dark:text-gray-400 text-left">{count}</div>
                    </div>
                  );
                })}
              </div>
            </div>
            {app?.isEmployeeLoggedIn && (
              <div className="mt-6">
                <h3 className="font-semibold mb-3">أحدث 5 مشاركات</h3>
                <ul className="space-y-2 text-sm">
                  {surveys.slice(0,5).map(s => (
                    <li key={s.id} className="p-3 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                      <div className="flex flex-wrap gap-2 items-center mb-1">
                        <span className="font-semibold">{s.rating}★</span>
                        {s.wouldRecommend !== undefined && (
                          <span className={`px-2 py-0.5 rounded-full text-xs ${s.wouldRecommend? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300':'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>{s.wouldRecommend? 'يوصي':'لا يوصي'}</span>
                        )}
                        {s.ticketId && <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-gray-700">طلب: {s.ticketId}</span>}
                        {s.category && <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-gray-700">{s.category}</span>}
                      </div>
                      {s.comment && <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{s.comment}</p>}
                      <div className="mt-1 text-xs text-gray-400">{new Date(s.createdAt).toLocaleString('ar-SY-u-nu-latn')}</div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};

export default CitizenSurveyPage;
