# مديرية مالية حلب - نظام الاستعلامات والشكاوى

## تشغيل التطبيق على أندرويد (Capacitor)

### المتطلبات
- Android Studio + Android SDK
- Java JDK 17 أو 21
- جهاز حقيقي مع USB Debugging أو محاكي Android

### وضع التطوير عبر server.url (موصى به)
1) شغّل Vite على منفذ 5175:
```powershell
npm run dev -- --port 5175
```
2) شغّل التطبيق على أندرويد باستخدام server.url:
```powershell
npm run cap:sync:dev
npm run android:dev:url
```
- يمكنك تحديد URL صريح بدل الاكتشاف التلقائي:
```powershell
$env:CAP_SERVER_URL="http://<LAN-IP>:5175"
npm run cap:sync
npx cap run android
```

### وضع التطوير عبر external (بدون server.url)
```powershell
npm run dev -- --port 5175
npm run android:dev:external
```

### تشغيل إنتاجي داخل التطبيق (بدون Live Reload)
```powershell
npm run build
npm run cap:sync
npm run android:run
```

### بناء APK/AAB وتوقيعه (إصدار)
1) توليد keystore (مرة واحدة):
```powershell
keytool -genkey -v -keystore release.keystore -alias aleppo -keyalg RSA -keysize 2048 -validity 10000
```
2) إضافة إعدادات التوقيع (من Android Studio أسهل)، أو تعديل `android/app/build.gradle` لإضافة signingConfigs وربطها بـ release.
3) بناء عبر Gradle (سطر أوامر):
```powershell
npm run gradle:assembleRelease   # APK
npm run gradle:bundleRelease     # AAB
```
ستجد المخرجات في:
- APK: `android/app/build/outputs/apk/release/`
- AAB: `android/app/build/outputs/bundle/release/`

### ملاحظات الشبكة
- تأكد أن الهاتف والكمبيوتر على نفس الشبكة عند التطوير.
- افتح المنفذ 5175 في جدار الحماية على ويندوز.
- البروكسي في `vite.config.ts` يعيد توجيه `/api` إلى `http://localhost:4000` أثناء التطوير في المتصفح. داخل WebView على جهاز حقيقي قد تحتاج لاستخدام IP للكمبيوتر بدل `localhost`.

### ملاحظة خاصة بويندوز (مسار المشروع غير ASCII)
- إذا ظهر خطأ Gradle بشأن Non-ASCII path، فقد تم تجاوز المشكلة بإضافة:
```
android.overridePathCheck=true
```
داخل الملف `android/gradle.properties`.

<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1b4MJ3VbGRR3eQ0GqHsMLE0Yp2-LcJXHj

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

### Arabic PDF Font (Fustat) Support

For correct Arabic rendering inside generated PDFs (workflow diagram export, individual document PDF, and statistics report) the system now embeds the Fustat font at runtime.

Steps:
1. Place the font file `Fustat-Regular.ttf` in `public/fonts/` so it is served at `/fonts/Fustat-Regular.ttf`.
2. The helper `ensureFustatRegistered()` (in `utils/pdfFonts.ts`) fetches and registers the font with jsPDF (adds to VFS and calls `addFont`).
3. For html2canvas based PDFs we also inject an `@font-face` rule into the DOM before capturing to ensure proper glyph shaping in the rasterized canvas, then we set the jsPDF font to `Fustat`.
4. If the font file is missing or the fetch fails, the code logs a warning and falls back silently to a default font (which may display broken Arabic shaping). Add the font to avoid this.

Optional Enhancements (not yet implemented):
- Add `Fustat-Bold.ttf` and register it with `addFont(..., 'Fustat', 'bold')` for richer headings.
- Display a UI toast if the font fails to load instead of only logging to console.

Testing:
- Open DevTools Network tab, trigger a PDF export, confirm `Fustat-Regular.ttf` returns 200.
- Generated PDF metadata should list `Fustat` among embedded fonts (can be inspected with external PDF utilities).

Troubleshooting:
- If Arabic still appears disconnected, clear cache and hard reload (Ctrl+F5) to ensure updated font file is fetched.
- Ensure no service worker is serving a stale cached version of the font.

### Refactor Notes (2025-09)

Core Diwan document list logic was extracted into `utils/documentHelpers.ts` for maintainability and reuse.

Provided utilities:

Enhancements to `ErrorBoundary`:

Benefits:
1. Separation of concerns – UI vs business logic.
2. Easier future unit testing of pure functions.
3. One source of truth for export/statistics reduces drift and silent inconsistencies.

Suggested next steps (not yet implemented):

### Experimental: Backend Ticket Creation Flag

Set `VITE_USE_BACKEND_TICKETS=true` in a Vite environment file (e.g. `.env.local`) to enable early integration with the Node/Prisma backend for creating tickets.

Current behavior when enabled:
1. On mount the app calls `/api/auth/me` to detect an existing session and `/api/departments` to fetch active departments.
2. New ticket submissions send a POST to `/api/tickets` (optimistic UI inserts a temporary `TEMP-*` ticket which is replaced by the backend ID on success or removed on failure).
3. Legacy localStorage ticket handling (status updates, notifications) still operates on a mirrored in-memory copy for continuity during migration.

Limitations (will be addressed in later iterations):
- Department selection is provisional (first active department chosen automatically).
- File attachments remain session‑only (not persisted in backend).
- No user-facing error feedback yet if the backend create fails (optimistic ticket simply disappears).
- Authentication gracefully falls back to the prior local credentials if backend is unreachable.

Disable by removing the flag or setting it to `false` (zero migration effort; local flow resumes immediately).

### Toast Notifications & API Client (2025-09)

Added a lightweight toast system (temporary messages bottom-center) and a unified `apiFetch` wrapper:

Usage (inside components with context):
```ts
const ctx = useContext(AppContext);
ctx?.addToast?.({ message: 'تم الحفظ', type: 'success' });
```

API Wrapper (`utils/apiClient.ts`):
```ts
import { apiFetch } from '@/utils/apiClient';
const data = await apiFetch('/api/tickets', { method: 'POST', body: { departmentId, type: 'استعلام' } });
```
Features:
- Auto JSON serialize body objects.
- Automatic 401 retry after invoking `refreshSession` once.
- Throws structured error (status + payload) for consistent handling.
- Non-intrusive; falls back silently if not used.

Planned enhancements:
- Queue deduplication.
- Optional persistent (non-auto-dismiss) variant for long operations.
- Accessibility live region (ARIA) announcement.

### Backend Ticket Status Sync (2025-09)

When `VITE_USE_BACKEND_TICKETS=true`, status changes now optimistically update the UI then call:

`PATCH /api/tickets/:id/status  { status: "NEW" | "IN_PROGRESS" | "ANSWERED" | "CLOSED" }`

Mapping:
| Arabic UI | Backend Code |
|-----------|--------------|
| جديد | NEW |
| قيد المعالجة | IN_PROGRESS |
| تم الرد | ANSWERED |
| مغلق | CLOSED |

Failure Handling:
1. Local state is reverted if the API call fails.
2. A toast (type=error) is shown.

Audit & History:
- Endpoint writes a `TicketHistory` entry (STATUS_CHANGE) and an `AuditLog` hash-chain node for tamper evidence.

Future Work:
- Sync response text & attachments through backend.
- Batch status transitions with bulk endpoint.
- Enforce role-based constraints on certain transitions.

### Backend Ticket Response Sync (2025-09)

Implemented endpoint: `PATCH /api/tickets/:id/response` (now persists `responseText` in Ticket table as `responseText`).

Frontend Flow (Optimistic):
1. `updateTicketResponse(id, text, files?)` updates local ticket response and (if not already) marks status ANSWERED immediately.
2. Sends PATCH with payload:
```json
{
   "responseText": "...",
   "markAnswered": true,
   "attachments": [ { "filename": "f.pdf", "mimeType": "application/pdf", "sizeBytes": 1234 } ]
}
```
3. Success: toast (success) retained optimistic state.
4. Failure: revert to previous ticket object + toast (error).

Server Behavior:
- Transaction: fetch ticket -> update status (if requested) & store trimmed `responseText` (max 8000 chars) -> create TicketHistory (action=RESPONSE) -> create Attachment rows (metadata only, max 10) -> append AuditLog (stores preview first 200 chars).
- Returns `{ ok: true, ticket: { id, status, responseText } }`.

Limitations / Next Steps:
- Actual file upload storage not implemented (metadata only).
- Response text now stored (single latest) in `Ticket.responseText`; future model may introduce a `TicketResponse` table for multi-thread.
- Validation on length / attachment size minimal; add quotas & sanitization later.
- Potential future email / SMS notification to citizen when a response is recorded.

Security & Integrity:
- AuditLog entry (`ticket.response`) chained with SHA-256 over prior hash + JSON payload to provide tamper evidence.
- Attachments metadata intentionally excludes raw content to defer secure storage design decisions (encryption, virus scanning, etc.).

Planned Enhancements:
1. Add persisted response model (e.g. TicketResponse table with author, timestamps).
2. Support multiple responses & internal vs external visibility flags.
3. Integrate secure file upload (multipart) with scanning & signed retrieval URLs.
4. Citizen notification workflow (email / OTP-based SMS / portal inbox).
5. Redaction layer for sensitive personal data inside responses.

### Multi-Response Model (Implemented)

New Prisma model `TicketResponse` enables multiple chronological responses per ticket.

Schema Highlights:
```
model TicketResponse {
  id             String  @id @default(cuid())
  ticketId       String
  authorEmployeeId String?
  body           String            // raw original (kept for integrity)
  bodySanitized  String?           // sanitized/HTML filtered version displayed
  isInternal     Boolean @default(false)
  visibility     String  @default("PUBLIC")  // PUBLIC | INTERNAL | CONFIDENTIAL (future)
  redactionFlags String? // JSON array of applied redaction rules
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  attachments    Attachment[]
}
```

Attachments extended with:
```
ticketResponseId String?
storagePath      String?
```

Ticket extended with `citizenEmail` for notification, plus legacy single `responseText` (still used for quick answer; future removal possible).

### Endpoints
1. `POST /api/tickets/:id/responses` (multipart)
   - Fields: `body` (text), `isInternal` (optional bool), files under key `files`.
   - Creates `TicketResponse`, sanitizes + redacts PII (national IDs, emails, phone patterns) and stores preview in audit log.
   - Attachments stored as metadata only (`memory://` placeholder path) – no persistent binary yet.
2. `GET /api/tickets/:id/responses`
   - Returns public responses for anonymous users.
   - Authenticated employees receive all responses (including `INTERNAL`).

### Frontend Integration (Multi-Responses)

Frontend context (`AppContext`) now exposes the following (only meaningful when `VITE_USE_BACKEND_TICKETS=true`):

```ts
interface AppContextType {
   ticketResponses?: Record<string, TicketResponseRecord[]>;
   fetchTicketResponses?: (ticketId: string, force?: boolean) => Promise<TicketResponseRecord[]>;
   addTicketResponse?: (ticketId: string, input: NewTicketResponseInput) => Promise<TicketResponseRecord | null>;
}

interface NewTicketResponseInput {
   body: string;           // required text
   isInternal?: boolean;   // mark response as INTERNAL (not visible to citizen)
   files?: File[];         // optional attachments (multipart)
}
```

Usage pattern inside a component (simplified):

```tsx
const app = useContext(AppContext);
const [responses, setResponses] = useState<TicketResponseRecord[]>([]);

useEffect(() => {
   if (app?.fetchTicketResponses) {
      app.fetchTicketResponses(ticketId).then(setResponses);
   }
}, [ticketId]);

async function submitResponse() {
   if (!app?.addTicketResponse) return;
   const created = await app.addTicketResponse(ticketId, { body: draft, isInternal, files });
   if (created) {
      // Optimistic list already updated; you can read updated list from app.ticketResponses[ticketId]
   }
}
```

Optimistic UI:
1. A temporary response with id starting `temp-...` is appended immediately.
2. Replaced with the definitive backend response once the request succeeds.
3. On failure the temporary entry is removed and an error toast is shown.

Auto-status transition: First successful public (non-internal) response automatically moves the ticket status to `تم الرد` (Answered) if it was `جديد` or `قيد المعالجة`.

Security / Redaction:
* The UI renders `bodySanitized` directly (`dangerouslySetInnerHTML`) which already passed backend sanitization & redaction.
* A badge “تم حجب بيانات” appears if any redaction flags were applied.

Visibility Badges:
* `INTERNAL` responses display a yellow/amber badge and are hidden from anonymous users (citizen tracking page).

Attachments:
* Currently only metadata is stored; persistence/downloading will be implemented in a future storage layer.

Feature Flag Fallback:
* If `VITE_USE_BACKEND_TICKETS` is `false`, add/fetch functions become no-ops and a toast informs the user that backend integration is required.


### Redaction & Sanitization
PII Patterns masked:
| Pattern | Replacement |
|---------|-------------|
| 11-digit national ID | [[REDACTED_NID]] |
| Email addresses | [[REDACTED_EMAIL]] |
| Phone-like sequences | [[REDACTED_PHONE]] |

Sanitization uses `sanitize-html` allow‑listing basic formatting tags (`b,i,u,strong,em,br,p,ul,ol,li,span`).

### Upload Constraints
Environment variables:
```
UPLOAD_MAX_BYTES=2000000          # ~2MB per file
UPLOAD_MAX_COUNT=5                # max files per response
UPLOAD_MIME_ALLOW=image/png,image/jpeg,application/pdf,text/plain
```

### Notifications (Stub)
If `citizenEmail` is present and SMTP configured, a future enhancement will send an email upon response creation (stub hook present).

### Audit & Integrity
Each added response writes an `AuditLog` entry with `ticket.response.add` action and SHA-256 hash chaining including a 200-char sanitized preview (avoids storing full sensitive content in chain while preserving tamper detection over summary).

### Future Roadmap
- Binary storage (disk/S3) with antivirus scanning & checksum.
- Signed download endpoints with authorization checks.
- CONFIDENTIAL visibility with stricter access roles.
- Citizen email/SMS notifications fully implemented.
- Search & indexing over sanitized response bodies.

---

## 🚀 التحسينات الشاملة للنظام (يناير 2026)

تم تنفيذ 40 تحسيناً شاملاً للنظام مقسمة إلى 8 فئات رئيسية:

### 1️⃣ تحسينات واجهة المستخدم (UX/UI)

| الملف | الوصف | الميزات الرئيسية |
|-------|-------|------------------|
| `utils/autoTheme.ts` | الوضع الداكن/الفاتح التلقائي | كشف تفضيلات النظام، جدولة زمنية، حفظ التفضيلات |
| `utils/animations.ts` | تأثيرات حركية سلسة | Fade, Slide, Scale, CSS Keyframes، تحكم بالسرعة |
| `utils/enhancedToast.ts` | إشعارات محسنة | أنواع متعددة، قائمة انتظار، Progress، Actions |
| `utils/customDashboard.ts` | لوحة تحكم قابلة للتخصيص | Widgets، Drag & Drop، تخطيطات متعددة، تصدير/استيراد |
| `utils/colorCustomization.ts` | تخصيص الألوان | ثيمات جاهزة، تخصيص كامل، CSS Variables |

### 2️⃣ تحسينات التقارير والتحليلات

| الملف | الوصف | الميزات الرئيسية |
|-------|-------|------------------|
| `utils/advancedExcel.ts` | تصدير Excel متقدم | تنسيق الخلايا، رؤوس ملونة، عرض تلقائي، Base64 |
| `utils/interactiveCharts.ts` | رسوم بيانية تفاعلية | Bar, Line, Pie, Doughnut، تحديث مباشر، Legends |
| `utils/scheduledReports.ts` | تقارير مجدولة | يومي/أسبوعي/شهري، تنفيذ تلقائي، سجل التنفيذ |
| `utils/adminDashboard.ts` | لوحة تحكم المدير | KPIs، مقارنات، تنبيهات، نظرة عامة شاملة |
| `utils/performanceTracking.ts` | تتبع الأداء | مقاييس الموظفين، SLA، تقييم الأداء |

### 3️⃣ تحسينات الأمان

| الملف | الوصف | الميزات الرئيسية |
|-------|-------|------------------|
| `utils/auditLog.ts` | سجل التدقيق | تسجيل كل العمليات، تصفية، تصدير، تنظيف تلقائي |
| `utils/accountLocking.ts` | قفل الحسابات | حد المحاولات، فترة القفل، فتح يدوي، تنبيهات |
| `utils/encryption.ts` | التشفير | AES-GCM، PBKDF2، تشفير البيانات الحساسة |
| `utils/passwordPolicy.ts` | سياسة كلمات المرور | قوة كلمة المرور، انتهاء الصلاحية، تاريخ الكلمات |
| `utils/twoFactorAuth.ts` | المصادقة الثنائية | TOTP، رموز احتياطية، QR Code، تطبيقات Authenticator |

### 4️⃣ تحسينات الجوال

| الملف | الوصف | الميزات الرئيسية |
|-------|-------|------------------|
| `utils/touchGestures.ts` | الإيماءات اللمسية | Swipe، Pinch، Long Press، Multi-touch |
| `utils/firebasePush.ts` | إشعارات Firebase | FCM، اشتراك بالمواضيع، إشعارات مخصصة |
| `utils/offlineSync.ts` | المزامنة دون اتصال | قائمة انتظار، مزامنة تلقائية، حل التعارضات |
| `utils/mobileShortcuts.ts` | اختصارات الجوال | App Shortcuts، Quick Actions، إضافة للشاشة الرئيسية |
| `utils/qrScanner.ts` | ماسح QR | كاميرا مباشرة، مسح الصور، توليد QR |

### 5️⃣ تحسينات الذكاء الاصطناعي

| الملف | الوصف | الميزات الرئيسية |
|-------|-------|------------------|
| `utils/aiClassification.ts` | التصنيف التلقائي | تصنيف حسب الكلمات المفتاحية، تعلم من التغذية الراجعة |
| `utils/aiResponseSuggestions.ts` | اقتراحات الردود | قوالب ذكية، إكمال تلقائي، تعديل النبرة |
| `utils/duplicateDetection.ts` | كشف المكرر | Jaccard، Levenshtein، N-grams، دمج الشكاوى |
| `utils/sentimentAnalysis.ts` | تحليل المشاعر | قاموس عربي، كشف المشاعر، درجة الإلحاح |
| `utils/aiChatbot.ts` | روبوت المحادثة | كشف النوايا، محادثات متعددة الخطوات، ردود سريعة |

### 6️⃣ تحسينات إدارة الشكاوى

| الملف | الوصف | الميزات الرئيسية |
|-------|-------|------------------|
| `utils/ticketTemplates.ts` | قوالب الشكاوى | 5 قوالب افتراضية، تخصيص، تصدير/استيراد |
| `utils/recurringTickets.ts` | الشكاوى المتكررة | جدولة دورية، حد التنفيذ، سجل التشغيل |
| `utils/linkedTickets.ts` | ربط الشكاوى | علاقات متعددة، Parent/Child، Blocking |
| `utils/priorityQueue.ts` | قائمة الأولويات | SLA، تصعيد تلقائي، خوارزمية الترتيب |
| `utils/autoAssignment.ts` | التعيين التلقائي | Round-robin، Least-loaded، Skill-based |

### 7️⃣ تحسينات التكامل

| الملف | الوصف | الميزات الرئيسية |
|-------|-------|------------------|
| `utils/smsGateway.ts` | بوابة SMS | إرسال الرسائل، قوالب، التحقق بالرمز |
| `utils/whatsappIntegration.ts` | تكامل واتساب | رسائل القوالب، أزرار تفاعلية، محادثات |
| `utils/apiGateway.ts` | بوابة API | REST API، عملاء، صلاحيات، Rate Limiting |
| `utils/ssoIntegration.ts` | تسجيل الدخول الموحد | Azure AD، Google، SAML، LDAP |
| `utils/archiveSystem.ts` | نظام الأرشفة | أرشفة تلقائية، استرجاع، وسوم، تصدير |

### 8️⃣ تحسينات الأداء

| الملف | الوصف | الميزات الرئيسية |
|-------|-------|------------------|
| `utils/virtualScrolling.ts` | التمرير الافتراضي | قوائم طويلة، Infinite Scroll، Grid |
| `utils/imageOptimization.ts` | تحسين الصور | ضغط، تحويل WebP، Lazy Loading، Thumbnails |
| `utils/databaseIndexing.ts` | فهرسة البيانات | فهارس مخصصة، بحث سريع، تحليل الأداء |
| `utils/cdnIntegration.ts` | تكامل CDN | تخزين مؤقت، Prefetch، تحسين الأصول |
| `utils/webWorkers.ts` | معالجة الخلفية | مهام متوازية، قائمة أولويات، Batch Processing |

---

### 📊 إحصائيات التحسينات

| الفئة | عدد الملفات | الوظائف الرئيسية |
|-------|-------------|------------------|
| واجهة المستخدم | 5 | تجربة مستخدم محسنة |
| التقارير | 5 | تحليلات متقدمة |
| الأمان | 5 | حماية شاملة |
| الجوال | 5 | دعم متكامل |
| الذكاء الاصطناعي | 5 | أتمتة ذكية |
| إدارة الشكاوى | 5 | سير عمل متقدم |
| التكامل | 5 | ربط خارجي |
| الأداء | 5 | سرعة وكفاءة |
| **المجموع** | **40** | **نظام متكامل** |

---

### 🔧 طريقة الاستخدام

كل وحدة (utility) مستقلة ويمكن استيرادها واستخدامها:

```typescript
// مثال: استخدام التشفير
import { encrypt, decrypt } from './utils/encryption';

const encrypted = await encrypt('بيانات سرية', 'مفتاح');
const decrypted = await decrypt(encrypted.ciphertext, 'مفتاح', encrypted.iv);

// مثال: استخدام تحليل المشاعر
import { analyzeSentiment } from './utils/sentimentAnalysis';

const result = analyzeSentiment('أنا سعيد جداً بالخدمة');
console.log(result.sentiment); // 'positive'

// مثال: استخدام Virtual Scrolling
import { createVirtualScroller } from './utils/virtualScrolling';

const scroller = createVirtualScroller(items, { itemHeight: 60 });
```

---

### 📝 ملاحظات التطوير

- جميع الوحدات تستخدم TypeScript مع أنواع بيانات محددة
- الدعم الكامل للغة العربية في جميع الوظائف
- التخزين المحلي (localStorage) للحفاظ على الإعدادات
- متوافق مع React 19 و Vite 6
- جاهز للتكامل مع Capacitor للجوال
