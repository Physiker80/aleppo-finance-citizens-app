import React, { useContext, useMemo, useState, useEffect } from 'react';
import { AppContext } from '../App';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { RequestStatus, Ticket, Department, ContactMessage } from '../types';
import { formatArabicNumber, formatArabicDate } from '../constants';
import { useDepartmentNames } from '../utils/departments';
import TicketDetailsModal from '../components/TicketDetailsModal';
import { Document, Page, pdfjs } from 'react-pdf';
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

const readableSize = (size: number) => {
  if (size >= 1024 * 1024) return `${formatArabicNumber(Math.ceil(size / (1024 * 1024)))}MB`;
  if (size >= 1024) return `${formatArabicNumber(Math.ceil(size / 1024))}KB`;
  return `${formatArabicNumber(size)}B`;
};

// A light wrapper to display an Arabic hint inside native date inputs when empty
const DateInputHint: React.FC<{
  value: string;
  onChange: (v: string) => void;
  ariaLabel: string;
  title: string;
  hint: string;
  className?: string;
}> = ({ value, onChange, ariaLabel, title, hint, className }) => (
  <div className="relative w-full">
    <input
      type="date"
      dir="ltr"
      aria-label={ariaLabel}
      title={title}
      value={value}
      onChange={(e) => onChange(e.target.value)}
  className={`hide-date-ph ${className || ''}`}
    />
    {!value && (
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400 text-sm">
        {hint}
      </span>
    )}
  </div>
);

const DocxPreview: React.FC<{ file: File; onStart?: () => void; onFinish?: () => void; canceled?: boolean }> = ({ file, onStart, onFinish, canceled }) => {
  const [html, setHtml] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let localCancelled = false;
    setHtml(null);
    setError(null);

    if (canceled) return;

    onStart?.();
    (async () => {
      try {
        const arrayBuffer = await file.arrayBuffer();
        if (localCancelled) return;
        // @ts-ignore - dynamic import browser build
        const mammothMod = await import('mammoth/mammoth.browser');
        if (localCancelled) return;
        const mammothLib: any = (mammothMod as any).default || mammothMod;
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
    setNumPages(null);
    setCanceled(false);
    setIsLoading(true);
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

const RequestsPage: React.FC = () => {
  const appContext = useContext(AppContext);
  const tickets = appContext?.tickets || [];
  const currentEmployee = appContext?.currentEmployee;
  const isAdmin = currentEmployee?.role === 'مدير';
  const employeeDept = currentEmployee?.department;
  const departmentNames = useDepartmentNames();
  const updateTicketStatus = appContext?.updateTicketStatus;
  const updateTicketDepartment = appContext?.updateTicketDepartment;
  const updateTicketResponse = appContext?.updateTicketResponse;
  const updateTicketOpinion = appContext?.updateTicketOpinion;
  const updateTicketForwardedTo = appContext?.updateTicketForwardedTo;
  const [galleryFiles, setGalleryFiles] = useState<File[] | null>(null);
  const [galleryStartIndex, setGalleryStartIndex] = useState<number>(0);
  
  // Modal state for TicketDetailsModal (Edit/Reply/Process)
  const [selectedTicket, setSelectedTicket] = useState<Ticket | ContactMessage | null>(null);
  const [showTicketDetails, setShowTicketDetails] = useState(false);
  
  // Filters & UI state
  const [statusFilter, setStatusFilter] = useState<RequestStatus | 'ALL'>('ALL');
  const [departmentFilter, setDepartmentFilter] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [sortKey, setSortKey] = useState<'date' | 'status' | 'department' | 'name' | 'id'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(() => {
    const v = Number(localStorage.getItem('requestsPageSize'));
    const allowed = [10, 20];
    return Number.isFinite(v) && allowed.includes(v) ? v : 10;
  });
  const [archiveFilter, setArchiveFilter] = useState<'ALL' | 'ARCHIVED' | 'NOT_ARCHIVED'>(() => {
    const v = localStorage.getItem('requestsArchiveFilter');
    return v === 'ARCHIVED' || v === 'NOT_ARCHIVED' ? v : 'ALL';
  });
  const [exportScope, setExportScope] = useState<'ALL' | 'ARCHIVED' | 'NOT_ARCHIVED'>('ALL');

  // Persist preferences
  React.useEffect(() => { localStorage.setItem('requestsPageSize', String(pageSize)); }, [pageSize]);
  React.useEffect(() => { localStorage.setItem('requestsArchiveFilter', archiveFilter); }, [archiveFilter]);

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

  

  // Derived: filtered + sorted list
  const filteredSortedTickets = useMemo(() => {
    const q = search.trim().toLowerCase();
    const from = fromDate ? new Date(fromDate) : null;
    const to = toDate ? new Date(toDate) : null;
    let list = tickets.filter(t => {
      // Non-admin can only see own department tickets or forwarded to it
      if (!isAdmin && employeeDept && String(t.department) !== employeeDept && !(t.forwardedTo || []).includes(employeeDept)) return false;
      if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
      if (departmentFilter !== 'ALL' && String(t.department) !== departmentFilter) return false;
      if (archiveFilter !== 'ALL') {
        if (archiveFilter === 'ARCHIVED' && !t.archived) return false;
        if (archiveFilter === 'NOT_ARCHIVED' && t.archived) return false;
      }
  // إزالة فلترة "قسمي فقط"
      if (from && t.submissionDate < from) return false;
      if (to) {
        const end = new Date(to);
        end.setHours(23, 59, 59, 999);
        if (t.submissionDate > end) return false;
      }
      if (q) {
        const hay = [t.id, t.fullName, t.email, String(t.department)].filter(Boolean).join(' ').toLowerCase();
        return hay.includes(q);
      }
      return true;
    });
    list.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'date': cmp = a.submissionDate.getTime() - b.submissionDate.getTime(); break;
        case 'status': cmp = String(a.status).localeCompare(String(b.status)); break;
        case 'department': cmp = String(a.department).localeCompare(String(b.department)); break;
        case 'name': cmp = String(a.fullName).localeCompare(String(b.fullName)); break;
        case 'id': cmp = String(a.id).localeCompare(String(b.id)); break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [tickets, statusFilter, departmentFilter, search, fromDate, toDate, sortKey, sortDir]);

  // Pagination
  const totalItems = filteredSortedTickets.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const visibleTickets = filteredSortedTickets.slice(startIndex, startIndex + pageSize);

  // Statistics for the current filtered list
  const filteredStats = useMemo(() => {
    const byStatus: Record<RequestStatus, number> = {
      [RequestStatus.New]: 0,
      [RequestStatus.InProgress]: 0,
      [RequestStatus.Answered]: 0,
      [RequestStatus.Closed]: 0,
    };
    let total = 0;
    let replySum = 0; let replyCnt = 0;
    let closeSum = 0; let closeCnt = 0;
    let forwarded = 0;
    filteredSortedTickets.forEach(t => {
      total++;
      byStatus[t.status]++;
      if (t.answeredAt) { replySum += (t.answeredAt.getTime() - t.submissionDate.getTime()); replyCnt++; }
      if (t.closedAt) { closeSum += (t.closedAt.getTime() - t.submissionDate.getTime()); closeCnt++; }
      if ((t.forwardedTo && t.forwardedTo.length) || false) forwarded++;
    });
    const avgReplyMs = replyCnt ? Math.round(replySum / replyCnt) : 0;
    const avgCloseMs = closeCnt ? Math.round(closeSum / closeCnt) : 0;
    return { total, byStatus, avgReplyMs, avgCloseMs, forwarded };
  }, [filteredSortedTickets]);

  // Archive stats (for mode chip)
  const archivedCount = useMemo(() => filteredSortedTickets.filter(t => !!t.archived).length, [filteredSortedTickets]);
  const notArchivedCount = useMemo(() => filteredSortedTickets.length - archivedCount, [filteredSortedTickets, archivedCount]);

  const formatAvgDuration = (ms: number) => {
    if (!ms || !isFinite(ms) || ms <= 0) return '—';
    const sec = Math.floor(ms / 1000);
    const d = Math.floor(sec / 86400);
    const h = Math.floor((sec % 86400) / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const parts: string[] = [];
    if (d) parts.push(`${d} يوم`);
    if (h) parts.push(`${h} س`);
    if (m) parts.push(`${m} د`);
    if (!d && !h && !m) parts.push(`${sec % 60} ث`);
    return parts.join(' ');
  };

  React.useEffect(() => { setPage(1); }, [statusFilter, departmentFilter, search, fromDate, toDate, pageSize]);

  const onHeaderSort = (key: typeof sortKey) => {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const openGallery = (files: File[], startIndex = 0) => { setGalleryFiles(files); setGalleryStartIndex(startIndex); };
  const closeGallery = () => setGalleryFiles(null);

  // Handle detailed view/edit/reply via TicketDetailsModal
  const handleOpenTicketDetails = (ticket: Ticket | ContactMessage) => {
    setSelectedTicket(ticket);
    setShowTicketDetails(true);
  };

  const handleCloseTicketDetails = () => {
    setSelectedTicket(null);
    setShowTicketDetails(false);
  };

  // Check for 'focus' parameter in URL to auto-open ticket
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('?')) {
      const query = hash.split('?')[1];
      const params = new URLSearchParams(query);
      const focusId = params.get('focus');
      if (focusId && tickets.length > 0) {
        const found = tickets.find(t => t.id === focusId);
        if (found) {
          handleOpenTicketDetails(found);
          // Optional: clear param so it doesn't stick
          // window.history.replaceState(null, '', '#/requests'); 
        }
      }
    }
  }, [tickets, window.location.hash]); // Depend on hash changes too

  const handleStatusChange = (ticket: Ticket, newStatus: string) => {
    if (updateTicketStatus) {
      if (newStatus === RequestStatus.Answered) {
        // Open the full details modal to handle reply
        handleOpenTicketDetails(ticket);
        return; 
      }
      updateTicketStatus(ticket.id, newStatus as RequestStatus);
      if (ticket.email) {
        const sendEmail = window.confirm(`تم تغيير حالة الطلب إلى "${newStatus}".\nهل تريد إرسال بريد إلكتروني لإعلام ${ticket.fullName}؟`);
        if (sendEmail) {
          const subject = `تحديث بخصوص طلبك رقم ${ticket.id}`;
          const trackUrl = new URL('#/track', window.location.href).href;
          const body = `مرحباً ${ticket.fullName}،\n\nتم تحديث حالة طلبك.\n\nالحالة الجديدة: ${newStatus}\nيمكنك متابعة طلبك عبر الرابط التالي:\n${trackUrl}\n\nرقم التتبع الخاص بك هو: ${ticket.id}\n\nمع تحيات،\nمديرية مالية حلب`;
          const mailtoLink = `mailto:${ticket.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body.trim())}`;
          window.open(mailtoLink, '_blank');
        }
      }
    }
  };

  const handleTransfer = (ticket: Ticket, dept: Department) => {
    updateTicketDepartment?.(ticket.id, dept);
  };

  const formatDuration = (from?: Date, to?: Date) => {
    if (!from || !to) return '—';
    const ms = to.getTime() - from.getTime();
    if (ms <= 0) return '—';
    const sec = Math.floor(ms / 1000);
    const d = Math.floor(sec / 86400);
    const h = Math.floor((sec % 86400) / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const parts: string[] = [];
    if (d) parts.push(`${d} يوم`);
    if (h) parts.push(`${h} س`);
    if (m) parts.push(`${m} د`);
    if (!d && !h && !m) parts.push(`${sec % 60} ث`);
    return parts.join(' ');
  };

  const formatDateTime = (d?: Date) => {
    if (!d) return '—';
    try {
      return new Intl.DateTimeFormat('ar-SY-u-nu-latn', { dateStyle: 'medium', timeStyle: 'short' }).format(d);
    } catch {
      return d.toLocaleString();
    }
  };

  return (
    <Card>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100">أرشيف الطلبات</h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">إدارة ومتابعة جميع الطلبات الواردة.</p>
          {/* Archive mode chip */}
          <div className="mt-2 inline-flex items-center gap-2 text-xs">
            <span
              className={`px-2 py-1 rounded-full border ${
                archiveFilter === 'ARCHIVED'
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800 dark:bg-emerald-900/20 dark:border-emerald-700 dark:text-emerald-300'
                  : archiveFilter === 'NOT_ARCHIVED'
                  ? 'bg-gray-50 border-gray-300 text-gray-700 dark:bg-gray-800/40 dark:border-gray-600 dark:text-gray-300'
                  : 'bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-300'
              }`}
              title="نمط العرض بحسب حالة الأرشفة"
            >
              {archiveFilter === 'ARCHIVED' ? `عرض: المؤرشف فقط (${formatArabicNumber(archivedCount)})` :
               archiveFilter === 'NOT_ARCHIVED' ? `عرض: غير المؤرشف فقط (${formatArabicNumber(notArchivedCount)})` :
               `عرض: الكل (${formatArabicNumber(filteredSortedTickets.length)})`}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="px-2 py-2 rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 text-sm"
            title="نطاق التصدير"
            value={exportScope}
            onChange={(e) => setExportScope(e.target.value as 'ALL'|'ARCHIVED'|'NOT_ARCHIVED')}
          >
            <option value="ALL">تصدير: الكل</option>
            <option value="ARCHIVED">تصدير: المؤرشف فقط</option>
            <option value="NOT_ARCHIVED">تصدير: غير المؤرشف فقط</option>
          </select>
          <button
            className="px-3 py-2 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={async () => {
              try {
                const list = filteredSortedTickets.filter(t => (
                  exportScope === 'ALL' ? true : exportScope === 'ARCHIVED' ? !!t.archived : !t.archived
                ));
                const rows = list.map(t => ({
                  'رقم التتبع': t.id,
                  'تاريخ التقديم': formatArabicDate(t.submissionDate),
                  'الاسم': t.fullName || '',
                  'البريد': t.email || '',
                  'القسم': String(t.department),
                  'محوَّل إلى': (t.forwardedTo || []).join('، '),
                  'الحالة': t.status,
                  'مؤرشف': t.archived ? 'نعم' : 'لا',
                  'تاريخ الأرشفة': t.archivedAt ? new Date(t.archivedAt).toLocaleString('ar-SY-u-nu-latn') : '',
                }));
                const xlsxMod = await import('xlsx');
                const XLSX: any = (xlsxMod as any).default || xlsxMod;
                const ws = XLSX.utils.json_to_sheet(rows);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, 'Archive');
                const ts = new Date().toISOString().slice(0,19).replace(/[:T]/g,'-');
                const scope = exportScope === 'ALL' ? 'all' : exportScope === 'ARCHIVED' ? 'archived' : 'not-archived';
                XLSX.writeFile(wb, `archive-requests-${scope}-${ts}.xlsx`, { bookType: 'xlsx' });
              } catch (e) {
                console.error('Excel export failed', e);
                alert('تعذر تصدير Excel');
              }
            }}
          >
            تصدير Excel
          </button>
          <button
            className="px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200"
            onClick={() => { window.location.hash = '#/dashboard'; }}
          >
            العودة للوحة التحكم
          </button>
        </div>
      </div>

      {/* Stats panel */}
      <div className="mb-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="rounded-lg p-4 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <div className="text-xs text-gray-500 dark:text-gray-400">إجمالي (حسب المرشِّحات)</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{formatArabicNumber(filteredStats.total)}</div>
          </div>
          <div className="rounded-lg p-4 border border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/30">
            <div className="text-xs text-blue-700 dark:text-blue-300">جديد</div>
            <div className="text-2xl font-bold text-blue-800 dark:text-blue-200">{formatArabicNumber(filteredStats.byStatus[RequestStatus.New])}</div>
          </div>
          <div className="rounded-lg p-4 border border-gray-200 dark:border-gray-700 bg-yellow-50 dark:bg-yellow-900/30">
            <div className="text-xs text-yellow-700 dark:text-yellow-300">قيد المعالجة</div>
            <div className="text-2xl font-bold text-yellow-800 dark:text-yellow-200">{formatArabicNumber(filteredStats.byStatus[RequestStatus.InProgress])}</div>
          </div>
          <div className="rounded-lg p-4 border border-gray-200 dark:border-gray-700 bg-green-50 dark:bg-green-900/30">
            <div className="text-xs text-green-700 dark:text-green-300">تم الرد</div>
            <div className="text-2xl font-bold text-green-800 dark:text-green-200">{formatArabicNumber(filteredStats.byStatus[RequestStatus.Answered])}</div>
          </div>
          <div className="rounded-lg p-4 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30">
            <div className="text-xs text-gray-600 dark:text-gray-300">مغلق</div>
            <div className="text-2xl font-bold text-gray-800 dark:text-gray-100">{formatArabicNumber(filteredStats.byStatus[RequestStatus.Closed])}</div>
          </div>
          <div className="rounded-lg p-4 border border-gray-200 dark:border-gray-700 bg-purple-50 dark:bg-purple-900/30">
            <div className="text-xs text-purple-700 dark:text-purple-300">محوّلة</div>
            <div className="text-2xl font-bold text-purple-800 dark:text-purple-200">{formatArabicNumber(filteredStats.forwarded)}</div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          <div className="rounded-lg p-4 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <div className="text-xs text-gray-500 dark:text-gray-400">متوسط زمن الرد</div>
            <div className="text-lg font-semibold text-emerald-700 dark:text-emerald-300">{formatAvgDuration(filteredStats.avgReplyMs)}</div>
          </div>
          <div className="rounded-lg p-4 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <div className="text-xs text-gray-500 dark:text-gray-400">متوسط زمن الإغلاق</div>
            <div className="text-lg font-semibold text-fuchsia-700 dark:text-fuchsia-300">{formatAvgDuration(filteredStats.avgCloseMs)}</div>
          </div>
        </div>
      </div>

      {tickets.length === 0 ? (
        <div className="text-center py-16">
          <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-200">لا توجد طلبات</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">لم يتم تقديم أي طلبات من قبل المستخدمين حتى الآن.</p>
        </div>
      ) : (
        <>
          {/* Local style to hide native date placeholders when empty */}
          <style>{`
            /* Chromium/WebKit */
            input.hide-date-ph[value=""]::-webkit-datetime-edit { color: transparent; }
            input.hide-date-ph[value=""]::-webkit-datetime-edit-text { color: transparent; }
            input.hide-date-ph[value=""]::-webkit-datetime-edit-month-field,
            input.hide-date-ph[value=""]::-webkit-datetime-edit-day-field,
            input.hide-date-ph[value=""]::-webkit-datetime-edit-year-field { color: transparent; }
            input.hide-date-ph:focus { color: inherit; }
            /* Firefox fallback */
            input.hide-date-ph[value=""] { color: transparent; }
            input.hide-date-ph:focus { color: inherit; }
          `}</style>
          {/* Toolbar */}
          <div className="mb-3 grid gap-2 md:gap-3 md:grid-cols-12">
            <div className="md:col-span-3">
              <input
                type="search"
                placeholder="بحث (رقم، اسم، بريد، قسم)"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full p-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
              />
            </div>
            <div className="md:col-span-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as RequestStatus | 'ALL')}
                className="w-full p-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
              >
                <option value="ALL">كل الحالات</option>
                {Object.values(RequestStatus).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="w-full p-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 min-w-[10rem]"
              >
                <option value="ALL">كل الأقسام</option>
                {departmentNames.map(dep => <option key={dep} value={dep}>{dep}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <select
                value={archiveFilter}
                onChange={(e) => setArchiveFilter(e.target.value as 'ALL'|'ARCHIVED'|'NOT_ARCHIVED')}
                className="w-full p-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
              >
                <option value="ALL">كل الأرشفة</option>
                <option value="ARCHIVED">المؤرشف فقط</option>
                <option value="NOT_ARCHIVED">غير المؤرشف فقط</option>
              </select>
            </div>
            <div className="md:col-span-3 flex gap-2 items-center">
              <DateInputHint
                value={fromDate}
                onChange={setFromDate}
                ariaLabel="من تاريخ"
                title="من تاريخ"
                hint="من يوم/شهر/سنة"
                className="w-full min-w-[11rem] p-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 text-left font-mono"
              />
              <DateInputHint
                value={toDate}
                onChange={setToDate}
                ariaLabel="إلى تاريخ"
                title="إلى تاريخ"
                hint="إلى يوم/شهر/سنة"
                className="w-full min-w-[11rem] p-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 text-left font-mono"
              />
            </div>
            {/* تمت إزالة عناصر: عرض مضغوط، قسمِي فقط، وزر تصفير */}
          </div>

          <div className="overflow-x-auto max-h-[70vh] overflow-y-auto rounded border border-gray-200 dark:border-gray-700">
            <table className="min-w-full bg-white dark:bg-transparent divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700/50 sticky top-0 z-10">
                <tr>
                  <th onClick={() => onHeaderSort('id')} className="cursor-pointer select-none px-4 md:px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">رقم التتبع {sortKey==='id' ? (sortDir==='asc'?'▲':'▼') : ''}</th>
                  <th onClick={() => onHeaderSort('date')} className="cursor-pointer select-none px-4 md:px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">تاريخ التقديم {sortKey==='date' ? (sortDir==='asc'?'▲':'▼') : ''}</th>
                  <th onClick={() => onHeaderSort('name')} className="cursor-pointer select-none px-4 md:px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">مقدم الطلب {sortKey==='name' ? (sortDir==='asc'?'▲':'▼') : ''}</th>
                  <th onClick={() => onHeaderSort('department')} className="cursor-pointer select-none px-4 md:px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">القسم {sortKey==='department' ? (sortDir==='asc'?'▲':'▼') : ''}</th>
                  <th className="px-4 md:px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">محوّل إلى</th>
                  <th className="px-4 md:px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">الوقت</th>
                  <th onClick={() => onHeaderSort('status')} className="cursor-pointer select-none px-4 md:px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">الحالة {sortKey==='status' ? (sortDir==='asc'?'▲':'▼') : ''}</th>
                  <th className="px-4 md:px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    نسخة الطباعة
                    <div className="text-[10px] leading-3 mt-1 text-gray-400 dark:text-gray-500">يعرض حالة الأرشفة</div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {visibleTickets.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">لا توجد نتائج مطابقة للمرشِّحات الحالية.</td>
                  </tr>
                ) : visibleTickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    className={`transition-colors duration-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                      archiveFilter === 'ALL'
                        ? ticket.archived
                          ? 'border-l-[3px] border-emerald-400/70'
                          : 'border-l-[3px] border-gray-300/70'
                        : archiveFilter === 'ARCHIVED'
                        ? 'bg-emerald-50/60 dark:bg-emerald-900/10'
                        : 'bg-gray-50/60 dark:bg-gray-800/30'
                    }`}
                  >
                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100`}>
                      <div className="flex flex-col gap-1">
                        <span className="font-mono">{ticket.id}</span>
                        <span
                          title={ticket.archivedAt ? `مؤرشف في ${new Date(ticket.archivedAt).toLocaleString('ar-SY-u-nu-latn')}` : undefined}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] leading-4 select-none ring-1 ${ticket.archived
                            ? 'bg-emerald-100 text-emerald-800 ring-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:ring-emerald-800/50'
                            : 'bg-gray-100 text-gray-600 ring-gray-200 dark:bg-gray-800/40 dark:text-gray-300 dark:ring-gray-700/60'
                          }`}
                        >
                          {ticket.archived ? (
                            <>
                              <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-7.364 7.364a1 1 0 01-1.414 0L3.293 9.435a1 1 0 111.414-1.414l3.223 3.223 6.657-6.657a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                              مؤرشف
                            </>
                          ) : (
                            <>
                              <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor"><path d="M10 3a7 7 0 100 14A7 7 0 0010 3zM9 5h2v6H9V5zm0 8h2v2H9v-2z"/></svg>
                              غير مؤرشف
                            </>
                          )}
                        </span>
                      </div>
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400`}>{ticket.submissionDate.toLocaleDateString('ar-SY-u-nu-latn')}</td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm`}>
                      <div className="text-gray-900 dark:text-gray-100 font-medium">{ticket.fullName}</div>
                      {ticket.email && <div className="text-gray-500 dark:text-gray-400">{ticket.email}</div>}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400`}>
                      <div className="flex items-center gap-2">
                        <span className="truncate max-w-[12rem]" title={String(ticket.department)}>{ticket.department}</span>
                        {(isAdmin || (employeeDept && (String(ticket.department) === employeeDept || (ticket.forwardedTo || []).includes(employeeDept)))) && (
                          <select
                            aria-label={`تحويل ${ticket.id} إلى قسم`}
                            className="p-1.5 text-xs border rounded dark:bg-gray-700 dark:border-gray-600"
                            value={ticket.department}
                            onChange={(e) => handleTransfer(ticket, e.target.value as Department)}
                          >
                            {departmentNames.map(dep => <option key={dep} value={dep}>{dep}</option>)}
                          </select>
                        )}
                      </div>
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-xs text-gray-600 dark:text-gray-300 max-w-xs`}>
                      {ticket.forwardedTo && ticket.forwardedTo.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {ticket.forwardedTo.map(dep => (
                            <span key={dep} className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">{dep}</span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-xs text-gray-600 dark:text-gray-300`}>
                      <div className="space-y-1">
            <div><span className="text-gray-500 dark:text-gray-400">بدء:</span> {formatDateTime(ticket.submissionDate)}</div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">رد:</span>{' '}
                          {ticket.answeredAt ? (
                            <>
                              {formatDateTime(ticket.answeredAt)}{' '}
                              <span className="text-gray-400">•</span>{' '}
                              {formatDuration(ticket.submissionDate, ticket.answeredAt)}
                            </>
                          ) : '—'}
                        </div>
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">إغلاق:</span>{' '}
                          {ticket.closedAt ? (
                            <>
                              {formatDateTime(ticket.closedAt)}{' '}
                              <span className="text-gray-400">•</span>{' '}
                              {formatDuration(ticket.submissionDate, ticket.closedAt)}
                            </>
                          ) : '—'}
                        </div>
                      </div>
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm`}>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={ticket.status} />
                        <button
                          onClick={() => handleOpenTicketDetails(ticket)}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-800/50 rounded-lg text-xs text-blue-700 dark:text-blue-300 transition-colors"
                          title="عرض التفاصيل الكاملة أو التحرير"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          عرض/تحرير
                        </button>
                      </div>
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-xs`}>
                      {ticket.printSnapshotHtml ? (
                        <button
                          className={`px-2 py-1 rounded transition-colors ${ticket.archived
                            ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                          title={ticket.archived ? 'نسخة الطباعة (مؤرشف)' : 'نسخة طباعة (غير مؤرشف)'}
                          onClick={() => {
                            const w = window.open('', '_blank');
                            if (w) { w.document.write(ticket.printSnapshotHtml!); w.document.close(); }
                          }}
                        >{ticket.archived ? 'فتح النسخة المؤرشفة' : 'فتح النسخة'}</button>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="mt-3 flex items-center justify-between text-sm text-gray-700 dark:text-gray-300">
            <div>
              عرض {Math.min(totalItems, startIndex + 1)}–{Math.min(totalItems, startIndex + visibleTickets.length)} من {totalItems}
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1">
                <span className="hidden sm:inline">حجم الصفحة:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="p-1.5 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                >
                  {[10, 20].map(n => <option key={n} value={n}>{n}/صفحة</option>)}
                </select>
              </label>
              <button
                disabled={safePage <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded border border-gray-300 dark:border-gray-600 disabled:opacity-50"
              >السابق</button>
              <span>صفحة {safePage} / {totalPages}</span>
              <button
                disabled={safePage >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded border border-gray-300 dark:border-gray-600 disabled:opacity-50"
              >التالي</button>
            </div>
          </div>
        </>
      )}

      {galleryFiles && <AttachmentGalleryModal files={galleryFiles} startIndex={galleryStartIndex} onClose={closeGallery} />}

      {/* Ticket Details Modal (Edit/Reply/Process) */}
      {selectedTicket && (
        <TicketDetailsModal
          ticket={selectedTicket}
          isOpen={showTicketDetails}
          onClose={handleCloseTicketDetails}
          onUpdate={(updatedTicket) => {
            // Context updates automatically trigger re-render of this list
            // Modal handles all updates via AppContext
          }}
        />
      )}
    </Card>
  );
};

export default RequestsPage;
