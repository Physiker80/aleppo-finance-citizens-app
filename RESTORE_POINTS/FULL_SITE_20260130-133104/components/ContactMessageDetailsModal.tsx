import React, { useEffect, useMemo, useState } from 'react';
import { ContactMessage, ContactMessageReply, ContactReplyAttachment } from '../types';
import { useDepartmentNames } from '../utils/departments';

type Props = {
  open: boolean;
  message: ContactMessage;
  onClose: () => void;
};

const ContactMessageDetailsModal: React.FC<Props> = ({ open, message, onClose }) => {
  const departmentNames = useDepartmentNames();

  const [replyType, setReplyType] = useState<'reply' | 'comment' | 'transfer'>('reply');
  const [replyContent, setReplyContent] = useState('');
  const [transferDepartment, setTransferDepartment] = useState('');
  const [replyAttachments, setReplyAttachments] = useState<File[]>([]);

  // Load replies for this message (from localStorage)
  const replies = useMemo<ContactMessageReply[]>(() => {
    try {
      const data = JSON.parse(localStorage.getItem('contactMessageReplies') || '[]');
      return (data || []).filter((r: ContactMessageReply) => r.messageId === message.id);
    } catch {
      return [];
    }
  }, [message.id, open]);

  // A11y: Close on Escape and backdrop click
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // AI Assist listeners
  useEffect(() => {
    if (!open) return;
    const onInsert = (ev: Event) => {
      try {
        // @ts-ignore CustomEvent shape
        const text: string = ev && (ev as CustomEvent).detail?.text;
        if (typeof text === 'string' && text.trim()) {
          setReplyContent((prev) => (prev ? prev + '\n' : '') + text.trim());
        }
      } catch {}
    };
    const onDept = (ev: Event) => {
      try {
        // @ts-ignore CustomEvent shape
        const dep: string = ev && (ev as CustomEvent).detail?.department;
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
  }, [open]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setReplyAttachments((prev) => [...prev, ...files]);
  };

  const removeAttachment = (index: number) => {
    setReplyAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!replyContent.trim() && replyType !== 'transfer') {
      alert('يرجى كتابة محتوى الرد');
      return;
    }
    if (replyType === 'transfer' && !transferDepartment) {
      alert('يرجى اختيار القسم المراد التحويل إليه');
      return;
    }
    try {
      // attachments -> data URLs
      const attachments: ContactReplyAttachment[] = [];
      for (const file of replyAttachments) {
        const fileContent = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
        attachments.push({ name: file.name, size: file.size, type: file.type, data: fileContent });
      }
      const currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
      const newReply: ContactMessageReply = {
        id: `reply-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        messageId: message.id,
        authorName: currentUser?.username || 'غير محدد',
        authorDepartment: currentUser?.department || 'غير محدد',
        type: replyType,
        content:
          replyType === 'transfer'
            ? `تم تحويل الرسالة إلى قسم: ${transferDepartment}\n${replyContent || 'بدون ملاحظات إضافية'}`
            : replyContent,
        transferTo: replyType === 'transfer' ? transferDepartment : undefined,
        attachments,
        timestamp: new Date().toISOString(),
        isRead: false,
      };
      const existing = JSON.parse(localStorage.getItem('contactMessageReplies') || '[]');
      localStorage.setItem('contactMessageReplies', JSON.stringify([...existing, newReply]));

      // If transfer, update base message department (localStorage persistence pattern)
      if (replyType === 'transfer') {
        const all = JSON.parse(localStorage.getItem('contactMessages') || '[]');
        const updated = (all || []).map((m: any) => (m.id === message.id ? { ...m, department: transferDepartment } : m));
        localStorage.setItem('contactMessages', JSON.stringify(updated));
        // Ensure the table reflects the new department
        window.location.reload();
      }

      alert('تم إرسال الرد بنجاح!');
      onClose();
    } catch (e) {
      console.error('Failed to submit reply', e);
      alert('حدث خطأ أثناء إرسال الرد');
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-3xl mx-4 bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700"
      >
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100">تفاصيل الرسالة #{message.id}</h3>
          <button onClick={onClose} className="px-2 py-1 rounded bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600">إغلاق</button>
        </div>

        <div className="p-5 grid gap-4">
          {/* Message core */}
          <div className="grid md:grid-cols-2 gap-3 text-sm">
            <div><span className="text-gray-500 dark:text-gray-400">الاسم:</span> <span className="text-gray-900 dark:text-gray-100">{message.name}</span></div>
            <div><span className="text-gray-500 dark:text-gray-400">البريد:</span> <span className="text-gray-900 dark:text-gray-100">{message.email || '-'}</span></div>
            <div><span className="text-gray-500 dark:text-gray-400">القسم:</span> <span className="text-gray-900 dark:text-gray-100">{message.department || '-'}</span></div>
            <div><span className="text-gray-500 dark:text-gray-400">الحالة:</span> <span className="text-gray-900 dark:text-gray-100">{message.status}</span></div>
            <div className="md:col-span-2"><span className="text-gray-500 dark:text-gray-400">الموضوع:</span> <span className="text-gray-900 dark:text-gray-100">{message.subject || '-'}</span></div>
            <div className="md:col-span-2"><span className="text-gray-500 dark:text-gray-400">الرسالة:</span>
              <div className="mt-1 p-3 rounded border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{message.message}</div>
            </div>
          </div>

          {/* Replies */}
          <div>
            <div className="text-sm font-semibold mb-2">الردود السابقة ({replies.length})</div>
            {replies.length === 0 ? (
              <div className="text-sm text-gray-500 dark:text-gray-400">لا توجد ردود بعد.</div>
            ) : (
              <ul className="space-y-2 max-h-40 overflow-auto pr-1">
                {replies.map(r => (
                  <li key={r.id} className="p-2 rounded border border-gray-200 dark:border-gray-700">
                    <div className="text-xs text-gray-500 dark:text-gray-400 flex justify-between">
                      <span>{r.authorName} • {r.authorDepartment} • {r.type === 'reply' ? 'رد' : r.type === 'comment' ? 'ملاحظة' : 'تحويل'}</span>
                      <span>{new Date(r.timestamp).toLocaleString('ar-SY-u-nu-latn')}</span>
                    </div>
                    <div className="mt-1 text-sm text-gray-800 dark:text-gray-100 whitespace-pre-wrap">{r.content}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Composer */}
          <div className="grid gap-2">
            <div className="flex gap-2 text-sm">
              <label className="flex items-center gap-1"><input type="radio" name="rt" checked={replyType==='reply'} onChange={()=>setReplyType('reply')} /> رد</label>
              <label className="flex items-center gap-1"><input type="radio" name="rt" checked={replyType==='comment'} onChange={()=>setReplyType('comment')} /> ملاحظة داخلية</label>
              <label className="flex items-center gap-1"><input type="radio" name="rt" checked={replyType==='transfer'} onChange={()=>setReplyType('transfer')} /> تحويل قسم</label>
            </div>

            {replyType === 'transfer' && (
              <div className="flex gap-2 items-center">
                <select
                  value={transferDepartment}
                  onChange={(e)=>setTransferDepartment(e.target.value)}
                  className="p-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 min-w-[12rem]"
                >
                  <option value="">اختر القسم</option>
                  {departmentNames.map(dep => <option key={dep} value={dep}>{dep}</option>)}
                </select>
                <span className="text-xs text-gray-500 dark:text-gray-400">سيتم تحديث القسم للرسالة عند الإرسال</span>
              </div>
            )}

            <textarea
              placeholder={replyType==='comment' ? 'اكتب ملاحظة داخلية (لن تُرسل للمواطن)' : 'اكتب محتوى الرد'}
              value={replyContent}
              onChange={(e)=>setReplyContent(e.target.value)}
              className="w-full min-h-[96px] p-2 rounded border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
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

            <div className="flex justify-end gap-2 mt-2">
              <button onClick={onClose} className="px-4 py-2 rounded border border-gray-300 dark:border-gray-600">إلغاء</button>
              <button onClick={handleSubmit} className="px-4 py-2 rounded bg-cyan-600 hover:bg-cyan-700 text-white">إرسال</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactMessageDetailsModal;
