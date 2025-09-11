import React from 'react';
import GeneralDiwanPage from './GeneralDiwanPage';

const DiwanAdminDevelopmentPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-emerald-50 to-green-100 dark:from-teal-900/20 dark:via-emerald-900/20 dark:to-green-900/20 transition-colors duration-500">
      <div className="container mx-auto px-4 py-6">
        {/* رأس الصفحة */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-teal-500 to-emerald-500 rounded-2xl mb-4 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            ديوان قسم التنمية الإدارية
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            توثيق تطوير العمليات والموارد البشرية والهياكل التنظيمية
          </p>
        </div>

        {/* معلومات القسم */}
        <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-2xl p-6 mb-6 shadow-lg">
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-semibold text-teal-700 dark:text-teal-300">القسم:</span>
              <span className="text-gray-700 dark:text-gray-300 mr-2">قسم التنمية الإدارية</span>
            </div>
            <div>
              <span className="font-semibold text-teal-700 dark:text-teal-300">التخصص:</span>
              <span className="text-gray-700 dark:text-gray-300 mr-2">التطوير الإداري والموارد البشرية</span>
            </div>
            <div>
              <span className="font-semibold text-teal-700 dark:text-teal-300">النطاق:</span>
              <span className="text-gray-700 dark:text-gray-300 mr-2">الهياكل التنظيمية والعمليات الإدارية</span>
            </div>
          </div>
        </div>

        {/* وحدة التوثيق */}
        <GeneralDiwanPage defaultDepartment="قسم التنمية الإدارية" />
      </div>
    </div>
  );
};

export default DiwanAdminDevelopmentPage;
