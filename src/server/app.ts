/**
 * خادم Express مع التشفير أثناء النقل وميزات الأمان المتقدمة
 * مديرية مالية حلب - نظام الاستعلامات والشكاوى
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

// 10. خدمة ملفات React المبنية
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