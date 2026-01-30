import React from 'react';
import Card from '../../components/ui/Card';

const AttendancePage: React.FC = () => {
  return (
    <Card>
      <div className="flex items-start justify-between mb-6">
        <div className="min-w-0">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">إدارة الوقت والحضور</h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">تسجيل الحضور والانصراف، الجداول، وتتبع الإضافي.</p>
        </div>
        {/* Back button removed per policy; floating BackToDashboardFab handles navigation */}
      </div>
      <ul className="list-disc pr-5 space-y-1 text-sm text-gray-700 dark:text-gray-300">
        <li>تكامل أجهزة البصمة والتطبيقات.</li>
        <li>إدارة الجداول (وردّيات/جزئي/عن بُعد).</li>
        <li>حساب الإضافي وربطه بالرواتب.</li>
      </ul>
      <div className="mt-6 text-xs text-gray-500">ملاحظة: صفحة تمهيدية، سيتم إضافة النماذج لاحقاً.</div>
    </Card>
  );
};

export default AttendancePage;
