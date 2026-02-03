import React, { useState, useContext, useEffect } from 'react';
import { AppContext } from '../App';
import type { Ticket, ContactMessage, TicketResponseRecord, TicketAttachmentMeta } from '../types';
import { RequestStatus } from '../types';
import Input from './ui/Input';
import TextArea from './ui/TextArea';
import Select from './ui/Select';
import Button from './ui/Button';
import { useDepartmentNames } from '../utils/departments';
import { sendEmailWithMailto, sendSMSNotification } from '../utils/emailService';

interface TicketDetailsModalProps {
  ticket: Ticket | ContactMessage;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: (updatedTicket: Ticket | ContactMessage) => void;
}

const TicketDetailsModal: React.FC<TicketDetailsModalProps> = ({
  ticket,
  isOpen,
  onClose,
  onUpdate
}) => {
  const appContext = useContext(AppContext);
  const config = appContext?.siteConfig;
  const directorateName = config?.directorateName || "مالية محافظة حلب";
  const fullDirectorateName = `مديرية ${directorateName}`;
  const departmentNames = useDepartmentNames();
  
  // التحقق من نوع الطلب
  const isTicket = (item: Ticket | ContactMessage): item is Ticket => {
    return 'requestType' in item;
  };

  // حالات التحكم في التوثيق والرد
  const [isEditingDocumentation, setIsEditingDocumentation] = useState(false);
  const [diwanNumber, setDiwanNumber] = useState('');
  const [diwanDate, setDiwanDate] = useState('');
  const [response, setResponse] = useState(''); // legacy single response (still used for archive logic)
  // Multi-response state
  const [newResponseBody, setNewResponseBody] = useState('');
  const [newResponseFiles, setNewResponseFiles] = useState<File[]>([]);
  const [newResponseInternal, setNewResponseInternal] = useState(false);
  const [loadingResponses, setLoadingResponses] = useState(false);
  const [responsesList, setResponsesList] = useState<TicketResponseRecord[]>([]);
  const [comment, setComment] = useState('');
  const [forwardToDepartment, setForwardToDepartment] = useState('');
  const [showResponseForm, setShowResponseForm] = useState(false);
  const [showForwardForm, setShowForwardForm] = useState(false);
  const [archiveNote, setArchiveNote] = useState('');
  const [showArchiveReason, setShowArchiveReason] = useState(false);

  // QR Code state
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [trackingQRCodeUrl, setTrackingQRCodeUrl] = useState('');

  useEffect(() => {
    if (isOpen) {
      // تحميل البيانات الحالية
      if (isTicket(ticket)) {
        setDiwanNumber(ticket.diwanNumber || '');
        setDiwanDate(ticket.diwanDate || '');
        setResponse(ticket.response || '');
      } else {
        setDiwanNumber(ticket.diwanNumber || '');
        setDiwanDate(ticket.diwanDate || '');
      }
      // إعادة ضبط حقول الأرشفة عند الفتح
      setArchiveNote('');
      setShowArchiveReason(false);
      // Fetch multi-responses if ticket and context supports it
      if (isTicket(ticket) && appContext?.fetchTicketResponses) {
        setLoadingResponses(true);
        appContext.fetchTicketResponses(ticket.id).then(list => {
          setResponsesList(list);
        }).finally(() => setLoadingResponses(false));
      }
    }
  }, [isOpen, ticket]);

  // Listen to AI Assist insert reply and department selection events
  useEffect(() => {
    const onInsertReply = (e: Event) => {
      const ce = e as CustomEvent<{ text: string }>;
      const replyText = ce.detail?.text || '';
      if (!replyText) return;
      // Prefer multi-response form
      setShowResponseForm(true);
      setNewResponseBody(prev => (prev ? prev + '\n' : '') + replyText);
    };
    const onSelectDept = (e: Event) => {
      const ce = e as CustomEvent<{ department: string }>;
      const dep = ce.detail?.department;
      if (!dep) return;
      setShowForwardForm(true);
      setForwardToDepartment(dep);
    };
    window.addEventListener('ai-assist-insert-reply', onInsertReply as EventListener);
    window.addEventListener('ai-assist-select-department', onSelectDept as EventListener);
    return () => {
      window.removeEventListener('ai-assist-insert-reply', onInsertReply as EventListener);
      window.removeEventListener('ai-assist-select-department', onSelectDept as EventListener);
    };
  }, []);

  // إنشاء QR Code
  const generateQRCode = async () => {
    if (diwanNumber && diwanDate) {
      const qrData = JSON.stringify({
        id: ticket.id,
        diwanNumber,
        diwanDate,
        type: isTicket(ticket) ? ticket.requestType : 'رسالة تواصل',
        submissionDate: (ticket as any).submissionDate
      });
      
      // يمكن استخدام مكتبة qrcode لإنتاج QR Code
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrData)}`;
      setQrCodeUrl(qrUrl);
    }
  };

  // إنشاء QR Code للتتبع
  const generateTrackingQRCode = async () => {
    const trackingData = JSON.stringify({
      ticketId: ticket.id,
      trackingUrl: `${window.location.origin}/#/track?id=${ticket.id}`,
      type: isTicket(ticket) ? ticket.requestType : 'رسالة تواصل',
      submissionDate: (ticket as any).submissionDate
    });
    
    const trackingQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(trackingData)}`;
    setTrackingQRCodeUrl(trackingQrUrl);
  };

  useEffect(() => {
    generateQRCode();
    generateTrackingQRCode();
  }, [diwanNumber, diwanDate]);

  // توليد HTML الطباعة (سنستخدمه للطباعة والأرشفة)
  const buildPrintHtml = () => {
    const isTk = isTicket(ticket);
    const printContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>تفاصيل ${isTk ? (ticket as Ticket).requestType : 'رسالة التواصل'} - ${ticket.id}</title>
        <style>
          body { font-family: 'Arial', sans-serif; direction: rtl; margin: 0; padding: 20px; background: white; }
          .header { text-align: center; padding: 20px; border-bottom: 3px solid #0f3c35; margin-bottom: 30px; }
          .logo { width: 80px; height: 80px; margin: 0 auto 2px; }
          .header h1 { color: #0f3c35; margin: 0 0 2px; font-size: 24px; }
          .header h2 { color: #0f3c35; margin: 5px 0; font-size: 20px; font-weight: normal; }
          .header h3 { color: #666; margin: 5px 0 0; font-size: 16px; font-weight: normal; }
          .tracking-section { background: #f0f8ff; border: 2px solid #0f3c35; border-radius: 10px; padding: 20px; margin: 20px 0; text-align: center; }
          .tracking-section h3 { color: #0f3c35; margin-top: 0; }
          .qr-container { display: flex; justify-content: space-around; margin: 20px 0; }
          .qr-item { text-align: center; }
          .details-section { background: #f9f9f9; border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .details-row { display: flex; margin: 10px 0; border-bottom: 1px solid #eee; padding-bottom: 8px; }
          .details-label { font-weight: bold; width: 150px; color: #0f3c35; }
          .details-value { flex: 1; }
          .content-section { background: white; border: 1px solid #ccc; border-radius: 8px; padding: 15px; margin: 20px 0; min-height: 100px; }
          .documentation-section { background: #fff8e7; border: 2px solid #d4a574; border-radius: 10px; padding: 20px; margin: 20px 0; }
          .row-sections { display: flex; gap: 20px; align-items: stretch; margin: 20px 0; }
          .section-col { flex: 1; }
          .tracking-section, .documentation-section { page-break-inside: avoid; }
          @media print { body { print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        <div class="header">
          <img class="logo" src="${window.location.origin}/syrian-eagle.png" alt="شعار الجمهورية العربية السورية" />
          <h1>الجمهورية العربية السورية</h1>
          <h2>${fullDirectorateName}</h2>
          <h3>إدارة الاستعلامات والشكاوى</h3>
        </div>

        ${diwanNumber || diwanDate ? `
        <div class="row-sections">
          <div class="section-col">
            <div class="tracking-section">
              <h3>معلومات التتبع</h3>
              <div class="details-row">
                <span class="details-label">رقم التتبع:</span>
                <span class="details-value">${ticket.id}</span>
              </div>
              <div class="details-row">
                <span class="details-label">رابط التتبع:</span>
                <span class="details-value">${window.location.origin}/#/track?id=${ticket.id}</span>
              </div>
              <div class="qr-container">
                ${trackingQRCodeUrl ? `
                <div class="qr-item">
                  <h4>QR كود التتبع</h4>
                  <img src="${trackingQRCodeUrl}" alt="QR كود التتبع" style="width: 120px; height: 120px;">
                </div>` : ''}
              </div>
            </div>
          </div>
          <div class="section-col">
            <div class="documentation-section">
              <h3 style="color: #8b4513; margin-top: 0;">معلومات التوثيق</h3>
              ${diwanNumber ? `
              <div class="details-row">
                <span class="details-label">رقم الديوان:</span>
                <span class="details-value">${diwanNumber}</span>
              </div>` : ''}
              ${diwanDate ? `
              <div class="details-row">
                <span class="details-label">تاريخ الديوان:</span>
                <span class="details-value">${diwanDate}</span>
              </div>` : ''}
              <div class="qr-container">
                ${qrCodeUrl ? `
                <div class="qr-item">
                  <h4>QR كود التوثيق</h4>
                  <img src="${qrCodeUrl}" alt="QR كود التوثيق" style="width: 120px; height: 120px;">
                </div>` : ''}
              </div>
            </div>
          </div>
        </div>` : `
        <div class="tracking-section">
          <h3>معلومات التتبع</h3>
          <div class="details-row">
            <span class="details-label">رقم التتبع:</span>
            <span class="details-value">${ticket.id}</span>
          </div>
          <div class="details-row">
            <span class="details-label">رابط التتبع:</span>
            <span class="details-value">${window.location.origin}/#/track?id=${ticket.id}</span>
          </div>
          <div class="qr-container">
            ${trackingQRCodeUrl ? `
            <div class="qr-item">
              <h4>QR كود التتبع</h4>
              <img src="${trackingQRCodeUrl}" alt="QR كود التتبع" style="width: 120px; height: 120px;">
            </div>` : ''}
          </div>
        </div>`}

        <div class="details-section">
          <h3 style="color: #0f3c35; margin-top: 0;">معلومات الطلب</h3>
          <div class="details-row">
            <span class="details-label">نوع الطلب:</span>
            <span class="details-value">${isTk ? (ticket as Ticket).requestType : 'رسالة تواصل'}</span>
          </div>
          <div class="details-row">
            <span class="details-label">مقدم الطلب:</span>
            <span class="details-value">${'fullName' in ticket ? (ticket as any).fullName : (ticket as any).name}</span>
          </div>
          <div class="details-row">
            <span class="details-label">البريد الإلكتروني:</span>
            <span class="details-value">${ticket.email || 'غير متوفر'}</span>
          </div>
          ${('phone' in ticket && (ticket as any).phone) ? `
          <div class="details-row">
            <span class="details-label">رقم الهاتف:</span>
            <span class="details-value">${(ticket as any).phone}</span>
          </div>` : ''}
          <div class="details-row">
            <span class="details-label">القسم المختص:</span>
            <span class="details-value">${ticket.department}</span>
          </div>
          <div class="details-row">
            <span class="details-label">تاريخ التقديم:</span>
            <span class="details-value">${new Date((ticket as any).submissionDate || (ticket as any).submittedAt).toLocaleDateString('ar-SY-u-nu-latn')}</span>
          </div>
          <div class="details-row">
            <span class="details-label">الحالة:</span>
            <span class="details-value">${isTk ? ((ticket as Ticket).status === RequestStatus.New ? 'جديد' : (ticket as Ticket).status === RequestStatus.InProgress ? 'قيد المعالجة' : (ticket as Ticket).status === RequestStatus.Answered ? 'تم الرد' : 'مغلق') : 'رسالة تواصل'}</span>
          </div>
        </div>

        <div class="content-section">
          <h4 style="color: #0f3c35; margin-top: 0;">محتوى الطلب:</h4>
          <div style="line-height: 1.6; white-space: pre-wrap;">
            ${'details' in ticket ? (ticket as any).details : (ticket as any).message}
          </div>
        </div>

        ${isTk && (ticket as Ticket).response ? `
        <div class="content-section" style="background: #f0f8ff;">
          <h4 style="color: #0f3c35; margin-top: 0;">الرد:</h4>
          <div style="line-height: 1.6; white-space: pre-wrap;">
            ${(ticket as Ticket).response}
          </div>
          ${(ticket as Ticket).answeredAt ? `
          <p style="text-align: left; color: #666; font-size: 12px; margin-top: 15px;">
            تاريخ الرد: ${new Date((ticket as Ticket).answeredAt as any).toLocaleDateString('ar-SY-u-nu-latn')}
          </p>` : ''}
        </div>` : ''}

        <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #ccc; color: #666; font-size: 12px;">
          <p>${fullDirectorateName} - إدارة الاستعلامات والشكاوى</p>
          <p>تاريخ الطباعة: ${new Date().toLocaleDateString('ar-SY-u-nu-latn')} - ${new Date().toLocaleTimeString('ar-SY')}</p>
        </div>
      </body>
      </html>
    `;
    return printContent;
  };

  // حفظ التوثيق
  const handleSaveDocumentation = () => {
    if (!appContext?.updateTicket) return;

    const updatedTicket = {
      ...ticket,
      diwanNumber,
      diwanDate,
      documentedAt: new Date().toISOString()
    };

    if (isTicket(updatedTicket)) {
      appContext.updateTicket(updatedTicket.id, updatedTicket);
    } else {
      // For ContactMessage, we'll need a similar function
      // For now, we'll handle it in the parent component
    }
    
    setIsEditingDocumentation(false);
    onUpdate?.(updatedTicket);
  };

  // إرسال الرد
  const handleSubmitResponse = async () => {
    if (!appContext?.updateTicket || !isTicket(ticket) || !response.trim()) return;

    try {
      // تحديث حالة التذكرة
      const updatedTicket = {
        ...ticket,
        response,
        status: RequestStatus.Answered,
        answeredAt: new Date()
      };

      appContext.updateTicket(ticket.id, updatedTicket);

      // إرسال البريد الإلكتروني
      if (ticket.email) {
        await sendEmailResponse(ticket, response);
      }

      setShowResponseForm(false);
      onUpdate?.(updatedTicket);
      
      alert('تم إرسال الرد بنجاح!' + (ticket.email ? ' وتم إرسال إشعار بالبريد الإلكتروني.' : ''));
    } catch (error) {
      console.error('خطأ في إرسال الرد:', error);
      alert('تم حفظ الرد ولكن حدث خطأ في إرسال البريد الإلكتروني');
    }
  };

  // دالة إرسال البريد الإلكتروني
  const sendEmailResponse = async (ticketData: Ticket, responseText: string) => {
    const emailData = {
      to: ticketData.email || '',
      subject: `رد على ${ticketData.requestType} رقم ${ticketData.id} - ${fullDirectorateName}`,
      ticketId: ticketData.id,
      recipientName: ticketData.fullName,
      responseText: responseText,
      ticketType: ticketData.requestType,
      department: ticketData.department
    };

    // استخدام خدمة البريد الإلكتروني
    const result = sendEmailWithMailto(emailData);
    
    // إرسال إشعار SMS إضافي إذا كان رقم الهاتف متوفر
    if (ticketData.phone) {
      const smsMessage = `${fullDirectorateName}: تم الرد على ${ticketData.requestType} رقم ${ticketData.id}. يرجى مراجعة بريدكم الإلكتروني أو زيارة الموقع للتفاصيل.`;
      await sendSMSNotification(ticketData.phone, ticketData.id, smsMessage);
    }
    
    return result;
  };

  // إعادة الإرسال للقسم
  const handleForwardToDepart = () => {
    if (!appContext?.forwardTicket || !forwardToDepartment || !isTicket(ticket)) return;

    appContext.forwardTicket(ticket.id, forwardToDepartment, comment);
    setShowForwardForm(false);
    setForwardToDepartment('');
    setComment('');
  };

  // ======= مكونات عرض المرفقات =======
  
  // الحصول على أيقونة نوع الملف
  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return (
        <svg className="w-8 h-8 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    }
    if (mimeType === 'application/pdf') {
      return (
        <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      );
    }
    if (mimeType.includes('word') || mimeType.includes('document')) {
      return (
        <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    }
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) {
      return (
        <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      );
    }
    return (
      <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    );
  };

  // تنسيق حجم الملف
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} بايت`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} كيلوبايت`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} ميجابايت`;
  };

  // فتح المرفق المحفوظ
  const openAttachment = (att: TicketAttachmentMeta) => {
    if (att.base64) {
      // فتح من Base64
      const newWindow = window.open('', '_blank');
      if (newWindow) {
        if (att.type.startsWith('image/')) {
          newWindow.document.write(`
            <html dir="rtl">
              <head>
                <title>${att.name}</title>
                <style>
                  body { margin: 0; padding: 20px; background: #1a1a1a; display: flex; flex-direction: column; align-items: center; font-family: 'Segoe UI', Tahoma, sans-serif; }
                  img { max-width: 100%; max-height: 90vh; object-fit: contain; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.5); }
                  h3 { color: #fff; margin-bottom: 20px; }
                  .actions { margin-top: 20px; display: flex; gap: 10px; }
                  button { padding: 10px 20px; border: none; border-radius: 8px; cursor: pointer; font-size: 14px; }
                  .print-btn { background: #10b981; color: white; }
                  .download-btn { background: #3b82f6; color: white; }
                </style>
              </head>
              <body>
                <h3>${att.name}</h3>
                <img src="${att.base64}" alt="${att.name}" />
                <div class="actions">
                  <button class="print-btn" onclick="window.print()">🖨️ طباعة</button>
                  <button class="download-btn" onclick="downloadImage()">⬇️ تحميل</button>
                </div>
                <script>
                  function downloadImage() {
                    const link = document.createElement('a');
                    link.href = '${att.base64}';
                    link.download = '${att.name}';
                    link.click();
                  }
                </script>
              </body>
            </html>
          `);
        } else if (att.type === 'application/pdf') {
          newWindow.document.write(`
            <html dir="rtl">
              <head>
                <title>${att.name}</title>
                <style>
                  body { margin: 0; padding: 0; }
                  iframe { width: 100%; height: 100vh; border: none; }
                </style>
              </head>
              <body>
                <iframe src="${att.base64}" type="application/pdf"></iframe>
              </body>
            </html>
          `);
        } else {
          // تحميل مباشر للملفات الأخرى
          const link = document.createElement('a');
          link.href = att.base64;
          link.download = att.name;
          link.click();
        }
        newWindow.document.close();
      }
    } else if (att.url) {
      // فتح من URL
      window.open(att.url, '_blank');
    } else {
      alert('عذراً، هذا المرفق غير متوفر للعرض');
    }
  };

  // طباعة المرفق
  const printAttachment = (att: TicketAttachmentMeta) => {
    if (att.base64 && (att.type.startsWith('image/') || att.type === 'application/pdf')) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        if (att.type.startsWith('image/')) {
          printWindow.document.write(`
            <html dir="rtl">
              <head>
                <title>طباعة - ${att.name}</title>
                <style>
                  @media print {
                    body { margin: 0; }
                    img { max-width: 100%; height: auto; }
                  }
                </style>
              </head>
              <body onload="window.print(); window.close();">
                <img src="${att.base64}" alt="${att.name}" />
              </body>
            </html>
          `);
        } else {
          printWindow.document.write(`
            <html dir="rtl">
              <head>
                <title>طباعة - ${att.name}</title>
              </head>
              <body>
                <iframe src="${att.base64}" style="width:100%;height:100vh;border:none;" onload="setTimeout(()=>{window.print();window.close();},1000)"></iframe>
              </body>
            </html>
          `);
        }
        printWindow.document.close();
      }
    } else {
      alert('عذراً، لا يمكن طباعة هذا النوع من الملفات مباشرة. يرجى فتحه وطباعته من البرنامج المناسب.');
    }
  };

  // مكون بطاقة المرفق المحفوظ
  const AttachmentCard: React.FC<{ attachment: TicketAttachmentMeta; index: number }> = ({ attachment, index }) => (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200/50 dark:border-gray-700/50 bg-white/30 dark:bg-gray-800/30 hover:bg-white/50 dark:hover:bg-gray-700/50 transition-all group">
      <div className="flex-shrink-0">
        {getFileIcon(attachment.type)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate" title={attachment.name}>
          {attachment.name}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {formatFileSize(attachment.size)}
          {attachment.uploadedAt && (
            <span className="mr-2">
              • {new Date(attachment.uploadedAt).toLocaleDateString('ar-SY-u-nu-latn')}
            </span>
          )}
        </p>
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => openAttachment(attachment)}
          className="p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors"
          title="فتح وعرض"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </button>
        <button
          onClick={() => printAttachment(attachment)}
          className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
          title="طباعة"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
        </button>
        {(attachment.base64 || attachment.url) && (
          <a
            href={attachment.base64 || attachment.url}
            download={attachment.name}
            className="p-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors"
            title="تحميل"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </a>
        )}
      </div>
    </div>
  );

  // مكون بطاقة الملف المحلي (File object)
  const LocalFileCard: React.FC<{ file: File; index: number }> = ({ file, index }) => {
    const [previewUrl, setPreviewUrl] = useState<string>('');
    
    useEffect(() => {
      // إنشاء URL مؤقت للملف
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }, [file]);
    
    const openLocalFile = () => {
      if (file.type.startsWith('image/') || file.type === 'application/pdf') {
        window.open(previewUrl, '_blank');
      } else {
        // تحميل مباشر
        const link = document.createElement('a');
        link.href = previewUrl;
        link.download = file.name;
        link.click();
      }
    };
    
    const printLocalFile = () => {
      if (file.type.startsWith('image/')) {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(`
            <html dir="rtl">
              <head><title>طباعة - ${file.name}</title></head>
              <body onload="window.print(); window.close();">
                <img src="${previewUrl}" style="max-width:100%;" />
              </body>
            </html>
          `);
          printWindow.document.close();
        }
      } else if (file.type === 'application/pdf') {
        const printWindow = window.open(previewUrl, '_blank');
        printWindow?.print();
      } else {
        alert('عذراً، لا يمكن طباعة هذا النوع من الملفات مباشرة.');
      }
    };
    
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200/50 dark:border-gray-700/50 bg-white/30 dark:bg-gray-800/30 hover:bg-white/50 dark:hover:bg-gray-700/50 transition-all group">
        <div className="flex-shrink-0">
          {getFileIcon(file.type)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate" title={file.name}>
            {file.name}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {formatFileSize(file.size)}
            <span className="mr-2 text-amber-600 dark:text-amber-400">• ملف محلي (غير محفوظ)</span>
          </p>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={openLocalFile}
            className="p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors"
            title="فتح وعرض"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </button>
          <button
            onClick={printLocalFile}
            className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
            title="طباعة"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
          </button>
          <a
            href={previewUrl}
            download={file.name}
            className="p-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors"
            title="تحميل"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </a>
        </div>
      </div>
    );
  };

  // ======= نهاية مكونات المرفقات =======

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto animate-fade-in transition-all duration-300">
        {/* رأس النافذة */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6 rounded-t-2xl z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white animate-slide-up">
                تفاصيل {isTicket(ticket) ? 
                  (ticket.requestType === 'استعلام' ? 'الاستعلام' : 'الشكوى') : 
                  'رسالة التواصل'
                } #{ticket.id}
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                {isTicket(ticket) && ticket.source === 'موظف' ? 'من موظف' : 'من مواطن'} - 
                {new Date((ticket as any).submissionDate || (ticket as any).submittedAt).toLocaleDateString('ar-SY-u-nu-latn')}
              </p>
              <div className="mt-2 p-3 rounded-xl border border-gray-200/30 dark:border-gray-700/30 bg-white/20 dark:bg-gray-800/20 backdrop-blur">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      <span className="font-semibold">رقم التتبع:</span>
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-lg font-bold text-emerald-700 dark:text-emerald-300">{ticket.id}</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(ticket.id);
                          alert('تم نسخ رقم التتبع');
                        }}
                        className="p-1 hover:bg-white/40 dark:hover:bg-gray-700/40 rounded transition-colors"
                        title="نسخ رقم التتبع"
                      >
                        <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="text-center">
                    <span className="text-xs text-gray-500 dark:text-gray-400">QR للتتبع السريع</span>
                    {trackingQRCodeUrl && (
                      <img 
                        src={trackingQRCodeUrl} 
                        alt="QR Code للتتبع" 
                        className="w-12 h-12 mt-1 hover:scale-110 transition-transform duration-300 animate-pulse-soft" 
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* بطاقة معلومات التتبع */}
          <div className="rounded-xl p-4 border border-gray-200/30 dark:border-gray-700/30 bg-white/20 dark:bg-gray-800/20 backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">معلومات التتبع</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">رقم التتبع:</span>
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-lg font-bold text-emerald-700 dark:text-emerald-300">{ticket.id}</p>
                      <button
                        onClick={() => navigator.clipboard.writeText(ticket.id)}
                        className="p-1 hover:bg-white/40 dark:hover:bg-gray-700/40 rounded transition-colors"
                        title="نسخ رقم التتبع"
                      >
                        <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">تاريخ التقديم:</span>
                    <p className="font-semibold text-gray-800 dark:text-gray-200">
                      {new Date((ticket as any).submissionDate || (ticket as any).submittedAt).toLocaleDateString('ar-SY-u-nu-latn')}
                    </p>
                  </div>
                </div>
                <div className="mt-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">رابط التتبع:</span>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-mono flex-1">
                      {window.location.origin}/#/track?id={ticket.id}
                    </p>
                    <button
                      onClick={() => navigator.clipboard.writeText(`${window.location.origin}/#/track?id=${ticket.id}`)}
                      className="p-1 hover:bg-white/40 dark:hover:bg-gray-700/40 rounded transition-colors flex-shrink-0"
                      title="نسخ رابط التتبع"
                    >
                      <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
              {trackingQRCodeUrl && (
                <div className="text-center">
                  <img 
                    src={trackingQRCodeUrl} 
                    alt="QR Code للتتبع" 
                    className="w-20 h-20 hover:scale-105 transition-transform duration-300 animate-pulse-soft" 
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">QR للتتبع</p>
                  <button
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = trackingQRCodeUrl;
                      link.download = `tracking-qr-${ticket.id}.png`;
                      link.click();
                    }}
                    className="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-200 mt-1 block"
                  >
                    تحميل
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* معلومات أساسية */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">المعلومات الأساسية</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  اسم المقدم
                </label>
                <div className="p-3 rounded-lg border border-gray-200/30 dark:border-gray-700/30 bg-white/20 dark:bg-gray-800/20 backdrop-blur">
                  {'fullName' in ticket ? ticket.fullName : ticket.name}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  البريد الإلكتروني
                </label>
                <div className="p-3 rounded-lg border border-gray-200/30 dark:border-gray-700/30 bg-white/20 dark:bg-gray-800/20 backdrop-blur flex items-center justify-between gap-2">
                  <span className="truncate">{ticket.email || 'غير متوفر'}</span>
                  {ticket.email && (
                    <a 
                      href={`mailto:${ticket.email}`}
                      className="p-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors flex-shrink-0"
                      title="إرسال بريد"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </a>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  القسم المختص
                </label>
                <div className="p-3 rounded-lg border border-gray-200/30 dark:border-gray-700/30 bg-white/20 dark:bg-gray-800/20 backdrop-blur">
                  {ticket.department}
                </div>
              </div>

              {isTicket(ticket) && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      نوع الطلب
                    </label>
                    <div className="p-3 rounded-lg border border-gray-200/30 dark:border-gray-700/30 bg-white/20 dark:bg-gray-800/20 backdrop-blur">
                      {ticket.requestType}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      الحالة
                    </label>
                    <div className={`p-3 rounded-lg border border-gray-200/30 dark:border-gray-700/30 bg-white/20 dark:bg-gray-800/20 backdrop-blur ${
                      ticket.status === RequestStatus.New ? 'text-blue-700 dark:text-blue-300' :
                      ticket.status === RequestStatus.InProgress ? 'text-yellow-700 dark:text-yellow-300' :
                      ticket.status === RequestStatus.Answered ? 'text-emerald-700 dark:text-emerald-300' :
                      'text-gray-800 dark:text-gray-300'
                    }`}>
                      {ticket.status === RequestStatus.New ? 'جديد' :
                       ticket.status === RequestStatus.InProgress ? 'قيد المعالجة' :
                       ticket.status === RequestStatus.Answered ? 'تم الرد' : 'مغلق'}
                    </div>
                  </div>

                  {/* معلومات الرقم الوطني */}
                  {ticket.nationalId && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        الرقم الوطني
                      </label>
                      <div className="p-3 rounded-lg border border-gray-200/30 dark:border-gray-700/30 bg-white/20 dark:bg-gray-800/20 backdrop-blur font-mono">
                        {ticket.nationalId}
                      </div>
                    </div>
                  )}

                  {/* رقم الهاتف */}
                  {ticket.phone && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        رقم الهاتف
                      </label>
                      <div className="p-3 rounded-lg border border-gray-200/30 dark:border-gray-700/30 bg-white/20 dark:bg-gray-800/20 backdrop-blur direction-ltr font-mono flex items-center justify-between gap-2">
                        <span>{ticket.phone}</span>
                        <div className="flex gap-1">
                          <a 
                            href={`tel:${ticket.phone}`}
                            className="p-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                            title="اتصال"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                          </a>
                          <a 
                            href={`https://wa.me/${ticket.phone.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                            title="واتساب"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                            </svg>
                          </a>
                          <a 
                            href={`sms:${ticket.phone}`}
                            className="p-1.5 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors"
                            title="رسالة SMS"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                          </a>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">التوثيق والمعلومات الإضافية</h3>
              
              {/* معلومات التوثيق */}
              <div className="p-4 rounded-lg border border-gray-200/30 dark:border-gray-700/30 bg-white/20 dark:bg-gray-800/20 backdrop-blur">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-800 dark:text-gray-200">توثيق الديوان</h4>
                  {!isEditingDocumentation && (
                    <button
                      onClick={() => setIsEditingDocumentation(true)}
                      className="px-3 py-1 text-xs bg-emerald-600 text-white rounded-full hover:bg-emerald-700"
                    >
                      تعديل
                    </button>
                  )}
                </div>

                {isEditingDocumentation ? (
                  <div className="space-y-3">
                    <Input
                      id="diwanNumber"
                      label="رقم الديوان"
                      type="text"
                      placeholder="رقم الديوان"
                      value={diwanNumber}
                      onChange={(e) => setDiwanNumber(e.target.value)}
                    />
                    <Input
                      id="diwanDate"
                      label="تاريخ الديوان"
                      type="date"
                      placeholder="تاريخ الديوان"
                      value={diwanDate}
                      onChange={(e) => setDiwanDate(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button onClick={handleSaveDocumentation} variant="primary">
                        حفظ
                      </Button>
                      <Button onClick={() => setIsEditingDocumentation(false)} variant="secondary">
                        إلغاء
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">رقم الديوان:</span>
                      <span className="font-medium">{diwanNumber || 'غير موثق'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">تاريخ الديوان:</span>
                      <span className="font-medium">{diwanDate || 'غير محدد'}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* QR Code للتوثيق */}
              {qrCodeUrl && diwanNumber && diwanDate && (
                <div className="text-center p-4 rounded-lg border border-gray-200/30 dark:border-gray-700/30 bg-white/20 dark:bg-gray-800/20 backdrop-blur">
                  <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-3">رمز QR للتوثيق الرسمي</h4>
                  <img src={qrCodeUrl} alt="QR Code للتوثيق" className="mx-auto" />
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                    يحتوي على رقم الديوان والتاريخ للتوثيق الرسمي
                  </p>
                </div>
              )}

              {/* معلومات الإحالة */}
              {isTicket(ticket) && ticket.forwardedTo && ticket.forwardedTo.length > 0 && (
                <div className="p-4 rounded-lg border border-gray-200/30 dark:border-gray-700/30 bg-white/20 dark:bg-gray-800/20 backdrop-blur">
                  <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-2">الأقسام المحال إليها</h4>
                  <div className="space-y-1">
                    {ticket.forwardedTo.map((dept, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                        </svg>
                        <span className="text-gray-800 dark:text-gray-200">{dept}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* المحتوى */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
              {isTicket(ticket) ? 'تفاصيل الطلب' : 'محتوى الرسالة'}
            </h3>
            <div className="p-4 rounded-lg border border-gray-200/30 dark:border-gray-700/30 bg-white/20 dark:bg-gray-800/20 backdrop-blur">
              {'subject' in ticket && (
                <div className="mb-3">
                  <h4 className="font-medium text-gray-800 dark:text-white">الموضوع:</h4>
                  <p className="text-gray-600 dark:text-gray-300">{(ticket as any).subject}</p>
                </div>
              )}
              <div>
                <h4 className="font-medium text-gray-800 dark:text-white mb-2">المحتوى:</h4>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                  {'details' in ticket ? (ticket as any).details : (ticket as any).message}
                </p>
              </div>
            </div>
          </div>

          {/* المرفقات */}
          {isTicket(ticket) && ((ticket.attachments && ticket.attachments.length > 0) || (ticket.attachments_data && ticket.attachments_data.length > 0)) && (
            <div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
                المرفقات ({(ticket.attachments_data?.length || 0) + (ticket.attachments?.length || 0)})
              </h3>
              <div className="p-4 rounded-lg border border-gray-200/30 dark:border-gray-700/30 bg-white/20 dark:bg-gray-800/20 backdrop-blur">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* عرض المرفقات المحفوظة (من قاعدة البيانات) */}
                  {ticket.attachments_data?.map((att, idx) => (
                    <AttachmentCard key={`data-${idx}`} attachment={att} index={idx} />
                  ))}
                  
                  {/* عرض المرفقات المحلية (File objects) */}
                  {ticket.attachments?.map((file, idx) => (
                    <LocalFileCard key={`file-${idx}`} file={file} index={idx} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* الرد الحالي */}
          {isTicket(ticket) && ticket.response && (
            <div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">الرد</h3>
              <div className="p-4 rounded-lg border border-gray-200/30 dark:border-gray-700/30 bg-white/20 dark:bg-gray-800/20 backdrop-blur">
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                  {ticket.response}
                </p>
                {ticket.answeredAt && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    تم الرد في: {new Date(ticket.answeredAt).toLocaleString('ar-SY-u-nu-latn')}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* أدوات التحكم */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">الإجراءات</h3>
            
            <div className="flex flex-wrap gap-3">
              {isTicket(ticket) && (
                <Button
                  onClick={() => setShowResponseForm(!showResponseForm)}
                  variant="primary"
                  className="bg-green-600 hover:bg-green-700"
                >
                  {showResponseForm ? 'إخفاء نموذج الرد' : 'إضافة رد جديد'}
                </Button>
              )}

              <Button
                onClick={() => setShowForwardForm(!showForwardForm)}
                variant="secondary"
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {showForwardForm ? 'إخفاء الإرسال' : 'إرسال لقسم آخر'}
              </Button>

              <Button
                onClick={() => {
                  // عرض المعاينة بتنسيق كامل دون الطباعة التلقائية
                  const printContent = buildPrintHtml();
                  const previewWindow = window.open('', '_blank');
                  if (previewWindow) {
                    previewWindow.document.write(printContent);
                    previewWindow.document.close();
                  }
                }}
                variant="secondary"
              >
                عرض التفاصيل
              </Button>

              {/* حفظ وأرشفة مع نسخة قابلة للطباعة */}
              <Button
                onClick={() => {
                  // شروط الأرشفة: للطلبات فقط يُسمح عند الحالة "مغلق"
                  if (isTicket(ticket)) {
                    const hasReply = !!(ticket.response && String(ticket.response).trim());
                    // إن لم تكن الحالة مغلق: أظهر سبب الإغلاق وامنع الأرشفة
                    if (ticket.status !== RequestStatus.Closed) {
                      setShowArchiveReason(true);
                      alert('لا يمكن الأرشفة إلا بعد إغلاق الطلب. يرجى إغلاق الطلب أولاً. يمكنك كتابة سبب الإغلاق دون رد الآن وسيُطلب عند الأرشفة.');
                      return;
                    }
                    // حالة مغلق بدون رد: نظهر الإدخال ونشترط السبب
                    if (!hasReply) {
                      if (!showArchiveReason) {
                        setShowArchiveReason(true);
                        return;
                      }
                      if (!archiveNote.trim()) {
                        alert('تم الإغلاق دون رد. يرجى كتابة سبب الإغلاق قبل الأرشفة.');
                        return;
                      }
                    }
                    const html = buildPrintHtml();
                    const now = new Date().toISOString();
                    // دمج السبب ضمن الرأي الداخلي للحفظ
                    const newOpinion = !hasReply && archiveNote.trim()
                      ? `${ticket.opinion ? ticket.opinion + '\n' : ''}[سبب الإغلاق دون رد ${new Date().toLocaleString('ar-SY-u-nu-latn')}]: ${archiveNote.trim()}`
                      : ticket.opinion;
                    appContext?.updateTicket?.(ticket.id, { archived: true, archivedAt: now, printSnapshotHtml: html, opinion: newOpinion });
                    alert('تم الحفظ والأرشفة مع نسخة قابلة للطباعة. ستظهر في الأرشيف.');
                    return;
                  }
                  // رسائل التواصل: يُسمح كما هو
                  const html = buildPrintHtml();
                  const now = new Date().toISOString();
                  appContext?.updateContactMessage?.(ticket.id, { archived: true, archivedAt: now, printSnapshotHtml: html });
                  alert('تم الحفظ والأرشفة مع نسخة قابلة للطباعة. ستظهر في الأرشيف.');
                }}
                variant="primary"
                className={"bg-emerald-600 hover:bg-emerald-700"}
              >
                حفظ وأرشفة
              </Button>

            {/* سبب الإغلاق دون رد: يظهر فقط بعد الضغط على حفظ وأرشفة */}
            {showArchiveReason && isTicket(ticket) && (
              (() => {
                const hasReply = !!(ticket.response && String(ticket.response).trim());
                if (ticket.status !== RequestStatus.Closed) {
                  return (
                    <div className="mt-4 p-3 rounded border border-amber-300/50 dark:border-amber-600/50 bg-white/20 dark:bg-gray-800/20 backdrop-blur">
                      <div className="flex items-center gap-2 mb-2 text-amber-800 dark:text-amber-300">
                        <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a8 8 0 100 16 8 8 0 000-16zM9 5h2v6H9V5zm0 8h2v2H9v-2z"/></svg>
                        <span className="text-sm font-medium">لا يمكن الأرشفة إلا بعد إغلاق الطلب. يمكنك كتابة سبب نية الإغلاق دون رد:</span>
                      </div>
                      <TextArea
                        id="archiveNotePending"
                        placeholder="اكتب سبب الإغلاق دون رد..."
                        value={archiveNote}
                        onChange={(e) => setArchiveNote(e.target.value)}
                        rows={3}
                      />
                      <div className="mt-1 text-xs text-amber-700 dark:text-amber-300">لن يتم تفعيل الأرشفة قبل إغلاق الطلب.</div>
                    </div>
                  );
                }
                if (!hasReply) {
                  return (
                    <div className="mt-4 p-3 rounded border border-amber-300/50 dark:border-amber-600/50 bg-white/20 dark:bg-gray-800/20 backdrop-blur">
                      <div className="flex items-center gap-2 mb-2 text-amber-800 dark:text-amber-300">
                        <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a8 8 0 100 16 8 8 0 000-16zM9 5h2v6H9V5zm0 8h2v2H9v-2z"/></svg>
                        <span className="text-sm font-medium">تم إغلاق الطلب دون رد. يرجى كتابة سبب الإغلاق قبل الأرشفة:</span>
                      </div>
                      <TextArea
                        id="archiveNoteClosed"
                        placeholder="اكتب سبب الإغلاق دون رد..."
                        value={archiveNote}
                        onChange={(e) => setArchiveNote(e.target.value)}
                        rows={3}
                      />
                      <div className="mt-1 text-xs text-amber-700 dark:text-amber-300">لن يتم تفعيل الأرشفة ما لم يتم إدخال سبب واضح.</div>
                    </div>
                  );
                }
                return null;
              })()
            )}
              {/* تمت إزالة زر نسخ معلومات التتبع حسب الطلب */}
            </div>

            {/* التواصل مع المواطن */}
            {isTicket(ticket) && (ticket.email || ticket.phone) && (
              <div className="mt-6 p-4 rounded-xl border-2 border-dashed border-emerald-300/50 dark:border-emerald-600/50 bg-emerald-50/30 dark:bg-emerald-900/10">
                <h4 className="font-semibold text-emerald-800 dark:text-emerald-300 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  التواصل مع المواطن
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {ticket.email && (
                    <a
                      href={`mailto:${ticket.email}?subject=${encodeURIComponent(`رد على طلبك رقم ${ticket.id} - ${directorateName}`)}`}
                      className="flex items-center justify-center gap-2 p-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-medium"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      بريد إلكتروني
                    </a>
                  )}
                  {ticket.phone && (
                    <a
                      href={`sms:${ticket.phone}?body=${encodeURIComponent(`مديرية مالية حلب - رد على طلبك رقم ${ticket.id}: `)}`}
                      className="flex items-center justify-center gap-2 p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      رسالة SMS
                    </a>
                  )}
                  {ticket.phone && (
                    <a
                      href={`https://wa.me/${ticket.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`مديرية مالية حلب - رد على طلبك رقم ${ticket.id}:\n\n`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 p-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                      واتساب
                    </a>
                  )}
                </div>
                <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-3 text-center">
                  💡 عند إضافة رد عام، سيتم إشعار المواطن تلقائياً حسب الإعدادات
                </p>
              </div>
            )}

            {/* ردود متعددة */}
            {isTicket(ticket) && (
              <div className="mt-6">
                <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2 flex items-center gap-2">
                  <svg className="w-5 h-5 text-primary-600 dark:text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16h6m2 5l-4-4H9l-4 4V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>
                  الردود المسجلة
                  {loadingResponses && <span className="text-xs text-gray-500">(تحميل...)</span>}
                </h4>
                <div className="space-y-3">
                  {(!responsesList || !responsesList.length) && !loadingResponses && (
                    <div className="p-3 text-sm text-gray-600 dark:text-gray-400 rounded border border-dashed border-gray-300/60 dark:border-gray-600/60 bg-white/10 dark:bg-gray-800/10 backdrop-blur">
                      لا توجد ردود بعد.
                    </div>
                  )}
                  {responsesList.map(r => (
                    <div key={r.id} className="p-3 rounded border border-gray-200/30 dark:border-gray-700/30 bg-white/20 dark:bg-gray-800/20 backdrop-blur shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200">{new Date(r.createdAt).toLocaleString('ar-SY-u-nu-latn')}</span>
                          {r.visibility !== 'PUBLIC' && (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-100 dark:bg-amber-700/40 text-amber-800 dark:text-amber-200">
                              {r.visibility === 'INTERNAL' ? 'داخلي' : 'سري'}
                            </span>
                          )}
                          {r.redactionFlags && r.redactionFlags.length > 0 && (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-purple-100 dark:bg-purple-700/40 text-purple-800 dark:text-purple-200">تم حجب بيانات</span>
                          )}
                          {r.id.startsWith('temp-') && (
                            <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-100 dark:bg-blue-700/40 text-blue-800 dark:text-blue-200 animate-pulse">جاري الإرسال...</span>
                          )}
                        </div>
                      </div>
                      <div className="prose prose-sm max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: r.bodySanitized }} />
                    </div>
                  ))}
                </div>
                <div className="mt-4">
                  <Button variant="primary" onClick={() => setShowResponseForm(s => !s)}>
                    {showResponseForm ? 'إخفاء نموذج الرد' : 'إضافة رد'}
                  </Button>
                </div>
                {showResponseForm && (
                  <div className="mt-4 p-4 rounded-lg border border-gray-200/30 dark:border-gray-700/30 bg-white/20 dark:bg-gray-800/20 backdrop-blur">
                    <h5 className="font-medium text-gray-800 dark:text-gray-200 mb-2">إضافة رد جديد</h5>
                    <div className="flex items-center gap-2 mb-2 text-xs">
                      <label className="flex items-center gap-1 cursor-pointer select-none">
                        <input type="checkbox" className="scale-110" checked={newResponseInternal} onChange={e => setNewResponseInternal(e.target.checked)} />
                        <span className="text-gray-700 dark:text-gray-300">رد داخلي (غير مرئي للمواطن)</span>
                      </label>
                    </div>
                    <TextArea
                      id="newResponseBody"
                      placeholder="اكتب الرد هنا... سيتم حجب البيانات الحساسة تلقائياً"
                      value={newResponseBody}
                      onChange={(e) => setNewResponseBody(e.target.value)}
                      rows={4}
                    />
                    <div className="mt-2">
                      <input
                        type="file"
                        multiple
                        onChange={e => {
                          const files = e.target.files ? Array.from(e.target.files) : [];
                          setNewResponseFiles(files);
                        }}
                        className="block w-full text-sm text-gray-600 dark:text-gray-300 file:mr-4 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 dark:file:bg-primary-900 dark:file:text-primary-200"
                      />
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button
                        onClick={async () => {
                          if (!appContext?.addTicketResponse) return;
                          const res = await appContext.addTicketResponse(ticket.id, { body: newResponseBody, isInternal: newResponseInternal, files: newResponseFiles });
                          if (res) {
                            setNewResponseBody('');
                            setNewResponseFiles([]);
                            setNewResponseInternal(false);
                            // refresh list from context (it already updated optimistically)
                            if (appContext.ticketResponses && appContext.ticketResponses[ticket.id]) {
                              setResponsesList(appContext.ticketResponses[ticket.id]);
                            }
                            setShowResponseForm(false);
                          }
                        }} variant="primary">
                        حفظ الرد
                      </Button>
                      <Button onClick={() => setShowResponseForm(false)} variant="secondary">إلغاء</Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* نموذج الإرسال */}
            {showForwardForm && (
              <div className="mt-6 p-4 rounded-lg border border-gray-200/30 dark:border-gray-700/30 bg-white/20 dark:bg-gray-800/20 backdrop-blur">
                <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-3">إرسال لقسم آخر</h4>
                <div className="space-y-3">
                  <Select id="forwardToDepartment" label="اختر القسم" value={forwardToDepartment} onChange={(e) => setForwardToDepartment(e.target.value)}>
                    <option value="">اختر القسم</option>
                    {departmentNames.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </Select>
                  <TextArea
                    id="forwardComment"
                    placeholder="تعليق أو ملاحظة (اختياري)"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <Button onClick={handleForwardToDepart} variant="primary">
                      إرسال
                    </Button>
                    <Button onClick={() => setShowForwardForm(false)} variant="secondary">
                      إلغاء
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TicketDetailsModal;