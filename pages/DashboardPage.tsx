import React, { useContext, useMemo, useState, useRef } from 'react';
import { AppContext } from '../App';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { RequestStatus, Ticket, ContactMessageStatus } from '../types';
import { Document, Page, pdfjs } from 'react-pdf';
import Mermaid from '../components/Mermaid';
import { DIWAN_WORKFLOW_DIAGRAM } from '../diagrams/diwan';
// Use a Vite-friendly worker import so the PDF.js worker is bundled & served correctly
// @ts-expect-error Vite will resolve this to a URL string
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
pdfjs.GlobalWorkerOptions.workerSrc = workerSrc as unknown as string;

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
  const [galleryFiles, setGalleryFiles] = useState<File[] | null>(null);
  const [galleryStartIndex, setGalleryStartIndex] = useState<number>(0);
  const [showDiwanModal, setShowDiwanModal] = useState<boolean>(false);
  const contactSectionRef = useRef<HTMLDivElement | null>(null);
  const openGallery = (files: File[], startIndex = 0) => { setGalleryFiles(files); setGalleryStartIndex(startIndex); };
  const closeGallery = () => setGalleryFiles(null);

  const ticketStats = useMemo(() => {
    const total = tickets.length;
    const byStatus: Record<RequestStatus, number> = {
      [RequestStatus.New]: 0,
      [RequestStatus.InProgress]: 0,
      [RequestStatus.Answered]: 0,
      [RequestStatus.Closed]: 0,
    };
    tickets.forEach(t => { byStatus[t.status]++; });
    return { total, byStatus };
  }, [tickets]);

  const contactStats = useMemo(() => {
    const total = contactMessages.length;
    const byStatus: Record<ContactMessageStatus, number> = {
      [ContactMessageStatus.New]: 0,
      [ContactMessageStatus.InProgress]: 0,
      [ContactMessageStatus.Closed]: 0,
    };
    contactMessages.forEach(m => { byStatus[m.status]++; });
    return { total, byStatus };
  }, [contactMessages]);

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

  const escapeCSV = (str: string): string => {
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const handleExportCSV = () => {
    if (tickets.length === 0) return;
    
    const headers = [
      'ID',
      'Submission Date',
      'Full Name',
      'Email',
      'Phone',
      'National ID',
      'Request Type',
      'Department',
      'Details',
      'Status'
    ];
    
    const csvRows = [
      headers.join(','),
      ...tickets.map(ticket => [
        escapeCSV(ticket.id),
        escapeCSV(ticket.submissionDate.toISOString()),
        escapeCSV(ticket.fullName),
        escapeCSV(ticket.email || ''),
        escapeCSV(ticket.phone),
        escapeCSV(ticket.nationalId),
        escapeCSV(ticket.requestType),
        escapeCSV(ticket.department),
        escapeCSV(ticket.details),
        escapeCSV(ticket.status)
      ].join(','))
    ];
    
    const csvContent = csvRows.join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `tickets_export_${new Date().toISOString().slice(0,10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
        <div className="flex space-x-2 rtl:space-x-reverse">
          {tickets.length > 0 && (
            <Button onClick={handleExportCSV} variant="secondary">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2 rtl:ml-0 rtl:mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              تصدير إلى CSV
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
              {/* المحتوى/المعلوماتية */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => { window.location.hash = '#/tools'; }}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); window.location.hash = '#/tools'; } }}
                className="relative rounded-2xl border border-white/20 dark:border-white/10 bg-white/60 dark:bg-gray-800/60 backdrop-blur p-6 shadow-sm cursor-pointer hover:ring-2 hover:ring-blue-300/40 focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-semibold">المعلوماتية / المحتوى</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">تحرير المحتوى (الأخبار، الأسئلة، الشروط، الخصوصية).</p>
                  </div>
                </div>
              </div>

              {/* الموارد البشرية */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => { window.location.hash = '#/hrms'; }}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); window.location.hash = '#/hrms'; } }}
                className="relative rounded-2xl border border-white/20 dark:border-white/10 bg-white/60 dark:bg-gray-800/60 backdrop-blur p-6 shadow-sm cursor-pointer hover:ring-2 hover:ring-blue-300/40 focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-semibold">الموارد البشرية</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">منصة HRMS متكاملة: بيانات الموظفين، الرواتب، الحضور، الإجازات، والأداء.</p>
                    <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">{`$${''}`}</div>
                  </div>
                </div>
              </div>

              {/* لوحة الطلبات */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => { window.location.hash = '#/requests'; }}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); window.location.hash = '#/requests'; } }}
                className="relative rounded-2xl border border-white/20 dark:border-white/10 bg-white/60 dark:bg-gray-800/60 backdrop-blur p-6 shadow-sm cursor-pointer hover:ring-2 hover:ring-blue-300/40 focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <h3 className="text-xl font-semibold">لوحة الطلبات</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">إدارة ومتابعة جميع الطلبات الواردة.</p>
                    <div className="mt-3 flex gap-2 flex-wrap text-xs">
                      <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">الإجمالي {ticketStats.total}</span>
                      <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">{RequestStatus.New} {ticketStats.byStatus[RequestStatus.New]}</span>
                      <span className="px-2 py-0.5 rounded bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300">{RequestStatus.InProgress} {ticketStats.byStatus[RequestStatus.InProgress]}</span>
                      <span className="px-2 py-0.5 rounded bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">{RequestStatus.Answered} {ticketStats.byStatus[RequestStatus.Answered]}</span>
                      <span className="px-2 py-0.5 rounded bg-gray-200 text-gray-800 dark:bg-gray-700/50 dark:text-gray-300">{RequestStatus.Closed} {ticketStats.byStatus[RequestStatus.Closed]}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* الهيكل الإداري */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => { window.location.hash = '#/departments?manage=1'; }}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); window.location.hash = '#/departments?manage=1'; } }}
                className="relative rounded-2xl border border-white/20 dark:border-white/10 bg-white/60 dark:bg-gray-800/60 backdrop-blur p-6 shadow-sm cursor-pointer hover:ring-2 hover:ring-blue-300/40 focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-semibold">الهيكل الإداري</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">صفحة أقسام المديرية ومهام كل قسم.</p>
                    <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">{`عدد الأقسام: 5`}</div>
                  </div>
                </div>
              </div>

              {/* رسائل التواصل */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => { window.location.hash = '#/messages'; }}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); window.location.hash = '#/messages'; } }}
                className="relative rounded-2xl border border-white/20 dark:border-white/10 bg-white/60 dark:bg-gray-800/60 backdrop-blur p-6 shadow-sm cursor-pointer hover:ring-2 hover:ring-blue-300/40 focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <div className="flex items-start justify-between w-full">
                  <div className="min-w-0">
                    <h3 className="text-xl font-semibold">رسائل التواصل</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">عرض ومعالجة رسائل "تواصل معنا".</p>
                    <div className="mt-3 flex gap-2 flex-wrap text-xs">
                      <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">الإجمالي {contactStats.total}</span>
                      <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">جديد {contactStats.byStatus[ContactMessageStatus.New]}</span>
                      <span className="px-2 py-0.5 rounded bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300">قيد المعالجة {contactStats.byStatus[ContactMessageStatus.InProgress]}</span>
                      <span className="px-2 py-0.5 rounded bg-gray-200 text-gray-800 dark:bg-gray-700/50 dark:text-gray-300">مغلق {contactStats.byStatus[ContactMessageStatus.Closed]}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* إدارة الديوان العام */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => { window.location.hash = '#/diwan'; }}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); window.location.hash = '#/diwan'; } }}
                className="relative rounded-2xl border border-white/20 dark:border-white/10 bg-white/60 dark:bg-gray-800/60 backdrop-blur p-6 shadow-sm cursor-pointer hover:ring-2 hover:ring-blue-300/40 focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-semibold">إدارة الديوان العام</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">التعاميم والكتب الرسمية (إنشاء وأرشفة).</p>
                    <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">وارد 0 • صادر 0 • قيد 0</div>
                  </div>
                  {/* الأزرار داخل الكرت أزيلت — الكرت نفسه أصبح قابلًا للنقر */}
                </div>
              </div>
      </div>

  {/* قسم رسائل التواصل لم يعد يُعرض داخل لوحة التحكم */}

  {/* تم نقل جدول الطلبات إلى صفحة مستقلة */}
  {showDiwanModal && <DiwanWorkflowModal onClose={() => setShowDiwanModal(false)} />}
    </Card>
  );
};

export default DashboardPage;