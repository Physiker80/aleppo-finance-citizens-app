import React, { useContext, useEffect, useMemo, useState } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { AppContext } from '../App';
import { ContactMessage, ContactMessageStatus, ContactMessageReply, ContactReplyAttachment, Department, RequestStatus, Ticket } from '../types';
import { useDepartmentNames } from '../utils/departments';
import QRCode from 'react-qr-code';

// Minimal unified diwan page: lists contact messages and tickets with basic filters and reply/transfer for messages.

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    'جديد': 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
    'قيد المعالجة': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
    'تم الرد': 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
    'مغلق': 'bg-gray-100 text-gray-800 dark:bg-gray-700/50 dark:text-gray-300',
  };
  const cls = map[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-700/50 dark:text-gray-300';
  return <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${cls}`}>{status}</span>;
};

const InquiryComplaintsDiwanPage: React.FC = () => {
  const app = useContext(AppContext);
  const departmentNames = useDepartmentNames();
  const current = app?.currentEmployee;
  const isAdmin = current?.role === 'مدير';
  const myDept = current?.department;

  // Data
  const messages = app?.contactMessages || [];
  const tickets = app?.tickets || [];
  const addNotification = app?.addNotification;
  const documentMsg = app?.documentContactMessage;
  const documentT = app?.documentTicket;
  const setMsgSource = app?.updateContactMessageSource;
  const setTicketSource = app?.updateTicketSource;

  // Filters
  const [typeFilter, setTypeFilter] = useState<'all'|'messages'|'tickets'>('all');
  const [deptFilter, setDeptFilter] = useState<string>('ALL');
  const [sourceFilter, setSourceFilter] = useState<'ALL'|'مواطن'|'موظف'>('ALL');
  const [docFilter, setDocFilter] = useState<'ALL'|'موثق'|'غير موثق'>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState<number>(() => {
    try {
      const s = localStorage.getItem('diwanPageSize');
      const n = s ? parseInt(s, 10) : 10;
      return Number.isFinite(n) && n > 0 ? n : 10;
    } catch { return 10; }
  });
  const [messagesPage, setMessagesPage] = useState<number>(1);
  const [ticketsPage, setTicketsPage] = useState<number>(1);

  // Reset pagination when filters change
  useEffect(() => {
    setMessagesPage(1);
    setTicketsPage(1);
  }, [typeFilter, deptFilter, statusFilter, search, sourceFilter, docFilter]);

  // Persist page size and reset pages on change
  useEffect(() => {
    try { localStorage.setItem('diwanPageSize', String(pageSize)); } catch {}
    setMessagesPage(1);
    setTicketsPage(1);
  }, [pageSize]);

  const visibleMessages = useMemo(() => {
    const base = (messages || []).filter(m => {
      if (!isAdmin) {
        if (!myDept) return false;
        const owns = (!!m.department && m.department === myDept) || (m.forwardedTo || []).includes(myDept);
        if (!owns) return false;
      }
      if (deptFilter !== 'ALL' && (m.department || '') !== deptFilter) return false;
      if (sourceFilter !== 'ALL' && (m.source || 'مواطن') !== sourceFilter) return false;
      if (docFilter !== 'ALL') {
        const documented = !!(m.diwanNumber && m.diwanDate);
        if (docFilter === 'موثق' && !documented) return false;
        if (docFilter === 'غير موثق' && documented) return false;
      }
      if (statusFilter !== 'ALL' && m.status !== (statusFilter as ContactMessageStatus)) return false;
      if (search.trim()) {
        const q = search.trim();
        const hay = [m.id, m.name, m.email||'', m.subject||'', m.message];
        if (!hay.some(h => h && h.includes(q))) return false;
      }
      return true;
    });
    return base;
  }, [messages, isAdmin, myDept, deptFilter, statusFilter, search, sourceFilter, docFilter]);

  const messagesPagesCount = useMemo(() => Math.max(1, Math.ceil(visibleMessages.length / pageSize)), [visibleMessages.length, pageSize]);
  const paginatedMessages = useMemo(() => {
    const start = (messagesPage - 1) * pageSize;
    return visibleMessages.slice(start, start + pageSize);
  }, [visibleMessages, messagesPage, pageSize]);

  const visibleTickets = useMemo(() => {
    const base = (tickets || []).filter(t => {
      if (!isAdmin) {
        if (!myDept) return false;
        const owns = String(t.department) === myDept || (t.forwardedTo||[]).includes(myDept);
        if (!owns) return false;
      }
      if (deptFilter !== 'ALL' && String(t.department) !== deptFilter) return false;
      if (statusFilter !== 'ALL' && t.status !== (statusFilter as RequestStatus)) return false;
      if (sourceFilter !== 'ALL' && (t.source || 'مواطن') !== sourceFilter) return false;
      if (docFilter !== 'ALL') {
        const documented = !!(t.diwanNumber && t.diwanDate);
        if (docFilter === 'موثق' && !documented) return false;
        if (docFilter === 'غير موثق' && documented) return false;
      }
      if (search.trim()) {
        const q = search.trim();
        const hay = [t.id, t.fullName, t.phone, t.email, t.nationalId, t.details];
        if (!hay.some(h => h && h.includes(q))) return false;
      }
      return true;
    });
    return base;
  }, [tickets, isAdmin, myDept, deptFilter, statusFilter, search, sourceFilter, docFilter]);

  const ticketsPagesCount = useMemo(() => Math.max(1, Math.ceil(visibleTickets.length / pageSize)), [visibleTickets.length, pageSize]);
  const paginatedTickets = useMemo(() => {
    const start = (ticketsPage - 1) * pageSize;
    return visibleTickets.slice(start, start + pageSize);
  }, [visibleTickets, ticketsPage, pageSize]);

  // Reply/Transfer for contact messages
  const addReply = app?.addContactMessageReply;
  const updateMsgDept = app?.updateContactMessageDepartment;
  const updateMsgStatus = app?.updateContactMessageStatus;
  const updateMsgForwardedTo = app?.updateContactMessageForwardedTo;
  const updateMsgForwardedPriorities = app?.updateContactMessageForwardedPriorities;
  const [replyCounts, setReplyCounts] = useState<Record<string, number>>({});
  const [replyFor, setReplyFor] = useState<string| null>(null);
  const [replyType, setReplyType] = useState<'reply'|'comment'|'transfer'>('reply');
  const [replyText, setReplyText] = useState<string>('');
  const [replyFiles, setReplyFiles] = useState<File[]>([]);
  const [transferDept, setTransferDept] = useState<string>('');
  const [transferDepts, setTransferDepts] = useState<string[]>([]);
  const [transferPriorities, setTransferPriorities] = useState<Record<string, number>>({});
  const [notifyOnTransfer, setNotifyOnTransfer] = useState(true);
  const [openHistoryFor, setOpenHistoryFor] = useState<string | null>(null);
  const [priorityEditFor, setPriorityEditFor] = useState<string | null>(null);
  const [priorityEditValues, setPriorityEditValues] = useState<Record<string, number>>({});

  // Validation helpers for transfer priorities
  const transferSelectedDeps = useMemo(() => Array.from(new Set([transferDept, ...transferDepts].filter(Boolean))), [transferDept, transferDepts]);
  const transferDuplicateValues = useMemo(() => {
    const freq = new Map<number, number>();
    transferSelectedDeps.forEach(dep => {
      const v = transferPriorities[dep] ?? 1;
      freq.set(v, (freq.get(v) || 0) + 1);
    });
    const dups = new Set<number>();
    freq.forEach((count, val) => { if (count > 1) dups.add(val); });
    return dups;
  }, [transferSelectedDeps, transferPriorities]);
  const transferNonPositiveDeps = useMemo(() => new Set(transferSelectedDeps.filter(dep => (transferPriorities[dep] ?? 1) <= 0)), [transferSelectedDeps, transferPriorities]);
  const transferHasErrors = (transferSelectedDeps.length > 0) && (transferDuplicateValues.size > 0 || transferNonPositiveDeps.size > 0);

  // Load reply counts from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem('contactMessageReplies');
      const all = raw ? JSON.parse(raw) as Array<{messageId:string}> : [];
      const counts: Record<string, number> = {};
      all.forEach(r => { counts[r.messageId] = (counts[r.messageId]||0)+1; });
      setReplyCounts(counts);
    } catch {
      setReplyCounts({});
    }
  }, [messages]);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setReplyFiles(prev => [...prev, ...files]);
  };
  const removeFile = (i: number) => setReplyFiles(prev => prev.filter((_,idx)=> idx!==i));

  // Maintain priorities when department selections change during transfer
  useEffect(() => {
    const selected = Array.from(new Set([transferDept, ...transferDepts].filter(Boolean)));
    if (selected.length === 0) { setTransferPriorities({}); return; }
    setTransferPriorities(prev => {
      const next: Record<string, number> = { ...prev };
      selected.forEach((dep, idx) => { if (next[dep] == null) next[dep] = idx + 1; });
      Object.keys(next).forEach(dep => { if (!selected.includes(dep)) delete next[dep]; });
      return { ...next };
    });
  }, [transferDept, transferDepts]);

  // Reset transfer controls when switching the reply context
  useEffect(() => {
    setTransferDept('');
    setTransferDepts([]);
    setTransferPriorities({});
  }, [replyFor]);

  const submitReply = async (messageId: string) => {
    if (!current) return;
    if (replyType !== 'transfer' && !replyText.trim()) { alert('اكتب الرد'); return; }
  if (replyType === 'transfer' && transferDepts.length === 0 && !transferDept) { alert('اختر القسم/الأقسام المحول إليها'); return; }

    // Convert attachments to base64
    const attachments: ContactReplyAttachment[] = [];
    for (const f of replyFiles) {
      const content = await new Promise<string>((resolve) => {
        const fr = new FileReader();
        fr.onload = () => resolve(fr.result as string);
        fr.readAsDataURL(f);
      });
      attachments.push({ name: f.name, size: f.size, type: f.type, data: content });
    }

    const base: Omit<ContactMessageReply, 'id'|'timestamp'|'isRead'> = {
      messageId,
      authorName: current.name || current.username,
      authorDepartment: myDept || 'غير محدد',
      type: replyType,
  content: replyType === 'transfer' ? (replyText ? replyText : `تم تحويل الرسالة إلى ${(transferDepts.length ? transferDepts.join(', ') : transferDept)}`) : replyText,
  transferTo: replyType === 'transfer' ? (transferDepts.length ? transferDepts.join(', ') : transferDept) : undefined,
      attachments,
    };
    const saved = addReply ? addReply(base) : null;

    if (replyType === 'transfer') {
      const targets = transferDepts.length ? transferDepts : (transferDept ? [transferDept] : []);
      if (targets.length && updateMsgForwardedTo) {
        updateMsgForwardedTo(messageId, targets);
      }
      if (targets.length && updateMsgDept) {
        updateMsgDept(messageId, targets[0]); // set primary department
      }
      if (targets.length && updateMsgForwardedPriorities) {
        const pr: Record<string, number> = {};
        targets.forEach(dep => { pr[dep] = transferPriorities[dep] ?? 1; });
        updateMsgForwardedPriorities(messageId, pr);
      }
      if (notifyOnTransfer && addNotification) {
        targets.forEach(dep => addNotification({
          kind: 'ticket-forwarded' as any,
          ticketId: messageId,
          department: dep,
          message: `تم إحالة رسالة (${messageId}) إلى قسم ${dep}`,
        }));
      }
    }

    // Optional: move status to InProgress when replying
    if (updateMsgStatus) updateMsgStatus(messageId, ContactMessageStatus.InProgress);

    // reset
    setReplyFor(null);
    setReplyType('reply');
    setReplyText('');
    setReplyFiles([]);
  setTransferDept('');
  setTransferDepts([]);
    setTransferPriorities({});
    try {
      const raw = localStorage.getItem('contactMessageReplies');
      const all = raw ? JSON.parse(raw) as Array<{messageId:string}> : [];
      const counts: Record<string, number> = {};
      all.forEach(r => { counts[r.messageId] = (counts[r.messageId]||0)+1; });
      setReplyCounts(counts);
    } catch {}
    alert('تم إرسال الرد');
  };

  return (
    <div className="container mx-auto">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">إدارة الاستعلامات والشكاوى - الديوان الموحد</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">صندوق وارد موحد لرسائل التواصل والطلبات مع فلاتر وعمليات سريعة.</p>
        </div>
        <div className="flex items-center gap-2">
          <a href="#/dashboard" className="px-3 py-2 rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600">العودة للوحة التحكم</a>
        </div>
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <select value={typeFilter} onChange={e=> setTypeFilter(e.target.value as any)} className="px-2 py-1 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900">
            <option value="all">الكل</option>
            <option value="messages">رسائل التواصل</option>
            <option value="tickets">الطلبات</option>
          </select>
          <select value={deptFilter} onChange={e=> setDeptFilter(e.target.value)} className="px-2 py-1 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900">
            <option value="ALL">كل الأقسام</option>
            {departmentNames.map(d=> <option key={d} value={d}>{d}</option>)}
          </select>
          <select value={statusFilter} onChange={e=> setStatusFilter(e.target.value)} className="px-2 py-1 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900">
            <option value="ALL">كل الحالات</option>
            <option value="جديد">جديد</option>
            <option value="قيد المعالجة">قيد المعالجة</option>
            <option value="تم الرد">تم الرد</option>
            <option value="مغلق">مغلق</option>
          </select>
          <select value={sourceFilter} onChange={e=> setSourceFilter(e.target.value as any)} className="px-2 py-1 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900">
            <option value="ALL">كل المصادر</option>
            <option value="مواطن">مواطن</option>
            <option value="موظف">موظف</option>
          </select>
          <select value={docFilter} onChange={e=> setDocFilter(e.target.value as any)} className="px-2 py-1 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900">
            <option value="ALL">كل التوثيق</option>
            <option value="موثق">موثق</option>
            <option value="غير موثق">غير موثق</option>
          </select>
          <input value={search} onChange={e=> setSearch(e.target.value)} placeholder="بحث..." className="px-2 py-1 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900" />
          <label className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400" title="عدد العناصر لكل صفحة">
            <span>حجم الصفحة:</span>
            <select value={pageSize} onChange={e=> setPageSize(Math.max(1, parseInt(e.target.value, 10) || 10))} className="px-2 py-1 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900">
              {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
        </div>
      </Card>

      {(typeFilter === 'all' || typeFilter === 'messages') && (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-semibold">رسائل التواصل ({visibleMessages.length})</h2>
          </div>
          {visibleMessages.length === 0 ? (
            <div className="text-gray-500">لا توجد رسائل</div>
          ) : (
            <div className="space-y-3">
              {paginatedMessages.map(m => (
                <div key={m.id} className="p-3 border rounded bg-white dark:bg-gray-800 dark:border-gray-700">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">{m.id}</span>
                        {statusBadge(m.status)}
                        {m.department && <span className="text-xs bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-300 px-2 py-0.5 rounded">{m.department}</span>}
                        <span className="text-xs bg-purple-100 dark:bg-purple-800 text-purple-700 dark:text-purple-200 px-2 py-0.5 rounded" title="المصدر">{m.source || 'مواطن'}</span>
                        <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-2 py-0.5 rounded" title="عدد الردود">💬 {replyCounts[m.id] || 0}</span>
                        {!!(m.forwardedTo && m.forwardedTo.length) && (() => {
                          const fwd = m.forwardedTo || [];
                          const pr = m.forwardedPriorities || {};
                          const sorted = [...fwd].sort((a,b) => (pr[a] ?? 999) - (pr[b] ?? 999));
                          const label = sorted.map(dep => pr[dep] != null ? `${dep} (أولوية ${pr[dep]})` : dep).join('، ');
                          return (
                            <span className="text-xs bg-cyan-100 dark:bg-cyan-800 text-cyan-700 dark:text-cyan-200 px-2 py-0.5 rounded" title="أُحيل إلى">أُحيل إلى: {label}</span>
                          );
                        })()}
                        {!!(m.forwardedTo && m.forwardedTo.length) && (
                          <button
                            className="text-xs px-2 py-0.5 rounded bg-cyan-700 text-white"
                            onClick={() => {
                              if (priorityEditFor === m.id) { setPriorityEditFor(null); setPriorityEditValues({}); return; }
                              const pr = m.forwardedPriorities || {};
                              const initial: Record<string, number> = {};
                              (m.forwardedTo || []).forEach((dep, idx) => { initial[dep] = pr[dep] ?? (idx + 1); });
                              setPriorityEditValues(initial);
                              setPriorityEditFor(m.id);
                            }}
                            title="تعديل أولويات الأقسام"
                          >أولوية الأقسام</button>
                        )}
                        {m.diwanNumber && m.diwanDate ? (
                          <span className="text-xs bg-amber-100 dark:bg-amber-800 text-amber-700 dark:text-amber-200 px-2 py-0.5 rounded" title="موثق">رقم ديوان: {m.diwanNumber}</span>
                        ) : (
                          <button className="text-xs px-2 py-0.5 rounded bg-amber-600 text-white" onClick={()=> documentMsg && documentMsg(m.id)}>توثيق</button>
                        )}
                      </div>
                      <div className="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100">{m.name} {m.email ? `• ${m.email}` : ''}</div>
                      {m.subject && <div className="text-sm text-gray-700 dark:text-gray-300">📧 {m.subject}</div>}
                      <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{m.message}</div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <select
                        value={m.status}
                        onChange={e=> updateMsgStatus && updateMsgStatus(m.id, e.target.value as ContactMessageStatus)}
                        className="text-xs px-2 py-1 border rounded bg-white dark:bg-gray-900"
                        disabled={!isAdmin && m.department !== myDept}
                      >
                        {Object.values(ContactMessageStatus).map(s=> <option key={s} value={s}>{s}</option>)}
                      </select>
                      <select
                        value={m.source || 'مواطن'}
                        onChange={e=> setMsgSource && setMsgSource(m.id, e.target.value as any)}
                        className="text-xs px-2 py-1 border rounded bg-white dark:bg-gray-900"
                      >
                        <option value="مواطن">مواطن</option>
                        <option value="موظف">موظف</option>
                      </select>
                      <button onClick={()=> setReplyFor(replyFor === m.id ? null : m.id)} className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm">رد/تعليق/تحويل</button>
                    </div>
                  </div>

                  {m.diwanNumber && (
                    <div className="mt-3 flex items-center gap-3">
                      <div className="p-2 bg-white rounded border dark:bg-gray-900">
                        <QRCode value={`${m.diwanNumber}|${m.diwanDate}`} size={72} />
                      </div>
                      <div className="text-xs text-gray-700 dark:text-gray-300">
                        <div>رقم وتاريخ الديوان</div>
                        <div className="font-mono">{m.diwanNumber}</div>
                        <div className="font-mono">{m.diwanDate ? new Date(m.diwanDate).toLocaleString('ar-SY-u-nu-latn') : ''}</div>
                      </div>
                    </div>
                  )}

                  {/* Inline priority editor for forwarded departments */}
                  {priorityEditFor === m.id && (() => {
                    const deps = (m.forwardedTo || []);
                    const freq = new Map<number, number>();
                    deps.forEach(dep => { const v = priorityEditValues[dep] ?? 1; freq.set(v, (freq.get(v)||0)+1); });
                    const dupVals = new Set<number>();
                    freq.forEach((c, v) => { if (c > 1) dupVals.add(v); });
                    const badDeps = new Set(deps.filter(dep => (priorityEditValues[dep] ?? 1) <= 0));
                    const hasErrors = deps.length > 0 && (dupVals.size > 0 || badDeps.size > 0);
                    return (
                    <div className="mt-2 p-2 border rounded bg-white dark:bg-gray-900 dark:border-gray-700">
                      <div className="text-sm mb-2" title="١ = أعلى أولوية">تحديد أولوية المعالجة لكل قسم (١ أعلى أولوية)</div>
                      <div className="flex flex-col gap-2">
                        {deps.map(dep => {
                          const val = priorityEditValues[dep] ?? 1;
                          const isDup = dupVals.has(val);
                          const isBad = val <= 0;
                          return (
                          <label key={dep} className={`flex items-center gap-2 text-sm ${isDup || isBad ? 'bg-red-50 dark:bg-red-900/30' : ''} px-2 py-1 rounded`}>
                            <span className="min-w-[10rem] inline-block">{dep}</span>
                            <input
                              type="number"
                              min={1}
                              className={`w-20 px-2 py-1 border rounded bg-white dark:bg-gray-900 ${isDup || isBad ? 'border-red-500' : ''}`}
                              value={val}
                              onChange={e => setPriorityEditValues(prev => ({ ...prev, [dep]: Math.max(1, parseInt(e.target.value || '1', 10) || 1) }))}
                            />
                          </label>
                          );
                        })}
                      </div>
                      {hasErrors && (
                        <div className="mt-2 text-xs text-red-600">تحذير: يجب أن تكون الأولوية رقمًا موجبًا ولا يجوز تكرار نفس الرقم بين الأقسام. ١ = أعلى أولوية.</div>
                      )}
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          className="px-3 py-1.5 rounded bg-green-600 text-white disabled:opacity-50"
                          disabled={hasErrors}
                          onClick={() => {
                            if (updateMsgForwardedPriorities) updateMsgForwardedPriorities(m.id, priorityEditValues);
                            setPriorityEditFor(null);
                            setPriorityEditValues({});
                          }}
                        >حفظ الأولويات</button>
                        <button className="px-3 py-1.5 rounded bg-gray-300 dark:bg-gray-700" onClick={() => { setPriorityEditFor(null); setPriorityEditValues({}); }}>إلغاء</button>
                      </div>
                    </div>
                    );
                  })()}

                  {/* Replies history panel */}
                  <div className="mt-2">
                    <button
                      className="text-sm text-blue-600"
                      onClick={() => setOpenHistoryFor(openHistoryFor === m.id ? null : m.id)}
                    >{openHistoryFor === m.id ? 'إخفاء الردود' : 'عرض الردود'}</button>
                    {openHistoryFor === m.id && (
                      <RepliesHistory messageId={m.id} />
                    )}
                  </div>

                  {replyFor === m.id && (
                    <div className="mt-3 p-3 rounded bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
                      <div className="flex flex-wrap gap-2 items-center mb-2">
                        <select value={replyType} onChange={e=> setReplyType(e.target.value as any)} className="px-2 py-1 rounded border bg-white dark:bg-gray-900">
                          <option value="reply">رد</option>
                          <option value="comment">تعليق</option>
                          <option value="transfer">تحويل</option>
                        </select>
                        {replyType === 'transfer' && (
                          <>
                            <select value={transferDept} onChange={e=> setTransferDept(e.target.value)} className="px-2 py-1 rounded border bg-white dark:bg-gray-900">
                              <option value="">اختر القسم الرئيسي</option>
                              {departmentNames.map(d=> <option key={d} value={d}>{d}</option>)}
                            </select>
                            <select multiple value={transferDepts} onChange={e=> setTransferDepts(Array.from(e.currentTarget.selectedOptions).map(o=> (o as HTMLOptionElement).value))} className="px-2 py-1 rounded border bg-white dark:bg-gray-900 min-w-[12rem]" title="اختر أقسام إضافية">
                              {departmentNames.map(d=> <option key={d} value={d}>{d}</option>)}
                            </select>
                            {([transferDept, ...transferDepts].filter(Boolean).length > 0) && (
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs text-gray-600 dark:text-gray-400" title="١ = أعلى أولوية">(١ = أعلى أولوية)</span>
                                {Array.from(new Set([transferDept, ...transferDepts].filter(Boolean))).map((dep, idx) => {
                                  const val = transferPriorities[dep] ?? (idx + 1);
                                  const isDup = transferDuplicateValues.has(val);
                                  const isBad = val <= 0;
                                  return (
                                  <label key={dep} className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${isDup || isBad ? 'bg-red-50 dark:bg-red-900/30' : 'bg-cyan-50 dark:bg-cyan-900/40'}`} title="١ = أعلى أولوية">
                                    <span>{dep}</span>
                                    <input
                                      type="number"
                                      min={1}
                                      className={`w-16 px-1 py-0.5 border rounded bg-white dark:bg-gray-900 ${isDup || isBad ? 'border-red-500' : ''}`}
                                      value={val}
                                      onChange={e => setTransferPriorities(prev => ({ ...prev, [dep]: Math.max(1, parseInt(e.target.value || '1', 10) || 1) }))}
                                    />
                                  </label>
                                  );
                                })}
                              </div>
                            )}
                          </>
                        )}
                        <input type="file" multiple onChange={handleFiles} className="text-sm" />
                        {replyType === 'transfer' && (
                          <label className="flex items-center gap-2 text-xs ml-2">
                            <input type="checkbox" checked={notifyOnTransfer} onChange={e=> setNotifyOnTransfer(e.target.checked)} />
                            <span>إشعار القسم المحول إليه</span>
                          </label>
                        )}
                      </div>
                      <textarea value={replyText} onChange={e=> setReplyText(e.target.value)} className="w-full h-24 p-2 rounded border bg-white dark:bg-gray-900" placeholder="اكتب الرد أو الملاحظات"></textarea>
                      {replyFiles.length>0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {replyFiles.map((f,i)=> (
                            <div key={i} className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">
                              {f.name}
                              <button className="ml-2 text-red-600" onClick={()=> removeFile(i)}>حذف</button>
                            </div>
                          ))}
                        </div>
                      )}
                      {replyType === 'transfer' && transferHasErrors && (
                        <div className="mt-2 text-xs text-red-600">تحذير: يجب أن تكون الأولوية رقمًا موجبًا ولا يجوز تكرار نفس الرقم بين الأقسام. ١ = أعلى أولوية.</div>
                      )}
                      <div className="mt-2 flex items-center gap-2">
                        <button onClick={()=> submitReply(m.id)} disabled={replyType === 'transfer' && transferHasErrors} className="px-3 py-1.5 rounded bg-green-600 text-white disabled:opacity-50">إرسال</button>
                        <button onClick={()=> { setReplyFor(null); setReplyText(''); setReplyFiles([]); setTransferDept(''); setReplyType('reply'); }} className="px-3 py-1.5 rounded bg-gray-300 dark:bg-gray-700">إلغاء</button>
                        {m.email && (
                          <a
                            className="px-3 py-1.5 rounded bg-indigo-600 text-white"
                            href={`mailto:${encodeURIComponent(m.email)}?subject=${encodeURIComponent(m.subject || 'رد على رسالتكم')}&body=${encodeURIComponent(replyText)}`}
                            target="_blank"
                            rel="noreferrer"
                          >إرسال عبر البريد</a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <div className="flex items-center justify-between pt-2">
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  عرض {Math.min(visibleMessages.length, (messagesPage - 1) * pageSize + 1)}–{Math.min(visibleMessages.length, messagesPage * pageSize)} من {visibleMessages.length}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="px-2 py-1 rounded border bg-white dark:bg-gray-900 disabled:opacity-50"
                    onClick={() => setMessagesPage(p => Math.max(1, p - 1))}
                    disabled={messagesPage <= 1}
                  >السابق</button>
                  <span className="text-xs">الصفحة {messagesPage} من {messagesPagesCount}</span>
                  <button
                    className="px-2 py-1 rounded border bg-white dark:bg-gray-900 disabled:opacity-50"
                    onClick={() => setMessagesPage(p => Math.min(messagesPagesCount, p + 1))}
                    disabled={messagesPage >= messagesPagesCount}
                  >التالي</button>
                </div>
              </div>
            </div>
          )}
        </Card>
      )}

      {(typeFilter === 'all' || typeFilter === 'tickets') && (
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-semibold">الطلبات ({visibleTickets.length})</h2>
            <a href="#/requests" className="text-sm text-blue-600">فتح صفحة الطلبات</a>
          </div>
          {visibleTickets.length === 0 ? (
            <div className="text-gray-500">لا توجد طلبات</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-right bg-gray-50 dark:bg-gray-900">
                    <th className="p-2">الرقم</th>
                    <th className="p-2">الاسم</th>
                    <th className="p-2">القسم</th>
                    <th className="p-2">المصدر</th>
                    <th className="p-2">الحالة</th>
                    <th className="p-2">التفاصيل</th>
                    <th className="p-2">عمليات</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTickets.map(t=> (
                    <tr key={t.id} className="border-b dark:border-gray-700">
                      <td className="p-2 font-mono">{t.id}</td>
                      <td className="p-2">{t.fullName}</td>
                      <td className="p-2">{t.department}</td>
                      <td className="p-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs bg-purple-100 dark:bg-purple-800 text-purple-700 dark:text-purple-200 px-2 py-0.5 rounded">{t.source || 'مواطن'}</span>
                          <select
                            value={t.source || 'مواطن'}
                            onChange={e=> setTicketSource && setTicketSource(t.id, e.target.value as any)}
                            className="text-xs px-2 py-1 border rounded bg-white dark:bg-gray-900"
                          >
                            <option value="مواطن">مواطن</option>
                            <option value="موظف">موظف</option>
                          </select>
                        </div>
                      </td>
                      <td className="p-2">{statusBadge(t.status)}</td>
                      <td className="p-2 max-w-[28rem] truncate">{t.details}</td>
                      <td className="p-2 whitespace-nowrap">
                        <a href={`#/requests?focus=${encodeURIComponent(t.id)}`} className="px-2 py-1 rounded bg-blue-600 text-white">فتح</a>
                        {t.diwanNumber && t.diwanDate ? (
                          <span className="inline-flex items-center ml-2 gap-2 align-middle">
                            <span className="text-xs bg-amber-100 dark:bg-amber-800 text-amber-700 dark:text-amber-200 px-2 py-0.5 rounded" title="موثق">{t.diwanNumber}</span>
                            <span className="p-1 bg-white rounded border dark:bg-gray-900" title="QR رقم وتاريخ الديوان">
                              <QRCode value={`${t.diwanNumber}|${t.diwanDate}`} size={40} />
                            </span>
                          </span>
                        ) : (
                          <button className="ml-2 text-xs px-2 py-0.5 rounded bg-amber-600 text-white" onClick={()=> documentT && documentT(t.id)}>توثيق</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex items-center justify-between pt-2">
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  عرض {Math.min(visibleTickets.length, (ticketsPage - 1) * pageSize + 1)}–{Math.min(visibleTickets.length, ticketsPage * pageSize)} من {visibleTickets.length}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="px-2 py-1 rounded border bg-white dark:bg-gray-900 disabled:opacity-50"
                    onClick={() => setTicketsPage(p => Math.max(1, p - 1))}
                    disabled={ticketsPage <= 1}
                  >السابق</button>
                  <span className="text-xs">الصفحة {ticketsPage} من {ticketsPagesCount}</span>
                  <button
                    className="px-2 py-1 rounded border bg-white dark:bg-gray-900 disabled:opacity-50"
                    onClick={() => setTicketsPage(p => Math.min(ticketsPagesCount, p + 1))}
                    disabled={ticketsPage >= ticketsPagesCount}
                  >التالي</button>
                </div>
              </div>
            </div>
          )}
        </Card>
      )}
      {/* Simple pagination for lists */}
      <div className="mt-4 flex items-center justify-end gap-2 text-sm">
        {/* Pagination is applied logically via memo; here show counts only */}
        <span>النتائج: رسائل {visibleMessages.length} • طلبات {visibleTickets.length}</span>
      </div>
    </div>
  );
};

export default InquiryComplaintsDiwanPage;

// Subcomponent: Replies history
const RepliesHistory: React.FC<{messageId: string}> = ({ messageId }) => {
  const [replies, setReplies] = React.useState<any[]>([]);
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem('contactMessageReplies');
      const all = raw ? JSON.parse(raw) as any[] : [];
      setReplies(all.filter(r => r.messageId === messageId).sort((a,b) => (a.timestamp||'').localeCompare(b.timestamp||'')));
    } catch { setReplies([]); }
  }, [messageId]);

  if (!replies.length) return <div className="text-xs text-gray-500 mt-1">لا توجد ردود بعد</div>;

  return (
    <div className="mt-2 border rounded p-2 bg-white dark:bg-gray-900 dark:border-gray-700">
      <ul className="space-y-2">
        {replies.map(r => (
          <li key={r.id} className="text-sm">
            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700">{r.type === 'reply' ? 'رد' : r.type === 'comment' ? 'تعليق' : 'تحويل'}</span>
              <span className="text-xs text-gray-600 dark:text-gray-400">{r.authorName} • {r.authorDepartment}</span>
              <span className="text-xs text-gray-600 dark:text-gray-400">{r.timestamp ? new Date(r.timestamp).toLocaleString('ar-SY-u-nu-latn') : ''}</span>
            </div>
            <div className="mt-1 whitespace-pre-wrap">{r.content}</div>
            {!!(r.attachments && r.attachments.length) && (
              <div className="mt-1 flex flex-wrap gap-2">
                {r.attachments.map((a: any, i: number) => (
                  <a key={i} href={a.data} download={a.name} className="text-xs px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-700 inline-block">📎 {a.name}</a>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};
