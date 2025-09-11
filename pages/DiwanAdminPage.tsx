import React from 'react';
import GeneralDiwanPage from './GeneralDiwanPage';

const DiwanAdminPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-2">
            ديوان قسم الإدارة العامة
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            إدارة الوثائق والمحاضر الخاصة بقسم الإدارة العامة
          </p>
        </div>
        
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold text-blue-800 dark:text-blue-200 mb-2">
            معلومات القسم
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-blue-700 dark:text-blue-300">رئيس القسم:</span>
              <span className="mr-2 text-blue-600 dark:text-blue-400">مدير المديرية</span>
            </div>
            <div>
              <span className="font-medium text-blue-700 dark:text-blue-300">الوصف:</span>
              <span className="mr-2 text-blue-600 dark:text-blue-400">الإشراف العام على المديرية والدعم الإداري والتنفيذي</span>
            </div>
          </div>
          
          <div className="mt-4">
            <h3 className="font-medium text-blue-700 dark:text-blue-300 mb-2">الدوائر الفرعية:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <div className="bg-white dark:bg-gray-800 p-2 rounded border">
                <strong>دائرة خدمة الجمهور والنافذة الواحدة</strong>
                <ul className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                  <li>• شعبة النافذة الواحدة</li>
                  <li>• شعبة التسجيل والبيانات</li>
                  <li>• شعبة المستوى والجودة</li>
                  <li>• شعبة الدعم الإلكتروني والتحويلات</li>
                </ul>
              </div>
              <div className="bg-white dark:bg-gray-800 p-2 rounded border">
                <strong>دائرة مكتب المدير</strong>
                <ul className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                  <li>• شعبة الشؤون الإدارية والقانونية</li>
                  <li>• شعبة التخطيط والمتابعة</li>
                  <li>• شعبة العلاقات العامة والاتصال</li>
                  <li>• شعبة الشؤون المالية للمكتب</li>
                  <li>• شعبة التقنية والمعلومات</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        
        <GeneralDiwanPage defaultDepartment="قسم الإدارة العامة" />
      </div>
    </div>
  );
};

export default DiwanAdminPage;
