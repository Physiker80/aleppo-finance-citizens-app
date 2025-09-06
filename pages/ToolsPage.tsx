import React, { useState, useCallback, useEffect } from 'react';
import Tesseract from 'tesseract.js';
import { FaFileUpload, FaSpinner, FaFilePdf, FaFileWord, FaFileImage } from 'react-icons/fa';
import { useFilePreview } from '../hooks/useFilePreview';
import { NewsItem, FaqItem } from '../types';
import { NEWS_DATA, FAQ_DATA } from '../constants';

// Removed overlay popover; we'll render a fixed inline panel instead.

type OcrStats = {
  totalRuns: number;
  lastKind: 'image' | 'pdf' | 'docx' | 'other';
  lastDateISO: string;
  lastChars: number;
};

// OCR tool extracted into a component to use inside popover
const OcrTool: React.FC<{ onStatsChanged?: () => void }> = ({ onStatsChanged }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [ocrResult, setOcrResult] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);
  const [status, setStatus] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const preview = useFilePreview(selectedFile);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
      setOcrResult('');
      setProgress(0);
      setStatus('');
    }
  };

  const performOCR = useCallback(async () => {
    if (!selectedFile) {
      setStatus('الرجاء اختيار ملف أولاً.');
      return;
    }

    setIsLoading(true);
    setOcrResult('');
    setStatus('جاري التحضير...');
    setProgress(0);

    const type = selectedFile.type;
    const isDocx = type.includes('wordprocessingml.document') || selectedFile.name.toLowerCase().endsWith('.docx');

    if (isDocx) {
      try {
        setStatus('جارٍ استخراج النص من مستند وورد...');
        const arrayBuffer = await selectedFile.arrayBuffer();
        // @ts-ignore
        const mammothMod = await import('mammoth/mammoth.browser');
        const mammothLib: any = mammothMod.default || mammothMod;
        const { value: text } = await mammothLib.extractRawText({ arrayBuffer });
        setOcrResult(text || '');
        setStatus('تم استخراج النص من ملف الوورد.');
        setProgress(100);
        try {
          const prev = JSON.parse(localStorage.getItem('ocrStats') || '{"totalRuns":0}') as Partial<OcrStats>;
          const next: OcrStats = {
            totalRuns: (prev.totalRuns || 0) + 1,
            lastKind: 'docx',
            lastDateISO: new Date().toISOString(),
            lastChars: (text || '').length,
          };
          localStorage.setItem('ocrStats', JSON.stringify(next));
          onStatsChanged?.();
        } catch { /* ignore */ }
      } catch (error) {
        console.error(error);
        setStatus('تعذر قراءة ملف الوورد.');
        setOcrResult('فشلت عملية القراءة. الرجاء التأكد أن الملف بصيغة DOCX وغير تالف.');
        setProgress(0);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    const worker = await (Tesseract as any).createWorker({
      logger: (m: any) => {
        const statusMap: { [key: string]: string } = {
          'loading language model': 'جاري تحميل نموذج اللغة',
          'initializing': 'جاري التهيئة',
          'recognizing text': 'جاري قراءة النص',
          'done': 'اكتمل'
        };
        const friendlyStatus = statusMap[m.status] || m.status;
        if (m.status === 'recognizing text' || m.status.startsWith('loading')) {
          setProgress(Math.round((m.progress || 0) * 100));
        }
        setStatus(friendlyStatus);
      },
    });

    try {
      await (worker as any).loadLanguage('ara+eng');
      await (worker as any).initialize('ara+eng');
      setStatus('جاري التعرف على النص...');
      const { data: { text } } = await (worker as any).recognize(selectedFile);
      setOcrResult(text);
      setStatus('اكتملت القراءة بنجاح!');
      setProgress(100);
      try {
        const prev = JSON.parse(localStorage.getItem('ocrStats') || '{"totalRuns":0}') as Partial<OcrStats>;
        const mime = selectedFile.type;
        const kind: OcrStats['lastKind'] = mime.startsWith('image/') ? 'image' : mime === 'application/pdf' ? 'pdf' : 'other';
        const next: OcrStats = {
          totalRuns: (prev.totalRuns || 0) + 1,
          lastKind: kind,
          lastDateISO: new Date().toISOString(),
          lastChars: (text || '').length,
        };
        localStorage.setItem('ocrStats', JSON.stringify(next));
        onStatsChanged?.();
      } catch { /* ignore */ }
    } catch (error) {
      console.error(error);
      setStatus('حدث خطأ أثناء قراءة الملف.');
      setOcrResult('فشلت عملية القراءة. يرجى التأكد من أن الملف غير تالف وأن صيغته مدعومة (صور، PDF).');
      setProgress(0);
    } finally {
      await (worker as any).terminate();
      setIsLoading(false);
    }
  }, [selectedFile]);

  const getFileIcon = () => {
    const type = selectedFile?.type;
    if (type?.startsWith('image/')) return <span className="text-blue-500"><FaFileImage /></span>;
    if (type === 'application/pdf') return <span className="text-red-500"><FaFilePdf /></span>;
    if (type?.includes('word')) return <span className="text-blue-700"><FaFileWord /></span>;
    return <span className="text-gray-400"><FaFileUpload /></span>;
  };

  return (
    <div>
      <div className="bg-gray-50 dark:bg-gray-700/50 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 text-center transition-all duration-300">
        <input
          type="file"
          id="file-upload"
          className="hidden"
          accept="image/*,application/pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={handleFileChange}
          disabled={isLoading}
        />
        <label htmlFor="file-upload" className={`cursor-pointer ${isLoading ? 'cursor-not-allowed' : ''}`}>
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="text-5xl">{getFileIcon()}</div>
            {selectedFile ? (
              <div>
                <p className="font-semibold text-gray-800 dark:text-gray-100">{selectedFile.name}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{(selectedFile.size / 1024).toFixed(2)} KB</p>
              </div>
            ) : (
              <p className="font-semibold text-gray-700 dark:text-gray-200">اسحب وأفلت ملفاً هنا، أو انقر للاختيار</p>
            )}
          </div>
        </label>
      </div>

      <div className="text-center my-4">
        <button
          onClick={performOCR}
          disabled={!selectedFile || isLoading}
          className="bg-green-600 text-white font-bold py-2.5 px-6 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-300 mx-auto"
        >
          {isLoading ? (
            <>
              <span className="inline-block align-middle animate-spin mr-2"><FaSpinner /></span>
              جاري المعالجة...
            </>
          ) : (
            'ابدأ قراءة النص'
          )}
        </button>
      </div>

      {isLoading && (
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full my-3 overflow-hidden">
          <div
            className="bg-blue-600 text-xs font-medium text-blue-100 text-center p-1 leading-none rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          >
           {status} {progress > 0 && `(${progress}%)`}
          </div>
        </div>
      )}

      {!isLoading && status && !ocrResult && (
           <p className="text-center text-sm text-red-500 dark:text-red-400 my-3">{status}</p>
      )}

      {preview && (preview.url || preview.html || preview.error) && (
        <div className="mt-4 bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 rounded-xl p-3">
          <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-2">معاينة الملف</h3>
          {preview.loading && (
            <p className="text-sm text-gray-600 dark:text-gray-300">جاري تجهيز المعاينة...</p>
          )}
          {!preview.loading && preview.kind === 'image' && preview.url && (
            <img src={preview.url} alt="معاينة الصورة" className="max-w-full h-auto rounded" />
          )}
          {!preview.loading && preview.kind === 'pdf' && preview.url && (
            <iframe src={preview.url} title="معاينة PDF" className="w-full h-72 border rounded" />
          )}
          {!preview.loading && preview.kind === 'docx' && (
            <div className="prose prose-sm max-w-none dark:prose-invert bg-white dark:bg-gray-900 p-4 rounded border border-gray-200 dark:border-gray-700 max-h-72 overflow-auto" dangerouslySetInnerHTML={{ __html: preview.html || '' }} />
          )}
          {!preview.loading && preview.kind === 'unsupported' && (
            <p className="text-sm text-gray-600 dark:text-gray-300">لا يمكن معاينة هذا النوع من الملفات.</p>
          )}
          {!preview.loading && preview.error && (
            <p className="text-sm text-red-600 dark:text-red-400">{preview.error}</p>
          )}
          {selectedFile && (
            <div className="text-left mt-2">
              <a href={preview?.url || ''} download={selectedFile.name} className="text-blue-600 dark:text-blue-400 hover:underline text-xs">
                تنزيل الملف
              </a>
            </div>
          )}
        </div>
      )}

      {ocrResult && (
        <div className="mt-5">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">النص المستخرج:</h2>
          <div dir="rtl" className="bg-gray-100 dark:bg-gray-900/50 rounded-lg p-4 whitespace-pre-wrap text-right font-sans leading-relaxed border border-gray-200 dark:border-gray-700 max-h-72 overflow-y-auto">
            {ocrResult}
          </div>
        </div>
      )}
    </div>
  );
};

// نموذج إضافة خبر فقط
const NewsAddForm: React.FC<{ onAdded?: () => void; onSwitchToManage?: () => void }> = ({ onAdded, onSwitchToManage }) => {
  const [draft, setDraft] = useState<NewsItem>({ title: '', date: new Date().toLocaleDateString('ar-SY'), content: '' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const add = () => {
    if (!draft.title.trim() || !draft.content.trim() || !draft.date.trim()) return;
    try {
      setSaving(true);
      const saved = localStorage.getItem('newsItems');
      const list: NewsItem[] = saved ? JSON.parse(saved) : NEWS_DATA.slice();
      list.unshift({ ...draft });
      localStorage.setItem('newsItems', JSON.stringify(list));
      setMessage('تمت إضافة الخبر بنجاح.');
      setDraft({ title: '', date: new Date().toLocaleDateString('ar-SY'), content: '' });
      onAdded?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mt-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">إضافة خبر جديد</h2>
      <p className="text-gray-600 dark:text-gray-300 mb-4 text-sm">سيظهر الخبر فوراً في صفحة الأخبار، ويتم الحفظ محلياً.</p>
      <div className="grid md:grid-cols-3 gap-4 bg-gray-50 dark:bg-gray-700/40 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
        <label className="text-sm md:col-span-1">العنوان
          <input className="mt-1 w-full p-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-800" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
        </label>
        <label className="text-sm md:col-span-1">التاريخ
          <input className="mt-1 w-full p-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-800" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} placeholder="مثال: 15 أغسطس 2025" />
        </label>
        <label className="text-sm md:col-span-3">النص
          <textarea className="mt-1 w-full min-h-[120px] p-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-800" value={draft.content} onChange={(e) => setDraft({ ...draft, content: e.target.value })} />
        </label>
        <div className="md:col-span-3 flex gap-2 justify-end">
          {onSwitchToManage && (
            <button onClick={onSwitchToManage} className="px-4 py-2 rounded border border-gray-300 dark:border-gray-600 text-sm">إدارة الأخبار</button>
          )}
          <button onClick={add} disabled={saving} className="px-4 py-2 rounded bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-60">إضافة</button>
        </div>
        {message && <div className="md:col-span-3 text-sm text-green-700 dark:text-green-400">{message}</div>}
      </div>
    </section>
  );
};

// إدارة الأخبار (تعديل/حذف) بدون إضافة
const NewsManager: React.FC<{ onChanged?: () => void; onSwitchToAdd?: () => void }> = ({ onChanged, onSwitchToAdd }) => {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [draft, setDraft] = useState<NewsItem>({ title: '', date: new Date().toLocaleDateString('ar-SY'), content: '' });

  useEffect(() => {
    try {
      const saved = localStorage.getItem('newsItems');
      if (saved) setItems(JSON.parse(saved));
      else setItems(NEWS_DATA);
    } catch {
      setItems(NEWS_DATA);
    }
  }, []);

  const persist = (list: NewsItem[]) => {
    setItems(list);
    localStorage.setItem('newsItems', JSON.stringify(list));
    onChanged?.();
  };

  const startEdit = (i: number) => { setEditingIndex(i); setDraft(items[i]); };
  const cancel = () => { setEditingIndex(null); };
  const save = () => {
    if (editingIndex === null) return;
    const next = items.slice();
    next[editingIndex] = { ...draft };
    persist(next);
    setEditingIndex(null);
  };
  const remove = (i: number) => { const next = items.filter((_, idx) => idx !== i); persist(next); if (editingIndex === i) setEditingIndex(null); };

  return (
    <section className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">إدارة الأخبار</h2>
        {onSwitchToAdd && (
          <button onClick={onSwitchToAdd} className="px-3 py-2 rounded bg-blue-600 text-white text-sm hover:bg-blue-700">إضافة خبر</button>
        )}
      </div>
      {editingIndex !== null && (
        <div className="mb-4 grid md:grid-cols-3 gap-4 bg-gray-50 dark:bg-gray-700/40 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <label className="text-sm md:col-span-1">العنوان
            <input className="mt-1 w-full p-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-800" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          </label>
          <label className="text-sm md:col-span-1">التاريخ
            <input className="mt-1 w-full p-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-800" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
          </label>
          <label className="text-sm md:col-span-3">النص
            <textarea className="mt-1 w-full min-h-[100px] p-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-800" value={draft.content} onChange={(e) => setDraft({ ...draft, content: e.target.value })} />
          </label>
          <div className="md:col-span-3 flex gap-2 justify-end">
            <button onClick={cancel} className="px-4 py-2 rounded border border-gray-300 dark:border-gray-600 text-sm">إلغاء</button>
            <button onClick={save} className="px-4 py-2 rounded bg-blue-600 text-white text-sm hover:bg-blue-700">حفظ التعديل</button>
          </div>
        </div>
      )}
      <div className="border rounded-xl overflow-hidden border-gray-200 dark:border-gray-700">
        {items.length === 0 ? (
          <div className="p-4 text-sm text-gray-600 dark:text-gray-300">لا توجد أخبار بعد.</div>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200">
              <tr>
                <th className="p-3 text-right">العنوان</th>
                <th className="p-3 text-right">التاريخ</th>
                <th className="p-3 text-right">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {items.map((n, i) => (
                <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="p-3 font-medium text-gray-900 dark:text-gray-100">{n.title}</td>
                  <td className="p-3 text-gray-600 dark:text-gray-300">{n.date}</td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <button onClick={() => startEdit(i)} className="text-blue-600 dark:text-blue-400 hover:underline">تعديل</button>
                      <button onClick={() => remove(i)} className="text-red-600 dark:text-red-400 hover:underline">حذف</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
};

// نموذج إضافة سؤال فقط
const FaqAddForm: React.FC<{ onAdded?: () => void; onSwitchToManage?: () => void }> = ({ onAdded, onSwitchToManage }) => {
  const [draft, setDraft] = useState<FaqItem>({ question: '', answer: '' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const add = () => {
    if (!draft.question.trim() || !draft.answer.trim()) return;
    try {
      setSaving(true);
      const saved = localStorage.getItem('faqItems');
      const list: FaqItem[] = saved ? JSON.parse(saved) : FAQ_DATA.slice();
      list.unshift({ ...draft });
      localStorage.setItem('faqItems', JSON.stringify(list));
      setMessage('تمت إضافة السؤال بنجاح.');
      setDraft({ question: '', answer: '' });
      onAdded?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="mt-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">إضافة سؤال شائع</h2>
      <p className="text-gray-600 dark:text-gray-300 mb-4 text-sm">سيظهر السؤال مباشرة في صفحة الأسئلة الشائعة.</p>
      <div className="grid md:grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-700/40 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
        <label className="text-sm md:col-span-1">السؤال
          <input className="mt-1 w-full p-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-800" value={draft.question} onChange={(e) => setDraft({ ...draft, question: e.target.value })} />
        </label>
        <label className="text-sm md:col-span-1">الإجابة
          <textarea className="mt-1 w-full p-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-800 min-h-[80px]" value={draft.answer} onChange={(e) => setDraft({ ...draft, answer: e.target.value })} />
        </label>
        <div className="md:col-span-2 flex gap-2 justify-end">
          {onSwitchToManage && (
            <button onClick={onSwitchToManage} className="px-4 py-2 rounded border border-gray-300 dark:border-gray-600 text-sm">إدارة الأسئلة</button>
          )}
          <button onClick={add} disabled={saving} className="px-4 py-2 rounded bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-60">إضافة</button>
        </div>
        {message && <div className="md:col-span-2 text-sm text-green-700 dark:text-green-400">{message}</div>}
      </div>
    </section>
  );
};

// إدارة الأسئلة (تعديل/حذف)
const FaqManager: React.FC<{ onChanged?: () => void; onSwitchToAdd?: () => void }> = ({ onChanged, onSwitchToAdd }) => {
  const [items, setItems] = useState<FaqItem[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [draft, setDraft] = useState<FaqItem>({ question: '', answer: '' });

  useEffect(() => {
    try {
      const saved = localStorage.getItem('faqItems');
      if (saved) setItems(JSON.parse(saved));
      else setItems(FAQ_DATA);
    } catch {
      setItems(FAQ_DATA);
    }
  }, []);

  const persist = (list: FaqItem[]) => {
    setItems(list);
    localStorage.setItem('faqItems', JSON.stringify(list));
    onChanged?.();
  };

  const startEdit = (i: number) => { setEditingIndex(i); setDraft(items[i]); };
  const cancel = () => { setEditingIndex(null); };
  const save = () => {
    if (editingIndex === null) return;
    const next = items.slice();
    next[editingIndex] = { ...draft };
    persist(next);
    setEditingIndex(null);
  };
  const remove = (i: number) => { const next = items.filter((_, idx) => idx !== i); persist(next); if (editingIndex === i) setEditingIndex(null); };

  return (
    <section className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">إدارة الأسئلة الشائعة</h2>
        {onSwitchToAdd && (
          <button onClick={onSwitchToAdd} className="px-3 py-2 rounded bg-blue-600 text-white text-sm hover:bg-blue-700">إضافة سؤال</button>
        )}
      </div>
      {editingIndex !== null && (
        <div className="mb-4 grid md:grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-700/40 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
          <label className="text-sm md:col-span-1">السؤال
            <input className="mt-1 w-full p-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-800" value={draft.question} onChange={(e) => setDraft({ ...draft, question: e.target.value })} />
          </label>
          <label className="text-sm md:col-span-1">الإجابة
            <textarea className="mt-1 w-full p-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-800 min-h-[80px]" value={draft.answer} onChange={(e) => setDraft({ ...draft, answer: e.target.value })} />
          </label>
          <div className="md:col-span-2 flex gap-2 justify-end">
            <button onClick={cancel} className="px-4 py-2 rounded border border-gray-300 dark:border-gray-600 text-sm">إلغاء</button>
            <button onClick={save} className="px-4 py-2 rounded bg-blue-600 text-white text-sm hover:bg-blue-700">حفظ التعديل</button>
          </div>
        </div>
      )}
      <div className="border rounded-xl overflow-hidden border-gray-200 dark:border-gray-700">
        {items.length === 0 ? (
          <div className="p-4 text-sm text-gray-600 dark:text-gray-300">لا توجد أسئلة بعد.</div>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200">
              <tr>
                <th className="p-3 text-right">السؤال</th>
                <th className="p-3 text-right">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {items.map((q, i) => (
                <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="p-3">
                    <div className="font-medium text-gray-900 dark:text-gray-100">{q.question}</div>
                    <div className="text-gray-600 dark:text-gray-300 mt-1">{q.answer}</div>
                  </td>
                  <td className="p-3 w-32">
                    <div className="flex gap-2">
                      <button onClick={() => startEdit(i)} className="text-blue-600 dark:text-blue-400 hover:underline">تعديل</button>
                      <button onClick={() => remove(i)} className="text-red-600 dark:text-red-400 hover:underline">حذف</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
};

const ToolsPage: React.FC = () => {
  const [active, setActive] = useState<null | 'ocr' | 'newsAdd' | 'newsManage' | 'faqAdd' | 'faqManage'>(null);
  const [newsCount, setNewsCount] = useState<number>(0);
  const [faqCount, setFaqCount] = useState<number>(0);
  const [ocrStats, setOcrStats] = useState<OcrStats | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setActive(null); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const refreshStats = useCallback(() => {
    try {
      const savedNews = localStorage.getItem('newsItems');
      if (savedNews) setNewsCount(JSON.parse(savedNews).length);
      else setNewsCount(NEWS_DATA.length);
    } catch { setNewsCount(NEWS_DATA.length); }

    try {
      const savedFaq = localStorage.getItem('faqItems');
      if (savedFaq) setFaqCount(JSON.parse(savedFaq).length);
      else setFaqCount(FAQ_DATA.length);
    } catch { setFaqCount(FAQ_DATA.length); }

    try {
      const savedOcr = localStorage.getItem('ocrStats');
      if (savedOcr) setOcrStats(JSON.parse(savedOcr));
      else setOcrStats(null);
    } catch { setOcrStats(null); }
  }, []);

  useEffect(() => { refreshStats(); }, [refreshStats]);

  return (
    <div className="rounded-2xl p-8 animate-fade-in-up transition-all duration-300 border border-white/20 dark:border-white/10 bg-white/70 dark:bg-gray-900/60 backdrop-blur shadow-lg">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6 text-center">قسم المعلوماتية</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* OCR Card */}
          <div className="relative">
            <div
              role="button" tabIndex={0}
              onClick={() => setActive(active === 'ocr' ? null : 'ocr')}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActive(active === 'ocr' ? null : 'ocr'); } }}
              className="rounded-2xl border border-white/20 dark:border-white/10 bg-white/70 dark:bg-gray-800/70 backdrop-blur p-6 shadow-sm cursor-pointer hover:ring-2 hover:ring-blue-300/40 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <h3 className="text-xl font-semibold mb-1">التعرف الضوئي (OCR)</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">قراءة نصوص الصور وملفات PDF وDOCX.</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200">العمليات {ocrStats?.totalRuns || 0}</span>
                {ocrStats?.lastKind && (
                  <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-800 dark:bg-gray-700/40 dark:text-gray-200">آخر نوع {ocrStats.lastKind === 'image' ? 'صور' : ocrStats.lastKind === 'pdf' ? 'PDF' : ocrStats.lastKind === 'docx' ? 'Word' : 'أخرى'}</span>
                )}
                {ocrStats?.lastDateISO && (
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">آخر مرة {new Date(ocrStats.lastDateISO).toLocaleString('ar-SY')}</span>
                )}
              </div>
            </div>
          </div>

          {/* News Add Card */}
          <div className="relative">
            <div
              role="button" tabIndex={0}
              onClick={() => setActive(active === 'newsAdd' ? null : 'newsAdd')}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActive(active === 'newsAdd' ? null : 'newsAdd'); } }}
              className="rounded-2xl border border-white/20 dark:border-white/10 bg-white/70 dark:bg-gray-800/70 backdrop-blur p-6 shadow-sm cursor-pointer hover:ring-2 hover:ring-blue-300/40 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <h3 className="text-xl font-semibold mb-1">إضافة خبر</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">إدراج خبر جديد يظهر في صفحة الأخبار.</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200">عدد الأخبار {newsCount}</span>
              </div>
            </div>
          </div>

          {/* News Manage Card */}
          <div className="relative">
            <div
              role="button" tabIndex={0}
              onClick={() => setActive(active === 'newsManage' ? null : 'newsManage')}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActive(active === 'newsManage' ? null : 'newsManage'); } }}
              className="rounded-2xl border border-white/20 dark:border-white/10 bg-white/70 dark:bg-gray-800/70 backdrop-blur p-6 shadow-sm cursor-pointer hover:ring-2 hover:ring-blue-300/40 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <h3 className="text-xl font-semibold mb-1">تحرير الأخبار</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">تعديل أو حذف الأخبار المنشورة.</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200">عدد الأخبار {newsCount}</span>
              </div>
            </div>
          </div>

          {/* FAQ Add Card */}
          <div className="relative">
            <div
              role="button" tabIndex={0}
              onClick={() => setActive(active === 'faqAdd' ? null : 'faqAdd')}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActive(active === 'faqAdd' ? null : 'faqAdd'); } }}
              className="rounded-2xl border border-white/20 dark:border-white/10 bg-white/70 dark:bg-gray-800/70 backdrop-blur p-6 shadow-sm cursor-pointer hover:ring-2 hover:ring-blue-300/40 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <h3 className="text-xl font-semibold mb-1">إضافة سؤال شائع</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">إدراج سؤال جديد يظهر في صفحة الأسئلة.</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">عدد الأسئلة {faqCount}</span>
              </div>
            </div>
          </div>

          {/* FAQ Manage Card */}
      <div className="relative">
            <div
              role="button" tabIndex={0}
              onClick={() => setActive(active === 'faqManage' ? null : 'faqManage')}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActive(active === 'faqManage' ? null : 'faqManage'); } }}
              className="rounded-2xl border border-white/20 dark:border-white/10 bg-white/70 dark:bg-gray-800/70 backdrop-blur p-6 shadow-sm cursor-pointer hover:ring-2 hover:ring-blue-300/40 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <h3 className="text-xl font-semibold mb-1">تحرير الأسئلة الشائعة</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">تعديل أو حذف الأسئلة المنشورة.</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">عدد الأسئلة {faqCount}</span>
              </div>
            </div>
          </div>
        </div>

        {active && (
          <div className="relative mt-4 rounded-xl overflow-hidden border border-white/20 dark:border-white/10 bg-white/90 dark:bg-gray-900/90 shadow-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                {active === 'ocr' && 'أداة التعرف الضوئي على الحروف (OCR)'}
                {active === 'newsAdd' && 'إضافة خبر جديد'}
                {active === 'newsManage' && 'إدارة الأخبار'}
                {active === 'faqAdd' && 'إضافة سؤال شائع'}
                {active === 'faqManage' && 'إدارة الأسئلة الشائعة'}
              </h3>
              <button onClick={() => setActive(null)} aria-label="إغلاق" className="w-8 h-8 rounded hover:bg-black/5 dark:hover:bg-white/10">✕</button>
            </div>
            <div className="p-4 max-h-[70vh] overflow-auto">
              {active === 'ocr' && <OcrTool onStatsChanged={refreshStats} />}
              {active === 'newsAdd' && <NewsAddForm onAdded={refreshStats} onSwitchToManage={() => setActive('newsManage')} />}
              {active === 'newsManage' && <NewsManager onChanged={refreshStats} onSwitchToAdd={() => setActive('newsAdd')} />}
              {active === 'faqAdd' && <FaqAddForm onAdded={refreshStats} onSwitchToManage={() => setActive('faqManage')} />}
              {active === 'faqManage' && <FaqManager onChanged={refreshStats} onSwitchToAdd={() => setActive('faqAdd')} />}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ToolsPage;
