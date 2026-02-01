import React, { useContext, useState, useRef, useEffect } from 'react';
import { Edit2, Save, X } from 'lucide-react';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import TextArea from '../components/ui/TextArea';
import Button from '../components/ui/Button';
import { AppContext } from '../App';
import { ContactMessageType, Employee } from '../types';
import { useDepartmentNames } from '../utils/departments';
import { LocationMap } from '../components/IntegrationComponents';

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
  const [foundEmployee, setFoundEmployee] = useState<Employee | null>(null);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const pdfContentRef = useRef<HTMLDivElement | null>(null);
  const app = useContext(AppContext);
  const departmentNames = useDepartmentNames();

  // --- Info Edit State ---
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const defaultInfoContent = {
    manager: {
      title: "مدير مالية حلب",
      subtitle: "السيد المدير العام",
      description: "نسعى لتقديم أفضل الخدمات للمواطنين وتسهيل المعاملات المالية بشفافية.",
      meetingTime: "أوقات مقابلة المواطنين: يومياً 10:00 - 12:00"
    },
    workingHours: {
      days: "الأحد - الخميس",
      hours: "08:00 AM - 03:30 PM",
      weekend: "الجمعة - السبت",
      weekendLabel: "عطلة رسمية"
    }
  };
  const [infoContent, setInfoContent] = useState(defaultInfoContent);

  useEffect(() => {
    const saved = localStorage.getItem('contactInfoContent');
    if (saved) {
      try { setInfoContent({ ...defaultInfoContent, ...JSON.parse(saved) }); } catch { }
    }
  }, []);

  const handleSaveInfo = () => {
    localStorage.setItem('contactInfoContent', JSON.stringify(infoContent));
    setIsEditingInfo(false);
  };

  const isAdmin = app?.isEmployeeLoggedIn && app?.currentEmployee?.role === 'مدير';

  // توليد QR بعد الإرسال
  useEffect(() => {
    if (sent && createdId) {
      // QR
    if (typeof QRCode !== 'undefined') {
        try {
      const container = document.getElementById('main-qr');
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
      const bc = document.getElementById('main-barcode') as HTMLCanvasElement | null;
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
  const pdfQrContainer = document.getElementById('pdf-qr');
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
  const pdfBarcode = document.getElementById('pdf-barcode') as HTMLCanvasElement | null;
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

  // البحث التلقائي عند كتابة الاسم
  const handleNameChange = (value: string) => {
    setName(value);

    // إلغاء البحث السابق
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    // البحث بعد 500ms من التوقف عن الكتابة
    const newTimeout = setTimeout(() => {
      if (value.trim().length >= 3 && app) {
        const employees = app.searchEmployeeByName(value.trim());
        const exactMatch = employees.find(emp => 
          emp.name.toLowerCase() === value.trim().toLowerCase()
        );
        setFoundEmployee(exactMatch || null);
      } else {
        setFoundEmployee(null);
      }
    }, 500);

    setSearchTimeout(newTimeout);
  };

  // تنظيف timeout عند إلغاء المكون
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !message || !type) return;
    setIsLoading(true);
    // Simulate send
    setTimeout(() => {
      // تحديد المصدر بناءً على النتائج
      let source: 'مواطن' | 'موظف' = 'مواطن';
      let finalDepartment = department || undefined;
      let employeeUsername: string | undefined = undefined;
      
      if (foundEmployee) {
        // إذا تم العثور على الموظف من البحث التلقائي
        source = 'موظف';
        finalDepartment = foundEmployee.department || finalDepartment;
        employeeUsername = foundEmployee.username;
      } else if (app?.isEmployeeLoggedIn && app?.currentEmployee) {
        // إذا كان الموظف متصل
        source = 'موظف';
        finalDepartment = app.currentEmployee.department || finalDepartment;
        employeeUsername = app.currentEmployee.username;
      }
      
      const id = app?.addContactMessage ? app.addContactMessage({
        name,
        email,
        subject,
        message,
        type,
        department: finalDepartment,
        source,
        employeeUsername,
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
              <div className="text-center my-4">
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">معرّف الرسالة</div>
                <div className="text-3xl font-extrabold tracking-wide text-blue-700 dark:text-blue-300 font-mono select-all">{createdId}</div>
              </div>
              <div className="flex flex-col md:flex-row items-start justify-center gap-8 my-6">
                <div className="flex flex-col items-center">
                  <div id="main-qr" className="flex items-center justify-center bg-white p-2 rounded border border-gray-200 dark:border-gray-700" />
                  <span className="text-[11px] mt-1 text-gray-500 dark:text-gray-400">QR</span>
                </div>
                <div className="flex flex-col items-center">
                  <canvas id="main-barcode" className="max-w-[320px] max-h-[90px] bg-white p-2 rounded border border-gray-200 dark:border-gray-700" />
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
              <div id="pdf-qr" style={{ width:160, height:160, position:'absolute', left:-9999, top:-9999 }} />
              <canvas id="pdf-barcode" style={{ position:'absolute', left:-9999, top:-9999 }} />
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
    <div className="min-h-screen py-8" style={{
      background: 'url("https://syrian.zone/syid/materials/bg.svg") center/cover',
      backdropFilter: 'blur(0.5px)'
    }}>
      <div className="container mx-auto px-4">
        <Card className="max-w-4xl mx-auto bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border border-white/20 dark:border-gray-700/20 shadow-2xl">
          <div className="text-center mb-8">
            {/* الشعار الرسمي */}
            <div className="mb-8 flex flex-col items-center">
              <img 
                src="https://syrian.zone/syid/materials/logo.ai.svg" 
                alt="شعار الجمهورية العربية السورية" 
                className="w-32 h-32 mx-auto filter drop-shadow-lg opacity-90 hover:opacity-100 transition-opacity duration-300"
                onError={(e) => {
                  const img = e.currentTarget as HTMLImageElement;
                  // fallback to local logo if remote fails
                  img.src = '/logo.ai.svg';
                }}
              />
            </div>
            
            <h2 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white drop-shadow-sm">تواصل معنا</h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 drop-shadow-sm mb-8">أرسل لنا رسالة وسنعاود الاتصال بك في أقرب وقت ممكن.</p>
          </div>
          
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
          <div className="relative">
            <Input 
              id="name" 
              label="الاسم" 
              placeholder="الاسم الكامل" 
              value={name} 
              onChange={(e) => handleNameChange(e.target.value)} 
              required 
            />
            {foundEmployee && (
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 px-2 py-1 rounded-full text-xs font-medium border border-green-300 dark:border-green-600 shadow-sm z-10"
                   title={`موظف في ${foundEmployee.department} - ${foundEmployee.role}`}>
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                موظف
              </div>
            )}
          </div>
          {foundEmployee && (
            <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-md">
              <p className="text-xs text-green-700 dark:text-green-300">
                <span className="font-medium">تم التعرف على:</span> {foundEmployee.name} - {foundEmployee.department} ({foundEmployee.role})
              </p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                سيتم إرسال الرسالة تحت تصنيف "{type} من موظف"
              </p>
            </div>
          )}
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
          <Button 
            type="submit" 
            isLoading={isLoading}
          >
            إرسال
          </Button>
        </div>
      </form>

      {/* قسم معلومات مدير المالية وأوقات الدوام */}
      <div className="mt-12 group relative">
        {(isAdmin) && (
          <div className="absolute -top-10 left-0 bg-transparent">
             {!isEditingInfo ? (
               <button
                 type="button"
                 onClick={() => setIsEditingInfo(true)}
                 className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 bg-white/50 dark:bg-gray-800/50 px-3 py-1 rounded backdrop-blur border border-blue-200 dark:border-blue-900"
               >
                 <Edit2 size={14} /> تعديل المعلومات
               </button>
             ) : (
               <div className="flex gap-2">
                 <button
                   type="button"
                   onClick={handleSaveInfo}
                   className="flex items-center gap-2 text-sm text-white bg-green-600 hover:bg-green-700 px-3 py-1 rounded shadow-sm"
                 >
                   <Save size={14} /> حفظ
                 </button>
                 <button
                   type="button"
                   onClick={() => {
                     const saved = localStorage.getItem('contactInfoContent');
                     if(saved) try { setInfoContent(JSON.parse(saved)); } catch{}
                     setIsEditingInfo(false);
                   }}
                   className="flex items-center gap-2 text-sm text-white bg-gray-500 hover:bg-gray-600 px-3 py-1 rounded shadow-sm"
                 >
                   <X size={14} /> إلغاء
                 </button>
               </div>
             )}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
        {/* بطاقة المدير */}
        <div className={`bg-white/50 dark:bg-gray-800/50 rounded-xl p-6 border ${isEditingInfo ? 'border-blue-400 border-dashed' : 'border-gray-200 dark:border-gray-700'} shadow-sm backdrop-blur-sm hover:shadow-md transition-all`}>
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800 flex items-center justify-center shrink-0 border-2 border-white dark:border-gray-700 shadow-sm overflow-hidden">
               <svg className="w-8 h-8 text-blue-600 dark:text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div className="flex-1">
              {isEditingInfo ? (
                <div className="space-y-2">
                  <Input 
                    value={infoContent.manager.title} 
                    onChange={e => setInfoContent({...infoContent, manager: {...infoContent.manager, title: e.target.value}})}
                    className="text-sm font-bold"
                    placeholder="العنوان الرئيسي (مثال: مدير مالية حلب)"
                  />
                  <Input 
                    value={infoContent.manager.subtitle}
                    onChange={e => setInfoContent({...infoContent, manager: {...infoContent.manager, subtitle: e.target.value}})}
                    className="text-xs"
                    placeholder="العنوان الفرعي"
                  />
                  <TextArea 
                    value={infoContent.manager.description}
                    onChange={e => setInfoContent({...infoContent, manager: {...infoContent.manager, description: e.target.value}})}
                    className="text-sm h-20"
                    placeholder="الوصف"
                  />
                  <Input 
                    value={infoContent.manager.meetingTime}
                    onChange={e => setInfoContent({...infoContent, manager: {...infoContent.manager, meetingTime: e.target.value}})}
                    className="text-xs"
                    placeholder="أوقات المقابلة"
                  />
                </div>
              ) : (
                <>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{infoContent.manager.title}</h3>
                  <p className="text-sm text-blue-600 dark:text-blue-400 font-medium mb-3">{infoContent.manager.subtitle}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-2">
                    {infoContent.manager.description}
                  </p>
                  <div className="flex items-center gap-2 text-xs font-medium text-gray-700 dark:text-gray-200 bg-blue-50 dark:bg-blue-900/20 p-2 rounded border border-blue-100 dark:border-blue-800/30">
                    <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {infoContent.manager.meetingTime}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* بطاقة أوقات الدوام */}
        <div className={`bg-white/50 dark:bg-gray-800/50 rounded-xl p-6 border ${isEditingInfo ? 'border-blue-400 border-dashed' : 'border-gray-200 dark:border-gray-700'} shadow-sm backdrop-blur-sm hover:shadow-md transition-all flex flex-col justify-center`}>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">أوقات الدوام الرسمي</h3>
          </div>
          
          <div className="space-y-3 text-sm">
            {isEditingInfo ? (
              <div className="space-y-3">
                 <div className="flex gap-2">
                    <Input 
                      value={infoContent.workingHours.days}
                      onChange={e => setInfoContent({...infoContent, workingHours: {...infoContent.workingHours, days: e.target.value}})}
                      placeholder="الأيام"
                      className="flex-1"
                    />
                    <Input 
                      value={infoContent.workingHours.hours}
                      onChange={e => setInfoContent({...infoContent, workingHours: {...infoContent.workingHours, hours: e.target.value}})}
                      placeholder="الساعات"
                      className="flex-1"
                      dir="ltr"
                    />
                 </div>
                 <div className="flex gap-2">
                    <Input 
                      value={infoContent.workingHours.weekend}
                      onChange={e => setInfoContent({...infoContent, workingHours: {...infoContent.workingHours, weekend: e.target.value}})}
                      placeholder="العطلة"
                      className="flex-1"
                    />
                    <Input 
                      value={infoContent.workingHours.weekendLabel}
                      onChange={e => setInfoContent({...infoContent, workingHours: {...infoContent.workingHours, weekendLabel: e.target.value}})}
                      placeholder="تسمية العطلة"
                      className="flex-1"
                    />
                 </div>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 pb-2 border-dashed">
                  <span className="text-gray-600 dark:text-gray-300 font-medium">{infoContent.workingHours.days}</span>
                  <span className="font-bold text-gray-900 dark:text-white" dir="ltr">{infoContent.workingHours.hours}</span>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className="text-gray-600 dark:text-gray-300 font-medium">{infoContent.workingHours.weekend}</span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                    {infoContent.workingHours.weekendLabel}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
        </div>
      </div>

      {/* قسم أين تجدنا */}
      <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
        <h3 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white text-center">أين تجدنا</h3>
        <LocationMap className="w-full" showDirections={true} />
      </div>
        </Card>
      </div>
    </div>
  );
};

export default ContactPage;