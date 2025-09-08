import React, { useState, useContext } from 'react';
import { AppContext } from '../App';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import TextArea from '../components/ui/TextArea';
import FileInput from '../components/ui/FileInput';
import Button from '../components/ui/Button';
import { DEPARTMENTS, REQUEST_TYPES } from '../constants';
import { Department, RequestType } from '../types';
import { useFilePreviews } from '../hooks/useFilePreview';

// يدعم رفع عدة ملفات (حتى 5) مع معاينات PDF بالـ iframe والصور عبر <img>
const SubmitRequestPage: React.FC = () => {
  const appContext = useContext(AppContext);

  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    nationalId: '',
    requestType: REQUEST_TYPES[0],
    department: DEPARTMENTS[0],
    details: '',
  });

  const [attachments, setAttachments] = useState<File[]>([]);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [viewerLoading, setViewerLoading] = useState<boolean>(false);
  const [viewerCanceled, setViewerCanceled] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previews = useFilePreviews(attachments);

  const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
  const MAX_FILES = 5;

  // previews are managed by the hook with proper cleanup

  const handleFilesChange = (files: File[] | undefined) => {
    if (!files || files.length === 0) {
      setAttachments([]);
      setError(null);
      return;
    }
    let selected = files.slice(0, MAX_FILES);
    const oversize = selected.filter((f) => f.size > MAX_FILE_SIZE);
    if (oversize.length > 0) {
      setError('بعض الملفات تتجاوز 100MB وتم تجاهلها.');
      selected = selected.filter((f) => f.size <= MAX_FILE_SIZE);
    } else {
      setError(null);
    }
    setAttachments(selected);
  };

  const removeAttachment = (idx: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
    if (previewIndex === idx) setPreviewIndex(null);
  };

  const openPreview = (idx: number) => {
    setPreviewIndex(idx);
    setViewerLoading(true);
    setViewerCanceled(false);
  };
  const closePreview = () => {
    setPreviewIndex(null);
    setViewerLoading(false);
    setViewerCanceled(false);
  };
  const cancelViewerLoading = () => {
    if (viewerLoading && !viewerCanceled) {
      setViewerCanceled(true);
      setViewerLoading(false);
    }
  };

  const readableSize = (size: number) => {
    if (size >= 1024 * 1024) return `${Math.ceil(size / (1024 * 1024))}MB`;
    if (size >= 1024) return `${Math.ceil(size / 1024)}KB`;
    return `${size}B`;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.phone || !formData.nationalId || !formData.details || !formData.email) {
      setError('يرجى ملء جميع الحقول الإلزامية.');
      return;
    }
    setError(null);
    setIsSubmitting(true);

    setTimeout(() => {
      const newTicketId = appContext?.addTicket({
        ...formData,
        requestType: formData.requestType as RequestType,
        department: formData.department as Department,
        attachments: attachments.length ? attachments : undefined,
        submissionDate: new Date(),
      });

      setIsSubmitting(false);
      if (newTicketId) {
        window.location.hash = '#/confirmation';
      }
    }, 1000);
  };

  return (
    <Card>
      <img src="https://syrian.zone/syid/materials/logo.ai.svg" alt="Syrian Zone Logo" className="mb-4 w-32 mx-auto" />
      <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-1">تقديم طلب جديد</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-6">يرجى ملء البيانات التالية بدقة. الحقول التي تحمل علامة * إلزامية.</p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <Input id="fullName" label="الاسم الكامل *" value={formData.fullName} onChange={handleChange} required />
          <Input id="nationalId" label="الرقم الوطني *" value={formData.nationalId} onChange={handleChange} required />
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <Input id="phone" label="رقم الهاتف *" type="tel" value={formData.phone} onChange={handleChange} required />
          <Input id="email" label="البريد الإلكتروني *" type="email" value={formData.email} onChange={handleChange} required />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Select id="requestType" label="نوع الطلب *" value={formData.requestType} onChange={handleChange}>
            {REQUEST_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </Select>
          <Select id="department" label="القسم المعني *" value={formData.department} onChange={handleChange}>
            {DEPARTMENTS.map((dep) => (
              <option key={dep} value={dep}>
                {dep}
              </option>
            ))}
          </Select>
        </div>

        <TextArea id="details" label="تفاصيل الطلب *" value={formData.details} onChange={handleChange} required />

        <FileInput
          id="attachments"
          label="إرفاق ملفات (اختياري)"
          onFileChange={handleFilesChange}
          accept=".pdf,.png,.jpg,.jpeg,.docx"
          multiple
          maxFiles={MAX_FILES}
        />

        {attachments.length > 0 && (
          <div className="mt-4 p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-lg text-gray-800 dark:text-gray-200">
                المرفقات ({attachments.length})
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">باقي {MAX_FILES - attachments.length} من {MAX_FILES} ملفات</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {attachments.map((file, index) => {
                const p = previews[index];
                const kind = p?.kind || 'unsupported';
                const badge = kind === 'image' ? 'صورة' : kind === 'pdf' ? 'PDF' : kind === 'docx' ? 'Word' : 'ملف';
                return (
                  <div key={`${file.name}-${index}`} className="relative border rounded-md bg-black/5 dark:bg-white/5 shadow-sm overflow-hidden">
                    <button onClick={() => removeAttachment(index)} title="إزالة" className="absolute top-2 right-2 z-10 inline-flex items-center justify-center w-8 h-8 rounded-full bg-black/40 text-white hover:bg-black/60">×</button>
                    <div className="relative w-full h-72 md:h-80 bg-gray-50 dark:bg-gray-800">
                      {!p || p.loading ? (
                        <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-600 dark:text-gray-300">جاري تجهيز المعاينة...</div>
                      ) : p.kind === 'pdf' ? (
                        <iframe src={p.url} title={`pdf-${index}`} className="absolute inset-0 w-full h-full border-0" />
                      ) : p.kind === 'image' ? (
                        <img src={p.url} alt={`attachment-${index}`} className="absolute inset-0 w-full h-full object-contain" />
                      ) : p.kind === 'docx' ? (
                        p.html ? (
                          <div className="absolute inset-0 overflow-auto">
                            <div className="prose prose-sm max-w-none dark:prose-invert bg-white dark:bg-gray-900 p-3 min-h-full" dangerouslySetInnerHTML={{ __html: p.html }} />
                          </div>
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-600 dark:text-gray-300">جارٍ تجهيز معاينة الوورد...</div>
                        )
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-600 dark:text-gray-300">لا يمكن معاينة هذا النوع من الملفات.</div>
                      )}
                      {/* Transparent details/action bar */}
                      <div className="absolute bottom-0 left-0 right-0 p-3 bg-black/40 text-white backdrop-blur-sm flex items-center justify-between">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate" title={file.name}>{file.name}</p>
                          <p className="text-xs opacity-90">{badge} • {readableSize(file.size)}</p>
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                          <button onClick={() => openPreview(index)} className="px-2 py-1 rounded bg-white/10 hover:bg-white/20">معاينة</button>
                          {p?.url && (
                            <a href={p.url} target="_blank" rel="noreferrer" className="px-2 py-1 rounded bg-white/10 hover:bg-white/20">فتح</a>
                          )}
                          {p?.url && (
                            <a href={p.url} download={file.name} className="px-2 py-1 rounded bg-white/10 hover:bg-white/20">تنزيل</a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {previewIndex !== null && previews[previewIndex] && (
          <div className="fixed inset-0 z-50 bg-black/80" onClick={closePreview}>
            <div className="relative w-screen h-screen" onClick={(e) => e.stopPropagation()}>
              {/* Top transparent info bar */}
              <div className="absolute top-0 left-0 right-0 p-3 flex items-center justify-between text-white bg-transparent">
                <div className="min-w-0">
                  <h5 className="text-sm font-semibold truncate" title={attachments[previewIndex].name}>{attachments[previewIndex].name}</h5>
                  <p className="text-xs opacity-80">ملف {previewIndex + 1} من {attachments.length} • {readableSize(attachments[previewIndex].size)}</p>
                </div>
                <div className="flex items-center gap-2">
                  {previews[previewIndex]?.url && (
                    <a href={previews[previewIndex]!.url} target="_blank" rel="noreferrer" className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-white text-xs">فتح</a>
                  )}
                  {previews[previewIndex]?.url && (
                    <a href={previews[previewIndex]!.url} download={attachments[previewIndex].name} className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-white text-xs">تنزيل</a>
                  )}
                  <button
                    onClick={cancelViewerLoading}
                    title="إلغاء التحميل"
                    aria-label="إلغاء التحميل"
                    className={`w-8 h-8 rounded-full ${viewerLoading && !viewerCanceled ? 'bg-white/10 hover:bg-white/20' : 'bg-white/5 opacity-50 cursor-not-allowed'} text-white`}
                    disabled={!viewerLoading || viewerCanceled}
                  >✕</button>
                </div>
              </div>

              {/* Side navigation arrows */}
              {attachments.length > 1 && (
                <>
                  <button aria-label="السابق" disabled={previewIndex === 0} onClick={() => setPreviewIndex((i) => (i !== null ? Math.max(0, i - 1) : 0))} className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white disabled:opacity-40">‹</button>
                  <button aria-label="التالي" disabled={previewIndex === attachments.length - 1} onClick={() => setPreviewIndex((i) => (i !== null ? Math.min(attachments.length - 1, i + 1) : 0))} className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white disabled:opacity-40">›</button>
                </>
              )}

              {/* Content */}
              <div className="h-full w-full flex items-center justify-center px-6 pt-16 pb-24">
                {(() => {
                  const p = previews[previewIndex]!;
                  // keep local loading state in sync for docx
                  if (p.kind === 'docx' && viewerCanceled) {
                    return <div className="p-6 text-center text-white/90">تم إلغاء التحميل.</div>;
                  }
                  if (viewerCanceled) {
                    return <div className="p-6 text-center text-white/90">تم إلغاء التحميل.</div>;
                  }
                  if (!p || p.loading) {
                    // when hook indicates loading, mark viewer as loading
                    if (!viewerLoading) setViewerLoading(true);
                    return <div className="p-6 text-center text-white/90">جاري تحميل المعاينة…</div>;
                  }
                  if (p.kind === 'pdf') return (
                    <iframe
                      key={`pdf-${previewIndex}`}
                      src={p.url}
                      title={`pdf-full-${previewIndex}`}
                      className="w-full h-full bg-white rounded"
                      onLoad={() => setViewerLoading(false)}
                    />
                  );
                  if (p.kind === 'image') return (
                    <img
                      key={`img-${previewIndex}`}
                      src={p.url}
                      alt={`img-full-${previewIndex}`}
                      className="max-w-full max-h-full object-contain mx-auto"
                      onLoad={() => setViewerLoading(false)}
                      onError={() => setViewerLoading(false)}
                    />
                  );
                  if (p.kind === 'docx') return p.html ? (
                    <div
                      className="prose max-w-none dark:prose-invert bg-white/90 dark:bg-gray-900/90 p-6 rounded border border-white/20 max-h-full overflow-auto"
                      dangerouslySetInnerHTML={{ __html: p.html }}
                      onLoad={() => setViewerLoading(false) as any}
                    />
                  ) : (
                    <div className="p-6 text-center text-white/90">جارٍ تجهيز معاينة الوورد…</div>
                  );
                  return <div className="p-6 text-center text-white/90">لا تتوفر معاينة لهذا الملف.</div>;
                })()}
              </div>

              {/* Bottom transparent selector */}
              {attachments.length > 1 && (
                <div className="absolute bottom-0 left-0 right-0 p-2 overflow-x-auto bg-transparent">
                  <div className="flex gap-2 px-2">
                    {attachments.map((f, i) => (
                      <button key={i} onClick={() => setPreviewIndex(i)} title={f.name} className={`px-2 py-1 rounded text-xs whitespace-nowrap border ${i === previewIndex ? 'bg-white/20 text-white border-white/50' : 'bg-transparent text-white/90 border-white/20 hover:bg-white/10'}`}>{f.name}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <div className="text-left">
          <Button type="submit" isLoading={isSubmitting}>
            {isSubmitting ? 'جاري الإرسال...' : 'إرسال الطلب'}
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default SubmitRequestPage;
