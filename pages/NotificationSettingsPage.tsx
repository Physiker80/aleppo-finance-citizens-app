/**
 * صفحة إعدادات الإشعارات
 * Notification Settings Page
 * 
 * تتيح للمدير تفعيل وإعداد قنوات الإشعارات المختلفة
 */

import React, { useState, useEffect, useContext } from 'react';
import { FiMail, FiPhone, FiMessageCircle, FiBell, FiSave, FiCheck, FiX, FiAlertCircle, FiSettings, FiArrowRight, FiSend, FiTrash2 } from 'react-icons/fi';
import { FaWhatsapp } from 'react-icons/fa';
import { AppContext } from '../AppContext';
import { 
  loadNotificationSettings, 
  saveNotificationSettings, 
  NotificationSettings,
  sendEmail,
  sendSms,
  sendWhatsApp,
  getNotificationLogs,
  clearNotificationLogs,
  NotificationLog
} from '../utils/notificationService';

const NotificationSettingsPage: React.FC = () => {
  const context = useContext(AppContext);
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [testEmail, setTestEmail] = useState('');
  const [testPhone, setTestPhone] = useState('');
  const [isTesting, setIsTesting] = useState<'email' | 'sms' | 'whatsapp' | null>(null);
  const [testResult, setTestResult] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showLogs, setShowLogs] = useState(false);

  useEffect(() => {
    setSettings(loadNotificationSettings());
    setLogs(getNotificationLogs());
  }, []);

  // التحقق من صلاحيات المدير
  if (!context?.isEmployeeLoggedIn || context.currentEmployee?.role !== 'مدير') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 max-w-md text-center">
          <FiAlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
            غير مصرح
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            هذه الصفحة متاحة فقط للمدير
          </p>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);
    try {
      saveNotificationSettings(settings);
      setSaveMessage({ type: 'success', text: 'تم حفظ الإعدادات بنجاح' });
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      setSaveMessage({ type: 'error', text: 'حدث خطأ أثناء الحفظ' });
    }
    setIsSaving(false);
  };

  const handleTestEmail = async () => {
    if (!testEmail) return;
    setIsTesting('email');
    setTestResult(null);
    
    const result = await sendEmail(
      testEmail,
      'رسالة اختبار - مديرية مالية حلب',
      'هذه رسالة اختبار من نظام الإشعارات.\n\nإذا وصلتك هذه الرسالة، فإن إعدادات البريد الإلكتروني تعمل بشكل صحيح.\n\nمع تحيات\nمديرية مالية حلب'
    );
    
    setTestResult({ 
      type: result.success ? 'success' : 'error', 
      text: result.success ? 'تم إرسال البريد بنجاح!' : result.error || 'فشل إرسال البريد' 
    });
    setIsTesting(null);
  };

  const handleTestSms = async () => {
    if (!testPhone) return;
    setIsTesting('sms');
    setTestResult(null);
    
    const result = await sendSms(testPhone, 'رسالة اختبار من مديرية مالية حلب');
    
    setTestResult({ 
      type: result.success ? 'success' : 'error', 
      text: result.success ? 'تم إرسال SMS بنجاح!' : result.error || 'فشل إرسال SMS' 
    });
    setIsTesting(null);
  };

  const handleTestWhatsApp = async () => {
    if (!testPhone) return;
    setIsTesting('whatsapp');
    setTestResult(null);
    
    const result = await sendWhatsApp(testPhone, 'مرحباً، هذه رسالة اختبار من نظام الإشعارات - مديرية مالية حلب');
    
    setTestResult({ 
      type: result.success ? 'success' : 'error', 
      text: result.success ? 'تم إرسال WhatsApp بنجاح!' : result.error || 'فشل إرسال WhatsApp' 
    });
    setIsTesting(null);
  };

  const handleClearLogs = () => {
    if (confirm('هل أنت متأكد من مسح سجل الإشعارات؟')) {
      clearNotificationLogs();
      setLogs([]);
    }
  };

  const updateEmailConfig = (key: string, value: any) => {
    setSettings(prev => prev ? { ...prev, email: { ...prev.email, [key]: value } } : prev);
  };

  const updateSmsConfig = (key: string, value: any) => {
    setSettings(prev => prev ? { ...prev, sms: { ...prev.sms, [key]: value } } : prev);
  };

  const updateAutoNotify = (key: string, value: any) => {
    setSettings(prev => prev ? { ...prev, autoNotify: { ...prev.autoNotify, [key]: value } } : prev);
  };

  const toggleChannel = (channel: 'email' | 'sms' | 'whatsapp') => {
    setSettings(prev => {
      if (!prev) return prev;
      const channels = [...prev.autoNotify.channels];
      const idx = channels.indexOf(channel);
      if (idx > -1) {
        channels.splice(idx, 1);
      } else {
        channels.push(channel);
      }
      return { ...prev, autoNotify: { ...prev.autoNotify, channels } };
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 py-8 px-4" dir="rtl">
      <div className="max-w-4xl mx-auto">
        
        {/* العنوان */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center">
              <FiBell className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800 dark:text-white">إعدادات الإشعارات</h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm">إدارة قنوات الإشعارات للمواطنين</p>
            </div>
          </div>
          
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg transition-colors disabled:opacity-50"
          >
            {isSaving ? (
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white"></div>
            ) : (
              <FiSave className="w-5 h-5" />
            )}
            حفظ الإعدادات
          </button>
        </div>

        {/* رسالة الحفظ */}
        {saveMessage && (
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-2 ${
            saveMessage.type === 'success' 
              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
          }`}>
            {saveMessage.type === 'success' ? <FiCheck className="w-5 h-5" /> : <FiX className="w-5 h-5" />}
            {saveMessage.text}
          </div>
        )}

        {/* الإشعارات التلقائية */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <FiSettings className="w-5 h-5" />
            الإشعارات التلقائية
          </h2>
          
          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.autoNotify.onTicketCreated}
                onChange={e => updateAutoNotify('onTicketCreated', e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-gray-700 dark:text-gray-300">إشعار عند إنشاء طلب جديد</span>
            </label>
            
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.autoNotify.onTicketResponse}
                onChange={e => updateAutoNotify('onTicketResponse', e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-gray-700 dark:text-gray-300">إشعار عند الرد على الطلب <span className="text-emerald-600">(الأهم)</span></span>
            </label>
            
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.autoNotify.onStatusChange}
                onChange={e => updateAutoNotify('onStatusChange', e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-gray-700 dark:text-gray-300">إشعار عند تغيير حالة الطلب</span>
            </label>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-3">القنوات المفعلة:</h3>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => toggleChannel('email')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
                  settings.autoNotify.channels.includes('email')
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                    : 'border-gray-300 dark:border-gray-600 text-gray-500'
                }`}
              >
                <FiMail className="w-5 h-5" />
                البريد الإلكتروني
              </button>
              
              <button
                onClick={() => toggleChannel('sms')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
                  settings.autoNotify.channels.includes('sms')
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
                    : 'border-gray-300 dark:border-gray-600 text-gray-500'
                }`}
              >
                <FiPhone className="w-5 h-5" />
                الرسائل القصيرة SMS
              </button>
              
              <button
                onClick={() => toggleChannel('whatsapp')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all ${
                  settings.autoNotify.channels.includes('whatsapp')
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                    : 'border-gray-300 dark:border-gray-600 text-gray-500'
                }`}
              >
                <FaWhatsapp className="w-5 h-5" />
                واتساب
              </button>
            </div>
          </div>
        </div>

        {/* إعدادات البريد الإلكتروني */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <FiMail className="w-5 h-5 text-emerald-600" />
              البريد الإلكتروني
            </h2>
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-sm text-gray-600 dark:text-gray-400">{settings.email.isEnabled ? 'مفعل' : 'معطل'}</span>
              <input
                type="checkbox"
                checked={settings.email.isEnabled}
                onChange={e => updateEmailConfig('isEnabled', e.target.checked)}
                className="toggle-checkbox sr-only"
              />
              <div className={`w-12 h-6 rounded-full transition-colors ${settings.email.isEnabled ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${settings.email.isEnabled ? 'translate-x-1' : 'translate-x-6'}`}></div>
              </div>
            </label>
          </div>
          
          {settings.email.isEnabled && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">مزود الخدمة</label>
                <select
                  value={settings.email.provider}
                  onChange={e => updateEmailConfig('provider', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                >
                  <option value="emailjs">EmailJS (مجاني)</option>
                  <option value="resend">Resend</option>
                  <option value="supabase">Supabase Edge Function</option>
                </select>
              </div>
              
              {settings.email.provider === 'emailjs' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Service ID</label>
                    <input
                      type="text"
                      value={settings.email.emailjsServiceId || ''}
                      onChange={e => updateEmailConfig('emailjsServiceId', e.target.value)}
                      placeholder="service_xxxxxx"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Template ID</label>
                    <input
                      type="text"
                      value={settings.email.emailjsTemplateId || ''}
                      onChange={e => updateEmailConfig('emailjsTemplateId', e.target.value)}
                      placeholder="template_xxxxxx"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Public Key</label>
                    <input
                      type="text"
                      value={settings.email.emailjsPublicKey || ''}
                      onChange={e => updateEmailConfig('emailjsPublicKey', e.target.value)}
                      placeholder="xxxxxxxxxxxxxxxx"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                    />
                  </div>
                </>
              )}
              
              {settings.email.provider === 'resend' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Resend API Key</label>
                  <input
                    type="password"
                    value={settings.email.resendApiKey || ''}
                    onChange={e => updateEmailConfig('resendApiKey', e.target.value)}
                    placeholder="re_xxxxxxxxxxxxxxxxxx"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                  />
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">اسم المرسل</label>
                  <input
                    type="text"
                    value={settings.email.fromName || ''}
                    onChange={e => updateEmailConfig('fromName', e.target.value)}
                    placeholder="مديرية مالية حلب"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">بريد المرسل</label>
                  <input
                    type="email"
                    value={settings.email.fromEmail || ''}
                    onChange={e => updateEmailConfig('fromEmail', e.target.value)}
                    placeholder="noreply@example.com"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* إعدادات SMS */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <FiPhone className="w-5 h-5 text-blue-600" />
              الرسائل القصيرة SMS
            </h2>
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-sm text-gray-600 dark:text-gray-400">{settings.sms.isEnabled ? 'مفعل' : 'معطل'}</span>
              <input
                type="checkbox"
                checked={settings.sms.isEnabled}
                onChange={e => updateSmsConfig('isEnabled', e.target.checked)}
                className="toggle-checkbox sr-only"
              />
              <div className={`w-12 h-6 rounded-full transition-colors ${settings.sms.isEnabled ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${settings.sms.isEnabled ? 'translate-x-1' : 'translate-x-6'}`}></div>
              </div>
            </label>
          </div>
          
          {settings.sms.isEnabled && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">مزود الخدمة</label>
                <select
                  value={settings.sms.provider}
                  onChange={e => updateSmsConfig('provider', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                >
                  <option value="twilio">Twilio</option>
                  <option value="vonage">Vonage (Nexmo)</option>
                  <option value="gateway">بوابة محلية</option>
                </select>
              </div>
              
              {settings.sms.provider === 'twilio' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Account SID</label>
                    <input
                      type="text"
                      value={settings.sms.twilioAccountSid || ''}
                      onChange={e => updateSmsConfig('twilioAccountSid', e.target.value)}
                      placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Auth Token</label>
                    <input
                      type="password"
                      value={settings.sms.twilioAuthToken || ''}
                      onChange={e => updateSmsConfig('twilioAuthToken', e.target.value)}
                      placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">رقم الهاتف</label>
                    <input
                      type="text"
                      value={settings.sms.twilioPhoneNumber || ''}
                      onChange={e => updateSmsConfig('twilioPhoneNumber', e.target.value)}
                      placeholder="+1234567890"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                    />
                  </div>
                </>
              )}
              
              {settings.sms.provider === 'gateway' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">عنوان البوابة (URL)</label>
                    <input
                      type="url"
                      value={settings.sms.gatewayUrl || ''}
                      onChange={e => updateSmsConfig('gatewayUrl', e.target.value)}
                      placeholder="https://sms-gateway.example.com/api/send"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">مفتاح API (اختياري)</label>
                    <input
                      type="password"
                      value={settings.sms.gatewayApiKey || ''}
                      onChange={e => updateSmsConfig('gatewayApiKey', e.target.value)}
                      placeholder="api_key_xxx"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                    />
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* إعدادات WhatsApp */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <FaWhatsapp className="w-5 h-5 text-green-600" />
              واتساب
            </h2>
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-sm text-gray-600 dark:text-gray-400">{settings.whatsapp.isEnabled ? 'مفعل' : 'معطل'}</span>
              <input
                type="checkbox"
                checked={settings.whatsapp.isEnabled}
                onChange={e => setSettings(prev => prev ? { ...prev, whatsapp: { ...prev.whatsapp, isEnabled: e.target.checked } } : prev)}
                className="toggle-checkbox sr-only"
              />
              <div className={`w-12 h-6 rounded-full transition-colors ${settings.whatsapp.isEnabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${settings.whatsapp.isEnabled ? 'translate-x-1' : 'translate-x-6'}`}></div>
              </div>
            </label>
          </div>
          
          {settings.whatsapp.isEnabled && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-sm text-green-800 dark:text-green-400 mb-2">
                <strong>ملاحظة:</strong> لاستخدام WhatsApp Business API، يجب إعداد الإعدادات في ملف <code>whatsappIntegration.ts</code>
              </p>
              <a href="#whatsapp-config" className="text-green-600 hover:text-green-700 text-sm flex items-center gap-1">
                اقرأ دليل الإعداد <FiArrowRight className="w-4 h-4" />
              </a>
            </div>
          )}
        </div>

        {/* اختبار الإرسال */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <FiSend className="w-5 h-5 text-purple-600" />
            اختبار الإرسال
          </h2>
          
          {testResult && (
            <div className={`mb-4 p-4 rounded-lg flex items-center gap-2 ${
              testResult.type === 'success' 
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
            }`}>
              {testResult.type === 'success' ? <FiCheck className="w-5 h-5" /> : <FiX className="w-5 h-5" />}
              {testResult.text}
            </div>
          )}
          
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">بريد الاختبار</label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={testEmail}
                  onChange={e => setTestEmail(e.target.value)}
                  placeholder="test@example.com"
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                />
                <button
                  onClick={handleTestEmail}
                  disabled={!testEmail || !settings.email.isEnabled || isTesting === 'email'}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg disabled:opacity-50 flex items-center gap-2"
                >
                  {isTesting === 'email' ? <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent"></div> : <FiMail className="w-4 h-4" />}
                  إرسال
                </button>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">رقم الاختبار</label>
              <div className="flex gap-2">
                <input
                  type="tel"
                  value={testPhone}
                  onChange={e => setTestPhone(e.target.value)}
                  placeholder="+963911234567"
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                />
                <button
                  onClick={handleTestSms}
                  disabled={!testPhone || !settings.sms.isEnabled || isTesting === 'sms'}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 flex items-center gap-2"
                >
                  {isTesting === 'sms' ? <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent"></div> : <FiPhone className="w-4 h-4" />}
                  SMS
                </button>
                <button
                  onClick={handleTestWhatsApp}
                  disabled={!testPhone || !settings.whatsapp.isEnabled || isTesting === 'whatsapp'}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50 flex items-center gap-2"
                >
                  {isTesting === 'whatsapp' ? <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent"></div> : <FaWhatsapp className="w-4 h-4" />}
                  WA
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* سجل الإشعارات */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <FiMessageCircle className="w-5 h-5 text-orange-600" />
              سجل الإشعارات
              {logs.length > 0 && (
                <span className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs px-2 py-1 rounded-full">
                  {logs.length}
                </span>
              )}
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => { setLogs(getNotificationLogs()); setShowLogs(!showLogs); }}
                className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
              >
                {showLogs ? 'إخفاء' : 'عرض'}
              </button>
              {logs.length > 0 && (
                <button
                  onClick={handleClearLogs}
                  className="text-red-600 hover:text-red-700 flex items-center gap-1"
                >
                  <FiTrash2 className="w-4 h-4" />
                  مسح
                </button>
              )}
            </div>
          </div>
          
          {showLogs && (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {logs.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-4">لا توجد سجلات</p>
              ) : (
                logs.slice(0, 50).map(log => (
                  <div key={log.id} className={`p-3 rounded-lg border ${
                    log.status === 'sent' 
                      ? 'bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-800' 
                      : 'bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-red-800'
                  }`}>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        {log.channel === 'email' && <FiMail className="w-4 h-4 text-emerald-600" />}
                        {log.channel === 'sms' && <FiPhone className="w-4 h-4 text-blue-600" />}
                        {log.channel === 'whatsapp' && <FaWhatsapp className="w-4 h-4 text-green-600" />}
                        <span className="font-medium text-gray-800 dark:text-white">{log.ticketId}</span>
                        <FiArrowRight className="w-3 h-3 text-gray-400" />
                        <span className="text-gray-600 dark:text-gray-400">{log.recipient}</span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(log.timestamp).toLocaleString('ar-SY')}
                      </span>
                    </div>
                    {log.error && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1">{log.error}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default NotificationSettingsPage;
