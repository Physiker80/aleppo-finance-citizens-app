/**
 * خادم Express مع التشفير أثناء النقل وميزات الأمان المتقدمة
 * نظام الاستعلامات والشكاوى - بوابة الخدمات الإلكترونية
 */

import express from 'express';
import path from 'path';
import { createServer } from 'https';
import { readFileSync } from 'fs';
import { applySecurityHeaders, addSensitivePageHeaders } from '../../middleware/security';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import * as dbService from './dbService';
import * as dbConfig from './dbConfig';

const app = express();

// 1. إعداد أساسي للتطبيق
app.set('trust proxy', true);

// 2. Middleware الأمان المخصص
app.use(applySecurityHeaders);

// 3. Helmet للحماية الإضافية
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https:", "data:"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "wss:", "https:"],
      fontSrc: ["'self'", "data:", "https:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

// 4. CORS للمجالات المصرح بها فقط
const allowedOrigins = [
  'https://finance.gov.sy',
  'https://www.finance.gov.sy',
  'https://aleppo-finance.gov.sy',
  process.env.NODE_ENV === 'development' ? 'http://localhost:5173' : null,
  process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : null,
  process.env.NODE_ENV === 'development' ? 'https://localhost:5173' : null
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // السماح للطلبات بدون origin (مثل التطبيقات المحمولة)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    console.warn(`🚨 CORS blocked origin: ${origin}`);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// 5. Rate Limiting متقدم
const createRateLimit = (windowMs: number, max: number, message: string) => 
  rateLimit({
    windowMs,
    max,
    message: { error: message, code: 'RATE_LIMIT_EXCEEDED' },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      const forwarded = req.headers['x-forwarded-for'] as string;
      const ip = forwarded ? forwarded.split(',')[0] : req.ip;
      return ip || 'unknown';
    },
    skip: (req) => {
      // تجاهل Rate Limiting للطلبات الداخلية
      const ip = req.ip;
      return ip === '127.0.0.1' || ip === '::1';
    }
  });

// Rate limits مختلفة لمسارات مختلفة
app.use('/api/auth', createRateLimit(15 * 60 * 1000, 10, 'محاولات تسجيل دخول كثيرة جداً'));
app.use('/api/tickets', createRateLimit(60 * 1000, 20, 'طلبات كثيرة جداً للتذاكر'));
app.use('/api/contact', createRateLimit(60 * 1000, 5, 'رسائل كثيرة جداً'));
app.use('/api', createRateLimit(60 * 1000, 100, 'طلبات كثيرة جداً للAPI'));

// 6. ضغط الاستجابات
app.use(compression({
  level: 6,
  threshold: 1000,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  }
}));

// 7. معالجة البيانات
app.use(express.json({ 
  limit: '10mb',
  verify: (_req, _res, buf) => {
    try {
      JSON.parse(buf.toString());
    } catch (_e) {
      // Throw to trigger the error handler; direct res.status is unsafe here
      const err: any = new Error('Invalid JSON');
      err.status = 400;
      throw err;
    }
  }
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb' 
}));

// 8. الصفحات الحساسة مع حماية إضافية
const sensitiveRoutes = [
  '/employee',
  '/admin',
  '/dashboard',
  '/reports',
  '/analytics'
];

app.use(sensitiveRoutes, (req, res, next) => {
  addSensitivePageHeaders(res);
  next();
});

// 9. API Routes (يجب إنشاؤها في ملفات منفصلة)
app.use('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    ssl: req.secure ? 'enabled' : 'disabled'
  });
});

// 10. Database Control API Routes (للمدير فقط)

// التحقق من صلاحيات المدير
const requireAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'غير مصرح - يلزم تسجيل الدخول' });
  }
  
  try {
    const token = authHeader.split(' ')[1];
    const userData = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
    if (userData.role !== 'مدير') {
      return res.status(403).json({ error: 'غير مصرح - صلاحيات المدير مطلوبة' });
    }
    next();
  } catch {
    return res.status(401).json({ error: 'رمز غير صالح' });
  }
};

// فحص صحة قاعدة البيانات
app.get('/api/db/health', requireAdmin, async (req, res) => {
  try {
    const result = await dbService.checkHealth();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ 
      connected: false, 
      error: error.message 
    });
  }
});

// قياس زمن الاستجابة
app.get('/api/db/latency', requireAdmin, async (req, res) => {
  try {
    const result = await dbService.measureLatency();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// تنفيذ استعلام اختباري
app.post('/api/db/test', requireAdmin, async (req, res) => {
  try {
    const { query } = req.body;
    // السماح فقط باستعلامات SELECT للأمان
    if (!query || !query.trim().toLowerCase().startsWith('select')) {
      return res.status(400).json({ 
        success: false, 
        error: 'يُسمح فقط باستعلامات SELECT' 
      });
    }
    const result = await dbService.runTestQuery(query);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// إحصائيات pool الاتصالات
app.get('/api/db/stats', requireAdmin, async (req, res) => {
  try {
    const result = await dbService.poolStats();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ 
      error: error.message 
    });
  }
});

// إعادة تعيين الاتصال
app.post('/api/db/reconnect', requireAdmin, async (req, res) => {
  try {
    const result = await dbService.resetPool();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// الأخطاء الأخيرة
app.get('/api/db/errors', requireAdmin, async (req, res) => {
  try {
    const result = await dbService.getRecentErrors();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ 
      error: error.message 
    });
  }
});

// ===== 11. Database Configuration Management API =====

// الحصول على قائمة التكوينات
app.get('/api/db/configs', requireAdmin, (req, res) => {
  try {
    const configs = dbConfig.exportConfigurations(); // بدون كلمات المرور
    res.json({ configs });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// الحصول على التكوين النشط
app.get('/api/db/configs/active', requireAdmin, (req, res) => {
  try {
    const config = dbConfig.getActiveConfiguration();
    if (config) {
      // إخفاء كلمة المرور
      res.json({
        ...config,
        connection: { ...config.connection, password: '***HIDDEN***' }
      });
    } else {
      res.status(404).json({ error: 'لا يوجد تكوين نشط' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// الحصول على قوالب المزودين
app.get('/api/db/providers', requireAdmin, (req, res) => {
  try {
    res.json({
      providers: dbConfig.providerInfo,
      templates: dbConfig.providerTemplates,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// إضافة تكوين جديد
app.post('/api/db/configs', requireAdmin, (req, res) => {
  try {
    const { name, provider, connection, providerMeta, isActive } = req.body;
    
    if (!name || !provider || !connection) {
      return res.status(400).json({ error: 'البيانات المطلوبة ناقصة' });
    }
    
    const newConfig = dbConfig.addConfiguration({
      name,
      provider,
      connection,
      providerMeta,
      isActive: isActive || false,
    });
    
    res.status(201).json({
      success: true,
      config: { ...newConfig, connection: { ...newConfig.connection, password: '***HIDDEN***' } }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// تحديث تكوين
app.put('/api/db/configs/:id', requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const updatedConfig = dbConfig.updateConfiguration(id, updates);
    
    if (!updatedConfig) {
      return res.status(404).json({ error: 'التكوين غير موجود' });
    }
    
    res.json({
      success: true,
      config: { ...updatedConfig, connection: { ...updatedConfig.connection, password: '***HIDDEN***' } }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// حذف تكوين
app.delete('/api/db/configs/:id', requireAdmin, (req, res) => {
  try {
    const { id } = req.params;
    const deleted = dbConfig.deleteConfiguration(id);
    
    if (!deleted) {
      return res.status(404).json({ error: 'التكوين غير موجود' });
    }
    
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// تبديل التكوين النشط
app.post('/api/db/configs/:id/activate', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { updateEnv } = req.body;
    
    const config = dbConfig.switchActiveConfiguration(id);
    
    if (!config) {
      return res.status(404).json({ error: 'التكوين غير موجود' });
    }
    
    // تحديث ملف .env إذا طلب
    if (updateEnv) {
      const envUpdated = dbConfig.updateEnvFile(config);
      if (!envUpdated) {
        return res.json({
          success: true,
          warning: 'تم التبديل لكن فشل تحديث ملف .env',
          config: { ...config, connection: { ...config.connection, password: '***HIDDEN***' } }
        });
      }
    }
    
    // إعادة الاتصال بقاعدة البيانات الجديدة
    await dbService.resetPool();
    
    res.json({
      success: true,
      message: 'تم تبديل قاعدة البيانات بنجاح',
      config: { ...config, connection: { ...config.connection, password: '***HIDDEN***' } }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// اختبار اتصال تكوين معين
app.post('/api/db/configs/:id/test', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const configs = dbConfig.loadConfigurations();
    const config = configs.find(c => c.id === id);
    
    if (!config) {
      return res.status(404).json({ error: 'التكوين غير موجود' });
    }
    
    // اختبار الاتصال (نستخدم فحص الصحة الحالي للتبسيط)
    // في الإنتاج يجب إنشاء اتصال مؤقت للاختبار
    const startTime = Date.now();
    const connectionString = dbConfig.buildConnectionString(config);
    
    // محاكاة اختبار الاتصال
    try {
      const { Pool } = require('pg');
      const testPool = new Pool({ connectionString, connectionTimeoutMillis: 5000 });
      const client = await testPool.connect();
      await client.query('SELECT 1');
      client.release();
      await testPool.end();
      
      const latencyMs = Date.now() - startTime;
      
      // تحديث حالة الاختبار
      dbConfig.updateConfiguration(id, {
        lastTestedAt: new Date().toISOString(),
        lastTestSuccess: true,
      });
      
      res.json({
        success: true,
        latencyMs,
        message: 'الاتصال ناجح'
      });
    } catch (testError: any) {
      dbConfig.updateConfiguration(id, {
        lastTestedAt: new Date().toISOString(),
        lastTestSuccess: false,
      });
      
      res.json({
        success: false,
        error: testError.message,
        hint: getConnectionErrorHint(testError)
      });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// تصدير تكوينات
app.get('/api/db/configs/export', requireAdmin, (req, res) => {
  try {
    const configs = dbConfig.exportConfigurations();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=db-configs-${new Date().toISOString().slice(0,10)}.json`);
    res.json({ configs, exportedAt: new Date().toISOString() });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// استيراد تكوينات
app.post('/api/db/configs/import', requireAdmin, (req, res) => {
  try {
    const { configs } = req.body;
    
    if (!Array.isArray(configs)) {
      return res.status(400).json({ error: 'التنسيق غير صحيح' });
    }
    
    const imported = dbConfig.importConfigurations(configs);
    res.json({ success: true, imported });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// دالة مساعدة لتلميحات الأخطاء
function getConnectionErrorHint(err: any): string {
  const code = err.code || '';
  const message = err.message || '';
  
  if (code === 'ECONNREFUSED') return 'تأكد من تشغيل خادم قاعدة البيانات';
  if (code === 'ENOTFOUND') return 'تحقق من عنوان الخادم';
  if (message.includes('password')) return 'تحقق من كلمة المرور';
  if (message.includes('timeout')) return 'انتهت مهلة الاتصال';
  if (message.includes('SSL')) return 'تحقق من إعدادات SSL';
  
  return 'راجع إعدادات الاتصال';
}

// 12. خدمة ملفات React المبنية
const distPath = path.join(__dirname, '../../dist');
app.use(express.static(distPath, {
  maxAge: process.env.NODE_ENV === 'production' ? '1y' : '0',
  etag: true,
  lastModified: true,
  setHeaders: (res, path) => {
    // إعداد رؤوس التخزين المؤقت
    if (path.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    } else if (path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  }
}));

// 11. SPA Routing - إعادة توجيه جميع المسارات لـ index.html
app.get('*', (req, res) => {
  // تطبيق رؤوس أمان إضافية للصفحة الرئيسية
  addSensitivePageHeaders(res);
  
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) {
      console.error('Error sending index.html:', err);
      res.status(500).send('خطأ في الخادم');
    }
  });
});

// 12. معالجة الأخطاء
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error:', err);
  
  // عدم كشف تفاصيل الأخطاء في الإنتاج
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(err.status || 500).json({
    error: isDevelopment ? err.message : 'خطأ داخلي في الخادم',
    ...(isDevelopment && { stack: err.stack })
  });
});

// 13. إعداد HTTPS Server
const startServer = () => {
  const PORT = Number(process.env.PORT ?? 3000);
  const HTTPS_PORT = Number(process.env.HTTPS_PORT ?? 443);
  
  if (process.env.NODE_ENV === 'production') {
    try {
      // إعداد HTTPS في الإنتاج
      const httpsOptions = {
        key: readFileSync('/etc/ssl/private/finance.gov.sy.key'),
        cert: readFileSync('/etc/ssl/certs/finance.gov.sy.crt'),
        ca: readFileSync('/etc/ssl/certs/finance.gov.sy.ca-bundle'),
        // إعدادات SSL إضافية للأمان
        secureProtocol: 'TLSv1_3_method',
        ciphers: [
          'TLS_AES_256_GCM_SHA384',
          'TLS_CHACHA20_POLY1305_SHA256',
          'TLS_AES_128_GCM_SHA256',
          'ECDHE-RSA-AES256-GCM-SHA384',
          'ECDHE-RSA-AES128-GCM-SHA256'
        ].join(':'),
        honorCipherOrder: true,
        sessionIdContext: 'finance-gov-sy'
      };
      
      const httpsServer = createServer(httpsOptions, app);
      
      httpsServer.listen(HTTPS_PORT, '0.0.0.0', () => {
        console.log(`🔒 HTTPS Server running on port ${HTTPS_PORT}`);
        console.log(`🌐 Environment: ${process.env.NODE_ENV}`);
        console.log(`🔐 SSL/TLS: Enabled with TLS 1.3`);
      });
      
      // إعادة توجيه HTTP إلى HTTPS
      const httpApp = express();
      httpApp.use((req, res) => {
        res.redirect(301, `https://${req.headers.host}${req.url}`);
      });
      
      httpApp.listen(80, '0.0.0.0', () => {
        console.log('🔄 HTTP to HTTPS redirect running on port 80');
      });
      
    } catch (error) {
      console.error('❌ Failed to start HTTPS server:', error);
      console.log('🔧 Starting HTTP server instead...');
      
      app.listen(PORT, '0.0.0.0', () => {
        console.log(`🌐 HTTP Server running on port ${PORT}`);
        console.log(`⚠️  Warning: Running without HTTPS in production!`);
      });
    }
  } else {
    // Development mode - HTTP only
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Development server running on port ${PORT}`);
      console.log(`📱 Local: http://localhost:${PORT}`);
    });
  }
};

// 14. Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received. Shutting down gracefully...');
  process.exit(0);
});

// بدء الخادم
if (require.main === module) {
  startServer();
}

export default app;
export { startServer };