import React from 'react';
import Card from '../../components/ui/Card';

const EssMssPage: React.FC = () => {
  return (
    <Card>
      <div className="flex items-start justify-between mb-6">
        <div className="min-w-0">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">الخدمة الذاتية للموظفين والمدراء (ESS/MSS)</h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">بوابات للوصول إلى البيانات والإجراءات ذاتياً.</p>
        </div>
        {/* Back button removed per policy; floating BackToDashboardFab handles navigation */}
      </div>
      <ul className="list-disc pr-5 space-y-1 text-sm text-gray-700 dark:text-gray-300">
        <li>ESS: تحديث البيانات الشخصية وطلب الإجازات.</li>
        <li>MSS: مراجعة طلبات الفريق والموافقات.</li>
        <li>طباعة مسير الرواتب والاطلاع على السياسات.</li>
      </ul>
      <div className="mt-6 text-xs text-gray-500">ملاحظة: صفحة تمهيدية، سيتم إضافة النماذج لاحقاً.</div>
    </Card>
  );
};

export default EssMssPage;
