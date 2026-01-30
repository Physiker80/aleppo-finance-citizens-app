import React, { useState } from 'react';
import { Employee, MfaSetupData } from '../types';
import { MFAManager } from '../utils/mfa';
import Button from './ui/Button';
import Input from './ui/Input';
import Card from './ui/Card';

interface MFASetupProps {
  employee: Employee;
  onSetupComplete: (updatedEmployee: Employee, backupCodes: string[]) => void;
  onCancel: () => void;
}

const MFASetup: React.FC<MFASetupProps> = ({ employee, onSetupComplete, onCancel }) => {
  const [step, setStep] = useState<'intro' | 'setup' | 'verify' | 'backup'>('intro');
  const [setupData, setSetupData] = useState<MfaSetupData | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleStartSetup = () => {
    try {
      const data = MFAManager.setupMFA(employee);
      setSetupData(data);
      setStep('setup');
    } catch (err) {
      setError('خطأ في إنشاء بيانات المصادقة متعددة العوامل');
    }
  };

  const handleVerifySetup = () => {
    if (!setupData || !verificationCode.trim()) {
      setError('يرجى إدخال رمز التحقق');
      return;
    }

    setLoading(true);
    try {
      // Create a temporary employee with MFA data for verification
      const tempEmployee = MFAManager.enableMFA(employee, setupData.secret, setupData.backupCodes);
      
      const result = MFAManager.verifyMFA(tempEmployee, {
        username: employee.username,
        totpCode: verificationCode
      });

      if (result.success) {
        setStep('backup');
        setError('');
      } else {
        setError(result.error || 'رمز التحقق غير صحيح');
      }
    } catch (err) {
      setError('خطأ في التحقق من الرمز');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteSetup = () => {
    if (!setupData) return;
    
    const updatedEmployee = MFAManager.enableMFA(employee, setupData.secret, setupData.backupCodes);
    onSetupComplete(updatedEmployee, setupData.backupCodes);
  };

  const renderQRCode = () => {
    if (!setupData) return null;

    // Create a simple QR code representation (in production use a proper QR code library)
    const qrSize = 200;
    return (
      <div className="flex flex-col items-center space-y-4">
        <div 
          className="border-2 border-gray-300 bg-white p-4 rounded-lg flex items-center justify-center"
          style={{ width: qrSize, height: qrSize }}
        >
          <div className="text-center text-sm text-gray-600">
            <div className="font-bold mb-2">QR Code</div>
            <div className="text-xs break-all">{setupData.secret}</div>
          </div>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-2">أو أدخل الرمز يدوياً:</p>
          <code className="bg-gray-100 px-3 py-1 rounded text-sm font-mono break-all">
            {setupData.secret}
          </code>
        </div>
      </div>
    );
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <div className="p-8">
        {step === 'intro' && (
          <div className="text-center space-y-6">
            <div className="text-6xl">🔐</div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              تفعيل المصادقة متعددة العوامل
            </h2>
            <div className="space-y-4 text-right">
              <p className="text-gray-600 dark:text-gray-300">
                المصادقة متعددة العوامل تضيف طبقة حماية إضافية لحسابك من خلال:
              </p>
              <ul className="space-y-2 text-gray-600 dark:text-gray-300">
                <li className="flex items-center space-x-3 space-x-reverse">
                  <span className="text-green-500">✓</span>
                  <span>حماية ضد اختراق كلمات المرور</span>
                </li>
                <li className="flex items-center space-x-3 space-x-reverse">
                  <span className="text-green-500">✓</span>
                  <span>رموز أمان متجددة كل 30 ثانية</span>
                </li>
                <li className="flex items-center space-x-3 space-x-reverse">
                  <span className="text-green-500">✓</span>
                  <span>رموز احتياطية للطوارئ</span>
                </li>
              </ul>
            </div>
            <div className="flex gap-4 justify-center">
              <Button onClick={handleStartSetup} variant="primary">
                ابدأ التفعيل
              </Button>
              <Button onClick={onCancel} variant="secondary">
                إلغاء
              </Button>
            </div>
          </div>
        )}

        {step === 'setup' && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                إعداد تطبيق المصادقة
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                امسح رمز QR باستخدام تطبيق مصادقة مثل Google Authenticator أو Microsoft Authenticator
              </p>
            </div>
            
            {renderQRCode()}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  أدخل الرمز من التطبيق للتحقق:
                </label>
                <Input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="123456"
                  maxLength={6}
                  className="text-center text-2xl tracking-wider font-mono"
                />
              </div>
              
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              <div className="flex gap-4 justify-center">
                <Button onClick={handleVerifySetup} loading={loading} disabled={!verificationCode.trim()}>
                  تحقق من الرمز
                </Button>
                <Button onClick={() => setStep('intro')} variant="secondary">
                  العودة
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === 'backup' && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="text-4xl mb-4">✅</div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                تم تفعيل المصادقة متعددة العوامل بنجاح!
              </h2>
            </div>
            
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
              <h3 className="font-bold text-yellow-800 dark:text-yellow-200 mb-4">
                ⚠️ رموز الاسترداد الاحتياطية
              </h3>
              <p className="text-yellow-700 dark:text-yellow-300 mb-4 text-sm">
                احفظ هذه الرموز في مكان آمن. يمكن استخدام كل رمز مرة واحدة فقط في حالة فقدان الوصول لتطبيق المصادقة.
              </p>
              
              <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                {setupData?.backupCodes.map((code, index) => (
                  <div key={index} className="bg-white dark:bg-gray-800 p-2 rounded border text-center">
                    {code}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h4 className="font-bold text-blue-800 dark:text-blue-200 mb-2">💡 نصائح هامة:</h4>
              <ul className="text-blue-700 dark:text-blue-300 text-sm space-y-1">
                <li>• طباعة الرموز وحفظها في مكان آمن</li>
                <li>• عدم مشاركة الرموز مع أي شخص</li>
                <li>• تأكد من عمل نسخة احتياطية من تطبيق المصادقة</li>
              </ul>
            </div>

            <div className="flex justify-center">
              <Button onClick={handleCompleteSetup} variant="primary">
                إنهاء التفعيل
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default MFASetup;