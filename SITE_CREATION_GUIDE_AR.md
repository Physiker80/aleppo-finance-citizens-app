# دليل إنشاء نظام استعلامات وشكاوي مديرية مالية حلب - خطوة بخطوة

هذا المستند يشرح بالتفصيل كيفية بناء النظام من الصفر حتى النشر، بناءً على المعمارية المستخدمة في المشروع الحالي.

## المتطلبات الأساسية
- Node.js (الإصدار 18 أو أحدث)
- محرر الأكواد VS Code
- Git

---

## المرحلة 1: تهيئة المشروع وبيئة العمل

### 1. إنشاء مشروع Vite جديد
نستخدم Vite لأنه أسرع وأحدث من Create-React-App.

```bash
npm create vite@latest aleppo-finance-system -- --template react-ts
cd aleppo-finance-system
npm install
```

### 2. تثبيت المكتبات الأساسية
المشروع يعتمد على مجموعة من المكتبات القوية. قم بتثبيتها بالأمر التالي:

```bash
# مكتبات التصميم والأيقونات
npm install tailwindcss postcss autoprefixer react-icons lucide-react

# مكتبات الرسوم والخرائط الذهنية
npm install mermaid @xyflow/react

# مكتبات التعامل مع PDF والملفات
npm install jspdf svg2pdf.js react-pdf xlsx docx mammoth

# مكتبات الأمان والتشفير
npm install bcryptjs argon2 jsonwebtoken helmet otplib

# مكتبات أخرى للخدمات
npm install react-router-dom @capacitor/core framer-motion
```

### 3. إعداد Tailwind CSS
تجهيز إطار العمل الخاص بالتنسيق.

```bash
npx tailwindcss init -p
```

قم بتعديل ملف `tailwind.config.js` لدعم الوضع الليلي (Dark Mode) واللغة العربية (RTL):

```javascript
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#0f3c35', // لون المالية الرئيسي
        secondary: '#ce1126', // أحمر العلم السوري
      },
      fontFamily: {
        sans: ['Fustat', 'Noto Naskh Arabic', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
```

---

## المرحلة 2: هيكلية المشروع (Architecture)

قم بإنشاء المجلدات التالية داخل مجلد `src`:

```
src/
├── components/     # المكونات القابلة لإعادة الاستخدام
│   ├── ui/         # عناصر الواجهة الأساسية (أزرار، حقول إدخال)
│   └── layout/     # الهيدر والفوتر والقوائم
├── pages/          # صفحات الموقع
│   ├── hrms/       # نظام الموارد البشرية
│   └── admin/      # لوحات التحكم
├── utils/          # دوال مساعدة ومنطق الأعمال
├── types/          # تعريفات TypeScript
└── context/        # إدارة الحالة (State Management)
```

---

## المرحلة 3: بناء النظام الأساسي

### 1. تعريف أنواع البيانات (Types)
في ملف `src/types.ts`، نحدد هياكل البيانات الأساسية:

```typescript
export interface Ticket {
  id: string;
  type: RequestType;
  status: RequestStatus;
  department: string;
  description: string;
  citizenNationalId: string;
  // ... باقي الحقول
}

export interface Employee {
  id: string;
  username: string;
  role: 'admin' | 'employee';
  department: string;
}
```

### 2. إنشاء مخزن البيانات (AppContext)
المشروع لا يستخدم Redux لتبسيطه، بل يعتمد على `Context API` مع `localStorage`.
في ملف `src/App.tsx` (أو ملف منفصل للكونتक्स्ट):

```typescript
// إدارة البيانات والمزامنة مع التخزين المحلي
useEffect(() => {
  localStorage.setItem('tickets', JSON.stringify(tickets));
}, [tickets]);

// دوال إدارة التذاكر
const addTicket = (ticket) => { ... };
const updateTicketStatus = (id, status) => { ... };
```

### 3. بناء مكونات الواجهة (UI Components)
أهم المكونات في `src/components/ui`:
- **Card.tsx**: حاوية زجاجية (Glassmorphism) تستخدم في كل مكان.
- **Button.tsx**: زر يدعم التحميل والأيقونات.
- **Input.tsx**: حقول إدخال تدعم العربية والاتجاه من اليمين لليسار.

---

## المرحلة 4: تطوير المميزات الرئيسية

### 1. نظام التذاكر والشكاوى
- إنشاء صفحة `SubmitRequestPage` لتقديم الطلبات.
- إنشاء صفحة `TrackRequestPage` للاستعلام عن حالة الطلب برقم الهوية ورقم التذكرة.
- توليد معرفات فريدة للتذاكر (مثال: `REQ-2023-0001`).

### 2. بوابة الموظفين والإدارة
- نظام تسجيل دخول محلي (يتحقق من `localStorage` للمستخدمين).
- لوحة تحكم `DashboardPage` تختلف حسب الصلاحيات (مدير vs موظف قسم).
- نظام تحويل التذاكر بين الأقسام.

### 3. الديوان والأرشفة
- دمج مكتبة `pdfjs` لعرض الوثائق.
- إنشاء نظام أرشفة يحفظ البيانات الوصفية للملفات (metadata) وليس الملفات الكبيرة في التخزين المحلي.

### 4. التقارير والتحليلات
- استخدام `Mermaid.js` لرسم المخططات البيانية للأقسام.
- تصدير التقارير بصيغة PDF.

---

## المرحلة 5: التحسينات والأمان

### 1. الأمان
- تشفير كلمات المرور المخزنة محلياً باستخدام `bcryptjs`.
- تنفيذ حماية ضد XSS بتعقيم المدخلات.
- إضافة Rate Limiting على مستوى الـ API (إذا كان هناك خادم خلفي).

### 2. دعم اللغة العربية
- إضافة خطوط "Fustat" و "Noto Naskh Arabic" في `index.css`.
- تفعيل خاصية `dir="rtl"` في عنصر `html`.

---

## المرحلة 6: النشر (Deployment)

### 1. البناء (Build)
تحويل الكود إلى ملفات ثابتة (HTML/CSS/JS):

```bash
npm run build
```

سينتج مجلد `dist` جاهز للنشر.

### 2. إعدادات الاستضافة (مثال: Vercel)
إنشاء ملف `vercel.json`:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

### 3. الرفع
استخدام أوامر Vercel CLI أو Azure Static Web Apps CLI لرفع مجلد `dist`.

---

## ملخص التقنيات المستخدمة

| التقنية | الاستخدام |
|---------|-----------|
| **React 19** | إطار عمل الواجهة الأمامية |
| **Vite** | أداة البناء والسيرفر المحلي |
| **Tailwind CSS** | التنسيق والتجاوب مع الشاشات |
| **LocalStorage** | قاعدة البيانات (لنسخة المتصفح) |
| **Context API** | إدارة حالة التطبيق |
| **jsPDF** | تصدير التقارير |
