import React, { useState } from 'react';
import { Employee, MfaVerificationRequest, MfaFactorType } from '../types';
import { MFAManager } from '../utils/mfa';
import Button from './ui/Button';
import Input from './ui/Input';
import Card from './ui/Card';

interface MFAVerificationProps {
  employee: Employee;
  onSuccess: (factorUsed: MfaFactorType) => void;
  onCancel: () => void;
}

const MFAVerification: React.FC<MFAVerificationProps> = ({ employee, onSuccess, onCancel }) => {
  const [method, setMethod] = useState<'totp' | 'backup'>('totp');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const remainingBackupCodes = MFAManager.getRemainingBackupCodesCount(employee);

  const handleVerify = () => {
    if (!code.trim()) {
      setError('يرجى إدخال الرمز');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const request: MfaVerificationRequest = {
        username: employee.username,
        ...(method === 'totp' ? { totpCode: code } : { backupCode: code })
      };

      const result = MFAManager.verifyMFA(employee, request);

      if (result.success && result.factorUsed) {
        onSuccess(result.factorUsed);
      } else {
        setError(result.error || 'رمز التحقق غير صحيح');
      }
    } catch (err) {
      setError('خطأ في التحقق من الرمز');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleVerify();
    }
  };

  return (
    <Card className="max-w-md mx-auto">
      <div className="p-8">
        <div className="text-center mb-6">
          <div className="text-4xl mb-4">🔐</div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            المصادقة متعددة العوامل
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            يرجى إدخال رمز التحقق لإكمال تسجيل الدخول
          </p>
        </div>

        {/* Method Selection */}
        <div className="mb-6">
          <div className="flex rounded-lg bg-gray-100 dark:bg-gray-800 p-1">
            <button
              type="button"
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                method === 'totp'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
              onClick={() => {
                setMethod('totp');
                setCode('');
                setError('');
              }}
            >
              تطبيق المصادقة
            </button>
            <button
              type="button"
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                method === 'backup'
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
              onClick={() => {
                setMethod('backup');
                setCode('');
                setError('');
              }}
              disabled={remainingBackupCodes === 0}
            >
              رمز احتياطي ({remainingBackupCodes})
            </button>
          </div>
        </div>

        {/* Code Input */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {method === 'totp' ? 'رمز من تطبيق المصادقة:' : 'الرمز الاحتياطي:'}
            </label>
            <Input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={method === 'totp' ? '123456' : 'ABCD1234'}
              maxLength={method === 'totp' ? 6 : 8}
              className="text-center text-xl tracking-wider font-mono"
              autoComplete="one-time-code"
              autoFocus
            />
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
              {method === 'totp' ? '6 أرقام من تطبيق المصادقة' : '8 أحرف/أرقام من الرموز المحفوظة'}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {method === 'backup' && remainingBackupCodes <= 3 && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300 px-4 py-3 rounded-lg text-sm">
              ⚠️ تبقى لديك {remainingBackupCodes} رموز احتياطية فقط. يُنصح بإنشاء رموز جديدة بعد تسجيل الدخول.
            </div>
          )}

          <div className="flex gap-3">
            <Button 
              onClick={handleVerify} 
              loading={loading} 
              disabled={!code.trim()}
              variant="primary"
              className="flex-1"
            >
              تحقق
            </Button>
            <Button onClick={onCancel} variant="secondary">
              إلغاء
            </Button>
          </div>
        </div>

        {/* Help Text */}
        <div className="mt-6 text-xs text-gray-500 dark:text-gray-400 text-center space-y-1">
          <p>💡 لا يمكن الوصول لتطبيق المصادقة؟ استخدم رمز احتياطي</p>
          <p>🔒 فقدت جميع طرق المصادقة؟ تواصل مع الإدارة</p>
        </div>
      </div>
    </Card>
  );
};

export default MFAVerification;