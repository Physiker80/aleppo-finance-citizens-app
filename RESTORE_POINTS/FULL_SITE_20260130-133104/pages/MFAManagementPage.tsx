import React, { useState, useContext } from 'react';
import { AppContext } from '../App';
import { MFAManager } from '../utils/mfa';
// دمج دليل القسم الأمني ضمن العنوان - لم نعد نستخدم زر منفصل هنا
import { Employee, MfaFactorType } from '../types';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import MFASetup from '../components/MFASetup';
import { FiArrowRight, FiMail, FiPhone, FiSend, FiKey, FiInfo } from 'react-icons/fi';
import Mermaid from '../components/Mermaid';

const MFAManagementPage: React.FC = () => {
  const appContext = useContext(AppContext);
  const isAdminHeader = appContext?.currentEmployee?.role === 'مدير';
  const [showSetup, setShowSetup] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showMfaGuide, setShowMfaGuide] = useState(false);
  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowMfaGuide(false); };
    if (showMfaGuide) document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [showMfaGuide]);
  
  // حالات إرسال رسائل التأكيد
  const [showVerificationSender, setShowVerificationSender] = useState(false);
  const [verificationMethod, setVerificationMethod] = useState<'sms' | 'email'>('sms');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [showPolicyInfo, setShowPolicyInfo] = useState(false);

  const currentEmployee = appContext?.currentEmployee;

  if (!currentEmployee) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center">
          <p>يرجى تسجيل الدخول للوصول لهذه الصفحة</p>
        </Card>
      </div>
    );
  }

  const handleSetupComplete = (updatedEmployee: Employee, newBackupCodes: string[]) => {
    if (appContext?.updateEmployee) {
      appContext.updateEmployee(updatedEmployee);
      setBackupCodes(newBackupCodes);
      setShowBackupCodes(true);
      setShowSetup(false);
    }
  };

  const handleDisableMFA = () => {
    if (!appContext?.updateEmployee) return;
    
    const confirmed = window.confirm(
      'هل أنت متأكد من تعطيل المصادقة متعددة العوامل؟ سيؤدي هذا إلى تقليل مستوى الأمان لحسابك.'
    );
    
    if (confirmed) {
      const updatedEmployee = MFAManager.disableMFA(currentEmployee);
      appContext.updateEmployee(updatedEmployee);
    }
  };

  const handleRegenerateBackupCodes = () => {
    if (!appContext?.updateEmployee) return;
    
    const confirmed = window.confirm(
      'سيؤدي إنشاء رموز احتياطية جديدة إلى إلغاء الرموز القديمة. هل تريد المتابعة؟'
    );
    
    if (confirmed) {
      setLoading(true);
      const { employee: updatedEmployee, newCodes } = MFAManager.regenerateBackupCodes(currentEmployee);
      appContext.updateEmployee(updatedEmployee);
      setBackupCodes(newCodes);
      setShowBackupCodes(true);
      setLoading(false);
    }
  };

  const remainingBackupCodes = MFAManager.getRemainingBackupCodesCount(currentEmployee);
  const needsPasswordChange = MFAManager.needsPasswordChange(currentEmployee);

  // وظائف إرسال رسائل التأكيد
  const generateVerificationCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const handleSendVerificationCode = async () => {
    if (verificationMethod === 'sms' && !phoneNumber.trim()) {
      alert('يرجى إدخال رقم الهاتف');
      return;
    }
    if (verificationMethod === 'email' && !emailAddress.trim()) {
      alert('يرجى إدخال البريد الإلكتروني');
      return;
    }
    setSendingCode(true);
    const code = generateVerificationCode();
    setGeneratedCode(code);

    try {
      if (verificationMethod === 'sms') {
        // محاكاة إرسال SMS
        await new Promise(resolve => setTimeout(resolve, 2000));
        console.log(`إرسال رسالة SMS إلى ${phoneNumber} برقم التأكيد: ${code}`);
        alert(`تم إرسال رقم التأكيد عبر الرسائل النصية إلى ${phoneNumber}\nرقم التأكيد: ${code} (للاختبار فقط)`);
      } else {
        // محاكاة إرسال الإيميل
        await new Promise(resolve => setTimeout(resolve, 1500));
        console.log(`إرسال إيميل إلى ${emailAddress} برقم التأكيد: ${code}`);
        alert(`تم إرسال رقم التأكيد عبر البريد الإلكتروني إلى ${emailAddress}\nرقم التأكيد: ${code} (للاختبار فقط)`);
      }
      setCodeSent(true);
    } catch (error) {
      alert('فشل في إرسال رقم التأكيد. يرجى المحاولة مرة أخرى.');
      console.error('خطأ في إرسال رقم التأكيد:', error);
    } finally {
      setSendingCode(false);
    }
  };

  const handleVerifyCode = () => {
    if (verificationCode.trim() === generatedCode) {
      alert('تم التحقق بنجاح من رقم التأكيد!');
      // إعادة تعيين النموذج
      setShowVerificationSender(false);
      setCodeSent(false);
      setVerificationCode('');
      setGeneratedCode('');
      setPhoneNumber('');
      setEmailAddress('');
    } else {
      alert('رقم التأكيد غير صحيح. يرجى المحاولة مرة أخرى.');
    }
  };

  const resetVerificationForm = () => {
    setShowVerificationSender(false);
    setCodeSent(false);
    setVerificationCode('');
    setGeneratedCode('');
    setPhoneNumber('');
    setEmailAddress('');
    setVerificationMethod('sms');
  };

  // منطق إظهار قسم التحليل الذكي للأمان بشكل مشروط (مدير + الوصول من لوحة التحكم)
  const isAdmin = currentEmployee?.role === 'مدير';
  // استخدم sessionStorage لتمرير علم الوصول من لوحة التحكم لمرة واحدة
  const fromDashboard = (typeof window !== 'undefined') && window.sessionStorage.getItem('mfa_from_dashboard') === '1';
  if (fromDashboard && typeof window !== 'undefined') {
    // امسح العلم مباشرة ليكون لمرة واحدة فقط
    window.sessionStorage.removeItem('mfa_from_dashboard');
  }
  const showAiSection = isAdmin && fromDashboard;

  // دوال التحليل الذكي للأمان (تُستخدم فقط عند showAiSection)
  const handleGenerateReport = async (reportType: 'daily' | 'weekly' | 'monthly' | 'yearly') => {
    setLoading(true);
    
    try {
      // محاكاة استدعاء AI API لتحليل البيانات الأمنية
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const reportData = await generateSecurityReport(reportType);
      
      // إنشاء وتحميل التقرير
      const blob = new Blob([reportData.content], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `security-report-${reportType}-${new Date().toISOString().split('T')[0]}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      alert(`تم إنشاء ${getReportTypeLabel(reportType)} بنجاح وتحميله!`);
    } catch (error) {
      alert('حدث خطأ أثناء إنشاء التقرير. يرجى المحاولة لاحقاً.');
      console.error('خطأ في إنشاء التقرير:', error);
    } finally {
      setLoading(false);
    }
  };

  const getReportTypeLabel = (type: string) => {
    const labels = {
      daily: 'التقرير اليومي',
      weekly: 'التقرير الأسبوعي', 
      monthly: 'التقرير الشهري',
      yearly: 'التقرير السنوي'
    };
    return labels[type as keyof typeof labels] || 'التقرير';
  };

  const generateSecurityReport = async (reportType: string) => {
    // محاكاة تحليل AI للبيانات الأمنية
    const currentDate = new Date().toLocaleDateString('ar-SY-u-nu-latn');
    const reportPeriod = getReportPeriod(reportType);
    
    const aiAnalysis = {
      securityScore: Math.floor(Math.random() * 20) + 80, // 80-100
      loginAttempts: Math.floor(Math.random() * 500) + 100,
      threatLevel: ['منخفض', 'متوسط', 'عالي'][Math.floor(Math.random() * 3)],
      blockedThreats: Math.floor(Math.random() * 15) + 5,
      recommendations: [
        'تحديث كلمات المرور للحسابات الخاملة',
        'تفعيل المصادقة الثنائية لجميع المستخدمين',
        'مراجعة صلاحيات الوصول للحسابات الإدارية',
        'تحديث قواعد جدار الحماية'
      ]
    };

    const content = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>تقرير الأمان الذكي - ${getReportTypeLabel(reportType)}</title>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 20px; background: #f5f5f5; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 20px; }
          .card { background: white; padding: 20px; border-radius: 10px; margin-bottom: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .metric { display: inline-block; margin: 10px; padding: 15px; background: #f8f9fa; border-radius: 8px; text-align: center; min-width: 120px; }
          .metric-value { font-size: 24px; font-weight: bold; color: #2c3e50; }
          .metric-label { font-size: 12px; color: #7f8c8d; margin-top: 5px; }
          .threat-high { color: #e74c3c; }
          .threat-medium { color: #f39c12; }
          .threat-low { color: #27ae60; }
          ul { padding-right: 20px; }
          .ai-insight { background: linear-gradient(135deg, #667eea20 0%, #764ba220 100%); border-right: 4px solid #667eea; }
          .timestamp { text-align: center; color: #7f8c8d; margin-top: 20px; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🛡️ تقرير الأمان الذكي</h1>
          <h2>${getReportTypeLabel(reportType)}</h2>
          <p>مدعوم بالذكاء الاصطناعي - مديرية مالية حلب</p>
        </div>

        <div class="card">
          <h3>📊 نظرة عامة على الأمان</h3>
          <div class="metric">
            <div class="metric-value">${aiAnalysis.securityScore}/100</div>
            <div class="metric-label">نقاط الأمان</div>
          </div>
          <div class="metric">
            <div class="metric-value">${aiAnalysis.loginAttempts}</div>
            <div class="metric-label">محاولات الدخول</div>
          </div>
          <div class="metric">
            <div class="metric-value threat-${aiAnalysis.threatLevel === 'عالي' ? 'high' : aiAnalysis.threatLevel === 'متوسط' ? 'medium' : 'low'}">${aiAnalysis.threatLevel}</div>
            <div class="metric-label">مستوى التهديد</div>
          </div>
          <div class="metric">
            <div class="metric-value">${aiAnalysis.blockedThreats}</div>
            <div class="metric-label">تهديدات محجوبة</div>
          </div>
        </div>

        <div class="card ai-insight">
          <h3>🧠 تحليل الذكاء الاصطناعي</h3>
          <p><strong>الفترة المحللة:</strong> ${reportPeriod}</p>
          <p><strong>التقييم العام:</strong> ${aiAnalysis.securityScore >= 90 ? 'ممتاز' : aiAnalysis.securityScore >= 75 ? 'جيد' : aiAnalysis.securityScore >= 60 ? 'مقبول' : 'يحتاج تحسين'}</p>
          <h4>📈 الاتجاهات المكتشفة:</h4>
          <ul>
            <li>زيادة في النشاط الأمني خلال ساعات العمل الرسمية</li>
            <li>انخفاض في محاولات الاختراق بنسبة ${Math.floor(Math.random() * 20) + 10}%</li>
            <li>تحسن في استجابة النظام للتهديدات</li>
            <li>زيادة في استخدام المصادقة الثنائية بنسبة ${Math.floor(Math.random() * 15) + 25}%</li>
          </ul>
        </div>

        <div class="card">
          <h3>🎯 التوصيات الذكية</h3>
          <ul>
            ${aiAnalysis.recommendations.map(rec => `<li>${rec}</li>`).join('')}
          </ul>
        </div>

        <div class="card">
          <h3>📋 تفاصيل إضافية</h3>
          <p><strong>أكثر الأوقات نشاطاً:</strong> ${Math.floor(Math.random() * 12) + 9}:00 - ${Math.floor(Math.random() * 12) + 9}:00</p>
          <p><strong>أكثر أنواع التهديدات شيوعاً:</strong> محاولات كسر كلمات المرور</p>
          <p><strong>معدل نجاح الحماية:</strong> ${Math.floor(Math.random() * 5) + 95}%</p>
          <p><strong>متوسط وقت الاستجابة:</strong> ${Math.floor(Math.random() * 300) + 100} ميلي ثانية</p>
        </div>

        <div class="timestamp">
          تم إنشاء هذا التقرير بواسطة نظام التحليل الذكي في ${currentDate}
        </div>
      </body>
      </html>
    `;

    return { content, timestamp: new Date() };
  };

  const getReportPeriod = (reportType: string) => {
    const now = new Date();
    switch (reportType) {
      case 'daily':
        return now.toLocaleDateString('ar-SY-u-nu-latn');
      case 'weekly':
        // احسب بداية ونهاية الأسبوع الحالي
        const current = new Date();
        const day = current.getDay();
        const diffToSunday = day; // Sunday as start (0)
        const weekStart = new Date(current);
        weekStart.setDate(current.getDate() - diffToSunday);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        return `${weekStart.toLocaleDateString('ar-SY-u-nu-latn')} - ${weekEnd.toLocaleDateString('ar-SY-u-nu-latn')}`;
      case 'monthly':
        return `${now.getMonth() + 1}/${now.getFullYear()}`;
      case 'yearly':
        return now.getFullYear().toString();
      default:
        return now.toLocaleDateString('ar-SY-u-nu-latn');
    }
  };

  if (showSetup) {
    return (
      <div className="min-h-screen py-8 bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4">
          <MFASetup
            employee={currentEmployee}
            onSetupComplete={handleSetupComplete}
            onCancel={() => setShowSetup(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-8">
          <div className="mb-2">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowMfaGuide(true)}
                aria-controls="mfa-guide-dialog"
                aria-haspopup="dialog"
                className="text-right hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded"
                title="عرض دليل القسم الأمني"
              >
                <span className="text-3xl font-bold text-gray-900 dark:text-white">
                  إدارة المصادقة متعددة العوامل
                </span>
              </button>
              <button
                type="button"
                onClick={() => setShowMfaGuide(true)}
                aria-controls="mfa-guide-dialog"
                aria-haspopup="dialog"
                className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-emerald-50 dark:bg-gray-800 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700 hover:bg-emerald-100 dark:hover:bg-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                aria-label="عرض دليل القسم الأمني"
                title="عرض دليل القسم الأمني"
              >
                <FiInfo className="text-[18px]" />
              </button>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mt-1">
              قم بإدارة إعدادات الأمان لحسابك
            </p>
          </div>

          {showMfaGuide && (
            <div
              id="mfa-guide-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="mfa-guide-title"
              className="fixed inset-0 z-[10000] flex items-center justify-center p-3"
            >
              {/* خلفية */}
              <div
                className="absolute inset-0 bg-black/60"
                onClick={() => setShowMfaGuide(false)}
                aria-hidden="true"
                title="انقر للإغلاق"
              />

              {/* لوحة عائمة */}
              <div className="relative z-10 max-h-[90vh] w-[min(100%,900px)] overflow-auto rounded-xl bg-white dark:bg-gray-900 shadow-2xl ring-1 ring-emerald-200 dark:ring-gray-700 p-5 rtl:text-right">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 id="mfa-guide-title" className="text-xl font-bold text-emerald-800 dark:text-emerald-300">دليل الأمان: المصادقة متعددة العوامل</h2>
                    <p className="mt-2 text-gray-700 dark:text-gray-300 leading-7 max-w-[68ch]">
                      المصادقة متعددة العوامل تضيف طبقة ثانية من التحقق بجانب كلمة المرور، مثل رمز مؤقت من تطبيق مصادقة، بريد إلكتروني، أو رسالة نصية، لتقليل مخاطر الاستيلاء على الحساب.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowMfaGuide(false)}
                    className="shrink-0 rounded-full border border-gray-300 dark:border-gray-700 p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
                    aria-label="إغلاق"
                    title="إغلاق"
                  >
                    ✖
                  </button>
                </div>

                <div className="mt-6">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">المخطط التوضيحي (تفاعلي)</h3>
                  <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-3 overflow-x-auto">
                    <Mermaid chart={`flowchart TD\n  U[المستخدم] -->|اسم المستخدم + كلمة المرور| A[التحقق الأولي]\n  A -->|نجاح| B{هل المصادقة متعددة العوامل مفعّلة؟}\n  B -- نعم --> C[إرسال/إدخال رمز مؤقت]\n  C -->|تحقق الرمز| D[السماح بالدخول]\n  B -- لا --> D\n  C -- فشل --> E[رفض + تنبيه]`} />
                  </div>
                </div>

                {/* فاصل */}
                <div className="mt-6 h-px bg-gray-200 dark:bg-gray-700" />

                <div className="mt-6">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">الخطوات العملية</h3>
                  <div className="mt-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4">
                    <ol className="list-decimal pr-6 rtl:pr-0 rtl:pl-6 text-gray-800 dark:text-gray-300 space-y-2 leading-7 text-[0.95rem] max-w-[68ch]">
                      <li>تفعيل العامل الثاني من صفحة إعدادات الأمان</li>
                      <li>توليد رمز مؤقت كل 30 ثانية عبر تطبيق المصادقة</li>
                      <li>التحقق من الرمز عند تسجيل الدخول أو تنفيذ عمليات حساسة</li>
                      <li>استخدام رموز طوارئ احتياطية عند فقدان الوصول</li>
                    </ol>
                  </div>
                </div>

                <div className="mt-6 flex justify-end">
                  <Button
                    variant="secondary"
                    className="border border-gray-300 dark:border-gray-700"
                    onClick={() => setShowMfaGuide(false)}
                  >
                    إغلاق
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {/* Current Status */}
          <Card>
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
            {showPolicyInfo && (
              <div 
                className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
                onClick={(e) => {
                  if (e.target === e.currentTarget) setShowPolicyInfo(false);
                }}
              >
                <Card className="w-full max-w-lg m-4" >
                  <div className="p-6" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        سياسة الوصول الإداري للتحليل الذكي
                      </h3>
                      <Button onClick={() => setShowPolicyInfo(false)} variant="secondary" className="p-1 text-sm" aria-label="إغلاق" title="إغلاق">✕</Button>
                    </div>
                    <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                      <p>يظهر قسم "التحليل الذكي للأمان" فقط عند دخول مسؤول النظام من لوحة التحكم وفي نفس الجلسة. هذا يهدف للحد من الوصول غير المقصود ولمواءمة سياسات الحوكمة.</p>
                      <ul className="list-disc pr-5 space-y-1">
                        <li>مطلوب دور <span className="font-semibold">مدير</span>.</li>
                        <li>الوصول عبر لوحة التحكم يفعّل ظهور القسم لمرة واحدة فقط في الجلسة.</li>
                        <li>لا تُستخدم معاملات الرابط لإظهار هذا القسم لأسباب أمنية.</li>
                      </ul>
                      <div className="pt-2 flex items-center gap-2">
                        <a href="#/security-governance" className="inline-flex items-center gap-2 text-emerald-700 dark:text-emerald-300 hover:underline" title="فتح صفحة حوكمة الأمان">
                          الانتقال إلى حوكمة الأمان
                          <span aria-hidden>↗</span>
                        </a>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            )}

                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    حالة المصادقة الحالية
                  </h2>
                  <div className="flex items-center space-x-3 space-x-reverse">
                    <div className={`w-3 h-3 rounded-full ${
                      currentEmployee.mfaEnabled ? 'bg-green-500' : 'bg-red-500'
                    }`}></div>
                    <span className={`font-medium ${
                      currentEmployee.mfaEnabled ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'
                    }`}>
                      {currentEmployee.mfaEnabled ? 'مُفعَّل' : 'غير مُفعَّل'}
                    </span>
                  </div>
                </div>
                <div className="text-4xl">
                  {currentEmployee.mfaEnabled ? '🔒' : '🔓'}
                </div>
              </div>

              {currentEmployee.mfaEnabled && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">تم التفعيل</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {currentEmployee.mfaEnabledAt ? 
                          new Date(currentEmployee.mfaEnabledAt).toLocaleDateString('ar-SY-u-nu-latn') : 
                          'غير محدد'
                        }
                      </div>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">الرموز الاحتياطية</div>
                      <div className={`text-sm ${remainingBackupCodes <= 3 ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-600 dark:text-gray-400'}`}>
                        {remainingBackupCodes} متبقي
                      </div>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">نوع المصادقة</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        TOTP + رموز احتياطية
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Actions */}
          {!currentEmployee.mfaEnabled ? (
            <Card>
              <div className="p-6">
                <div className="flex items-start space-x-4 space-x-reverse">
                  <div className="text-5xl">🛡️</div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      قم بتفعيل المصادقة متعددة العوامل
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 mb-4">
                      احم حسابك من الاختراق بإضافة طبقة أمان إضافية. ستحتاج إلى تطبيق مصادقة مثل Google Authenticator.
                    </p>
                    <div className="space-y-2 mb-6">
                      <div className="flex items-center space-x-2 space-x-reverse text-green-600 dark:text-green-400">
                        <span>✓</span>
                        <span className="text-sm">حماية ضد اختراق كلمات المرور</span>
                      </div>
                      <div className="flex items-center space-x-2 space-x-reverse text-green-600 dark:text-green-400">
                        <span>✓</span>
                        <span className="text-sm">رموز أمان متجددة كل 30 ثانية</span>
                      </div>
                      <div className="flex items-center space-x-2 space-x-reverse text-green-600 dark:text-green-400">
                        <span>✓</span>
                        <span className="text-sm">رموز احتياطية للطوارئ</span>
                      </div>
                    </div>
                    <Button onClick={() => setShowSetup(true)} variant="primary">
                      تفعيل المصادقة متعددة العوامل
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ) : null}

          <Card>
              <div className="p-6">
                <div className="flex items-start space-x-4 space-x-reverse">
                  <div className="text-5xl">📱</div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      إرسال رقم التأكيد
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 mb-4">
                      احصل على رقم تأكيد عبر الرسائل النصية أو البريد الإلكتروني للتحقق من هويتك
                    </p>
                    <div className="space-y-2 mb-6">
                      <div className="flex items-center space-x-2 space-x-reverse text-blue-600 dark:text-blue-400">
                        <span>📱</span>
                        <span className="text-sm">إرسال عبر الرسائل النصية (SMS)</span>
                      </div>
                      <div className="flex items-center space-x-2 space-x-reverse text-blue-600 dark:text-blue-400">
                        <span>📧</span>
                        <span className="text-sm">إرسال عبر البريد الإلكتروني</span>
                      </div>
                      <div className="flex items-center space-x-2 space-x-reverse text-blue-600 dark:text-blue-400">
                        <span>🔢</span>
                        <span className="text-sm">رقم تأكيد مكون من 6 أرقام</span>
                      </div>
                    </div>
                    <Button 
                      onClick={() => setShowVerificationSender(true)} 
                      variant="secondary"
                      className="flex items-center gap-2"
                    >
                      <FiSend />
                      إرسال رقم التأكيد
                    </Button>
                  </div>
                </div>
              </div>
            </Card>

            {showVerificationSender && (
              <div 
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" 
                onClick={(e) => {
                  // فقط أغلق إذا تم النقر على الخلفية مباشرة، وليس على عناصر القائمة
                  if (e.target === e.currentTarget) {
                    resetVerificationForm();
                  }
                }}
              >
                <Card className="w-full max-w-md m-4">
                  <div className="p-6" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        إرسال رقم التأكيد
                      </h3>
                      <Button 
                        onClick={resetVerificationForm}
                        variant="secondary"
                        className="p-1 text-sm"
                      >
                        ✕
                      </Button>
                    </div>

                    {!codeSent ? (
                      <div className="space-y-4">
                        {/* اختيار طريقة الإرسال */}
                        <div onClick={(e) => e.stopPropagation()}>
                          <Select
                            label="طريقة الإرسال"
                            id="verification-method"
                            value={verificationMethod}
                            onChange={(e) => setVerificationMethod(e.target.value as 'sms' | 'email')}
                            className="w-full"
                          >
                            <option value="sms">رسالة نصية (SMS)</option>
                            <option value="email">بريد إلكتروني</option>
                          </Select>
                        </div>

                        {/* حقل رقم الهاتف أو الإيميل */}
                        {verificationMethod === 'sms' ? (
                          <div onClick={(e) => e.stopPropagation()}>
                            <Input
                              label="رقم الهاتف"
                              id="mfa-phone"
                              type="tel"
                              value={phoneNumber}
                              onChange={(e) => setPhoneNumber(e.target.value)}
                              placeholder="مثال: +963991234567"
                              endAdornment={<FiPhone className="text-gray-400" />}
                            />
                          </div>
                        ) : (
                          <div onClick={(e) => e.stopPropagation()}>
                            <Input
                              label="عنوان البريد الإلكتروني"
                              id="mfa-email"
                              type="email"
                              value={emailAddress}
                              onChange={(e) => setEmailAddress(e.target.value)}
                              placeholder="مثال: user@example.com"
                              endAdornment={<FiMail className="text-gray-400" />}
                            />
                          </div>
                        )}

                        <div className="flex gap-3 pt-4" onClick={(e) => e.stopPropagation()}>
                          <Button
                            onClick={handleSendVerificationCode}
                            isLoading={sendingCode}
                            variant="primary"
                            className="flex-1"
                          >
                            <FiSend className="ml-2" />
                            إرسال رقم التأكيد
                          </Button>
                          <Button
                            onClick={resetVerificationForm}
                            variant="secondary"
                          >
                            إلغاء
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="text-center py-4">
                          <div className="text-4xl mb-2">✅</div>
                          <p className="text-green-600 dark:text-green-400 font-medium">
                            تم إرسال رقم التأكيد!
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {verificationMethod === 'sms' 
                              ? `تم إرسال الرقم إلى ${phoneNumber}`
                              : `تم إرسال الرقم إلى ${emailAddress}`
                            }
                          </p>
                        </div>

                        {/* حقل إدخال رقم التأكيد */}
                        <div onClick={(e) => e.stopPropagation()}>
                          <Input
                            label="رقم التأكيد (6 أرقام)"
                            id="mfa-code"
                            type="text"
                            value={verificationCode}
                            onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            placeholder="123456"
                            className="text-center text-lg font-mono"
                            maxLength={6}
                            endAdornment={<FiKey className="text-gray-400" />}
                          />
                        </div>

                        <div className="flex gap-3 pt-4" onClick={(e) => e.stopPropagation()}>
                          <Button
                            onClick={handleVerifyCode}
                            variant="primary"
                            className="flex-1"
                            disabled={verificationCode.length !== 6}
                          >
                            التحقق من الرقم
                          </Button>
                          <Button
                            onClick={() => setCodeSent(false)}
                            variant="secondary"
                          >
                            إرسال مرة أخرى
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            )}

            <div className="space-y-6">
              {/* Backup Codes Management */}
              <Card>
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    إدارة الرموز الاحتياطية
                  </h3>
                  
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-gray-600 dark:text-gray-300 mb-1">
                        الرموز المتبقية: <span className="font-semibold">{remainingBackupCodes}</span> من أصل 10
                      </p>
                      {remainingBackupCodes <= 3 && (
                        <p className="text-yellow-600 dark:text-yellow-400 text-sm">
                          ⚠️ يُنصح بإنشاء رموز جديدة
                        </p>
                      )}
                    </div>
                    
                    <Button 
                      onClick={handleRegenerateBackupCodes}
                      isLoading={loading}
                      variant="secondary"
                    >
                      إنشاء رموز جديدة
                    </Button>
                  </div>

                  {showBackupCodes && backupCodes.length > 0 && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                      <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-3">
                        🔑 رموزك الاحتياطية الجديدة
                      </h4>
                      <p className="text-yellow-700 dark:text-yellow-300 mb-4 text-sm">
                        احفظ هذه الرموز في مكان آمن. كل رمز يمكن استخدامه مرة واحدة فقط.
                      </p>
                      <div className="grid grid-cols-2 gap-2 mb-4">
                        {backupCodes.map((code, index) => (
                          <div key={index} className="bg-white dark:bg-gray-800 p-2 rounded border text-center font-mono text-sm">
                            {code}
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          onClick={() => navigator.clipboard.writeText(backupCodes.join('\n'))}
                          variant="secondary"
                          className="text-sm py-2 px-3"
                        >
                          نسخ الرموز
                        </Button>
                        <Button 
                          onClick={() => setShowBackupCodes(false)}
                          variant="secondary"
                          className="text-sm py-2 px-3"
                        >
                          إخفاء
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </Card>

              {/* Security Warnings */}
              {needsPasswordChange && (
                <Card>
                  <div className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                    <div className="flex items-start space-x-3 space-x-reverse">
                      <div className="text-2xl">🚨</div>
                      <div>
                        <h3 className="font-semibold text-red-800 dark:text-red-200 mb-2">
                          مطلوب تغيير كلمة المرور
                        </h3>
                        <p className="text-red-700 dark:text-red-300 text-sm mb-3">
                          لم يتم تغيير كلمة المرور منذ فترة طويلة. يُنصح بتغييرها لضمان أمان الحساب.
                        </p>
                        <Button variant="primary" className="text-sm py-2 px-3">
                          تغيير كلمة المرور
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {/* قسم التحليل الذكي للأمان يظهر فقط عند showAiSection */}
              {showAiSection && (
                <Card>
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                          🤖 التحليل الذكي للأمان
                        </h3>
                        <p className="text-gray-600 dark:text-gray-300 text-sm">
                          إحصائيات مدعومة بالذكاء الاصطناعي للحالة الأمنية
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-flex items-center gap-1 text-xs bg-indigo-600 text-white px-3 py-1 rounded-full"
                          title="هذا القسم ظاهر فقط عند الوصول الإداري من لوحة التحكم"
                          aria-label="هذا القسم ظاهر فقط عند الوصول الإداري من لوحة التحكم"
                        >
                          خاص بالإدارة
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowPolicyInfo(true)}
                          className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                          aria-label="معلومات سياسة الوصول الإداري"
                          title="معلومات سياسة الوصول الإداري"
                        >
                          <FiInfo />
                        </button>
                        <div className="bg-gradient-to-br from-purple-500 to-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium">
                          مباشر
                        </div>
                      </div>
                    </div>

                    {/* Key Security Metrics */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 text-center hover:shadow-md transition-shadow">
                        <div className="text-3xl mb-3">🛡️</div>
                        <div className="text-2xl font-bold text-green-700 dark:text-green-300 mb-1">87</div>
                        <div className="text-xs font-medium text-green-600 dark:text-green-400 uppercase tracking-wide">نقاط الأمان</div>
                        <div className="text-xs text-gray-500 mt-1">من 100</div>
                      </div>
                      
                      <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 text-center hover:shadow-md transition-shadow">
                        <div className="text-3xl mb-3">👥</div>
                        <div className="text-2xl font-bold text-blue-700 dark:text-blue-300 mb-1">142</div>
                        <div className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide">جلسات نشطة</div>
                        <div className="text-xs text-gray-500 mt-1">+12% اليوم</div>
                      </div>
                      
                      <div className="bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-4 text-center hover:shadow-md transition-shadow">
                        <div className="text-3xl mb-3">⚠️</div>
                        <div className="text-2xl font-bold text-orange-700 dark:text-orange-300 mb-1">3</div>
                        <div className="text-xs font-medium text-orange-600 dark:text-orange-400 uppercase tracking-wide">تحذيرات</div>
                        <div className="text-xs text-gray-500 mt-1">متوسط</div>
                      </div>
                      
                      <div className="bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-center hover:shadow-md transition-shadow">
                        <div className="text-3xl mb-3">🚫</div>
                        <div className="text-2xl font-bold text-red-700 dark:text-red-300 mb-1">7</div>
                        <div className="text-xs font-medium text-red-600 dark:text-red-400 uppercase tracking-wide">تهديدات محجوبة</div>
                        <div className="text-xs text-gray-500 mt-1">آخر 24 ساعة</div>
                      </div>
                    </div>

                    {/* AI Status & Quick Insights */}
                    <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-900/20 dark:via-purple-900/20 dark:to-pink-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl p-5 mb-6">
                      <div className="flex items-start gap-4">
                        <div className="bg-white dark:bg-gray-8 00 p-3 rounded-full shadow-md">
                          <div className="text-2xl">🧠</div>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-indigo-900 dark:text-indigo-200 mb-2 text-lg">
                            تحليل AI للحالة الأمنية
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <span className="text-gray-700 dark:text-gray-300">الوضع العام: <span className="font-semibold text-green-600">آمن</span></span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              <span className="text-gray-700 dark:text-gray-300">نشاط المستخدمين: <span className="font-semibold text-blue-600">طبيعي</span></span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                              <span className="text-gray-700 dark:text-gray-300">مخاطر محتملة: <span className="font-semibold text-orange-600">متوسطة</span></span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                              <span className="text-gray-700 dark:text-gray-300">كفاءة الحماية: <span className="font-semibold text-purple-600">98.3%</span></span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold text-gray-900 dark:text-white">
                          إجراءات سريعة
                        </h4>
                        <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                          آخر تحديث: منذ دقيقتين
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <Button 
                          variant="secondary" 
                          className="flex items-center justify-center gap-2 py-3 hover:scale-105 transition-transform"
                          onClick={() => handleGenerateReport('daily')}
                        >
                          <span className="text-lg">📊</span>
                          <span className="text-xs">تقرير يومي</span>
                        </Button>
                        
                        <Button 
                          variant="secondary" 
                          className="flex items-center justify-center gap-2 py-3 hover:scale-105 transition-transform"
                          onClick={() => alert('تم تشغيل المسح الأمني')}
                        >
                          <span className="text-lg">🔍</span>
                          <span className="text-xs">مسح أمني</span>
                        </Button>
                        
                        <Button 
                          variant="secondary" 
                          className="flex items-center justify-center gap-2 py-3 hover:scale-105 transition-transform"
                          onClick={() => alert('تم تحديث قواعد الأمان')}
                        >
                          <span className="text-lg">⚡</span>
                          <span className="text-xs">تحديث فوري</span>
                        </Button>
                        
                        <Button 
                          variant="secondary" 
                          className="flex items-center justify-center gap-2 py-3 hover:scale-105 transition-transform"
                          onClick={() => handleGenerateReport('weekly')}
                        >
                          <span className="text-lg">📈</span>
                          <span className="text-xs">تقرير تفصيلي</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {/* Disable MFA */}
              <Card>
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    إعدادات متقدمة
                  </h3>
                  
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <h4 className="font-semibold text-red-800 dark:text-red-200 mb-2">
                      تعطيل المصادقة متعددة العوامل
                    </h4>
                    <p className="text-red-700 dark:text-red-300 text-sm mb-3">
                      سيؤدي هذا إلى تقليل مستوى أمان حسابك بشكل كبير. لا يُنصح بهذا الإجراء.
                    </p>
                    <Button 
                      onClick={handleDisableMFA}
                      variant="secondary"
                      className="bg-red-600 hover:bg-red-700 text-white border-red-600 text-sm py-2 px-3"
                    >
                      تعطيل المصادقة متعددة العوامل
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
        </div>
      </div>
    </div>
  );
};

export default MFAManagementPage;