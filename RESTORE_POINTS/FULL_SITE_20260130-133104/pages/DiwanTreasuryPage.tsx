import React from 'react';
import GeneralDiwanPage from './GeneralDiwanPage';

const DiwanTreasuryPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-100 dark:from-amber-900/20 dark:via-yellow-900/20 dark:to-orange-900/20 transition-colors duration-500">
      <div className="container mx-auto px-4 py-6">
        {/* رأس الصفحة */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-amber-500 to-yellow-500 rounded-2xl mb-4 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            ديوان قسم الخزينة
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            توثيق المعاملات المالية والحسابات والخزينة المركزية
          </p>
        </div>

        {/* معلومات القسم */}
        <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-2xl p-6 mb-6 shadow-lg">
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-semibold text-amber-700 dark:text-amber-300">القسم:</span>
              <span className="text-gray-700 dark:text-gray-300 mr-2">قسم الخزينة</span>
            </div>
            <div>
              <span className="font-semibold text-amber-700 dark:text-amber-300">التخصص:</span>
              <span className="text-gray-700 dark:text-gray-300 mr-2">الخزينة المركزية والحسابات المالية</span>
            </div>
            <div>
              <span className="font-semibold text-amber-700 dark:text-amber-300">النطاق:</span>
              <span className="text-gray-700 dark:text-gray-300 mr-2">الموازنة والنفقات والمشاريع</span>
            </div>
          </div>
        </div>

        {/* وحدة التوثيق */}
        <GeneralDiwanPage 
          defaultDepartment="قسم الخزينة" 
          title="ديوان قسم الخزينة"
          description="إدارة الوثائق والمحاضر الخاصة بقسم الخزينة"
        />
      </div>
    </div>
  );
};

export default DiwanTreasuryPage;
