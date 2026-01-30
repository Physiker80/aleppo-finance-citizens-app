import React, { useEffect, useState } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { CookieManager } from '../utils/cookieManager';
import { formatDate } from '../utils/arabicNumerals';

const PrivacyPage: React.FC = () => {
  const [customHtml, setCustomHtml] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'cookies' | 'data'>('general');
  const cookieManager = CookieManager.getInstance();

  useEffect(() => {
    try {
      const saved = localStorage.getItem('privacyHtml');
      setCustomHtml(saved && saved.trim() ? saved : null);
    } catch { setCustomHtml(null); }
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    const element = document.createElement('a');
    const file = new Blob([document.documentElement.outerHTML], { type: 'text/html' });
    element.href = URL.createObjectURL(file);
    element.download = 'سياسة-الخصوصية-مديرية-مالية-حلب.html';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <Card>
        <div className="text-center space-y-4">
          <div className="justify-center">
            <div>
              <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">
                سياسة الخصوصية وحماية البيانات
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                مديرية المالية في محافظة حلب — الجمهورية العربية السورية
              </p>
            </div>
          </div>
          
          <div className="flex justify-center gap-4">
            <Button 
              onClick={handlePrint} 
              variant="secondary" 
              className="px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-0 shadow-md hover:shadow-lg transition-all duration-200"
            >
              طباعة
            </Button>
            <Button 
              onClick={handleDownload} 
              variant="secondary" 
              className="px-6 py-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white border-0 shadow-md hover:shadow-lg transition-all duration-200"
            >
              تحميل
            </Button>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400">
            آخر تحديث: {formatDate(new Date())} | النسخة 2.0
          </p>
        </div>
      </Card>

      {/* Content */}
      <Card>
        <div dir="rtl" className="prose prose-lg max-w-none text-right leading-8 dark:prose-invert space-y-6">
          {customHtml ? (
            <div dangerouslySetInnerHTML={{ __html: customHtml }} />
          ) : (
            <>
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 p-6 rounded-xl border-r-4 border-blue-500">
                <p className="text-blue-900 dark:text-blue-200 leading-relaxed">
                  <span className="font-bold text-blue-800 dark:text-blue-300">مقدمة:</span> يرجى قراءة هذه السياسة بعناية لفهم كيفية جمع المعلومات واستخدامها وحمايتها 
                  عند تصفحك واستخدامك للموقع الإلكتروني لمديرية المالية في محافظة حلب.
                </p>
              </div>

              <section>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-900 dark:from-white dark:to-gray-200 bg-clip-text text-transparent mb-4">
                  1. المعلومات التي نجمعها
                </h2>
                <div className="space-y-6">
                  <div className="bg-white dark:bg-gray-800 p-5 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                    <h3 className="text-lg font-semibold text-indigo-700 dark:text-indigo-300 mb-3">المعلومات الشخصية:</h3>
                    <ul className="list-disc pr-6 space-y-2 text-gray-700 dark:text-gray-300">
                      <li>الاسم الكامل والهوية الوطنية</li>
                      <li>البريد الإلكتروني وأرقام الهاتف</li>
                      <li>العنوان والبيانات الديموغرافية</li>
                      <li>تفاصيل الاستعلامات والشكاوى المقدمة</li>
                      <li>الملفات والوثائق المرفوعة</li>
                    </ul>
                  </div>
                  <div className="bg-white dark:bg-gray-800 p-5 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                    <h3 className="text-lg font-semibold text-purple-700 dark:text-purple-300 mb-3">المعلومات التقنية:</h3>
                    <ul className="list-disc pr-6 space-y-2 text-gray-700 dark:text-gray-300">
                      <li>عنوان بروتوكول الإنترنت (IP Address)</li>
                      <li>نوع المتصفح ونظام التشغيل</li>
                      <li>بيانات الجلسة ومعرفات الأمان</li>
                      <li>سجلات الدخول والنشاطات</li>
                      <li>إعدادات اللغة والمنطقة الزمنية</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-900 dark:from-white dark:to-gray-200 bg-clip-text text-transparent mb-4">
                  2. أهداف استخدام المعلومات
                </h2>
                <div className="bg-gradient-to-br from-slate-50 to-gray-100 dark:from-slate-800 dark:to-gray-800 p-6 rounded-xl">
                  <ul className="space-y-4">
                    <li className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2.5 flex-shrink-0"></div>
                      <div><span className="font-semibold text-blue-700 dark:text-blue-300">تقديم الخدمات الحكومية:</span> <span className="text-gray-700 dark:text-gray-300">معالجة الاستعلامات والشكاوى وتقديم الردود المناسبة</span></div>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-2.5 flex-shrink-0"></div>
                      <div><span className="font-semibold text-green-700 dark:text-green-300">الأمان والحماية:</span> <span className="text-gray-700 dark:text-gray-300">مراقبة النشاطات المشبوهة وحماية النظام من التهديدات</span></div>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-purple-500 rounded-full mt-2.5 flex-shrink-0"></div>
                      <div><span className="font-semibold text-purple-700 dark:text-purple-300">تحسين الخدمات:</span> <span className="text-gray-700 dark:text-gray-300">تحليل الاستخدام لتطوير وتحسين جودة الخدمات</span></div>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-orange-500 rounded-full mt-2.5 flex-shrink-0"></div>
                      <div><span className="font-semibold text-orange-700 dark:text-orange-300">الامتثال القانوني:</span> <span className="text-gray-700 dark:text-gray-300">الالتزام بالقوانين السورية ومتطلبات الأرشفة</span></div>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-teal-500 rounded-full mt-2.5 flex-shrink-0"></div>
                      <div><span className="font-semibold text-teal-700 dark:text-teal-300">التواصل الرسمي:</span> <span className="text-gray-700 dark:text-gray-300">إرسال الإشعارات والتحديثات المهمة</span></div>
                    </li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-900 dark:from-white dark:to-gray-200 bg-clip-text text-transparent mb-4">
                  3. ملفات تعريف الارتباط (الكوكيز)
                </h2>
                <div className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/30 dark:to-yellow-900/30 p-6 rounded-xl border-r-4 border-amber-500 mb-6">
                  <p className="text-amber-800 dark:text-amber-200 leading-relaxed">
                    نستخدم ملفات تعريف الارتباط وتقنيات مماثلة لضمان أمان النظام وتحسين تجربة المستخدم.
                  </p>
                </div>

                <div className="space-y-6">
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                    <h3 className="text-lg font-semibold text-amber-700 dark:text-amber-300 mb-4">الأنواع المستخدمة:</h3>
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="w-3 h-3 bg-red-500 rounded-full mt-1.5 flex-shrink-0"></div>
                        <div>
                          <span className="font-semibold text-red-700 dark:text-red-300">ملفات تعريف الارتباط الأساسية:</span>
                          <span className="text-gray-700 dark:text-gray-300"> ضرورية لعمل النظام (معرفات الجلسة، الحماية من التزوير)</span>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-3 h-3 bg-blue-500 rounded-full mt-1.5 flex-shrink-0"></div>
                        <div>
                          <span className="font-semibold text-blue-700 dark:text-blue-300">ملفات تعريف الارتباط الأمنية:</span>
                          <span className="text-gray-700 dark:text-gray-300"> لحماية حسابك واكتشاف الأنشطة المشبوهة</span>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-3 h-3 bg-green-500 rounded-full mt-1.5 flex-shrink-0"></div>
                        <div>
                          <span className="font-semibold text-green-700 dark:text-green-300">ملفات تعريف الارتباط الوظيفية:</span>
                          <span className="text-gray-700 dark:text-gray-300"> لحفظ تفضيلاتك وتحسين التجربة (اختيارية)</span>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-3 h-3 bg-purple-500 rounded-full mt-1.5 flex-shrink-0"></div>
                        <div>
                          <span className="font-semibold text-purple-700 dark:text-purple-300">ملفات تعريف الارتباط التحليلية:</span>
                          <span className="text-gray-700 dark:text-gray-300"> لفهم استخدام الموقع وتحسين الأداء (اختيارية)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-gray-50 to-slate-100 dark:from-gray-700 dark:to-slate-800 p-4 rounded-lg border border-gray-300 dark:border-gray-600">
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                      <span className="font-semibold text-gray-800 dark:text-gray-200">تحكم المستخدم:</span> يمكنك إدارة تفضيلات ملفات تعريف الارتباط من خلال النافذة المنبثقة 
                      التي تظهر عند زيارة الموقع لأول مرة، أو من خلال إعدادات المتصفح.
                    </p>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-900 dark:from-white dark:to-gray-200 bg-clip-text text-transparent mb-4">4. حماية البيانات</h2>
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 p-6 rounded-xl border-r-4 border-green-500">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                      <span className="text-green-900 dark:text-green-200">تشفير البيانات الحساسة باستخدام معايير AES-256</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                      <span className="text-green-900 dark:text-green-200">استخدام بروتوكولات HTTPS للاتصال الآمن</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                      <span className="text-green-900 dark:text-green-200">المصادقة متعددة العوامل للموظفين</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                      <span className="text-green-900 dark:text-green-200">مراقبة أمنية على مدار الساعة</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                      <span className="text-green-900 dark:text-green-200">النسخ الاحتياطي المنتظم والمؤمن</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                      <span className="text-green-900 dark:text-green-200">التدقيق الأمني الدوري والتحديثات</span>
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-900 dark:from-white dark:to-gray-200 bg-clip-text text-transparent mb-4">5. البيانات المجمعة تفصيلياً</h2>
                <div className="space-y-4">
                  {cookieManager.getDataCollectionDetails().map((data, index) => (
                    <div key={index} className="bg-gradient-to-r from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow duration-200">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">{data.category}</h3>
                      <div className="grid md:grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span className="font-semibold text-blue-700 dark:text-blue-300">نوع البيانات:</span> 
                          <span className="text-gray-700 dark:text-gray-300">{data.dataType}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="font-semibold text-green-700 dark:text-green-300">الغرض:</span> 
                          <span className="text-gray-700 dark:text-gray-300">{data.purpose}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                          <span className="font-semibold text-orange-700 dark:text-orange-300">مدة الاحتفاظ:</span> 
                          <span className="text-gray-700 dark:text-gray-300">{data.retention}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                          <span className="font-semibold text-purple-700 dark:text-purple-300">المعالجة:</span> 
                          <span className="text-gray-700 dark:text-gray-300">{data.processing}</span>
                        </div>
                      </div>
                      <div className="mt-4 p-3 bg-gradient-to-r from-gray-100 to-slate-100 dark:from-gray-700 dark:to-slate-800 rounded-lg border border-gray-200 dark:border-gray-600">
                        <div className="flex items-start gap-2">
                          <div className="w-2 h-2 bg-teal-500 rounded-full mt-1.5 flex-shrink-0"></div>
                          <div>
                            <span className="font-semibold text-teal-700 dark:text-teal-300">المشاركة:</span> 
                            <span className="text-gray-700 dark:text-gray-300">{data.sharing}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-900 dark:from-white dark:to-gray-200 bg-clip-text text-transparent mb-4">6. حقوق المستخدمين</h2>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 p-6 rounded-xl border-l-4 border-blue-500">
                    <h3 className="font-bold text-blue-700 dark:text-blue-300 text-lg mb-2">حق الوصول</h3>
                    <p className="text-sm text-blue-800 dark:text-blue-200">طلب نسخة من البيانات الشخصية المحفوظة</p>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 p-6 rounded-xl border-l-4 border-green-500">
                    <h3 className="font-bold text-green-700 dark:text-green-300 text-lg mb-2">حق التصحيح</h3>
                    <p className="text-sm text-green-800 dark:text-green-200">طلب تصحيح أو تحديث البيانات الخاطئة</p>
                  </div>
                  <div className="bg-gradient-to-br from-red-50 to-pink-100 dark:from-red-900/30 dark:to-pink-900/30 p-6 rounded-xl border-l-4 border-red-500">
                    <h3 className="font-bold text-red-700 dark:text-red-300 text-lg mb-2">حق الحذف</h3>
                    <p className="text-sm text-red-800 dark:text-red-200">طلب حذف البيانات (وفقاً للقوانين السورية)</p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-violet-100 dark:from-purple-900/30 dark:to-violet-900/30 p-6 rounded-xl border-l-4 border-purple-500">
                    <h3 className="font-bold text-purple-700 dark:text-purple-300 text-lg mb-2">حق الاعتراض</h3>
                    <p className="text-sm text-purple-800 dark:text-purple-200">الاعتراض على معالجة البيانات لأغراض معينة</p>
                  </div>
                </div>
              </section>

              <section className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/30 dark:to-orange-900/30 p-6 rounded-xl border-r-4 border-red-500">
                <h2 className="text-xl font-bold text-red-800 dark:text-red-300 mb-4 flex items-center gap-3">
                  <div className="w-3 h-3 bg-red-600 rounded-full"></div>
                  ملاحظة قانونية مهمة
                </h2>
                <p className="text-red-700 dark:text-red-200 leading-relaxed">
                  بموجب القوانين السورية النافذة، قد تكون مديرية المالية ملزمة بالاحتفاظ ببعض البيانات لفترات محددة 
                  لأغراض التدقيق والمراجعة والالتزام القانوني. كما قد تكون هناك حاجة لمشاركة بعض المعلومات مع 
                  الجهات الحكومية الأخرى أو السلطات المختصة عند الضرورة القانونية.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-900 dark:from-white dark:to-gray-200 bg-clip-text text-transparent mb-4">7. الاتصال والشكاوى</h2>
                <div className="bg-gradient-to-br from-slate-50 to-gray-100 dark:from-slate-800 dark:to-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
                  <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">للاستفسارات المتعلقة بسياسة الخصوصية أو ممارسة حقوقك في البيانات:</p>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="font-semibold text-blue-700 dark:text-blue-300">البريد الإلكتروني:</span> 
                      <span className="text-gray-700 dark:text-gray-300">privacy@aleppo-finance.gov.sy</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="font-semibold text-green-700 dark:text-green-300">الهاتف:</span> 
                      <span className="text-gray-700 dark:text-gray-300">021-1234567</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-purple-500 rounded-full mt-1.5 flex-shrink-0"></div>
                      <div>
                        <span className="font-semibold text-purple-700 dark:text-purple-300">العنوان:</span> 
                        <span className="text-gray-700 dark:text-gray-300">مديرية المالية، محافظة حلب، الجمهورية العربية السورية</span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              <div className="text-center mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 p-6 rounded-xl border-r-4 border-blue-500">
                <p className="text-blue-800 dark:text-blue-200 leading-relaxed mb-4">
                  <span className="font-bold text-blue-900 dark:text-blue-300">إشعار التحديث:</span> قد يتم تحديث هذه السياسة من وقت لآخر. سنقوم بإشعار المستخدمين بأي تغييرات جوهرية 
                  من خلال الموقع أو البريد الإلكتروني.
                </p>
                <Button
                  onClick={() => {
                    cookieManager.clearPreferences();
                    window.location.reload();
                  }}
                  variant="primary"
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 px-6 py-3"
                >
                  إعادة تعيين تفضيلات ملفات تعريف الارتباط
                </Button>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  );
};

export default PrivacyPage;