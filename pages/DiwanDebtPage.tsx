import React from 'react';
import GeneralDiwanPage from './GeneralDiwanPage';

const DiwanDebtPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-2">
            ديوان قسم المتابعة وإدارة الديون
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            إدارة الوثائق والمحاضر الخاصة بقسم المتابعة وإدارة الديون
          </p>
        </div>
        
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">
            معلومات القسم
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-red-700 dark:text-red-300">التخصص:</span>
              <span className="mr-2 text-red-600 dark:text-red-400">متابعة وتحصيل الديون المستحقة واتخاذ الإجراءات القانونية</span>
            </div>
            <div>
              <span className="font-medium text-red-700 dark:text-red-300">عدد الدوائر:</span>
              <span className="mr-2 text-red-600 dark:text-red-400">3 دوائر رئيسية</span>
            </div>
          </div>
          
          <div className="mt-4">
            <h3 className="font-medium text-red-700 dark:text-red-300 mb-2">الدوائر الرئيسية:</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
              <div className="bg-white dark:bg-gray-800 p-2 rounded border">
                <strong>دائرة حسابات الجهة والمعاملات</strong>
              </div>
              <div className="bg-white dark:bg-gray-800 p-2 rounded border">
                <strong>دائرة الإجراءات والتقنية</strong>
              </div>
              <div className="bg-white dark:bg-gray-800 p-2 rounded border">
                <strong>دائرة تحصيل الأموال العامة</strong>
              </div>
            </div>
          </div>
        </div>
        
        <GeneralDiwanPage defaultDepartment="قسم المتابعة وإدارة الديون" />
      </div>
    </div>
  );
};

export default DiwanDebtPage;
