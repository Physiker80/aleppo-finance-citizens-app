import React from 'react';
import { createPortal } from 'react-dom';
import Mermaid from './Mermaid';
import Button from './ui/Button';

type SecurityContext = 'mfa' | 'session' | 'rbac' | 'secure-requests' | 'governance' | 'secops';

interface Props {
  context: SecurityContext;
  className?: string;
}

const definitions: Record<SecurityContext, { title: string; definition: string; howItWorks: string[]; chart: string }>
 = {
  mfa: {
    title: 'دليل الأمان: المصادقة متعددة العوامل',
    definition: 'المصادقة متعددة العوامل تضيف طبقة ثانية من التحقق بجانب كلمة المرور، مثل رمز مؤقت من تطبيق مصادقة، بريد إلكتروني، أو رسالة نصية، لتقليل مخاطر الاستيلاء على الحساب.',
    howItWorks: [
      'تفعيل العامل الثاني من صفحة إعدادات الأمان',
      'توليد رمز مؤقت كل 30 ثانية عبر تطبيق المصادقة',
      'التحقق من الرمز عند تسجيل الدخول أو تنفيذ عمليات حساسة',
      'استخدام رموز طوارئ احتياطية عند فقدان الوصول'
    ],
    chart: `flowchart TD
      U[المستخدم] -->|اسم المستخدم + كلمة المرور| A[التحقق الأولي]
  A -->|نجاح| B{هل المصادقة متعددة العوامل مفعّلة؟}
      B -- نعم --> C[إرسال/إدخال رمز مؤقت]
      C -->|تحقق الرمز| D[السماح بالدخول]
      B -- لا --> D
      C -- فشل --> E[رفض + تنبيه]
    `
  },
  session: {
    title: 'دليل الأمان: أمان الجلسات',
    definition: 'أمان الجلسات يضمن حماية جلسات المستخدم من الانتحال والاختطاف عبر سياسات انتهاء الصلاحية، قيود الجهاز/الموقع، ومراقبة الأنشطة المشبوهة.',
    howItWorks: [
      'إنشاء هوية جلسة آمنة عند تسجيل الدخول',
      'تحديث المؤقت (Idle/Absolute Timeout) وإنهاء الجلسات الخاملة',
      'كشف الأنشطة المشبوهة وتوليد سجل أمني وتنبيهات',
      'تقييد الجلسات المتزامنة وإنهاؤها يدوياً عند الحاجة'
    ],
    chart: `flowchart LR
      L[تسجيل الدخول] --> S[إنشاء جلسة]
      S --> M[مراقبة النشاط]
      M -->|خمول طويل| T[إنهاء تلقائي]
      M -->|نشاط مشبوه| A[تنبيه + سجل]
      S --> C{سياسات الأمان}
      C -->|حد الجلسات| K[منع جلسات جديدة]
      C -->|تجديد/انتهاء| R[تحديث التوكن]
    `
  },
  rbac: {
    title: 'دليل الأمان: إدارة الأدوار والصلاحيات (RBAC)',
    definition: 'التحكم بالوصول المبني على الأدوار يحدد ما يمكن للمستخدم فعله بناءً على دوره وقسمه، مع تدقيق شامل لكل تغيير أو وصول حساس.',
    howItWorks: [
      'تعيين الأدوار للمستخدمين وفق مبدأ أقل الصلاحيات',
      'تحديد سياسات الوصول ومستويات الحساسية للبيانات',
      'تسجيل جميع عمليات الإنشاء/التعديل/الحذف في سجل تدقيق',
      'مراجعات دورية للصلاحيات والتنبيهات عند المخالفات'
    ],
    chart: `flowchart TD
      U[موظف] --> R[دور]
      R --> P[صلاحيات]
      P --> A{طلب وصول}
      A -- مسموح --> OK[تنفيذ]
      A -- مرفوض --> DENY[حظر]
      A --> LOG[سجل تدقيق]
    `
  },
  'secure-requests': {
    title: 'دليل الأمان: الطلبات الآمنة وتصنيف البيانات',
    definition: 'تصنيف الطلبات يضمن التعامل الصحيح مع حساسية البيانات (منخفض/متوسط/عالٍ)، مع تطبيق ضوابط إضافية على العمليات عالية الحساسية.',
    howItWorks: [
      'اختيار مستوى التصنيف عند إنشاء/معالجة التذكرة',
  'فرض المصادقة متعددة العوامل للعمليات الحساسة حسب السياسات',
      'حجب بعض الحقول أو إخفاؤها حسب الدور والقسم',
      'تسجيل أي وصول أو نقل بين الأقسام في سجل التدقيق'
    ],
    chart: `flowchart LR
      T[تذكرة] --> C{تصنيف الأمان}
      C -- منخفض --> L[مسار اعتيادي]
      C -- متوسط --> M[ضوابط إضافية]
  C -- عالٍ --> H[مراجعة + المصادقة متعددة العوامل]
      H --> AUD[سجل تدقيق]
      M --> AUD
      L --> AUD
    `
  },
  governance: {
    title: 'دليل الأمان: حوكمة الأمن والامتثال',
    definition: 'حوكمة الأمن تضبط السياسات والمعايير ومراقبة الامتثال لضمان استدامة وضع أمني متماسك وقابل للتدقيق.',
    howItWorks: [
      'تعريف السياسات (TLS, HSTS, كلمات مرور، مراقبة...)',
      'قياس الحالة الأمنية واكتشاف الثغرات وفق مؤشرات واضحة',
      'خطط معالجة ومتابعة وتحسين مستمر',
      'تقارير دورية للإدارة والتدقيق الخارجي'
    ],
    chart: `flowchart TD
      POL[سياسات الأمن] --> MEA[قياس وتقييم]
      MEA --> GAP[فجوات]
      GAP --> PLAN[خطة معالجة]
      PLAN --> EXEC[تنفيذ]
      EXEC --> MON[مراقبة وتحسين]
      MON --> MEA
    `
  },
  secops: {
    title: 'دليل الأمان: عمليات الأمن (SecOps)',
    definition: 'SecOps يدمج بين الرصد والاستجابة والتعلم المستمر عبر خط زمني للحوادث وإجراءات علاجية موثقة وتحليلات اتجاهية.',
    howItWorks: [
      'جمع الأحداث والسجلات من المصادر المختلفة',
      'التجميع حسب الشدة/النوع ورسم الاتجاهات',
      'اتخاذ إجراءات علاجية واسترداد ومتابعة',
      'توثيق كامل وإغلاق بتحقق ومراقبة لاحقة'
    ],
    chart: `flowchart LR
      SRC[مصادر الأحداث] --> COL[تجميع]
      COL --> TRI[تصنيف/شدة]
      TRI --> RESP[استجابة]
      RESP --> REC[استرداد]
      REC --> VER[تحقق]
      VER --> MON[مراقبة لاحقة]
    `
  }
};

export const SecurityInfoButton: React.FC<Props> = ({ context, className }) => {
  const [open, setOpen] = React.useState(false);
  const [comfortable, setComfortable] = React.useState(false);
  const info = definitions[context];

  return (
    <div className={className}>
      <Button
        variant="secondary"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={`security-info-${context}`}
        className="border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-gray-800 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-gray-700"
        onClick={() => setOpen(true)}
        title="معلومات ونبذة ومخطط عن هذا القسم"
      >
        ℹ️ دليل القسم الأمني
      </Button>

      {open && typeof document !== 'undefined' && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          id={`security-info-${context}`}
          aria-labelledby={`security-info-title-${context}`}
          className="fixed inset-0 z-[10000] flex items-center justify-center p-3"
          onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false); }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} aria-hidden="true" />

          {/* Modal */}
          <div className="relative z-10 max-h-[90vh] w-[min(100%,900px)] overflow-auto rounded-xl bg-white dark:bg-gray-900 shadow-2xl ring-1 ring-emerald-200 dark:ring-gray-700 p-5 rtl:text-right">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id={`security-info-title-${context}`} className="text-xl font-bold text-emerald-800 dark:text-emerald-300">{info.title}</h2>
                <p className={`mt-2 text-gray-700 dark:text-gray-300 ${comfortable ? 'text-[1.05rem] md:text-[1.125rem] leading-8' : 'leading-7'} max-w-[68ch]`}>{info.definition}</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="shrink-0 rounded-full border border-gray-300 dark:border-gray-700 p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label="إغلاق"
                title="إغلاق"
              >
                ✖
              </button>
            </div>

            {/* Reading comfort toggle */}
            <div className="mt-3 flex items-center justify-end">
              <Button
                variant="secondary"
                aria-pressed={comfortable}
                onClick={() => setComfortable(v => !v)}
                className={`text-xs px-3 py-1.5 ${comfortable ? 'bg-emerald-600 text-white' : ''}`}
                title="تبديل نمط القراءة المريح"
              >
                {comfortable ? 'نمط القراءة المريح: مفعل' : 'نمط القراءة المريح'}
              </Button>
            </div>

            <div className="mt-6">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">المخطط التوضيحي (تفاعلي)</h3>
              <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-3 overflow-x-auto">
                <Mermaid chart={info.chart} />
              </div>
            </div>

            {/* Divider */}
            <div className="mt-6 h-px bg-gray-200 dark:bg-gray-700" />

            {/* Moved below for better reading flow */}
            <div className="mt-6">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">الخطوات العملية (للقراءة)</h3>
              <div className="mt-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-4">
              <ol className={`list-decimal pr-6 rtl:pr-0 rtl:pl-6 text-gray-800 dark:text-gray-300 space-y-2 ${comfortable ? 'text-[1.05rem] md:text-[1.125rem] leading-8' : 'leading-7 text-[0.95rem]'} max-w-[68ch]`}>
                {info.howItWorks.map((li, i) => (
                  <li key={i}>{li}</li>
                ))}
              </ol>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="secondary"
                className="border border-gray-300 dark:border-gray-700"
                onClick={() => setOpen(false)}
              >
                إغلاق
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default SecurityInfoButton;
