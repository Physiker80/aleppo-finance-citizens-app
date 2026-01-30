import React, { useState } from 'react';
import { uploadFile, getPresignedUrl, downloadFile, deleteUploaded } from '../utils/citizenUploads';

const UploadsDemoPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [objectKey, setObjectKey] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [meta, setMeta] = useState<string>('');

  const onSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
    setStatus('');
    setMeta('');
  };

  const onUpload = async () => {
    if (!file) { setStatus('الرجاء اختيار ملف'); return; }
    setStatus('جاري الرفع...');
    const res = await uploadFile(file);
    if (!res.ok) {
      const err = 'error' in res ? res.error : 'unknown-error';
      setStatus('فشل الرفع: ' + err);
      return;
    }
    setObjectKey(res.objectKey);
    setStatus('تم الرفع');
  };

  const onPresign = async () => {
    if (!objectKey) { setStatus('لا يوجد مفتاح كائن'); return; }
    setStatus('طلب وصلة موقعة...');
    const r = await getPresignedUrl(objectKey);
    if (!r.ok) { setStatus('فشل: ' + ('error' in r ? r.error : 'unknown-error')); return; }
    setMeta(`type=${r.contentType || '-'} size=${r.contentLength || 0} expiresIn=${r.expiresIn}s`);
    setStatus('جاهز للتنزيل');
    window.open(r.url, '_blank', 'noopener');
  };

  const onProxy = async () => {
    if (!objectKey) { setStatus('لا يوجد مفتاح كائن'); return; }
    setStatus('طلب بروكسي...');
    const r = await getPresignedUrl(objectKey, { proxy: true });
    if (!r.ok) { setStatus('فشل: ' + ('error' in r ? r.error : 'unknown-error')); return; }
    setStatus('سيبدأ التنزيل عبر الخادم...');
    window.location.href = r.url; // triggers proxied download
  };

  const onDownload = async () => {
    if (!objectKey) { setStatus('لا يوجد مفتاح كائن'); return; }
    const r = await downloadFile(objectKey, file?.name);
    if (!r.ok) setStatus('فشل التنزيل: ' + r.error);
  };

  const onDelete = async () => {
    if (!objectKey) { setStatus('لا يوجد مفتاح كائن'); return; }
    setStatus('جاري الحذف...');
  const r = await deleteUploaded(objectKey);
  if (!r.ok) { setStatus('فشل الحذف: ' + (('error' in r) ? r.error : 'unknown-error')); return; }
    setStatus('تم الحذف');
    setObjectKey('');
  };

  return (
    <div className="max-w-xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">تجربة رفع وتنزيل الملفات (بوابة المواطنين)</h1>
        <a href="#/" className="px-3 py-1.5 rounded-md text-sm text-white bg-gray-700 hover:bg-gray-800">الرجوع للرئيسية</a>
      </div>
      <div className="space-y-3">
        <input type="file" onChange={onSelect} className="block w-full" />
        <div className="flex gap-2">
          <button onClick={onUpload} className="px-3 py-2 rounded-md text-white bg-emerald-600 hover:bg-emerald-700">رفع</button>
          <button onClick={onPresign} className="px-3 py-2 rounded-md text-white bg-sky-600 hover:bg-sky-700" disabled={!objectKey}>وصلة موقعة</button>
          <button onClick={onDownload} className="px-3 py-2 rounded-md text-white bg-indigo-600 hover:bg-indigo-700" disabled={!objectKey}>تنزيل مباشر</button>
          <button onClick={onProxy} className="px-3 py-2 rounded-md text-white bg-teal-700 hover:bg-teal-800" disabled={!objectKey}>تنزيل عبر الخادم</button>
          <button onClick={onDelete} className="px-3 py-2 rounded-md text-white bg-rose-600 hover:bg-rose-700" disabled={!objectKey}>حذف</button>
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-300">ObjectKey: <span className="font-mono break-all">{objectKey || '—'}</span></div>
        <div className="text-sm text-gray-600 dark:text-gray-300">Meta: {meta || '—'}</div>
        <div className="text-sm text-gray-800 dark:text-gray-200">الحالة: {status || '—'}</div>
      </div>
    </div>
  );
};

export default UploadsDemoPage;
