import React, { useEffect, useMemo, useState } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { ensureFustatRegistered } from '../utils/pdfFonts';
import { storageModeService } from '../utils/storageMode';

interface InternalMessageRecord {
  id: string;
  kind?: string;
  docIds?: string[];
  subject: string;
  body: string;
  priority?: string;
  createdAt: string;
  source?: string;
  toDepartments?: string[];
  attachments?: Array<{ name: string; size: number; type: string; data: string }>;
  templateName?: string;
  read?: boolean;
  replies?: InternalMessageReply[];
}

interface InternalMessageReply {
  id: string;
  messageId: string;
  replyBy: string;
  department: string;
  content: string;
  attachments?: Array<{ name: string; size: number; type: string; data: string }>;
  createdAt: string;
  type: 'reply' | 'comment' | 'opinion';
}

const InternalMessagesPage: React.FC = () => {
  const [allMessages, setAllMessages] = useState<InternalMessageRecord[]>([]);
  const [refresh, setRefresh] = useState(0);
  const [filterDepartment, setFilterDepartment] = useState<string>('الكل');
  const [filterPriority, setFilterPriority] = useState<string>('الكل');
  const [filterKind, setFilterKind] = useState<string>('الكل');
  const [query, setQuery] = useState('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [selectedId, setSelectedId] = useState<string|null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [showSearchOptions, setShowSearchOptions] = useState(false);
  const [searchFields, setSearchFields] = useState({
    id: true,
    subject: true,
    body: true,
    docIds: true,
    departments: false,
    source: false,
    template: false
  });
  // حالة مؤقتة لعرض نجاح النسخ للمعرف
  const [copiedId, setCopiedId] = useState<string|null>(null);
  // حالة معاينة المرفقات
  const [previewAttachment, setPreviewAttachment] = useState<null | { name: string; type: string; data: string }>(null);
  
  // حالات الرد والتعليق
  const [showReplyForm, setShowReplyForm] = useState<string | null>(null);
  const [replyType, setReplyType] = useState<'reply' | 'comment' | 'opinion'>('reply');
  const [replyContent, setReplyContent] = useState('');
  const [replyAttachments, setReplyAttachments] = useState<File[]>([]);
  const [showFullDetails, setShowFullDetails] = useState<string | null>(null);

  // معلومات المستخدم الحالي (محاكاة)
  const currentUser = {
    name: 'موظف النظام',
    department: 'قسم تقنية المعلومات'
  };

  // إغلاق المعاينة بزر Escape
  useEffect(()=>{
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setPreviewAttachment(null); };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, []);

  const toggleField = (key: keyof typeof searchFields) => {
    setSearchFields(prev => ({...prev, [key]: !prev[key]}));
  };

  // تحديث قائمة الرسائل عند تغيير البيانات
  useEffect(() => {
    try {
      const raw = localStorage.getItem('internalMessages');
      if (!raw) { 
        setAllMessages([]);
        return; 
      }
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setAllMessages(parsed);
      } else {
        setAllMessages([]);
      }
    } catch (error) { 
      console.error('خطأ في تحميل الرسائل:', error);
      setAllMessages([]); 
    }
  }, [refresh]);

  // دالة لتحميل ردود رسالة معينة
  const getMessageReplies = (messageId: string): InternalMessageReply[] => {
    try {
      const repliesData = localStorage.getItem('messageReplies');
      if (!repliesData) return [];
      
      const allReplies = JSON.parse(repliesData);
      return allReplies.filter((reply: InternalMessageReply) => reply.messageId === messageId);
    } catch (error) {
      console.error('خطأ في تحميل الردود:', error);
      return [];
    }
  };

  // دالة لتصدير الرسالة مع الردود إلى PDF
  const exportMessageToPDF = async (message: any) => {
    try {
      const { jsPDF } = await import('jspdf');
      
      // إنشاء مستند PDF جديد
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'a4'
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 50;
      let currentY = margin;

      // إضافة العنوان والشعار
      doc.setFontSize(20);
      doc.text('الجمهورية العربية السورية', pageWidth / 2, currentY, { align: 'center' });
      currentY += 30;
      
      doc.setFontSize(16);
      doc.text('مديرية مالية حلب', pageWidth / 2, currentY, { align: 'center' });
      currentY += 20;
      
      doc.setFontSize(14);
      doc.text('نظام الرسائل الداخلية', pageWidth / 2, currentY, { align: 'center' });
      currentY += 40;

      // خط فاصل
      doc.setLineWidth(2);
      doc.line(margin, currentY, pageWidth - margin, currentY);
      currentY += 30;

      // تفاصيل الرسالة
      doc.setFontSize(12);
      doc.text(`معرف الرسالة: ${message.id}`, pageWidth - margin, currentY, { align: 'right' });
      currentY += 20;
      
      doc.text(`الموضوع: ${message.subject}`, pageWidth - margin, currentY, { align: 'right' });
      currentY += 20;
      
      doc.text(`من: ${message.fromDepartment || message.sender || 'غير محدد'}`, pageWidth - margin, currentY, { align: 'right' });
      currentY += 20;
      
      if (message.toDepartments && message.toDepartments.length > 0) {
        doc.text(`إلى: ${message.toDepartments.join(', ')}`, pageWidth - margin, currentY, { align: 'right' });
        currentY += 20;
      }
      
      doc.text(`الأولوية: ${message.priority || 'عادية'}`, pageWidth - margin, currentY, { align: 'right' });
      currentY += 20;
      
      doc.text(`التاريخ: ${new Date(message.createdAt).toLocaleString('ar-SY-u-nu-latn')}`, pageWidth - margin, currentY, { align: 'right' });
      currentY += 30;

      // محتوى الرسالة
      doc.text('محتوى الرسالة:', pageWidth - margin, currentY, { align: 'right' });
      currentY += 20;
      
      const contentLines = doc.splitTextToSize(message.content || 'لا يوجد محتوى', pageWidth - (margin * 2));
      doc.text(contentLines, pageWidth - margin, currentY, { align: 'right' });
      currentY += contentLines.length * 15 + 20;

      // المرفقات
      if (message.attachments && message.attachments.length > 0) {
        currentY += 10;
        doc.text('المرفقات:', pageWidth - margin, currentY, { align: 'right' });
        currentY += 20;
        
        message.attachments.forEach((att: any, idx: number) => {
          doc.text(`${idx + 1}. ${att.name} (${(att.size / 1024).toFixed(1)} KB)`, pageWidth - margin, currentY, { align: 'right' });
          currentY += 15;
        });
        currentY += 10;
      }

      // الردود والتعليقات
      const replies = getMessageReplies(message.id);
      if (replies.length > 0) {
        // صفحة جديدة للردود إذا لزم الأمر
        if (currentY > pageHeight - 100) {
          doc.addPage();
          currentY = margin;
        }
        
        currentY += 20;
        doc.setLineWidth(1);
        doc.line(margin, currentY, pageWidth - margin, currentY);
        currentY += 20;
        
        doc.setFontSize(14);
        doc.text(`الردود والتعليقات (${replies.length})`, pageWidth - margin, currentY, { align: 'right' });
        currentY += 30;

        replies.forEach((reply, idx) => {
          // التحقق من الحاجة لصفحة جديدة
          if (currentY > pageHeight - 150) {
            doc.addPage();
            currentY = margin;
          }

          doc.setFontSize(11);
          doc.text(`${idx + 1}. ${reply.type === 'reply' ? 'رد' : reply.type === 'comment' ? 'تعليق' : 'رأي'}`, pageWidth - margin, currentY, { align: 'right' });
          currentY += 15;
          
          doc.text(`من: ${reply.replyBy} (${reply.department})`, pageWidth - margin, currentY, { align: 'right' });
          currentY += 15;
          
          doc.text(`التاريخ: ${new Date(reply.createdAt).toLocaleString('ar-SY-u-nu-latn')}`, pageWidth - margin, currentY, { align: 'right' });
          currentY += 20;
          
          const replyContentLines = doc.splitTextToSize(reply.content, pageWidth - (margin * 2));
          doc.text(replyContentLines, pageWidth - margin, currentY, { align: 'right' });
          currentY += replyContentLines.length * 12 + 10;
          
          if (reply.attachments && reply.attachments.length > 0) {
            doc.text(`المرفقات: ${reply.attachments.length} ملف`, pageWidth - margin, currentY, { align: 'right' });
            currentY += 15;
          }
          
          currentY += 15;
        });
      }

      // حفظ PDF
      doc.save(`رسالة-داخلية-${message.id}-${Date.now()}.pdf`);
      
    } catch (error) {
      console.error('خطأ في تصدير PDF:', error);
      alert('حدث خطأ في تصدير الملف. يرجى المحاولة مرة أخرى.');
    }
  };

  // التقاط focus من الهاش (#/internal-messages?focus=ID)
  useEffect(() => {
    const applyFocus = () => {
      const hash = window.location.hash || '';
      if (hash.startsWith('#/internal-messages')) {
        const qIndex = hash.indexOf('?');
        if (qIndex !== -1) {
          const qs = new URLSearchParams(hash.slice(qIndex+1));
          const focus = qs.get('focus');
          if (focus && allMessages.some(m => m.id === focus)) {
            setSelectedId(focus);
          }
        }
      }
    };
    applyFocus();
    window.addEventListener('hashchange', applyFocus);
    return () => window.removeEventListener('hashchange', applyFocus);
  }, [allMessages]);

  const departmentsUniverse = useMemo(()=>{
    const s = new Set<string>();
    allMessages.forEach(m => (m.toDepartments||[]).forEach(d=> s.add(d)));
    return Array.from(s);
  }, [allMessages]);

  const kindsUniverse = useMemo(()=>{
    const s = new Set<string>();
    allMessages.forEach(m => m.kind && s.add(m.kind));
    return Array.from(s);
  }, [allMessages]);

  const filtered = useMemo(()=>{
    return allMessages.filter(m => {
      if (filterDepartment !== 'الكل') {
        if (!m.toDepartments || !m.toDepartments.includes(filterDepartment)) return false;
      }
      if (filterPriority !== 'الكل') {
        if ((m.priority||'') !== filterPriority) return false;
      }
      if (filterKind !== 'الكل') {
        if ((m.kind||'') !== filterKind) return false;
      }
      if (dateFrom) {
        const t = new Date(m.createdAt).getTime();
        const fromTs = new Date(dateFrom + 'T00:00:00').getTime();
        if (t < fromTs) return false;
      }
      if (dateTo) {
        const t = new Date(m.createdAt).getTime();
        const toTs = new Date(dateTo + 'T23:59:59').getTime();
        if (t > toTs) return false;
      }
      if (query.trim()) {
        const q = query.trim();
        let matched = false;
        if (!matched && searchFields.id && m.id.includes(q)) matched = true;
        if (!matched && searchFields.subject && (m.subject||'').includes(q)) matched = true;
        if (!matched && searchFields.body && (m.body||'').includes(q)) matched = true;
        if (!matched && searchFields.docIds && (m.docIds||[]).some(id => id.includes(q))) matched = true;
        if (!matched && searchFields.departments && (m.toDepartments||[]).some(d => d.includes(q))) matched = true;
        if (!matched && searchFields.source && (m.source||'').includes(q)) matched = true;
        if (!matched && searchFields.template && (m.templateName||'').includes(q)) matched = true;
        if (!matched) return false;
      }
      return true;
    });
  }, [allMessages, filterDepartment, filterPriority, filterKind, query, dateFrom, dateTo, searchFields]);

  const selected = filtered.find(m => m.id === selectedId) || null;

  // وسم الرسالة مقروءة عند اختيارها
  useEffect(()=>{
    if (!selectedId) return;
    try {
      let changed = false;
      const raw = localStorage.getItem('internalMessages');
      if (!raw) return;
      const list: InternalMessageRecord[] = JSON.parse(raw);
      const updated = list.map(m => {
        if (m.id === selectedId && !m.read) { changed = true; return { ...m, read: true }; }
        return m;
      });
      if (changed) {
        localStorage.setItem('internalMessages', JSON.stringify(updated));
        setAllMessages(updated);
        // Sync to cloud
        storageModeService.syncInternalMessagesToCloud().catch(err => console.error('[InternalMessages] Sync error:', err));
      }
    } catch {/* ignore */}
  }, [selectedId]);

  const exportExcel = async () => {
    try {
      if (!filtered.length) { alert('لا توجد بيانات للتصدير'); return; }
      setExporting(true);
      const rows = filtered.map(m => ({
        المعرف: m.id,
        النوع: m.kind || '',
        الموضوع: m.subject,
        الأولوية: m.priority || '',
        الأقسام: (m.toDepartments||[]).join(', '),
        عدد_الوثائق: (m.docIds||[]).length,
        التاريخ: new Date(m.createdAt).toLocaleString('ar-SY-u-nu-latn'),
        المصدر: m.source || '',
        القالب: m.templateName || ''
      }));
      const xlsx = await import('xlsx');
      const ws = xlsx.utils.json_to_sheet(rows);
      const wb = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wb, ws, 'Messages');
      const wbout = xlsx.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `internal-messages-${new Date().toISOString().slice(0,10)}.xlsx`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    } catch { alert('فشل التصدير'); }
    finally { setExporting(false); }
  };

  const exportPDF = async () => {
    if (!filtered.length) { alert('لا توجد بيانات للتصدير'); return; }
    setExportingPdf(true);
    try {
      await ensureFustatRegistered();
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
      // إعداد الخط RTL
      try { doc.setFont('Fustat'); } catch {}
      doc.setFontSize(12);
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const marginX = 32;
      const marginY = 36;
      const usableWidth = pageWidth - marginX * 2;
      let y = marginY;

      // عنوان
      doc.text('تقرير الرسائل الداخلية', pageWidth - marginX, y, { align: 'right' });
      y += 18;
      const meta = `عدد السجلات: ${filtered.length} - تاريخ الإنشاء: ${new Date().toLocaleString('ar-SY-u-nu-latn')}`;
      doc.setFontSize(10);
      doc.text(meta, pageWidth - marginX, y, { align: 'right' });
      doc.setFontSize(9);
      y += 20;

      // رؤوس الأعمدة (نعرف أعمدة ثابتة)
      const headers = ['المعرف','التاريخ','الموضوع','الأولوية','الأقسام','عدد الوثائق','القالب'];
      const colWidths = [80, 90, 140, 60, 60, 50, 60]; // يجب ألا تتجاوز مجموعها العرض المتاح
      const totalColsWidth = colWidths.reduce((a,b)=>a+b,0);
      const scale = usableWidth / totalColsWidth;
      const scaledColWidths = colWidths.map(w=> w*scale);

      const drawRow = (cells: string[], isHeader=false) => {
        const rowHeight = 14; // مبدئي
        let x = pageWidth - marginX; // نبدأ من اليمين
        doc.setFontSize(isHeader ? 9 : 8.3);
        doc.setTextColor(0,0,0);
        cells.forEach((cell, idx) => {
          const w = scaledColWidths[idx];
          // حساب التفاف مبسط
            const wrapped = wrapText(doc, cell, w - 4);
            const cellHeight = 10 + (wrapped.length - 1) * 10;
            if (y + cellHeight > pageHeight - marginY) {
              doc.addPage(); y = marginY; // عنوان لكل صفحة؟ يمكن تركه بسيطاً الآن
            }
            // إطار خفيف
            doc.setDrawColor(200,200,200);
            doc.rect(x - w, y, w, cellHeight);
            let textY = y + 10;
            wrapped.forEach(line => {
              doc.text(line, x - 2, textY, { align: 'right' });
              textY += 10;
            });
            // تحريك x لليسار
            x -= w;
            if (idx === cells.length -1) {
              // تحديث y للصف بالكامل بأكبر ارتفاع
              y += cellHeight;
            }
        });
      };

      // دالة التفاف
      const wrapText = (docInst: any, text: string, maxWidth: number) => {
        if (!text) return [''];
        const words = text.split(/\s+/);
        const lines: string[] = [];
        let current = '';
        words.forEach(w => {
          const test = current ? (w + ' ' + current) : w; // RTL نعكس الترتيب لإظهار النص بشكل مقبول تقريبياً
          const width = docInst.getTextWidth(test);
          if (width > maxWidth && current) {
            lines.push(current);
            current = w;
          } else {
            current = test;
          }
        });
        if (current) lines.push(current);
        return lines;
      };

      // رسم الرأس
      drawRow(headers, true);

      filtered.forEach(m => {
        const row = [
          m.id,
          new Date(m.createdAt).toLocaleDateString('ar-SY-u-nu-latn'),
          m.subject || '',
            m.priority || '',
          String((m.toDepartments||[]).length),
          String((m.docIds||[]).length),
          m.templateName || ''
        ];
        drawRow(row);
        // سطر اختياري لمقتطف النص
        if (m.body && m.body.length > 40) {
          const snippet = m.body.slice(0, 160).replace(/\s+/g,' ').trim() + (m.body.length>160?'...':'');
          const snippetCells = ['', '', snippet, '', '', '', ''];
          drawRow(snippetCells);
        }
      });

      doc.save(`internal-messages-${new Date().toISOString().slice(0,10)}.pdf`);
    } catch (e) {
      console.error(e);
      alert('فشل إنشاء PDF');
    } finally {
      setExportingPdf(false);
    }
  };

  // دالة معالجة الرد/التعليق
  const handleReply = async (messageId: string) => {
    if (!replyContent.trim()) {
      alert('يرجى كتابة محتوى الرد');
      return;
    }

    try {
      // تحويل المرفقات إلى base64
      const attachments = [];
      for (const file of replyAttachments) {
        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
        
        attachments.push({
          name: file.name,
          size: file.size,
          type: file.type,
          data: base64
        });
      }

      // إنشاء الرد الجديد
      const newReply: InternalMessageReply = {
        id: `reply-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        messageId: messageId,
        replyBy: currentUser.name,
        department: currentUser.department,
        content: replyContent,
        attachments: attachments,
        createdAt: new Date().toISOString(),
        type: replyType
      };

      // تحديث الرسالة لإضافة الرد
      const updatedMessages = allMessages.map(msg => {
        if (msg.id === messageId) {
          return {
            ...msg,
            replies: [...(msg.replies || []), newReply]
          };
        }
        return msg;
      });

      setAllMessages(updatedMessages);
      
      // حفظ في localStorage
      localStorage.setItem('internalMessages', JSON.stringify(updatedMessages));
      
      // Sync to cloud
      storageModeService.syncInternalMessagesToCloud().then(res => {
        if (res.success) {
          console.log('[InternalMessages] ✅ Reply synced to cloud');
        }
      }).catch(err => console.error('[InternalMessages] Sync error:', err));

      // إعادة تعيين النموذج
      setReplyContent('');
      setReplyAttachments([]);
      setShowReplyForm(null);
      
      alert(replyType === 'reply' ? 'تم إرسال الرد بنجاح!' : replyType === 'comment' ? 'تم إرسال التعليق بنجاح!' : 'تم إرسال الرأي بنجاح!');
      
    } catch (error) {
      console.error('خطأ في إرسال الرد:', error);
      alert('حدث خطأ في إرسال الرد');
    }
  };

  // دالة معالجة رفع الملفات
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setReplyAttachments(prev => [...prev, ...files]);
  };

  // دالة حذف مرفق
  const removeAttachment = (index: number) => {
    setReplyAttachments(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h2 className="text-xl font-bold">الرسائل الداخلية</h2>
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <input
            type="text"
            placeholder="بحث (موضوع / نص / معرف وثيقة)"
            value={query}
            onChange={e=> setQuery(e.target.value)}
            className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
            style={{direction:'rtl'}}
          />
          <button
            onClick={()=> setShowSearchOptions(s=>!s)}
            className="px-2 py-1 rounded border border-purple-500 text-purple-600 bg-white dark:bg-gray-900 hover:bg-purple-50"
          >خيارات البحث</button>
          <select value={filterDepartment} onChange={e=> setFilterDepartment(e.target.value)} className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900">
            <option value="الكل">كل الأقسام</option>
            {departmentsUniverse.map(dep => <option key={dep} value={dep}>{dep}</option>)}
          </select>
          <select value={filterPriority} onChange={e=> setFilterPriority(e.target.value)} className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900">
            <option value="الكل">كل الأولويات</option>
            <option value="عادي">عادي</option>
            <option value="هام">هام</option>
            <option value="عاجل">عاجل</option>
          </select>
          <select value={filterKind} onChange={e=> setFilterKind(e.target.value)} className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900">
            <option value="الكل">كل الأنواع</option>
            {kindsUniverse.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
          <input
            type="date"
            value={dateFrom}
            onChange={e=> setDateFrom(e.target.value)}
            className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
            title="من تاريخ"
          />
          <input
            type="date"
            value={dateTo}
            onChange={e=> setDateTo(e.target.value)}
            className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900"
            title="إلى تاريخ"
          />
          {(dateFrom||dateTo) && (
            <button
              onClick={()=>{ setDateFrom(''); setDateTo(''); }}
              className="px-2 py-1 rounded bg-gray-500 text-white hover:bg-gray-600"
            >مسح التاريخ</button>
          )}
          <button
            onClick={()=> setRefresh(r=>r+1)}
            className="px-2 py-1 rounded border border-blue-500 text-blue-600 bg-white dark:bg-gray-900 hover:bg-blue-50"
          >تحديث</button>
          <button
            disabled={exporting}
            onClick={exportExcel}
            className="px-2 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40"
          >تصدير Excel</button>
          <button
            disabled={exportingPdf}
            onClick={exportPDF}
            className="px-2 py-1 rounded bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-40"
          >تصدير PDF</button>
          <button
            onClick={()=>{
              try {
                const raw = localStorage.getItem('internalMessages');
                if (!raw) return;
                const list: InternalMessageRecord[] = JSON.parse(raw);
                const updated = list.map(m => ({ ...m, read: true }));
                localStorage.setItem('internalMessages', JSON.stringify(updated));
                setAllMessages(updated);
                setSelectedId(null);
                // Sync to cloud
                storageModeService.syncInternalMessagesToCloud().catch(err => console.error('[InternalMessages] Sync error:', err));
              } catch {/* ignore */}
            }}
            className="px-2 py-1 rounded bg-gray-500 text-white hover:bg-gray-600"
          >تعليم الكل مقروء</button>
        </div>
      </div>
      {showSearchOptions && (
        <div className="mb-4 border rounded-lg border-purple-300 dark:border-purple-700 bg-purple-50/60 dark:bg-purple-900/20 p-3 text-xs flex flex-wrap gap-4">
          <div className="font-semibold w-full text-purple-800 dark:text-purple-200 mb-1">حقول البحث المفعلة</div>
          {Object.entries(searchFields).map(([k,v]) => (
            <label key={k} className="flex items-center gap-1 cursor-pointer select-none">
              <input type="checkbox" checked={v} onChange={()=> toggleField(k as any)} />
              <span>{k==='id'?'المعرف': k==='subject'?'الموضوع': k==='body'?'النص': k==='docIds'?'معرفات الوثائق': k==='departments'?'الأقسام': k==='source'?'المصدر':'القالب'}</span>
            </label>
          ))}
          <button
            onClick={()=> setSearchFields({id:true, subject:true, body:true, docIds:true, departments:false, source:false, template:false})}
            className="ml-auto mt-2 px-2 py-1 rounded bg-purple-600 text-white hover:bg-purple-700"
          >إعادة الضبط</button>
        </div>
      )}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2 border rounded-lg border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="bg-gray-50 dark:bg-gray-800/60 px-3 py-2 text-xs flex items-center justify-between">
            <span>العدد: {filtered.length}</span>
            <span className="text-gray-500 dark:text-gray-400">انقر لعرض التفاصيل</span>
          </div>
          <div className="max-h-[520px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 dark:bg-gray-800/70 sticky top-0">
                <tr>
                  <th className="p-2 text-right font-medium">#</th>
                  <th className="p-2 text-right font-medium">المعرف</th>
                  <th className="p-2 text-right font-medium">الموضوع</th>
                  <th className="p-2 text-right font-medium">الأولوية</th>
                  <th className="p-2 text-right font-medium">الأقسام</th>
                  <th className="p-2 text-right font-medium">الردود</th>
                  <th className="p-2 text-right font-medium">التاريخ</th>
                  <th className="p-2 text-right font-medium">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filtered.map((m,i)=>(
                  <tr
                    key={m.id}
                    onClick={()=> setSelectedId(m.id)}
                    className={`cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/30 ${m.id===selectedId? 'bg-amber-50 dark:bg-amber-900/30':''} ${!m.read ? 'font-semibold' : ''}`}
                  >
                    <td className="p-2 text-xs text-gray-500">{i+1}</td>
                    <td className="p-2 font-mono text-[11px]">{m.id}</td>
                    <td className="p-2 truncate max-w-[180px]" title={m.subject}>{m.subject}</td>
                    <td className="p-2 text-xs">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${m.priority==='عاجل'?'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300': m.priority==='هام'?'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300':'bg-gray-100 text-gray-700 dark:bg-gray-700/40 dark:text-gray-300'}`}>{m.priority||'—'}</span>
                    </td>
                    <td className="p-2 text-[11px] text-gray-600 dark:text-gray-300">{(m.toDepartments||[]).length}</td>
                    <td className="p-2 text-center">
                      <span className={`
                        inline-flex items-center justify-center w-5 h-5 text-[10px] font-medium rounded-full
                        ${getMessageReplies(m.id).length > 0 
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-300' 
                          : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                        }
                      `}>
                        {getMessageReplies(m.id).length}
                      </span>
                    </td>
                    <td className="p-2 text-[11px] whitespace-nowrap">{new Date(m.createdAt).toLocaleString('ar-SY-u-nu-latn')}</td>
                    <td className="p-2">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            exportMessageToPDF(m);
                          }}
                          className="p-1 rounded bg-red-100 hover:bg-red-200 dark:bg-red-800 dark:hover:bg-red-700 text-red-700 dark:text-red-300"
                          title="تحميل PDF"
                        >
                          <span className="text-xs">📥</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedId(m.id);
                            setShowFullDetails(m.id);
                          }}
                          className="p-1 rounded bg-green-100 hover:bg-green-200 dark:bg-green-800 dark:hover:bg-green-700 text-green-700 dark:text-green-300"
                          title="عرض شامل"
                        >
                          <span className="text-xs">📋</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!filtered.length && (
                  <tr><td colSpan={8} className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">لا توجد رسائل</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="border rounded-lg border-gray-200 dark:border-gray-700 p-3 bg-white/70 dark:bg-gray-800/70">
          {selected ? (
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-base">تفاصيل الرسالة</h3>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setShowFullDetails(showFullDetails === selected.id ? null : selected.id)}
                    className="text-xs px-3 py-1 rounded bg-green-600 text-white hover:bg-green-700 flex items-center gap-1"
                  >
                    <span>📋</span>
                    {showFullDetails === selected.id ? 'عرض مبسط' : 'عرض شامل'}
                  </button>
                  <button 
                    onClick={() => exportMessageToPDF(selected)}
                    className="text-xs px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700 flex items-center gap-1"
                  >
                    <span>📥</span>
                    تحميل PDF
                  </button>
                  <button onClick={()=> setSelectedId(null)} className="text-xs px-2 py-1 rounded bg-gray-200 dark:bg-gray-700">إغلاق</button>
                </div>
              </div>
              <div className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-2">
                <span>المعرف: {selected.id}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    const idToCopy = selected.id;
                    const performCopy = async () => {
                      try {
                        if (navigator.clipboard && navigator.clipboard.writeText) {
                          await navigator.clipboard.writeText(idToCopy);
                        } else {
                          // Fallback قديم
                          const ta = document.createElement('textarea');
                          ta.value = idToCopy; document.body.appendChild(ta); ta.select();
                          try { document.execCommand('copy'); } catch {}
                          document.body.removeChild(ta);
                        }
                        setCopiedId(idToCopy);
                        setTimeout(()=> setCopiedId(cur => cur === idToCopy ? null : cur), 1500);
                      } catch {}
                    };
                    performCopy();
                  }}
                  className="px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-[10px] min-w-[46px] text-center"
                >{copiedId === selected.id ? 'تم النسخ' : 'نسخ'}</button>
              </div>
              <div><span className="font-medium">الموضوع:</span> {selected.subject}</div>
              {selected.kind && <div><span className="font-medium">النوع:</span> {selected.kind}</div>}
              {selected.priority && <div><span className="font-medium">الأولوية:</span> {selected.priority}</div>}
              {selected.templateName && <div><span className="font-medium">القالب:</span> {selected.templateName}</div>}
              <div className="text-xs text-gray-500 dark:text-gray-400">التاريخ: {new Date(selected.createdAt).toLocaleString('ar-SY-u-nu-latn')}</div>
              <div className="border rounded p-2 bg-gray-50 dark:bg-gray-900/40 max-h-40 overflow-auto whitespace-pre-wrap leading-relaxed text-[13px]">{selected.body}</div>
              
              {/* العرض الشامل للتفاصيل */}
              {showFullDetails === selected.id && (
                <div className="mt-4 p-4 border rounded-lg bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                  <h4 className="font-semibold text-sm mb-3 text-blue-800 dark:text-blue-200">📋 العرض الشامل للرسالة</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="space-y-2">
                      <div><span className="font-medium text-gray-700 dark:text-gray-300">المعرف الكامل:</span> <span className="font-mono bg-gray-200 dark:bg-gray-700 px-1 rounded">{selected.id}</span></div>
                      <div><span className="font-medium text-gray-700 dark:text-gray-300">حالة القراءة:</span> <span className={`px-2 py-0.5 rounded text-xs ${selected.read ? 'bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-800 dark:text-red-300'}`}>{selected.read ? 'مقروءة' : 'غير مقروءة'}</span></div>
                      <div><span className="font-medium text-gray-700 dark:text-gray-300">المصدر:</span> {selected.source || 'غير محدد'}</div>
                      <div><span className="font-medium text-gray-700 dark:text-gray-300">المُرسل:</span> {selected.sender || selected.fromDepartment || 'غير محدد'}</div>
                      <div><span className="font-medium text-gray-700 dark:text-gray-300">القسم المُرسل:</span> {selected.fromDepartment || 'غير محدد'}</div>
                    </div>
                    
                    <div className="space-y-2">
                      <div><span className="font-medium text-gray-700 dark:text-gray-300">تاريخ الإنشاء:</span> {new Date(selected.createdAt).toLocaleString('ar-SY-u-nu-latn')}</div>
                      <div><span className="font-medium text-gray-700 dark:text-gray-300">آخر تحديث:</span> {selected.updatedAt ? new Date(selected.updatedAt).toLocaleString('ar-SY-u-nu-latn') : 'لا يوجد'}</div>
                      <div><span className="font-medium text-gray-700 dark:text-gray-300">عدد الردود:</span> <span className="bg-blue-100 dark:bg-blue-800 px-2 py-0.5 rounded">{getMessageReplies(selected.id).length}</span></div>
                      <div><span className="font-medium text-gray-700 dark:text-gray-300">عدد المرفقات:</span> <span className="bg-purple-100 dark:bg-purple-800 px-2 py-0.5 rounded">{(selected.attachments || []).length}</span></div>
                      <div><span className="font-medium text-gray-700 dark:text-gray-300">عدد الوثائق المرتبطة:</span> <span className="bg-emerald-100 dark:bg-emerald-800 px-2 py-0.5 rounded">{(selected.docIds || []).length}</span></div>
                    </div>
                  </div>
                  
                  {/* إحصائيات الرسالة */}
                  <div className="mt-4 p-3 bg-white dark:bg-gray-800 rounded border">
                    <h5 className="font-medium text-xs mb-2 text-gray-600 dark:text-gray-400">📊 إحصائيات الرسالة</h5>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                      <div className="text-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                        <div className="font-medium text-blue-600 dark:text-blue-400">{selected.subject?.length || 0}</div>
                        <div className="text-gray-500 dark:text-gray-400">حروف الموضوع</div>
                      </div>
                      <div className="text-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                        <div className="font-medium text-green-600 dark:text-green-400">{selected.body?.length || 0}</div>
                        <div className="text-gray-500 dark:text-gray-400">حروف المحتوى</div>
                      </div>
                      <div className="text-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                        <div className="font-medium text-purple-600 dark:text-purple-400">{(selected.toDepartments || []).length}</div>
                        <div className="text-gray-500 dark:text-gray-400">أقسام مستهدفة</div>
                      </div>
                      <div className="text-center p-2 bg-gray-50 dark:bg-gray-700 rounded">
                        <div className="font-medium text-orange-600 dark:text-orange-400">{Math.floor((Date.now() - new Date(selected.createdAt).getTime()) / (1000 * 60 * 60 * 24))}</div>
                        <div className="text-gray-500 dark:text-gray-400">عمر بالأيام</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* معلومات تقنية إضافية */}
                  <div className="mt-3 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs">
                    <details className="cursor-pointer">
                      <summary className="font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">🔧 معلومات تقنية</summary>
                      <div className="mt-2 space-y-1 text-xs font-mono text-gray-500 dark:text-gray-400">
                        <div>JSON Size: ~{JSON.stringify(selected).length} bytes</div>
                        <div>Created: {selected.createdAt}</div>
                        <div>Template: {selected.templateName || 'default'}</div>
                        <div>Priority Level: {selected.priority || 'normal'}</div>
                        <div>Read Status: {selected.read ? 'read' : 'unread'}</div>
                      </div>
                    </details>
                  </div>
                  
                  {/* أزرار إضافية للإجراءات */}
                  <div className="mt-3 flex items-center gap-2 justify-center">
                    <button
                      onClick={() => {
                        const content = `
الموضوع: ${selected.subject}
المُرسل: ${selected.sender || selected.fromDepartment || 'غير محدد'}
التاريخ: ${new Date(selected.createdAt).toLocaleString('ar-SY-u-nu-latn')}

المحتوى:
${selected.body}

الأقسام المستهدفة: ${(selected.toDepartments || []).join(', ')}
عدد الردود: ${getMessageReplies(selected.id).length}
                        `.trim();
                        navigator.clipboard.writeText(content);
                        alert('تم نسخ محتوى الرسالة!');
                      }}
                      className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1"
                    >
                      <span>📋</span>
                      نسخ المحتوى
                    </button>
                    <button
                      onClick={() => window.print()}
                      className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 flex items-center gap-1"
                    >
                      <span>🖨️</span>
                      طباعة
                    </button>
                    <button
                      onClick={() => {
                        const shareData = {
                          title: `رسالة داخلية: ${selected.subject}`,
                          text: `${selected.subject}\n\n${selected.body}`,
                        };
                        if (navigator.share) {
                          navigator.share(shareData);
                        } else {
                          // Fallback for browsers that don't support Web Share API
                          const url = `mailto:?subject=${encodeURIComponent(shareData.title)}&body=${encodeURIComponent(shareData.text)}`;
                          window.open(url);
                        }
                      }}
                      className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-1"
                    >
                      <span>📤</span>
                      مشاركة
                    </button>
                  </div>
                </div>
              )}
              <div>
                <h4 className="font-medium mb-1 text-sm">الأقسام المستهدفة ({(selected.toDepartments||[]).length})</h4>
                <div className="flex flex-wrap gap-1 text-[11px]">
                  {(selected.toDepartments||[]).map(dep => (
                    <span key={dep} className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">{dep}</span>
                  ))}
                  {!(selected.toDepartments||[]).length && <span className="text-gray-400">—</span>}
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-1 text-sm">الوثائق ({(selected.docIds||[]).length})</h4>
                <div className="flex flex-wrap gap-1 text-[11px]">
                  {(selected.docIds||[]).map(id => (
                    <span key={id} className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 font-mono">{id}</span>
                  ))}
                  {!(selected.docIds||[]).length && <span className="text-gray-400">—</span>}
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-1 text-sm">المرفقات</h4>
                <div className="space-y-1">
                  {(selected.attachments||[]).map((f,i)=>(
                    <div key={i} className="flex items-center justify-between text-[11px] bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded px-2 py-1">
                      <span className="truncate" title={f.name}>{f.name}</span>
                      <div className="flex items-center gap-1">
                        {(f.type.startsWith('image/') || f.type === 'application/pdf' || f.type.includes('word') || f.name.toLowerCase().endsWith('.doc') || f.name.toLowerCase().endsWith('.docx')) && (
                          <button
                            onClick={()=> setPreviewAttachment({ name: f.name, type: f.type, data: f.data })}
                            className="px-1.5 py-0.5 rounded bg-purple-600 text-white hover:bg-purple-700"
                          >عرض</button>
                        )}
                        <button
                          onClick={()=>{
                            const a = document.createElement('a');
                            a.href = f.data; a.download = f.name; document.body.appendChild(a); a.click(); document.body.removeChild(a);
                          }}
                          className="px-1.5 py-0.5 rounded bg-blue-600 text-white hover:bg-blue-700"
                        >تنزيل</button>
                      </div>
                    </div>
                  ))}
                  {!(selected.attachments||[]).length && <div className="text-gray-400 text-xs">لا مرفقات</div>}
                </div>
              </div>

              {/* قسم الردود والتعليقات */}
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-sm">الردود والتعليقات ({(selected.replies || []).length})</h4>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowReplyForm(showReplyForm === selected.id ? null : selected.id)}
                      className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 text-xs"
                    >
                      {showReplyForm === selected.id ? 'إلغاء' : 'رد/تعليق'}
                    </button>
                  </div>
                </div>

                {/* عرض الردود الموجودة */}
                <div className="space-y-3 mb-4">
                  {(selected.replies || []).map((reply) => (
                    <div key={reply.id} className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-medium">{reply.replyBy}</span>
                          <span className="text-gray-500">({reply.department})</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                            reply.type === 'reply' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' :
                            reply.type === 'comment' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' :
                            'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300'
                          }`}>
                            {reply.type === 'reply' ? 'رد' : reply.type === 'comment' ? 'تعليق' : 'رأي'}
                          </span>
                        </div>
                        <span className="text-xs text-gray-400">
                          {new Date(reply.createdAt).toLocaleString('ar-SY-u-nu-latn')}
                        </span>
                      </div>
                      
                      <div className="text-sm mb-2 whitespace-pre-wrap">{reply.content}</div>
                      
                      {/* مرفقات الرد */}
                      {reply.attachments && reply.attachments.length > 0 && (
                        <div className="mt-2">
                          <div className="text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">المرفقات:</div>
                          <div className="flex flex-wrap gap-1">
                            {reply.attachments.map((attachment, idx) => (
                              <div key={idx} className="flex items-center gap-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded px-2 py-1">
                                <span className="text-xs truncate max-w-[120px]" title={attachment.name}>
                                  {attachment.name}
                                </span>
                                <button
                                  onClick={() => {
                                    const a = document.createElement('a');
                                    a.href = attachment.data;
                                    a.download = attachment.name;
                                    document.body.appendChild(a);
                                    a.click();
                                    document.body.removeChild(a);
                                  }}
                                  className="text-xs px-1 py-0.5 rounded bg-blue-500 text-white hover:bg-blue-600"
                                >
                                  تنزيل
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {(selected.replies || []).length === 0 && (
                    <div className="text-xs text-gray-400 text-center py-4">لا توجد ردود أو تعليقات بعد</div>
                  )}
                </div>

                {/* نموذج الرد */}
                {showReplyForm === selected.id && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
                    <h5 className="font-medium text-sm mb-3">إضافة رد أو تعليق</h5>
                    
                    {/* نوع الرد */}
                    <div className="mb-3">
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        نوع المشاركة:
                      </label>
                      <div className="flex gap-4 text-xs">
                        <label className="flex items-center gap-1">
                          <input
                            type="radio"
                            value="reply"
                            checked={replyType === 'reply'}
                            onChange={(e) => setReplyType(e.target.value as 'reply')}
                          />
                          <span>رد رسمي</span>
                        </label>
                        <label className="flex items-center gap-1">
                          <input
                            type="radio"
                            value="comment"
                            checked={replyType === 'comment'}
                            onChange={(e) => setReplyType(e.target.value as 'comment')}
                          />
                          <span>تعليق</span>
                        </label>
                        <label className="flex items-center gap-1">
                          <input
                            type="radio"
                            value="opinion"
                            checked={replyType === 'opinion'}
                            onChange={(e) => setReplyType(e.target.value as 'opinion')}
                          />
                          <span>إبداء رأي</span>
                        </label>
                      </div>
                    </div>

                    {/* محتوى الرد */}
                    <div className="mb-3">
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        المحتوى: *
                      </label>
                      <textarea
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        placeholder={replyType === 'reply' ? 'اكتب ردك الرسمي هنا...' : 
                                   replyType === 'comment' ? 'اكتب تعليقك هنا...' : 
                                   'اكتب رأيك هنا...'}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg resize-none text-sm bg-white dark:bg-gray-800"
                        rows={3}
                        style={{ direction: 'rtl' }}
                      />
                    </div>

                    {/* رفع المرفقات */}
                    <div className="mb-3">
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        إرفاق ملفات (اختياري):
                      </label>
                      <input
                        type="file"
                        multiple
                        onChange={handleFileUpload}
                        className="w-full text-xs border border-gray-300 dark:border-gray-600 rounded-lg p-2 bg-white dark:bg-gray-800"
                        accept="image/*,.pdf,.doc,.docx,.txt,.xlsx,.xls"
                      />
                    </div>

                    {/* المرفقات المحددة */}
                    {replyAttachments.length > 0 && (
                      <div className="mb-3">
                        <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                          الملفات المحددة ({replyAttachments.length}):
                        </div>
                        <div className="space-y-1">
                          {replyAttachments.map((file, index) => (
                            <div key={index} className="flex items-center justify-between bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded px-2 py-1">
                              <span className="text-xs truncate flex-1" title={file.name}>
                                {file.name} ({Math.round(file.size / 1024)} كيلوبايت)
                              </span>
                              <button
                                onClick={() => removeAttachment(index)}
                                className="text-xs px-2 py-0.5 rounded bg-red-500 text-white hover:bg-red-600 mr-2"
                              >
                                حذف
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* أزرار التحكم */}
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setShowReplyForm(null)}
                        className="px-3 py-1 rounded bg-gray-500 text-white hover:bg-gray-600 text-xs"
                      >
                        إلغاء
                      </button>
                      <button
                        onClick={() => handleReply(selected.id)}
                        disabled={!replyContent.trim()}
                        className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-xs"
                      >
                        {replyType === 'reply' ? 'إرسال الرد' : replyType === 'comment' ? 'إرسال التعليق' : 'إرسال الرأي'}
                      </button>
                    </div>
                  </div>
                )}

                {/* عرض الردود السابقة */}
                <div className="mt-4">
                  <h4 className="font-semibold text-sm mb-2 text-gray-800 dark:text-gray-200">
                    الردود والتعليقات ({getMessageReplies(selected.id).length})
                  </h4>
                  
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {getMessageReplies(selected.id).length === 0 ? (
                      <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        لا توجد ردود أو تعليقات على هذه الرسالة
                      </p>
                    ) : (
                      getMessageReplies(selected.id).map((reply) => (
                        <div key={reply.id} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border-r-3 border-blue-400">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-xs text-blue-700 dark:text-blue-300">
                                {reply.replyBy}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                ({reply.department})
                              </span>
                              <span className={`
                                px-2 py-0.5 rounded-full text-xs font-medium
                                ${reply.type === 'reply' ? 'bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-300' :
                                  reply.type === 'comment' ? 'bg-green-100 text-green-700 dark:bg-green-800 dark:text-green-300' :
                                  'bg-purple-100 text-purple-700 dark:bg-purple-800 dark:text-purple-300'}
                              `}>
                                {reply.type === 'reply' ? 'رد' : reply.type === 'comment' ? 'تعليق' : 'رأي'}
                              </span>
                            </div>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {new Date(reply.createdAt).toLocaleDateString('ar-SY-u-nu-latn')}
                            </span>
                          </div>
                          
                          <p className="text-xs text-gray-700 dark:text-gray-300 mb-2 whitespace-pre-wrap">
                            {reply.content}
                          </p>
                          
                          {reply.attachments && reply.attachments.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                                المرفقات ({reply.attachments.length}):
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {reply.attachments.map((att, idx) => (
                                  <a
                                    key={idx}
                                    href={att.data}
                                    download={att.name}
                                    className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 rounded text-xs hover:bg-blue-200 dark:hover:bg-blue-700 transition-colors"
                                  >
                                    <span>📎</span>
                                    <span>{att.name}</span>
                                    <span className="text-gray-500">({(att.size / 1024).toFixed(1)} KB)</span>
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-dashed border-gray-300 dark:border-gray-600 text-[11px] text-gray-500 dark:text-gray-400">المصدر: {selected.source || '—'}</div>
            </div>
          ) : (
            <div className="text-sm text-gray-500 dark:text-gray-400">اختر رسالة من القائمة لعرض التفاصيل.</div>
          )}
        </div>
      </div>
      {previewAttachment && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={(e)=> { if (e.target === e.currentTarget) setPreviewAttachment(null); }}
        >
          <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-full max-h-full w-[min(900px,95vw)] h-[min(90vh,800px)] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700 text-sm">
              <span className="font-medium truncate max-w-[70%]" title={previewAttachment.name}>{previewAttachment.name}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={()=> setPreviewAttachment(null)}
                  className="px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-xs"
                >إغلاق (Esc)</button>
                <button
                  onClick={()=>{
                    const a = document.createElement('a');
                    a.href = previewAttachment.data; a.download = previewAttachment.name; document.body.appendChild(a); a.click(); document.body.removeChild(a);
                  }}
                  className="px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 text-xs"
                >تنزيل</button>
              </div>
            </div>
            <div className="flex-1 bg-gray-100 dark:bg-gray-900 overflow-auto flex items-center justify-center p-2">
              {previewAttachment.type.startsWith('image/') && (
                <img
                  src={previewAttachment.data}
                  alt={previewAttachment.name}
                  className="max-w-full max-h-full object-contain rounded"
                  loading="lazy"
                />
              )}
              {previewAttachment.type === 'application/pdf' && (
                <iframe
                  title={previewAttachment.name}
                  src={previewAttachment.data}
                  className="w-full h-full rounded bg-white"
                />
              )}
              {(previewAttachment.type.includes('word') || previewAttachment.name.toLowerCase().endsWith('.doc') || previewAttachment.name.toLowerCase().endsWith('.docx')) && (
                <div className="text-center text-sm text-gray-700 dark:text-gray-300 px-4 leading-relaxed">
                  لا يمكن عرض مستندات Word مباشرة داخل المتصفح هنا.<br/>
                  يرجى تنزيل الملف لفتحه: <span className="font-mono text-xs">{previewAttachment.name}</span>
                </div>
              )}
              {!previewAttachment.type.startsWith('image/') && previewAttachment.type !== 'application/pdf' && !previewAttachment.type.includes('word') && !previewAttachment.name.toLowerCase().endsWith('.doc') && !previewAttachment.name.toLowerCase().endsWith('.docx') && (
                <div className="text-center text-sm text-gray-600 dark:text-gray-400">نوع ملف غير مدعوم للمعاينة المباشرة.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default InternalMessagesPage;
