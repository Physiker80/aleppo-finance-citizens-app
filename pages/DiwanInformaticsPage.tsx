import React from 'react';
import GeneralDiwanPage from './GeneralDiwanPage';

const DiwanInformaticsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-cyan-100 dark:from-cyan-900/20 dark:via-blue-900/20 dark:to-cyan-900/20 transition-colors duration-500">
      <div className="container mx-auto px-4 py-6">
        {/* رأس الصفحة */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-2xl mb-4 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            ديوان قسم المعلوماتية
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            توثيق الأنظمة والتطوير التقني والدعم الفني
          </p>
        </div>

        {/* معلومات القسم */}
        <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-2xl p-6 mb-6 shadow-lg">
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-semibold text-cyan-700 dark:text-cyan-300">القسم:</span>
              <span className="text-gray-700 dark:text-gray-300 mr-2">قسم المعلوماتية</span>
            </div>
            <div>
              <span className="font-semibold text-cyan-700 dark:text-cyan-300">التخصص:</span>
              <span className="text-gray-700 dark:text-gray-300 mr-2">الأنظمة الإلكترونية والدعم الفني</span>
            </div>
            <div>
              <span className="font-semibold text-cyan-700 dark:text-cyan-300">النطاق:</span>
              <span className="text-gray-700 dark:text-gray-300 mr-2">التطوير والبرمجة والشبكات</span>
            </div>
          </div>
        </div>

        {/* وحدة التوثيق */}
        <GeneralDiwanPage defaultDepartment="قسم المعلوماتية" />
      </div>
    </div>
  );
};

export default DiwanInformaticsPage;
