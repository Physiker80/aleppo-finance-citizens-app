import React from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

const AboutSystemPage: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8" dir="rtl">
      <div className="max-w-4xl mx-auto">
        {/* رأس الصفحة */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-4">
            عن نظام الاستعلامات والشكاوى
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            نظام متكامل لإدارة استعلامات وشكاوى المواطنين في وزارة المالية
          </p>
        </div>

        {/* مقدمة عن النظام */}
        <Card className="mb-8">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">
              🔍 نظرة عامة
            </h2>
            <div className="space-y-4 text-right">
              <p className="leading-8 text-gray-700 dark:text-gray-300">
                يهدف نظام الاستعلامات والشكاوى إلى تقديم خدمة متميزة للمواطنين من خلال توفير منصة موحدة وسهلة الاستخدام 
                لتلقي وإدارة جميع الاستعلامات والشكاوى المتعلقة بخدمات وزارة المالية.
              </p>
              <p className="leading-8 text-gray-700 dark:text-gray-300">
                يتميز النظام بالشفافية والسرعة في الاستجابة، حيث يمكن للمواطنين متابعة حالة طلباتهم في الوقت الفعلي 
                والحصول على ردود مفصلة ومدروسة من الجهات المختصة.
              </p>
            </div>
          </div>
        </Card>

        {/* الميزات الأساسية */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
                📞 قنوات التواصل المتعددة
              </h3>
              <ul className="space-y-3 text-gray-700 dark:text-gray-300">
                <li className="flex items-center gap-2">
                  <span className="text-green-600">📱</span>
                  الهاتف المجاني للاستعلامات
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-blue-600">✉️</span>
                  البريد الإلكتروني الرسمي
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-purple-600">🌐</span>
                  الموقع الإلكتروني والتطبيق
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-orange-600">🏢</span>
                  الخدمة الحضورية في المراكز
                </li>
              </ul>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-white">
                ⚡ إدارة متقدمة للطلبات
              </h3>
              <ul className="space-y-3 text-gray-700 dark:text-gray-300">
                <li className="flex items-center gap-2">
                  <span className="text-green-600">🔍</span>
                  تصنيف تلقائي للاستعلامات والشكاوى
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-blue-600">⏰</span>
                  التزام بأوقات الاستجابة المحددة
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-purple-600">📊</span>
                  متابعة لحظية لحالة الطلبات
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-orange-600">🚨</span>
                  نظام تنبيهات للحالات الطارئة
                </li>
              </ul>
            </div>
          </Card>
        </div>

        {/* المؤشرات الرئيسية */}
        <Card className="mb-8">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">
              📈 مؤشرات الأداء الرئيسية
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-700 text-center">
                <div className="text-2xl font-bold text-green-800 dark:text-green-400">93%</div>
                <div className="text-sm text-green-600 dark:text-green-300">الالتزام بـ SLA</div>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-700 text-center">
                <div className="text-2xl font-bold text-blue-800 dark:text-blue-400">82%</div>
                <div className="text-sm text-blue-600 dark:text-blue-300">رضا العملاء</div>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-700 text-center">
                <div className="text-2xl font-bold text-purple-800 dark:text-purple-400">72%</div>
                <div className="text-sm text-purple-600 dark:text-purple-300">الحل من المرة الأولى</div>
              </div>
              <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-200 dark:border-orange-700 text-center">
                <div className="text-2xl font-bold text-orange-800 dark:text-orange-400">55</div>
                <div className="text-sm text-orange-600 dark:text-orange-300">مؤشر NPS</div>
              </div>
            </div>
          </div>
        </Card>

        {/* مراحل معالجة الطلبات */}
        <Card className="mb-8">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-6 text-gray-800 dark:text-white">
              🔄 مراحل معالجة الطلبات
            </h2>
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">1</div>
                <div>
                  <h3 className="font-semibold text-gray-800 dark:text-white">الاستقبال والتسجيل</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">تلقي الطلب وتسجيل البيانات الأساسية</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex-shrink-0 w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center font-bold">2</div>
                <div>
                  <h3 className="font-semibold text-gray-800 dark:text-white">التصنيف والتوجيه</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">تحديد نوع الطلب وتوجيهه للجهة المختصة</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex-shrink-0 w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center font-bold">3</div>
                <div>
                  <h3 className="font-semibold text-gray-800 dark:text-white">المعالجة والتحقيق</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">دراسة الطلب وجمع المعلومات اللازمة</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex-shrink-0 w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center font-bold">4</div>
                <div>
                  <h3 className="font-semibold text-gray-800 dark:text-white">الرد والإشعار</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">إرسال الرد للمواطن وإشعاره بالنتيجة</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex-shrink-0 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center font-bold">5</div>
                <div>
                  <h3 className="font-semibold text-gray-800 dark:text-white">المتابعة والتقييم</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">قياس رضا العميل وإغلاق الحالة</p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* أهداف النظام */}
        <Card className="mb-8">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">
              🎯 أهداف النظام
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-2 text-gray-800 dark:text-white">الأهداف الأساسية</h3>
                <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 mt-1">✓</span>
                    تحسين جودة الخدمة المقدمة للمواطنين
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 mt-1">✓</span>
                    ضمان الاستجابة السريعة للطلبات
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 mt-1">✓</span>
                    تعزيز الشفافية في التعامل
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-green-600 mt-1">✓</span>
                    توحيد إجراءات التعامل مع الطلبات
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2 text-gray-800 dark:text-white">التحسين المستمر</h3>
                <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-1">→</span>
                    تحليل البيانات واستخراج الأنماط
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-1">→</span>
                    تطوير الإجراءات بناءً على التغذية الراجعة
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-1">→</span>
                    رفع مستوى رضا المواطنين
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-1">→</span>
                    تقليل زمن الاستجابة والمعالجة
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </Card>

        {/* معلومات الاتصال */}
        <Card>
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">
              📞 تواصل معنا
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="text-3xl mb-2">📱</div>
                <h4 className="font-semibold mb-1 text-gray-800 dark:text-white">خط الاستعلامات</h4>
                <p className="text-gray-600 dark:text-gray-400">144 (مجاني)</p>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="text-3xl mb-2">✉️</div>
                <h4 className="font-semibold mb-1 text-gray-800 dark:text-white">البريد الإلكتروني</h4>
                <p className="text-gray-600 dark:text-gray-400">complaints@finance.gov.sy</p>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="text-3xl mb-2">🌐</div>
                <h4 className="font-semibold mb-1 text-gray-800 dark:text-white">الموقع الإلكتروني</h4>
                <p className="text-gray-600 dark:text-gray-400">www.finance.gov.sy</p>
              </div>
            </div>
          </div>
        </Card>

        {/* زر العودة */}
        <div className="text-center mt-8">
          <Button
            onClick={() => window.location.hash = '/'}
            className="bg-[#0f3c35] hover:bg-[#0f3c35]/90 text-white px-8 py-3 rounded-lg font-semibold"
          >
            🏠 العودة للصفحة الرئيسية
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AboutSystemPage;