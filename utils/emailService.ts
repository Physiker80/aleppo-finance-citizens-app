// إعدادات البريد الإلكتروني
// يمكن استخدام خدمات مختلفة لإرسال البريد الإلكتروني
import { formatDate } from './arabicNumerals';

export interface EmailConfig {
  service: 'emailjs' | 'smtp' | 'sendgrid' | 'mailgun';
  apiKey?: string;
  serviceId?: string;
  templateId?: string;
  userId?: string;
  fromEmail: string;
  fromName: string;
}

// إعدادات EmailJS (مجاني ومناسب للتطبيقات البسيطة)
export const emailConfig: EmailConfig = {
  service: 'emailjs',
  serviceId: 'service_aleppo_finance', // يجب استبداله بالـ service ID الحقيقي
  templateId: 'template_reply', // يجب استبداله بالـ template ID الحقيقي  
  userId: 'user_aleppo_finance', // يجب استبداله بالـ user ID الحقيقي
  fromEmail: 'noreply@finance.sy',
  fromName: 'المديرية المالية - نظام الاستعلامات والشكاوى'
};

// دالة إرسال البريد الإلكتروني باستخدام EmailJS
export const sendEmailWithEmailJS = async (emailData: {
  to: string;
  subject: string;
  html: string;
  ticketId: string;
  recipientName: string;
  responseText: string;
  directorateName?: string;
}) => {
  try {
    // تحميل EmailJS إذا لم يكن موجوداً
    if (typeof window !== 'undefined' && !(window as any).emailjs) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js';
      script.onload = () => {
        (window as any).emailjs.init(emailConfig.userId);
      };
      document.head.appendChild(script);
      
      // انتظار تحميل المكتبة
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    const templateParams = {
      to_email: emailData.to,
      to_name: emailData.recipientName,
      subject: emailData.subject,
      ticket_id: emailData.ticketId,
      response_text: emailData.responseText,
      from_name: emailData.directorateName || emailConfig.fromName,
      reply_date: formatDate(new Date()),
      tracking_url: `${window.location.origin}/#/track?id=${emailData.ticketId}`
    };

    // إرسال البريد الإلكتروني
    const result = await (window as any).emailjs.send(
      emailConfig.serviceId,
      emailConfig.templateId,
      templateParams,
      emailConfig.userId
    );

    console.log('تم إرسال البريد الإلكتروني بنجاح:', result);
    return { success: true, result };
  } catch (error) {
    console.error('خطأ في إرسال البريد الإلكتروني:', error);
    return { success: false, error };
  }
};

// دالة بديلة باستخدام mailto (للتجربة السريعة)
export const sendEmailWithMailto = (emailData: {
  to: string;
  subject: string;
  ticketId: string;
  recipientName: string;
  responseText: string;
  ticketType: string;
  department: string;
  directorateName?: string;
}) => {
  const directorate = emailData.directorateName || 'المديرية المالية';
  const body = `السيد/ة ${emailData.recipientName} المحترم/ة،

نشكركم على تواصلكم مع ${directorate}.

بخصوص ${emailData.ticketType} رقم التتبع: ${emailData.ticketId}
القسم المختص: ${emailData.department}

الرد على طلبكم:
${emailData.responseText}

يمكنكم متابعة حالة طلبكم من خلال الرابط التالي:
${window.location.origin}/#/track?id=${emailData.ticketId}

رقم التتبع: ${emailData.ticketId}

مع أطيب التحيات،
${directorate}
نظام الاستعلامات والشكاوى

---
هذه رسالة تلقائية، يرجى عدم الرد عليها مباشرة.
للاستفسارات، يرجى استخدام نظام الاستعلامات على الموقع الرسمي.`;

  const mailtoLink = `mailto:${emailData.to}?subject=${encodeURIComponent(emailData.subject)}&body=${encodeURIComponent(body)}`;
  
  // فتح تطبيق البريد الإلكتروني المحلي
  window.open(mailtoLink);
  
  return { success: true, method: 'mailto' };
};

// دالة إرسال إشعار SMS (اختيارية)
export const sendSMSNotification = async (phoneNumber: string, ticketId: string, message: string) => {
  // يمكن دمج خدمة SMS مثل Twilio هنا
  console.log('إرسال SMS إلى:', phoneNumber, 'الرسالة:', message);
  
  // مثال على استخدام خدمة SMS محلية (يتطلب إعداد خادم)
  try {
    // await fetch('/api/send-sms', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ to: phoneNumber, message, ticketId })
    // });
    
    return { success: true, method: 'sms' };
  } catch (error) {
    console.error('خطأ في إرسال SMS:', error);
    return { success: false, error };
  }
};