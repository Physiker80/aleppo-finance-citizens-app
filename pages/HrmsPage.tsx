import React, { useState, useEffect, useRef } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

type ModalKey =
  | 'core'
  | 'payroll'
  | 'attendance'
  | 'leave'
  | 'ess'
  | 'performance'
  | 'recruitment'
  | 'reports'
  | null;

const Section: React.FC<{ title: string; children: React.ReactNode } > = ({ title, children }) => (
  <section className="mb-6">
    <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">{title}</h3>
    <div className="text-gray-700 dark:text-gray-300 leading-relaxed">{children}</div>
  </section>
);

const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-50 bg-black/60" onClick={onClose}>
    <div className="relative w-screen h-screen" onClick={(e) => e.stopPropagation()}>
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[92vw] max-w-4xl rounded-xl border border-white/20 bg-white dark:bg-gray-900 shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-800/70">
          <h4 className="text-base font-semibold text-gray-900 dark:text-gray-100">{title}</h4>
          <button onClick={onClose} aria-label="إغلاق" className="w-8 h-8 rounded hover:bg-black/5 dark:hover:bg-white/10">✕</button>
        </div>
        <div className="p-4 max-h-[72vh] overflow-auto">
          {children}
        </div>
      </div>
    </div>
  </div>
);

const HrmsPage: React.FC = () => {
  const [activeModal, setActiveModal] = useState<ModalKey>(null);
  const [showIntro, setShowIntro] = useState<boolean>(false);
  const introBtnRef = useRef<HTMLDivElement | null>(null);
  const introPopRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!showIntro) return;
      const target = e.target as Node;
      if (introPopRef.current && introPopRef.current.contains(target)) return;
      if (introBtnRef.current && introBtnRef.current.contains(target)) return;
      setShowIntro(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowIntro(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [showIntro]);

  return (
    <Card>
      <div className="flex items-start justify-between mb-6">
        <div className="min-w-0">
          <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100">نظام إدارة الموارد البشرية المتكامل (HRMS)</h2>
        </div>
        <div className="flex gap-2 items-center">
          <div className="relative" ref={introBtnRef}>
            <Button onClick={() => setShowIntro((v) => !v)} aria-haspopup="dialog" aria-expanded={showIntro}>
              تعريف النظام
            </Button>
            {showIntro && (
              <div
                ref={introPopRef}
                role="dialog"
                aria-label="تعريف نظام إدارة الموارد البشرية المتكامل"
                className="absolute z-50 top-full mt-2 left-0 translate-x-0 w-[min(92vw,42rem)] rounded-xl border border-white/20 dark:border-white/10 bg-white/70 dark:bg-gray-900/60 backdrop-blur-md shadow-xl ring-1 ring-black/5 dark:ring-white/10"
              >
                {/* Arrow */}
                <div className="absolute -top-1 left-6 w-3 h-3 rotate-45 bg-white/70 dark:bg-gray-900/60 border-l border-t border-white/20 dark:border-white/10"></div>
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/20 dark:border-white/10 bg-white/40 dark:bg-gray-800/20 rounded-t-xl">
                  <h4 className="text-base font-semibold text-gray-900 dark:text-gray-100">تعريف نظام إدارة الموارد البشرية المتكامل</h4>
                  <button onClick={() => setShowIntro(false)} aria-label="إغلاق" className="w-8 h-8 rounded hover:bg-black/5 dark:hover:bg-white/10">✕</button>
                </div>
                <div className="p-4 text-sm text-gray-800 dark:text-gray-200 space-y-2">
                  <p>
                    برنامج إدارة الموارد البشرية المتكامل (HRMS) هو حل برمجي يجمع بين العديد من أنظمة وعمليات الموارد البشرية
                    لضمان سهولة الإدارة ومعالجة البيانات من مكان واحد. بدلاً من استخدام برامج منفصلة للمرتبات، الحضور، التوظيف، والتقييم،
                    يقوم النظام المتكامل بدمج كل هذه الوظائف في منصة واحدة مترابطة.
                  </p>
                  <p>يُعرف هذا النظام بأسماء مختلفة مثل: HRMS، HRIS، وHCM.</p>
                  <div className="pt-1">
                    <h5 className="font-semibold mb-1">تعاريف متداولة</h5>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">HRMS</span>
                      <span className="px-2 py-1 rounded-full text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">HRIS</span>
                      <span className="px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300">HCM</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          <Button variant="secondary" onClick={() => window.location.hash = '#/dashboard'}>العودة للوحة التحكم</Button>
        </div>
      </div>

      <Section title="الوحدات الأساسية">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Core HR */}
          <div role="button" tabIndex={0} onClick={() => { window.location.hash = '#/hrms/core'; }} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); window.location.hash = '#/hrms/core'; } }}
               className="rounded-2xl border border-white/20 dark:border-white/10 bg-white/70 dark:bg-gray-800/60 backdrop-blur p-5 shadow-sm cursor-pointer hover:ring-2 hover:ring-blue-300/40">
            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-indigo-600/10 text-indigo-400 text-2xl">👥</div>
            <h4 className="mt-3 font-semibold text-lg">إدارة معلومات الموظفين (Core HR)</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">قاعدة بيانات مركزية، هيكل تنظيمي، وأرشفة مستندات.</p>
            
          </div>

          {/* Payroll */}
          <div role="button" tabIndex={0} onClick={() => { window.location.hash = '#/hrms/payroll'; }} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); window.location.hash = '#/hrms/payroll'; } }}
               className="rounded-2xl border border-white/20 dark:border-white/10 bg-white/70 dark:bg-gray-800/60 backdrop-blur p-5 shadow-sm cursor-pointer hover:ring-2 hover:ring-blue-300/40">
            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-amber-600/10 text-amber-400 text-2xl">💰</div>
            <h4 className="mt-3 font-semibold text-lg">إدارة الرواتب والأجور</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">حساب الرواتب والبدلات والضرائب وإصدار كشوف الرواتب.</p>
          </div>

          {/* Time & Attendance */}
          <div role="button" tabIndex={0} onClick={() => { window.location.hash = '#/hrms/attendance'; }} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); window.location.hash = '#/hrms/attendance'; } }}
               className="rounded-2xl border border-white/20 dark:border-white/10 bg-white/70 dark:bg-gray-800/60 backdrop-blur p-5 shadow-sm cursor-pointer hover:ring-2 hover:ring-blue-300/40">
            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-green-600/10 text-green-400 text-2xl">⏱</div>
            <h4 className="mt-3 font-semibold text-lg">إدارة الوقت والحضور</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">تتبع الحضور، الجداول، وساعات العمل الإضافية.</p>
          </div>

          {/* Leave */}
          <div role="button" tabIndex={0} onClick={() => { window.location.hash = '#/hrms/leave'; }} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); window.location.hash = '#/hrms/leave'; } }}
               className="rounded-2xl border border-white/20 dark:border-white/10 bg-white/70 dark:bg-gray-800/60 backdrop-blur p-5 shadow-sm cursor-pointer hover:ring-2 hover:ring-blue-300/40">
            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-pink-600/10 text-pink-400 text-2xl">🌴</div>
            <h4 className="mt-3 font-semibold text-lg">إدارة الإجازات والغياب</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">طلبات الإجازة، الموافقات، وتتبع الأرصدة.</p>
          </div>

          {/* ESS/MSS */}
          <div role="button" tabIndex={0} onClick={() => { window.location.hash = '#/hrms/ess-mss'; }} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); window.location.hash = '#/hrms/ess-mss'; } }}
               className="rounded-2xl border border-white/20 dark:border-white/10 bg-white/70 dark:bg-gray-800/60 backdrop-blur p-5 shadow-sm cursor-pointer hover:ring-2 hover:ring-blue-300/40">
            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-sky-600/10 text-sky-400 text-2xl">🧑‍💼</div>
            <h4 className="mt-3 font-semibold text-lg">الخدمة الذاتية للموظفين والمدراء (ESS/MSS)</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">بوابات ذاتية للوصول للبيانات والطلبات والموافقات.</p>
          </div>

          {/* Performance */}
          <div role="button" tabIndex={0} onClick={() => { window.location.hash = '#/hrms/performance'; }} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); window.location.hash = '#/hrms/performance'; } }}
               className="rounded-2xl border border-white/20 dark:border-white/10 bg-white/70 dark:bg-gray-800/60 backdrop-blur p-5 shadow-sm cursor-pointer hover:ring-2 hover:ring-blue-300/40">
            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-purple-600/10 text-purple-400 text-2xl">📈</div>
            <h4 className="mt-3 font-semibold text-lg">إدارة الأداء</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">أهداف واضحة، تقييمات دورية، وخطط تطوير.</p>
          </div>

          {/* Recruitment */}
          <div role="button" tabIndex={0} onClick={() => { window.location.hash = '#/hrms/recruitment'; }} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); window.location.hash = '#/hrms/recruitment'; } }}
               className="rounded-2xl border border-white/20 dark:border-white/10 bg-white/70 dark:bg-gray-800/60 backdrop-blur p-5 shadow-sm cursor-pointer hover:ring-2 hover:ring-blue-300/40">
            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-lime-600/10 text-lime-400 text-2xl">🧲</div>
            <h4 className="mt-3 font-semibold text-lg">التوظيف واكتساب المواهب</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">نظام تتبع المتقدمين (ATS) وإجراءات الانضمام.</p>
          </div>

          {/* Reports */}
          <div role="button" tabIndex={0} onClick={() => { window.location.hash = '#/hrms/reports'; }} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); window.location.hash = '#/hrms/reports'; } }}
               className="rounded-2xl border border-white/20 dark:border-white/10 bg-white/70 dark:bg-gray-800/60 backdrop-blur p-5 shadow-sm cursor-pointer hover:ring-2 hover:ring-blue-300/40">
            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-gray-600/10 text-gray-400 text-2xl">📊</div>
            <h4 className="mt-3 font-semibold text-lg">التقارير والتحليلات</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">لوحات معلومات وتقارير مخصصة لاتخاذ القرار.</p>
          </div>
        </div>
      </Section>

  {activeModal && (
        <Modal title={
          activeModal === 'core' ? 'إدارة معلومات الموظفين' :
          activeModal === 'payroll' ? 'إدارة الرواتب والأجور' :
          activeModal === 'attendance' ? 'إدارة الوقت والحضور' :
          activeModal === 'leave' ? 'إدارة الإجازات والغياب' :
          activeModal === 'ess' ? 'الخدمة الذاتية للموظفين والمدراء (ESS/MSS)' :
          activeModal === 'performance' ? 'إدارة الأداء' :
          activeModal === 'recruitment' ? 'إدارة التوظيف واكتساب المواهب' :
          'التقارير والتحليلات'
        } onClose={() => setActiveModal(null)}>
          {activeModal === 'core' && (
            <div className="space-y-3 text-sm">
              <p>إدارة معلومات الموظفين (Core HR) تمثل قاعدة البيانات المركزية لكل الموظفين مع تنظيم الهيكل الإداري.</p>
              <ul className="list-disc pr-5 space-y-1">
                <li>قاعدة البيانات المركزية: تخزين آمن ومنظم للمعلومات الشخصية، الوثائق الرسمية، تفاصيل الوظيفة، سجل الرواتب، ومعلومات الاتصال.</li>
                <li>الهيكل التنظيمي: رسم وبناء الهيكل الإداري للشركة وتحديد التسلسل الوظيفي والتقارير.</li>
                <li>إدارة المستندات: أرشفة وتخزين كافة المستندات المتعلقة بالموظف إلكترونياً (عقود، شهادات، جوازات سفر).</li>
              </ul>
              <div className="pt-2">
                <Button variant="secondary" onClick={() => { window.location.hash = '#/employees'; }}>فتح إدارة الموظفين</Button>
              </div>
            </div>
          )}
          {activeModal === 'payroll' && (
            <div className="space-y-3 text-sm">
              <p>إدارة الرواتب والأجور تُؤتمت حساب الرواتب وتضمن الامتثال وتوليد كشوف الرواتب.</p>
              <ul className="list-disc pr-5 space-y-1">
                <li>حساب الرواتب: بناءً على الحضور، الإضافي، الخصومات، البدلات، والضرائب.</li>
                <li>الامتثال للقوانين: التوافق مع قوانين العمل والتأمينات الاجتماعية والضرائب المحلية.</li>
                <li>إنشاء مسير الرواتب (Payslips): إصدار كشوف رواتب تفصيلية تلقائياً.</li>
              </ul>
            </div>
          )}
          {activeModal === 'attendance' && (
            <div className="space-y-3 text-sm">
              <p>إدارة الوقت والحضور لتسجيل أوقات العمل وإدارة الجداول والإضافي.</p>
              <ul className="list-disc pr-5 space-y-1">
                <li>تسجيل الحضور والانصراف: التكامل مع أجهزة البصمة، التعرف على الوجه، أو التطبيقات.</li>
                <li>إدارة جداول العمل: ورديات، دوام جزئي، عمل عن بعد.</li>
                <li>تتبع الوقت الإضافي: حسابه تلقائياً وربطه بالراتب.</li>
              </ul>
            </div>
          )}
          {activeModal === 'leave' && (
            <div className="space-y-3 text-sm">
              <p>إدارة الإجازات والغياب تشمل الطلبات، الموافقات، والأرصدة مع تقويم للفريق.</p>
              <ul className="list-disc pr-5 space-y-1">
                <li>تقديم الطلبات والموافقات: طلبات الإجازات تصل للمدير للمراجعة والموافقة إلكترونياً.</li>
                <li>حساب أرصدة الإجازات: السنوية والمرضية وغيرها تلقائياً.</li>
                <li>تقويم الإجازات: عرض تقويم يوضح إجازات الفريق لتجنب التعارض.</li>
              </ul>
            </div>
          )}
          {activeModal === 'ess' && (
            <div className="space-y-3 text-sm">
              <p>الخدمة الذاتية للموظفين والمدراء (ESS & MSS) لتمكين الوصول المباشر للإجراءات.</p>
              <ul className="list-disc pr-5 space-y-1">
                <li>ESS: الوصول للبيانات الشخصية، تحديثها، طلب إجازة، طباعة مسير الراتب، الاطلاع على السياسات.</li>
                <li>MSS: مراجعة طلبات الفريق (إجازات، أذونات)، التقارير، والموافقات.</li>
              </ul>
            </div>
          )}
          {activeModal === 'performance' && (
            <div className="space-y-3 text-sm">
              <p>إدارة الأداء عبر تحديد الأهداف، التقييم الدوري، وخطط التطوير الشخصي.</p>
              <ul className="list-disc pr-5 space-y-1">
                <li>تحديد الأهداف (OKRs/KPIs): وضع أهداف واضحة ومتابعة التقدم.</li>
                <li>التقييم الدوري: سنوي أو نصف سنوي مع جمع الملاحظات.</li>
                <li>خطط التطوير الشخصي: بناء خطط لتحسين الأداء.</li>
              </ul>
            </div>
          )}
          {activeModal === 'recruitment' && (
            <div className="space-y-3 text-sm">
              <p>إدارة التوظيف واكتساب المواهب تشمل ATS وإجراءات الانضمام (Onboarding).</p>
              <ul className="list-disc pr-5 space-y-1">
                <li>نظام تتبع المتقدمين (ATS): إدارة الشواغر، نشر الإعلانات، استقبال السير وفرزها، تتبع مراحل التوظيف.</li>
                <li>إعداد الموظف الجديد (Onboarding): أتمتة إجراءات التعيين والتعريف بالشركة.</li>
              </ul>
            </div>
          )}
          {activeModal === 'reports' && (
            <div className="space-y-3 text-sm">
              <p>التقارير والتحليلات لتقديم لوحات معلومات وتقارير مخصصة تدعم اتخاذ القرار.</p>
              <ul className="list-disc pr-5 space-y-1">
                <li>لوحات معلومات (Dashboards): عرض مؤشرات رئيسية مثل معدل دوران الموظفين، تكلفة التوظيف، ونسبة الحضور.</li>
                <li>تقارير مخصصة: إنشاء تقارير تفصيلية وقابلة للتصدير (CSV/PDF).</li>
              </ul>
            </div>
          )}
        </Modal>
      )}
    </Card>
  );
};

export default HrmsPage;
