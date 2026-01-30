# 3.3 إدارة المفاتيح التشفيرية

هذا القسم يوضح هيكلية إدارة المفاتيح التشفيرية ودورة حياتها (توليد → تدوير → تفعيل → إعادة تشفير → أرشفة/إتلاف)، مع ضمان عدم كشف مواد المفاتيح الحساسة.

## هرمية المفاتيح

Root Master Key (RMK)
├── Data Encryption Master Key (DMK)
│   ├── Field Encryption Keys (حقول قاعدة البيانات)
│   ├── File Encryption Keys (ملفات/مرفقات)
│   └── Backup Encryption Keys (النسخ الاحتياطية)
│
├── Signing Master Key (SMK)
│   ├── Session Signing Keys (جلسات)
│   ├── API Signing Keys (واجهات API)
│   └── Log Signing Keys (السجلات)
│
└── Authentication Master Key (AMK)
    ├── HMAC Keys
    ├── JWT Keys
    └── OAuth Keys

التمثيل البرمجي موجود في `utils/keyRotationManager.ts` عبر التعداد `KeyType` الذي يتضمن جميع الأنواع أعلاه.

## دورة الحياة والجدولة

- توليد المفاتيح باستخدام WebCrypto (AES-GCM) مع قوة 256-بت افتراضياً.
- سياسة تدوير افتراضية:
  - `ROOT_MASTER`: سنوي (365 يوم)
  - `DATA_MASTER`: ربع سنوي (90 يوم)
  - `SIGNING_MASTER`: نصف سنوي (180 يوم)
  - `AUTH_MASTER`: شهري (30 يوم)
  - `SESSION_KEY`: أسبوعي (7 أيام)
  - `TEMPORARY_KEY`: يومي (24 ساعة)
  - مفاتيح التفرعات (ملفات، قاعدة بيانات، نسخ احتياطي، توقيع الجلسات/API/السجلات، HMAC/JWT/OAuth) لها دورات مناسبة افتراضياً ويمكن تخصيصها.
- يتم حفظ «البيانات الوصفية فقط» في `localStorage` (بدون مادة المفاتيح الخام) تحت المفاتيح:
  - `kms.key.metadata.v1`: بيانات المفاتيح (مع تواريخ ISO)
  - `kms.rotation.logs.v1`: سجلات عمليات التدوير (نجاح/فشل)
  - `kms.alerts.v1`: تنبيهات حرجة عند فشل التدوير
  - `kms.deletion.schedule.v1`: جدول حذف (أرشفة) المفاتيح القديمة

ملاحظة: مادة المفاتيح الخام تبقى في الذاكرة فقط خلال الجلسة ولا تُحفظ في LocalStorage.

## سير عمل التدوير

تتضمن الدالة `rotateKeys(keyType)` الخطوات التالية لكل مفتاح نشط من النوع المحدد:
1. توليد مفتاح جديد ورفع رقم النسخة.
2. تغليف المفتاح الجديد باستخدام المفتاح الأب (KEK) عبر AES-GCM وحفظ نتيجة التغليف داخل metadata (إن توفر KEK في الذاكرة).
3. حفظ Metadata للمفتاح الجديد كـ `pending`.
4. اختبار المفتاح ذاتياً (encrypt/decrypt) للتأكد من الصلاحية.
5. تفعيل المفتاح الجديد وتوسيم القديم كـ `deprecated`.
6. بدء مهام «إعادة التشفير» المرتبطة بالنوع عبر `onReencryptionTask`.
7. جدولة حذف/أرشفة المفتاح القديم بعد 30 يوماً.
8. تسجيل العملية وإنشاء تنبيه للمسؤولين في حالة الفشل.

هناك أيضاً مجدول دوري للتحقق من جداول التدوير والتنبيهات، ومجدول مستقل لحذف المفاتيح القديمة عند حلول تاريخ الاستحقاق.

## واجهات برمجية مهمة

- توليد مفتاح: `generateKey(type, purpose, strength?)`
- تدوير حسب النوع: `rotateKeys(type)`
- إضافة مهام إعادة التشفير: `onReencryptionTask(type, handler)`
- تقارير الأمان: `generateSecurityReport()`

## مثال استخدام سريع

```ts
import { KeyType, keyRotationManager } from '../utils/keyRotationManager';

// تسجيل مهمة إعادة تشفير لملفات المرفقات
keyRotationManager.onReencryptionTask(KeyType.FILE_ENCRYPTION, async ({ oldKeyId, newKeyId }) => {
  console.log('بدء إعادة تشفير الملفات بالمفتاح الجديد', { oldKeyId, newKeyId });
  // TODO: نفّذ إعادة تشفير الملفات/المؤشرات هنا
});

// إنشاء مفتاح ملفّات إن لم يوجد ثم تدويره
(async () => {
  const existing = keyRotationManager.getKeysByType(KeyType.FILE_ENCRYPTION).find(k => k.status === 'active');
  if (!existing) await keyRotationManager.generateKey(KeyType.FILE_ENCRYPTION, 'attachments');
  const result = await keyRotationManager.rotateKeys(KeyType.FILE_ENCRYPTION);
  console.log('نتيجة التدوير:', result);
})();
```

## اعتبارات أمنية

- لا يتم تخزين مادة المفاتيح الخام خارج الذاكرة.
- يتم تغليف المفاتيح التابعة بالمفاتيح الأعلى (KEK) عند التوافر.
- يتم تسجيل جميع عمليات التدوير مع تنبيهات فورية عند الفشل.
- يمكن تكامل التنبيهات مع نظم خارجية لاحقاً (Webhook/Email/SIEM).

***

للتفاصيل التقنية والتكامل مع تشفير الملفات/الحقول، راجع: `utils/envelopeEncryption.ts` و `services/encryptionService.ts`.
