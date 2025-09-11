import React from 'react';
import GeneralDiwanPage from './GeneralDiwanPage';

const DiwanAuditPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-2">
            ديوان قسم الرقابة الداخلية
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            إدارة الوثائق والمحاضر الخاصة بقسم الرقابة الداخلية
          </p>
        </div>
        
        <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold text-indigo-800 dark:text-indigo-200 mb-2">
            معلومات القسم
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-indigo-700 dark:text-indigo-300">التخصص:</span>
              <span className="mr-2 text-indigo-600 dark:text-indigo-400">الامتثال والمراجعة الداخلية وتقييم المخاطر</span>
            </div>
            <div>
              <span className="font-medium text-indigo-700 dark:text-indigo-300">عدد الشعب:</span>
              <span className="mr-2 text-indigo-600 dark:text-indigo-400">4 شعب متخصصة</span>
            </div>
          </div>
          
          <div className="mt-4">
            <h3 className="font-medium text-indigo-700 dark:text-indigo-300 mb-2">الشعب المتخصصة:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <div className="bg-white dark:bg-gray-800 p-2 rounded border">
                <strong>شعبة المتابعة والتدقيق</strong>
              </div>
              <div className="bg-white dark:bg-gray-800 p-2 rounded border">
                <strong>شعبة الرقابة والتحقيق</strong>
              </div>
              <div className="bg-white dark:bg-gray-800 p-2 rounded border">
                <strong>شعبة المراجعة الداخلية</strong>
              </div>
              <div className="bg-white dark:bg-gray-800 p-2 rounded border">
                <strong>شعبة تقييم المخاطر والامتثال</strong>
              </div>
            </div>
          </div>
        </div>
        
        <GeneralDiwanPage defaultDepartment="قسم الرقابة الداخلية" />
      </div>
    </div>
  );
};

export default DiwanAuditPage;
