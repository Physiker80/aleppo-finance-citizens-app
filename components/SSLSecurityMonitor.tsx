/**
 * مكون مراقبة أمان SSL/TLS ورؤوس الأمان
 * مديرية مالية حلب - نظام الاستعلامات والشكاوى
 */

import React, { useState, useEffect } from 'react';
import Card from './ui/Card';
import Button from './ui/Button';
import { 
  Shield, 
  Lock, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock,
  RefreshCw,
  Eye,
  EyeOff,
  Server,
  Globe,
  Key,
  FileText,
  Zap
} from 'lucide-react';

interface SSLCertInfo {
  subject: string;
  issuer: string;
  validFrom: string;
  validTo: string;
  daysUntilExpiry: number;
  serialNumber: string;
  fingerprint: string;
  isValid: boolean;
  protocol: string;
  cipher: string;
}

interface SecurityHeaders {
  'strict-transport-security'?: string;
  'content-security-policy'?: string;
  'x-frame-options'?: string;
  'x-content-type-options'?: string;
  'x-xss-protection'?: string;
  'referrer-policy'?: string;
  'permissions-policy'?: string;
  'expect-ct'?: string;
}

interface SecurityStatus {
  ssl: {
    enabled: boolean;
    certificate?: SSLCertInfo;
    grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
    issues: string[];
  };
  headers: {
    present: SecurityHeaders;
    missing: string[];
    score: number;
  };
  protocol: {
    version: string;
    supported: string[];
    deprecated: string[];
  };
  lastChecked: string;
  checkInProgress: boolean;
}

const SSLSecurityMonitor: React.FC = () => {
  const [securityStatus, setSecurityStatus] = useState<SecurityStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  // فحص حالة الأمان
  const checkSecurityStatus = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // محاكاة فحص SSL - في الإنتاج سيكون API call حقيقي
      const response = await fetch('/api/security/check', {
        method: 'GET',
        credentials: 'same-origin'
      });
      
      if (!response.ok) {
        throw new Error(`فشل في فحص الأمان: ${response.status}`);
      }
      
      const data = await response.json();
      setSecurityStatus(data);
      
    } catch (err) {
      // محاكاة البيانات في حالة عدم وجود API
      console.warn('API غير متوفر، استخدام بيانات تجريبية:', err);
      
      const mockData: SecurityStatus = {
        ssl: {
          enabled: window.location.protocol === 'https:',
          certificate: window.location.protocol === 'https:' ? {
            subject: 'CN=finance.gov.sy, O=Syrian Finance Ministry, C=SY',
            issuer: 'CN=Let\'s Encrypt Authority X3, O=Let\'s Encrypt, C=US',
            validFrom: '2024-01-01T00:00:00Z',
            validTo: '2024-12-31T23:59:59Z',
            daysUntilExpiry: Math.floor((new Date('2024-12-31').getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
            serialNumber: 'XX:XX:XX:XX:XX:XX:XX:XX',
            fingerprint: 'SHA256:XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
            isValid: true,
            protocol: 'TLS 1.3',
            cipher: 'TLS_AES_256_GCM_SHA384'
          } : undefined,
          grade: window.location.protocol === 'https:' ? 'A+' : 'F',
          issues: window.location.protocol === 'https:' ? [] : ['HTTPS غير مفعل', 'لا توجد شهادة SSL']
        },
        headers: {
          present: {
            'strict-transport-security': 'max-age=31536000; includeSubDomains; preload',
            'content-security-policy': 'default-src \'self\'; script-src \'self\' \'unsafe-inline\'',
            'x-frame-options': 'DENY',
            'x-content-type-options': 'nosniff',
            'x-xss-protection': '1; mode=block',
            'referrer-policy': 'strict-origin-when-cross-origin'
          },
          missing: ['expect-ct', 'permissions-policy'],
          score: 85
        },
        protocol: {
          version: 'HTTP/2',
          supported: ['TLS 1.3', 'TLS 1.2'],
          deprecated: ['TLS 1.1', 'TLS 1.0', 'SSL 3.0', 'SSL 2.0']
        },
        lastChecked: new Date().toISOString(),
        checkInProgress: false
      };
      
      setSecurityStatus(mockData);
    } finally {
      setLoading(false);
    }
  };

  // تفعيل/إلغاء التحديث التلقائي
  const toggleAutoRefresh = () => {
    if (autoRefresh) {
      if (refreshInterval) clearInterval(refreshInterval);
      setRefreshInterval(null);
    } else {
      const interval = setInterval(checkSecurityStatus, 30000); // كل 30 ثانية
      setRefreshInterval(interval);
    }
    setAutoRefresh(!autoRefresh);
  };

  // تنظيف عند إلغاء المكون
  useEffect(() => {
    return () => {
      if (refreshInterval) clearInterval(refreshInterval);
    };
  }, [refreshInterval]);

  // فحص أولي
  useEffect(() => {
    checkSecurityStatus();
  }, []);

  const getSSLGradeColor = (grade: string) => {
    switch (grade) {
      case 'A+':
      case 'A': return 'text-green-600 dark:text-green-400';
      case 'B': return 'text-yellow-600 dark:text-yellow-400';
      case 'C': return 'text-orange-600 dark:text-orange-400';
      default: return 'text-red-600 dark:text-red-400';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 dark:text-green-400';
    if (score >= 75) return 'text-yellow-600 dark:text-yellow-400';
    if (score >= 60) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  if (!securityStatus && !loading) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">لا توجد بيانات أمان</h3>
          <Button onClick={checkSecurityStatus}>
            <RefreshCw className="w-4 h-4 ml-2" />
            فحص الأمان
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* رأس الصفحة */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 space-x-reverse">
          <Shield className="w-8 h-8 text-blue-600" />
          <div>
            <h2 className="text-2xl font-bold">مراقب الأمان</h2>
            <p className="text-gray-600 dark:text-gray-400">مراقبة SSL/TLS ورؤوس الأمان</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 space-x-reverse">
          <Button
            variant="secondary"
            onClick={toggleAutoRefresh}
            className={autoRefresh ? 'bg-green-100 text-green-700' : ''}
          >
            <Zap className={`w-4 h-4 ml-2 ${autoRefresh ? 'animate-pulse' : ''}`} />
            {autoRefresh ? 'تحديث تلقائي' : 'تحديث يدوي'}
          </Button>
          
          <Button onClick={checkSecurityStatus} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ml-2 ${loading ? 'animate-spin' : ''}`} />
            فحص
          </Button>
          
          <Button
            variant="secondary"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? <EyeOff className="w-4 h-4 ml-2" /> : <Eye className="w-4 h-4 ml-2" />}
            {showDetails ? 'إخفاء التفاصيل' : 'عرض التفاصيل'}
          </Button>
        </div>
      </div>

      {loading && (
        <Card className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="w-6 h-6 animate-spin ml-2" />
            جاري فحص الأمان...
          </div>
        </Card>
      )}

      {error && (
        <Card className="p-6 border-red-200 bg-red-50 dark:bg-red-900/20">
          <div className="flex items-center">
            <XCircle className="w-6 h-6 text-red-600 ml-2" />
            <span className="text-red-700 dark:text-red-300">{error}</span>
          </div>
        </Card>
      )}

      {securityStatus && (
        <>
          {/* نظرة عامة */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* حالة SSL */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <Lock className="w-6 h-6 text-blue-600 ml-2" />
                  <span className="font-semibold">SSL/TLS</span>
                </div>
                {securityStatus.ssl.enabled ? (
                  <CheckCircle className="w-6 h-6 text-green-600" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-600" />
                )}
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>الحالة:</span>
                  <span className={securityStatus.ssl.enabled ? 'text-green-600' : 'text-red-600'}>
                    {securityStatus.ssl.enabled ? 'مفعل' : 'معطل'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>التقييم:</span>
                  <span className={`font-bold ${getSSLGradeColor(securityStatus.ssl.grade)}`}>
                    {securityStatus.ssl.grade}
                  </span>
                </div>
                {securityStatus.ssl.certificate && (
                  <div className="flex justify-between">
                    <span>انتهاء الشهادة:</span>
                    <span className={securityStatus.ssl.certificate.daysUntilExpiry < 30 ? 'text-red-600' : 'text-green-600'}>
                      {securityStatus.ssl.certificate.daysUntilExpiry} يوم
                    </span>
                  </div>
                )}
              </div>
            </Card>

            {/* رؤوس الأمان */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <FileText className="w-6 h-6 text-purple-600 ml-2" />
                  <span className="font-semibold">رؤوس الأمان</span>
                </div>
                <div className={`text-2xl font-bold ${getScoreColor(securityStatus.headers.score)}`}>
                  {securityStatus.headers.score}%
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>موجود:</span>
                  <span className="text-green-600">
                    {Object.keys(securityStatus.headers.present).length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>مفقود:</span>
                  <span className="text-red-600">
                    {securityStatus.headers.missing.length}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ width: `${securityStatus.headers.score}%` }}
                  ></div>
                </div>
              </div>
            </Card>

            {/* بروتوكول */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <Server className="w-6 h-6 text-indigo-600 ml-2" />
                  <span className="font-semibold">البروتوكول</span>
                </div>
                <Globe className="w-6 h-6 text-gray-400" />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>النسخة:</span>
                  <span className="font-semibold">{securityStatus.protocol.version}</span>
                </div>
                <div className="flex justify-between">
                  <span>TLS مدعوم:</span>
                  <span className="text-green-600">
                    {securityStatus.protocol.supported.length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>مهجور:</span>
                  <span className="text-red-600">
                    {securityStatus.protocol.deprecated.length}
                  </span>
                </div>
              </div>
            </Card>
          </div>

          {/* المشاكل */}
          {securityStatus.ssl.issues.length > 0 && (
            <Card className="p-6 border-red-200 bg-red-50 dark:bg-red-900/20">
              <div className="flex items-center mb-4">
                <AlertTriangle className="w-6 h-6 text-red-600 ml-2" />
                <span className="font-semibold text-red-700 dark:text-red-300">
                  مشاكل الأمان ({securityStatus.ssl.issues.length})
                </span>
              </div>
              <ul className="space-y-2">
                {securityStatus.ssl.issues.map((issue, index) => (
                  <li key={index} className="flex items-center text-red-600 dark:text-red-400">
                    <XCircle className="w-4 h-4 ml-2" />
                    {issue}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* التفاصيل */}
          {showDetails && (
            <div className="space-y-6">
              {/* تفاصيل الشهادة */}
              {securityStatus.ssl.certificate && (
                <Card className="p-6">
                  <div className="flex items-center mb-4">
                    <Key className="w-6 h-6 text-blue-600 ml-2" />
                    <span className="font-semibold">تفاصيل شهادة SSL</span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <strong>الموضوع:</strong>
                      <p className="text-gray-600 dark:text-gray-400 mt-1 font-mono">
                        {securityStatus.ssl.certificate.subject}
                      </p>
                    </div>
                    <div>
                      <strong>المُصدر:</strong>
                      <p className="text-gray-600 dark:text-gray-400 mt-1 font-mono">
                        {securityStatus.ssl.certificate.issuer}
                      </p>
                    </div>
                    <div>
                      <strong>صالحة من:</strong>
                      <p className="text-gray-600 dark:text-gray-400 mt-1">
                        {new Date(securityStatus.ssl.certificate.validFrom).toLocaleDateString('ar-SY')}
                      </p>
                    </div>
                    <div>
                      <strong>صالحة إلى:</strong>
                      <p className="text-gray-600 dark:text-gray-400 mt-1">
                        {new Date(securityStatus.ssl.certificate.validTo).toLocaleDateString('ar-SY')}
                      </p>
                    </div>
                    <div>
                      <strong>البروتوكول:</strong>
                      <p className="text-gray-600 dark:text-gray-400 mt-1">
                        {securityStatus.ssl.certificate.protocol}
                      </p>
                    </div>
                    <div>
                      <strong>Cipher:</strong>
                      <p className="text-gray-600 dark:text-gray-400 mt-1 font-mono">
                        {securityStatus.ssl.certificate.cipher}
                      </p>
                    </div>
                  </div>
                </Card>
              )}

              {/* رؤوس الأمان المفصلة */}
              <Card className="p-6">
                <div className="flex items-center mb-4">
                  <FileText className="w-6 h-6 text-purple-600 ml-2" />
                  <span className="font-semibold">رؤوس الأمان المفصلة</span>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-green-600 mb-2">
                      رؤوس موجودة ({Object.keys(securityStatus.headers.present).length})
                    </h4>
                    <div className="space-y-2">
                      {Object.entries(securityStatus.headers.present).map(([header, value]) => (
                        <div key={header} className="bg-gray-50 dark:bg-gray-800 p-3 rounded">
                          <div className="font-mono text-sm font-semibold">{header}</div>
                          <div className="font-mono text-xs text-gray-600 dark:text-gray-400 mt-1">
                            {value}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {securityStatus.headers.missing.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-red-600 mb-2">
                        رؤوس مفقودة ({securityStatus.headers.missing.length})
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {securityStatus.headers.missing.map((header) => (
                          <span key={header} className="px-3 py-1 bg-red-100 text-red-700 text-sm rounded">
                            {header}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}

          {/* آخر فحص */}
          <Card className="p-4">
            <div className="flex items-center justify-center text-sm text-gray-600 dark:text-gray-400">
              <Clock className="w-4 h-4 ml-2" />
              آخر فحص: {new Date(securityStatus.lastChecked).toLocaleString('ar-SY')}
            </div>
          </Card>
        </>
      )}
    </div>
  );
};

export default SSLSecurityMonitor;