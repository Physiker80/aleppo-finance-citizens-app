import React, { useContext, useMemo, useState } from 'react';
import { AppContext } from '../App';
import Card from '../components/ui/Card';
import { ContactMessageStatus, ContactMessageReply, ContactReplyAttachment } from '../types';
import { useDepartmentNames } from '../utils/departments';
import AIAssistPanel from '../components/AIAssistPanel';
import ContactMessageDetailsModal from '../components/ContactMessageDetailsModal';

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

const ContactMessagesPage: React.FC = () => {
  const appContext = useContext(AppContext);
  const contactMessages = appContext?.contactMessages || [];
  const updateStatus = appContext?.updateContactMessageStatus;
  const isAdmin = appContext?.currentEmployee?.role === 'مدير';
  const myDept = appContext?.currentEmployee?.department;
  const currentUser = appContext?.currentEmployee;
  const departmentNames = useDepartmentNames();
  const [statusFilter, setStatusFilter] = useState<ContactMessageStatus | 'ALL'>('ALL');
  const [departmentFilter, setDepartmentFilter] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [sortKey, setSortKey] = useState<'date' | 'status' | 'department' | 'name' | 'id'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(() => {
    const v = Number(localStorage.getItem('messagesPageSize'));
    const allowed = [10, 20];
    return Number.isFinite(v) && allowed.includes(v) ? v : 10;
  });
  const [archiveFilter, setArchiveFilter] = useState<'ALL'|'ARCHIVED'|'NOT_ARCHIVED'>(() => {
    const v = localStorage.getItem('messagesArchiveFilter');
    return v === 'ARCHIVED' || v === 'NOT_ARCHIVED' ? v : 'ALL';
  });
  const [exportScope, setExportScope] = useState<'ALL' | 'ARCHIVED' | 'NOT_ARCHIVED'>('ALL');
  const [showAssist, setShowAssist] = useState(false);
  
  // حالات للرد والتحويل
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
  const [detailsMessageId, setDetailsMessageId] = useState<string | null>(null);
  const [showReplyForm, setShowReplyForm] = useState<string | null>(null);
  const [replyType, setReplyType] = useState<'reply' | 'comment' | 'transfer'>('reply');
  const [replyContent, setReplyContent] = useState('');
  const [transferDepartment, setTransferDepartment] = useState('');
  const [replyAttachments, setReplyAttachments] = useState<File[]>([]);
  React.useEffect(() => { localStorage.setItem('messagesPageSize', String(pageSize)); }, [pageSize]);
  React.useEffect(() => { localStorage.setItem('messagesArchiveFilter', archiveFilter); }, [archiveFilter]);
  
  const visibleBase = contactMessages.filter(m => {
    if (isAdmin) return true;
    if (!myDept) return false;
    return !!m.department && m.department === myDept;
  });

  const filteredSorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    const from = fromDate ? new Date(fromDate) : null;
    const to = toDate ? new Date(toDate) : null;
    let list = visibleBase.filter(m => {
      if (statusFilter !== 'ALL' && m.status !== statusFilter) return false;
      if (departmentFilter !== 'ALL' && String(m.department) !== departmentFilter) return false;
      if (archiveFilter !== 'ALL') {
        if (archiveFilter === 'ARCHIVED' && !m.archived) return false;
        if (archiveFilter === 'NOT_ARCHIVED' && m.archived) return false;
      }
      if (from && m.submissionDate < from) return false;
      if (to) {
        const end = new Date(to); end.setHours(23,59,59,999);
        if (m.submissionDate > end) return false;
      }
      if (q) {
        const hay = [m.id, m.name, m.email, String(m.department), m.subject, m.message].filter(Boolean).join(' ').toLowerCase();
        return hay.includes(q);
      }
      return true;
    });
    list.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'date': cmp = a.submissionDate.getTime() - b.submissionDate.getTime(); break;
        case 'status': cmp = String(a.status).localeCompare(String(b.status)); break;
        case 'department': cmp = String(a.department || '').localeCompare(String(b.department || '')); break;
        case 'name': cmp = String(a.name).localeCompare(String(b.name)); break;
        case 'id': cmp = String(a.id).localeCompare(String(b.id)); break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [visibleBase, statusFilter, departmentFilter, search, fromDate, toDate, sortKey, sortDir]);

  const peakHistory = useMemo(() => {
    const h: Array<{ timestamp: string }> = [];
    visibleBase.forEach(m => {
      const d = m.submissionDate instanceof Date ? m.submissionDate : new Date(m.submissionDate as any);
      if (!isNaN(d.getTime())) h.push({ timestamp: d.toISOString() });
    });
    return h;
  }, [visibleBase]);

  const totalItems = filteredSorted.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const visible = filteredSorted.slice(startIndex, startIndex + pageSize);
  const archivedCount = React.useMemo(() => filteredSorted.filter(m => !!m.archived).length, [filteredSorted]);
  const notArchivedCount = React.useMemo(() => filteredSorted.length - archivedCount, [filteredSorted, archivedCount]);

  React.useEffect(() => { setPage(1); }, [statusFilter, departmentFilter, search, fromDate, toDate, pageSize]);

  const onHeaderSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortKey(key); setSortDir('asc'); }
  };

  // AI Assist → inline reply listeners when a quick-reply form is open
  React.useEffect(() => {
    if (!showReplyForm) return;
    const onInsert = (ev: Event) => {
      try {
        // @ts-ignore CustomEvent shape
        const text: string = (ev as CustomEvent).detail?.text;
        if (typeof text === 'string' && text.trim()) {
          setReplyContent(prev => (prev ? prev + '\n' : '') + text.trim());
        }
      } catch {}
    };
    const onDept = (ev: Event) => {
      try {
        // @ts-ignore CustomEvent shape
        const dep: string = (ev as CustomEvent).detail?.department;
        if (typeof dep === 'string' && dep.trim()) {
          setReplyType('transfer');
          setTransferDepartment(dep);
        }
      } catch {}
    };
    window.addEventListener('ai-assist-insert-reply', onInsert as EventListener);
    window.addEventListener('ai-assist-select-department', onDept as EventListener);
    return () => {
      window.removeEventListener('ai-assist-insert-reply', onInsert as EventListener);
      window.removeEventListener('ai-assist-select-department', onDept as EventListener);
    };
  }, [showReplyForm]);

  // دالة لتحميل الردود من localStorage
  const getMessageReplies = (messageId: string): ContactMessageReply[] => {
    try {
      const repliesData = localStorage.getItem('contactMessageReplies');
      if (!repliesData) return [];
      
      const allReplies = JSON.parse(repliesData);
      return allReplies.filter((reply: ContactMessageReply) => reply.messageId === messageId);
    } catch (error) {
      console.error('خطأ في تحميل الردود:', error);
      return [];
    }
  };

  // دالة لمعالجة رفع الملفات
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setReplyAttachments(prev => [...prev, ...files]);
  };

  // دالة لحذف ملف مرفق
  const removeAttachment = (index: number) => {
    setReplyAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // دالة لإرسال الرد أو التحويل
  const handleSubmitReply = async (messageId: string) => {
    if (!replyContent.trim() && replyType !== 'transfer') {
      alert('يرجى كتابة محتوى الرد');
      return;
    }

    if (replyType === 'transfer' && !transferDepartment) {
      alert('يرجى اختيار القسم المراد التحويل إليه');
      return;
    }

    try {
      // معالجة المرفقات
      const attachments: ContactReplyAttachment[] = [];
      for (const file of replyAttachments) {
        const fileContent = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });

        attachments.push({
          name: file.name,
          size: file.size,
          type: file.type,
          data: fileContent
        });
      }

      const newReply: ContactMessageReply = {
        id: `reply-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        messageId,
        authorName: currentUser?.username || 'غير محدد',
        authorDepartment: currentUser?.department || 'غير محدد',
        type: replyType,
        content: replyType === 'transfer' 
          ? `تم تحويل الرسالة إلى قسم: ${transferDepartment}\n${replyContent || 'بدون ملاحظات إضافية'}`
          : replyContent,
        transferTo: replyType === 'transfer' ? transferDepartment : undefined,
        attachments,
        timestamp: new Date().toISOString(),
        isRead: false
      };

      // حفظ الرد في localStorage
      const existingReplies = JSON.parse(localStorage.getItem('contactMessageReplies') || '[]');
      const updatedReplies = [...existingReplies, newReply];
      localStorage.setItem('contactMessageReplies', JSON.stringify(updatedReplies));

      // إذا كان تحويل، تحديث قسم الرسالة الأصلية
      if (replyType === 'transfer' && updateStatus) {
        // تحديث قسم الرسالة في البيانات الأساسية
        const updatedMessages = contactMessages.map(msg => {
          if (msg.id === messageId) {
            return { ...msg, department: transferDepartment };
          }
          return msg;
        });
        localStorage.setItem('contactMessages', JSON.stringify(updatedMessages));
        window.location.reload(); // إعادة تحميل الصفحة لتظهر التحديثات
      }

      // إعادة تعيين النموذج
      setReplyContent('');
      setTransferDepartment('');
      setReplyAttachments([]);
      setShowReplyForm(null);
      setReplyType('reply');

      alert('تم إرسال الرد بنجاح!');
      
    } catch (error) {
      console.error('خطأ في إرسال الرد:', error);
      alert('حدث خطأ في إرسال الرد. يرجى المحاولة مرة أخرى.');
    }
  };

  return (
    <Card>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100">أرشيف رسائل التواصل</h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">استعراض الرسائل الواردة عبر نموذج التواصل وإدارة حالتها.</p>
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
              {archiveFilter === 'ARCHIVED' ? `عرض: المؤرشف فقط (${archivedCount})` :
               archiveFilter === 'NOT_ARCHIVED' ? `عرض: غير المؤرشف فقط (${notArchivedCount})` :
               `عرض: الكل (${filteredSorted.length})`}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            className={`px-3 py-2 rounded-md ${showAssist ? 'bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200' : 'bg-cyan-600 hover:bg-cyan-700 text-white'}`}
            onClick={() => setShowAssist(s => !s)}
          >
            {showAssist ? 'إخفاء المساعد' : 'فتح المساعد الذكي'}
          </button>
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
                const list = filteredSorted.filter(m => (
                  exportScope === 'ALL' ? true : exportScope === 'ARCHIVED' ? !!m.archived : !m.archived
                ));
                const rows = list.map(m => ({
                  'الرقم': m.id,
                  'التاريخ': m.submissionDate.toLocaleString('ar-SY-u-nu-latn'),
                  'الاسم': m.name,
                  'البريد': m.email || '',
                  'النوع': m.type || '',
                  'القسم': m.department || '',
                  'الحالة': m.status,
                  'الموضوع': m.subject || '',
                  'الرسالة': m.message?.replace(/\s+/g, ' ').slice(0, 500) || '',
                  'مؤرشف': m.archived ? 'نعم' : 'لا',
                  'تاريخ الأرشفة': m.archivedAt ? new Date(m.archivedAt).toLocaleString('ar-SY-u-nu-latn') : '',
                }));
                const xlsxMod = await import('xlsx');
                const XLSX: any = (xlsxMod as any).default || xlsxMod;
                const ws = XLSX.utils.json_to_sheet(rows);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, 'Archive');
                const ts = new Date().toISOString().slice(0,19).replace(/[:T]/g,'-');
                const scope = exportScope === 'ALL' ? 'all' : exportScope === 'ARCHIVED' ? 'archived' : 'not-archived';
                XLSX.writeFile(wb, `archive-messages-${scope}-${ts}.xlsx`, { bookType: 'xlsx' });
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

      {showAssist && (
        <div className="mb-4">
          <AIAssistPanel history={peakHistory} subtitle="مساعد لاقتراح ردود وتحويل مناسب للرسائل" />
        </div>
      )}

      {/* شريط أدوات الأرشفة والبحث */}
      <div className="mb-3 grid gap-2 md:gap-3 md:grid-cols-12">
        <div className="md:col-span-3">
          <input
            type="search"
            placeholder="بحث (رقم، اسم، بريد، قسم، موضوع، نص)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full p-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          />
        </div>
        <div className="md:col-span-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ContactMessageStatus | 'ALL')}
            className="w-full p-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          >
            <option value="ALL">كل الحالات</option>
            {Object.values(ContactMessageStatus).map(s => <option key={s} value={s}>{s}</option>)}
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
          <input
            type="date"
            dir="ltr"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="w-full min-w-[11rem] p-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 text-left font-mono"
          />
          <input
            type="date"
            dir="ltr"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="w-full min-w-[11rem] p-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 text-left font-mono"
          />
        </div>
        {/* تمت إزالة زر تصفير */}
      </div>

  {visible.length === 0 ? (
        <div className="text-center py-16 text-gray-600 dark:text-gray-300">لا توجد رسائل تواصل</div>
      ) : (
        /* العرض المفصل (الجدول الأصلي) */
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white dark:bg-transparent divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700/50 sticky top-0 z-10">
              <tr>
                <th onClick={() => onHeaderSort('id')} className="cursor-pointer select-none px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">الرقم {sortKey==='id' ? (sortDir==='asc'?'▲':'▼') : ''}</th>
                <th onClick={() => onHeaderSort('date')} className="cursor-pointer select-none px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">التاريخ {sortKey==='date' ? (sortDir==='asc'?'▲':'▼') : ''}</th>
                <th onClick={() => onHeaderSort('name')} className="cursor-pointer select-none px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">الاسم {sortKey==='name' ? (sortDir==='asc'?'▲':'▼') : ''}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">البريد</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">النوع</th>
                <th onClick={() => onHeaderSort('department')} className="cursor-pointer select-none px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">القسم {sortKey==='department' ? (sortDir==='asc'?'▲':'▼') : ''}</th>
                <th onClick={() => onHeaderSort('status')} className="cursor-pointer select-none px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">الحالة {sortKey==='status' ? (sortDir==='asc'?'▲':'▼') : ''}</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">الردود</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">الرسالة</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  نسخة الطباعة
                  <div className="text-[10px] leading-3 mt-1 text-gray-400 dark:text-gray-500">يعرض حالة الأرشفة</div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {visible.map((m) => (
                <React.Fragment key={m.id}>
                  <tr
                    className={`transition-colors duration-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                      archiveFilter === 'ALL'
                        ? m.archived
                          ? 'border-l-[3px] border-emerald-400/70'
                          : 'border-l-[3px] border-gray-300/70'
                        : archiveFilter === 'ARCHIVED'
                        ? 'bg-emerald-50/60 dark:bg-emerald-900/10'
                        : 'bg-gray-50/60 dark:bg-gray-800/30'
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      <div className="flex flex-col gap-1">
                        <span className="font-mono">{m.id}</span>
                        <span
                          title={m.archivedAt ? `مؤرشف في ${new Date(m.archivedAt).toLocaleString('ar-SY-u-nu-latn')}` : undefined}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] leading-4 select-none ring-1 ${m.archived
                            ? 'bg-emerald-100 text-emerald-800 ring-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:ring-emerald-800/50'
                            : 'bg-gray-100 text-gray-600 ring-gray-200 dark:bg-gray-800/40 dark:text-gray-300 dark:ring-gray-700/60'
                          }`}
                        >
                          {m.archived ? (
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{m.submissionDate.toLocaleDateString('ar-SY-u-nu-latn')}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">{m.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{m.email || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{m.type}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{m.department || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm"><ContactStatusBadge status={m.status} /></td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`
                        inline-flex items-center justify-center w-6 h-6 text-xs font-medium rounded-full
                        ${getMessageReplies(m.id).length > 0 
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-300' 
                          : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                        }
                      `}>
                        {getMessageReplies(m.id).length}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300 max-w-[40ch] truncate" title={m.message}>{m.message}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs">
                      {m.printSnapshotHtml ? (
                        <button
                          className={`px-2 py-1 rounded transition-colors ${m.archived
                            ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                          title={m.archived ? 'نسخة الطباعة (مؤرشف)' : 'نسخة طباعة (غير مؤرشف)'}
                          onClick={() => {
                            const w = window.open('', '_blank');
                            if (w) { w.document.write(m.printSnapshotHtml!); w.document.close(); }
                          }}
                        >{m.archived ? 'فتح النسخة المؤرشفة' : 'فتح النسخة'}</button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">—</span>
                          {!m.archived && (
                            <>
                              <button
                                className="px-2 py-1 rounded bg-cyan-600 text-white hover:bg-cyan-700"
                                title="فتح تفاصيل الرسالة"
                                onClick={() => setDetailsMessageId(m.id)}
                              >فتح التفاصيل</button>
                              <button
                                className="px-2 py-1 rounded bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200"
                                title="فتح شريط الرد السريع"
                                onClick={() => setShowReplyForm(prev => prev === m.id ? null : m.id)}
                              >رد سريع</button>
                            </>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                  {/* Inline quick reply for non-archived rows */}
                  {showReplyForm === m.id && !m.archived && (
                    <tr className="bg-gray-50/60 dark:bg-gray-800/40">
                      <td colSpan={10} className="px-6 py-4 text-sm text-gray-800 dark:text-gray-100">
                        <div className="flex flex-col gap-3">
                          <div className="flex flex-wrap items-center gap-3">
                            <label className="flex items-center gap-1"><input type="radio" name={`rt-${m.id}`} checked={replyType==='reply'} onChange={()=>setReplyType('reply')} /> رد</label>
                            <label className="flex items-center gap-1"><input type="radio" name={`rt-${m.id}`} checked={replyType==='comment'} onChange={()=>setReplyType('comment')} /> ملاحظة داخلية</label>
                            <label className="flex items-center gap-1"><input type="radio" name={`rt-${m.id}`} checked={replyType==='transfer'} onChange={()=>setReplyType('transfer')} /> تحويل قسم</label>
                            {replyType === 'transfer' && (
                              <select
                                value={transferDepartment}
                                onChange={(e)=>setTransferDepartment(e.target.value)}
                                className="p-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 min-w-[12rem]"
                              >
                                <option value="">اختر القسم</option>
                                {departmentNames.map(dep => <option key={dep} value={dep}>{dep}</option>)}
                              </select>
                            )}
                          </div>
                          <textarea
                            placeholder={replyType==='comment' ? 'اكتب ملاحظة داخلية (لن تُرسل للمواطن)' : 'اكتب محتوى الرد'}
                            value={replyContent}
                            onChange={(e)=>setReplyContent(e.target.value)}
                            className="w-full min-h-[80px] p-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                          />
                          <div className="flex items-center gap-3">
                            <label className="px-3 py-1.5 rounded bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 cursor-pointer">
                              إرفاق ملفات
                              <input type="file" multiple className="hidden" onChange={handleFileUpload} />
                            </label>
                            {replyAttachments.length > 0 && (
                              <div className="text-xs text-gray-600 dark:text-gray-300">{replyAttachments.length} ملف(ات) مرفقة</div>
                            )}
                          </div>
                          {replyAttachments.length > 0 && (
                            <ul className="text-xs text-gray-600 dark:text-gray-300">
                              {replyAttachments.map((f, i) => (
                                <li key={i} className="flex items-center gap-2">
                                  <span>{f.name} ({Math.round(f.size/1024)} ك.ب)</span>
                                  <button className="text-red-600 hover:underline" onClick={()=>removeAttachment(i)}>إزالة</button>
                                </li>
                              ))}
                            </ul>
                          )}
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => {
                                setShowReplyForm(null);
                                setReplyType('reply');
                                setReplyContent('');
                                setTransferDepartment('');
                                setReplyAttachments([]);
                              }}
                              className="px-4 py-2 rounded border border-gray-300 dark:border-gray-600"
                            >إلغاء</button>
                            <button
                              onClick={() => handleSubmitReply(m.id)}
                              className="px-4 py-2 rounded bg-cyan-600 hover:bg-cyan-700 text-white"
                            >إرسال</button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {filteredSorted.length > 0 && (
        <div className="mt-3 flex items-center justify-between text-sm text-gray-700 dark:text-gray-300">
          <div>
            عرض {Math.min(totalItems, startIndex + 1)}–{Math.min(totalItems, startIndex + visible.length)} من {totalItems}
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
      )}

      {/* Details Modal */}
      {detailsMessageId && (
        <ContactMessageDetailsModal
          open={true}
          // @ts-ignore find the message from the current list (includes base storage fields)
          message={contactMessages.find(m => m.id === detailsMessageId) || visible.find(m => m.id === detailsMessageId)!}
          onClose={() => setDetailsMessageId(null)}
        />
      )}
    </Card>
  );
};

export default ContactMessagesPage;
