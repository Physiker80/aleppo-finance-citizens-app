/**
 * خدمة الإشعارات المتعددة القنوات
 * Multi-channel Notification Service
 * 
 * يدعم: البريد الإلكتروني، SMS، WhatsApp
 */

import { sendTicketNotification, sendTextMessage } from './whatsappIntegration';

// =====================================================
// 📧 Email Service Configuration
// =====================================================

export interface EmailConfig {
  provider: 'emailjs' | 'resend' | 'smtp' | 'supabase' | 'disabled';
  emailjsServiceId?: string;
  emailjsTemplateId?: string;
  emailjsPublicKey?: string;
  resendApiKey?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  fromEmail?: string;
  fromName?: string;
  isEnabled: boolean;
}

// =====================================================
// 📱 SMS Service Configuration
// =====================================================

export interface SmsConfig {
  provider: 'twilio' | 'vonage' | 'gateway' | 'disabled';
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  twilioPhoneNumber?: string;
  vonageApiKey?: string;
  vonageApiSecret?: string;
  vonageFromNumber?: string;
  gatewayUrl?: string;
  gatewayApiKey?: string;
  isEnabled: boolean;
}

// =====================================================
// 💬 Notification Settings
// =====================================================

export interface NotificationSettings {
  email: EmailConfig;
  sms: SmsConfig;
  whatsapp: {
    isEnabled: boolean;
  };
  // إعدادات الإشعارات التلقائية
  autoNotify: {
    onTicketCreated: boolean;      // إشعار عند إنشاء طلب
    onTicketResponse: boolean;     // إشعار عند الرد على طلب
    onStatusChange: boolean;       // إشعار عند تغيير الحالة
    channels: ('email' | 'sms' | 'whatsapp')[];  // القنوات المفعلة
  };
}

const NOTIFICATION_SETTINGS_KEY = 'notification_settings';

// الإعدادات الافتراضية
const DEFAULT_SETTINGS: NotificationSettings = {
  email: {
    provider: 'emailjs',
    isEnabled: false,
    fromEmail: 'noreply@aleppo-finance.gov.sy',
    fromName: 'مديرية مالية حلب'
  },
  sms: {
    provider: 'disabled',
    isEnabled: false
  },
  whatsapp: {
    isEnabled: false
  },
  autoNotify: {
    onTicketCreated: true,
    onTicketResponse: true,
    onStatusChange: true,
    channels: ['email']
  }
};

/**
 * تحميل إعدادات الإشعارات
 */
export function loadNotificationSettings(): NotificationSettings {
  try {
    const saved = localStorage.getItem(NOTIFICATION_SETTINGS_KEY);
    if (saved) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error('Error loading notification settings:', e);
  }
  return DEFAULT_SETTINGS;
}

/**
 * حفظ إعدادات الإشعارات
 */
export function saveNotificationSettings(settings: Partial<NotificationSettings>): void {
  const current = loadNotificationSettings();
  const updated = {
    ...current,
    ...settings,
    email: { ...current.email, ...settings.email },
    sms: { ...current.sms, ...settings.sms },
    whatsapp: { ...current.whatsapp, ...settings.whatsapp },
    autoNotify: { ...current.autoNotify, ...settings.autoNotify }
  };
  localStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(updated));
}

// =====================================================
// 📧 Email Functions
// =====================================================

/**
 * إرسال بريد إلكتروني
 */
export async function sendEmail(
  to: string,
  subject: string,
  body: string,
  options?: { ticketId?: string; html?: boolean }
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  const settings = loadNotificationSettings();
  
  if (!settings.email.isEnabled) {
    console.log('[Email] Service disabled, skipping send');
    return { success: false, error: 'خدمة البريد الإلكتروني غير مفعلة' };
  }
  
  if (!to || !to.includes('@')) {
    return { success: false, error: 'عنوان البريد الإلكتروني غير صالح' };
  }

  console.log(`[Email] Sending to ${to}: ${subject}`);

  switch (settings.email.provider) {
    case 'emailjs':
      return sendEmailViaEmailJS(to, subject, body, settings.email);
    
    case 'resend':
      return sendEmailViaResend(to, subject, body, settings.email);
    
    case 'supabase':
      return sendEmailViaSupabase(to, subject, body, settings.email);
    
    default:
      // محاكاة الإرسال للتطوير
      console.log(`[Email] Simulated send to ${to}`);
      return { success: true, messageId: `email-${Date.now()}` };
  }
}

/**
 * إرسال عبر EmailJS
 */
async function sendEmailViaEmailJS(
  to: string,
  subject: string,
  body: string,
  config: EmailConfig
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  if (!config.emailjsServiceId || !config.emailjsTemplateId || !config.emailjsPublicKey) {
    return { success: false, error: 'إعدادات EmailJS غير مكتملة' };
  }

  try {
    // استخدام fetch API بدلاً من مكتبة EmailJS
    // لأن EmailJS يمكن استدعاؤها عبر API أيضاً
    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        service_id: config.emailjsServiceId,
        template_id: config.emailjsTemplateId,
        user_id: config.emailjsPublicKey,
        template_params: {
          to_email: to,
          subject: subject,
          message: body,
          from_name: config.fromName || 'مديرية مالية حلب',
        }
      })
    });

    if (response.ok) {
      return { success: true, messageId: `emailjs-${Date.now()}` };
    } else {
      const errorText = await response.text();
      return { success: false, error: errorText || 'فشل إرسال البريد' };
    }
  } catch (error: any) {
    console.error('[EmailJS] Error:', error);
    return { success: false, error: error.text || error.message || 'فشل إرسال البريد' };
  }
}

/**
 * إرسال عبر Resend API
 */
async function sendEmailViaResend(
  to: string,
  subject: string,
  body: string,
  config: EmailConfig
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  if (!config.resendApiKey) {
    return { success: false, error: 'مفتاح Resend API غير موجود' };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: `${config.fromName || 'مديرية مالية حلب'} <${config.fromEmail || 'noreply@example.com'}>`,
        to: [to],
        subject: subject,
        html: body.replace(/\n/g, '<br>')
      })
    });

    const data = await response.json();
    
    if (response.ok && data.id) {
      return { success: true, messageId: data.id };
    }
    
    return { success: false, error: data.message || 'فشل إرسال البريد' };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * إرسال عبر Supabase Edge Function
 */
async function sendEmailViaSupabase(
  to: string,
  subject: string,
  body: string,
  config: EmailConfig
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  const SUPABASE_URL = 'https://whutmrbjvvplqugobwbq.supabase.co';
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndodXRtcmJqdnZwbHF1Z29id2JxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4NzA0NzgsImV4cCI6MjA4NTQ0NjQ3OH0.bzynb0G41o2c1m35AodyVVgZBNXzPvGbKWJWKpBqGH8';

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ to, subject, body })
    });

    if (response.ok) {
      const data = await response.json();
      return { success: true, messageId: data.id };
    }
    
    return { success: false, error: 'فشل إرسال البريد عبر Supabase' };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// =====================================================
// 📱 SMS Functions
// =====================================================

/**
 * إرسال رسالة SMS
 */
export async function sendSms(
  to: string,
  message: string,
  options?: { ticketId?: string }
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  const settings = loadNotificationSettings();
  
  if (!settings.sms.isEnabled) {
    console.log('[SMS] Service disabled, skipping send');
    return { success: false, error: 'خدمة SMS غير مفعلة' };
  }

  // تنسيق رقم الهاتف
  let phone = to.replace(/[\s\-()]/g, '');
  if (phone.startsWith('0')) {
    phone = '+963' + phone.slice(1);
  } else if (!phone.startsWith('+')) {
    phone = '+963' + phone;
  }

  console.log(`[SMS] Sending to ${phone}: ${message.substring(0, 50)}...`);

  switch (settings.sms.provider) {
    case 'twilio':
      return sendSmsViaTwilio(phone, message, settings.sms);
    
    case 'vonage':
      return sendSmsViaVonage(phone, message, settings.sms);
    
    case 'gateway':
      return sendSmsViaGateway(phone, message, settings.sms);
    
    default:
      // محاكاة الإرسال
      console.log(`[SMS] Simulated send to ${phone}`);
      return { success: true, messageId: `sms-${Date.now()}` };
  }
}

/**
 * إرسال SMS عبر Twilio
 */
async function sendSmsViaTwilio(
  to: string,
  message: string,
  config: SmsConfig
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  if (!config.twilioAccountSid || !config.twilioAuthToken || !config.twilioPhoneNumber) {
    return { success: false, error: 'إعدادات Twilio غير مكتملة' };
  }

  // ملاحظة: Twilio يتطلب backend لأسباب أمنية
  // هذا للتوضيح - يجب استخدام Supabase Edge Function أو backend خاص
  console.log('[Twilio] Would send SMS via backend proxy');
  
  // محاكاة الإرسال
  return { success: true, messageId: `twilio-${Date.now()}` };
}

/**
 * إرسال SMS عبر Vonage
 */
async function sendSmsViaVonage(
  to: string,
  message: string,
  config: SmsConfig
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  if (!config.vonageApiKey || !config.vonageApiSecret) {
    return { success: false, error: 'إعدادات Vonage غير مكتملة' };
  }

  // مثل Twilio، يتطلب backend
  console.log('[Vonage] Would send SMS via backend proxy');
  
  return { success: true, messageId: `vonage-${Date.now()}` };
}

/**
 * إرسال SMS عبر بوابة محلية
 */
async function sendSmsViaGateway(
  to: string,
  message: string,
  config: SmsConfig
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  if (!config.gatewayUrl) {
    return { success: false, error: 'عنوان البوابة غير موجود' };
  }

  try {
    const response = await fetch(config.gatewayUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config.gatewayApiKey && { 'Authorization': `Bearer ${config.gatewayApiKey}` })
      },
      body: JSON.stringify({ to, message })
    });

    if (response.ok) {
      const data = await response.json();
      return { success: true, messageId: data.id || data.messageId };
    }
    
    return { success: false, error: 'فشل إرسال SMS' };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// =====================================================
// 💬 WhatsApp Functions (wrapper)
// =====================================================

/**
 * إرسال رسالة WhatsApp
 */
export async function sendWhatsApp(
  to: string,
  message: string,
  options?: { ticketId?: string }
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  const settings = loadNotificationSettings();
  
  if (!settings.whatsapp.isEnabled) {
    console.log('[WhatsApp] Service disabled, skipping send');
    return { success: false, error: 'خدمة WhatsApp غير مفعلة' };
  }

  return sendTextMessage(to, message, { ticketId: options?.ticketId });
}

// =====================================================
// 🔔 Unified Notification Functions
// =====================================================

export interface NotificationPayload {
  ticketId: string;
  citizenName: string;
  citizenEmail?: string;
  citizenPhone?: string;
  type: 'ticket_created' | 'ticket_response' | 'status_change';
  subject?: string;
  message: string;
  ticketType?: string;
  status?: string;
  response?: string;
}

/**
 * إرسال إشعار موحد عبر جميع القنوات المفعلة
 */
export async function sendNotification(
  payload: NotificationPayload
): Promise<{
  email: { success: boolean; error?: string };
  sms: { success: boolean; error?: string };
  whatsapp: { success: boolean; error?: string };
}> {
  const settings = loadNotificationSettings();
  const results: {
    email: { success: boolean; error?: string };
    sms: { success: boolean; error?: string };
    whatsapp: { success: boolean; error?: string };
  } = {
    email: { success: false, error: 'غير مفعل' },
    sms: { success: false, error: 'غير مفعل' },
    whatsapp: { success: false, error: 'غير مفعل' }
  };

  // التحقق من الإشعارات التلقائية
  const shouldNotify = 
    (payload.type === 'ticket_created' && settings.autoNotify.onTicketCreated) ||
    (payload.type === 'ticket_response' && settings.autoNotify.onTicketResponse) ||
    (payload.type === 'status_change' && settings.autoNotify.onStatusChange);

  if (!shouldNotify) {
    console.log('[Notification] Auto-notify disabled for this type:', payload.type);
    return results;
  }

  const channels = settings.autoNotify.channels;
  console.log('[Notification] Sending via channels:', channels);

  // إرسال البريد الإلكتروني
  if (channels.includes('email') && payload.citizenEmail) {
    const emailSubject = payload.subject || getDefaultSubject(payload);
    const emailBody = formatEmailBody(payload);
    results.email = await sendEmail(payload.citizenEmail, emailSubject, emailBody, { ticketId: payload.ticketId });
  }

  // إرسال SMS
  if (channels.includes('sms') && payload.citizenPhone) {
    const smsMessage = formatSmsMessage(payload);
    results.sms = await sendSms(payload.citizenPhone, smsMessage, { ticketId: payload.ticketId });
  }

  // إرسال WhatsApp
  if (channels.includes('whatsapp') && payload.citizenPhone) {
    if (payload.type === 'ticket_response') {
      results.whatsapp = await sendTicketNotification(
        payload.citizenPhone,
        payload.ticketId,
        'updated',
        {
          citizenName: payload.citizenName,
          status: 'تم الرد',
          notes: payload.response || payload.message
        }
      );
    } else {
      results.whatsapp = await sendWhatsApp(payload.citizenPhone, formatWhatsAppMessage(payload), { ticketId: payload.ticketId });
    }
  }

  console.log('[Notification] Results:', results);
  return results;
}

/**
 * إرسال إشعار الرد على الطلب
 */
export async function sendTicketResponseNotification(params: {
  ticketId: string;
  citizenName: string;
  citizenEmail?: string;
  citizenPhone?: string;
  ticketType: string;
  responseText: string;
}): Promise<{
  email: { success: boolean; error?: string };
  sms: { success: boolean; error?: string };
  whatsapp: { success: boolean; error?: string };
}> {
  return sendNotification({
    ticketId: params.ticketId,
    citizenName: params.citizenName,
    citizenEmail: params.citizenEmail,
    citizenPhone: params.citizenPhone,
    type: 'ticket_response',
    subject: `رد على طلبك رقم ${params.ticketId}`,
    message: params.responseText,
    ticketType: params.ticketType,
    response: params.responseText,
    status: 'تم الرد'
  });
}

// =====================================================
// 📝 Message Formatting Helpers
// =====================================================

function getDefaultSubject(payload: NotificationPayload): string {
  switch (payload.type) {
    case 'ticket_created':
      return `تأكيد استلام طلبك رقم ${payload.ticketId}`;
    case 'ticket_response':
      return `رد على طلبك رقم ${payload.ticketId}`;
    case 'status_change':
      return `تحديث حالة طلبك رقم ${payload.ticketId}`;
    default:
      return `إشعار بخصوص طلبك رقم ${payload.ticketId}`;
  }
}

function formatEmailBody(payload: NotificationPayload): string {
  const directorateName = getDirectorateName();
  
  let body = `السيد/ة ${payload.citizenName} المحترم/ة،\n\n`;
  
  switch (payload.type) {
    case 'ticket_created':
      body += `نشكركم على تواصلكم مع ${directorateName}.\n`;
      body += `تم استلام طلبكم بنجاح.\n\n`;
      body += `📋 رقم الطلب: ${payload.ticketId}\n`;
      body += `📝 نوع الطلب: ${payload.ticketType || 'استفسار'}\n\n`;
      body += `سيتم مراجعة طلبكم والرد عليكم في أقرب وقت ممكن.`;
      break;
      
    case 'ticket_response':
      body += `نود إعلامكم بأنه تم الرد على طلبكم رقم (${payload.ticketId}).\n\n`;
      body += `📝 الرد:\n${payload.response || payload.message}\n\n`;
      body += `للمتابعة أو الاستفسار، يمكنكم تتبع طلبكم عبر الموقع الإلكتروني.`;
      break;
      
    case 'status_change':
      body += `نود إعلامكم بتحديث حالة طلبكم رقم (${payload.ticketId}).\n\n`;
      body += `🔄 الحالة الجديدة: ${payload.status}\n`;
      if (payload.message) {
        body += `💬 ملاحظات: ${payload.message}\n`;
      }
      break;
  }
  
  body += `\n\n---\n`;
  body += `مع تحيات\n`;
  body += `${directorateName}\n`;
  body += `هذه رسالة تلقائية، يرجى عدم الرد عليها.`;
  
  return body;
}

function formatSmsMessage(payload: NotificationPayload): string {
  const maxLength = 160;
  let message = '';
  
  switch (payload.type) {
    case 'ticket_created':
      message = `تم استلام طلبك رقم ${payload.ticketId}. سيتم الرد عليك قريباً. مديرية مالية حلب`;
      break;
      
    case 'ticket_response':
      message = `تم الرد على طلبك ${payload.ticketId}. يرجى مراجعة الموقع للاطلاع على الرد. مديرية مالية حلب`;
      break;
      
    case 'status_change':
      message = `تحديث: طلبك ${payload.ticketId} - الحالة: ${payload.status}. مديرية مالية حلب`;
      break;
  }
  
  return message.length > maxLength ? message.substring(0, maxLength - 3) + '...' : message;
}

function formatWhatsAppMessage(payload: NotificationPayload): string {
  const directorateName = getDirectorateName();
  let message = `مرحباً ${payload.citizenName}،\n\n`;
  
  switch (payload.type) {
    case 'ticket_created':
      message += `✅ تم استلام طلبك بنجاح\n\n`;
      message += `📋 رقم الطلب: ${payload.ticketId}\n`;
      message += `📝 النوع: ${payload.ticketType || 'استفسار'}\n\n`;
      message += `سيتم الرد عليك في أقرب وقت.`;
      break;
      
    case 'ticket_response':
      message += `📩 تم الرد على طلبك رقم ${payload.ticketId}\n\n`;
      message += `💬 الرد:\n${payload.response || payload.message}\n\n`;
      message += `للمزيد من التفاصيل، يرجى زيارة الموقع.`;
      break;
      
    case 'status_change':
      message += `🔄 تحديث حالة الطلب ${payload.ticketId}\n\n`;
      message += `الحالة: ${payload.status}\n`;
      if (payload.message) {
        message += `ملاحظات: ${payload.message}`;
      }
      break;
  }
  
  message += `\n\n---\n${directorateName}`;
  
  return message;
}

function getDirectorateName(): string {
  try {
    const saved = localStorage.getItem('site_config');
    if (saved) {
      const config = JSON.parse(saved);
      return config.directorateName || 'مديرية مالية حلب';
    }
  } catch {}
  return 'مديرية مالية حلب';
}

// =====================================================
// 📊 Notification Logs
// =====================================================

export interface NotificationLog {
  id: string;
  ticketId: string;
  channel: 'email' | 'sms' | 'whatsapp';
  recipient: string;
  subject?: string;
  message: string;
  status: 'sent' | 'failed';
  error?: string;
  timestamp: string;
}

const NOTIFICATION_LOGS_KEY = 'notification_logs';

/**
 * تسجيل إشعار
 */
export function logNotification(log: Omit<NotificationLog, 'id' | 'timestamp'>): void {
  try {
    const logs = getNotificationLogs();
    const newLog: NotificationLog = {
      ...log,
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString()
    };
    logs.unshift(newLog);
    // الاحتفاظ بآخر 500 سجل فقط
    if (logs.length > 500) {
      logs.length = 500;
    }
    localStorage.setItem(NOTIFICATION_LOGS_KEY, JSON.stringify(logs));
  } catch (e) {
    console.error('Error logging notification:', e);
  }
}

/**
 * الحصول على سجل الإشعارات
 */
export function getNotificationLogs(ticketId?: string): NotificationLog[] {
  try {
    const saved = localStorage.getItem(NOTIFICATION_LOGS_KEY);
    let logs: NotificationLog[] = saved ? JSON.parse(saved) : [];
    
    if (ticketId) {
      logs = logs.filter(l => l.ticketId === ticketId);
    }
    
    return logs;
  } catch {
    return [];
  }
}

/**
 * مسح سجل الإشعارات
 */
export function clearNotificationLogs(): void {
  localStorage.removeItem(NOTIFICATION_LOGS_KEY);
}

export default {
  loadNotificationSettings,
  saveNotificationSettings,
  sendEmail,
  sendSms,
  sendWhatsApp,
  sendNotification,
  sendTicketResponseNotification,
  logNotification,
  getNotificationLogs,
  clearNotificationLogs
};
