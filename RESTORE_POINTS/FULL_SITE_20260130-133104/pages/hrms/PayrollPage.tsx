import React from 'react';
import Card from '../../components/ui/Card';

const PayrollPage: React.FC = () => {
  return (
    <Card>
      <div className="flex items-start justify-between mb-6">
        <div className="min-w-0">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">إدارة الرواتب والأجور</h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">حساب الرواتب، البدلات، الخصومات، والضرائب، وإصدار كشوف الرواتب.</p>
        </div>
        {/* Back button removed per policy; floating BackToDashboardFab handles navigation */}
      </div>
      <ul className="list-disc pr-5 space-y-1 text-sm text-gray-700 dark:text-gray-300">
        <li>تعريف قواعد الرواتب والبدلات والاقتطاعات.</li>
        <li>الامتثال لقوانين العمل والتأمينات والضرائب.</li>
        <li>توليد كشوف رواتب (Payslips).</li>
      </ul>
      <div className="mt-6 text-xs text-gray-500">ملاحظة: هذه صفحة تمهيدية (Prototype) وسيتم بناء النماذج لاحقاً.</div>
    </Card>
  );
};

export default PayrollPage;
