// Simple email sending server using Express + Nodemailer
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import sanitizeHtml from 'sanitize-html';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { requestIdMiddleware, logMiddleware, metricsLiteHandler } from './Sicherheit/backend/expressMiddlewares.js';
import promClient from 'prom-client';
import SecurityMonitor from './Sicherheit/backend/securityMonitor.js';
import { PrismaClient } from '@prisma/client';
import cookieParser from 'cookie-parser';
import { hashPassword, verifyPassword } from './Sicherheit/backend/crypto.js';
import multer from 'multer';
import { authenticator } from 'otplib';
import qrcode from 'qrcode';
import { CSPMiddleware } from './Sicherheit/backend/csp.js';
import { inputValidator } from './Sicherheit/backend/inputValidator.js';
import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';

// --- MFA & Crypto Helpers ---

// Simple symmetric encryption for MFA secrets. Use a strong, rotated key in production.
const MFA_ENCRYPTION_KEY = process.env.MFA_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
if (!process.env.MFA_ENCRYPTION_KEY) {
    console.warn('Warning: MFA_ENCRYPTION_KEY is not set. Using a temporary key.');
}
const ALGORITHM = 'aes-256-gcm';

function encrypt(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(MFA_ENCRYPTION_KEY, 'hex'), iv);
    const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

function decrypt(text) {
    try {
        const [iv, tag, encrypted] = text.split(':');
        const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(MFA_ENCRYPTION_KEY, 'hex'), Buffer.from(iv, 'hex'));
        decipher.setAuthTag(Buffer.from(tag, 'hex'));
        const decrypted = Buffer.concat([decipher.update(Buffer.from(encrypted, 'hex')), decipher.final()]);
        return decrypted.toString();
    } catch (e) {
        console.error("Decryption failed. This may be due to a key change or corrupt data.");
        return null;
    }
}

// ---- Redaction & Sanitization Utilities ----
// Simple PII patterns (extendable): national IDs (11 digits), email, phone numbers
const REDACTION_RULES = [
  { key: 'nationalId', pattern: /\b\d{11}\b/g, replace: '[[REDACTED_NID]]' },
  { key: 'email', pattern: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, replace: '[[REDACTED_EMAIL]]' },
  { key: 'phone', pattern: /\b(?:\+?\d[\d\s\-]{6,}\d)\b/g, replace: '[[REDACTED_PHONE]]' }
];

function redactAndSanitize(raw) {
  if (typeof raw !== 'string') return { sanitized: '', redactionFlags: [] };
  // First basic trim and limit
  let work = raw.trim();
  const flags = [];
  // Redaction passes
  for (const rule of REDACTION_RULES) {
    if (rule.pattern.test(work)) {
      work = work.replace(rule.pattern, rule.replace);
      flags.push(rule.key);
    }
  }
  // Sanitize HTML (allow basic formatting only)
  const clean = sanitizeHtml(work, {
    allowedTags: ['b','i','u','strong','em','br','p','ul','ol','li','span'],
    allowedAttributes: { span: ['style'] },
    allowedStyles: { '*': { 'text-align': [/^left$/,/^right$/,/^center$/] } },
    disallowedTagsMode: 'discard'
  });
  return { sanitized: clean, redactionFlags: flags };
}

// Multer setup (in-memory for now; could be disk or S3 later)
const upload = multer({
  storage: multer.memoryStorage(),
  // Raise default to 25MB to better suit typical document uploads; can be overridden via env
  limits: { fileSize: Number(process.env.UPLOAD_MAX_BYTES || 25_000_000) },
  fileFilter: (req, file, cb) => {
    // Basic MIME allow-list (expandable via UPLOAD_MIME_ALLOW)
    const defaultAllow = [
      'image/png',
      'image/jpeg',
      'application/pdf',
      'text/plain',
      // Common office docs
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/msword', // .doc
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'application/zip'
    ];
    const allowed = (process.env.UPLOAD_MIME_ALLOW || defaultAllow.join(',')).split(',');
    if (!allowed.includes(file.mimetype)) return cb(new Error('نوع ملف غير مسموح'));
    cb(null, true);
  }
});

dotenv.config();

// Initialize Prisma (singleton for this process)
export const prisma = new PrismaClient({
  log: (process.env.PRISMA_LOG_LEVELS || 'error').split(',').map(s => s.trim()).filter(Boolean)
});

// Forward AuditLog entries to SIEM or file (non-blocking)
try {
  prisma.$use(async (params, next) => {
    const result = await next(params);
    try {
      if (params.model === 'AuditLog' && params.action === 'create' && result) {
        const item = {
          id: result.id,
          createdAt: result.createdAt,
          actorId: result.actorId || null,
          action: result.action,
          entity: result.entity,
          entityId: result.entityId,
          ip: result.ip || null,
          userAgent: result.userAgent || null
        };
        const url = process.env.SIEM_WEBHOOK_URL;
        if (url) {
          // fire-and-forget
          fetch(url, {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              'x-api-key': process.env.SIEM_WEBHOOK_KEY || ''
            },
            body: JSON.stringify({ source: 'alf-backend', audit: item })
          }).catch(() => {});
        }
        try {
          const dir = path.join(process.cwd(), 'observability');
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          fs.appendFile(path.join(dir, 'audit-forward.log'), JSON.stringify(item) + '\n', () => {});
        } catch {} // eslint-disable-line no-empty
      }
    } catch {} // eslint-disable-line no-empty
    return result;
  });
} catch {} // eslint-disable-line no-empty

export const baselineReady = (async function ensureBaselineData() {
  try {
    // Upsert default department by name
    await prisma.department.upsert({
      where: { name: 'الشكاوى العامة' },
      update: {}, 
      create: { name: 'الشكاوى العامة' }
    });

    // Upsert Admin Role
    const adminRole = await prisma.role.upsert({
      where: { name: 'مدير' },
      update: {}, 
      create: { name: 'مدير', description: 'صلاحيات كاملة على النظام' }
    });

    // Upsert admin user
    const adminUsername = 'admin';
    const adminEmail = 'admin@local.host';
    let user = await prisma.user.findUnique({ where: { username: adminUsername } });

    if (!user) {
      const pwd = process.env.ADMIN_DEFAULT_PASSWORD || 'admin123';
      const passwordHash = await hashPassword(pwd);
      
      user = await prisma.user.create({
        data: {
          username: adminUsername,
          email: adminEmail,
          isActive: true,
          credential: {
            create: {
              passwordHash: passwordHash,
            }
          },
          profile: {
            create: {
              fullName: 'Admin User'
            }
          },
          roles: {
            create: {
              roleId: adminRole.id
            }
          }
        }
      });
    }

  } catch (e) {
    console.warn('[Prisma] baseline seed skipped:', e?.message || e);
  }
})();

// Lazy-init OpenTelemetry for backend if enabled (safe no-op if packages missing)
try {
  if ((process.env.OTEL_TRACING_ENABLED || 'false') === 'true') {
    // Don't await; start in background
    import('./Sicherheit/backend/otel.js').catch((e) => {
      console.warn('[OTEL] disabled or missing deps:', e?.message || e);
    });
  }
} catch (e) {
  console.warn('[OTEL] init guard error:', e?.message || e);
}

export const app = express();

// --- Registration & Activation ---

const EMAIL_REGEX = /^(?=.{1,254}$)(?=.{1,64}@)[a-zA-Z0-9!#$%&'*+\/=?^_`{|}~-]+(?:\.[a-zA-Z0-9!#$%&'*+\/=?^_`{|}~-]+)*@(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/;
const ALLOWED_DOMAINS = (process.env.ALLOWED_EMAIL_DOMAINS || '*').split(',').map(d => d.trim());

function isValidEmail(email) {
    if (!EMAIL_REGEX.test(email)) return false;
    const domain = email.split('@')[1];
    return ALLOWED_DOMAINS.includes('*') || ALLOWED_DOMAINS.includes(domain);
}

function isStrongPassword(password) {
    return PASSWORD_REGEX.test(password);
}

async function sendActivationEmail(email, token) {
    if (!EMAIL_ENABLED) {
        console.warn(`Email sending is disabled. Activation token for ${email}: ${token}`);
        return;
    }
    const activationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/activate?token=${token}`;
    const mailOptions = {
        from: process.env.MAIL_FROM || process.env.SMTP_USER,
        to: email,
        subject: 'تفعيل حسابك في نظام الشكاوى والاستعلامات',
        html: `
            <div dir="rtl" style="font-family: sans-serif; text-align: right;">
                <h2>مرحباً بك،</h2>
                <p>شكراً لتسجيلك. يرجى الضغط على الرابط التالي لتفعيل حسابك:</p>
                <p><a href="${activationUrl}" style="padding: 10px 15px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">تفعيل الحساب</a></p>
                <p>إذا لم يعمل الرابط، يمكنك نسخ ولصق العنوان التالي في متصفحك:</p>
                <p>${activationUrl}</p>
                <p>هذا الرابط صالح لمدة 24 ساعة.</p>
                <hr>
                <p style="font-size: 0.8em; color: #777;">إذا لم تقم أنت بطلب هذا التسجيل، يرجى تجاهل هذه الرسالة.</p>
            </div>
        `,
    };
    try {
        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error(`Failed to send activation email to ${email}:`, error);
        // In a real app, you might want to queue this for a retry
    }
}

app.post('/api/auth/register', async (req, res, next) => {
    try {
        const { username, email, password, fullName } = req.body;

        // 1. Validate input
        if (!username || !email || !password) {
            return res.status(400).json({ ok: false, error: 'اسم المستخدم والبريد الإلكتروني وكلمة المرور حقول مطلوبة.' });
        }
        if (!isStrongPassword(password)) {
            return res.status(400).json({ ok: false, error: 'كلمة المرور ضعيفة. يجب أن تكون 12 حرفاً على الأقل وتحتوي على أحرف كبيرة وصغيرة وأرقام ورموز.' });
        }

        // Use unified validator for username/email/fullName
        const schema = {
          username: { type: 'alphanumeric', required: true, minLength: 3, maxLength: 32 },
          email: { type: 'email', required: true },
          fullName: { type: 'arabic', required: false, minLength: 2, maxLength: 64 }
        };
        const { valid, errors, sanitized } = inputValidator.validateObject(schema, { username, email, fullName });
        if (!valid) {
          return res.status(400).json({ ok: false, error: 'مدخلات غير صالحة', details: errors });
        }
        if (!isValidEmail(sanitized.email)) {
          return res.status(400).json({ ok: false, error: 'البريد الإلكتروني غير صالح أو من نطاق غير مسموح به.' });
        }

    const existingUser = await prisma.user.findFirst({ where: { OR: [{ username: sanitized.username }, { email: sanitized.email }] } });
        if (existingUser) {
            return res.status(409).json({ ok: false, error: 'اسم المستخدم أو البريد الإلكتروني موجود مسبقاً.' });
        }

        // 2. Create account (transactional)
        const passwordHash = await hashPassword(password);
        const activationToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const user = await prisma.$transaction(async (tx) => {
            const newUser = await tx.user.create({
                data: {
          username: sanitized.username,
          email: sanitized.email,
                    profile: {
            create: { fullName: sanitized.fullName || null },
                    },
                    credential: {
                        create: { passwordHash },
                    },
                    activationTokens: {
                        create: { token: activationToken, expiresAt },
                    },
                },
            });

            await tx.auditLog.create({
                data: {
                    action: 'user.register.pending_activation',
                    entity: 'User',
                    entityId: newUser.id,
                    ip: req.ip,
                    userAgent: req.headers['user-agent'],
                },
            });

            return newUser;
        });

        // 3. Send activation email (outside of transaction)
        await sendActivationEmail(email, activationToken);

        res.status(201).json({ ok: true, message: 'تم التسجيل بنجاح. يرجى مراجعة بريدك الإلكتروني لتفعيل الحساب.' });

    } catch (e) {
        next(e);
    }
});

app.post('/api/auth/activate', async (req, res, next) => {
    try {
        const { token } = req.body;
        if (!token) {
            return res.status(400).json({ ok: false, error: 'رمز التفعيل مطلوب.' });
        }

        const activation = await prisma.accountActivationToken.findUnique({
            where: { token },
            include: { user: true },
        });

        if (!activation || activation.expiresAt < new Date()) {
            // To prevent token enumeration, we should be generic here.
            // But for UX, we can guide the user.
            if (activation) {
                // If token exists but expired, delete it.
                await prisma.accountActivationToken.delete({ where: { id: activation.id } });
            }
            return res.status(400).json({ ok: false, error: 'رمز التفعيل غير صالح أو منتهي الصلاحية.' });
        }

        if (activation.user.isActive) {
            await prisma.accountActivationToken.delete({ where: { id: activation.id } });
            return res.status(400).json({ ok: false, error: 'الحساب مفعل مسبقاً.' });
        }

        await prisma.$transaction(async (tx) => {
            await tx.user.update({
                where: { id: activation.userId },
                data: { isActive: true, emailVerified: true, activatedAt: new Date() },
            });

            await tx.auditLog.create({
                data: {
                    actorId: activation.userId,
                    action: 'user.activate.success',
                    entity: 'User',
                    entityId: activation.userId,
                    ip: req.ip,
                    userAgent: req.headers['user-agent'],
                },
            });

            // Clean up the used token
            await tx.accountActivationToken.delete({ where: { id: activation.id } });
        });

        res.json({ ok: true, message: 'تم تفعيل الحساب بنجاح. يمكنك الآن تسجيل الدخول.' });

    } catch (e) {
        next(e);
    }
});


// Security headers with configurable CSP
// We disable Helmet's built-in CSP to avoid duplicate/contradictory headers
// and apply our progressive CSP middleware with nonces.
const CSP_ENABLED = (process.env.CSP_ENABLED || 'false') === 'true';
const CSP_REPORT_ONLY = (process.env.CSP_REPORT_ONLY || 'true') === 'true';
const __isDev = (process.env.NODE_ENV || 'development') !== 'production';

// Always apply Helmet without CSP so other headers are set safely
app.use(helmet({ contentSecurityPolicy: false }));

if (CSP_ENABLED) {
  const mode = CSP_REPORT_ONLY ? 'reportOnly' : 'enforce';
  // Development allowances to avoid breaking Vite HMR and local API calls
  const devOverrides = __isDev
    ? {
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-eval'",
          "'nonce-{NONCE}'",
          'blob:',
          'https://cdn.jsdelivr.net'
        ],
        connectSrc: [
          "'self'",
          'wss://',
          'ws://localhost:5175',
          'ws://127.0.0.1:5175',
          'http://localhost:5175',
          'http://127.0.0.1:5175',
          'http://localhost:4000',
          'http://127.0.0.1:4000'
        ],
        imgSrc: ["'self'", 'data:', 'https:', 'blob:']
      }
    : {};

  const enforceDevOverrides = __isDev
    ? {
        scriptSrc: [
          "'self'",
          "'nonce-{NONCE}'",
          "'strict-dynamic'",
          "'unsafe-eval'"
        ],
        connectSrc: [
          "'self'",
          'wss://',
          'ws://localhost:5175',
          'ws://127.0.0.1:5175',
          'http://localhost:5175',
          'http://127.0.0.1:5175',
          'http://localhost:4000',
          'http://127.0.0.1:4000'
        ]
      }
    : {};

  const overrides = mode === 'reportOnly' ? devOverrides : enforceDevOverrides;
  const cspMw = new CSPMiddleware(mode, overrides);
  app.use(cspMw.apply());
}

// Optional HSTS (production/HTTPS only)
const HSTS_ENABLED = (process.env.HSTS_ENABLED || 'false') === 'true';
if (HSTS_ENABLED) {
  try {
    app.use(helmet.hsts({
      maxAge: Number(process.env.HSTS_MAX_AGE || 15552000), // 180 days
      includeSubDomains: (process.env.HSTS_INCLUDE_SUBDOMAINS || 'true') === 'true',
      preload: (process.env.HSTS_PRELOAD || 'false') === 'true'
    }));
  } catch {} // eslint-disable-line no-empty
}

// Restrictive CORS by default; can be relaxed via env
const defaultOrigins = [
  'http://localhost:5175',
  'http://localhost:3000',
  'http://localhost',
  'http://127.0.0.1:5175',
  'http://127.0.0.1:3000',
  'capacitor://localhost'
];
const corsEnv = (process.env.CORS_ORIGINS || '').trim();
const allowedOrigins = corsEnv === '*' ? '*' : (
  corsEnv ? corsEnv.split(',').map(s => s.trim()).filter(Boolean) : defaultOrigins
);
app.use(cors({
  origin: (origin, cb) => {
    if (allowedOrigins === '*') return cb(null, true);
    if (!origin) return cb(null, true); // allow non-browser tools
    if (allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS'));
  },
  methods: ['GET','POST','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','X-API-Key','X-Requested-With','x-csrf-token','X-CSRF-Token','x-signature'],
  // Allow credentialed requests so httpOnly session cookies (sid) work in dev and prod
  credentials: true
}));

// JSON body limit: keep small globally, bump per-route where needed
// Capture rawBody for HMAC verification when needed
app.use(express.json({
  limit: '1mb',
  verify: (req, _res, buf) => {
    try { req.rawBody = Buffer.from(buf); } catch { req.rawBody = null; }
  }
}));
app.use(cookieParser());

// Trust proxy configurable
try {
  const tp = (process.env.TRUST_PROXY || 'loopback, linklocal, uniquelocal');
  app.set('trust proxy', tp);
} catch {} // eslint-disable-line no-empty

// Optional HTTPS redirect when behind proxy (staging/prod)
const HTTPS_REDIRECT_ENABLED = (process.env.HTTPS_REDIRECT_ENABLED || 'false') === 'true';
if (HTTPS_REDIRECT_ENABLED) {
  app.use((req, res, next) => {
    const proto = (req.headers['x-forwarded-proto'] || '').toString();
    if (proto && proto.includes('https')) return next();
    if (req.secure) return next();
    const host = req.headers.host;
    return res.redirect(301, `https://${host}${req.originalUrl}`);
  });
}
// Sicherheit: attach request-id and access log middlewares
app.use(requestIdMiddleware);
app.use(logMiddleware);

// Initialize and wire SecurityMonitor
const securityMonitor = new SecurityMonitor({
  promClient,
  saveDir: path.join(process.cwd(), 'observability'),
  onAlert: async (alert) => {
    try {
      const lvl = String(alert.level || '').toUpperCase();
      const isImportant = lvl === 'CRITICAL' || lvl === 'HIGH';
      if (!isImportant) return;
      // Optional webhook
      const hook = process.env.SECURITY_ALERT_WEBHOOK_URL;
      if (hook) {
        try {
          await fetch(hook, {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              'x-api-key': process.env.SECURITY_ALERT_WEBHOOK_KEY || ''
            },
            body: JSON.stringify({ source: 'alf-secmon', alert })
          });
        } catch {}
      }
      // Optional email
      if ((process.env.EMAIL_ENABLED || process.env.VITE_ENABLE_EMAIL || 'true') === 'true') {
        try {
          const to = process.env.SECURITY_ALERT_EMAIL_TO || process.env.SMTP_USER || null;
          if (to) {
            const subject = `[SECURITY] ${lvl}: ${alert.title || 'Alert'}`.slice(0, 160);
            const details = typeof alert.details === 'object' ? JSON.stringify(alert.details, null, 2) : String(alert.details || '');
            await transporter.sendMail({
              from: process.env.MAIL_FROM || process.env.SMTP_USER,
              to,
              subject,
              html: `<pre dir="ltr" style="white-space:pre-wrap">${details.replace(/[<>&]/g, s => ({'<':'&lt;','>':'&gt;','&':'&amp;'}[s]))}</pre>`
            });
          }
        } catch {}
      }
    } catch {}
  }
});
// Blocklist enforcement must run early
app.use((req, res, next) => securityMonitor.blocklistMiddleware(req, res, next));
// Observe every request for threat patterns and metrics (non-blocking)
app.use((req, res, next) => { securityMonitor.monitorRequest(req, res); next(); });

// Basic rate limiting (global), applied AFTER auth routes to avoid interfering with login/session checks
// Skip list for high-frequency endpoints (auth check + dashboards) to prevent noisy 429s during normal operation
const RATE_LIMIT_SKIP_PATHS = [
  /\/api\/auth\/me$/, 
  /\/api\/auth\/login$/, 
  /\/api\/auth\/logout$/, 
  /\/api\/security\/status$/, 
  /\/api\/metrics-summary$/, 
  /\/api\/errors$/, 
  /\/api\/errors-stats$/, 
  /\/api\/route-allowlist$/, 
  /\/api\/ip-allowlist$/, 
  /\/api\/departments$/,
];
const globalLimiter = rateLimit({
  windowMs: 60_000,
  max: Number(process.env.RATE_LIMIT_MAX || 120),
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req, _res) => {
    try {
      const p = req.path || '';
      return RATE_LIMIT_SKIP_PATHS.some(rx => rx.test(p));
    } catch { return false; }
  }
});

// Specific, stricter rate limiter for login attempts (IP-based)
const loginLimiter = rateLimit({
  windowMs: 10 * 60_000, // 10 minutes
  max: Number(process.env.LOGIN_RATE_LIMIT_MAX || 10), // e.g., 10 attempts / 10m / IP
  standardHeaders: true,
  legacyHeaders: false
});

// In-memory account lockout for repeated failed logins (per username+IP)
const LOGIN_LOCK_MAX_FAILS = Number(process.env.LOGIN_LOCK_MAX_FAILS || 5);
const LOGIN_LOCK_WINDOW_MIN = Number(process.env.LOGIN_LOCK_WINDOW_MIN || 10);
const LOGIN_LOCK_DURATION_MIN = Number(process.env.LOGIN_LOCK_DURATION_MIN || 15);
const loginFailMap = new Map(); // key -> { fails: number, firstAt: number, lockedUntil: number }
function loginKey(username, ip) {
  return `${String(username || '').toLowerCase()}|${String(ip || '')}`;
}
function isLocked(username, ip) {
  try {
    const k = loginKey(username, ip);
    const rec = loginFailMap.get(k);
    if (!rec) return false;
    if (rec.lockedUntil && Date.now() < rec.lockedUntil) return true;
    if (rec.lockedUntil && Date.now() >= rec.lockedUntil) loginFailMap.delete(k);
    return false;
  } catch { return false; }
}
function recordLoginFail(username, ip) {
  try {
    const k = loginKey(username, ip);
    let rec = loginFailMap.get(k) || { fails: 0, firstAt: 0, lockedUntil: 0 };
    const now = Date.now();
    // Reset window if older than window size
    if (!rec.firstAt || now - rec.firstAt > LOGIN_LOCK_WINDOW_MIN * 60 * 1000) {
      rec = { fails: 0, firstAt: now, lockedUntil: 0 };
    }
    rec.fails += 1;
    if (rec.fails >= LOGIN_LOCK_MAX_FAILS) {
      rec.lockedUntil = now + LOGIN_LOCK_DURATION_MIN * 60 * 1000;
    }
    loginFailMap.set(k, rec);
  } catch {} // eslint-disable-line no-empty
}
function clearLoginFail(username, ip) {
  try { loginFailMap.delete(loginKey(username, ip)); } catch {} // eslint-disable-line no-empty
}

// API key middleware for protected endpoints
function requireApiKey(req, res, next) {
  const key = req.headers['x-api-key'] || req.headers['X-API-Key'] || req.get?.('x-api-key');
  const expected = process.env.API_KEY;
  if (!expected) return res.status(401).json({ ok: false, error: 'API key not configured' });
  if (String(key) !== String(expected)) return res.status(401).json({ ok: false, error: 'Unauthorized' });
  next();
}

// ----- HMAC helpers for API <-> citizen portal/webhooks -----
const HMAC_ALGO = 'sha256';
function signHmac(payloadBuf, secret) {
  return crypto.createHmac(HMAC_ALGO, String(secret || '')).update(payloadBuf).digest('hex');
}
function verifyHmac(req, headerName, secret) {
  try {
    const sig = (req.headers[headerName] || '').toString();
    if (!sig || !req.rawBody) return false;
    const calc = signHmac(req.rawBody, secret);
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(calc));
  } catch { return false; }
}

// ----- Object storage (S3/MinIO) presign (simple server-side upload proxy as a start) -----
const OBJ_ENABLED = (process.env.OBJECT_STORAGE_ENABLED || 'false') === 'true';
const s3Client = OBJ_ENABLED ? new S3Client({
  endpoint: process.env.OBJECT_STORAGE_ENDPOINT || undefined,
  region: process.env.OBJECT_STORAGE_REGION || 'us-east-1',
  forcePathStyle: (process.env.OBJECT_STORAGE_FORCE_PATH_STYLE || 'true') === 'true',
  credentials: process.env.OBJECT_STORAGE_KEY && process.env.OBJECT_STORAGE_SECRET ? {
    accessKeyId: process.env.OBJECT_STORAGE_KEY,
    secretAccessKey: process.env.OBJECT_STORAGE_SECRET
  } : undefined
}) : null;

// Citizen portal uploads file via this endpoint to get stored in object store; returns a signed temp URL-like token
app.post('/api/citizen/uploads', (req, res) => {
  // Run multer and capture its errors explicitly so we can return structured JSON instead of generic 500/HTML
  upload.single('file')(req, res, async (err) => {
    try {
      if (err) {
        // Multer errors (size limits, etc.)
        const code = err.code || '';
        if (code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({ ok: false, error: 'file-too-large' });
        }
        // File filter rejection (unsupported type) or generic multer error
        const msg = (err && err.message) ? err.message.toString() : '';
        const unsupported = /غير مسموح|not\s*allowed|unsupported/i.test(msg);
        const status = unsupported ? 415 : 400;
        return res.status(status).json({ ok: false, error: unsupported ? 'unsupported-media-type' : 'upload-error' });
      }

      if (!OBJ_ENABLED || !s3Client) return res.status(503).json({ ok: false, error: 'object-store-disabled' });
      const bucket = process.env.OBJECT_STORAGE_BUCKET;
      if (!bucket) return res.status(500).json({ ok: false, error: 'bucket-missing' });
      const file = req.file;
      if (!file) return res.status(400).json({ ok: false, error: 'file-required' });
      const key = `tickets/tmp/${Date.now()}_${Math.random().toString(36).slice(2)}_${file.originalname}`;
      await s3Client.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: file.buffer, ContentType: file.mimetype }));
      // Return a pseudo-signed reference we can later resolve (a direct presign requires @aws-sdk/s3-request-presigner)
      return res.json({ ok: true, objectKey: key, contentType: file.mimetype, size: file.size });
    } catch (e) {
      // Minimal logging for diagnostics without leaking secrets
      try { console.error('Upload failed:', { name: e?.name, message: e?.message }); } catch {}
      return res.status(500).json({ ok: false, error: e?.message || 'upload-failed' });
    }
  });
});

// Simple ephemeral download proxy to generate time-limited content (not true presign but practical)
// Use wildcard to allow keys containing '/'
app.get('/api/citizen/uploads/*', async (req, res) => {
  try {
    if (!OBJ_ENABLED || !s3Client) return res.status(503).json({ ok: false, error: 'object-store-disabled' });
    const bucket = process.env.OBJECT_STORAGE_BUCKET;
    // Extract everything after the prefix '/api/citizen/uploads/' as the key
    const key = (req.params?.[0] || '').toString();
    // For security, restrict to known prefixes
    if (!key || !/^tickets\//.test(key)) return res.status(400).json({ ok: false, error: 'invalid-key' });
    // First, perform a HEAD to confirm existence and get metadata
    try {
      const head = await s3Client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
      const contentLength = Number(head.ContentLength || 0);
      const contentType = head.ContentType || 'application/octet-stream';
      // Optional proxy mode: ?proxy=1 to stream via backend and validate metadata
      if (String(req.query.proxy || '0') === '1') {
        const maxBytes = Math.max(0, Number(process.env.OBJECT_STORAGE_PROXY_MAX_BYTES || 25_000_000)); // 25MB default
        const allowTypes = (process.env.OBJECT_STORAGE_PROXY_TYPES || 'image/png,image/jpeg,application/pdf,text/plain').split(',').map(s=>s.trim()).filter(Boolean);
        if (maxBytes && contentLength && contentLength > maxBytes) {
          return res.status(413).json({ ok: false, error: 'file-too-large' });
        }
        if (allowTypes.length && contentType && !allowTypes.includes(contentType)) {
          return res.status(415).json({ ok: false, error: 'unsupported-media-type' });
        }
        const obj = await s3Client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
        // Forward headers and stream body
        res.setHeader('Content-Type', contentType);
        if (contentLength) res.setHeader('Content-Length', String(contentLength));
        const dlName = path.basename(key);
        res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(dlName)}`);
        obj.Body.pipe(res);
        return; // terminate handler after piping
      }

      const ttlSec = Math.max(30, Math.min(60 * 60, Number(process.env.OBJECT_STORAGE_DOWNLOAD_TTL || 300)));
      const cmd = new GetObjectCommand({ Bucket: bucket, Key: key });
      const url = await getSignedUrl(s3Client, cmd, { expiresIn: ttlSec });
      return res.json({ ok: true, url, expiresIn: ttlSec, contentType, contentLength });
    } catch (e) {
      const msg = (e && e.name) || (e && e.message) || '';
      if (msg && /NotFound|NoSuchKey|404/.test(msg)) {
        return res.status(404).json({ ok: false, error: 'object-not-found' });
      }
      if (msg && /AccessDenied|Forbidden|403/.test(msg)) {
        return res.status(403).json({ ok: false, error: 'access-denied' });
      }
      return res.status(500).json({ ok: false, error: 'head-failed' });
    }
  } catch (e) { return res.status(500).json({ ok: false, error: e?.message || String(e) }); }
});

// Cleanup endpoint to delete temporary uploaded objects
// Authorization: either valid x-api-key OR authenticated admin session
// Restricts deletion to a safe prefix (OBJECT_STORAGE_CLEAN_PREFIX, default 'tickets/tmp/')
app.delete('/api/citizen/uploads/*', authOptional, async (req, res) => {
  try {
    if (!OBJ_ENABLED || !s3Client) return res.status(503).json({ ok: false, error: 'object-store-disabled' });
    const bucket = process.env.OBJECT_STORAGE_BUCKET;
    if (!bucket) return res.status(500).json({ ok: false, error: 'bucket-missing' });

    // Authorization: API key or admin role
    let authorized = false;
    try {
      const keyHdr = req.headers['x-api-key'] || req.get?.('x-api-key');
      const expected = process.env.API_KEY;
      if (expected && String(keyHdr) === String(expected)) authorized = true;
    } catch {}
    if (!authorized) {
      const roles = req.authUser?.roles?.map(r => r.role?.name) || [];
      if (roles.includes('مدير')) authorized = true;
    }
    if (!authorized) return res.status(401).json({ ok: false, error: 'unauthorized' });

    const key = (req.params?.[0] || '').toString();
    const prefix = (process.env.OBJECT_STORAGE_CLEAN_PREFIX || 'tickets/tmp/');
    if (!key || !key.startsWith(prefix)) return res.status(400).json({ ok: false, error: 'invalid-key' });

    try {
      await s3Client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
      return res.json({ ok: true });
    } catch (e) {
      const msg = (e && e.name) || (e && e.message) || '';
      if (msg && /NotFound|NoSuchKey|404/.test(msg)) {
        return res.status(404).json({ ok: false, error: 'object-not-found' });
      }
      return res.status(500).json({ ok: false, error: 'delete-failed' });
    }
  } catch (e) {
    return res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});

// ----- Citizen portal APIs: submit ticket and check status -----
// HMAC verification using header 'x-signature'
app.post('/api/citizen/tickets', async (req, res, next) => {
  try {
    const shared = process.env.CITIZEN_HMAC_SECRET || '';
    if (!verifyHmac(req, 'x-signature', shared)) return res.status(401).json({ ok: false, error: 'bad-signature' });
    const { departmentCode, citizenName, citizenNationalId, citizenEmail, type, message, attachments } = req.body || {};
    if (!departmentCode || !message) return res.status(400).json({ ok: false, error: 'departmentCode and message required' });
    const dept = await prisma.department.findFirst({ where: { OR: [{ code: departmentCode }, { name: departmentCode }] } });
    if (!dept) return res.status(400).json({ ok: false, error: 'unknown-department' });

    const { sanitized, redactionFlags } = redactAndSanitize(String(message || ''));
    const ticket = await prisma.ticket.create({
      data: {
        departmentId: dept.id,
        citizenName: citizenName || null,
        citizenNationalId: citizenNationalId || null,
        citizenEmail: citizenEmail || null,
        type: type || 'complaint',
        status: 'New',
        responseText: null,
        history: { create: { action: 'create', diffSummary: redactionFlags?.join(',') || null } }
      }
    });

  // Attach any uploaded object-store refs
    if (Array.isArray(attachments) && attachments.length) {
      for (const at of attachments) {
        try {
          const { objectKey, filename, mimeType, sizeBytes } = at || {};
          if (!objectKey) continue;
          await prisma.attachment.create({ data: { ticketId: ticket.id, filename: filename || objectKey, mimeType: mimeType || 'application/octet-stream', sizeBytes: Number(sizeBytes||0), storagePath: objectKey } });
        } catch {}
      }
    }

    // Generate human friendly tracking code (e.g., first 8 chars)
  const tracking = ticket.id.slice(0, 8).toUpperCase();
  // webhook: ticket created (citizen)
  emitTicketEvent('ticket.created', ticket.id).catch(()=>{});
    await prisma.auditLog.create({ data: { action: 'ticket.create.citizen', entity: 'Ticket', entityId: ticket.id, ip: req.ip || null, userAgent: (req.headers['user-agent']||'').toString() } });
    return res.status(201).json({ ok: true, ticketId: ticket.id, tracking });
  } catch (e) { next(e); }
});

app.get('/api/citizen/tickets/:tracking', async (req, res, next) => {
  try {
    const tracking = String(req.params.tracking || '').toLowerCase();
    if (!tracking) return res.status(400).json({ ok: false, error: 'tracking-required' });
    const ticket = await prisma.ticket.findFirst({ where: { id: { startsWith: tracking } }, include: { department: true } });
    if (!ticket) return res.status(404).json({ ok: false, error: 'not-found' });
    return res.json({ ok: true, ticket: { id: ticket.id, tracking: ticket.id.slice(0,8).toUpperCase(), status: ticket.status, department: ticket.department?.name || null, createdAt: ticket.createdAt, answeredAt: ticket.answeredAt || null, closedAt: ticket.closedAt || null } });
  } catch (e) { next(e); }
});

// ----- Webhook dispatcher with retry queue -----
const webhookQueue = [];
const WEBHOOK_SECRET = process.env.WEBHOOK_OUTBOX_SECRET || '';
const WEBHOOK_URLS = (process.env.CITIZEN_WEBHOOK_URLS || '').split(',').map(s => s.trim()).filter(Boolean);
function enqueueWebhook(eventName, payloadObj) {
  try {
    const body = Buffer.from(JSON.stringify({ event: eventName, data: payloadObj }));
    webhookQueue.push({ body, tries: 0 });
  } catch {}
}

async function flushWebhookQueueOnce() {
  if (!WEBHOOK_URLS.length) return;
  const item = webhookQueue.shift();
  if (!item) return;
  const sig = signHmac(item.body, WEBHOOK_SECRET);
  for (const url of WEBHOOK_URLS) {
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', 'x-signature': sig }, body: item.body, timeout: 10_000 });
      if (!res.ok) throw new Error('http ' + res.status);
    } catch (e) {
      item.tries += 1;
      if (item.tries < 5) webhookQueue.push(item); // requeue with backoff handled by interval pacing
      break; // try next tick
    }
  }
}
setInterval(() => { flushWebhookQueueOnce().catch(()=>{}); }, 5_000).unref?.();

// Emit webhook for ticket updates internally
async function emitTicketEvent(eventName, ticketId) {
  try {
    const t = await prisma.ticket.findUnique({ where: { id: ticketId }, include: { department: true } });
    if (!t) return;
    enqueueWebhook(eventName, { id: t.id, tracking: t.id.slice(0,8).toUpperCase(), status: t.status, department: t.department?.name || null, createdAt: t.createdAt, updatedAt: t.updatedAt || null });
  } catch {}
}

// Optional separate key for metrics/diagnostics
function requireMetricsKey(req, res, next) {
  const expected = process.env.METRICS_API_KEY || process.env.API_KEY;
  if (!expected) return res.status(401).json({ ok: false, error: 'Metrics key not configured' });
  const key = req.headers['x-api-key'] || req.get?.('x-api-key');
  if (String(key) !== String(expected)) return res.status(401).json({ ok: false, error: 'Unauthorized' });
  next();
}

// ---------------- Authentication / Sessions ----------------
const SESSION_TTL_HOURS = Number(process.env.SESSION_TTL_HOURS || 12);
const SESSION_IDLE_SLIDING = (process.env.SESSION_IDLE_SLIDING || 'true') === 'true';
const SESSION_IDLE_TOUCH_INTERVAL_SEC = Number(process.env.SESSION_IDLE_TOUCH_INTERVAL_SEC || 300); // 5m
const SESSION_ROTATE_INTERVAL_MIN = Number(process.env.SESSION_ROTATE_INTERVAL_MIN || 0); // 0 disables
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
if (!process.env.JWT_SECRET) {
    console.warn('Warning: JWT_SECRET is not set. Using a temporary key.');
}

function hashSessionToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function createSession(user, req) {
  const raw = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashSessionToken(raw);
  const expiresAt = new Date(Date.now() + SESSION_TTL_HOURS * 3600 * 1000);
  if (typeof prisma.session?.create !== 'function') {
    throw new Error('Prisma Client not updated for Session model. Run: npx prisma generate');
  }
  await prisma.session.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt,
      ip: req.ip?.toString().slice(0, 64) || null,
      userAgent: (req.headers['user-agent'] || '').toString().slice(0, 200) || null
    }
  });
  return { raw, expiresAt };
}

// Cookie flags
const COOKIE_SECURE = (process.env.COOKIE_SECURE || (process.env.NODE_ENV === 'production' ? 'true' : 'false')) === 'true';
const COOKIE_SAMESITE = (process.env.COOKIE_SAMESITE || 'lax').toLowerCase();
function sidCookieOptions() {
  return {
    httpOnly: true,
    sameSite: COOKIE_SAMESITE,
    secure: COOKIE_SECURE,
    path: '/',
    maxAge: SESSION_TTL_HOURS * 3600 * 1000
  };
}

// --- CSRF (double-submit cookie tied to session) ---
const csrfStore = new Map(); // tokenHash(session) -> csrfToken (plaintext)
const sessionTouchMap = new Map(); // tokenHash -> { lastTouch: number, lastRotate: number }
const CSRF_HEADER = 'x-csrf-token';
const CSRF_COOKIE = 'csrf';
function setCsrfCookie(res, token) {
  // Not httpOnly so the frontend can read and send it in header; SameSite=Lax protects basic CSRF
  res.cookie(CSRF_COOKIE, token, { sameSite: COOKIE_SAMESITE, secure: COOKIE_SECURE, path: '/' });
}

async function authOptional(req, res, next) {
  try {
    const token = req.cookies?.sid;
    if (!token) return next();
    const tokenHash = hashSessionToken(token);
    const session = await prisma.session.findFirst({
      where: { tokenHash, revokedAt: null, expiresAt: { gt: new Date() } },
      include: { user: { include: { roles: { include: { role: true } } } } }
    });
    if (session?.user) {
      req.authUser = session.user; // attach for downstream
      // Ensure CSRF token exists for this session
      if (!csrfStore.has(tokenHash)) {
        const csrfToken = crypto.randomBytes(16).toString('hex');
        csrfStore.set(tokenHash, csrfToken);
        setCsrfCookie(res, csrfToken);
      } else if (!req.cookies?.[CSRF_COOKIE]) {
        setCsrfCookie(res, csrfStore.get(tokenHash));
      }

      // Sliding idle timeout (throttle DB writes)
      try {
        if (SESSION_IDLE_SLIDING) {
          const now = Date.now();
          const rec = sessionTouchMap.get(tokenHash) || { lastTouch: 0, lastRotate: 0 };
          if (now - rec.lastTouch > SESSION_IDLE_TOUCH_INTERVAL_SEC * 1000) {
            await prisma.session.updateMany({
              where: { tokenHash, revokedAt: null },
              data: { expiresAt: new Date(Date.now() + SESSION_TTL_HOURS * 3600 * 1000) }
            });
            rec.lastTouch = now;
            sessionTouchMap.set(tokenHash, rec);
          }
          // Optional session rotation
          if (SESSION_ROTATE_INTERVAL_MIN > 0 && now - rec.lastRotate > SESSION_ROTATE_INTERVAL_MIN * 60 * 1000) {
            // Create new session, revoke old, rotate cookies + CSRF
            const newSess = await createSession(session.user, req);
            await prisma.session.updateMany({ where: { tokenHash, revokedAt: null }, data: { revokedAt: new Date() } });
            // Remove old CSRF
            csrfStore.delete(tokenHash);
            sessionTouchMap.delete(tokenHash);
            // Set new cookies
            res.cookie('sid', newSess.raw, sidCookieOptions());
            const newHash = hashSessionToken(newSess.raw);
            const newCsrf = crypto.randomBytes(16).toString('hex');
            csrfStore.set(newHash, newCsrf);
            setCsrfCookie(res, newCsrf);
            sessionTouchMap.set(newHash, { lastTouch: Date.now(), lastRotate: Date.now() });
          }
        }
      } catch {} // eslint-disable-line no-empty
    }
  } catch {} // eslint-disable-line no-empty
  next();
}

function authRequired(req, res, next) {
  if (!req.authUser) return res.status(401).json({ ok: false, error: 'غير مصرح' });
  next();
}

// Role-based authorization middleware
function requireRole(roles) {
  return function(req, res, next) {
    if (!req.authUser) return res.status(401).json({ ok: false, error: 'غير مصرح' });
    const userRoles = req.authUser.roles?.map(r => r.role.name) || [];
    if (!roles.some(r => userRoles.includes(r))) return res.status(403).json({ ok: false, error: 'صلاحيات غير كافية' });
    next();
  };
}

// --- MFA Endpoints ---

app.post('/api/auth/mfa/setup', authRequired, async (req, res, next) => {
    try {
        const user = req.authUser;
        const credential = await prisma.userCredential.findUnique({ where: { userId: user.id } });

        if (credential?.mfaEnabled) {
            return res.status(400).json({ ok: false, error: 'MFA is already enabled.' });
        }

        const secret = authenticator.generateSecret();
        const encryptedSecret = encrypt(secret);

        await prisma.userCredential.update({
            where: { userId: user.id },
            data: { mfaSecret: encryptedSecret },
        });

        const otpauth = authenticator.keyuri(user.email, 'Syrian Gov Complaints', secret);
        const qrCodeDataUrl = await qrcode.toDataURL(otpauth);

        res.json({ ok: true, qrCodeDataUrl, secret }); // Send secret for manual entry

    } catch (e) {
        next(e);
    }
});

app.post('/api/auth/mfa/verify', authRequired, async (req, res, next) => {
    try {
        const { token } = req.body;
        const user = req.authUser;

        if (!token) {
            return res.status(400).json({ ok: false, error: 'Token is required.' });
        }

        const credential = await prisma.userCredential.findUnique({ where: { userId: user.id } });
        if (!credential?.mfaSecret) {
            return res.status(400).json({ ok: false, error: 'MFA setup has not been initiated.' });
        }

        const secret = decrypt(credential.mfaSecret);
        if (!secret) {
            return res.status(500).json({ ok: false, error: 'Could not decrypt MFA secret.' });
        }

        const isValid = authenticator.verify({ token, secret });

        if (!isValid) {
            return res.status(400).json({ ok: false, error: 'Invalid token.' });
        }

        // Generate recovery codes
        const recoveryCodes = Array.from({ length: 10 }, () => crypto.randomBytes(6).toString('hex'));
        const hashedRecoveryCodes = await Promise.all(recoveryCodes.map(code => hashPassword(code)));

        await prisma.$transaction([
            prisma.userCredential.update({
                where: { userId: user.id },
                data: { mfaEnabled: true },
            }),
            prisma.recoveryCode.createMany({
                data: hashedRecoveryCodes.map(hashedCode => ({
                    credentialId: credential.id,
                    hashedCode,
                })),
            }),
        ]);

        res.json({ ok: true, message: 'MFA has been enabled successfully.', recoveryCodes });

    } catch (e) {
        next(e);
    }
});

app.post('/api/auth/login-mfa', async (req, res, next) => {
    try {
        const { mfaSessionToken, token } = req.body;

        if (!mfaSessionToken || !token) {
            return res.status(400).json({ ok: false, error: 'MFA session token and code are required.' });
        }

        const jw = await import('jsonwebtoken');
        const decoded = jw.verify(mfaSessionToken, JWT_SECRET);
        const userId = decoded.sub;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            include: { credential: { include: { recoveryCodes: true } }, roles: { include: { role: true } }, profile: true },
        });

        if (!user || !user.credential?.mfaEnabled) {
            return res.status(401).json({ ok: false, error: 'Invalid user or MFA not enabled.' });
        }

        // Try TOTP first
        const secret = decrypt(user.credential.mfaSecret);
        if (!secret) {
            return res.status(500).json({ ok: false, error: 'Could not decrypt MFA secret.' });
        }

        const isTotpValid = authenticator.verify({ token, secret });

        if (isTotpValid) {
            // Complete login
            return completeLogin(req, res, user);
        }

        // If TOTP fails, try recovery codes
        for (const recoveryCode of user.credential.recoveryCodes) {
            if (recoveryCode.isUsed) continue;
            const match = await verifyPassword(recoveryCode.hashedCode, token);
            if (match) {
                await prisma.recoveryCode.update({
                    where: { id: recoveryCode.id },
                    data: { isUsed: true },
                });
                // Notify user that a recovery code was used
                // (implementation of notification is omitted for brevity)
                return completeLogin(req, res, user);
            }
        }

        return res.status(401).json({ ok: false, error: 'Invalid MFA code.' });

    } catch (e) {
        next(e);
    }
});

async function completeLogin(req, res, user) {
    const session = await createSession(user, req);
    res.cookie('sid', session.raw, sidCookieOptions());
    
    const tokenHash = hashSessionToken(session.raw);
    const csrfToken = crypto.randomBytes(16).toString('hex');
    csrfStore.set(tokenHash, csrfToken);
    setCsrfCookie(res, csrfToken);

    let jwtToken = null;
    if (JWT_SECRET) { // JWT_ENABLED is implicitly true if JWT_SECRET is set
      const jw = await import('jsonwebtoken');
      const userRoles = user.roles.map(r => r.role.name);
      jwtToken = jw.sign({ sub: user.id, roles: userRoles }, JWT_SECRET, { expiresIn: `${SESSION_TTL_HOURS}h` });
    }

    const { credential, ...safeUser } = user;
    const userPayload = {
        ...safeUser,
        roles: user.roles.map(r => r.role.name)
    };

    try { await prisma.auditLog.create({ data: { actorId: user.id, action: 'login-success-mfa', entity: 'Auth', entityId: user.id, ip: req.ip || null, userAgent: (req.headers['user-agent'] || '').toString() } }); } catch {} // eslint-disable-line no-empty
    
    clearLoginFail(user.username, req.ip);
    res.json({ ok: true, user: userPayload, jwt: jwtToken });
}

app.post('/api/auth/login', loginLimiter, async (req, res, next) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ ok: false, error: 'بيانات اعتماد ناقصة' });
    if (isLocked(username, req.ip)) {
      return res.status(423).json({ ok: false, error: 'محاولات فاشلة كثيرة. الحساب مقفول مؤقتاً.', retryAfterMin: LOGIN_LOCK_DURATION_MIN });
    }
    await baselineReady; // ensure seed done
    const user = await prisma.user.findUnique({
        where: { username },
        include: { credential: true, roles: { include: { role: true } }, profile: true }
    });

    if (!user || !user.credential) {
      try { await prisma.auditLog.create({ data: { action: 'login-failed', entity: 'Auth', entityId: String(username), ip: req.ip || null, userAgent: (req.headers['user-agent'] || '').toString() } }); } catch {} // eslint-disable-line no-empty
      recordLoginFail(username, req.ip);
      return res.status(401).json({ ok: false, error: 'بيانات غير صحيحة' });
    }

    const match = await verifyPassword(user.credential.passwordHash, password);
    if (!match) {
      try { await prisma.auditLog.create({ data: { action: 'login-failed', entity: 'Auth', entityId: String(username), ip: req.ip || null, userAgent: (req.headers['user-agent'] || '').toString() } }); } catch {} // eslint-disable-line no-empty
      recordLoginFail(username, req.ip);
      return res.status(401).json({ ok: false, error: 'بيانات غير صحيحة' });
    }

    if (user.credential.mfaEnabled) {
        const jw = await import('jsonwebtoken');
        const mfaSessionToken = jw.sign({ sub: user.id }, JWT_SECRET, { expiresIn: '5m' });
        return res.json({ ok: true, mfaRequired: true, mfaSessionToken });
    }

    // This part is now in completeLogin function
    await completeLogin(req, res, user);

  } catch (e) {
    if (process.env.DEBUG_AUTH === 'true') {
      // eslint-disable-next-line no-console
      console.error('Login error:', e?.message || e, e?.stack);
    }
    next(e);
  }
});

app.post('/api/auth/logout', authOptional, async (req, res) => {
  try {
    const token = req.cookies?.sid;
    if (token) {
      const tokenHash = hashSessionToken(token);
      await prisma.session.updateMany({ where: { tokenHash, revokedAt: null }, data: { revokedAt: new Date() } });
      csrfStore.delete(tokenHash);
    }
    res.clearCookie('sid', { path: '/' });
    res.clearCookie(CSRF_COOKIE, { path: '/' });
    try {
      if (req.authUser?.id) {
        await prisma.auditLog.create({ data: { actorId: req.authUser.id, action: 'logout', entity: 'Auth', entityId: req.authUser.id, ip: req.ip || null, userAgent: (req.headers['user-agent'] || '').toString() } });
      }
    } catch {} // eslint-disable-line no-empty
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: 'فشل تسجيل الخروج' });
  }
});

app.get('/api/auth/me', authOptional, (req, res) => {
  if (!req.authUser) return res.status(401).json({ ok: false, error: 'غير مسجل' });
  const { credential, ...safeUser } = req.authUser;
  const userPayload = {
    ...safeUser,
    roles: req.authUser.roles.map(r => r.role.name)
  };
  res.json({ ok: true, user: userPayload });
});

app.use(globalLimiter);

app.use((req, res, next) => {
  if ((process.env.NODE_ENV || '') === 'test') return next();
  const method = (req.method || 'GET').toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return next();
  const p = req.path || '';
  if (p.startsWith('/api/auth/login') || p.startsWith('/api/auth/logout') || p.startsWith('/api/auth/register') || p.startsWith('/api/auth/activate') || p.startsWith('/api/auth/login-mfa')) return next();
  // Enforce CSRF only when a session cookie is present (authenticated context).
  // For anonymous requests (no sid), skip CSRF to allow public form submissions.
  const sid = req.cookies?.sid;
  if (!sid) return next();
  const tokenHash = hashSessionToken(sid);
  const expected = csrfStore.get(tokenHash);
  const provided = req.headers[CSRF_HEADER] || req.get?.(CSRF_HEADER);
  if (!expected || !provided || String(provided) !== String(expected)) {
    return res.status(403).json({ ok: false, error: 'فشل فحص CSRF' });
  }
  next();
});

app.post('/csp-violation', express.json({ limit: '50kb', type: ['application/csp-report','application/json'] }), (req, res) => {
  try {
    const report = req.body?.['csp-report'] || req.body || {};
    const dir = path.join(process.cwd(), 'observability');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const line = JSON.stringify({ at: new Date().toISOString(), report }) + '\n';
    fs.appendFile(path.join(dir, 'csp-violations.log'), line, () => {});
  } catch {} // eslint-disable-line no-empty
  res.status(204).end();
});

// New unified CSP report ingestion endpoint (preferred)
app.post('/api/csp-report', express.json({ limit: '50kb', type: ['application/csp-report','application/json'] }), (req, res) => {
  try {
    const report = req.body?.['csp-report'] || req.body || {};
    const dir = path.join(process.cwd(), 'observability');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const line = JSON.stringify({ at: new Date().toISOString(), report }) + '\n';
    fs.appendFile(path.join(dir, 'csp-violations.log'), line, () => {});
  } catch {}
  res.status(204).end();
});

app.get('/api/csp-violations', async (req, res, next) => {
  try {
    if (process.env.METRICS_API_KEY || process.env.API_KEY) {
      return requireMetricsKey(req, res, async () => {
        try { await _list(); } catch (e) { next(e); }
      });
    }
    await _list();
  } catch (e) { next(e); }

  async function _list() {
    const file = path.join(process.cwd(), 'observability', 'csp-violations.log');
    if (!fs.existsSync(file)) return res.json({ ok: true, items: [], total: 0 });
    const raw = fs.readFileSync(file, 'utf-8');
    const lines = raw.split(/\r?\n/).filter(Boolean);
    const limit = Math.max(1, Math.min(500, Number(req.query.limit || 200)));
    const sinceMs = Number(req.query.sinceMs || 0);
    const items = [];
    for (let i = lines.length - 1; i >= 0 && items.length < limit; i--) {
      try {
        const obj = JSON.parse(lines[i]);
        const ts = new Date(obj.at).getTime();
        if (sinceMs && ts < (Date.now() - sinceMs)) break;
        const r = obj.report || {};
        items.push({
          at: obj.at,
          'blocked-uri': r['blocked-uri'] || r.blocked_uri || null,
          'document-uri': r['document-uri'] || r.document_uri || null,
          'violated-directive': r['violated-directive'] || r.violated_directive || null,
          'effective-directive': r['effective-directive'] || r.effective_directive || null,
          'original-policy': r['original-policy'] || r.original_policy || null,
          disposition: r.disposition || null,
          referrer: r.referrer || null,
          'status-code': r['status-code'] || r.status_code || null,
          'source-file': r['source-file'] || r.source_file || null,
          'line-number': r['line-number'] || r.line_number || null,
          'column-number': r['column-number'] || r.column_number || null
        });
      } catch {} // eslint-disable-line no-empty
    }
    res.json({ ok: true, items, total: items.length });
  }
});

// Simple HTML viewer for CSP Violations (dev/admin utility)
app.get('/csp-violations', (req, res) => {
  try {
    const nonce = res.locals?.nonce || '';
    const html = `<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>تقارير CSP</title>
    <style nonce="${nonce}">
      body{font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial; background:#f8fafc; color:#0f172a; padding:20px}
      .wrap{max-width:900px;margin:0 auto}
      h1{font-size:20px;margin:0 0 12px}
      .controls{display:flex;gap:8px;align-items:center;margin:0 0 12px}
      input,button{padding:6px 10px;border:1px solid #cbd5e1;border-radius:6px}
      table{width:100%;border-collapse:collapse;background:#fff}
      th,td{border:1px solid #e2e8f0;padding:6px 8px;font-size:12px}
      th{background:#f1f5f9}
      .meta{font-size:12px;color:#334155;margin:8px 0}
    </style>
  </head>
  <body>
    <div class="wrap">
      <h1>تقارير سياسة أمان المحتوى (CSP)</h1>
      <div class="controls">
        <label>مفتاح API (اختياري): <input id="key" type="password" placeholder="x-api-key" /></label>
        <label>Limit: <input id="limit" type="number" min="1" max="500" value="100" /></label>
        <button id="load">تحديث</button>
      </div>
      <div class="meta" id="meta"></div>
      <div class="meta" id="err" style="color:#b91c1c"></div>
      <table>
        <thead>
          <tr>
            <th>الوقت</th>
            <th>الصفحة</th>
            <th>المصدر المحجوب</th>
            <th>التوجيه المخالف</th>
            <th>الكود</th>
          </tr>
        </thead>
        <tbody id="rows"></tbody>
      </table>
    </div>
    <script nonce="${nonce}">
      (function(){
        var keyEl = document.getElementById('key');
        var savedKey = localStorage.getItem('csp_viewer_api_key');
        try {
          var qp = new URLSearchParams(window.location.search);
          var keyParam = qp.get('key');
          var limitParam = qp.get('limit');
          if (keyParam) { keyEl.value = keyParam; localStorage.setItem('csp_viewer_api_key', keyParam); }
          if (!keyParam && savedKey) { keyEl.value = savedKey; }
          if (limitParam) {
            var n = Number(limitParam);
            if (Number.isFinite(n) && n >= 1 && n <= 500) {
              var limitEl = document.getElementById('limit');
              limitEl.value = String(n);
            }
          }
        } catch (e) { if (savedKey) { keyEl.value = savedKey; } }

        async function load() {
          try {
            document.getElementById('err').textContent = '';
            const key = keyEl.value.trim();
            if (key) localStorage.setItem('csp_viewer_api_key', key); else localStorage.removeItem('csp_viewer_api_key');
            const limit = Number(document.getElementById('limit').value || 100);
            const headers = key ? { 'x-api-key': key } : {};
            const url = '/api/csp-violations?limit=' + encodeURIComponent(Math.max(1, Math.min(500, limit)));
            const res = await fetch(url, { headers });
            if (!res.ok) {
              var msg = 'HTTP ' + res.status + ' - ' + (res.statusText || '');
              try { var j = await res.json(); if (j && j.error) msg += ' | ' + j.error; } catch(e) {}
              document.getElementById('err').textContent = 'فشل تحميل البيانات: ' + msg + (res.status === 401 ? ' (تحقق من مفتاح x-api-key)' : '');
              document.getElementById('meta').textContent = '';
              document.getElementById('rows').innerHTML = '';
              return;
            }
            const data = await res.json().catch(function(){return {ok:false,items:[],total:0};});
            document.getElementById('meta').textContent = 'total: ' + ((data && data.total != null) ? data.total : 0);
            const tb = document.getElementById('rows');
            tb.innerHTML='';
            (data.items||[]).forEach(function(item){
              const tr = document.createElement('tr');
              var html = '<td>' + (item.at||'') + '</td>'+
                         '<td>' + (item['document-uri']||'') + '</td>'+
                         '<td>' + (item['blocked-uri']||'') + '</td>'+
                         '<td>' + (item['violated-directive']||'') + '</td>'+
                         '<td>' + (item['status-code']||'') + '</td>';
              tr.innerHTML = html;
              tb.appendChild(tr);
            });
          } catch (e) {
            document.getElementById('err').textContent = 'خطأ غير متوقع أثناء التحميل: ' + (e && e.message ? e.message : String(e));
          }
        }
        document.getElementById('load').addEventListener('click', load);
        load();
      })();
    </script>
  </body>
</html>`;
    res.setHeader('content-type','text/html; charset=utf-8');
    res.send(html);
  } catch {
    res.status(500).send('Viewer error');
  }
});

app.get('/api/admin/session-check', authOptional, requireRole(['مدير']), (req, res) => {
  res.json({ ok: true, user: { id: req.authUser.id, username: req.authUser.username, roles: req.authUser.roles.map(r=>r.role.name) } });
});

let sentry = null;
try {
  if ((process.env.SENTRY_ENABLED || 'false') === 'true' && process.env.SENTRY_DSN) {
    const Sentry = await import('@sentry/node');
    Sentry.init({ dsn: process.env.SENTRY_DSN, tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE || 0) });
    sentry = Sentry;
    console.log('[Sentry] Initialized');
  }
} catch (e) { console.warn('[Sentry] init failed', e?.message || e); }

try {
  if ((process.env.ELASTIC_APM_ENABLED || 'false') === 'true' && process.env.ELASTIC_APM_SERVER_URL) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const apm = require('elastic-apm-node').start({
      serviceName: process.env.ELASTIC_APM_SERVICE_NAME || 'backend',
      serverUrl: process.env.ELASTIC_APM_SERVER_URL,
      secretToken: process.env.ELASTIC_APM_SECRET_TOKEN,
      active: true,
    });
    console.log('[Elastic APM] Initialized');
  }
} catch (e) { console.warn('[Elastic APM] init failed', e?.message || e); }

const collectDefaultMetrics = promClient.collectDefaultMetrics;
collectDefaultMetrics({ register: promClient.register, prefix: 'alf_' });

const httpRequestCounter = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.025, 0.05, 0.1, 0.2, 0.3, 0.5, 0.75, 1, 1.5, 2, 3, 5]
});

// --------- Analytics & Alerts: Metrics, Stores, and Config ---------

// Business hours defaults: Sunday(0)–Thursday(4), 08:00–16:00
const BUSINESS_DAYS = (process.env.BUSINESS_DAYS || '0,1,2,3,4')
  .split(',').map(s => Number(s.trim())).filter(n => Number.isFinite(n) && n >= 0 && n <= 6);
const BUSINESS_HOURS_START = Number(process.env.BUSINESS_HOURS_START || 8);
const BUSINESS_HOURS_END = Number(process.env.BUSINESS_HOURS_END || 16);

// In-memory time series per minute (with per-route breakdown)
const timeSeriesStore = {
  byMinute: new Map(), // minuteTs -> { total: number, perRoute: Map<string, number> }
  retentionMin: Number(process.env.ANALYTICS_RETENTION_MIN || 24 * 60)
};

// In-memory out-of-hours events store
const outOfHoursStore = {
  events: [], // { at: number, method: string, route: string, user: string }
  retentionMs: Number(process.env.OUT_OF_HOURS_RETENTION_MS || 7 * 24 * 3600 * 1000),
  max: Number(process.env.OUT_OF_HOURS_MAX || 1000)
};

// Per-user behavior (pseudonymous) store
const behaviorStore = {
  byUser: new Map(), // userId -> { total: number, lastSeen: number, routes: Map<string, number> }
  retentionMs: Number(process.env.BEHAVIOR_RETENTION_MS || 24 * 3600 * 1000)
};

// Prometheus metrics for analytics
const outOfHoursCounter = new promClient.Counter({
  name: 'alf_out_of_hours_events_total',
  help: 'Total number of out-of-hours events',
  labelNames: ['route', 'method']
});

const anomaliesCounter = new promClient.Counter({
  name: 'alf_anomalies_total',
  help: 'Total number of detected anomalies',
  labelNames: ['route']
});

function minuteFloor(ts) {
  const d = new Date(ts);
  d.setSeconds(0, 0);
  return d.getTime();
}

function pruneTimeSeries(now = Date.now()) {
  const minKeep = minuteFloor(now) - timeSeriesStore.retentionMin * 60 * 1000;
  for (const [k] of Array.from(timeSeriesStore.byMinute.entries())) {
    if (k < minKeep) timeSeriesStore.byMinute.delete(k);
  }
}

function pruneOutOfHours(now = Date.now()) {
  const minKeep = now - outOfHoursStore.retentionMs;
  if (outOfHoursStore.events.length > outOfHoursStore.max) {
    outOfHoursStore.events = outOfHoursStore.events.slice(-outOfHoursStore.max);
  }
  outOfHoursStore.events = outOfHoursStore.events.filter(e => e.at >= minKeep);
}

function pruneBehavior(now = Date.now()) {
  for (const [uid, rec] of Array.from(behaviorStore.byUser.entries())) {
    if ((rec.lastSeen || 0) < (now - behaviorStore.retentionMs)) behaviorStore.byUser.delete(uid);
  }
}

function isOutOfHours(date = new Date()) {
  const day = date.getDay();
  if (!BUSINESS_DAYS.includes(day)) return true;
  const h = date.getHours();
  return !(h >= BUSINESS_HOURS_START && h < BUSINESS_HOURS_END);
}

function pseudoUserId(req) {
  try {
    if (req.authUser?.id) return `u:${req.authUser.id}`;
    const ip = getClientIp(req) || '';
    const ua = (req.headers['user-agent'] || '').toString();
    const h = crypto.createHash('sha256').update(`${ip}|${ua}`).digest('hex');
    return `g:${h.slice(0,16)}`;
  } catch { return 'g:unknown'; }
}

function updateTimeSeries(route) {
  try {
    const now = Date.now();
    const m = minuteFloor(now);
    let rec = timeSeriesStore.byMinute.get(m);
    if (!rec) { rec = { total: 0, perRoute: new Map() }; timeSeriesStore.byMinute.set(m, rec); }
    rec.total += 1;
    rec.perRoute.set(route, (rec.perRoute.get(route) || 0) + 1);
    if (timeSeriesStore.byMinute.size % 50 === 0) pruneTimeSeries(now);
  } catch {} // eslint-disable-line no-empty
}

function registerOutOfHours(route, method, user) {
  try {
    const now = Date.now();
    outOfHoursStore.events.push({ at: now, method, route, user });
    outOfHoursCounter.inc({ route, method });
    if (outOfHoursStore.events.length > outOfHoursStore.max) {
      outOfHoursStore.events = outOfHoursStore.events.slice(-outOfHoursStore.max);
    }
    if (outOfHoursStore.events.length % 100 === 0) pruneOutOfHours(now);
  } catch {} // eslint-disable-line no-empty
}

function updateBehavior(userId, route) {
  try {
    const now = Date.now();
    let rec = behaviorStore.byUser.get(userId);
    if (!rec) { rec = { total: 0, lastSeen: now, routes: new Map() }; behaviorStore.byUser.set(userId, rec); }
    rec.total += 1;
    rec.lastSeen = now;
    rec.routes.set(route, (rec.routes.get(route) || 0) + 1);
    if (behaviorStore.byUser.size % 100 === 0) pruneBehavior(now);
  } catch {} // eslint-disable-line no-empty
}

app.use((req, res, next) => {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    try {
      const end = process.hrtime.bigint();
      const durSec = Number(end - start) / 1e9;
      const route = req.route?.path || req.path || 'unknown';
      const labels = {
        method: req.method,
        route,
        status_code: String(res.statusCode)
      };
      httpRequestCounter.inc(labels);
      httpRequestDuration.observe(labels, durSec);
      // Update analytics time series, behavior, and out-of-hours alerts
      updateTimeSeries(route);
      const uid = pseudoUserId(req);
      updateBehavior(uid, route);
      if (isOutOfHours(new Date())) {
        registerOutOfHours(route, req.method || 'GET', uid);
      }
    } catch (e) {
      // ignore metrics errors
    } // eslint-disable-line no-empty
  });
  next();
});

const IP_TRACKING_ENABLED = (process.env.IP_TRACKING_ENABLED || 'true') === 'true';
const ipStore = {
  byIp: new Map(),
  filePath: path.join(process.cwd(), 'observability', 'ip-stats.json'),
  loaded: false,
};

function getClientIp(req) {
  try {
    const xf = req.headers['x-forwarded-for'];
    if (typeof xf === 'string' && xf.length) return xf.split(',')[0].trim();
    if (Array.isArray(xf) && xf.length) return String(xf[0]).trim();
    return (req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress || 'unknown').replace('::ffff:', '');
  } catch { return 'unknown'; }
}

function loadIpStats() {
  try {
    if (!fs.existsSync(ipStore.filePath)) return;
    const arr = JSON.parse(fs.readFileSync(ipStore.filePath, 'utf-8'));
    ipStore.byIp.clear();
    for (const it of arr) {
      const rc = new Map(Object.entries(it.routeCounts || {}));
      ipStore.byIp.set(it.ip, { total: it.total||0, byStatus: it.byStatus||{ '2xx':0,'3xx':0,'4xx':0,'5xx':0, other:0 }, lastSeen: it.lastSeen||0, routeCounts: rc });
    }
    ipStore.loaded = true;
  } catch {} // eslint-disable-line no-empty
}

function saveIpStats() {
  try {
    const dir = path.dirname(ipStore.filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const arr = Array.from(ipStore.byIp.entries()).map(([ip, v]) => ({ ip, total: v.total, byStatus: v.byStatus, lastSeen: v.lastSeen, routeCounts: Object.fromEntries(v.routeCounts || []) }));
    fs.writeFileSync(ipStore.filePath, JSON.stringify(arr, null, 2), 'utf-8');
  } catch {} // eslint-disable-line no-empty
}

if (IP_TRACKING_ENABLED) loadIpStats();

IP_TRACKING_ENABLED && app.use((req, res, next) => {
  const ip = getClientIp(req);
  const routePath = req.path || req.route?.path || 'unknown';
  res.on('finish', () => {
    try {
      const sc = Number(res.statusCode);
      const klass = Number.isFinite(sc) ? `${Math.floor(sc / 100)}xx` : 'other';
      let rec = ipStore.byIp.get(ip);
      if (!rec) {
        rec = { total: 0, byStatus: { '2xx':0,'3xx':0,'4xx':0,'5xx':0, other:0 }, lastSeen: 0, routeCounts: new Map() };
        ipStore.byIp.set(ip, rec);
      }
      rec.total += 1;
      if (rec.byStatus[klass] !== undefined) rec.byStatus[klass] += 1; else rec.byStatus.other += 1;
      rec.lastSeen = Date.now();
      rec.routeCounts.set(routePath, (rec.routeCounts.get(routePath) || 0) + 1);
    } catch {} // eslint-disable-line no-empty
  });
  next();
});

function pruneIpStats() {
  try {
    const sevenDaysAgo = Date.now() - 7*24*60*60*1000;
    for (const [ip, rec] of Array.from(ipStore.byIp.entries())) {
      if ((rec.lastSeen || 0) < sevenDaysAgo) {
        ipStore.byIp.delete(ip);
        continue;
      }
      if (rec.routeCounts && rec.routeCounts.size > 100) {
        const arr = Array.from(rec.routeCounts.entries()).sort((a,b)=>b[1]-a[1]).slice(0,100);
        rec.routeCounts = new Map(arr);
      }
    }
  } catch {} // eslint-disable-line no-empty
}
if (IP_TRACKING_ENABLED) setInterval(() => { pruneIpStats(); saveIpStats(); }, 60_000).unref?.();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.join(__dirname, 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
}

const required = ['SMTP_HOST','SMTP_PORT','SMTP_USER','SMTP_PASS'];
const missing = required.filter(k => !process.env[k]);
if (missing.length) {
  console.warn('WARNING: Missing SMTP environment variables:', missing.join(', '));
}

const EMAIL_ENABLED = (process.env.EMAIL_ENABLED || process.env.VITE_ENABLE_EMAIL || 'true') === 'true';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

let transporterStatus = {
  verified: false,
  lastError: null,
  at: null
};

const canVerifySmtp = EMAIL_ENABLED && required.every(k => !!process.env[k]);
if (canVerifySmtp) {
  transporter.verify().then(() => {
    transporterStatus = { verified: true, lastError: null, at: new Date().toISOString() };
    console.log('SMTP transporter verified successfully');
  }).catch(err => {
    transporterStatus = { verified: false, lastError: err?.message || String(err), at: new Date().toISOString() };
    console.warn('SMTP transporter verification failed:', err?.message || err);
  });
} else {
  transporterStatus = { verified: false, lastError: 'SMTP not configured; skipping verify', at: new Date().toISOString() };
  console.warn('SMTP verify skipped: missing configuration or EMAIL_ENABLED=false');
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

app.get('/api/metrics-lite', metricsLiteHandler);

// Security monitor admin endpoints (guarded by API key if configured)
app.get('/api/security/alerts', (req, res) => {
  try {
    if (process.env.METRICS_API_KEY || process.env.API_KEY) {
      const expected = process.env.METRICS_API_KEY || process.env.API_KEY;
      const key = req.headers['x-api-key'] || req.get?.('x-api-key');
      if (!expected || !key || String(key) !== String(expected)) {
        return res.status(401).json({ ok: false, error: 'Unauthorized' });
      }
    }
    const alerts = typeof securityMonitor?.getAlerts === 'function' ? securityMonitor.getAlerts() : [];
    return res.json({ ok: true, alerts: Array.isArray(alerts) ? alerts : [] });
  } catch (e) {
    // Fail-safe: never 500 for read-only admin views; return empty list with hint
    return res.status(200).json({ ok: true, alerts: [], note: 'alerts-unavailable' });
  }
});

app.get('/api/security/blocklist', (req, res) => {
  try {
    if (process.env.METRICS_API_KEY || process.env.API_KEY) {
      const expected = process.env.METRICS_API_KEY || process.env.API_KEY;
      const key = req.headers['x-api-key'] || req.get?.('x-api-key');
      if (!expected || !key || String(key) !== String(expected)) {
        return res.status(401).json({ ok: false, error: 'Unauthorized' });
      }
    }
    const items = typeof securityMonitor?.getBlocklist === 'function' ? securityMonitor.getBlocklist() : [];
    return res.json({ ok: true, items: Array.isArray(items) ? items : [] });
  } catch (e) {
    // Fail-safe: return empty list instead of 500
    return res.status(200).json({ ok: true, items: [], note: 'blocklist-unavailable' });
  }
});

// Final safety net: if any middleware upstream throws for these read-only endpoints,
// degrade to 200 with empty arrays instead of surfacing 500 to clients.
app.use((err, req, res, next) => {
  try {
    const p = req?.path || '';
    if (p === '/api/security/alerts') {
      return res.status(200).json({ ok: true, alerts: [], note: 'alerts-degraded' });
    }
    if (p === '/api/security/blocklist') {
      return res.status(200).json({ ok: true, items: [], note: 'blocklist-degraded' });
    }
  } catch {}
  return next(err);
});

app.post('/api/security/blocklist/unblock', express.json({ limit: '10kb' }), async (req, res) => {
  if (process.env.METRICS_API_KEY || process.env.API_KEY) {
    const expected = process.env.METRICS_API_KEY || process.env.API_KEY;
    const key = req.headers['x-api-key'] || req.get?.('x-api-key');
    if (!expected || !key || String(key) !== String(expected)) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }
  }
  const ip = String(req.body?.ip || '').trim();
  if (!ip) return res.status(400).json({ ok: false, error: 'ip required' });
  await securityMonitor.unblockIP(ip);
  res.json({ ok: true });
});

// --------- Analytics Endpoints ---------

// Helper to compute anomalies on demand using rolling window (mean/std)
function computeAnomalies(windowSize = 60, z = 3) {
  const entries = Array.from(timeSeriesStore.byMinute.entries())
    .sort((a,b) => a[0] - b[0]);
  const anomalies = [];
  const values = entries.map(([, v]) => Number(v.total) || 0);
  for (let i = 0; i < entries.length; i++) {
    if (i < windowSize) continue;
    const windowVals = values.slice(i - windowSize, i);
    const mean = windowVals.reduce((s, x) => s + x, 0) / windowVals.length;
    const variance = windowVals.reduce((s, x) => s + Math.pow(x - mean, 2), 0) / windowVals.length;
    const std = Math.sqrt(variance);
    const curr = values[i];
    if (std > 0 && curr > mean + z * std) {
      const [minuteTs, rec] = entries[i];
      anomalies.push({ minuteTs, count: curr, mean, std, z: (curr - mean) / std, routesTop: Array.from(rec.perRoute.entries()).sort((a,b)=>b[1]-a[1]).slice(0,3) });
      anomaliesCounter.inc({ route: 'ALL' });
    }
  }
  return anomalies.slice(-100);
}

// GET: /api/analytics/series?minutes=60
app.get('/api/analytics/series', (req, res, next) => {
  if (process.env.METRICS_API_KEY || process.env.API_KEY) return requireMetricsKey(req, res, next);
  next();
}, (req, res) => {
  try {
    const minutes = Math.max(1, Math.min(24*60, Number(req.query.minutes || 60)));
    const now = minuteFloor(Date.now());
    const start = now - minutes * 60 * 1000;
    const series = [];
    for (let t = start; t <= now; t += 60 * 1000) {
      const rec = timeSeriesStore.byMinute.get(t);
      const perRoute = rec ? Array.from(rec.perRoute.entries()).sort((a,b)=>b[1]-a[1]).slice(0,5) : [];
      series.push({ minuteTs: t, total: rec?.total || 0, routesTop: perRoute });
    }
    res.json({ ok: true, series, minutes });
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});

// GET: /api/analytics/anomalies?window=60&z=3
app.get('/api/analytics/anomalies', (req, res, next) => {
  if (process.env.METRICS_API_KEY || process.env.API_KEY) return requireMetricsKey(req, res, next);
  next();
}, (req, res) => {
  try {
    const windowSize = Math.max(5, Math.min(240, Number(req.query.window || 60)));
    const z = Math.max(1, Math.min(10, Number(req.query.z || 3)));
    const items = computeAnomalies(windowSize, z);
    res.json({ ok: true, count: items.length, items });
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});

// GET: /api/analytics/out-of-hours
app.get('/api/analytics/out-of-hours', (req, res, next) => {
  if (process.env.METRICS_API_KEY || process.env.API_KEY) return requireMetricsKey(req, res, next);
  next();
}, (req, res) => {
  try {
    pruneOutOfHours();
    const limit = Math.max(1, Math.min(500, Number(req.query.limit || 200)));
    const recent = outOfHoursStore.events.slice(-limit);
    // Aggregate by route
    const byRoute = {};
    for (const e of recent) {
      byRoute[e.route] = (byRoute[e.route] || 0) + 1;
    }
    res.json({ ok: true, total: outOfHoursStore.events.length, recent, byRoute });
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});

// GET: /api/analytics/behavior-summary
app.get('/api/analytics/behavior-summary', (req, res, next) => {
  if (process.env.METRICS_API_KEY || process.env.API_KEY) return requireMetricsKey(req, res, next);
  next();
}, (req, res) => {
  try {
    pruneBehavior();
    const list = Array.from(behaviorStore.byUser.entries()).map(([uid, rec]) => ({
      user: uid,
      total: rec.total,
      lastSeen: rec.lastSeen,
      routesTop: Array.from(rec.routes.entries()).sort((a,b)=>b[1]-a[1]).slice(0,5)
    }))
    .sort((a,b) => b.total - a.total)
    .slice(0, 50);
    res.json({ ok: true, users: list, totalUsers: behaviorStore.byUser.size });
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});

// GET: /api/analytics/dashboard
app.get('/api/analytics/dashboard', (req, res, next) => {
  if (process.env.METRICS_API_KEY || process.env.API_KEY) return requireMetricsKey(req, res, next);
  next();
}, (req, res) => {
  try {
    const minutes = 60;
    const now = minuteFloor(Date.now());
    const start = now - minutes * 60 * 1000;
    const series = [];
    const routeTotals = new Map();
    for (let t = start; t <= now; t += 60 * 1000) {
      const rec = timeSeriesStore.byMinute.get(t);
      if (rec) {
        for (const [r, c] of rec.perRoute.entries()) routeTotals.set(r, (routeTotals.get(r) || 0) + c);
      }
      series.push({ minuteTs: t, total: rec?.total || 0 });
    }
    const topRoutes = Array.from(routeTotals.entries()).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([route, count]) => ({ route, count }));
    const anomalies = computeAnomalies(60, 3).slice(-10);
    pruneOutOfHours();
    const oohSummary = Object.entries(outOfHoursStore.events.reduce((acc, e) => { acc[e.route] = (acc[e.route] || 0) + 1; return acc; }, {})).map(([route, count]) => ({ route, count })).sort((a,b)=>b.count-a.count).slice(0,10);
    const usersTop = Array.from(behaviorStore.byUser.entries()).map(([u, r]) => ({ user: u, total: r.total, lastSeen: r.lastSeen })).sort((a,b)=>b.total-a.total).slice(0,10);
    res.json({ ok: true, minutes, series, topRoutes, anomalies, outOfHoursTop: oohSummary, usersTop, generatedAt: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});

app.get('/metrics', async (req, res, next) => {
  if (process.env.METRICS_API_KEY || process.env.API_KEY) {
    return requireMetricsKey(req, res, async () => {
      try {
        res.set('Content-Type', promClient.register.contentType);
        res.end(await promClient.register.metrics());
      } catch (e) {
        res.status(500).send(String(e));
      }
    });
  }
  next();
}, async (_req, res) => {
  try {
    res.set('Content-Type', promClient.register.contentType);
    res.end(await promClient.register.metrics());
  } catch (e) {
    res.status(500).send(String(e));
  }
});

const summaryGauges = (() => {
  const gauges = {};
  gauges.uptime = new promClient.Gauge({ name: 'alf_summary_uptime_seconds', help: 'App uptime in seconds' });
  gauges.total = new promClient.Gauge({ name: 'alf_summary_requests_total', help: 'Total HTTP requests (all statuses)' });
  gauges.byStatus = new promClient.Gauge({ name: 'alf_summary_requests_by_status', help: 'Requests by status class', labelNames: ['class'] });
  gauges.latency = new promClient.Gauge({ name: 'alf_summary_latency_ms', help: 'Latency summary in milliseconds', labelNames: ['quantile'] });
  gauges.routeTotal = new promClient.Gauge({ name: 'alf_summary_route_requests_total', help: 'Total requests per route', labelNames: ['route'] });
  gauges.routeLatency = new promClient.Gauge({ name: 'alf_summary_route_latency_ms', help: 'Latency per route in milliseconds', labelNames: ['route','quantile'] });
  gauges.routeErrorRate = new promClient.Gauge({ name: 'alf_summary_route_error_rate', help: 'Error rate per route (0..1)', labelNames: ['route'] });
  return gauges;
})();

const allowlistFile = path.join(__dirname, 'observability', 'route-allowlist.json');
let ROUTE_GAUGES_ALLOWLIST = [];
function loadAllowlist() {
  try {
    if (fs.existsSync(allowlistFile)) {
      const arr = JSON.parse(fs.readFileSync(allowlistFile, 'utf-8'));
      if (Array.isArray(arr)) ROUTE_GAUGES_ALLOWLIST = arr.map(s => String(s)).filter(Boolean);
    }
  } catch {} // eslint-disable-line no-empty
  if (!ROUTE_GAUGES_ALLOWLIST.length) {
    const fromEnv = (process.env.ROUTE_GAUGES_ALLOWLIST || '')
      .split(',').map(s => s.trim()).filter(Boolean);
    if (fromEnv.length) ROUTE_GAUGES_ALLOWLIST = fromEnv;
  }
  if (!ROUTE_GAUGES_ALLOWLIST.length) {
    ROUTE_GAUGES_ALLOWLIST = [
      '/api/metrics-summary',
      '/api/errors',
      '/api/errors-stats',
      '/api/send-receipt',
      '/api/demo-trace'
    ];
  }
}
function saveAllowlist() {
  try {
    const dir = path.dirname(allowlistFile);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(allowlistFile, JSON.stringify(ROUTE_GAUGES_ALLOWLIST, null, 2), 'utf-8');
  } catch {} // eslint-disable-line no-empty
}
loadAllowlist();

async function computeMetricsSummary(opts) {
  const metrics = await promClient.register.getMetricsAsJSON();
  const nowIso = new Date().toISOString();

  const ctr = metrics.find(m => m.name === 'http_requests_total');
  const hBucket = metrics.find(m => m.name === 'http_request_duration_seconds_bucket');
  const hSum = metrics.find(m => m.name === 'http_request_duration_seconds_sum');
  const hCount = metrics.find(m => m.name === 'http_request_duration_seconds_count');

  let totalRequests = 0;
  const byStatus = { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0, other: 0 };
  const perRoute = new Map();
  const routesMap = new Map();
  if (ctr && Array.isArray(ctr.values)) {
    for (const v of ctr.values) {
      const val = Number(v.value) || 0;
      totalRequests += val;
      const sc = Number(v.labels?.status_code);
      const klass = Number.isFinite(sc) ? `${Math.floor(sc / 100)}xx` : 'other';
      if (byStatus[klass] !== undefined) byStatus[klass] += val; else byStatus.other += val;
      const route = v.labels?.route || v.labels?.path || 'unknown';
      routesMap.set(route, (routesMap.get(route) || 0) + val);
      if (!perRoute.has(route)) perRoute.set(route, { total: 0, byStatus: { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0, other: 0 } });
      const pr = perRoute.get(route);
      pr.total += val;
      if (pr.byStatus[klass] !== undefined) pr.byStatus[klass] += val; else pr.byStatus.other += val;
    }
  }

  const routesTop = Array.from(routesMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([route, count]) => ({ route, count }));

  const ipsTop = IP_TRACKING_ENABLED
    ? Array.from(ipStore.byIp.entries())
        .map(([ip, v]) => ({ ip, count: v.total, lastSeen: v.lastSeen }))
        .sort((a,b)=> b.count - a.count)
        .slice(0, 10)
    : undefined;

  const perRouteArr = Array.from(perRoute.entries())
    .map(([route, obj]) => ({ route, total: obj.total, byStatus: obj.byStatus }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 50);

  let avgMs = null;
  let p50Ms = null;
  let p95Ms = null;
  let p99Ms = null;
  let totalCount = 0;
  let totalSumSec = 0;
  if (hSum && Array.isArray(hSum.values)) {
    for (const v of hSum.values) totalSumSec += Number(v.value) || 0;
  }
  if (hCount && Array.isArray(hCount.values)) {
    for (const v of hCount.values) totalCount += Number(v.value) || 0;
  }
  if (totalCount > 0) {
    avgMs = (totalSumSec / totalCount) * 1000;
  }

  if (hBucket && Array.isArray(hBucket.values)) {
    const bucketMap = new Map();
    for (const v of hBucket.values) {
      const leStr = v.labels?.le;
      if (leStr == null) continue;
      const le = Number(leStr);
      const count = Number(v.value) || 0;
      bucketMap.set(le, (bucketMap.get(le) || 0) + count);
    }
    const buckets = Array.from(bucketMap.entries())
      .sort((a, b) => a[0] - b[0]);

    const q = (quant) => {
      if (!buckets.length || totalCount === 0) return null;
      const target = totalCount * quant;
      let cum = 0;
      for (const [le, c] of buckets) {
        cum += c;
        if (cum >= target) return le * 1000; // seconds -> ms
      }
      const last = buckets[buckets.length - 1][0];
      return (last || 0) * 1000;
    };
    p50Ms = q(0.5);
    p95Ms = q(0.95);
    p99Ms = q(0.99);
  }

  let routeLatency = null;
  const routeFilter = opts?.routeFilter;
  if (routeFilter && hBucket) {
    let rCount = 0;
    let rSum = 0;
    if (hSum && Array.isArray(hSum.values)) {
      for (const v of hSum.values) {
        if ((v.labels?.route || v.labels?.path) === routeFilter) rSum += Number(v.value) || 0;
      }
    }
    if (hCount && Array.isArray(hCount.values)) {
      for (const v of hCount.values) {
        if ((v.labels?.route || v.labels?.path) === routeFilter) rCount += Number(v.value) || 0;
      }
    }

    let rAvg = null, rp50 = null, rp95 = null, rp99 = null;
    if (rCount > 0) rAvg = (rSum / rCount) * 1000;
    if (Array.isArray(hBucket.values)) {
      const rBucketMap = new Map();
      for (const v of hBucket.values) {
        if ((v.labels?.route || v.labels?.path) !== routeFilter) continue;
        const leStr = v.labels?.le; if (leStr == null) continue;
        const le = Number(leStr);
        const val = Number(v.value) || 0;
        rBucketMap.set(le, (rBucketMap.get(le) || 0) + val);
      }
      const rBuckets = Array.from(rBucketMap.entries()).sort((a,b)=>a[0]-b[0]);
      const q = (quant) => {
        if (!rBuckets.length || rCount === 0) return null;
        const target = rCount * quant;
        let cum = 0;
        for (const [le, c] of rBuckets) { cum += c; if (cum >= target) return le * 1000; }
        const last = rBuckets[rBuckets.length-1][0];
        return (last||0) * 1000;
      };
      rp50 = q(0.5); rp95 = q(0.95); rp99 = q(0.99);
    }
    routeLatency = { route: routeFilter, count: rCount, avgMs: rAvg, p50Ms: rp50, p95Ms: rp95, p99Ms: rp99 };
  }

  return {
    ok: true,
    time: nowIso,
    uptimeSec: process.uptime(),
    totalRequests,
    byStatus,
    routesTop,
  ...(IP_TRACKING_ENABLED ? { ipsTop } : {}),
    perRoute: perRouteArr,
    latency: { avgMs, p50Ms, p95Ms, p99Ms },
    routeLatency,
  };
}

async function updateSummaryGauges() {
  try {
    const s = await computeMetricsSummary();
    if (!s?.ok) return;
    summaryGauges.uptime.set(s.uptimeSec || 0);
    summaryGauges.total.set(s.totalRequests || 0);
    const classes = ['2xx','3xx','4xx','5xx','other'];
    for (const c of classes) {
      const v = s.byStatus?.[c] || 0;
      summaryGauges.byStatus.set({ class: c }, v);
    }
    const lat = s.latency || {};
    const quants = [
      ['avg', lat.avgMs],
      ['p50', lat.p50Ms],
      ['p95', lat.p95Ms],
      ['p99', lat.p99Ms],
    ];
    for (const [q, v] of quants) summaryGauges.latency.set({ quantile: q }, Number(v) || 0);
    summaryGauges.routeTotal.reset();
    for (const r of s.perRoute || []) {
      summaryGauges.routeTotal.set({ route: r.route }, r.total || 0);
    }

    summaryGauges.routeLatency.reset();
    for (const route of ROUTE_GAUGES_ALLOWLIST) {
      try {
        const sR = await computeMetricsSummary({ routeFilter: route });
        const rl = sR?.routeLatency || {};
        const quants = [
          ['avg', rl.avgMs],
          ['p50', rl.p50Ms],
          ['p95', rl.p95Ms],
          ['p99', rl.p99Ms],
        ];
        for (const [q, v] of quants) summaryGauges.routeLatency.set({ route, quantile: q }, Number(v) || 0);
      } catch {} // eslint-disable-line no-empty
    }

    summaryGauges.routeErrorRate.reset();
    try {
      const metrics = await promClient.register.getMetricsAsJSON();
      const ctr = metrics.find(m => m.name === 'http_requests_total');
      const perRoute = new Map();
      if (ctr && Array.isArray(ctr.values)) {
        for (const v of ctr.values) {
          const route = v.labels?.route || v.labels?.path || 'unknown';
          const sc = Number(v.labels?.status_code);
          const val = Number(v.value) || 0;
          if (!perRoute.has(route)) perRoute.set(route, { total: 0, errors: 0 });
          const obj = perRoute.get(route);
          obj.total += val;
          if (Number.isFinite(sc) && (Math.floor(sc / 100) === 4 || Math.floor(sc / 100) === 5)) {
            obj.errors += val;
          }
        }
      }
      for (const route of ROUTE_GAUGES_ALLOWLIST) {
        const obj = perRoute.get(route) || { total: 0, errors: 0 };
        const rate = obj.total > 0 ? obj.errors / obj.total : 0;
        summaryGauges.routeErrorRate.set({ route }, rate);
      }
    } catch {} // eslint-disable-line no-empty
  } catch (e) {
    // noop
  } // eslint-disable-line no-empty
}

setInterval(updateSummaryGauges, 10000).unref?.();

app.get('/api/metrics-summary', async (req, res, next) => {
  if (process.env.METRICS_API_KEY || process.env.API_KEY) {
    return requireMetricsKey(req, res, next);
  }
  next();
}, async (req, res) => {
  try {
    const routeFilter = typeof req.query.route === 'string' ? String(req.query.route) : undefined;
    const s = await computeMetricsSummary({ routeFilter });
    updateSummaryGauges();
    res.json(s);
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});

const ipAllowlistFile = path.join(__dirname, 'observability', 'ip-allowlist.json');
let IP_GAUGES_ALLOWLIST = [];
function loadIpAllowlist() {
  try {
    if (fs.existsSync(ipAllowlistFile)) {
      const arr = JSON.parse(fs.readFileSync(ipAllowlistFile, 'utf-8'));
      if (Array.isArray(arr)) IP_GAUGES_ALLOWLIST = arr.map(s => String(s)).filter(Boolean);
    }
  } catch {} // eslint-disable-line no-empty
  if (!IP_GAUGES_ALLOWLIST.length) {
    const fromEnv = (process.env.IP_GAUGES_ALLOWLIST || '')
      .split(',').map(s => s.trim()).filter(Boolean);
    if (fromEnv.length) IP_GAUGES_ALLOWLIST = fromEnv;
  }
  if (!IP_GAUGES_ALLOWLIST.length) {
    IP_GAUGES_ALLOWLIST = [];
  }
}
function saveIpAllowlist() {
  try {
    const dir = path.dirname(ipAllowlistFile);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(ipAllowlistFile, JSON.stringify(IP_GAUGES_ALLOWLIST, null, 2), 'utf-8');
  } catch {} // eslint-disable-line no-empty
}
if (IP_TRACKING_ENABLED) loadIpAllowlist();

const ipGauges = (() => {
  const g = {};
  g.total = new promClient.Gauge({ name: 'alf_summary_ip_requests_total', help: 'Total requests by IP', labelNames: ['ip'] });
  g.errorRate = new promClient.Gauge({ name: 'alf_summary_ip_error_rate', help: 'Error rate (0..1) by IP', labelNames: ['ip'] });
  return g;
})();

async function updateIpGauges() {
  try {
    ipGauges.total.reset();
    ipGauges.errorRate.reset();
    for (const ip of IP_GAUGES_ALLOWLIST) {
      const rec = ipStore.byIp.get(ip);
      if (!rec) { ipGauges.total.set({ ip }, 0); ipGauges.errorRate.set({ ip }, 0); continue; }
      const total = rec.total || 0;
      const errors = (rec.byStatus['4xx'] || 0) + (rec.byStatus['5xx'] || 0);
      const rate = total > 0 ? errors / total : 0;
      ipGauges.total.set({ ip }, total);
      ipGauges.errorRate.set({ ip }, rate);
    }
  } catch {} // eslint-disable-line no-empty
}

if (IP_TRACKING_ENABLED) setInterval(updateIpGauges, 10000).unref?.();

app.get('/api/ip-allowlist', (req, res) => {
  if (process.env.METRICS_API_KEY || process.env.API_KEY) {
    return requireMetricsKey(req, res, () => res.json({ ok: true, allowlist: IP_GAUGES_ALLOWLIST }));
  }
  if (!IP_TRACKING_ENABLED) return res.status(503).json({ ok: false, error: 'IP tracking disabled' });
  res.json({ ok: true, allowlist: IP_GAUGES_ALLOWLIST });
});

app.post('/api/ip-allowlist', requireApiKey, (req, res) => {
  try {
    if (!IP_TRACKING_ENABLED) return res.status(503).json({ ok: false, error: 'IP tracking disabled' });
    const arr = req.body?.allowlist;
    if (!Array.isArray(arr)) return res.status(400).json({ ok: false, error: 'allowlist must be an array of strings' });
    const cleaned = arr.map(s => String(s).trim()).filter(Boolean).slice(0, 200);
    IP_GAUGES_ALLOWLIST = cleaned;
    saveIpAllowlist();
    setTimeout(updateIpGauges, 50);
    res.json({ ok: true, allowlist: IP_GAUGES_ALLOWLIST });
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});

app.get('/api/ip-stats', (req, res, next) => {
  if (process.env.METRICS_API_KEY || process.env.API_KEY) return requireMetricsKey(req, res, next);
  next();
}, (req, res) => {
  try {
    if (!IP_TRACKING_ENABLED) return res.status(503).json({ ok: false, error: 'IP tracking disabled' });
    const ip = typeof req.query.ip === 'string' ? String(req.query.ip) : undefined;
    const limit = Math.max(1, Math.min(200, Number(req.query.limit || 50)));
    const list = Array.from(ipStore.byIp.entries())
      .map(([ip, v]) => ({ ip, total: v.total, byStatus: v.byStatus, lastSeen: v.lastSeen }))
      .sort((a,b)=> b.total - a.total);
    if (!ip) return res.json({ ok: true, items: list.slice(0, limit), total: list.length });
    const rec = ipStore.byIp.get(ip);
    if (!rec) return res.json({ ok: true, item: null });
    const routes = Array.from(rec.routeCounts.entries()).map(([route,count])=>({route,count})).sort((a,b)=>b.count-a.count).slice(0,50);
    res.json({ ok: true, item: { ip, total: rec.total, byStatus: rec.byStatus, lastSeen: rec.lastSeen, routes } });
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});

app.get('/api/route-allowlist', (_req, res) => {
  res.json({ ok: true, allowlist: ROUTE_GAUGES_ALLOWLIST });
});

app.post('/api/route-allowlist', requireApiKey, (req, res) => {
  try {
    const arr = req.body?.allowlist;
    if (!Array.isArray(arr)) return res.status(400).json({ ok: false, error: 'allowlist must be an array of strings' });
    const cleaned = arr.map(s => String(s).trim()).filter(Boolean).slice(0, 100);
    ROUTE_GAUGES_ALLOWLIST = cleaned;
    saveAllowlist();
    setTimeout(updateSummaryGauges, 50);
    res.json({ ok: true, allowlist: ROUTE_GAUGES_ALLOWLIST });
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});

app.post('/otel/v1/traces', async (req, res) => {
  const forwardUrl = process.env.OTEL_FORWARD_URL;
  if (!forwardUrl) {
    return res.status(204).end();
  }
  try {
    // Node 18+: global fetch is available
    const r = await fetch(forwardUrl, {
      method: 'POST',
      headers: {
        'content-type': req.headers['content-type'] || 'application/json',
      },
      body: req.body && typeof req.body === 'object' ? JSON.stringify(req.body) : req.body,
    });
    // Collector typically returns 200/202; propagate minimal status
    res.status(r.status || 202).end();
  } catch (e) {
    console.warn('OTLP forward error:', e?.message || e);
    res.status(204).end(); // degrade to no-op rather than erroring the app
  }
});

const logsLimiter = rateLimit({ windowMs: 60_000, max: Number(process.env.LOGS_RATE_LIMIT || 60), standardHeaders: true, legacyHeaders: false });
app.post('/api/logs', requireApiKey, logsLimiter, (req, res) => {
  try {
    const payload = req.body;
    const items = Array.isArray(payload) ? payload : [payload];
    for (const item of items) {
      // eslint-disable-next-line no-console
      console.log('[frontend-log]', JSON.stringify(item));
    }
    res.json({ ok: true, received: items.length });
  } catch (e) {
    console.error('Error processing logs:', e);
    res.status(400).json({ ok: false });
  }
});

app.get('/api/trace-id', (req, res) => {
  res.json({ ok: true, request_id: req.request_id || req.headers['x-request-id'] || null });
});

app.get('/api/demo-trace', async (_req, res) => {
  const started = Date.now();
  // Simulate some async work
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  await sleep(50 + Math.floor(Math.random() * 150));
  await sleep(20 + Math.floor(Math.random() * 100));
  res.json({ ok: true, ms: Date.now() - started, at: new Date().toISOString() });
});

app.get('/api/email-status', (_req, res) => {
  res.json({
    ok: true,
    enabled: EMAIL_ENABLED,
    transporter: transporterStatus,
    missingEnv: missing
  });
});

app.get('/api/security/status', (req, res) => {
  try {
    const filePath = path.join(process.cwd(), 'security_status.json');
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ ok: false, error: 'security_status.json not found' });
    }
    const raw = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(raw);
    const issues = Array.isArray(data.issues) ? data.issues : [];
    const totals = {
      all: issues.length,
      critical: issues.filter(i => i.priority === 'critical').length,
      high: issues.filter(i => i.priority === 'high').length,
      medium: issues.filter(i => i.priority === 'medium').length,
      low: issues.filter(i => i.priority === 'low').length,
      planned: issues.filter(i => i.status === 'planned').length,
      in_progress: issues.filter(i => i.status === 'in_progress').length,
      done: issues.filter(i => i.status === 'done').length,
      deferred: issues.filter(i => i.status === 'deferred').length,
    };
    // Weighted remaining risk score (unresolved only)
    const weights = { critical:5, high:3, medium:2, low:1 };
    let remainingWeightedSum = 0;
    for (const iss of issues) {
      if (iss.status !== 'done') remainingWeightedSum += weights[iss.priority] || 1;
    }
    // Critical path assumed = chain starting from first critical id(s) with dependencies
    // Compute percentCompleteCriticalPath using original data if present else derive
    let percentCompleteCriticalPath = data?.progress?.percentCompleteCriticalPath ?? null;
    if (percentCompleteCriticalPath == null) {
      const crit = issues.filter(i => i.priority === 'critical');
      const doneCrit = crit.filter(i => i.status === 'done').length;
      percentCompleteCriticalPath = crit.length ? Math.round((doneCrit/crit.length)*100) : 0;
    }
    // Dependency graph -> Mermaid spec
    // Nodes colored by priority; shape by status
    const colorMap = { critical: '#dc2626', high: '#f97316', medium: '#facc15', low: '#6b7280' };
    const statusDeco = (s) => {
      switch(s) {
        case 'done': return '((✓))'; // double circle
        case 'in_progress': return '(~)';
        case 'planned': return '(?)';
        case 'deferred': return '([✕])';
        default: return '(?)';
      }
    };
    const safeId = (id) => `I${id}`;
    const lines = ['graph TD'];
    for (const iss of issues) {
      const nid = safeId(iss.id);
      const label = `${iss.id}: ${iss.title}`.replace(/[:`]/g,'');
      const deco = statusDeco(iss.status);
      lines.push(`${nid}${deco}:::p${iss.priority}---${nid}Label("${label}")`);
    }
    for (const iss of issues) {
      if (Array.isArray(iss.dependencies)) {
        for (const dep of iss.dependencies) {
          if (dep == null) continue;
            lines.push(`${safeId(dep)} --> ${safeId(iss.id)}`);
        }
      }
    }
    // Mermaid class definitions
    Object.entries(colorMap).forEach(([k,v]) => {
      lines.push(`classDef p${k} fill:${v},stroke:#333,stroke-width:1,color:#fff;`);
    });
    const mermaid = lines.join('\n');
    res.json({
      ok: true,
      generatedAt: data.generatedAt || null,
      nextReview: data.nextReview || null,
      totals,
      percentCompleteCriticalPath,
      remainingWeightedSum,
      issues: issues.map(i => ({ id:i.id, title:i.title, priority:i.priority, status:i.status, dependencies:i.dependencies || [] })),
      mermaid
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});

// ---------------- Tickets (initial endpoint) ----------------
// NOTE: This is the first DB-backed endpoint. We intentionally keep scope small.
// Future enhancements (auth, audit logging, attachments) will build on this foundation.
app.post('/api/tickets', authOptional, async (req, res, next) => {
  try {
    const { departmentId, citizenName, citizenNationalId, type } = req.body || {};

    // Validate and sanitize using unified validator
    const schema = {
      departmentId: { required: true, minLength: 1, maxLength: 64 },
      citizenName: { type: 'arabic', required: false, minLength: 2, maxLength: 150 },
      citizenNationalId: { type: 'nationalId', required: false },
      type: { type: 'arabic', required: false, minLength: 2, maxLength: 80 }
    };
    const { valid, errors, sanitized } = inputValidator.validateObject(schema, { departmentId, citizenName, citizenNationalId, type });
    if (!valid) {
      return res.status(400).json({ ok: false, error: 'مدخلات غير صالحة', details: errors });
    }

    const dept = await prisma.department.findUnique({ where: { id: sanitized.departmentId } });
    if (!dept) {
      return res.status(400).json({ ok: false, error: 'القسم غير موجود' });
    }

    const trimOrNull = (v, max = 200) => (typeof v === 'string' && v.trim()) ? v.trim().slice(0, max) : null;
    const data = {
      departmentId: dept.id,
      citizenName: trimOrNull(sanitized.citizenName, 150),
      citizenNationalId: trimOrNull(sanitized.citizenNationalId, 20),
      type: trimOrNull(sanitized.type, 80),
      status: 'NEW'
    };

    const user = req.authUser || null;

    const result = await prisma.$transaction(async (tx) => {
      const createdTicket = await tx.ticket.create({ data: { ...data, createdById: user?.id || null } });
      await tx.ticketHistory.create({
        data: {
          ticketId: createdTicket.id,
          action: 'CREATE',
          oldStatus: null,
          newStatus: createdTicket.status,
          actorId: user?.id || null
        }
      });
      const prev = await tx.auditLog.findFirst({ orderBy: { createdAt: 'desc' }, select: { hashChainCurr: true } });
      const logPayload = {
        action: 'ticket.create',
        entity: 'Ticket',
        entityId: createdTicket.id,
        after: JSON.stringify(createdTicket)
      };
      const hashBase = (prev?.hashChainCurr || '') + JSON.stringify(logPayload);
      const hashChainCurr = crypto.createHash('sha256').update(hashBase).digest('hex');
      await tx.auditLog.create({
        data: {
          actorId: user?.id || null,
            action: 'ticket.create',
            entity: 'Ticket',
            entityId: createdTicket.id,
            before: null,
            after: JSON.stringify(createdTicket),
            ip: req.ip?.toString().slice(0,64) || null,
            userAgent: (req.headers['user-agent'] || '').toString().slice(0,200) || null,
            hashChainPrev: prev?.hashChainCurr || null,
            hashChainCurr
        }
      });
      return createdTicket;
    });

  // webhook: ticket created (admin)
  emitTicketEvent('ticket.created', result.id).catch(()=>{});
  res.status(201).json({ ok: true, ticket: result });
  } catch (e) {
    return next(e);
  }
});

app.patch('/api/tickets/:id/status', authOptional, authRequired, async (req, res, next) => {
  try {
    const ticketId = req.params.id;
    const { status } = req.body || {};
    const allowed = ['NEW','IN_PROGRESS','ANSWERED','CLOSED'];
    if (!allowed.includes(status)) return res.status(400).json({ ok: false, error: 'حالة غير صالحة' });
    const user = req.authUser;
    const updated = await prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.findUnique({ where: { id: ticketId } });
      if (!ticket) return null;
      if (ticket.status === status) return ticket; // no-op
      const oldStatus = ticket.status;
      const newTicket = await tx.ticket.update({ where: { id: ticketId }, data: { status } });
      await tx.ticketHistory.create({
        data: {
          ticketId: ticketId,
          action: 'STATUS_CHANGE',
          oldStatus,
          newStatus: status,
          actorId: user?.id || null
        }
      });
      const prev = await tx.auditLog.findFirst({ orderBy: { createdAt: 'desc' }, select: { hashChainCurr: true } });
      const after = { id: newTicket.id, status: newTicket.status };
      const hashBase = (prev?.hashChainCurr || '') + JSON.stringify({ action: 'ticket.status', entity: 'Ticket', entityId: newTicket.id, after });
      const hashChainCurr = crypto.createHash('sha256').update(hashBase).digest('hex');
      await tx.auditLog.create({
        data: {
          actorId: user?.id || null,
          action: 'ticket.status',
          entity: 'Ticket',
          entityId: newTicket.id,
          before: JSON.stringify({ id: ticket.id, status: oldStatus }),
          after: JSON.stringify(after),
          ip: req.ip?.toString().slice(0,64) || null,
          userAgent: (req.headers['user-agent'] || '').toString().slice(0,200) || null,
          hashChainPrev: prev?.hashChainCurr || null,
          hashChainCurr
        }
      });
      return newTicket;
    });
  if (!updated) return res.status(404).json({ ok: false, error: 'التذكرة غير موجودة' });
  // webhook: status changed
  emitTicketEvent('ticket.status', updated.id).catch(()=>{});
    res.json({ ok: true, ticket: { id: updated.id, status: updated.status } });
  } catch (e) {
    return next(e);
  }
});

app.patch('/api/tickets/:id/response', authOptional, authRequired, async (req, res, next) => {
  try {
    const ticketId = req.params.id;
    const { responseText, markAnswered, attachments } = req.body || {};
    if (typeof responseText !== 'string' || !responseText.trim()) {
      return res.status(400).json({ ok: false, error: 'النص مطلوب' });
    }
    const trimmed = responseText.trim();
    const MAX_LEN = 8000;
    if (trimmed.length > MAX_LEN) {
      return res.status(400).json({ ok: false, error: `النص أطول من الحد المسموح (${MAX_LEN} حرفاً)` });
    }
    // Sanitize as HTML to prevent XSS in downstream rendering
    const sanitizedHtml = inputValidator.sanitize(trimmed, 'html');
    const user = req.authUser;
    const updated = await prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.findUnique({ where: { id: ticketId } });
      if (!ticket) return null;
      const oldStatus = ticket.status;
      const nextStatus = markAnswered ? 'ANSWERED' : ticket.status;
      const newTicket = await tx.ticket.update({ where: { id: ticketId }, data: { status: nextStatus, responseText: sanitizedHtml } });
      await tx.ticketHistory.create({
        data: {
          ticketId: ticketId,
          action: 'RESPONSE',
          oldStatus: oldStatus,
          newStatus: nextStatus,
          diffSummary: `response set length=${sanitizedHtml.length}`,
          actorId: user?.id || null
        }
      });
      if (Array.isArray(attachments)) {
        for (const meta of attachments.slice(0, 10)) {
          try {
            await tx.attachment.create({
              data: {
                ticketId,
                filename: String(meta.filename || 'file'),
                mimeType: String(meta.mimeType || 'application/octet-stream'),
                sizeBytes: Number(meta.sizeBytes || 0),
                encrypted: false,
                uploadedById: user?.id || null
              }
            });
          } catch {} // eslint-disable-line no-empty
        }
      }
      const prev = await tx.auditLog.findFirst({ orderBy: { createdAt: 'desc' }, select: { hashChainCurr: true } });
      const after = { id: newTicket.id, status: newTicket.status, responsePreview: trimmed.slice(0,200) };
      const logPayload = { action: 'ticket.response', entity: 'Ticket', entityId: newTicket.id, after };
      const hashBase = (prev?.hashChainCurr || '') + JSON.stringify(logPayload);
      const hashChainCurr = crypto.createHash('sha256').update(hashBase).digest('hex');
      await tx.auditLog.create({
        data: {
          actorId: user?.id || null,
          action: 'ticket.response',
          entity: 'Ticket',
          entityId: newTicket.id,
          before: JSON.stringify({ id: ticket.id, status: oldStatus }),
          after: JSON.stringify(after),
          ip: req.ip?.toString().slice(0,64) || null,
          userAgent: (req.headers['user-agent'] || '').toString().slice(0,200) || null,
          hashChainPrev: prev?.hashChainCurr || null,
          hashChainCurr
        }
      });
      return newTicket;
    });
  if (!updated) return res.status(404).json({ ok: false, error: 'التذكرة غير موجودة' });
  // webhook: response added (and maybe answered)
  emitTicketEvent('ticket.response', updated.id).catch(()=>{});
    res.json({ ok: true, ticket: updated });
  } catch (e) {
    return next(e);
  }
});

app.post('/api/tickets/:id/responses', authOptional, authRequired, upload.array('files', Number(process.env.UPLOAD_MAX_COUNT || 5)), async (req, res, next) => {
  try {
    const ticketId = req.params.id;
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) return res.status(404).json({ ok: false, error: 'التذكرة غير موجودة' });
    const { body, isInternal } = req.body || {};
    if (typeof body !== 'string' || !body.trim()) return res.status(400).json({ ok: false, error: 'النص مطلوب' });
    const MAX_BODY = 10000;
    if (body.length > MAX_BODY) return res.status(400).json({ ok: false, error: `النص أطول من ${MAX_BODY}` });
    const { sanitized, redactionFlags } = redactAndSanitize(body);
    const user = req.authUser;
    const files = Array.isArray(req.files) ? req.files : [];
    const responseRecord = await prisma.$transaction(async (tx) => {
      const resp = await tx.ticketResponse.create({
        data: {
          ticketId,
            authorId: user?.id || null,
          body: body.trim(),
          bodySanitized: sanitized,
          isInternal: String(isInternal) === 'true',
          visibility: String(isInternal) === 'true' ? 'INTERNAL' : 'PUBLIC',
          redactionFlags: redactionFlags.length ? JSON.stringify(redactionFlags) : null
        }
      });
      for (const f of files) {
        try {
          await tx.attachment.create({
            data: {
              ticketId,
              ticketResponseId: resp.id,
              filename: f.originalname.slice(0,180),
              mimeType: f.mimetype.slice(0,120),
              sizeBytes: f.size,
              encrypted: false,
              uploadedById: user?.id || null,
              storagePath: `memory://${f.originalname}`
            }
          });
        } catch {} // eslint-disable-line no-empty
      }
      await tx.ticketHistory.create({
        data: {
          ticketId,
          action: 'RESPONSE_ADD',
          oldStatus: ticket.status,
          newStatus: ticket.status,
          diffSummary: `response+ (len=${body.length}, files=${files.length})`,
          actorId: user?.id || null
        }
      });
      const prev = await tx.auditLog.findFirst({ orderBy: { createdAt: 'desc' }, select: { hashChainCurr: true } });
      const after = { id: resp.id, ticketId, preview: sanitized.slice(0,200) };
      const payload = { action: 'ticket.response.add', entity: 'TicketResponse', entityId: resp.id, after };
      const hashBase = (prev?.hashChainCurr || '') + JSON.stringify(payload);
      const hashChainCurr = crypto.createHash('sha256').update(hashBase).digest('hex');
      await tx.auditLog.create({
        data: {
          actorId: user?.id || null,
          action: 'ticket.response.add',
          entity: 'TicketResponse',
          entityId: resp.id,
          before: null,
          after: JSON.stringify(after),
          ip: req.ip?.toString().slice(0,64) || null,
          userAgent: (req.headers['user-agent'] || '').toString().slice(0,200) || null,
          hashChainPrev: prev?.hashChainCurr || null,
          hashChainCurr
        }
      });
      return resp;
    });
    // Citizen notification (email/SMS stub)
    (async () => {
      try {
        const email = ticket.citizenEmail;
        if (email && process.env.SMTP_HOST) {
          // very lightweight send stub (reuse existing transporter if later added)
          // Placeholder: integrate existing email flow if present.
        }
      } catch {} // eslint-disable-line no-empty
    })();
    res.json({ ok: true, response: {
      id: responseRecord.id,
      ticketId: responseRecord.ticketId,
      bodySanitized: responseRecord.bodySanitized,
      visibility: responseRecord.visibility,
      createdAt: responseRecord.createdAt
    }});
  } catch (e) { return next(e); }
});

app.get('/api/tickets/:id/responses', authOptional, async (req, res, next) => {
  try {
    const ticketId = req.params.id;
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) return res.status(404).json({ ok: false, error: 'التذكرة غير موجودة' });
    const isUser = !!req.authUser;
    const responses = await prisma.ticketResponse.findMany({
      where: { ticketId, ...(isUser ? {} : { visibility: 'PUBLIC' }) },
      orderBy: { createdAt: 'asc' },
      select: { id:true, createdAt:true, bodySanitized:true, visibility:true, isInternal:true, redactionFlags:true }
    });
    res.json({ ok: true, responses });
  } catch (e) { return next(e); }
});

app.get('/api/departments', async (_req, res, next) => {
  try {
    const items = await prisma.department.findMany({
      where: { isActive: true },
      select: { id: true, name: true }
    });
    res.json({ ok: true, departments: items });
  } catch (e) {
    return next(e);
  }
});

app.get('/api/otel-info', (_req, res) => {
  res.json({
    ok: true,
    time: new Date().toISOString(),
    nodeVersion: process.version,
    port: Number(process.env.PORT || 4000),
    backendTracingEnabled: (process.env.OTEL_TRACING_ENABLED || 'false') === 'true',
    exporterEndpoint: process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT || null,
    forwardUrl: process.env.OTEL_FORWARD_URL || null,
    viteOtlpHttpUrl: process.env.VITE_OTLP_HTTP_URL || null,
  });
});

app.post('/api/ai/observability', async (req, res) => {
  try {
    const payload = req.body || {};
    const otel = {
      backendTracingEnabled: (process.env.OTEL_TRACING_ENABLED || 'false') === 'true',
      exporterEndpoint: process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT || null,
      forwardUrl: process.env.OTEL_FORWARD_URL || null,
      viteOtlpHttpUrl: process.env.VITE_OTLP_HTTP_URL || null,
      nodeVersion: process.version,
      port: Number(process.env.PORT || 4000),
    };

    const f = payload.frontend || {};
    const probes = payload.probes || {};

    let score = 0;
    const recs = [];
    const notes = [];

    if (probes.healthOk) { score += 30; } else { recs.push('الخادم غير متاح: تحقق من تشغيله على المنفذ 4000 أو منفذك المخصص.'); }

    if (f.tracingEnabled) { score += 15; } else { recs.push('تفعيل التتبّع في الواجهة الأمامية (Tools/Observability) لالتقاط مسارات المتصفح.'); }

    if (otel.backendTracingEnabled) { score += 15; } else { recs.push('تفعيل تتبّع الخلفية بوضع OTEL_TRACING_ENABLED=true لإظهار سبانات السيرفر.'); }

    if (f.viteOtlpHttpUrl === '/otel/v1/traces') { score += 10; } else { recs.push('اضبط VITE_OTLP_HTTP_URL على /otel/v1/traces لاستخدام تمرير الخادم وتجنّب CORS.'); }

    if (otel.forwardUrl && /4318\/v1\/traces/.test(otel.forwardUrl)) { score += 15; }
    else { recs.push('اضبط OTEL_FORWARD_URL على http://localhost:4318/v1/traces لتمرير تتبّعات المتصفح إلى المجمع.'); }

    if (otel.exporterEndpoint && /4318\/v1\/traces/.test(otel.exporterEndpoint)) { score += 10; }
    else { recs.push('اضبط OTEL_EXPORTER_OTLP_TRACES_ENDPOINT للخلفية إلى http://localhost:4318/v1/traces لتصدير سبانات السيرفر.'); }

    if (payload.lastRequestId) { score += 5; notes.push('تم التقاط request_id؛ الارتباط بين السجلات والطلبات متاح.'); }

    score = Math.max(0, Math.min(100, score));
    let status = 'ok';
    if (score < 70) status = 'warn';
    if (!probes.healthOk) status = 'error';

    const summary = status === 'ok'
      ? 'النظام جاهز للتتبّع: صحة الخادم جيدة، ومسارات OTLP مُهيأة بصورة مقبولة.'
      : status === 'warn'
      ? 'الإعدادات قابلة للعمل مع بعض التحسينات الموصى بها لرفع تغطية التتبّع.'
      : 'الخادم غير متاح أو توجد مشكلة تمنع التتبّع حالياً.';

    const detailsLines = [];
    detailsLines.push(`- Health: ${probes.healthOk ? 'OK' : 'FAIL'}`);
    detailsLines.push(`- Frontend tracing: ${f.tracingEnabled ? 'ON' : 'OFF'}`);
    detailsLines.push(`- Backend tracing: ${otel.backendTracingEnabled ? 'ON' : 'OFF'}`);
    detailsLines.push(`- Frontend OTLP URL (Vite): ${f.viteOtlpHttpUrl || '—'}`);
    detailsLines.push(`- Backend forward URL: ${otel.forwardUrl || '—'}`);
    detailsLines.push(`- Backend exporter endpoint: ${otel.exporterEndpoint || '—'}`);
    if (notes.length) detailsLines.push(...notes.map(n => `- ملاحظة: ${n}`));

    res.json({ ok: true, status, score, summary, details: detailsLines.join('\n'), recommendations: recs });
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});

const errorStore = {
  byId: new Map(),
  byKey: new Map(),
  filePath: path.join(__dirname, 'observability', 'errors.json'),
  loaded: false,
};

function loadErrorsFromDisk() {
  try {
    if (!fs.existsSync(errorStore.filePath)) return;
    const raw = fs.readFileSync(errorStore.filePath, 'utf-8');
    const arr = JSON.parse(raw);
    errorStore.byId.clear();
    errorStore.byKey.clear();
    for (const r of arr) {
      errorStore.byId.set(r.id, r);
      const key = `${r.message}|${r.route}`;
      errorStore.byKey.set(key, r.id);
    }
    errorStore.loaded = true;
  } catch (e) {
    console.warn('Failed to load errors from disk:', e?.message || e);
  }
}

function saveErrorsToDisk() {
  try {
    const dir = path.dirname(errorStore.filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const arr = Array.from(errorStore.byId.values());
    fs.writeFileSync(errorStore.filePath, JSON.stringify(arr, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Failed to save errors to disk:', e?.message || e);
  }
}

function recordError(err, req) {
  try {
    const message = err?.message || String(err);
    const route = req?.route?.path || req?.path || 'unknown';
    const key = `${message}|${route}`;
    const now = Date.now();
    let recId = errorStore.byKey.get(key);
    if (!recId) {
      recId = `${now}-${Math.random().toString(36).slice(2,7)}`;
      errorStore.byKey.set(key, recId);
      errorStore.byId.set(recId, {
        id: recId,
        message,
        route,
        stack: err?.stack || null,
        firstAt: now,
        lastAt: now,
        count: 1,
        resolved: false,
      });
    } else {
      const rec = errorStore.byId.get(recId);
      if (rec) {
        rec.lastAt = now;
        rec.count += 1;
        if (!rec.stack && err?.stack) rec.stack = err.stack;
        errorStore.byId.set(recId, rec);
      }
    }
    // Retention: keep last 7 days only
    const sevenDaysAgo = Date.now() - 7*24*60*60*1000;
    for (const [id, rec] of Array.from(errorStore.byId.entries())) {
      if (rec.lastAt < sevenDaysAgo) {
        errorStore.byId.delete(id);
        const key = `${rec.message}|${rec.route}`;
        if (errorStore.byKey.get(key) === id) errorStore.byKey.delete(key);
      }
    }
    saveErrorsToDisk();
  } catch { // eslint-disable-line no-empty
    // ignore
  }
}

app.get('/api/demo-error', (_req, _res, next) => {
  const e = new Error('Demo error for testing');
  // @ts-ignore
  e.code = 'DEMO_ERR';
  next(e);
});

app.get('/api/errors', (req, res) => {
  if (!errorStore.loaded) loadErrorsFromDisk();
  const sinceMs = Number(req.query.sinceMs || 24*60*60*1000);
  const threshold = Date.now() - sinceMs;
  const items = Array.from(errorStore.byId.values())
    .filter(r => r.lastAt >= threshold)
    .sort((a,b) => b.lastAt - a.lastAt)
    .map(r => ({
      id: r.id,
      message: r.message,
      route: r.route,
      count: r.count,
      lastAt: r.lastAt,
      resolved: r.resolved,
      stack: r.stack ? String(r.stack).slice(0, 4000) : null,
    }));
  res.json({ ok: true, items, total: items.length });
});

app.post('/api/errors/:id/resolve', requireApiKey, (req, res) => {
  const id = req.params.id;
  if (!errorStore.loaded) loadErrorsFromDisk();
  const rec = errorStore.byId.get(id);
  if (!rec) return res.status(404).json({ ok: false, error: 'Not found' });
  rec.resolved = true;
  errorStore.byId.set(id, rec);
  saveErrorsToDisk();
  res.json({ ok: true });
});

app.get('/api/errors-stats', (_req, res) => {
  if (!errorStore.loaded) loadErrorsFromDisk();
  const threshold = Date.now() - 24*60*60*1000;
  const items = Array.from(errorStore.byId.values()).filter(r => r.lastAt >= threshold);
  const totalCount = items.reduce((acc, r) => acc + r.count, 0);
  // top offenders by count
  const top = items
    .slice()
    .sort((a,b) => b.count - a.count)
    .slice(0,5)
    .map(r => ({ id: r.id, message: r.message, route: r.route, count: r.count, lastAt: r.lastAt }));
  res.json({ ok: true, totalErrors: items.length, totalCount, top });
});

// Express error handler (must be after routes)
// Captures errors and records them; responds with JSON
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  try { recordError(err, req); } catch {} // eslint-disable-line no-empty
  try { if (sentry) sentry.captureException(err); } catch {} // eslint-disable-line no-empty
  const status = err.status || 500;
  res.status(status).json({ ok: false, error: err.message || 'Server error', code: err.code || null });
});

const mailLimiter = rateLimit({ windowMs: 60_000, max: Number(process.env.MAIL_RATE_LIMIT || 30), standardHeaders: true, legacyHeaders: false });
app.post('/api/send-receipt', requireApiKey, express.json({ limit: '5mb' }), mailLimiter, async (req, res) => {
  if (!EMAIL_ENABLED) {
    return res.status(503).json({ ok: false, error: 'Email disabled by configuration' });
  }
  try {
    const { to, subject, body, imageData, ticketId } = req.body || {};
    if (!to || !imageData) {
      return res.status(400).json({ ok: false, error: 'Missing to or imageData' });
    }

    // Sanitize subject/body
    const safeSubject = String(subject || 'إيصال تقديم طلب').slice(0, 200);
    const safeBody = sanitizeHtml(String(body || '<p>مرفق صورة عن إيصال تقديم الطلب.</p>'), {
      allowedTags: ['p','br','b','strong','i','em','u','span','div'],
      allowedAttributes: { 'span': ['style'], 'div': ['style'] },
      allowedSchemes: ['data','http','https']
    });

    if (!transporterStatus.verified) {
      console.warn('Attempting send while transporter not verified');
    }

  const attachments = [];
    if (typeof imageData === 'string' && imageData.startsWith('data:image/')) {
      const base64 = imageData.split(',')[1];
      attachments.push({
        filename: `receipt-${ticketId || Date.now()}.png`,
        content: base64,
        encoding: 'base64'
      });
    }

    const mailOptions = {
      from: process.env.MAIL_FROM || process.env.SMTP_USER,
      to: String(to),
      subject: safeSubject,
      html: safeBody,
      attachments
    };

    await transporter.sendMail(mailOptions);
    res.json({ ok: true, message: 'Email sent' });
  } catch (e) {
    console.error('Failed to send email:', e);
    res.status(500).json({ ok: false, error: 'Failed to send email', details: e.message });
  }
});

// Only start the HTTP listener when not running under tests (Vitest sets NODE_ENV='test' and VITEST='true')
if (process.env.NODE_ENV !== 'test' && process.env.VITEST !== 'true') {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}
