import React from 'react';
import GeneralDiwanPage from './GeneralDiwanPage';

const DiwanIncomePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-2">
            ديوان قسم الدخل
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            إدارة الوثائق والمحاضر الخاصة بقسم الدخل
          </p>
        </div>
        
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-2">
            معلومات القسم
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-green-700 dark:text-green-300">التخصص:</span>
              <span className="mr-2 text-green-600 dark:text-green-400">إدارة وتحصيل الضرائب والرسوم وفق القوانين النافذة</span>
            </div>
            <div>
              <span className="font-medium text-green-700 dark:text-green-300">عدد الدوائر:</span>
              <span className="mr-2 text-green-600 dark:text-green-400">7 دوائر رئيسية</span>
            </div>
          </div>
          
          <div className="mt-4">
            <h3 className="font-medium text-green-700 dark:text-green-300 mb-2">الدوائر الرئيسية:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
              <div className="bg-white dark:bg-gray-800 p-2 rounded border">
                <strong>دائرة الضرائب على الأرباح الحقيقية</strong>
              </div>
              <div className="bg-white dark:bg-gray-800 p-2 rounded border">
                <strong>دائرة الضرائب على الدخل المتطوع</strong>
              </div>
              <div className="bg-white dark:bg-gray-800 p-2 rounded border">
                <strong>دائرة رسوم التركات والهبات</strong>
              </div>
              <div className="bg-white dark:bg-gray-800 p-2 rounded border">
                <strong>دائرة الرواتب والأجور</strong>
              </div>
              <div className="bg-white dark:bg-gray-800 p-2 rounded border">
                <strong>دائرة التدقيق واللجان</strong>
              </div>
              <div className="bg-white dark:bg-gray-800 p-2 rounded border">
                <strong>دائرة التحول الرقمي</strong>
              </div>
            </div>
          </div>
        </div>
        
        <GeneralDiwanPage defaultDepartment="قسم الدخل" />
      </div>
    </div>
  );
};

export default DiwanIncomePage;
