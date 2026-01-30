import React from 'react';
import GeneralDiwanPage from './GeneralDiwanPage';

const DiwanImportsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header للتأكد من العرض */}
        <div className="bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-lg p-6 mb-6">
          <h1 className="text-2xl font-bold mb-2">ديوان قسم الواردات</h1>
          <p className="text-orange-100">إدارة الوثائق والمحاضر والمراسلات الخاصة بقسم الواردات</p>
          <div className="flex items-center gap-4 mt-3 text-sm">
            <span className="bg-white/20 px-3 py-1 rounded-full">🏢 قسم الواردات</span>
            <span className="bg-white/20 px-3 py-1 rounded-full">📋 7 شعب متخصصة</span>
            <span className="bg-white/20 px-3 py-1 rounded-full">⚡ نشط</span>
          </div>
        </div>
        
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
              <div className="bg-white dark:bg-gray-800 p-3 rounded border text-xs hover:shadow-md transition-shadow">
                <div className="font-semibold text-orange-700 dark:text-orange-300">شعبة الرسم على الاستهلاك والإنتاج</div>
                <div className="text-gray-500 dark:text-gray-400 mt-1">رسوم الاستهلاك والإنتاج</div>
              </div>
              <div className="bg-white dark:bg-gray-800 p-3 rounded border text-xs hover:shadow-md transition-shadow">
                <div className="font-semibold text-orange-700 dark:text-orange-300">شعبة الرسوم الجمركية المباشرة</div>
                <div className="text-gray-500 dark:text-gray-400 mt-1">الرسوم الجمركية</div>
              </div>
              <div className="bg-white dark:bg-gray-800 p-3 rounded border text-xs hover:shadow-md transition-shadow">
                <div className="font-semibold text-orange-700 dark:text-orange-300">شعبة الرسوم غير المباشرة</div>
                <div className="text-gray-500 dark:text-gray-400 mt-1">الرسوم غير المباشرة</div>
              </div>
              <div className="bg-white dark:bg-gray-800 p-3 rounded border text-xs hover:shadow-md transition-shadow">
                <div className="font-semibold text-orange-700 dark:text-orange-300">شعبة رسم الطابع</div>
                <div className="text-gray-500 dark:text-gray-400 mt-1">رسوم الطوابع</div>
              </div>
              <div className="bg-white dark:bg-gray-800 p-3 rounded border text-xs hover:shadow-md transition-shadow">
                <div className="font-semibold text-orange-700 dark:text-orange-300">شعبة المراقبة والتدقيق</div>
                <div className="text-gray-500 dark:text-gray-400 mt-1">مراقبة وتدقيق</div>
              </div>
              <div className="bg-white dark:bg-gray-800 p-3 rounded border text-xs hover:shadow-md transition-shadow">
                <div className="font-semibold text-orange-700 dark:text-orange-300">شعبة المعالجة الإلكترونية</div>
                <div className="text-gray-500 dark:text-gray-400 mt-1">معالجة إلكترونية</div>
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
