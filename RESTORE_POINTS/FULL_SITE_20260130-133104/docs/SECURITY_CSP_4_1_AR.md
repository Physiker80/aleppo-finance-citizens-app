# سياسة أمان المحتوى (CSP) - القسم 4.1

هذه الوثيقة تشرح آلية نشر سياسة أمان المحتوى (CSP) بشكل تدريجي، مع دعم `nonce` لكل طلب، وكيفية مراقبة المخالفات قبل التفعيل الصارم.

## نظرة عامة
- تم تعطيل CSP المدمجة مع Helmet داخل الخادم لتجنب تضارب الرؤوس.
- يتم تطبيق سياسة CSP مخصصة عبر Middleware يولّد `nonce` لكل طلب ويضعه في الترويسة `X-Content-Security-Policy-Nonce` وكذلك في `res.locals.nonce` للاستخدام عند الحاجة.
- نمطين للتشغيل:
  - Report-Only (افتراضي): مراقبة فقط دون حجب.
  - Enforce: تطبيق صارم وحجب أي موارد مخالفة.

## المتغيرات البيئية
- `CSP_ENABLED`: تفعيل/تعطيل الـ CSP (القيمة: `true`/`false`).
- `CSP_REPORT_ONLY`: تشغيل وضع المراقبة فقط (القيمة: `true`/`false`). عند ضبطها إلى `false` يتم التفعيل الصارم.

أمثلة (PowerShell):
```powershell
$env:CSP_ENABLED="true"
$env:CSP_REPORT_ONLY="true"   # وضع مراقبة فقط
```

## آلية الـ nonce
- يتم توليد `nonce` لكل طلب وإرساله في الترويسة `X-Content-Security-Policy-Nonce`.
- في حال توليد صفحات على الخادم، يمكن استخدام `res.locals.nonce` وإضافتها لعناصر `<script nonce="...">` و`<style nonce="...">`.
- الهدف هو إزالة الاعتماد على `'unsafe-inline'` واستبداله بـ nonce.

## نقاط النهاية الخاصة بالتقارير
- POST `/api/csp-report`: استقبال تقارير المخالفات (التنسيق `application/csp-report`).
- GET `/api/csp-violations`: عرض أحدث المخالفات من الملف `observability/csp-violations.log`.
- تم الإبقاء على المسار القديم `/csp-violation` للتوافق الخلفي.

## خطة النشر التدريجي
1) تفعيل Report-Only:
   - ضبط `CSP_ENABLED=true` و`CSP_REPORT_ONLY=true`.
   - مراقبة التقارير عبر `/api/csp-violations` وتحليل الموارد المخالفة.
2) إصلاح المخالفات:
   - إضافة `nonce` لكل سكربت/نمط مضمّن أو نقل الأكواد إلى ملفات خارجية.
   - إزالة استخدام `'unsafe-inline'` تدريجياً.
3) التحويل إلى Enforce:
   - ضبط `CSP_REPORT_ONLY=false` لبدء التطبيق الصارم.
   - الإبقاء على المراقبة وتحسين السياسة حسب الحاجة.

## ملاحظات بيئة التطوير
- في وضع التطوير، يتم السماح بالاتصالات `ws://` و`wss://` للـ HMR الخاصة بـ Vite بالإضافة إلى `unsafe-eval` عند الحاجة.
- في وضع الإنتاج (Enforce)، يتم استخدام سياسة أكثر صرامة مع `'strict-dynamic'` للاعتماد على السكربتات الموثوقة فقط.

## استكشاف الأخطاء
- عند حظر مورد، راجع ترويسة `Content-Security-Policy(-Report-Only)` لمعرفة التعليمات الفعّالة.
- راجع `/api/csp-violations` لمعرفة تفاصيل `violated-directive` و`blocked-uri`، ثم حدّث السياسة أو الأكواد تبعاً لذلك.
