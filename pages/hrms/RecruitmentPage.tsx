import React from 'react';
import Card from '../../components/ui/Card';

const RecruitmentPage: React.FC = () => {
  return (
    <Card>
      <div className="flex items-start justify-between mb-6">
        <div className="min-w-0">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">التوظيف والانضمام (Recruitment & Onboarding)</h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">ATS لإدارة المرشحين وإجراءات الانضمام.</p>
        </div>
        {/* Back button removed per policy; floating BackToDashboardFab handles navigation */}
      </div>
      <ul className="list-disc pr-5 space-y-1 text-sm text-gray-700 dark:text-gray-300">
        <li>إنشاء الشواغر ونشر الإعلانات.</li>
        <li>استقبال السير وتتبع مراحل المقابلات.</li>
        <li>أتمتة إجراءات Onboarding.</li>
      </ul>
      <div className="mt-6 text-xs text-gray-500">ملاحظة: صفحة تمهيدية، سيتم إضافة النماذج لاحقاً.</div>
    </Card>
  );
};

export default RecruitmentPage;
