import React, { useContext, useMemo, useState, useRef } from 'react';
import { AppContext } from '../App';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import AppStoreLinksManager from '../components/AppStoreLinksManager';
import GeminiSettingsPage from './GeminiSettingsPage';
import { getGeminiConfig } from '../services/geminiService';
import { RequestStatus, ContactMessageStatus, ContactMessage } from '../types';
import type { Ticket } from '../types';
import { formatArabicNumber, formatArabicDate } from '../constants';
import { useDepartmentNames } from '../utils/departments';
import { Document, Page, pdfjs } from 'react-pdf';
import Mermaid from '../components/Mermaid';
import { DIWAN_WORKFLOW_DIAGRAM } from '../diagrams/diwan';
import { AnimatedCounter, DailyGoals, PointsDisplay } from '../components/GamificationWidgets';
// Use a real module worker to avoid fake worker fallback
// @ts-ignore Vite returns a Worker constructor for ?worker imports
import PdfJsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?worker';
// @ts-ignore Support workerPort if available
pdfjs.GlobalWorkerOptions.workerPort = new PdfJsWorker();

const statusColors: { [key in RequestStatus]: string } = {
  [RequestStatus.New]: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
  [RequestStatus.InProgress]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
  [RequestStatus.Answered]: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
  [RequestStatus.Closed]: 'bg-gray-100 text-gray-800 dark:bg-gray-700/50 dark:text-gray-300',
};

const StatusBadge: React.FC<{ status: RequestStatus }> = ({ status }) => (
  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColors[status]}`}>
    {status}
  </span>
);

// Badges for Contact Messages status
const contactStatusColors: { [key in ContactMessageStatus]: string } = {
  [ContactMessageStatus.New]: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
  [ContactMessageStatus.InProgress]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
  [ContactMessageStatus.Closed]: 'bg-gray-100 text-gray-800 dark:bg-gray-700/50 dark:text-gray-300',
};

const ContactStatusBadge: React.FC<{ status: ContactMessageStatus }> = ({ status }) => (
  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${contactStatusColors[status]}`}>
    {status}
  </span>
);

const readableSize = (size: number) => {
  if (size >= 1024 * 1024) return `${Math.ceil(size / (1024 * 1024))}MB`;
  if (size >= 1024) return `${Math.ceil(size / 1024)}KB`;
  return `${size}B`;
};

const DocxPreview: React.FC<{ file: File; onStart?: () => void; onFinish?: () => void; canceled?: boolean }> = ({ file, onStart, onFinish, canceled }) => {
  const [html, setHtml] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let localCancelled = false;
    setHtml(null);
    setError(null);

    if (canceled) {
      // If canceled, don't even start
      return;
    }

    onStart?.();
    (async () => {
      try {
        const arrayBuffer = await file.arrayBuffer();
        if (localCancelled) return;
        // @ts-ignore - dynamic import browser build
        const mammothMod = await import('mammoth/mammoth.browser');
        if (localCancelled) return;
        const mammothLib: any = mammothMod.default || mammothMod;
        const { value } = await mammothLib.convertToHtml({ arrayBuffer });
        if (!localCancelled) setHtml(value);
      } catch (e) {
        if (!localCancelled) setError('تعذر عرض ملف الوورد');
      } finally {
        if (!localCancelled) onFinish?.();
      }
    })();
    return () => { localCancelled = true; };
  }, [file, canceled]);

  if (canceled) return <div className="text-center py-10 text-white/90">تم إلغاء التحميل</div>;
  if (error) return <div className="text-center py-10 text-white/90">{error}</div>;
  if (!html) return <div className="text-center py-10 text-white/90">جارٍ تجهيز معاينة الوورد…</div>;
  return (
    <div className="prose max-w-none dark:prose-invert bg-white/90 dark:bg-gray-900/90 p-6 rounded border border-white/20 max-h-full overflow-auto" dangerouslySetInnerHTML={{ __html: html }} />
  );
};

const AttachmentGalleryModal: React.FC<{ files: File[]; startIndex?: number; onClose: () => void }> = ({ files, startIndex = 0, onClose }) => {
  const [index, setIndex] = useState<number>(startIndex);
  const file = files[index];
  const [numPages, setNumPages] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [canceled, setCanceled] = useState<boolean>(false);
  const [imgUrl, setImgUrl] = useState<string | null>(null);

  React.useEffect(() => {
    // Reset states when file changes
    setNumPages(null);
    setCanceled(false);
    setIsLoading(true);
    // Prepare image URL if needed
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setImgUrl(url);
      return () => {
        URL.revokeObjectURL(url);
        setImgUrl(null);
      };
    } else {
      setImgUrl(null);
    }
  }, [index]);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setIsLoading(false);
  }

  const onDocumentLoadError = (err: any) => {
    console.error('Error while loading PDF:', err);
    setIsLoading(false);
  };

  const openInNewTab = () => {
    const url = URL.createObjectURL(file);
    const win = window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    if (!win) alert('تعذر فتح الملف في تبويب جديد');
  };

  const downloadFile = () => {
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const cancelLoading = () => {
    if (isLoading && !canceled) {
      setCanceled(true);
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80" onClick={onClose}>
      <div className="relative w-screen h-screen" onClick={(e) => e.stopPropagation()}>
        {/* Top info bar - transparent */}
        <div className="absolute top-0 left-0 right-0 p-3 flex items-center justify-between text-white bg-transparent">
          <div className="min-w-0">
            <h3 className="text-sm font-bold truncate" title={file.name}>{file.name}</h3>
            <p className="text-xs opacity-80">ملف {index + 1} من {files.length} • {readableSize(file.size)}{file.type === 'application/pdf' && numPages ? ` • ${numPages} صفحة` : ''}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={openInNewTab} className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-white text-xs">فتح</button>
            <button onClick={downloadFile} className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-white text-xs">تنزيل</button>
            <button
              onClick={cancelLoading}
              title="إلغاء التحميل"
              aria-label="إلغاء التحميل"
              className={`w-8 h-8 rounded-full ${isLoading && !canceled ? 'bg-white/10 hover:bg-white/20' : 'bg-white/5 opacity-50 cursor-not-allowed'} text-white`}
              disabled={!isLoading || canceled}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Side navigation arrows */}
        {files.length > 1 && (
          <>
            <button
              aria-label="السابق"
              disabled={index === 0}
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white disabled:opacity-40"
            >
              ‹
            </button>
            <button
              aria-label="التالي"
              disabled={index === files.length - 1}
              onClick={() => setIndex((i) => Math.min(files.length - 1, i + 1))}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white disabled:opacity-40"
            >
              ›
            </button>
          </>
        )}

        {/* Content area */}
        <div className="h-full w-full flex items-center justify-center px-6 pt-16 pb-24">
          {canceled ? (
            <div className="text-center py-10 text-white/90">
              <p>تم إلغاء التحميل.</p>
              <p className="text-xs opacity-80 mt-2">يمكنك اختيار ملف آخر أو الانتقال بين الملفات من الأسهم.</p>
            </div>
          ) : file.type.startsWith('image/') ? (
            <div className="relative w-full h-full">
              {imgUrl ? (
                <img
                  src={imgUrl}
                  alt="معاينة"
                  className="absolute inset-0 w-full h-full object-contain"
                  onLoad={() => setIsLoading(false)}
                  onError={() => setIsLoading(false)}
                />
              ) : null}
              <div className="absolute bottom-0 left-0 right-0 p-3 bg-black/40 text-white backdrop-blur-sm text-xs flex items-center justify-between">
                <span className="truncate" title={file.name}>{file.name}</span>
                <span className="opacity-90">صورة • {readableSize(file.size)}</span>
              </div>
            </div>
          ) : file.type === 'application/pdf' ? (
            <div className="relative flex justify-center items-center max-h-full overflow-auto w-full">
              <Document
                file={file}
                onLoadSuccess={onDocumentLoadSuccess}
                onLoadError={onDocumentLoadError}
                loading="جاري تحميل المعاينة..."
                className="flex justify-center"
              >
                {!canceled && <Page pageNumber={1} renderTextLayer={false} renderAnnotationLayer={false} />}
              </Document>
              <div className="absolute bottom-0 left-0 right-0 p-3 bg-black/40 text-white backdrop-blur-sm text-xs flex items-center justify-between">
                <span className="truncate" title={file.name}>{file.name}</span>
                <span className="opacity-90">PDF{numPages ? ` • ${numPages} صفحة` : ''} • {readableSize(file.size)}</span>
              </div>
            </div>
          ) : (file.type.includes('wordprocessingml.document') || file.name.toLowerCase().endsWith('.docx')) ? (
            <div className="relative w-full h-full overflow-auto">
              <DocxPreview file={file} onStart={() => setIsLoading(true)} onFinish={() => setIsLoading(false)} canceled={canceled} />
              <div className="absolute bottom-0 left-0 right-0 p-3 bg-black/40 text-white backdrop-blur-sm text-xs flex items-center justify-between">
                <span className="truncate" title={file.name}>{file.name}</span>
                <span className="opacity-90">Word • {readableSize(file.size)}</span>
              </div>
            </div>
          ) : (
            <div className="text-center py-10 text-white/90">
              <p>لا يمكن معاينة هذا النوع من الملفات.</p>
              <button onClick={downloadFile} className="mt-4 inline-block px-3 py-1.5 rounded bg-white/10 hover:bg-white/20">تنزيل الملف</button>
            </div>
          )}
        </div>

        {/* Bottom options bar - transparent */}
        {files.length > 1 && (
          <div className="absolute bottom-0 left-0 right-0 p-2 overflow-x-auto bg-transparent">
            <div className="flex gap-2 px-2">
              {files.map((f, i) => (
                <button
                  key={i}
                  onClick={() => setIndex(i)}
                  title={f.name}
                  className={`px-2 py-1 rounded text-xs whitespace-nowrap border ${i === index ? 'bg-white/20 text-white border-white/50' : 'bg-transparent text-white/90 border-white/20 hover:bg-white/10'}`}
                >
                  {f.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const DiwanWorkflowModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/75" onClick={onClose}>
      <div className="relative w-screen h-screen" onClick={(e) => e.stopPropagation()}>
        <div className="absolute top-6 left-1/2 -translate-x-1/2 w-[92vw] max-w-6xl rounded-xl border border-white/20 bg-white dark:bg-gray-900 shadow-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-800/70">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">مخطط سير عمل الديوان العام</h3>
            <button onClick={onClose} aria-label="إغلاق" className="w-8 h-8 rounded hover:bg-black/5 dark:hover:bg-white/10">✕</button>
          </div>
          <div className="p-4 max-h-[78vh] overflow-auto">
            <div className="rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3">
              <Mermaid chart={DIWAN_WORKFLOW_DIAGRAM} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


const DashboardPage: React.FC = () => {
  const appContext = useContext(AppContext);
  const tickets = appContext?.tickets || [];
  const contactMessages = appContext?.contactMessages || [];
  const updateTicketStatus = appContext?.updateTicketStatus;
  const currentEmployee = appContext?.currentEmployee;

  // استخدام دالة navigateTo من الـ context مع fallback
  const navigateTo = appContext?.navigateTo || ((hash: string) => {
    window.location.hash = hash;
    window.scrollTo({ top: 0, behavior: 'instant' });
  });


  const [galleryFiles, setGalleryFiles] = useState<File[] | null>(null);
  const [galleryStartIndex, setGalleryStartIndex] = useState<number>(0);
  const [showDiwanModal, setShowDiwanModal] = useState<boolean>(false);
  const [showAppStoreSettings, setShowAppStoreSettings] = useState<boolean>(false);
  const [showGeminiSettings, setShowGeminiSettings] = useState<boolean>(false);

  // Filter states for integrated management
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [deptFilter, setDeptFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [sourceFilter, setSourceFilter] = useState<string>('ALL');
  const [docFilter, setDocFilter] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');

  const contactSectionRef = useRef<HTMLDivElement | null>(null);
  const openGallery = (files: File[], startIndex = 0) => { setGalleryFiles(files); setGalleryStartIndex(startIndex); };
  const closeGallery = () => setGalleryFiles(null);

  // Employee access control
  const isAdmin = currentEmployee?.role === 'مدير';
  const myDept = currentEmployee?.department;
  const departmentNames = useDepartmentNames();

  // إخفاء الكروت المنفصلة للأرشيف (نُبقي على كرت "الأرشيف" فقط)
  const showStandaloneArchiveCards = false;

  // Function to check ticket access permissions
  const canAccessTicket = (ticket: Ticket): boolean => {
    if (isAdmin) return true;
    if (!myDept) return false;
    return String(ticket.department) === myDept || (ticket.forwardedTo || []).includes(myDept);
  };

  const ticketStats = useMemo(() => {
    const total = tickets.length;
    const byStatus: Record<RequestStatus, number> = {
      [RequestStatus.New]: 0,
      [RequestStatus.InProgress]: 0,
      [RequestStatus.Answered]: 0,
      [RequestStatus.Closed]: 0,
    };
    let employeeTickets = 0;
    let citizenTickets = 0;

    tickets.forEach(t => {
      byStatus[t.status]++;
      if (t.source === 'موظف') {
        employeeTickets++;
      } else {
        citizenTickets++;
      }
    });

    return { total, byStatus, employeeTickets, citizenTickets };
  }, [tickets]);

  const contactStats = useMemo(() => {
    const total = contactMessages.length;
    const byStatus: Record<ContactMessageStatus, number> = {
      [ContactMessageStatus.New]: 0,
      [ContactMessageStatus.InProgress]: 0,
      [ContactMessageStatus.Closed]: 0,
    };
    let employeeMessages = 0;
    let citizenMessages = 0;

    contactMessages.forEach(m => {
      byStatus[m.status]++;
      if (m.source === 'موظف') {
        employeeMessages++;
      } else {
        citizenMessages++;
      }
    });

    return { total, byStatus, employeeMessages, citizenMessages };
  }, [contactMessages]);

  const departmentsCount = useMemo(() => {
    try {
      const raw = localStorage.getItem('departmentsList');
      if (!raw) return 5; // fallback to default cards text
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr.length : 5;
    } catch { return 5; }
  }, []);

  const handleStatusChange = (ticket: Ticket, newStatus: string) => {
    if (updateTicketStatus) {
      updateTicketStatus(ticket.id, newStatus as RequestStatus);

      if (ticket.email) {
        const sendEmail = window.confirm(`تم تغيير حالة الطلب إلى "${newStatus}".\nهل تريد إرسال بريد إلكتروني لإعلام ${ticket.fullName}؟`);

        if (sendEmail) {
          const subject = `تحديث بخصوص طلبك رقم ${ticket.id}`;
          const trackUrl = new URL('#/track', window.location.href).href;
          const body = `مرحباً ${ticket.fullName}،

تم تحديث حالة طلبك.

الحالة الجديدة: ${newStatus}

يمكنك متابعة طلبك عبر الرابط التالي:
${trackUrl}

رقم التتبع الخاص بك هو: ${ticket.id}

مع تحيات،
مديرية مالية حلب`;

          const mailtoLink = `mailto:${ticket.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body.trim())}`;

          window.open(mailtoLink, '_blank');
        }
      }
    }
  };

  return (
    <Card>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100">لوحة التحكم</h2>
          {currentEmployee && (
            <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              مرحباً {currentEmployee.name} - {currentEmployee.department} ({currentEmployee.role})
            </div>
          )}
        </div>

      </div>

      {/* قسم الأهداف اليومية والنقاط */}
      <div className="mb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* النقاط والمستوى */}
        <PointsDisplay
          points={(() => {
            // حساب النقاط بناءً على الطلبات المُجابة
            const answeredToday = tickets.filter(t =>
              t.status === RequestStatus.Answered &&
              t.answeredAt &&
              new Date(t.answeredAt).toDateString() === new Date().toDateString()
            ).length;
            return answeredToday * 10 + tickets.filter(t => t.status === RequestStatus.Closed).length * 5;
          })()}
          level={Math.floor(tickets.filter(t => t.status === RequestStatus.Answered).length / 10) + 1}
          nextLevelPoints={(Math.floor(tickets.filter(t => t.status === RequestStatus.Answered).length / 10) + 1) * 100}
        />

        {/* الأهداف اليومية */}
        <DailyGoals
          goals={[
            {
              id: 'answer-tickets',
              title: 'الرد على الشكاوى',
              current: tickets.filter(t =>
                t.status === RequestStatus.Answered &&
                t.answeredAt &&
                new Date(t.answeredAt).toDateString() === new Date().toDateString()
              ).length,
              target: 5,
              icon: '📝'
            },
            {
              id: 'process-new',
              title: 'معالجة الطلبات الجديدة',
              current: tickets.filter(t =>
                t.status === RequestStatus.InProgress &&
                t.startedAt &&
                new Date(t.startedAt).toDateString() === new Date().toDateString()
              ).length,
              target: 3,
              icon: '⚡'
            },
            {
              id: 'close-tickets',
              title: 'إغلاق الطلبات',
              current: tickets.filter(t =>
                t.status === RequestStatus.Closed &&
                t.closedAt &&
                new Date(t.closedAt).toDateString() === new Date().toDateString()
              ).length,
              target: 2,
              icon: '✅'
            }
          ]}
        />

        {/* إحصائية سريعة */}
        <div className="rounded-2xl border-2 border-emerald-400/50 dark:border-emerald-500/50 bg-white/40 dark:bg-gray-900/40 backdrop-blur-md p-6">
          <h4 className="text-lg font-bold text-emerald-700 dark:text-emerald-400 mb-4">إحصائيات اليوم</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-2 bg-[#0f3c35]/5 dark:bg-[#0f3c35]/20 rounded-lg">
              <span className="text-[#0f3c35] dark:text-emerald-300">طلبات جديدة</span>
              <AnimatedCounter
                value={tickets.filter(t =>
                  t.status === RequestStatus.New &&
                  new Date(t.submissionDate).toDateString() === new Date().toDateString()
                ).length}
                className="text-2xl font-bold text-[#0f3c35] dark:text-emerald-400"
              />
            </div>
            <div className="flex items-center justify-between p-2 bg-[#0f3c35]/5 dark:bg-[#0f3c35]/20 rounded-lg">
              <span className="text-[#0f3c35] dark:text-emerald-300">تمت الإجابة</span>
              <AnimatedCounter
                value={tickets.filter(t =>
                  t.status === RequestStatus.Answered &&
                  t.answeredAt &&
                  new Date(t.answeredAt).toDateString() === new Date().toDateString()
                ).length}
                className="text-2xl font-bold text-[#0f3c35] dark:text-emerald-400"
              />
            </div>
            <div className="flex items-center justify-between p-2 bg-[#0f3c35]/5 dark:bg-[#0f3c35]/20 rounded-lg">
              <span className="text-[#0f3c35] dark:text-emerald-300">قيد المعالجة</span>
              <AnimatedCounter
                value={tickets.filter(t => t.status === RequestStatus.InProgress).length}
                className="text-2xl font-bold text-[#0f3c35] dark:text-emerald-400"
              />
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="space-y-8">

        {/* قسم الاستعلامات والشكاوى */}
        <div>
          <div className="mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
              الاستعلامات والشكاوى
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">إدارة ومتابعة طلبات المواطنين والتواصل معهم</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* إدارة الاستعلامات والشكاوى */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => navigateTo('#/complaints-management')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  navigateTo('#/complaints-management');
                }
              }}
              className="relative rounded-2xl border-2 border-indigo-400/50 dark:border-indigo-500/50 bg-white/40 dark:bg-gray-900/40 backdrop-blur-md p-6 shadow-sm hover:shadow-xl hover:shadow-indigo-500/10 cursor-pointer hover:-translate-y-1 hover:border-indigo-500/70 dark:hover:border-indigo-400/70 transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            >
              <h4 className="text-lg font-bold text-indigo-700 dark:text-indigo-400 mb-2">إدارة الاستعلامات والشكاوى</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-4">إدارة شاملة مصنفة للطلبات والرسائل</p>

              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 bg-[#0f3c35]/5 dark:bg-[#0f3c35]/20 rounded-lg">
                  <span className="text-sm font-medium text-[#0f3c35] dark:text-emerald-300">طلبات الموظفين</span>
                  <span className="text-lg font-bold text-[#0f3c35] dark:text-emerald-400">
                    {ticketStats.employeeTickets + contactStats.employeeMessages}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 bg-[#0f3c35]/5 dark:bg-[#0f3c35]/20 rounded-lg">
                  <span className="text-sm font-medium text-[#0f3c35] dark:text-emerald-300">طلبات المواطنين</span>
                  <span className="text-lg font-bold text-[#0f3c35] dark:text-emerald-400">
                    {ticketStats.citizenTickets + contactStats.citizenMessages}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 bg-[#0f3c35]/10 dark:bg-[#0f3c35]/30 rounded-lg border border-[#0f3c35]/20 dark:border-[#0f3c35]/40">
                  <span className="text-sm font-bold text-[#0f3c35] dark:text-emerald-200">الإجمالي</span>
                  <span className="text-xl font-bold text-[#0f3c35] dark:text-emerald-300">
                    {ticketStats.total + contactStats.total}
                  </span>
                </div>
              </div>
            </div>

            {/* المساعد الذكي (للمدير فقط) - نقل إلى قسم الاستعلامات والشكاوى */}
            {currentEmployee?.role === 'مدير' && (
              <div
                role="button"
                tabIndex={0}
                onClick={() => { navigateTo('#/ai-assistant'); }}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); window.location.hash = '#/ai-assistant'; } }}
                className="relative rounded-2xl border-2 border-emerald-400/50 dark:border-emerald-500/50 bg-white/40 dark:bg-gray-900/40 backdrop-blur-md p-6 shadow-sm hover:shadow-xl hover:shadow-emerald-500/10 cursor-pointer hover:-translate-y-1 hover:border-emerald-500/70 dark:hover:border-emerald-400/70 transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              >
                <h4 className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mb-2">المساعد الذكي AI</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">رد تلقائي على الاستفسارات، توجيه التذاكر، وتنبؤ بأوقات الذروة</p>
                <div className="mt-3 text-xs text-[#0f3c35]/70 dark:text-emerald-400/70">تجريبي • يعمل محليًا بدون اتصال خارجي</div>
              </div>
            )}

            {/* الأرشيف */}
            <div
              className="relative rounded-2xl border-2 border-slate-400/50 dark:border-slate-500/50 bg-white/40 dark:bg-gray-900/40 backdrop-blur-md p-6 shadow-sm"
            >
              <h4 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-2">الأرشيف</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-4">الوصول السريع للأرشيف</p>

              <div className="space-y-2">
                <button
                  onClick={() => navigateTo('#/requests')}
                  className="w-full flex items-center justify-between p-2 rounded-lg bg-[#0f3c35]/5 dark:bg-[#0f3c35]/20 border border-[#0f3c35]/10 dark:border-[#0f3c35]/30 hover:bg-[#0f3c35]/10 dark:hover:bg-[#0f3c35]/30 transition-colors"
                >
                  <span className="text-sm font-medium text-[#0f3c35] dark:text-emerald-300">أرشيف الطلبات</span>
                  <span className="text-lg font-bold text-[#0f3c35] dark:text-emerald-400">{formatArabicNumber(ticketStats.total)}</span>
                </button>

                <button
                  onClick={() => navigateTo('#/messages')}
                  className="w-full flex items-center justify-between p-2 rounded-lg bg-[#0f3c35]/5 dark:bg-[#0f3c35]/20 border border-[#0f3c35]/10 dark:border-[#0f3c35]/30 hover:bg-[#0f3c35]/10 dark:hover:bg-[#0f3c35]/30 transition-colors"
                >
                  <span className="text-sm font-medium text-[#0f3c35] dark:text-emerald-300">أرشيف رسائل التواصل</span>
                  <span className="text-lg font-bold text-[#0f3c35] dark:text-emerald-400">{formatArabicNumber(contactStats.total)}</span>
                </button>
              </div>
            </div>

            {/* أرشيف الطلبات - مخفي ضمن كرت مستقل */}
            {showStandaloneArchiveCards && (
              <div
                role="button"
                tabIndex={0}
                onClick={() => { window.location.hash = '#/requests'; }}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); window.location.hash = '#/requests'; } }}
                className="relative rounded-2xl border-2 border-sky-400/50 dark:border-sky-500/50 bg-white/40 dark:bg-gray-900/40 backdrop-blur-md p-6 shadow-sm cursor-pointer hover:shadow-xl hover:shadow-sky-500/10 hover:-translate-y-1 hover:border-sky-500/70 dark:hover:border-sky-400/70 transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-sky-500/50"
              >
                <h4 className="text-lg font-bold text-sky-600 dark:text-sky-400 mb-2">أرشيف الطلبات</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">إدارة ومتابعة جميع الطلبات الواردة</p>
                <div className="mt-3 flex gap-2 flex-wrap text-xs">
                  <span className="px-2 py-0.5 rounded bg-[#0f3c35]/10 text-[#0f3c35] dark:bg-[#0f3c35]/30 dark:text-emerald-300">الإجمالي {formatArabicNumber(ticketStats.total)}</span>
                  <span className="px-2 py-0.5 rounded bg-[#0f3c35]/10 text-[#0f3c35] dark:bg-[#0f3c35]/30 dark:text-emerald-300">{RequestStatus.New} {formatArabicNumber(ticketStats.byStatus[RequestStatus.New])}</span>
                  <span className="px-2 py-0.5 rounded bg-[#0f3c35]/10 text-[#0f3c35] dark:bg-[#0f3c35]/30 dark:text-emerald-300">{RequestStatus.InProgress} {formatArabicNumber(ticketStats.byStatus[RequestStatus.InProgress])}</span>
                  <span className="px-2 py-0.5 rounded bg-[#0f3c35]/10 text-[#0f3c35] dark:bg-[#0f3c35]/30 dark:text-emerald-300">{RequestStatus.Answered} {formatArabicNumber(ticketStats.byStatus[RequestStatus.Answered])}</span>
                  <span className="px-2 py-0.5 rounded bg-[#0f3c35]/10 text-[#0f3c35] dark:bg-[#0f3c35]/30 dark:text-emerald-300">{RequestStatus.Closed} {formatArabicNumber(ticketStats.byStatus[RequestStatus.Closed])}</span>
                </div>
              </div>
            )
            }

            {/* أرشيف رسائل التواصل - مخفي ضمن كرت مستقل */}
            {
              showStandaloneArchiveCards && (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => { window.location.hash = '#/messages'; }}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); window.location.hash = '#/messages'; } }}
                  className="relative rounded-2xl border-2 border-teal-400/50 dark:border-teal-500/50 bg-white/40 dark:bg-gray-900/40 backdrop-blur-md p-6 shadow-sm cursor-pointer hover:shadow-xl hover:shadow-teal-500/10 hover:-translate-y-1 hover:border-teal-500/70 dark:hover:border-teal-400/70 transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                >
                  <h4 className="text-lg font-bold text-teal-600 dark:text-teal-400 mb-2">أرشيف رسائل التواصل</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">عرض ومعالجة رسائل "تواصل معنا"</p>
                  <div className="mt-3 flex gap-2 flex-wrap text-xs">
                    <span className="px-2 py-0.5 rounded bg-[#0f3c35]/10 text-[#0f3c35] dark:bg-[#0f3c35]/30 dark:text-emerald-300">الإجمالي {contactStats.total}</span>
                    <span className="px-2 py-0.5 rounded bg-[#0f3c35]/10 text-[#0f3c35] dark:bg-[#0f3c35]/30 dark:text-emerald-300">جديد {contactStats.byStatus[ContactMessageStatus.New]}</span>
                    <span className="px-2 py-0.5 rounded bg-[#0f3c35]/10 text-[#0f3c35] dark:bg-[#0f3c35]/30 dark:text-emerald-300">قيد المعالجة {contactStats.byStatus[ContactMessageStatus.InProgress]}</span>
                    <span className="px-2 py-0.5 rounded bg-[#0f3c35]/10 text-[#0f3c35] dark:bg-[#0f3c35]/30 dark:text-emerald-300">مغلق {contactStats.byStatus[ContactMessageStatus.Closed]}</span>
                  </div>
                </div >
              )
            }

            {/* مركز المراقبة والتحليل */}
            {
              currentEmployee?.role === 'مدير' && (
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => { window.location.hash = '#/monitor'; }}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); window.location.hash = '#/monitor'; } }}
                  className="relative rounded-2xl border-2 border-violet-400/50 dark:border-violet-500/50 bg-white/40 dark:bg-gray-900/40 backdrop-blur-md p-6 shadow-sm cursor-pointer hover:shadow-xl hover:shadow-violet-500/10 hover:-translate-y-1 hover:border-violet-500/70 dark:hover:border-violet-400/70 transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                >
                  <h4 className="text-lg font-bold text-violet-600 dark:text-violet-400 mb-2">مركز المراقبة والتحليل</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">إحصاءات فورية وأداء النظام</p>
                  <div className="mt-3 flex gap-2 flex-wrap text-xs">
                    <span className="px-2 py-0.5 rounded bg-[#0f3c35]/10 text-[#0f3c35] dark:bg-[#0f3c35]/30 dark:text-emerald-300">التذاكر {ticketStats.total}</span>
                    <span className="px-2 py-0.5 rounded bg-[#0f3c35]/10 text-[#0f3c35] dark:bg-[#0f3c35]/30 dark:text-emerald-300">مردود {ticketStats.byStatus[RequestStatus.Answered]}</span>
                    <span className="px-2 py-0.5 rounded bg-[#0f3c35]/10 text-[#0f3c35] dark:bg-[#0f3c35]/30 dark:text-emerald-300">مغلق {ticketStats.byStatus[RequestStatus.Closed]}</span>
                  </div>
                </div >
              )
            }
          </div >
        </div >

        {/* قسم الإدارة العامة */}
        < div >
          <div className="mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
              الإدارة العامة
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">النظم الإدارية والموارد البشرية والهيكل التنظيمي</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* المعلوماتية / المحتوى */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => { window.location.hash = '#/tools'; }}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); window.location.hash = '#/tools'; } }}
              className="relative rounded-2xl border-2 border-blue-400/50 dark:border-blue-500/50 bg-white/40 dark:bg-gray-900/40 backdrop-blur-md p-6 shadow-sm cursor-pointer hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-1 hover:border-blue-500/70 dark:hover:border-blue-400/70 transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <h4 className="text-lg font-bold text-blue-700 dark:text-blue-400 mb-2">المعلوماتية / المحتوى</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">تحرير المحتوى (الأخبار، الأسئلة، الشروط، الخصوصية)</p>
            </div>

            {/* الموارد البشرية */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => { window.location.hash = '#/hrms'; }}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); window.location.hash = '#/hrms'; } }}
              className="relative rounded-2xl border-2 border-amber-400/50 dark:border-amber-500/50 bg-white/40 dark:bg-gray-900/40 backdrop-blur-md p-6 shadow-sm cursor-pointer hover:shadow-xl hover:shadow-amber-500/10 hover:-translate-y-1 hover:border-amber-500/70 dark:hover:border-amber-400/70 transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            >
              <h4 className="text-lg font-bold text-amber-600 dark:text-amber-400 mb-2">الموارد البشرية</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">منصة HRMS متكاملة: بيانات الموظفين، الرواتب، الحضور، الإجازات، والأداء</p>
            </div>

            {/* الهيكل الإداري */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => { window.location.hash = '#/departments?manage=1'; }}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); window.location.hash = '#/departments?manage=1'; } }}
              className="relative rounded-2xl border-2 border-cyan-400/50 dark:border-cyan-500/50 bg-white/40 dark:bg-gray-900/40 backdrop-blur-md p-6 shadow-sm cursor-pointer hover:shadow-xl hover:shadow-cyan-500/10 hover:-translate-y-1 hover:border-cyan-500/70 dark:hover:border-cyan-400/70 transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            >
              <h4 className="text-lg font-bold text-cyan-600 dark:text-cyan-400 mb-2">الهيكل الإداري</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">صفحة أقسام المديرية ومهام كل قسم</p>
              <div className="mt-3 text-xs text-[#0f3c35]/70 dark:text-emerald-400/70">{`عدد الأقسام: ${departmentsCount}`}</div>
            </div>

            {/* إدارة الديوان العام */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => { window.location.hash = '#/diwan'; }}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); window.location.hash = '#/diwan'; } }}
              className="relative rounded-2xl border-2 border-yellow-400/50 dark:border-yellow-500/50 bg-white/40 dark:bg-gray-900/40 backdrop-blur-md p-6 shadow-sm cursor-pointer hover:shadow-xl hover:shadow-yellow-500/10 hover:-translate-y-1 hover:border-yellow-500/70 dark:hover:border-yellow-400/70 transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
            >
              <h4 className="text-lg font-bold text-yellow-700 dark:text-yellow-400 mb-2">إدارة الديوان العام</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">التعاميم والكتب الرسمية (إنشاء وأرشفة)</p>
              <div className="mt-3 text-xs text-[#0f3c35]/70 dark:text-emerald-400/70">وارد 0 • صادر 0 • قيد 0</div>
            </div>

            {/* نظام حجز المواعيد */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => navigateTo('#/appointment-dashboard')}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigateTo('#/appointment-dashboard'); } }}
              className="relative rounded-2xl border-2 border-teal-400/50 dark:border-teal-500/50 bg-white/40 dark:bg-gray-900/40 backdrop-blur-md p-6 shadow-sm cursor-pointer hover:shadow-xl hover:shadow-teal-500/10 hover:-translate-y-1 hover:border-teal-500/70 dark:hover:border-teal-400/70 transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-teal-500/50"
            >
              <h4 className="text-lg font-bold text-teal-700 dark:text-teal-400 mb-2">نظام حجز المواعيد</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-4">إدارة مواعيد المراجعين والطوابير</p>

              <div className="space-y-2">
                <button
                  onClick={(e) => { e.stopPropagation(); navigateTo('#/appointment-booking'); }}
                  className="w-full flex items-center justify-between p-2 rounded-lg bg-[#0f3c35]/5 dark:bg-[#0f3c35]/20 border border-[#0f3c35]/10 dark:border-[#0f3c35]/30 hover:bg-[#0f3c35]/10 dark:hover:bg-[#0f3c35]/30 transition-colors"
                >
                  <span className="text-sm font-medium text-[#0f3c35] dark:text-emerald-300">حجز موعد جديد</span>
                </button>

                <button
                  onClick={(e) => { e.stopPropagation(); navigateTo('#/qr-checkin'); }}
                  className="w-full flex items-center justify-between p-2 rounded-lg bg-[#0f3c35]/5 dark:bg-[#0f3c35]/20 border border-[#0f3c35]/10 dark:border-[#0f3c35]/30 hover:bg-[#0f3c35]/10 dark:hover:bg-[#0f3c35]/30 transition-colors"
                >
                  <span className="text-sm font-medium text-[#0f3c35] dark:text-emerald-300">مسح QR للحضور</span>
                </button>

                <div className="flex items-center justify-between p-2 bg-[#0f3c35]/10 dark:bg-[#0f3c35]/30 rounded-lg border border-[#0f3c35]/20 dark:border-[#0f3c35]/40">
                  <span className="text-sm font-bold text-[#0f3c35] dark:text-emerald-200">لوحة التحكم</span>
                </div>
              </div>
            </div>

            {/* إدارة الموظفين والأمان */}
            {currentEmployee?.role === 'مدير' && (
              <div
                role="button"
                tabIndex={0}
                onClick={() => { window.location.hash = '#/employees'; }}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); window.location.hash = '#/employees'; } }}
                className="relative rounded-2xl border-2 border-rose-400/50 dark:border-rose-500/50 bg-white/40 dark:bg-gray-900/40 backdrop-blur-md p-6 shadow-sm cursor-pointer hover:shadow-xl hover:shadow-rose-500/10 hover:-translate-y-1 hover:border-rose-500/70 dark:hover:border-rose-400/70 transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-rose-500/50"
              >
                <h4 className="text-lg font-bold text-rose-600 dark:text-rose-400 mb-2">إدارة الموظفين</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">إدارة حسابات الموظفين، المصادقة متعددة العوامل، وأمان الجلسات</p>
                <div className="mt-3 text-xs text-[#0f3c35]/70 dark:text-emerald-400/70">إعدادات أمنية متقدمة</div>
              </div>
            )}
          </div>
        </div>

        {/* قسم الأمان والحماية */}
        <div>
          <div className="mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
              الأمان والحماية
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">إعدادات الأمان والمصادقة وإدارة الجلسات</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* المصادقة متعددة العوامل */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => {
                try { window.sessionStorage.setItem('mfa_from_dashboard', '1'); } catch { }
                window.location.hash = '#/mfa-management';
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  try { window.sessionStorage.setItem('mfa_from_dashboard', '1'); } catch { }
                  window.location.hash = '#/mfa-management';
                }
              }}
              className="relative rounded-2xl border-2 border-orange-400/50 dark:border-orange-500/50 bg-white/40 dark:bg-gray-900/40 backdrop-blur-md p-6 shadow-sm hover:shadow-xl hover:shadow-orange-500/10 cursor-pointer hover:-translate-y-1 hover:border-orange-500/70 dark:hover:border-orange-400/70 transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-orange-500/50"
            >
              <h4 className="text-lg font-bold text-orange-600 dark:text-orange-400 mb-2">المصادقة متعددة العوامل</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">إعداد وإدارة TOTP، الرموز الاحتياطية، والمصادقة الحيوية</p>
              <div className="mt-3 text-xs text-[#0f3c35]/70 dark:text-emerald-400/70">حماية إضافية للحسابات</div>
            </div>

            {/* أمان الجلسات */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => { window.location.hash = '#/session-security'; }}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); window.location.hash = '#/session-security'; } }}
              className="relative rounded-2xl border-2 border-red-400/50 dark:border-red-500/50 bg-white/40 dark:bg-gray-900/40 backdrop-blur-md p-6 shadow-sm hover:shadow-xl hover:shadow-red-500/10 cursor-pointer hover:-translate-y-1 hover:border-red-500/70 dark:hover:border-red-400/70 transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-red-500/50"
            >
              <h4 className="text-lg font-bold text-red-600 dark:text-red-400 mb-2">أمان الجلسات</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">مراقبة الجلسات النشطة، كشف الأنشطة المشبوهة، وإدارة أمنية متقدمة</p>
              <div className="mt-3 text-xs text-[#0f3c35]/70 dark:text-emerald-400/70">حماية الجلسات في الوقت الفعلي</div>
            </div>

            {/* إدارة الصلاحيات */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => { navigateTo('#/role-management'); }}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); window.location.hash = '#/role-management'; } }}
              className="relative rounded-2xl border-2 border-purple-400/50 dark:border-purple-500/50 bg-white/40 dark:bg-gray-900/40 backdrop-blur-md p-6 shadow-sm hover:shadow-xl hover:shadow-purple-500/10 cursor-pointer hover:-translate-y-1 hover:border-purple-500/70 dark:hover:border-purple-400/70 transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            >
              <h4 className="text-lg font-bold text-purple-600 dark:text-purple-400 mb-2">إدارة الصلاحيات</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">إدارة الأدوار والصلاحيات، تحديد مستويات الوصول، ومراجعة سجلات التفويض</p>
              <div className="mt-3 text-xs text-[#0f3c35]/70 dark:text-emerald-400/70">التحكم في صلاحيات النظام</div>
            </div>

            {/* التفويض على مستوى البيانات */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => { window.location.hash = '#/secure-requests'; }}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); window.location.hash = '#/secure-requests'; } }}
              className="relative rounded-2xl border-2 border-indigo-400/50 dark:border-indigo-500/50 bg-white/40 dark:bg-gray-900/40 backdrop-blur-md p-6 shadow-sm hover:shadow-xl hover:shadow-indigo-500/10 cursor-pointer hover:-translate-y-1 hover:border-indigo-500/70 dark:hover:border-indigo-400/70 transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            >
              <h4 className="text-lg font-bold text-indigo-600 dark:text-indigo-400 mb-2">التفويض على مستوى البيانات</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">نظام ABAC للتحكم في الوصول، تصنيف البيانات أمنياً، وإدارة الصلاحيات المتقدمة</p>
              <div className="mt-3 text-xs text-[#0f3c35]/70 dark:text-emerald-400/70">عام • داخلي • سري • سري للغاية</div>
            </div>

            {/* تقارير الأمان */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => { window.location.hash = '#/session-security?tab=logs'; }}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); window.location.hash = '#/session-security?tab=logs'; } }}
              className="relative rounded-2xl border-2 border-lime-400/50 dark:border-lime-500/50 bg-white/40 dark:bg-gray-900/40 backdrop-blur-md p-6 shadow-sm hover:shadow-xl hover:shadow-lime-500/10 cursor-pointer hover:-translate-y-1 hover:border-lime-500/70 dark:hover:border-lime-400/70 transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-lime-500/50"
            >
              <h4 className="text-lg font-bold text-lime-600 dark:text-lime-400 mb-2">تقارير الأمان</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">سجلات الأمان، إحصائيات الأنشطة المشبوهة، وتحليل الأداء الأمني</p>
              <div className="mt-3 text-xs text-[#0f3c35]/70 dark:text-emerald-400/70">تقارير شاملة للأمان</div>
            </div>

            {/* حوكمة الأمن (للمدير فقط) */}
            {currentEmployee?.role === 'مدير' && (
              <div
                role="button"
                tabIndex={0}
                onClick={() => { navigateTo('#/security-governance'); }}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); window.location.hash = '#/security-governance'; } }}
                className="relative rounded-2xl border-2 border-slate-400/50 dark:border-slate-500/50 bg-white/40 dark:bg-gray-900/40 backdrop-blur-md p-6 shadow-sm hover:shadow-xl hover:shadow-slate-500/10 cursor-pointer hover:-translate-y-1 hover:border-slate-500/70 dark:hover:border-slate-400/70 transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-slate-500/50"
              >
                <h4 className="text-lg font-bold text-slate-600 dark:text-slate-400 mb-2">حوكمة الأمن</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">السياسات، الاستثناءات، الإنفاذ، والانتهاكات</p>
                <div className="mt-3 text-xs text-[#0f3c35]/70 dark:text-emerald-400/70">إدارة الامتثال الأمني</div>
              </div>
            )}

            {/* لوحة العمليات الأمنية (للمدير فقط) */}
            {currentEmployee?.role === 'مدير' && (
              <div
                role="button"
                tabIndex={0}
                onClick={() => { navigateTo('#/security-ops'); }}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); window.location.hash = '#/security-ops'; } }}
                className="relative rounded-2xl border-2 border-sky-400/50 dark:border-sky-500/50 bg-white/40 dark:bg-gray-900/40 backdrop-blur-md p-6 shadow-sm hover:shadow-xl hover:shadow-sky-500/10 cursor-pointer hover:-translate-y-1 hover:border-sky-500/70 dark:hover:border-sky-400/70 transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-sky-500/50"
              >
                <h4 className="text-lg font-bold text-sky-600 dark:text-sky-400 mb-2">لوحة العمليات الأمنية</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">رسوم بيانية، اتجاهات، خط زمني موحّد، وتصدير</p>
                <div className="mt-3 text-xs text-[#0f3c35]/70 dark:text-emerald-400/70">مصادر: الحوادث، الاستمرارية، الحوكمة، اليومية</div>
              </div>
            )}

            {/* العمليات اليومية (للمدير فقط) */}
            {currentEmployee?.role === 'مدير' && (
              <div
                role="button"
                tabIndex={0}
                onClick={() => { navigateTo('#/daily-ops'); }}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); window.location.hash = '#/daily-ops'; } }}
                className="relative rounded-2xl border-2 border-amber-400/50 dark:border-amber-500/50 bg-white/40 dark:bg-gray-900/40 backdrop-blur-md p-6 shadow-sm hover:shadow-xl hover:shadow-amber-500/10 cursor-pointer hover:-translate-y-1 hover:border-amber-500/70 dark:hover:border-amber-400/70 transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              >
                <h4 className="text-lg font-bold text-amber-600 dark:text-amber-400 mb-2">العمليات اليومية</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">فحوصات يومية، قضايا، مؤشرات أداء، وتصدير</p>
                <div className="mt-3 text-xs text-[#0f3c35]/70 dark:text-emerald-400/70">سجلات آخر الأيام من التخزين المحلي</div>
              </div>
            )}

            {/* مراقبة وتتبع النظام (للمدير فقط) */}
            {currentEmployee?.role === 'مدير' && (
              <div
                role="button"
                tabIndex={0}
                onClick={() => { navigateTo('#/observability'); }}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); window.location.hash = '#/observability'; } }}
                className="relative rounded-2xl border-2 border-blue-400/50 dark:border-blue-500/50 bg-white/40 dark:bg-gray-900/40 backdrop-blur-md p-6 shadow-sm hover:shadow-xl hover:shadow-blue-500/10 cursor-pointer hover:-translate-y-1 hover:border-blue-500/70 dark:hover:border-blue-400/70 transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                aria-label="مراقبة وتتبع النظام"
                title="مراقبة وتتبع النظام"
              >
                <h4 className="text-lg font-bold text-blue-600 dark:text-blue-400 mb-2">مراقبة وتتبع النظام</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">لوحة تتبّع حية، سجلات أخطاء وCSP، مؤشرات أداء، وتتبع طلبات</p>
                <div className="mt-3 text-xs text-[#0f3c35]/70 dark:text-emerald-400/70">للمدير فقط • يتطلب جلسة مصادقة ضمن الصفحة</div>
              </div>
            )}
          </div>
        </div>

        {/* قسم إعدادات الموقع (للمدير فقط) */}
        {currentEmployee?.role === 'مدير' && (
          <div>
            <div className="mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">
              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                إعدادات الموقع
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">إدارة إعدادات الموقع العامة وتطبيقات الموبايل</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {/* الميزات المتقدمة */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => { window.location.hash = '#/enhanced-features'; }}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); window.location.hash = '#/enhanced-features'; } }}
                className="relative rounded-2xl border-2 border-fuchsia-400/50 dark:border-fuchsia-500/50 bg-white/40 dark:bg-gray-900/40 backdrop-blur-md p-6 shadow-sm hover:shadow-xl hover:shadow-fuchsia-500/10 cursor-pointer hover:-translate-y-1 hover:border-fuchsia-500/70 dark:hover:border-fuchsia-400/70 transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-fuchsia-500/50"
              >
                <h4 className="text-lg font-bold text-fuchsia-600 dark:text-fuchsia-400 mb-2">الميزات المتقدمة</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">18 ميزة جديدة: تصدير البيانات، المخططات، الردود السريعة، تتبع SLA والمزيد</p>
                <div className="mt-3 text-xs text-[#0f3c35]/70 dark:text-emerald-400/70">جرّب جميع التحسينات الجديدة</div>
              </div>

              {/* إدارة روابط التطبيقات */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => setShowAppStoreSettings(true)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setShowAppStoreSettings(true); } }}
                className="relative rounded-2xl border-2 border-emerald-400/50 dark:border-emerald-500/50 bg-white/40 dark:bg-gray-900/40 backdrop-blur-md p-6 shadow-sm hover:shadow-xl hover:shadow-emerald-500/10 cursor-pointer hover:-translate-y-1 hover:border-emerald-500/70 dark:hover:border-emerald-400/70 transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              >
                <h4 className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mb-2">إدارة روابط التطبيقات</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">إدارة روابط تحميل التطبيقات على Google Play و App Store</p>
                <div className="mt-3 text-xs text-[#0f3c35]/70 dark:text-emerald-400/70">
                  {appContext?.appStoreLinks?.android.enabled || appContext?.appStoreLinks?.ios.enabled
                    ? 'روابط مفعّلة'
                    : 'لم يتم تفعيل الروابط بعد'}
                </div>
              </div>

              {/* تحرير سياسة الخصوصية */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => { navigateTo('#/privacy-editor'); }}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); window.location.hash = '#/privacy-editor'; } }}
                className="relative rounded-2xl border-2 border-zinc-400/50 dark:border-zinc-500/50 bg-white/40 dark:bg-gray-900/40 backdrop-blur-md p-6 shadow-sm hover:shadow-xl hover:shadow-zinc-500/10 cursor-pointer hover:-translate-y-1 hover:border-zinc-500/70 dark:hover:border-zinc-400/70 transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-zinc-500/50"
              >
                <h4 className="text-lg font-bold text-zinc-600 dark:text-zinc-400 mb-2">تحرير سياسة الخصوصية</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">تحرير نص سياسة الخصوصية والشروط</p>
                <div className="mt-3 text-xs text-[#0f3c35]/70 dark:text-emerald-400/70">تعديل المحتوى القانوني</div>
              </div>

              {/* إعدادات Gemini AI */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => setShowGeminiSettings(true)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setShowGeminiSettings(true); } }}
                className="relative rounded-2xl border-2 border-cyan-400/50 dark:border-cyan-500/50 bg-white/40 dark:bg-gray-900/40 backdrop-blur-md p-6 shadow-sm hover:shadow-xl hover:shadow-cyan-500/10 cursor-pointer hover:-translate-y-1 hover:border-cyan-500/70 dark:hover:border-cyan-400/70 transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              >
                <h4 className="text-lg font-bold text-cyan-600 dark:text-cyan-400 mb-2">إعدادات Gemini AI</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">إعدادات الذكاء الاصطناعي للمساعد الذكي</p>
                <div className="mt-3 text-xs text-[#0f3c35]/70 dark:text-emerald-400/70">
                  {getGeminiConfig().enabled ? 'مفعّل ويعمل' : 'معطّل'}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* قسم رسائل التواصل لم يعد يُعرض داخل لوحة التحكم */}

      {/* تم نقل جدول الطلبات إلى صفحة مستقلة */}
      {showDiwanModal && <DiwanWorkflowModal onClose={() => setShowDiwanModal(false)} />}

      {/* نافذة إدارة روابط التطبيقات */}
      {showAppStoreSettings && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <AppStoreLinksManager onClose={() => setShowAppStoreSettings(false)} />
          </div>
        </div>
      )}

      {/* نافذة إعدادات Gemini AI */}
      {showGeminiSettings && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="max-w-2xl w-full my-8">
            <GeminiSettingsPage onBack={() => setShowGeminiSettings(false)} />
          </div>
        </div>
      )}
    </Card>
  );
};

export default DashboardPage;