import React from 'react';
import GeneralDiwanPage from './GeneralDiwanPage';

const DiwanInquiryPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-rose-50 to-red-100 dark:from-pink-900/20 dark:via-rose-900/20 dark:to-red-900/20 transition-colors duration-500">
      <div className="container mx-auto px-4 py-6">
        {/* رأس الصفحة */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-pink-500 to-rose-500 rounded-2xl mb-4 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            ديوان قسم الاستعلام
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            توثيق الخدمات الإلكترونية وخدمة الجمهور والاستعلامات
          </p>
        </div>

        {/* معلومات القسم */}
        <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-2xl p-6 mb-6 shadow-lg">
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="font-semibold text-pink-700 dark:text-pink-300">القسم:</span>
              <span className="text-gray-700 dark:text-gray-300 mr-2">قسم الاستعلام</span>
            </div>
            <div>
              <span className="font-semibold text-pink-700 dark:text-pink-300">التخصص:</span>
              <span className="text-gray-700 dark:text-gray-300 mr-2">الخدمات الإلكترونية وخدمة الجمهور</span>
            </div>
            <div>
              <span className="font-semibold text-pink-700 dark:text-pink-300">النطاق:</span>
              <span className="text-gray-700 dark:text-gray-300 mr-2">البوابة الإلكترونية والاستعلامات</span>
            </div>
          </div>
        </div>

        {/* وحدة التوثيق */}
        <GeneralDiwanPage 
          defaultDepartment="قسم الاستعلام" 
          title="ديوان قسم الاستعلام"
          description="إدارة الوثائق والمحاضر الخاصة بقسم الاستعلام"
        />
      </div>
    </div>
  );
};

export default DiwanInquiryPage;
