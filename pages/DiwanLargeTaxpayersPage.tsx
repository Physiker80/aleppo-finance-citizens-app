import React from 'react';
import GeneralDiwanPage from './GeneralDiwanPage';

const DiwanLargeTaxpayersPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 py-8">        
        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold text-purple-800 dark:text-purple-200 mb-2">
            معلومات القسم
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-purple-700 dark:text-purple-300">التخصص:</span>
              <span className="mr-2 text-purple-600 dark:text-purple-400">إدارة العلاقة مع كبار ومتوسطي المكلفين والتحصيل والتقييم</span>
            </div>
            <div>
              <span className="font-medium text-purple-700 dark:text-purple-300">عدد الشعب:</span>
              <span className="mr-2 text-purple-600 dark:text-purple-400">4 شعب متخصصة</span>
            </div>
          </div>
          
          <div className="mt-4">
            <h3 className="font-medium text-purple-700 dark:text-purple-300 mb-2">الشعب المتخصصة:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <div className="bg-white dark:bg-gray-800 p-2 rounded border">
                <strong>شعبة إدارة علاقات المكلفين</strong>
              </div>
              <div className="bg-white dark:bg-gray-800 p-2 rounded border">
                <strong>شعبة التحصيل والمتابعة</strong>
              </div>
              <div className="bg-white dark:bg-gray-800 p-2 rounded border">
                <strong>شعبة التحليل والتقييم</strong>
              </div>
              <div className="bg-white dark:bg-gray-800 p-2 rounded border">
                <strong>شعبة الدعم الفني والإلكتروني</strong>
              </div>
            </div>
          </div>
        </div>
        
        <GeneralDiwanPage 
          defaultDepartment="قسم كبار ومتوسطي المكلفين" 
          title="ديوان قسم كبار ومتوسطي المكلفين"
          description="إدارة الوثائق والمحاضر الخاصة بقسم كبار ومتوسطي المكلفين"
        />
      </div>
    </div>
  );
};

export default DiwanLargeTaxpayersPage;
