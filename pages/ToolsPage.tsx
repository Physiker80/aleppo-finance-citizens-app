import React, { useState, useCallback, useEffect, useContext } from 'react';
import { AppContext } from '../App';
import { SiteConfig } from '../types';
import Tesseract from 'tesseract.js';
import { FaFileUpload, FaSpinner, FaFilePdf, FaFileWord, FaFileImage, FaCheck, FaTimes, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import { useFilePreview } from '../hooks/useFilePreview';
import { NewsItem, FaqItem } from '../types';
import { NEWS_DATA, FAQ_DATA } from '../constants';
import { formatDate, formatDateTime, formatNumber } from '../utils/arabicNumerals';
import { 
  PdfTemplate,
  getSavedTemplates, 
  saveTemplate, 
  deleteTemplate, 
  exportTemplate, 
  importTemplate,
  generatePdfFromTemplate,
  generateSimplePreview,
  getDefaultTemplate,
  diagnoseSystem,
  approveTemplate,
  unapproveTemplate
} from '../utils/pdfTemplateGenerator';

const ARABIC_FONTS = [
  { name: 'Amiri', displayName: 'الأميري - خط تقليدي أنيق', url: 'https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700;1,400;1,700&display=swap' },
  { name: 'Scheherazade New', displayName: 'شهرزاد الجديد - خط ناسخي جميل', url: 'https://fonts.googleapis.com/css2?family=Scheherazade+New:wght@400;500;600;700&display=swap' },
  { name: 'Aref Ruqaa', displayName: 'عارف رقعة - خط الرقعة الكلاسيكي', url: 'https://fonts.googleapis.com/css2?family=Aref+Ruqaa:wght@400;700&display=swap' },
  { name: 'Lateef', displayName: 'لطيف - خط نسخي حديث', url: 'https://fonts.googleapis.com/css2?family=Lateef:wght@200;300;400;500;600;700;800&display=swap' },
  { name: 'Reem Kufi', displayName: 'ريم كوفي - خط كوفي عصري', url: 'https://fonts.googleapis.com/css2?family=Reem+Kufi:wght@400;500;600;700&display=swap' },
  { name: 'Katibeh', displayName: 'كاتبة - خط فارسي أنيق', url: 'https://fonts.googleapis.com/css2?family=Katibeh&display=swap' },
  { name: 'Markazi Text', displayName: 'نص مركزي - خط حديث متعدد الاستخدامات', url: 'https://fonts.googleapis.com/css2?family=Markazi+Text:wght@400;500;600;700&display=swap' },
  { name: 'Noto Naskh Arabic', displayName: 'نوتو نسخ عربي - خط نسخي احترافي', url: 'https://fonts.googleapis.com/css2?family=Noto+Naskh+Arabic:wght@400;500;600;700&display=swap' }
];

// Small helper: SHA-256 Hex
async function sha256Hex(text: string): Promise<string> {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

const PasswordSetup: React.FC = () => {
  const [hasPwd, setHasPwd] = useState<boolean>(() => !!localStorage.getItem('observabilityPasswordHash'));
  const [pwd1, setPwd1] = useState('');
  const [pwd2, setPwd2] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  const save = async () => {
    try {
      if (!pwd1 || pwd1.length < 4) { setMsg('الحد الأدنى 4 محارف'); return; }
      if (pwd1 !== pwd2) { setMsg('كلمتا المرور غير متطابقتين'); return; }
      const hex = await sha256Hex(pwd1);
      localStorage.setItem('observabilityPasswordHash', hex);
      setHasPwd(true);
      setPwd1(''); setPwd2('');
      setMsg('تم ضبط كلمة المرور.');
      setTimeout(()=>setMsg(null), 1500);
    } catch (e: any) {
      setMsg(`فشل الحفظ: ${e?.message || e}`);
    }
  };

  const clear = () => {
    localStorage.removeItem('observabilityPasswordHash');
    try { sessionStorage.removeItem('observabilitySessionOk'); } catch {}
    setHasPwd(false);
    setPwd1(''); setPwd2('');
    setMsg('تمت إزالة كلمة المرور.');
    setTimeout(()=>setMsg(null), 1500);
  };

  return (
    <div className="rounded border border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-800/40">
      <h4 className="text-sm font-semibold mb-2">حماية صفحة المراقبة بكلمة مرور</h4>
      {hasPwd ? (
        <div className="text-sm">
          <div className="mb-2 text-emerald-700 dark:text-emerald-300">حالة: مفعّلة</div>
          <button onClick={clear} className="px-3 py-1.5 rounded border border-red-300 text-red-700 bg-red-50 hover:bg-red-100 dark:border-red-700 dark:text-red-300 dark:bg-red-900/30 text-sm">إزالة كلمة المرور</button>
        </div>
      ) : (
        <div className="grid gap-2 text-sm">
          <label>كلمة المرور
            <input type="password" className="mt-1 w-full p-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-800" value={pwd1} onChange={e=>setPwd1(e.target.value)} />
          </label>
          <label>تأكيد كلمة المرور
            <input type="password" className="mt-1 w-full p-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-800" value={pwd2} onChange={e=>setPwd2(e.target.value)} />
          </label>
          <div className="flex gap-2">
            <button onClick={save} className="px-4 py-2 rounded bg-blue-600 text-white text-sm hover:bg-blue-700">حفظ كلمة المرور</button>
          </div>
        </div>
      )}
      {msg && <div className="text-xs mt-2 text-gray-700 dark:text-gray-300">{msg}</div>}
      <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">تُخزن كلمة المرور كقيمة SHA-256 في المتصفح. الفتح يتم لكل جلسة.</div>
    </div>
  );
};

// تحميل الخطوط العربية الجميلة
const loadArabicFonts = () => {
  ARABIC_FONTS.forEach(font => {
    const link = document.createElement('link');
    link.href = font.url;
    link.rel = 'stylesheet';
    link.type = 'text/css';
    document.head.appendChild(link);
  });
};

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

// محرر المحتوى القانوني العام (سياسة/شروط)
const LegalEditor: React.FC<{
  storageKey: 'privacyHtml' | 'termsHtml';
  title: string;
  onChanged?: () => void;
}> = ({ storageKey, title, onChanged }) => {
  const [html, setHtml] = useState<string>('');
  const [msg, setMsg] = useState<string | null>(null);
  const fileRef = React.useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      setHtml(saved || '');
    } catch { /* noop */ }
  }, [storageKey]);

  const save = () => {
    try {
      const val = html.trim();
      if (val) localStorage.setItem(storageKey, val);
      else localStorage.removeItem(storageKey);
      setMsg('تم الحفظ.');
      onChanged?.();
      setTimeout(() => setMsg(null), 1500);
    } catch { setMsg('فشل الحفظ.'); }
  };

  const exportHtml = () => {
    try {
      const text = html;
      const blob = new Blob([text], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const ts = new Date().toISOString().slice(0, 19).replace(/[.:T]/g, '-');
      a.download = `${storageKey}-export-${ts}.html`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) { alert('تعذر تصدير الملف.'); }
  };

  const onImport: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const text = await f.text();
      setHtml(text);
      setMsg('تم تحميل الملف، لا تنس الحفظ.');
    } catch {
      alert('فشل استيراد الملف.');
    } finally { e.target.value = ''; }
  };

  const resetDefault = () => {
    if (!confirm('سيتم حذف المحتوى المخصص والعودة إلى المحتوى الافتراضي في الصفحة العامة. متابعة؟')) return;
    try {
      localStorage.removeItem(storageKey);
      setHtml('');
      onChanged?.();
      setMsg('تمت الاستعادة إلى الافتراضي.');
      setTimeout(() => setMsg(null), 1500);
    } catch { setMsg('تعذر إتمام العملية.'); }
  };

  return (
    <section className="mt-4">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{title}</h2>
      <p className="text-gray-600 dark:text-gray-300 mb-3 text-sm">يمكنك لصق HTML من محرر خارجي. اتركه فارغاً للعودة إلى المحتوى الافتراضي.</p>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="md:col-span-1">
          <label className="text-sm">المحتوى (HTML)
            <textarea
              dir="rtl"
              className="mt-1 w-full min-h-[260px] p-3 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-800"
              value={html}
              onChange={(e) => setHtml(e.target.value)}
              placeholder="<h1>عنوان</h1><p>نص ...</p>"
            />
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            <button onClick={save} className="px-4 py-2 rounded bg-blue-600 text-white text-sm hover:bg-blue-700">حفظ</button>
            <button onClick={exportHtml} className="px-4 py-2 rounded border border-gray-300 dark:border-gray-600 text-sm">تصدير HTML</button>
            <button onClick={() => fileRef.current?.click()} className="px-4 py-2 rounded border border-gray-300 dark:border-gray-600 text-sm">استيراد HTML</button>
            <button onClick={resetDefault} className="px-4 py-2 rounded border border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-200 dark:bg-amber-900/30 text-sm">استعادة الافتراضي</button>
            <input ref={fileRef} type="file" accept="text/html,.html" onChange={onImport} hidden />
          </div>
          {msg && <div className="mt-2 text-sm text-green-700 dark:text-green-400">{msg}</div>}
        </div>
        <div className="md:col-span-1">
          <div className="text-sm font-semibold mb-1 text-gray-800 dark:text-gray-200">معاينة</div>
          <div className="prose prose-sm dark:prose-invert max-w-none border border-gray-200 dark:border-gray-700 rounded p-3 bg-white dark:bg-gray-900 min-h-[260px] overflow-auto" dir="rtl" dangerouslySetInnerHTML={{ __html: html || '<p class="text-gray-500">(ستظهر المعاينة هنا)</p>' }} />
        </div>
      </div>
    </section>
  );
};

// نموذج إضافة خبر فقط
const NewsAddForm: React.FC<{ onAdded?: () => void; onSwitchToManage?: () => void }> = ({ onAdded, onSwitchToManage }) => {
  const [draft, setDraft] = useState<NewsItem>({ title: '', date: formatDate(new Date()), content: '' });
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
  setDraft({ title: '', date: formatDate(new Date()), content: '' });
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
  const [draft, setDraft] = useState<NewsItem>({ title: '', date: formatDate(new Date()), content: '' });
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

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

  const exportJson = () => {
    try {
      const data = JSON.stringify(items, null, 2);
      const blob = new Blob([data], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const ts = new Date().toISOString().slice(0, 19).replace(/[.:T]/g, '-');
      a.download = `news-export-${ts}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      alert('تعذر تصدير البيانات.');
    }
  };

  const onImportFile: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!Array.isArray(data)) throw new Error('bad');
      const list: NewsItem[] = data
        .map((x: any) => ({
          title: String(x?.title ?? ''),
          date: String(x?.date ?? ''),
          content: String(x?.content ?? ''),
        }))
        .filter((x: NewsItem) => x.title.trim() && x.content.trim());
      persist(list);
    } catch {
      alert('فشل استيراد الملف. تأكد من صحة تنسيق JSON.');
    } finally {
      e.target.value = '';
    }
  };

  const resetDefaults = () => {
    if (!confirm('هل تريد استعادة الأخبار الافتراضية؟ ستفقد التغييرات الحالية.')) return;
    const list = NEWS_DATA.slice();
    persist(list);
  };

  return (
    <section className="mt-6">
      <div className="flex items-center justify-between mb-3 gap-3">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">إدارة الأخبار</h2>
        <div className="flex items-center gap-2">
          <button onClick={exportJson} className="px-3 py-2 rounded border border-gray-300 dark:border-gray-600 text-sm hover:bg-gray-50 dark:hover:bg-gray-800">تصدير JSON</button>
          <button onClick={() => fileInputRef.current?.click()} className="px-3 py-2 rounded border border-gray-300 dark:border-gray-600 text-sm hover:bg-gray-50 dark:hover:bg-gray-800">استيراد JSON</button>
          <button onClick={resetDefaults} className="px-3 py-2 rounded border border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-200 dark:bg-amber-900/30 text-sm">استعادة الافتراضي</button>
          {onSwitchToAdd && (
            <button onClick={onSwitchToAdd} className="px-3 py-2 rounded bg-blue-600 text-white text-sm hover:bg-blue-700">إضافة خبر</button>
          )}
          <input ref={fileInputRef} type="file" accept="application/json" onChange={onImportFile} hidden />
        </div>
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
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

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

  const exportJson = () => {
    try {
      const data = JSON.stringify(items, null, 2);
      const blob = new Blob([data], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const ts = new Date().toISOString().slice(0, 19).replace(/[.:T]/g, '-');
      a.download = `faq-export-${ts}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      alert('تعذر تصدير البيانات.');
    }
  };

  const onImportFile: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!Array.isArray(data)) throw new Error('bad');
      const list: FaqItem[] = data
        .map((x: any) => ({ question: String(x?.question ?? ''), answer: String(x?.answer ?? '') }))
        .filter((x: FaqItem) => x.question.trim() && x.answer.trim());
      persist(list);
    } catch {
      alert('فشل استيراد الملف. تأكد من صحة تنسيق JSON.');
    } finally {
      e.target.value = '';
    }
  };

  const resetDefaults = () => {
    if (!confirm('هل تريد استعادة الأسئلة الافتراضية؟ ستفقد التغييرات الحالية.')) return;
    const list = FAQ_DATA.slice();
    persist(list);
  };

  return (
    <section className="mt-6">
      <div className="flex items-center justify-between mb-3 gap-3">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">إدارة الأسئلة الشائعة</h2>
        <div className="flex items-center gap-2">
          <button onClick={exportJson} className="px-3 py-2 rounded border border-gray-300 dark:border-gray-600 text-sm hover:bg-gray-50 dark:hover:bg-gray-800">تصدير JSON</button>
          <button onClick={() => fileInputRef.current?.click()} className="px-3 py-2 rounded border border-gray-300 dark:border-gray-600 text-sm hover:bg-gray-50 dark:hover:bg-gray-800">استيراد JSON</button>
          <button onClick={resetDefaults} className="px-3 py-2 rounded border border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-200 dark:bg-amber-900/30 text-sm">استعادة الافتراضي</button>
          {onSwitchToAdd && (
            <button onClick={onSwitchToAdd} className="px-3 py-2 rounded bg-blue-600 text-white text-sm hover:bg-blue-700">إضافة سؤال</button>
          )}
          <input ref={fileInputRef} type="file" accept="application/json" onChange={onImportFile} hidden />
        </div>
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

// مكون إدارة قوالب PDF
const PdfTemplateManager: React.FC<{ onChanged?: () => void }> = ({ onChanged }) => {
  const [templates, setTemplates] = useState<PdfTemplate[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [previewMode, setPreviewMode] = useState<'edit' | 'preview'>('edit');
  const [draft, setDraft] = useState<PdfTemplate>(getDefaultTemplate());
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadedTemplates = getSavedTemplates();
    setTemplates(loadedTemplates);
  }, []);

  const startEdit = (i: number) => {
    setEditingIndex(i);
    setDraft({ ...templates[i] });
  };

  const cancel = () => {
    setEditingIndex(null);
    setPreviewMode('edit');
  };

  const save = () => {
    if (editingIndex === null) return;
    try {
      const updatedTemplate = { ...draft, id: templates[editingIndex].id };
      saveTemplate(updatedTemplate);
      const loadedTemplates = getSavedTemplates();
      setTemplates(loadedTemplates);
      setEditingIndex(null);
      setMessage('تم حفظ القالب بنجاح');
      setTimeout(() => setMessage(null), 2000);
      onChanged?.();
    } catch (error) {
      setMessage('فشل في حفظ القالب');
      setTimeout(() => setMessage(null), 2000);
    }
  };

  const addNew = () => {
    try {
      const newTemplate: PdfTemplate = {
        ...getDefaultTemplate(),
        id: `template-${Date.now()}`,
        name: `قالب جديد ${templates.length + 1}`
      };
      saveTemplate(newTemplate);
      const loadedTemplates = getSavedTemplates();
      setTemplates(loadedTemplates);
      setMessage('تم إضافة القالب الجديد');
      setTimeout(() => setMessage(null), 2000);
      onChanged?.();
    } catch (error) {
      setMessage('فشل في إضافة القالب');
      setTimeout(() => setMessage(null), 2000);
    }
  };

  const remove = (i: number) => {
    if (!confirm('هل تريد حذف هذا القالب؟')) return;
    try {
      deleteTemplate(templates[i].id);
      const loadedTemplates = getSavedTemplates();
      setTemplates(loadedTemplates);
      if (editingIndex === i) setEditingIndex(null);
      setMessage('تم حذف القالب');
      setTimeout(() => setMessage(null), 2000);
      onChanged?.();
    } catch (error) {
      setMessage('فشل في حذف القالب');
      setTimeout(() => setMessage(null), 2000);
    }
  };

  const duplicate = (i: number) => {
    try {
      const template = templates[i];
      const duplicated: PdfTemplate = {
        ...template,
        id: `template-${Date.now()}`,
        name: `نسخة من ${template.name}`
      };
      saveTemplate(duplicated);
      const loadedTemplates = getSavedTemplates();
      setTemplates(loadedTemplates);
      setMessage('تم نسخ القالب');
      setTimeout(() => setMessage(null), 2000);
      onChanged?.();
    } catch (error) {
      setMessage('فشل في نسخ القالب');
      setTimeout(() => setMessage(null), 2000);
    }
  };

  const handleExportTemplate = (template: PdfTemplate) => {
    try {
      exportTemplate(template);
      setMessage('تم تصدير القالب');
      setTimeout(() => setMessage(null), 2000);
    } catch (error) {
      setMessage('فشل في تصدير القالب');
      setTimeout(() => setMessage(null), 2000);
    }
  };

  const handleImportTemplate = async (file: File) => {
    try {
      const template = await importTemplate(file);
      saveTemplate(template);
      const loadedTemplates = getSavedTemplates();
      setTemplates(loadedTemplates);
      setMessage('تم استيراد القالب بنجاح');
      setTimeout(() => setMessage(null), 2000);
      onChanged?.();
    } catch (error) {
      setMessage('فشل في استيراد القالب');
      setTimeout(() => setMessage(null), 2000);
    }
  };

  const handleApproveTemplate = (templateId: string) => {
    try {
      // يمكن هنا إضافة نظام أذونات لتحديد من يستطيع الاعتماد
      const currentUser = 'المدير'; // يجب الحصول عليه من السياق
      approveTemplate(templateId, currentUser);
      const loadedTemplates = getSavedTemplates();
      setTemplates(loadedTemplates);
      setMessage('تم اعتماد القالب بنجاح');
      setTimeout(() => setMessage(null), 2000);
      onChanged?.();
    } catch (error) {
      setMessage('فشل في اعتماد القالب');
      setTimeout(() => setMessage(null), 2000);
    }
  };

  const handleUnapproveTemplate = (templateId: string) => {
    try {
      unapproveTemplate(templateId);
      const loadedTemplates = getSavedTemplates();
      setTemplates(loadedTemplates);
      setMessage('تم إلغاء اعتماد القالب');
      setTimeout(() => setMessage(null), 2000);
      onChanged?.();
    } catch (error) {
      setMessage('فشل في إلغاء اعتماد القالب');
      setTimeout(() => setMessage(null), 2000);
    }
  };

  const handleDiagnoseSystem = async () => {
    try {
      setMessage('جاري تشخيص النظام...');
      
      const diagnostics = await diagnoseSystem();
      const diagnosticsText = diagnostics.join('\n');
      
      // عرض التشخيص
      if (confirm(`تقرير التشخيص:\n\n${diagnosticsText}\n\nهل تريد نسخ التقرير للحافظة؟`)) {
        try {
          await navigator.clipboard.writeText(diagnosticsText);
          setMessage('تم نسخ تقرير التشخيص للحافظة');
        } catch {
          setMessage('فشل في نسخ التقرير - يرجى نسخه يدوياً');
        }
      } else {
        setMessage('تم إجراء التشخيص');
      }
      
      setTimeout(() => setMessage(null), 3000);
      
    } catch (error) {
      setMessage(`فشل في التشخيص: ${error}`);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const generatePreview = async () => {
    try {
      // التحقق من وجود القالب
      if (!draft || !draft.name) {
        setMessage('يرجى تحديد قالب أولاً');
        setTimeout(() => setMessage(null), 2000);
        return;
      }

      setMessage('جاري إنتاج المعاينة...');
      
      // محاكاة بيانات طلب للمعاينة
      const sampleData = {
        id: 'ALF-20250912-001-ABC123',
        fullName: 'أحمد محمد الخطيب',
        phone: '+963 11 1234567',
        email: 'ahmed@example.com',
        nationalId: '01234567890',
        requestType: 'استعلام',
        department: 'قسم الضرائب',
        submissionDate: new Date(),
        status: 'جديد',
        details: 'استعلام حول إجراءات تجديد الترخيص التجاري وما هي الوثائق المطلوبة والرسوم المترتبة على ذلك.'
      };

      // محاولة إنتاج المعاينة باستخدام الدالة المحسنة
      await generateSimplePreview(draft, sampleData);

      setMessage('تم إنتاج معاينة PDF بنجاح');
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('خطأ في إنتاج المعاينة:', error);
      const errorMessage = error instanceof Error ? error.message : 'خطأ غير محدد';
      setMessage(`فشل في إنتاج المعاينة: ${errorMessage}`);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">إدارة قوالب PDF</h2>
        <div className="flex gap-2">
          <button 
            onClick={addNew}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            إضافة قالب جديد
          </button>
          <label className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm cursor-pointer">
            استيراد قالب
            <input
              type="file"
              accept=".json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleImportTemplate(file);
                  e.target.value = ''; // إعادة تعيين قيمة الإدخال
                }
              }}
            />
          </label>
        </div>
      </div>

      {message && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded-lg text-sm">
          {message}
        </div>
      )}

      {editingIndex !== null && (
        <div className="bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">تحرير القالب: {templates[editingIndex]?.name}</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setPreviewMode(previewMode === 'edit' ? 'preview' : 'edit')}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                {previewMode === 'edit' ? 'معاينة' : 'تحرير'}
              </button>
              <button
                onClick={generatePreview}
                className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
              >
                إنتاج معاينة PDF
              </button>
              <button
                onClick={handleDiagnoseSystem}
                className="px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700"
                title="تشخيص مشاكل النظام"
              >
                🔧 تشخيص
              </button>
            </div>
          </div>

          {previewMode === 'edit' ? (
            <div className="grid md:grid-cols-2 gap-6">
              {/* إعدادات أساسية */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">اسم القالب</label>
                  <input
                    value={draft.name}
                    onChange={(e) => setDraft({...draft, name: e.target.value})}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-800"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">نوع القالب</label>
                  <select
                    value={draft.type}
                    onChange={(e) => setDraft({...draft, type: e.target.value})}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-800"
                  >
                    <option value="ticket_confirmation">إيصال تقديم الطلب</option>
                    <option value="ticket_report">تقرير الطلب</option>
                    <option value="department_report">تقرير القسم</option>
                    <option value="monthly_report">التقرير الشهري</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">عنوان الهيدر</label>
                  <textarea
                    value={draft.header.title}
                    onChange={(e) => setDraft({...draft, header: {...draft.header, title: e.target.value}})}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-800 min-h-[60px]"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">عنوان فرعي</label>
                  <input
                    value={draft.header.subtitle}
                    onChange={(e) => setDraft({...draft, header: {...draft.header, subtitle: e.target.value}})}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-800"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">عنوان المحتوى</label>
                  <input
                    value={draft.content.title}
                    onChange={(e) => setDraft({...draft, content: {...draft.content, title: e.target.value}})}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-800"
                  />
                </div>

                {/* إعدادات اللوغو */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <h4 className="font-medium mb-3">إعدادات اللوغو</h4>
                  
                  <div className="space-y-3">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={draft.header.logo}
                        onChange={(e) => setDraft({...draft, header: {...draft.header, logo: e.target.checked}})}
                        className="rounded"
                      />
                      <span className="text-sm">إظهار اللوغو</span>
                    </label>

                    {draft.header.logo && (
                      <>
                        <div>
                          <label className="block text-sm font-medium mb-1">تحميل لوغو SVG</label>
                          <input
                            type="file"
                            accept=".svg,image/svg+xml,.png,.jpg,.jpeg,image/png,image/jpeg"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                // التحقق من حجم الملف (حد أقصى 2MB)
                                if (file.size > 2 * 1024 * 1024) {
                                  alert('حجم الملف كبير جداً. الحد الأقصى: ٢ ميجابايت');
                                  return;
                                }
                                
                                try {
                                  const reader = new FileReader();
                                  reader.onload = (event) => {
                                    const base64 = event.target?.result as string;
                                    setDraft({
                                      ...draft, 
                                      header: {
                                        ...draft.header, 
                                        logoFile: base64,
                                        logoFileName: file.name
                                      }
                                    });
                                  };
                                  reader.readAsDataURL(file);
                                } catch (error) {
                                  alert('فشل في تحميل اللوغو');
                                }
                              }
                            }}
                            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-800 text-sm"
                          />
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            الصيغ المدعومة: SVG, PNG, JPG • الحد الأقصى: ٢MB
                          </p>
                          {draft.header.logoFileName && (
                            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                              ✅ تم تحميل: {draft.header.logoFileName}
                            </p>
                          )}
                        </div>

                        {draft.header.logoFile && (
                          <div>
                            <label className="block text-sm font-medium mb-1">معاينة اللوغو</label>
                            <div className="border border-gray-300 dark:border-gray-600 rounded p-3 bg-white dark:bg-gray-800">
                              <img 
                                src={draft.header.logoFile} 
                                alt="Logo Preview"
                                className="max-w-full max-h-24 mx-auto"
                                style={{
                                  width: draft.header.logoWidth ? `${draft.header.logoWidth}px` : 'auto',
                                  height: draft.header.logoHeight ? `${draft.header.logoHeight}px` : 'auto'
                                }}
                              />
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium mb-1">عرض اللوغو (px)</label>
                            <input
                              type="number"
                              min="20"
                              max="200"
                              value={draft.header.logoWidth || 60}
                              onChange={(e) => setDraft({...draft, header: {...draft.header, logoWidth: parseInt(e.target.value) || 60}})}
                              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-800"
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              القيمة الحالية: {formatNumber(draft.header.logoWidth || 60)}px
                            </p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">ارتفاع اللوغو (px)</label>
                            <input
                              type="number"
                              min="20"
                              max="200"
                              value={draft.header.logoHeight || 60}
                              onChange={(e) => setDraft({...draft, header: {...draft.header, logoHeight: parseInt(e.target.value) || 60}})}
                              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-800"
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              القيمة الحالية: {formatNumber(draft.header.logoHeight || 60)}px
                            </p>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-2">المسافة بين اللوغو والعنوان</label>
                          
                          {/* معاينة بصرية للمسافة */}
                          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-3 text-center">
                            <div className="inline-block w-8 h-8 bg-blue-500 rounded mb-1"></div>
                            <div 
                              className="border-l-2 border-dashed border-gray-400 mx-auto"
                              style={{ height: `${Math.max((draft.header.logoSpacing || 15) * 0.5, 2)}px`, width: '1px' }}
                            ></div>
                            <div className="text-xs font-medium text-gray-700 dark:text-gray-300">عنوان الهيدر</div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              معاينة المسافة: {formatNumber(draft.header.logoSpacing || 15)}px
                            </p>
                          </div>

                          <input
                            type="range"
                            min="0"
                            max="50"
                            value={draft.header.logoSpacing || 15}
                            onChange={(e) => setDraft({...draft, header: {...draft.header, logoSpacing: parseInt(e.target.value)}})}
                            className="w-full accent-blue-600"
                          />
                          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                            <span>ملتصق (٠px)</span>
                            <span className="font-medium text-blue-600 dark:text-blue-400">{formatNumber(draft.header.logoSpacing || 15)}px</span>
                            <span>متباعد (٥٠px)</span>
                          </div>
                          
                          {/* أزرار سريعة للمسافات الشائعة */}
                          <div className="flex gap-2 mt-3">
                            <button
                              type="button"
                              onClick={() => setDraft({...draft, header: {...draft.header, logoSpacing: 0}})}
                              className={`px-3 py-1 text-xs rounded transition-colors ${
                                (draft.header.logoSpacing || 15) === 0 
                                  ? 'bg-blue-600 text-white' 
                                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                              }`}
                            >
                              مدمج
                            </button>
                            <button
                              type="button"
                              onClick={() => setDraft({...draft, header: {...draft.header, logoSpacing: 10}})}
                              className={`px-3 py-1 text-xs rounded transition-colors ${
                                (draft.header.logoSpacing || 15) === 10
                                  ? 'bg-blue-600 text-white' 
                                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                              }`}
                            >
                              قريب
                            </button>
                            <button
                              type="button"
                              onClick={() => setDraft({...draft, header: {...draft.header, logoSpacing: 15}})}
                              className={`px-3 py-1 text-xs rounded transition-colors ${
                                (draft.header.logoSpacing || 15) === 15
                                  ? 'bg-blue-600 text-white' 
                                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                              }`}
                            >
                              متوسط
                            </button>
                            <button
                              type="button"
                              onClick={() => setDraft({...draft, header: {...draft.header, logoSpacing: 25}})}
                              className={`px-3 py-1 text-xs rounded transition-colors ${
                                (draft.header.logoSpacing || 15) === 25
                                  ? 'bg-blue-600 text-white' 
                                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                              }`}
                            >
                              متباعد
                            </button>
                          </div>

                          {/* نصائح سريعة */}
                          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 rounded p-2">
                            <strong>💡 نصائح:</strong>
                            <ul className="list-disc list-inside mt-1 space-y-1">
                              <li><strong>٠-١٠px:</strong> مناسب للوثائق المدمجة</li>
                              <li><strong>١٥-٢٥px:</strong> التوازن المثالي (موصى به)</li>
                              <li><strong>٣٠-٥٠px:</strong> مناسب للعناوين الكبيرة</li>
                              <li><strong>نصيحة الخطوط:</strong> فسطاط أو أميري مناسب للهيدر، نوتو نسخ للفوتر</li>
                            </ul>
                          </div>
                        </div>

                        {draft.header.logoFile && (
                          <button
                            onClick={() => setDraft({...draft, header: {...draft.header, logoFile: undefined, logoFileName: undefined}})}
                            className="text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                          >
                            🗑️ إزالة اللوغو
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* إعدادات التصميم */}
              <div className="space-y-4">
                <h4 className="font-medium">إعدادات التصميم</h4>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">حجم الصفحة</label>
                    <select
                      value={draft.styling.pageSize}
                      onChange={(e) => setDraft({...draft, styling: {...draft.styling, pageSize: e.target.value}})}
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-800"
                    >
                      <option value="A4">A4</option>
                      <option value="A5">A5</option>
                      <option value="Letter">Letter</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">خط الهيدر</label>
                    <select
                      value={draft.header.fontFamily || draft.styling.fontFamily}
                      onChange={(e) => setDraft({...draft, header: {...draft.header, fontFamily: e.target.value}})}
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-800 font-preview"
                      style={{ fontFamily: draft.header.fontFamily || draft.styling.fontFamily }}
                    >
                      <optgroup label="خطوط تقليدية">
                        <option value="Arial" className="font-sans">Arial - الافتراضي</option>
                        <option value="Helvetica" className="font-sans">Helvetica - هلفيتيكا</option>
                        <option value="Times" className="font-serif">Times - تايمز</option>
                      </optgroup>
                      <optgroup label="خطوط عربية كلاسيكية">
                        <option value="Amiri" className="font-amiri">الأميري - خط تقليدي أنيق</option>
                        <option value="Scheherazade New" className="font-scheherazade">شهرزاد الجديد - خط ناسخي جميل</option>
                        <option value="Aref Ruqaa" className="font-aref-ruqaa">عارف رقعة - خط الرقعة الكلاسيكي</option>
                        <option value="Lateef" className="font-lateef">لطيف - خط نسخي حديث</option>
                        <option value="Katibeh" className="font-katibeh">كاتبة - خط فارسي أنيق</option>
                      </optgroup>
                      <optgroup label="خطوط عربية حديثة">
                        <option value="Fustat" className="font-fustat">فسطاط - خط كوفي أنيق ومعاصر</option>
                        <option value="Reem Kufi" className="font-reem-kufi">ريم كوفي - خط كوفي عصري</option>
                        <option value="Markazi Text" className="font-markazi">نص مركزي - خط متعدد الاستخدامات</option>
                        <option value="Noto Naskh Arabic" className="font-naskh">نوتو نسخ عربي - خط نسخي احترافي</option>
                      </optgroup>
                    </select>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      معاينة خط الهيدر: <span style={{ fontFamily: draft.header.fontFamily || draft.styling.fontFamily, fontSize: '18px', fontWeight: 'bold' }}>الجمهورية العربية السورية 123</span>
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">خط الفوتر</label>
                    <select
                      value={draft.footer.fontFamily || draft.styling.fontFamily}
                      onChange={(e) => setDraft({...draft, footer: {...draft.footer, fontFamily: e.target.value}})}
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-800 font-preview"
                      style={{ fontFamily: draft.footer.fontFamily || draft.styling.fontFamily }}
                    >
                      <optgroup label="خطوط تقليدية">
                        <option value="Arial" className="font-sans">Arial - الافتراضي</option>
                        <option value="Helvetica" className="font-sans">Helvetica - هلفيتيكا</option>
                        <option value="Times" className="font-serif">Times - تايمز</option>
                      </optgroup>
                      <optgroup label="خطوط عربية كلاسيكية">
                        <option value="Amiri" className="font-amiri">الأميري - خط تقليدي أنيق</option>
                        <option value="Scheherazade New" className="font-scheherazade">شهرزاد الجديد - خط ناسخي جميل</option>
                        <option value="Aref Ruqaa" className="font-aref-ruqaa">عارف رقعة - خط الرقعة الكلاسيكي</option>
                        <option value="Lateef" className="font-lateef">لطيف - خط نسخي حديث</option>
                        <option value="Katibeh" className="font-katibeh">كاتبة - خط فارسي أنيق</option>
                      </optgroup>
                      <optgroup label="خطوط عربية حديثة">
                        <option value="Fustat" className="font-fustat">فسطاط - خط كوفي أنيق ومعاصر</option>
                        <option value="Reem Kufi" className="font-reem-kufi">ريم كوفي - خط كوفي عصري</option>
                        <option value="Markazi Text" className="font-markazi">نص مركزي - خط متعدد الاستخدامات</option>
                        <option value="Noto Naskh Arabic" className="font-naskh">نوتو نسخ عربي - خط نسخي احترافي</option>
                      </optgroup>
                    </select>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      معاينة خط الفوتر: <span style={{ fontFamily: draft.footer.fontFamily || draft.styling.fontFamily, fontSize: '14px' }}>يرجى الاحتفاظ بهذا الإيصال 2025</span>
                    </p>
                  </div>
                </div>

                {/* أحجام خطوط الهيدر والفوتر */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">حجم خط العنوان الرئيسي</label>
                    <input
                      type="range"
                      min="12"
                      max="28"
                      value={draft.header.titleFontSize || 18}
                      onChange={(e) => setDraft({...draft, header: {...draft.header, titleFontSize: parseInt(e.target.value)}})}
                      className="w-full mb-1"
                    />
                    <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                      {formatNumber(draft.header.titleFontSize || 18)} نقطة
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">حجم خط العنوان الفرعي</label>
                    <input
                      type="range"
                      min="10"
                      max="20"
                      value={draft.header.subtitleFontSize || 14}
                      onChange={(e) => setDraft({...draft, header: {...draft.header, subtitleFontSize: parseInt(e.target.value)}})}
                      className="w-full mb-1"
                    />
                    <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                      {formatNumber(draft.header.subtitleFontSize || 14)} نقطة
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">حجم خط الفوتر الرئيسي</label>
                    <input
                      type="range"
                      min="8"
                      max="16"
                      value={draft.footer.fontSize || 11}
                      onChange={(e) => setDraft({...draft, footer: {...draft.footer, fontSize: parseInt(e.target.value)}})}
                      className="w-full mb-1"
                    />
                    <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                      {formatNumber(draft.footer.fontSize || 11)} نقطة
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">حجم خط الفوتر الفرعي</label>
                    <input
                      type="range"
                      min="6"
                      max="14"
                      value={draft.footer.subFooterFontSize || 9}
                      onChange={(e) => setDraft({...draft, footer: {...draft.footer, subFooterFontSize: parseInt(e.target.value)}})}
                      className="w-full mb-1"
                    />
                    <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                      {formatNumber(draft.footer.subFooterFontSize || 9)} نقطة
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">الخط العام (للمحتوى)</label>
                  <select
                    value={draft.styling.fontFamily}
                    onChange={(e) => setDraft({...draft, styling: {...draft.styling, fontFamily: e.target.value}})}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-800 font-preview"
                    style={{ fontFamily: draft.styling.fontFamily }}
                  >
                    <optgroup label="خطوط تقليدية">
                      <option value="Arial" className="font-sans">Arial - الافتراضي</option>
                      <option value="Helvetica" className="font-sans">Helvetica - هلفيتيكا</option>
                      <option value="Times" className="font-serif">Times - تايمز</option>
                    </optgroup>
                    <optgroup label="خطوط عربية كلاسيكية">
                      <option value="Amiri" className="font-amiri">الأميري - خط تقليدي أنيق</option>
                      <option value="Scheherazade New" className="font-scheherazade">شهرزاد الجديد - خط ناسخي جميل</option>
                      <option value="Aref Ruqaa" className="font-aref-ruqaa">عارف رقعة - خط الرقعة الكلاسيكي</option>
                      <option value="Lateef" className="font-lateef">لطيف - خط نسخي حديث</option>
                      <option value="Katibeh" className="font-katibeh">كاتبة - خط فارسي أنيق</option>
                    </optgroup>
                    <optgroup label="خطوط عربية حديثة">
                      <option value="Fustat" className="font-fustat">فسطاط - خط كوفي أنيق ومعاصر</option>
                      <option value="Reem Kufi" className="font-reem-kufi">ريم كوفي - خط كوفي عصري</option>
                      <option value="Markazi Text" className="font-markazi">نص مركزي - خط متعدد الاستخدامات</option>
                      <option value="Noto Naskh Arabic" className="font-naskh">نوتو نسخ عربي - خط نسخي احترافي</option>
                    </optgroup>
                  </select>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    معاينة خط المحتوى: <span style={{ fontFamily: draft.styling.fontFamily, fontSize: '16px' }}>نموذج نص عربي جميل 123</span>
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">اللون الأساسي</label>
                    <input
                      type="color"
                      value={draft.styling.primaryColor}
                      onChange={(e) => setDraft({...draft, styling: {...draft.styling, primaryColor: e.target.value}})}
                      className="w-full p-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-800 h-10"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">اللون الثانوي</label>
                    <input
                      type="color"
                      value={draft.styling.secondaryColor}
                      onChange={(e) => setDraft({...draft, styling: {...draft.styling, secondaryColor: e.target.value}})}
                      className="w-full p-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-800 h-10"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">نص الفوتر</label>
                  <textarea
                    value={draft.footer.text}
                    onChange={(e) => setDraft({...draft, footer: {...draft.footer, text: e.target.value}})}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-800 min-h-[80px]"
                    rows={4}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">فوتر فرعي إضافي</label>
                  <textarea
                    value={draft.footer.subFooter || ''}
                    onChange={(e) => setDraft({...draft, footer: {...draft.footer, subFooter: e.target.value}})}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-800 min-h-[60px]"
                    rows={3}
                    placeholder="نص إضافي للفوتر (مثل: معلومات الاتصال، عنوان المؤسسة، إلخ...)"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">لون الخط الفاصل</label>
                    <input
                      type="color"
                      value={draft.footer.separatorColor || '#10b981'}
                      onChange={(e) => setDraft({...draft, footer: {...draft.footer, separatorColor: e.target.value}})}
                      className="w-full p-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-800 h-10"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">سمك الخط الفاصل</label>
                    <select
                      value={draft.footer.separatorThickness || '2'}
                      onChange={(e) => setDraft({...draft, footer: {...draft.footer, separatorThickness: e.target.value}})}
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-800"
                    >
                      <option value="1">رفيع (1px)</option>
                      <option value="2">متوسط (2px)</option>
                      <option value="3">عريض (3px)</option>
                      <option value="4">عريض جداً (4px)</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={draft.footer.qrCode}
                      onChange={(e) => setDraft({...draft, footer: {...draft.footer, qrCode: e.target.checked}})}
                      className="rounded"
                    />
                    <span className="text-sm">QR Code</span>
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={draft.footer.timestamp}
                      onChange={(e) => setDraft({...draft, footer: {...draft.footer, timestamp: e.target.checked}})}
                      className="rounded"
                    />
                    <span className="text-sm">الطابع الزمني</span>
                  </label>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-6 min-h-[400px]">
              <div className="text-center mb-4">
                <h3 className="text-lg font-bold">معاينة القالب</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">عرض تقريبي للقالب (البيانات تجريبية)</p>
              </div>
              
              <div className="max-w-md mx-auto border border-gray-300 dark:border-gray-600 rounded-lg p-6 bg-white dark:bg-gray-800">
                <div className="text-center mb-6" style={{ fontFamily: draft.header.fontFamily || draft.styling.fontFamily }}>
                  {draft.header.logo && (
                    <div 
                      className="mb-3" 
                      style={{ 
                        marginBottom: `${Math.max((draft.header.logoSpacing || 15) * 0.3, 8)}px`
                      }}
                    >
                      {draft.header.logoFile ? (
                        <img 
                          src={draft.header.logoFile} 
                          alt="Logo"
                          className="mx-auto"
                          style={{
                            width: `${(draft.header.logoWidth || 60) * 0.5}px`,
                            height: `${(draft.header.logoHeight || 60) * 0.5}px`,
                            maxWidth: '100px',
                            maxHeight: '100px'
                          }}
                        />
                      ) : (
                        <div className="text-xs text-gray-500 border border-dashed border-gray-300 dark:border-gray-600 rounded p-2 mx-auto w-16 h-16 flex items-center justify-center">
                          LOGO
                        </div>
                      )}
                    </div>
                  )}
                  <div 
                    className="font-bold text-sm mb-1" 
                    style={{
                      color: draft.styling.primaryColor,
                      fontSize: `${Math.max((draft.header.titleFontSize || 16) * 0.6, 10)}px`
                    }}
                  >
                    {draft.header.title.split('\n').map((line, i) => <div key={i}>{line}</div>)}
                  </div>
                  <div 
                    className="text-xs" 
                    style={{
                      color: draft.styling.secondaryColor,
                      fontSize: `${Math.max((draft.header.subtitleFontSize || 12) * 0.6, 8)}px`
                    }}
                  >
                    {draft.header.subtitle}
                  </div>
                </div>

                <div className="text-center mb-4" style={{ fontFamily: draft.styling.fontFamily }}>
                  <h3 className="font-bold" style={{color: draft.styling.primaryColor}}>
                    {draft.content.title}
                  </h3>
                </div>

                <div className="space-y-2 text-xs">
                  <div><strong>رقم الطلب:</strong> ALF-20250912-001-ABC123</div>
                  <div><strong>الاسم:</strong> أحمد محمد الخطيب</div>
                  <div><strong>الهاتف:</strong> +963 11 1234567</div>
                  <div><strong>النوع:</strong> استعلام</div>
                  <div><strong>القسم:</strong> قسم الضرائب</div>
                  <div><strong>التاريخ:</strong> {formatDateTime(new Date())}</div>
                  <div><strong>الحالة:</strong> <span style={{color: '#2563eb'}}>جديد</span></div>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-600 text-center" style={{ fontFamily: draft.footer.fontFamily || draft.styling.fontFamily }}>
                  <div 
                    className="text-xs" 
                    style={{
                      color: draft.styling.secondaryColor,
                      fontSize: `${Math.max((draft.footer.fontSize || 10) * 0.8, 8)}px`
                    }}
                  >
                    {draft.footer.text.split('\n').map((line, i) => <div key={i}>{line}</div>)}
                  </div>
                  {draft.footer.qrCode && <div className="mt-2 text-xs">[QR CODE]</div>}
                  {draft.footer.timestamp && (
                    <div className="mt-2 text-xs">تم الإصدار: {formatDateTime(new Date())}</div>
                  )}
                  
                  {/* الفوتر الإضافي الفرعي مع الخط الفاصل */}
                  {draft.footer.subFooter && (
                    <>
                      <div 
                        className="mt-3 mb-3 mx-auto"
                        style={{
                          height: `${draft.footer.separatorThickness || 2}px`,
                          backgroundColor: draft.footer.separatorColor || '#10b981',
                          width: '80%',
                        }}
                      />
                      <div 
                        className="text-xs" 
                        style={{
                          color: draft.styling.secondaryColor,
                          fontSize: `${Math.max((draft.footer.subFooterFontSize || 9) * 0.8, 7)}px`
                        }}
                      >
                        {draft.footer.subFooter.split('\n').map((line, i) => <div key={i}>{line}</div>)}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={cancel}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              إلغاء
            </button>
            <button
              onClick={save}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              حفظ التغييرات
            </button>
          </div>
        </div>
      )}

      {/* قائمة القوالب */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        {templates.length === 0 ? (
          <div className="p-6 text-center text-gray-500 dark:text-gray-400">
            لا توجد قوالب بعد. اضغط على "إضافة قالب جديد" للبدء.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-100 dark:bg-gray-800">
              <tr>
                <th className="p-3 text-right">اسم القالب</th>
                <th className="p-3 text-right">النوع</th>
                <th className="p-3 text-right">حالة الاعتماد</th>
                <th className="p-3 text-right">آخر تحديث</th>
                <th className="p-3 text-right">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {templates.map((template, i) => (
                <tr key={template.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="p-3 font-medium">{template.name}</td>
                  <td className="p-3">
                    <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 rounded text-xs">
                      {template.type === 'ticket_confirmation' ? 'إيصال طلب' : 
                       template.type === 'ticket_report' ? 'تقرير طلب' :
                       template.type === 'department_report' ? 'تقرير قسم' : 'تقرير شهري'}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      {template.approved ? (
                        <span className="flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200 rounded text-xs">
                          <FaCheckCircle size={12} />
                          معتمد
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 px-2 py-1 bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200 rounded text-xs">
                          <FaExclamationTriangle size={12} />
                          مسودة
                        </span>
                      )}
                      {template.approved && template.approvedBy && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          بواسطة: {template.approvedBy}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-3 text-gray-600 dark:text-gray-400">
                    {template.updatedAt ? formatDateTime(new Date(template.updatedAt)) : 
                     template.createdAt ? formatDateTime(new Date(template.createdAt)) : '—'}
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEdit(i)}
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        تحرير
                      </button>
                      <button
                        onClick={() => duplicate(i)}
                        className="text-green-600 dark:text-green-400 hover:underline"
                      >
                        نسخ
                      </button>
                      {template.approved ? (
                        <button
                          onClick={() => handleUnapproveTemplate(template.id)}
                          className="text-orange-600 dark:text-orange-400 hover:underline"
                          title="إلغاء الاعتماد"
                        >
                          إلغاء اعتماد
                        </button>
                      ) : (
                        <button
                          onClick={() => handleApproveTemplate(template.id)}
                          className="text-emerald-600 dark:text-emerald-400 hover:underline"
                          title="اعتماد القالب للاستخدام في التوليد"
                        >
                          اعتماد
                        </button>
                      )}
                      <button
                        onClick={() => handleExportTemplate(template)}
                        className="text-purple-600 dark:text-purple-400 hover:underline"
                      >
                        تصدير
                      </button>
                      <button
                        onClick={() => remove(i)}
                        className="text-red-600 dark:text-red-400 hover:underline"
                      >
                        حذف
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

// محرر إعدادات الموقع (الموقع، الهاتف، أوقات الدوام)
const SiteConfigEditor: React.FC = () => {
  const context = useContext(AppContext);
  const siteConfig = context?.siteConfig;
  const updateSiteConfig = context?.updateSiteConfig;

  const [draft, setDraft] = useState<SiteConfig>(() => siteConfig || {
    governorate: '', directorateName: '', address: '', phone: '',
    location: { lat: 0, lng: 0 }, whatsapp: '', workingHours: ''
  });
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (siteConfig) setDraft(prev => ({ ...prev, ...siteConfig }));
  }, [siteConfig]);

  const save = () => {
    if (updateSiteConfig) {
      updateSiteConfig(draft);
      setMsg('تم حفظ الإعدادات بنجاح.');
      setTimeout(() => setMsg(null), 2000);
    } else {
      setMsg('خطأ: التحديث غير متاح.');
    }
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700 rounded-xl p-6 space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <label className="text-sm">المحافظة
          <input className="mt-1 w-full p-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-800"
            value={draft.governorate} onChange={e => setDraft({...draft, governorate: e.target.value})} />
        </label>
        <label className="text-sm">اسم المديرية
          <input className="mt-1 w-full p-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-800"
            value={draft.directorateName} onChange={e => setDraft({...draft, directorateName: e.target.value})} />
        </label>
        <label className="text-sm md:col-span-2">العنوان
          <input className="mt-1 w-full p-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-800"
            value={draft.address} onChange={e => setDraft({...draft, address: e.target.value})} />
        </label>
        <label className="text-sm">رقم الهاتف
          <input className="mt-1 w-full p-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-800 text-left" dir="ltr"
            value={draft.phone} onChange={e => setDraft({...draft, phone: e.target.value})} />
        </label>
        <label className="text-sm">رقم واتساب
          <input className="mt-1 w-full p-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-800 text-left" dir="ltr"
            value={draft.whatsapp} onChange={e => setDraft({...draft, whatsapp: e.target.value})} />
        </label>
        <label className="text-sm md:col-span-2">أوقات الدوام
          <input className="mt-1 w-full p-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-800"
            value={draft.workingHours} onChange={e => setDraft({...draft, workingHours: e.target.value})} />
        </label>
        <div className="md:col-span-2 border-t border-gray-200 dark:border-gray-700 pt-4 mt-2">
            <h4 className="font-semibold mb-2 text-sm">إحداثيات الموقع (Google Maps)</h4>
            <div className="grid grid-cols-2 gap-4">
                <label className="text-sm">خط العرض (Latitude)
                <input type="number" step="any" className="mt-1 w-full p-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-800"
                    value={draft.location.lat} onChange={e => setDraft({...draft, location: {...draft.location, lat: parseFloat(e.target.value)}})} />
                </label>
                <label className="text-sm">خط الطول (Longitude)
                <input type="number" step="any" className="mt-1 w-full p-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-800"
                    value={draft.location.lng} onChange={e => setDraft({...draft, location: {...draft.location, lng: parseFloat(e.target.value)}})} />
                </label>
            </div>
            <p className="text-xs text-gray-500 mt-1">يمكنك الحصول على الإحداثيات بالنقر بزر الفأرة الأيمن على المكان في خرائط جوجل واختيار الأرقام.</p>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <button onClick={save} className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">حفظ الإعدادات</button>
      </div>
      {msg && <div className="text-sm text-green-700 dark:text-green-400 mt-2">{msg}</div>}
    </div>
  );
};

const ToolsPage: React.FC = () => {
  const [active, setActive] = useState<null | 'ocr' | 'newsAdd' | 'newsManage' | 'faqAdd' | 'faqManage' | 'privacyEdit' | 'termsEdit' | 'idConfig' | 'pdfTemplates' | 'observability' | 'siteConfig'>(null);
  const [newsCount, setNewsCount] = useState<number>(0);
  const [faqCount, setFaqCount] = useState<number>(0);
  const [ocrStats, setOcrStats] = useState<OcrStats | null>(null);
  const [privacyCustom, setPrivacyCustom] = useState<boolean>(false);
  const [termsCustom, setTermsCustom] = useState<boolean>(false);
  const [pdfTemplatesCount, setPdfTemplatesCount] = useState<number>(0);
  // إعدادات المعرّف
  const [idPrefix, setIdPrefix] = useState('ALF');
  const [idPattern, setIdPattern] = useState('{PREFIX}-{DATE}-{RAND6}');
  const [idSeqDigits, setIdSeqDigits] = useState(3);
  const [idRandLength, setIdRandLength] = useState(6);
  const [idDateFormat, setIdDateFormat] = useState<'YYYYMMDD' | 'YYMMDD'>('YYYYMMDD');
  const [idMsg, setIdMsg] = useState<string | null>(null);
  const [seqInfo, setSeqInfo] = useState<{date:string; seq:number}>({date:'', seq:0});
  // مراقبة وتتبع
  const [traceEnabled, setTraceEnabled] = useState<boolean>(() => (localStorage.getItem('VITE_TRACING_ENABLED') || 'false') === 'true');
  const [uxEnabled, setUxEnabled] = useState<boolean>(() => (localStorage.getItem('VITE_UX_ENABLED') || 'false') === 'true');
  const [lastRequestId, setLastRequestId] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setActive(null); };
    document.addEventListener('keydown', onKey);
    
    // تحميل الخطوط العربية الجميلة
    loadArabicFonts();
    
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

    try {
      const p = localStorage.getItem('privacyHtml');
      setPrivacyCustom(!!(p && p.trim()));
    } catch { setPrivacyCustom(false); }
    try {
      const t = localStorage.getItem('termsHtml');
      setTermsCustom(!!(t && t.trim()));
    } catch { setTermsCustom(false); }

    try {
      const templates = localStorage.getItem('pdfTemplates');
      if (templates) setPdfTemplatesCount(JSON.parse(templates).length);
      else setPdfTemplatesCount(0);
    } catch { setPdfTemplatesCount(0); }
  }, []);

  useEffect(() => { refreshStats(); }, [refreshStats]);

  // تحميل الإعدادات الحالية لمعرّف التذاكر
  useEffect(() => {
    try {
      const raw = localStorage.getItem('ticketIdConfig');
      if (raw) {
        const cfg = JSON.parse(raw);
        if (cfg.prefix) setIdPrefix(cfg.prefix);
        if (cfg.pattern) setIdPattern(cfg.pattern);
        if (cfg.seqDigits) setIdSeqDigits(cfg.seqDigits);
        if (cfg.randomLength) setIdRandLength(cfg.randomLength);
        if (cfg.dateFormat) setIdDateFormat(cfg.dateFormat);
      }
    } catch { /* ignore */ }
    try {
      const rawSeq = localStorage.getItem('ticketSeq');
      if (rawSeq) {
        const parsed = JSON.parse(rawSeq);
        if (parsed && parsed.date) setSeqInfo({date: parsed.date, seq: parsed.seq || 0});
      }
    } catch { /* ignore */ }
  }, []);

  function saveIdConfig() {
    try {
      const data = { prefix: idPrefix.trim() || 'ALF', pattern: idPattern.trim() || '{PREFIX}-{DATE}-{RAND6}', seqDigits: idSeqDigits, randomLength: idRandLength, dateFormat: idDateFormat };
      localStorage.setItem('ticketIdConfig', JSON.stringify(data));
      setIdMsg('تم حفظ الإعدادات.');
      setTimeout(()=>setIdMsg(null), 1800);
    } catch {
      setIdMsg('تعذر الحفظ');
    }
  }

  function resetIdConfig() {
    if (!confirm('سيتم حذف الإعدادات الحالية والعودة للوضع الافتراضي. متابعة؟')) return;
    try {
      localStorage.removeItem('ticketIdConfig');
      setIdPrefix('ALF');
      setIdPattern('{PREFIX}-{DATE}-{RAND6}');
      setIdSeqDigits(3);
      setIdRandLength(6);
      setIdDateFormat('YYYYMMDD');
      setIdMsg('تمت الاستعادة.');
      setTimeout(()=>setIdMsg(null), 1500);
    } catch { setIdMsg('فشل الاستعادة'); }
  }

  function resetSequence() {
    if (!confirm('إعادة تعيين التسلسل اليومي إلى 0؟')) return;
    try {
      const now = new Date();
      const datePart = (idDateFormat === 'YYMMDD' ? now.toISOString().slice(2,10) : now.toISOString().slice(0,10)).replace(/-/g,'');
      localStorage.setItem('ticketSeq', JSON.stringify({ date: datePart, seq: 0 }));
      setSeqInfo({date: datePart, seq:0});
      setIdMsg('تم تصفير التسلسل.');
      setTimeout(()=>setIdMsg(null), 1500);
    } catch { setIdMsg('فشل العملية'); }
  }

  function computePreview(count:number) {
    const list:string[] = [];
    const now = new Date();
    const datePart = (idDateFormat === 'YYMMDD' ? now.toISOString().slice(2,10) : now.toISOString().slice(0,10)).replace(/-/g,'');
    // قراءة التسلسل الحالي بدون تعديل التخزين
    let baseSeq = 0;
    try {
      const rawSeq = localStorage.getItem('ticketSeq');
      if (rawSeq) {
        const parsed = JSON.parse(rawSeq); if (parsed.date === datePart) baseSeq = parsed.seq || 0;
      }
    } catch { /* ignore */ }
    function pad(n:number, d:number){return n.toString().padStart(d,'0');}
    function rand(len:number){ const chars='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'; let o=''; for(let i=0;i<len;i++) o+=chars[Math.floor(Math.random()*chars.length)]; return o; }
    for(let i=1;i<=count;i++) {
      const seq = baseSeq + i;
      let out = idPattern.trim() || '{PREFIX}-{DATE}-{RAND6}';
      const replacements: Record<string,string> = {
        '{PREFIX}': (idPrefix.trim() || 'ALF').toUpperCase(),
        '{DATE}': datePart,
        '{SEQ}': String(seq),
        '{RAND}': rand(idRandLength),
        '{RAND4}': rand(4),
        '{RAND5}': rand(5),
        '{RAND6}': rand(6),
      };
      replacements[`{SEQ${idSeqDigits}}`] = pad(seq, idSeqDigits);
      replacements[`{RAND${idRandLength}}`] = rand(idRandLength);
      Object.entries(replacements).forEach(([k,v])=>{ out = out.replaceAll(k,v); });
      list.push(out.toUpperCase());
    }
    return list;
  }

  async function pingTraceId() {
    try {
      const r = await fetch('/api/trace-id');
      const j = await r.json();
      setLastRequestId(j.request_id || null);
    } catch {
      setLastRequestId(null);
    }
  }

  async function sendDemoTrace() {
    const tryFetch = async (url: string) => {
      try {
        const r = await fetch(url, { method: 'GET' });
        return r;
      } catch (e) {
        return null as any;
      }
    };

    // 1) Try via Vite proxy → backend
    let r = await tryFetch('/api/demo-trace');
    if (r && r.ok) {
      const j = await r.json();
      alert(`تم تنفيذ طلب تجريبي خلال ${j.ms}ms`);
      return;
    }

    // 2) Fallback directly to backend default port
    const directUrl = 'http://localhost:4000/api/demo-trace';
    const r2 = await tryFetch(directUrl);
    if (r2 && r2.ok) {
      const j = await r2.json();
      alert(`تم تنفيذ طلب تجريبي خلال ${j.ms}ms (عبر ${directUrl})`);
      return;
    }

    const body1 = r ? await r.text().catch(() => '') : '';
    const body2 = r2 ? await r2.text().catch(() => '') : '';
    alert(
      `فشل الطلب التجريبي\n` +
      `Proxy: ${r ? r.status + ' ' + r.statusText : 'no-response'}\n` +
      (body1 ? `${body1}\n` : '') +
      `Direct 4000: ${r2 ? r2.status + ' ' + r2.statusText : 'no-response'}\n` +
      (body2 ? `${body2}\n` : '') +
      `ملاحظة: تأكد أن الخلفية تعمل على 4000 (npm run server) وأن المنفذ غير مشغول.`
    );
  }

  async function testApiHealth() {
    const tryTxt = async (url: string) => {
      try {
        const r = await fetch(url);
        const txt = await r.text();
        return { r, txt } as const;
      } catch (e) {
        return null;
      }
    };
    const viaProxy = await tryTxt('/api/health');
    if (viaProxy?.r) {
      alert(`/api/health → ${viaProxy.r.status} ${viaProxy.r.statusText}\n${viaProxy.txt}`);
      if (viaProxy.r.ok) return;
    }
    const direct = await tryTxt('http://localhost:4000/api/health');
    if (direct?.r) {
      alert(`http://localhost:4000/api/health → ${direct.r.status} ${direct.r.statusText}\n${direct.txt}`);
      return;
    }
    alert('تعذر الوصول إلى /api/health عبر الوكيل أو مباشرة. يرجى التأكد من تشغيل الخادم: npm run server');
  }

  function applyObservabilityToggles() {
    try {
      localStorage.setItem('VITE_TRACING_ENABLED', String(traceEnabled));
      localStorage.setItem('VITE_UX_ENABLED', String(uxEnabled));
      alert('تم الحفظ. يرجى إعادة تحميل الصفحة لتطبيق الإعدادات.');
    } catch {
      alert('تعذر حفظ الإعدادات');
    }
  }

  return (
    <div className="rounded-2xl p-8 animate-fade-in-up transition-all duration-300 border border-white/20 dark:border-white/10 bg-white/70 dark:bg-gray-900/60 backdrop-blur shadow-lg">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6 text-center">قسم المعلوماتية</h1>

  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Site Config Card */}
          <div className="relative">
            <div
              role="button" tabIndex={0}
              onClick={() => setActive(active === 'siteConfig' ? null : 'siteConfig')}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActive(active === 'siteConfig' ? null : 'siteConfig'); } }}
              className="rounded-2xl border border-white/20 dark:border-white/10 bg-white/70 dark:bg-gray-800/70 backdrop-blur p-6 shadow-sm cursor-pointer hover:ring-2 hover:ring-blue-300/40 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <h3 className="text-xl font-semibold mb-1">إعدادات الموقع</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">تعديل معلومات المديرية (الموقع، الهاتف، أوقات الدوام).</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200">الإعدادات العامة</span>
              </div>
            </div>
          </div>
          {/* Observability Card */}
          <div className="relative">
            <div
              role="button" tabIndex={0}
              onClick={() => setActive(active === 'observability' ? null : 'observability')}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActive(active === 'observability' ? null : 'observability'); } }}
              className="rounded-2xl border border-white/20 dark:border-white/10 bg-white/70 dark:bg-gray-800/70 backdrop-blur p-6 shadow-sm cursor-pointer hover:ring-2 hover:ring-blue-300/40 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <h3 className="text-xl font-semibold mb-1">مراقبة وتتبع (Observability)</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">تفعيل تتبع OpenTelemetry وتجربة التتبّع وUX.</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className={`px-2 py-0.5 rounded ${traceEnabled ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200' : 'bg-gray-100 text-gray-800 dark:bg-gray-700/40 dark:text-gray-200'}`}>Tracing {traceEnabled ? 'ON' : 'OFF'}</span>
                <span className={`px-2 py-0.5 rounded ${uxEnabled ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200' : 'bg-gray-100 text-gray-800 dark:bg-gray-700/40 dark:text-gray-200'}`}>UX {uxEnabled ? 'ON' : 'OFF'}</span>
              </div>
            </div>
          </div>
          {/* Ticket ID Config Card */}
          <div className="relative">
            <div
              role="button" tabIndex={0}
              onClick={() => setActive(active === 'idConfig' ? null : 'idConfig')}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActive(active === 'idConfig' ? null : 'idConfig'); } }}
              className="rounded-2xl border border-white/20 dark:border-white/10 bg-white/70 dark:bg-gray-800/70 backdrop-blur p-6 shadow-sm cursor-pointer hover:ring-2 hover:ring-blue-300/40 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <h3 className="text-xl font-semibold mb-1">تهيئة معرّف التذكرة</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">تخصيص البادئة والقالب والتسلسل العشوائي.</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200">البادئة {idPrefix || '—'}</span>
                <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-800 dark:bg-gray-700/40 dark:text-gray-200">التسلسل {seqInfo.seq}</span>
              </div>
            </div>
          </div>
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
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">آخر مرة {formatDateTime(new Date(ocrStats.lastDateISO))}</span>
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

          {/* Privacy Editor Card */}
          <div className="relative">
            <div
              role="button" tabIndex={0}
              onClick={() => setActive(active === 'privacyEdit' ? null : 'privacyEdit')}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActive(active === 'privacyEdit' ? null : 'privacyEdit'); } }}
              className="rounded-2xl border border-white/20 dark:border-white/10 bg-white/70 dark:bg-gray-800/70 backdrop-blur p-6 shadow-sm cursor-pointer hover:ring-2 hover:ring-blue-300/40 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <h3 className="text-xl font-semibold mb-1">تحرير سياسة الخصوصية</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">تحديث نص صفحة سياسة الخصوصية العامة.</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className={`px-2 py-0.5 rounded ${privacyCustom ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200' : 'bg-gray-100 text-gray-800 dark:bg-gray-700/40 dark:text-gray-200'}`}>
                  الحالة: {privacyCustom ? 'مخصص' : 'افتراضي'}
                </span>
              </div>
            </div>
          </div>

          {/* Terms Editor Card */}
          <div className="relative">
            <div
              role="button" tabIndex={0}
              onClick={() => setActive(active === 'termsEdit' ? null : 'termsEdit')}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActive(active === 'termsEdit' ? null : 'termsEdit'); } }}
              className="rounded-2xl border border-white/20 dark:border-white/10 bg-white/70 dark:bg-gray-800/70 backdrop-blur p-6 shadow-sm cursor-pointer hover:ring-2 hover:ring-blue-300/40 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <h3 className="text-xl font-semibold mb-1">تحرير الشروط والأحكام</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">تحديث نص صفحة الشروط والأحكام العامة.</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className={`px-2 py-0.5 rounded ${termsCustom ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200' : 'bg-gray-100 text-gray-800 dark:bg-gray-700/40 dark:text-gray-200'}`}>
                  الحالة: {termsCustom ? 'مخصص' : 'افتراضي'}
                </span>
              </div>
            </div>
          </div>

          {/* PDF Templates Card */}
          <div className="relative">
            <div
              role="button" tabIndex={0}
              onClick={() => setActive(active === 'pdfTemplates' ? null : 'pdfTemplates')}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActive(active === 'pdfTemplates' ? null : 'pdfTemplates'); } }}
              className="rounded-2xl border border-white/20 dark:border-white/10 bg-white/70 dark:bg-gray-800/70 backdrop-blur p-6 shadow-sm cursor-pointer hover:ring-2 hover:ring-blue-300/40 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <h3 className="text-xl font-semibold mb-1">قوالب PDF</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">تصميم وإعداد قوالب PDF للطلبات والتقارير.</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200">القوالب {pdfTemplatesCount}</span>
                <span className="px-2 py-0.5 rounded bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200">تخصيص التصميم</span>
              </div>
            </div>
          </div>
        </div>

        {active && (
          <div className="relative mt-4 rounded-xl overflow-hidden border border-white/20 dark:border-white/10 bg-white/90 dark:bg-gray-900/90 shadow-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                {active === 'siteConfig' && 'إعدادات معلومات الموقع'}
                {active === 'idConfig' && 'إعدادات توليد معرف التذكرة'}
                {active === 'ocr' && 'أداة التعرف الضوئي على الحروف (OCR)'}
                {active === 'newsAdd' && 'إضافة خبر جديد'}
                {active === 'newsManage' && 'إدارة الأخبار'}
                {active === 'faqAdd' && 'إضافة سؤال شائع'}
                {active === 'faqManage' && 'إدارة الأسئلة الشائعة'}
                {active === 'privacyEdit' && 'تحرير سياسة الخصوصية'}
                {active === 'termsEdit' && 'تحرير الشروط والأحكام'}
                {active === 'pdfTemplates' && 'إعداد قوالب PDF'}
                {active === 'observability' && 'مراقبة وتتبع النظام'}
              </h3>
              <button onClick={() => setActive(null)} aria-label="إغلاق" className="w-8 h-8 rounded hover:bg-black/5 dark:hover:bg-white/10">✕</button>
            </div>
            <div className="p-4 max-h-[70vh] overflow-auto">
              {active === 'siteConfig' && <SiteConfigEditor />}
              {active === 'ocr' && <OcrTool onStatsChanged={refreshStats} />}
              {active === 'idConfig' && (
                <div className="space-y-5" dir="rtl">
                  <div className="grid md:grid-cols-3 gap-4">
                    <label className="text-sm md:col-span-1">البادئة (PREFIX)
                      <input value={idPrefix} onChange={e=>setIdPrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,''))} className="mt-1 w-full p-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-800" placeholder="ALF" />
                    </label>
                    <label className="text-sm md:col-span-2">القالب (PATTERN)
                      <input value={idPattern} onChange={e=>setIdPattern(e.target.value)} className="mt-1 w-full p-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-800 font-mono" placeholder="{PREFIX}-{DATE}-{SEQ3}-{RAND4}" />
                    </label>
                    <label className="text-sm">أرقام التسلسل (seqDigits)
                      <input type="number" min={1} max={6} value={idSeqDigits} onChange={e=>setIdSeqDigits(Math.min(6, Math.max(1, parseInt(e.target.value)||1)))} className="mt-1 w-full p-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-800" />
                    </label>
                    <label className="text-sm">طول العشوائي (randomLength)
                      <input type="number" min={2} max={12} value={idRandLength} onChange={e=>setIdRandLength(Math.min(12, Math.max(2, parseInt(e.target.value)||6)))} className="mt-1 w-full p-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-800" />
                    </label>
                    <label className="text-sm">صيغة التاريخ
                      <select value={idDateFormat} onChange={e=>setIdDateFormat(e.target.value as any)} className="mt-1 w-full p-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-800">
                        <option value="YYYYMMDD">YYYYMMDD</option>
                        <option value="YYMMDD">YYMMDD</option>
                      </select>
                    </label>
                  </div>
                  <div className="text-xs bg-gray-50 dark:bg-gray-800/40 p-3 rounded border border-gray-200 dark:border-gray-700 leading-relaxed">
                    العناصر المتاحة داخل القالب:<br />
                    <span className="font-mono">{`{PREFIX}`}</span>, <span className="font-mono">{`{DATE}`}</span>, <span className="font-mono">{`{SEQ}`}</span> (بدون أصفار)، <span className="font-mono">{`{SEQn}`}</span> حيث n عدد الأرقام (مثال {`{SEQ3}`})،<br />
                    <span className="font-mono">{`{RAND}`}</span> بطول العشوائي المحدد، و <span className="font-mono">{`{RANDn}`}</span> (مثل {`{RAND4}`},{`{RAND6}`}).
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={saveIdConfig} className="px-4 py-2 rounded bg-blue-600 text-white text-sm hover:bg-blue-700">حفظ الإعدادات</button>
                    <button onClick={resetIdConfig} className="px-4 py-2 rounded border border-gray-300 dark:border-gray-600 text-sm">إعادة الافتراضي</button>
                    <button onClick={resetSequence} className="px-4 py-2 rounded border border-red-300 text-red-700 bg-red-50 hover:bg-red-100 dark:border-red-700 dark:text-red-300 dark:bg-red-900/30 text-sm">تصفير التسلسل اليومي</button>
                  </div>
                  {idMsg && <div className="text-sm text-emerald-600 dark:text-emerald-400">{idMsg}</div>}
                  <div>
                    <h4 className="font-semibold mb-1">معاينة (لا تغيّر التسلسل الفعلي)</h4>
                    <ul className="list-disc pr-5 text-sm space-y-1 font-mono">
                      {computePreview(5).map((p,i)=>(<li key={i}>{p}</li>))}
                    </ul>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">ملاحظة: التوليد الفعلي يزيد التسلسل ويحفظه لكل يوم. المعاينة هنا لا تحفظ.</div>
                </div>
              )}
              {active === 'newsAdd' && <NewsAddForm onAdded={refreshStats} onSwitchToManage={() => setActive('newsManage')} />}
              {active === 'newsManage' && <NewsManager onChanged={refreshStats} onSwitchToAdd={() => setActive('newsAdd')} />}
              {active === 'faqAdd' && <FaqAddForm onAdded={refreshStats} onSwitchToManage={() => setActive('faqManage')} />}
              {active === 'faqManage' && <FaqManager onChanged={refreshStats} onSwitchToAdd={() => setActive('faqAdd')} />}
              {active === 'privacyEdit' && <LegalEditor storageKey="privacyHtml" title="تحرير سياسة الخصوصية" onChanged={refreshStats} />}
              {active === 'termsEdit' && <LegalEditor storageKey="termsHtml" title="تحرير الشروط والأحكام" onChanged={refreshStats} />}
              {active === 'pdfTemplates' && <PdfTemplateManager onChanged={refreshStats} />}
              {active === 'observability' && (
                <div className="space-y-4" dir="rtl">
                  {/* Open in new tab + password setup */}
                  <div className="flex flex-wrap gap-2 items-center">
                    <button onClick={() => window.open('#/observability','_blank')} className="px-4 py-2 rounded bg-indigo-600 text-white text-sm hover:bg-indigo-700">
                      فتح مراقبة وتتبع في صفحة جديدة
                    </button>
                    <span className="text-xs text-gray-600 dark:text-gray-400">(متوفرة للمسؤول فقط)</span>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <PasswordSetup />
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <label className="flex items-center gap-2 p-3 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40">
                      <input type="checkbox" checked={traceEnabled} onChange={(e)=>setTraceEnabled(e.target.checked)} />
                      <span className="text-sm">تفعيل تتبّع OpenTelemetry في الواجهة الأمامية</span>
                    </label>
                    <label className="flex items-center gap-2 p-3 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40">
                      <input type="checkbox" checked={uxEnabled} onChange={(e)=>setUxEnabled(e.target.checked)} />
                      <span className="text-sm">تفعيل مراقبة تجربة المستخدم (Clarity/Hotjar)</span>
                    </label>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={applyObservabilityToggles} className="px-4 py-2 rounded bg-blue-600 text-white text-sm hover:bg-blue-700">حفظ الإعدادات</button>
                    <button onClick={pingTraceId} className="px-4 py-2 rounded border border-gray-300 dark:border-gray-600 text-sm">قراءة request_id</button>
                    <button onClick={sendDemoTrace} className="px-4 py-2 rounded border border-gray-300 dark:border-gray-600 text-sm">طلب تجريبي (Trace)</button>
                    <button onClick={testApiHealth} className="px-4 py-2 rounded border border-gray-300 dark:border-gray-600 text-sm">فحص صحة الـ API</button>
                  </div>
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    <div>آخر request_id: <span className="font-mono">{lastRequestId || '—'}</span></div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">للتتبع الكامل نحو Tempo/Jaeger استخدم جامع OTEL على <code>http://localhost:4318</code> أو وفّر عنواناً في <code>VITE_OTLP_HTTP_URL</code>.</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ToolsPage;
