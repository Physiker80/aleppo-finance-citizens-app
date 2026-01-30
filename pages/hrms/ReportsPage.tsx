import React from 'react';
import Card from '../../components/ui/Card';

const ReportsPage: React.FC = () => {
  return (
    <Card>
      <div className="flex items-start justify-between mb-6">
        <div className="min-w-0">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">التقارير والتحليلات</h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">لوحات معلومات وتقارير مخصصة لمؤشرات الموارد البشرية.</p>
        </div>
        {/* Back button removed per policy; floating BackToDashboardFab handles navigation */}
      </div>
      <ul className="list-disc pr-5 space-y-1 text-sm text-gray-700 dark:text-gray-300">
        <li>معدلات الدوران، نسبة الحضور، تكلفة التوظيف.</li>
        <li>تصدير CSV/PDF.</li>
      </ul>
      <div className="mt-6 text-xs text-gray-500">ملاحظة: صفحة تمهيدية، سيتم إضافة اللوحات الفعلية لاحقاً.</div>
    </Card>
  );
};

export default ReportsPage;
