import React, { useContext, useState, useRef, useEffect } from 'react';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import TextArea from '../components/ui/TextArea';
import Button from '../components/ui/Button';
import { AppContext } from '../App';
import { ContactMessageType } from '../types';
import { useDepartmentNames } from '../utils/departments';

declare const jspdf: any;
declare const html2canvas: any;
declare const QRCode: any;
declare const JsBarcode: any;

const ContactPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<ContactMessageType>('طلب');
  const [department, setDepartment] = useState('');
  const [sent, setSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [submittedAt, setSubmittedAt] = useState<Date | null>(null);
  const pdfContentRef = useRef<HTMLDivElement | null>(null);
  const app = useContext(AppContext);
  const departmentNames = useDepartmentNames();

  // توليد QR بعد الإرسال
  useEffect(() => {
    if (sent && createdId) {
      // QR
      if (typeof QRCode !== 'undefined') {
        try {
          const container = document.getElementById('contact-qr');
          if (container) {
            container.innerHTML = '';
            new QRCode(container, {
              text: createdId,
              width: 140,
              height: 140,
              colorDark: '#000000',
              colorLight: '#ffffff',
              correctLevel: QRCode.CorrectLevel.M,
            });
          }
        } catch {}
      }
      // Barcode (on-screen)
      if (typeof JsBarcode !== 'undefined') {
        try {
          const bc = document.getElementById('contact-barcode') as HTMLCanvasElement | null;
          if (bc) {
            JsBarcode(bc, createdId, { format: 'CODE128', lineColor: '#000', width: 2, height: 70, displayValue: true, fontSize: 14, margin: 8, background: '#ffffff' });
          }
        } catch {}
      }
    }
  }, [sent, createdId]);

  const formatDateTime = (d?: Date | null) => {
    if (!d) return '—';
    try {
      return new Intl.DateTimeFormat('ar-SY-u-nu-latn', { dateStyle: 'medium', timeStyle: 'short' }).format(d);
    } catch { return d.toLocaleString(); }
  };

  const handleDownloadQr = () => {
    const container = document.getElementById('contact-qr');
    if (!container) return;
    const canvas = container.querySelector('canvas') as HTMLCanvasElement | null;
    const img = container.querySelector('img') as HTMLImageElement | null;
    let dataUrl: string | null = null;
    if (canvas) dataUrl = canvas.toDataURL('image/png');
    else if (img?.src) dataUrl = img.src;
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `contact-${createdId || 'qr'}.png`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const ensurePdfVisuals = async (id: string) => {
    // QR
    const pdfQrContainer = document.getElementById('contact-pdf-qr');
    if (pdfQrContainer) {
      pdfQrContainer.innerHTML = '';
      try {
        if (typeof QRCode !== 'undefined') {
          const tmpDiv = document.createElement('div');
            new QRCode(tmpDiv, { text: id, width: 160, height: 160, colorDark: '#000000', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.M });
            const c = tmpDiv.querySelector('canvas') as HTMLCanvasElement | null;
            const im = tmpDiv.querySelector('img') as HTMLImageElement | null;
            if (c) {
              const img = document.createElement('img');
              img.src = c.toDataURL('image/png');
              img.width = 160; img.height = 160; img.style.display = 'block';
              pdfQrContainer.appendChild(img);
            } else if (im) {
              im.width = 160; im.height = 160; im.style.display = 'block';
              pdfQrContainer.appendChild(im);
            }
        }
      } catch {}
    }
    // Barcode for PDF (canvas inside visible area for capture)
    try {
      const pdfBarcode = document.getElementById('contact-pdf-barcode') as HTMLCanvasElement | null;
      if (pdfBarcode && typeof JsBarcode !== 'undefined') {
        JsBarcode(pdfBarcode, id, { format: 'CODE128', lineColor: '#000', width: 2.4, height: 80, displayValue: true, fontSize: 14, margin: 10, background: '#ffffff' });
      }
    } catch {}
  };

  const handleDownloadPdf = async () => {
    if (!createdId) return;
    const content = pdfContentRef.current;
    if (!content || typeof html2canvas === 'undefined' || typeof jspdf === 'undefined') {
      alert('المكتبات اللازمة غير محمّلة.');
      return;
    }
    try {
      await ensurePdfVisuals(createdId);
      const qrImg = content.querySelector('#contact-pdf-qr img') as HTMLImageElement | null;
      if (qrImg && !qrImg.complete) {
        await new Promise<void>(res => { qrImg.onload = () => res(); qrImg.onerror = () => res(); });
      }
      await new Promise(r => setTimeout(r, 150));
      const canvas = await html2canvas(content, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png', 1.0);
      const { jsPDF } = jspdf;
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const aspectRatio = canvas.height / canvas.width;
      let finalWidth = pdfWidth - 20;
      let finalHeight = finalWidth * aspectRatio;
      if (finalHeight > pdfHeight - 20) {
        finalHeight = pdfHeight - 20;
        finalWidth = finalHeight / aspectRatio;
      }
      const x = (pdfWidth - finalWidth) / 2;
      const y = 10;
      pdf.addImage(imgData, 'PNG', x, y, finalWidth, finalHeight);
      pdf.setProperties({ title: `رسالة تواصل ${createdId}`, subject: 'تأكيد رسالة تواصل', author: 'نظام الاستعلامات والشكاوى', creator: 'نظام الاستعلامات والشكاوى' });
      pdf.save(`contact-${createdId}.pdf`);
    } catch (e) {
      console.error(e);
      alert('حدث خطأ في إنشاء ملف PDF');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
  if (!name || !message || !type) return;
    setIsLoading(true);
    // Simulate send
    setTimeout(() => {
      const id = app?.addContactMessage ? app.addContactMessage({
        name,
        email,
        subject,
        message,
        type,
        department: department || undefined,
      }) : null;
      setIsLoading(false);
      setCreatedId(id || null);
      setSubmittedAt(new Date());
      setSent(true);
    }, 500);
  };

  if (sent) {
    return (
      <Card>
        <h2 className="text-2xl font-bold mb-2">تم إرسال رسالتك بنجاح</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">احتفظ بالمعرّف للمتابعة الداخلية.</p>
        <div className="flex flex-col md:flex-row gap-6">
          <div className="space-y-3 flex-1">
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 relative bg-white dark:bg-gray-900" ref={pdfContentRef} id="contact-pdf-area" dir="rtl">
              {/* Header with logo */}
              <div className="flex items-center justify-between mb-4">
                <img id="ministry-logo" src="https://syrian.zone/syid/materials/logo.ai.svg" alt="Logo" className="h-16 object-contain" />
                <div className="text-center flex-1">
                  <h3 className="text-xl font-bold">إيصال رسالة تواصل</h3>
                  <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">سجل داخلي غير رسمي للاختبار</div>
                </div>
              </div>
              {/* ID prominently */}
              <div className="text-center my-3">
                <div className="text-sm text-gray-500 dark:text-gray-400">المعرف</div>
                <div className="text-2xl font-extrabold tracking-wider text-blue-700 dark:text-blue-300 font-mono select-all">{createdId}</div>
              </div>
              {/* QR + Barcode row */}
              <div className="flex flex-col md:flex-row items-center justify-center gap-8 my-4">
                <div className="flex flex-col items-center">
                  <div id="contact-qr" className="bg-white p-2 rounded border border-gray-200 dark:border-gray-700" />
                  <span className="text-[11px] mt-1 text-gray-500 dark:text-gray-400">QR</span>
                </div>
                <div className="flex flex-col items-center">
                  <canvas id="contact-barcode" className="bg-white p-2 rounded border border-gray-200 dark:border-gray-700" />
                  <span className="text-[11px] mt-1 text-gray-500 dark:text-gray-400">Barcode</span>
                </div>
              </div>
              {/* Details */}
              <div className="grid md:grid-cols-2 gap-3 text-sm mt-2">
                <div><span className="font-semibold">الاسم:</span> {name || '—'}</div>
                <div><span className="font-semibold">البريد:</span> {email || '—'}</div>
                <div><span className="font-semibold">النوع:</span> {type}</div>
                <div><span className="font-semibold">القسم:</span> {department || '—'}</div>
                <div><span className="font-semibold">التاريخ:</span> {formatDateTime(submittedAt)}</div>
                <div><span className="font-semibold">الموضوع:</span> {subject || '—'}</div>
              </div>
              <div className="mt-4">
                <div className="text-sm font-semibold mb-1">نص الرسالة</div>
                <div className="whitespace-pre-wrap text-sm leading-relaxed bg-gray-50 dark:bg-gray-800 rounded p-3 border border-gray-200 dark:border-gray-700 min-h-[90px]">{message}</div>
              </div>
              {/* Hidden containers for PDF ensuring crisp capture */}
              <div id="contact-pdf-qr" style={{ width:160, height:160, position:'absolute', left:-9999, top:-9999 }} />
              <canvas id="contact-pdf-barcode" style={{ position:'absolute', left:-9999, top:-9999 }} />
              <div className="mt-6 text-[10px] text-center text-gray-500 dark:text-gray-500 border-t pt-2">تم إنشاء هذا الإيصال محلياً لغرض التحقق والتجربة.</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={handleDownloadPdf}>تنزيل PDF</Button>
              <Button type="button" onClick={handleDownloadQr} variant="secondary">تنزيل QR</Button>
              <Button type="button" onClick={() => setSent(false)} variant="secondary">رسالة جديدة</Button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">يتم حفظ الرسائل محلياً حالياً لأغراض الاختبار. احتفظ بالمعرّف للمتابعة الداخلية.</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <h2 className="text-2xl font-bold mb-1">تواصل معنا</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-6">أرسل لنا رسالة وسنعاود الاتصال بك.</p>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-1">
          <Select id="type" label="نوع الرسالة" value={type} onChange={(e) => setType(e.target.value as ContactMessageType)} required>
            <option value="طلب">طلب</option>
            <option value="شكوى">شكوى</option>
            <option value="اقتراح">اقتراح</option>
          </Select>
        </div>
        <div className="md:col-span-1">
          <Select id="department" label="القسم المستهدف (اختياري)" value={department} onChange={(e) => setDepartment(e.target.value)}>
            <option value="">بدون تحديد</option>
            {departmentNames.map((dep) => (
              <option key={dep} value={dep}>{dep}</option>
            ))}
          </Select>
        </div>
        <div className="md:col-span-1">
          <Input id="name" label="الاسم" placeholder="الاسم الكامل" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="md:col-span-1">
          <Input id="email" label="البريد الإلكتروني" type="email" placeholder="example@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <Input id="subject" label="الموضوع" placeholder="عنوان الرسالة" value={subject} onChange={(e) => setSubject(e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <TextArea id="message" label="نص الرسالة" placeholder="اكتب رسالتك هنا" value={message} onChange={(e) => setMessage(e.target.value)} required />
        </div>
        <div className="md:col-span-2 flex justify-end">
          <Button type="submit" isLoading={isLoading}>إرسال</Button>
        </div>
      </form>
    </Card>
  );
};

export default ContactPage;