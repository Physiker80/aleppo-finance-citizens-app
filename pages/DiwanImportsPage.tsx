import React from 'react';
import GeneralDiwanPage from './GeneralDiwanPage';

const DiwanImportsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">        
        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold text-orange-800 dark:text-orange-200 mb-2">
            معلومات القسم
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-orange-700 dark:text-orange-300">التخصص:</span>
              <span className="mr-2 text-orange-600 dark:text-orange-400">تحصيل الرسوم والضرائب على الواردات والتدقيق المرتبط بها</span>
            </div>
            <div>
              <span className="font-medium text-orange-700 dark:text-orange-300">عدد الشعب:</span>
              <span className="mr-2 text-orange-600 dark:text-orange-400">7 شعب متخصصة</span>
            </div>
          </div>
          
          <div className="mt-4">
            <h3 className="font-medium text-orange-700 dark:text-orange-300 mb-2">الشعب المتخصصة:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
              <div className="bg-white dark:bg-gray-800 p-2 rounded border text-xs">
                <strong>شعبة الرسم على الاستهلاك والإنتاج</strong>
              </div>
              <div className="bg-white dark:bg-gray-800 p-2 rounded border text-xs">
                <strong>شعبة الرسوم الجمركية المباشرة</strong>
              </div>
              <div className="bg-white dark:bg-gray-800 p-2 rounded border text-xs">
                <strong>شعبة الرسوم غير المباشرة</strong>
              </div>
              <div className="bg-white dark:bg-gray-800 p-2 rounded border text-xs">
                <strong>شعبة رسم الطابع</strong>
              </div>
              <div className="bg-white dark:bg-gray-800 p-2 rounded border text-xs">
                <strong>شعبة المراقبة والتدقيق</strong>
              </div>
              <div className="bg-white dark:bg-gray-800 p-2 rounded border text-xs">
                <strong>شعبة المعالجة الإلكترونية</strong>
              </div>
            </div>
          </div>
        </div>
        
        <GeneralDiwanPage 
          defaultDepartment="قسم الواردات" 
          title="ديوان قسم الواردات"
          description="إدارة الوثائق والمحاضر الخاصة بقسم الواردات"
        />
      </div>
    </div>
  );
};

export default DiwanImportsPage;
