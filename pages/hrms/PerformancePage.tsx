import React from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';

const PerformancePage: React.FC = () => {
  return (
    <Card>
      <div className="flex items-start justify-between mb-6">
        <div className="min-w-0">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">إدارة الأداء</h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">الأهداف، التقييمات الدورية، وخطط التطوير.</p>
        </div>
        <Button variant="secondary" onClick={() => (window.location.hash = '#/hrms')}>عودة إلى HRMS</Button>
      </div>
      <ul className="list-disc pr-5 space-y-1 text-sm text-gray-700 dark:text-gray-300">
        <li>تحديد OKRs/KPIs ومتابعة التقدم.</li>
        <li>تقييم سنوي/نصف سنوي مع ملاحظات.</li>
        <li>خطط تطوير شخصية مبنية على النتائج.</li>
      </ul>
      <div className="mt-6 text-xs text-gray-500">ملاحظة: صفحة تمهيدية، سيتم إضافة النماذج لاحقاً.</div>
    </Card>
  );
};

export default PerformancePage;
