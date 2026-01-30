/**
 * إعدادات أمان HTTP Headers لنظام وزارة المالية السورية
 * نظام الاستعلامات والشكاوى - مديرية مالية حلب
 */

// أنواع بيانات للتطبيق
interface SecurityConfig {
  headers: Record<string, string>;
  blockedPaths: string[];
  suspiciousBots: string[];
}

interface ValidationResult {
  isValid: boolean;
  score: number;
  feedback: string[];
}

// تكوين رؤوس الأمان
export const securityHeaders = {
  // HSTS - إجبار استخدام HTTPS لمدة سنتين
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  
  // منع تضمين الموقع في إطارات (حماية من Clickjacking)
  'X-Frame-Options': 'DENY',
  
  // منع تشم نوع المحتوى
  'X-Content-Type-Options': 'nosniff',
  
  // حماية من XSS
  'X-XSS-Protection': '1; mode=block',
  
  // سياسة الإحالة الآمنة
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  
  // منع DNS prefetching للخصوصية
  'X-DNS-Prefetch-Control': 'off',
  
  // منع تحميل المحتوى المختلط
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://fonts.googleapis.com https://www.google.com https://www.gstatic.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.gstatic.com",
    "font-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com data:",
    "img-src 'self' data: https://syrian.zone blob: https://www.google.com https://maps.gstatic.com",
    "connect-src 'self' wss: ws: https://api.github.com",
    "media-src 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
    "block-all-mixed-content"
  ].join('; '),
  
  // سياسة الصلاحيات
  'Permissions-Policy': [
    'camera=()',
    'microphone=()',
    'geolocation=(self)',
    'payment=()',
    'usb=()',
    'magnetometer=()',
    'accelerometer=()',
    'gyroscope=()',
    'fullscreen=(self)',
    'document-domain=()',
    'autoplay=()',
    'encrypted-media=()',
    'picture-in-picture=()',
    'sync-xhr=()'
  ].join(', '),
  
  // معلومات الخادم المخصصة
  'X-Powered-By': 'Syrian Ministry of Finance',
  'X-Server-Info': 'Aleppo Finance Directorate - Secure Server',
  
  // منع تخزين الصفحات الحساسة
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
  'Surrogate-Control': 'no-store'
};

/**
 * Middleware لتطبيق رؤوس الأمان (للاستخدام مع Express)
 */
export const applySecurityHeaders = (req: any, res: any, next: any) => {
  // تطبيق رؤوس الأمان
  Object.entries(securityHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
  
  // التحقق من HTTPS في الإنتاج
  if (process.env.NODE_ENV === 'production' && !req.url.startsWith('/health')) {
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    if (protocol !== 'https') {
      return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
  }
  
  // تسجيل الطلبات المشبوهة
  const userAgent = req.headers['user-agent'] || '';
  const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
  
  // كشف البوتات المشبوهة
  const suspiciousBots = [
    'sqlmap', 'nikto', 'nessus', 'openvas', 'masscan',
    'nmap', 'zap', 'burp', 'w3af', 'hydra'
  ];
  
  if (suspiciousBots.some(bot => userAgent.toLowerCase().includes(bot))) {
    console.warn(`🚨 Suspicious bot detected: ${userAgent} from ${ip}`);
    return res.status(403).send('Access Denied');
  }
  
  // منع الوصول للمسارات الحساسة
  const blockedPaths = [
    '/.env', '/.git', '/config', '/admin', '/wp-admin',
    '/phpmyadmin', '/phpinfo.php', '/server-info', '/server-status'
  ];
  
  if (blockedPaths.some(path => req.url.startsWith(path))) {
    console.warn(`🚨 Blocked access attempt to ${req.url} from ${ip}`);
    return res.status(404).send('Not Found');
  }
  
  next();
};

/**
 * دالة مساعدة لإضافة رؤوس أمان إضافية للصفحات الحساسة
 */
export const addSensitivePageHeaders = (res: any) => {
  // رؤوس إضافية للصفحات الحساسة
  const sensitiveHeaders = {
    // منع التخزين المؤقت تماماً
    'Cache-Control': 'no-store, no-cache, must-revalidate, private',
    'Pragma': 'no-cache',
    'Expires': '0',
    
    // منع الفهرسة في محركات البحث
    'X-Robots-Tag': 'noindex, nofollow, nosnippet, noarchive, noimageindex',
    
    // حماية إضافية ضد XSS
    'X-XSS-Protection': '1; mode=block; report=https://finance.gov.sy/security/xss-report',
    
    // CSP أكثر صرامة
    'Content-Security-Policy': [
      "default-src 'none'",
      "script-src 'self' 'nonce-{{nonce}}'",
      "style-src 'self' 'nonce-{{nonce}}'",
      "img-src 'self' data:",
      "font-src 'self'",
      "connect-src 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "base-uri 'none'"
    ].join('; ')
  };
  
  Object.entries(sensitiveHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
  
  return res;
};

/**
 * دالة للتحقق من قوة كلمة المرور
 */
export const validatePasswordStrength = (password: string): {
  isValid: boolean;
  score: number;
  feedback: string[];
} => {
  const feedback: string[] = [];
  let score = 0;
  
  // طول كلمة المرور
  if (password.length < 8) {
    feedback.push('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
  } else if (password.length >= 12) {
    score += 2;
  } else {
    score += 1;
  }
  
  // وجود أحرف كبيرة
  if (!/[A-Z]/.test(password)) {
    feedback.push('يجب أن تحتوي على حرف كبير واحد على الأقل');
  } else {
    score += 1;
  }
  
  // وجود أحرف صغيرة
  if (!/[a-z]/.test(password)) {
    feedback.push('يجب أن تحتوي على حرف صغير واحد على الأقل');
  } else {
    score += 1;
  }
  
  // وجود أرقام
  if (!/\d/.test(password)) {
    feedback.push('يجب أن تحتوي على رقم واحد على الأقل');
  } else {
    score += 1;
  }
  
  // وجود رموز خاصة
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    feedback.push('يجب أن تحتوي على رمز خاص واحد على الأقل');
  } else {
    score += 1;
  }
  
  // فحص الكلمات الشائعة
  const commonPasswords = [
    'password', '123456', '123456789', 'qwerty', 'abc123',
    'password123', '123123', '111111', '1234567890',
    'admin', 'root', 'user', 'test', 'guest'
  ];
  
  if (commonPasswords.includes(password.toLowerCase())) {
    feedback.push('كلمة المرور شائعة جداً - اختر كلمة مرور أقوى');
    score = 0;
  }
  
  return {
    isValid: score >= 4 && feedback.length === 0,
    score: Math.min(score, 5),
    feedback
  };
};

/**
 * دالة تشفير البيانات الحساسة
 */
export const encryptSensitiveData = (data: string, key?: string): string => {
  // في التطبيق الحقيقي استخدم مكتبة تشفير قوية مثل crypto-js
  // هذا مثال بسيط للتوضيح
  
  if (typeof window !== 'undefined') {
    // في المتصفح - استخدم Web Crypto API
    return btoa(encodeURIComponent(data));
  } else {
    // في الخادم - استخدم Node.js crypto
    const crypto = require('crypto');
    const algorithm = 'aes-256-gcm';
    const secretKey = key || process.env.ENCRYPTION_KEY || 'default-key-change-in-production';
    
    const cipher = crypto.createCipher(algorithm, secretKey);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return encrypted;
  }
};

/**
 * دالة فك تشفير البيانات
 */
export const decryptSensitiveData = (encryptedData: string, key?: string): string => {
  if (typeof window !== 'undefined') {
    // في المتصفح
    return decodeURIComponent(atob(encryptedData));
  } else {
    // في الخادم
    const crypto = require('crypto');
    const algorithm = 'aes-256-gcm';
    const secretKey = key || process.env.ENCRYPTION_KEY || 'default-key-change-in-production';
    
    const decipher = crypto.createDecipher(algorithm, secretKey);
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
};

/**
 * دالة توليد nonce للـ CSP
 */
export const generateNonce = (): string => {
  if (typeof window !== 'undefined') {
    // في المتصفح
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode.apply(null, array as any));
  } else {
    // في الخادم
    const crypto = require('crypto');
    return crypto.randomBytes(16).toString('base64');
  }
};

export default applySecurityHeaders;