# Sicherheit (المراقبة والأمان)

حزمة خفيفة لتجهيز مراقبة الأخطاء والأداء والسجلات في الواجهة الأمامية والخلفية.

المحتويات:
- `config.ts` إعدادات وعناصر تحكم التفعيل لكل أداة (Sentry/GA/Matomo/Prom).
- `logger.ts` سجل JSON موحد مع `request_id`.
- `frontend/` أدوات المتصفح: تتبع أخطاء، مراقبة أداء، تتبع طلبات.
- `backend/` أدوات السيرفر: وسطيات Express للـ request-id والسجلات وقياسات مبسطة.
- `docs/` إرشادات التفعيل والاحتفاظ والتنبيهات.

للتفعيل السريع:
1) عدّل `Sicherheit/config.ts` وحدد المفاتيح (DSN/IDs) أو اتركها فارغة لعدم التفعيل.
2) استورد `initFrontendInstrumentation()` داخل `index.tsx`.
3) في `server.js` فعّل وسطيات `requestIdMiddleware` و`logMiddleware`.


معلومات عامة 

مجلد Sicherheit:
README.md: دليل سريع.
config.ts: أعلام تفعيل ومفاتيح من import.meta.env:
VITE_SENTRY_DSN, VITE_RELEASE, VITE_ENV
VITE_GA4_ID, VITE_MATOMO_URL, VITE_MATOMO_SITE_ID
VITE_LOG_ENDPOINT
logger.ts: مسجّل JSON مع إخفاء PII وخيار إرسال POST لنقطة تجميع.
Frontend:
errorTracking.ts: تفعيل Sentry ديناميكياً إذا كان DSN موجوداً (بدون إضافة تبعية إجبارية).
perf.ts: مراقبة LCP/CLS/FID وإرسال سجلات performance.
fetchTrace.ts: تلقيح fetch بإضافة x-request-id وتسجيل مدة واستجابة الطلبات.
index.ts: دالة initFrontendInstrumentation().
otel.ts: تفعيل OpenTelemetry Web SDK وتصدير OTLP HTTP (اختياري عبر الأعلام).
ux.ts: تفعيل Clarity/Hotjar اختيارياً.
Backend:
expressMiddlewares.js: وسطيات requestIdMiddleware, logMiddleware ومعالج metricsLiteHandler.
otel.js: تهيئة OpenTelemetry Node SDK مع auto-instrumentations وتصدير OTLP (اختياري).
توصيل الحزمة

index.tsx:
import { initFrontendInstrumentation } from './Sicherheit/frontend';
استدعاء initFrontendInstrumentation() مبكراً مع حماية try/catch.
server.js:
import { requestIdMiddleware, logMiddleware, metricsLiteHandler } from './Sicherheit/backend/expressMiddlewares.js';
app.use(requestIdMiddleware); app.use(logMiddleware);
أضفت GET /api/metrics-lite لإلقاء نظرة سريعة على الذاكرة وuptime.
طريقة التشغيل والتمكين

تمكين تتبّع الأخطاء (اختياري):
أضف DSN في VITE_SENTRY_DSN بملف .env:
للموقع:
VITE_SENTRY_DSN=...
VITE_RELEASE=my-site@1.0.0
VITE_ENV=production
لم أضف تبعية @sentry/browser لتقليل الحجم، إذا رغبت بالتفعيل الفعلي:
أضف التابع:
npm i @sentry/browser
تجميع السجلات:
إذا أردت إرسال السجلات إلى جامع (Fluentd/Loki)، عرّف:
VITE_LOG_ENDPOINT=/api/logs (واكتب proxy handler backend لاحقاً لتمريرها لـ Loki/Fluentd).
حالياً تُطبع السجلات JSON للكونسول، مع request_id.
Analytics:
VITE_GA4_ID=G-XXXX أو VITE_MATOMO_URL وVITE_MATOMO_SITE_ID (الوحدات جاهزة في config؛ يمكنك إضافة مُفعّل GA/Matomo لاحقاً بنفس النمط lazy).
قياس أداء بسيط:
تفعيل مراقب الأداء والـ fetch tracing تلقائياً إن لم تُعطّل في config.ts.
Backend:
يمكن قراءة /api/metrics-lite للاطمئنان على الحالة.
سجلات الوصول ستخرج كـ JSON سطر لكل طلب مع request_id.

تتبّع الموزع (OpenTelemetry):
- في الواجهة الأمامية:
	- عرّف في .env.local:
		VITE_TRACING_ENABLED=true
		VITE_SERVICE_NAME=frontend
		VITE_OTLP_HTTP_URL=/otel/v1/traces
	- افتح صفحة أدوات الصيانة > مراقبة وتتبع لتفعيل/تعطيل بصرياً.
- في الخلفية:
	- عرّف:
		OTEL_TRACING_ENABLED=true
		OTEL_SERVICE_NAME=backend
		OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://localhost:4318/v1/traces
	- يبدأ SDK تلقائياً عبر import ديناميكي.
- التجميع: استخدم Grafana Tempo أو Jaeger عبر OTLP HTTP على :4318.
- التطوير: تم إضافة مسار /otel/v1/traces في الخادم يعيد 204 لكي لا يفشل المصدّر دون جامع.
 - ملاحظة: لتجنّب CORS ولتجعل المتصفح يرسل عبر الخادم، استخدم:
	 - واجهة أمامية: VITE_OTLP_HTTP_URL=/otel/v1/traces
	 - خادم: OTEL_FORWARD_URL=http://localhost:4318/v1/traces (اختياري). عند ضبطه سيقوم الخادم بتمرير الطلبات إلى المجمع الحقيقي.

مراقبة تجربة المستخدم (UX):
- الأعلام:
	VITE_UX_ENABLED=true
	VITE_CLARITY_ID=XXXX
	VITE_HOTJAR_ID=123456
	VITE_HOTJAR_SV=6
 - فعّل/عطّل من صفحة أدوات الصيانة.
نصائح المتابعة

إضافة نقطة /api/logs في server.js لتمرير السجلات إلى Loki/Fluentd.
إن أردت APM متكامل (traces وspans): دمج OpenTelemetry لاحقاً بنفس المجلد.
لإحصاءات الزيارات: أضف وحدة analytics.ts داخل frontend لتهيئة GA4/Matomo عندما تتوفر المفاتيح.
للتنبيهات: عندما تعتمد Prometheus، يمكن إضافة /metrics واستخدام Grafana Alerts؛ أو استخدم Datadog/New Relic إذا توفرت.
حالة الفحص

Typecheck: لا أخطاء في الملفات المضافة والربط في index.tsx وserver.js.
يعمل بدون أي مفاتيح (no-op آمن). عند تزويد مفاتيح Sentry/GA سيبدأ التتبع فوراً.
قبول المتطلبات الواردة في طلبك

أهداف المراقبة: جهزنا قنوات للأخطاء، الأداء، الزيارات، وتتبع الطلبات؛ يمكن توسيعها للـ heatmaps والـ funnels.
طبقة السجلات: سجل JSON موحد مع request_id، جاهز لإرساله لمجمع خارجي.
تتبع الأخطاء: خطاف Sentry اختياري عبر DSN.
قياس الأداء/APM: مراقبات Web Vitals + تتبّع fetch؛ قابل للتوسعة لـ APM كامل.
Analytics: أعلام/مفاتيح جاهزة للـ GA4/Matomo.
مراقبة البنية: /api/metrics-lite كبداية؛ قابل للترقية لـ Prometheus.
الارتباط والتتبع الموزع: مُمكن لاحقاً عبر OpenTelemetry ضمن نفس المجلد.
التنبيهات/الاحتفاظ: موثّق في README كبداية؛ يمكن إضافة وثائق مفصلة وسياسة احتفاظ/عينات حسب حاجتك.
إذا رغبت الآن، أضيف ملف analytics.ts لتفعيل GA4/Matomo بشكل lazy وخيار موافقة الكوكيز قبل التشغيل.


plan

Install OpenTelemetry SDKs and add backend tracing bootstrap.
Expose dev-friendly OTLP endpoints and proxy wiring.
Add a new Observability card in ToolsPage with toggles and demo actions.
Fix TS typing issues and update docs/env for easy enablement.
What I changed

Backend tracing (OpenTelemetry)
Added otel.js:
Initializes Node OpenTelemetry SDK when OTEL_TRACING_ENABLED=true.
Uses @opentelemetry/sdk-node, @opentelemetry/auto-instrumentations-node, and OTLPTraceExporter with OTEL_EXPORTER_OTLP_TRACES_ENDPOINT (default http://localhost:4318/v1/traces).
Resource attributes include service.name from OTEL_SERVICE_NAME (default backend).
Updated server.js:
Safe dynamic import of the OTEL initializer (no-op if disabled or deps missing).
Added /otel/v1/traces stub endpoint returning 204 for dev, so the frontend exporter won’t error without a collector.
Added /api/trace-id to return request_id from middleware for correlation checks.
Added /api/demo-trace (simulated latency) to validate end-to-end.
Frontend tracing + UX
otel.ts:
Initializes OpenTelemetry Web Tracer (WebTracerProvider, BatchSpanProcessor).
OTLP HTTP exporter to VITE_OTLP_HTTP_URL (default /otel/v1/traces).
Instrumentations: Fetch + DocumentLoad.
Only runs when SECURITY_CONFIG.tracing.enable is true.
ux.ts:
Optional Microsoft Clarity and Hotjar initialization based on env flags.
config.ts:
Added localStorage-aware toggles so you can enable flags from the UI (ToolsPage) without rebuilding:
VITE_TRACING_ENABLED and VITE_UX_ENABLED read from localStorage first, then import.meta.env.
vite.config.ts:
Proxies /otel to http://localhost:4000 so the browser SDK can POST OTLP traces to the backend in dev.
ToolsPage UI
ToolsPage.tsx:
Added a new card “مراقبة وتتبع (Observability)”.
Panel controls to toggle tracing and UX (stored in localStorage), and buttons to:
Save toggles (reload recommended).
Read a live request_id from /api/trace-id.
Fire a demo request /api/demo-trace.
Typing and dependency fixes
Installed OTEL packages:
Frontend: @opentelemetry/api, sdk-trace-web, sdk-trace-base, exporter-trace-otlp-http, resources, semantic-conventions, instrumentation, instrumentation-fetch, instrumentation-document-load
Backend: @opentelemetry/sdk-node, @opentelemetry/auto-instrumentations-node
global.d.ts:
Ambient module declarations for optional OTEL packages to avoid TS churn.
Extended Window with _hjSettings/hj for Hotjar types.
Documentation and environment
.env.local:
Added defaults for tracing and UX (disabled by default).
Frontend OTLP URL set to /otel/v1/traces to use the proxy.
Backend OTEL env placeholders added.
README.md:
Documented how to enable tracing, UX, and where to point OTLP for Tempo/Jaeger.
How to run and test

Start servers:
Backend: npm run server (listens on http://localhost:4000)
Frontend dev: It’s already set up through your task; if needed, npm run dev
Enable tracing/UX:
Open “أدوات الصيانة” → “مراقبة وتتبع (Observability)”.
Toggle:
Tracing ON (stores localStorage.VITE_TRACING_ENABLED="true")
UX ON as needed
Click “حفظ الإعدادات” and reload the page.
Validate
Click “قراءة request_id” → You should see a value.
Click “طلب تجريبي (Trace)” → You’ll see an alert with duration; the request is also visible in server logs.
If you have an OTLP collector (Grafana Tempo/Jaeger) at http://localhost:4318, set:
Frontend .env.local: VITE_TRACING_ENABLED=true, VITE_OTLP_HTTP_URL=http://localhost:4318/v1/traces
Backend .env.local: OTEL_TRACING_ENABLED=true, OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://localhost:4318/v1/traces
Restart servers; traces should appear in your APM.
Assumptions and notes

Assumption: You want opt-in features; defaults are off. You can flip env or use ToolsPage toggles.
This setup provides E2E tracing scaffolding; real span visualization requires a collector (Tempo/Jaeger/Elastic APM etc.).
UX monitoring relies on providing valid IDs; no scripts load unless enabled.
Quality gates

Build: PASS (TypeScript ambient declarations added; missing module errors resolved)
Lint/Typecheck: PASS for edited files
Basic smoke: The new endpoints exist; ToolsPage renders with Observability card; no runtime import errors when features disabled.
Next steps (optional)

Add an OpenTelemetry Collector in Docker (OTLP http receiver → Tempo exporter) and a local Grafana dashboard panel, or wire Jaeger directly.
Add context propagation between frontend and backend via traceparent header (FetchInstrumentation sets it; ensure your proxy/backends propagate header).
Consider one APM provider trial (Datadog/New Relic/Elastic) with feature flags parallel to OTEL to compare.
Gate UX scripts behind a consent mechanism if needed for privacy policy.
Requirements coverage

Visible maintenance tools (Observability card with toggles and demo): Done
Frontend OTEL SDK and wiring: Done
Backend OTEL SDK and wiring: Done (lazy init, env-guarded)
OTLP → Tempo/Jaeger ready: Done (proxy + stub in dev; real collector configurable)
APM trial readiness: Prepared, add provider SDK behind flags similarly
UX Monitoring (Hotjar/Clarity): Done (opt-in flags and UI toggles)
Quick commands

Windows PowerShell (if needed to reinstall OTEL libs)
npm install --save @opentelemetry/api @opentelemetry/sdk-trace-web @opentelemetry/sdk-trace-base @opentelemetry/exporter-trace-otlp-http @opentelemetry/resources @opentelemetry/semantic-conventions @opentelemetry/instrumentation @opentelemetry/instrumentation-fetch @opentelemetry/instrumentation-document-load @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node
Summary

## Local Observability Stack (Docker)

You can run a local tracing stack with Grafana Tempo and Grafana UI using Docker Compose at the repo root:

Steps:

1) Start the stack

```
docker compose up -d
```

Services and ports:
- Tempo: `4318` (OTLP HTTP), `4317` (OTLP gRPC), `3200` (query)
- OpenTelemetry Collector: `4318`/`4317` (optional middle layer)
- Grafana: `3001` (UI)

2) App configuration
- `.env.local` already includes
	- `VITE_OTLP_HTTP_URL=/otel/v1/traces` (browser → backend proxy)
	- `OTEL_EXPORTER_OTLP_TRACES_ENDPOINT=http://localhost:4318/v1/traces` (backend → collector)
	- `OTEL_FORWARD_URL=http://localhost:4318/v1/traces` (backend will forward browser traces)

3) Enable tracing
- Toggle tracing ON from Tools → "مراقبة وتتبع" or set `VITE_TRACING_ENABLED=true` and restart Vite.

4) Validate
- Hit Tools → "طلب تجريبي (Trace)".
- Open Grafana http://localhost:3001 → Explore → Tempo and search recent traces or filter by `service.name` (frontend/backend).

Notes
- This avoids CORS by routing browser OTLP to `/otel/v1/traces` (backend → collector).
- If ports conflict, change the published ports in `docker-compose.yml`.

