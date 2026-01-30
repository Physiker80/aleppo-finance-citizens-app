import React, { useEffect, useRef, useState, useContext } from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import HRSearchComponent from '../../components/HRSearchComponent';
import { AppContext } from '../../App';
import { Employee } from '../../types';

const CoreHrPage: React.FC = () => {
  const [showIntro, setShowIntro] = useState<boolean>(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const introBtnRef = useRef<HTMLDivElement | null>(null);
  const introPopRef = useRef<HTMLDivElement | null>(null);
  const appContext = useContext(AppContext);

  const handleEmployeeSelect = (employee: Employee) => {
    setSelectedEmployee(employee);
  };

  const handleClearEmployeeSelection = () => {
    setSelectedEmployee(null);
  };

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
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">إدارة معلومات الموظفين (Core HR)</h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            قاعدة البيانات المركزية للموظفين مع تنظيم الهيكل الإداري وإدارة المستندات.
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <div className="relative" ref={introBtnRef}>
            <Button onClick={() => setShowIntro(v => !v)} aria-haspopup="dialog" aria-expanded={showIntro}>
              تعريف الوحدة
            </Button>
            {showIntro && (
              <div
                ref={introPopRef}
                role="dialog"
                aria-label="تعريف وحدة إدارة معلومات الموظفين"
                className="absolute z-50 top-full mt-2 left-0 w-[min(92vw,42rem)] rounded-xl border border-white/20 dark:border-white/10 bg-white/70 dark:bg-gray-900/60 backdrop-blur-md shadow-xl ring-1 ring-black/5 dark:ring-white/10"
              >
                <div className="absolute -top-1 left-6 w-3 h-3 rotate-45 bg-white/70 dark:bg-gray-900/60 border-l border-t border-white/20 dark:border-white/10"></div>
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/20 dark:border-white/10 bg-white/40 dark:bg-gray-800/20 rounded-t-xl">
                  <h4 className="text-base font-semibold text-gray-900 dark:text-gray-100">إدارة معلومات الموظفين (Core HR)</h4>
                  <button onClick={() => setShowIntro(false)} aria-label="إغلاق" className="w-8 h-8 rounded hover:bg-black/5 dark:hover:bg-white/10">✕</button>
                </div>
                <div className="p-4 text-sm text-gray-800 dark:text-gray-200 space-y-2">
                  <p>
                    تمثل إدارة معلومات الموظفين الأساس لنظام الموارد البشرية؛ فهي تُمكّن من حفظ جميع بيانات الموظفين بشكل آمن ومنظم،
                    ورسم الهيكل التنظيمي ومتابعة التقارير الإدارية، مع أرشفة المستندات إلكترونياً.
                  </p>
                  <ul className="list-disc pr-5 space-y-1">
                    <li>قاعدة البيانات المركزية: تخزين المعلومات الشخصية، الوثائق الرسمية، تفاصيل الوظيفة، سجل الرواتب، ومعلومات الاتصال.</li>
                    <li>الهيكل التنظيمي: رسم وبناء الهيكل الإداري للشركة وتحديد التسلسل الوظيفي وسلاسل التقارير.</li>
                    <li>إدارة المستندات: أرشفة وتخزين كافة المستندات المتعلقة بالموظف إلكترونياً (عقود، شهادات، جوازات سفر).</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
          <Button onClick={() => { window.location.hash = '#/employees'; }}>فتح إدارة الموظفين</Button>
          {/* Back to HRMS button removed per policy; rely on global BackToDashboardFab */}
        </div>
      </div>

      {/* HR Search Component */}
      <div className="mb-6">
        <HRSearchComponent
          onEmployeeSelect={handleEmployeeSelect}
          selectedEmployee={selectedEmployee}
          onClearSelection={handleClearEmployeeSelection}
        />
      </div>

      {/* Employee Details Display */}
      {selectedEmployee && (
        <div className="mb-6">
          <Card>
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 p-6 rounded-lg">
              <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
                تفاصيل الموظف المحدد
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">الاسم الكامل:</span>
                    <p className="text-gray-800 dark:text-gray-200 font-medium">{selectedEmployee.name}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">القسم:</span>
                    <p className="text-gray-800 dark:text-gray-200">{selectedEmployee.department}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">المنصب:</span>
                    <p className="text-gray-800 dark:text-gray-200">{selectedEmployee.role}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">رقم الموظف:</span>
                    <p className="text-gray-800 dark:text-gray-200">{selectedEmployee.employeeNumber || 'غير محدد'}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">الرقم الوطني:</span>
                    <p className="text-gray-800 dark:text-gray-200">{selectedEmployee.nationalId || 'غير محدد'}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">اسم المستخدم:</span>
                    <p className="text-gray-800 dark:text-gray-200">{selectedEmployee.username}</p>
                  </div>
                </div>
              </div>
              {selectedEmployee.lastLogin && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">آخر تسجيل دخول:</span>
                  <p className="text-gray-800 dark:text-gray-200">
                    {new Date(selectedEmployee.lastLogin).toLocaleString('ar-SY-u-nu-latn')}
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* تم نقل التفاصيل إلى قائمة منبثقة تُفتح من زر "تعريف الوحدة" */}
    </Card>
  );
};

export default CoreHrPage;
