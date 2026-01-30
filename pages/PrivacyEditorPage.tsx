import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '../App';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import TextArea from '../components/ui/TextArea';
import { formatDate } from '../utils/arabicNumerals';
import { FiArrowRight, FiSave, FiEye, FiRefreshCw, FiEdit, FiCode } from 'react-icons/fi';

/**
 * صفحة تحرير سياسة الخصوصية وحماية البيانات
 * Privacy Policy Editor Page
 * 
 * صفحة مخصصة لمديري النظام لتحرير وإدارة سياسة الخصوصية
 * وحماية البيانات مع معاينة مباشرة وحفظ التغييرات
 */
const PrivacyEditorPage: React.FC = () => {
  const appContext = useContext(AppContext);
  const [content, setContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [previewMode, setPreviewMode] = useState<'edit' | 'preview'>('edit');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // التحقق من صلاحية المدير
  const isAdmin = appContext?.currentEmployee?.role === 'مدير';

  useEffect(() => {
    loadPrivacyContent();
  }, []);

  // تحميل محتوى سياسة الخصوصية
  const loadPrivacyContent = () => {
    try {
      const savedContent = localStorage.getItem('privacyHtml');
      if (savedContent) {
        setContent(savedContent);
      } else {
        setContent(getDefaultPrivacyContent());
      }
      
      const savedDate = localStorage.getItem('privacyLastUpdated');
      if (savedDate) {
        setLastSaved(new Date(savedDate));
      }
    } catch (error) {
      console.error('خطأ في تحميل محتوى سياسة الخصوصية:', error);
      setContent(getDefaultPrivacyContent());
    }
  };

  // المحتوى الافتراضي لسياسة الخصوصية
  const getDefaultPrivacyContent = () => {
    return `
      <div class="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 p-6 rounded-xl border-r-4 border-blue-500 mb-6">
        <p class="text-blue-900 dark:text-blue-200 leading-relaxed">
          <span class="font-bold text-blue-800 dark:text-blue-300">مقدمة:</span> يرجى قراءة هذه السياسة بعناية لفهم كيفية جمع المعلومات واستخدامها وحمايتها 
          عند تصفحك واستخدامك للموقع الإلكتروني لمديرية المالية في محافظة حلب.
        </p>
      </div>

      <section class="mb-8">
        <h2 class="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-900 dark:from-white dark:to-gray-200 bg-clip-text text-transparent mb-4">
          1. المعلومات التي نجمعها
        </h2>
        <div class="space-y-6">
          <div class="bg-white dark:bg-gray-800 p-5 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
            <h3 class="text-lg font-semibold text-indigo-700 dark:text-indigo-300 mb-3">المعلومات الشخصية:</h3>
            <ul class="list-disc pr-6 space-y-2 text-gray-700 dark:text-gray-300">
              <li>الاسم الكامل والهوية الوطنية</li>
              <li>البريد الإلكتروني وأرقام الهاتف</li>
              <li>العنوان والبيانات الديموغرافية</li>
              <li>تفاصيل الاستعلامات والشكاوى المقدمة</li>
              <li>الملفات والوثائق المرفوعة</li>
            </ul>
          </div>
        </div>
      </section>

      <section class="mb-8">
        <h2 class="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-900 dark:from-white dark:to-gray-200 bg-clip-text text-transparent mb-4">
          2. كيفية استخدام المعلومات
        </h2>
        <div class="bg-green-50 dark:bg-green-900/30 p-5 rounded-lg border border-green-200 dark:border-green-700">
          <p class="text-green-800 dark:text-green-200">
            نستخدم المعلومات المجمعة لتقديم الخدمات الحكومية، معالجة الاستعلامات والشكاوى، 
            والتواصل مع المواطنين بخصوص طلباتهم وتحسين جودة الخدمات المقدمة.
          </p>
        </div>
      </section>

      <section class="mb-8">
        <h2 class="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-900 dark:from-white dark:to-gray-200 bg-clip-text text-transparent mb-4">
          3. حماية البيانات
        </h2>
        <div class="bg-red-50 dark:bg-red-900/30 p-5 rounded-lg border border-red-200 dark:border-red-700">
          <p class="text-red-800 dark:text-red-200">
            نطبق أعلى معايير الأمان لحماية بياناتكم، بما في ذلك التشفير، المصادقة الآمنة، 
            ومراقبة الوصول المستمرة لضمان سرية وأمان المعلومات.
          </p>
        </div>
      </section>

      <section class="mb-8">
        <h2 class="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-900 dark:from-white dark:to-gray-200 bg-clip-text text-transparent mb-4">
          4. حقوق المواطنين
        </h2>
        <div class="bg-purple-50 dark:bg-purple-900/30 p-5 rounded-lg border border-purple-200 dark:border-purple-700">
          <ul class="list-disc pr-6 space-y-2 text-purple-800 dark:text-purple-200">
            <li>الحق في الوصول إلى بياناتكم الشخصية</li>
            <li>الحق في تصحيح أو تحديث المعلومات</li>
            <li>الحق في حذف البيانات غير الضرورية</li>
            <li>الحق في تقييد معالجة البيانات</li>
            <li>الحق في نقل البيانات</li>
          </ul>
        </div>
      </section>
    `;
  };

  // حفظ التغييرات
  const saveContent = async () => {
    if (!hasChanges) return;
    
    setIsLoading(true);
    try {
      localStorage.setItem('privacyHtml', content);
      const now = new Date();
      localStorage.setItem('privacyLastUpdated', now.toISOString());
      setLastSaved(now);
      setHasChanges(false);
      
      // حفظ في سجل التغييرات للمراجعة
      const changeLog = JSON.parse(localStorage.getItem('privacyChangeLog') || '[]');
      changeLog.push({
        timestamp: now.toISOString(),
        editor: appContext?.currentEmployee?.username,
        contentLength: content.length,
        action: 'تحديث سياسة الخصوصية'
      });
      localStorage.setItem('privacyChangeLog', JSON.stringify(changeLog.slice(-50))); // الاحتفاظ بآخر 50 تغيير
      
      alert('تم حفظ سياسة الخصوصية بنجاح!');
    } catch (error) {
      console.error('خطأ في حفظ سياسة الخصوصية:', error);
      alert('حدث خطأ في حفظ التغييرات');
    } finally {
      setIsLoading(false);
    }
  };

  // التراجع عن التغييرات
  const resetContent = () => {
    if (confirm('هل أنت متأكد من التراجع عن جميع التغييرات غير المحفوظة؟')) {
      loadPrivacyContent();
      setHasChanges(false);
    }
  };

  // معاينة الصفحة الفعلية
  const previewPage = () => {
    window.open('/#/privacy', '_blank');
  };

  // تعامل مع تغيير المحتوى
  const handleContentChange = (value: string) => {
    setContent(value);
    setHasChanges(true);
  };

  // التحقق من تسجيل الدخول والصلاحية
  if (!appContext?.isEmployeeLoggedIn || !appContext.currentEmployee) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <div className="text-center p-8">
            <div className="w-16 h-16 bg-gray-300 mx-auto mb-4 rounded-full flex items-center justify-center">
              🔒
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              مطلوب تسجيل الدخول
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              يجب تسجيل الدخول للوصول إلى محرر سياسة الخصوصية
            </p>
            <Button onClick={() => window.location.hash = '#/login'}>
              تسجيل الدخول
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // التحقق من الصلاحية
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <div className="text-center p-8">
            <div className="w-16 h-16 bg-red-100 mx-auto mb-4 rounded-full flex items-center justify-center">
              ⚠️
            </div>
            <h2 className="text-xl font-semibold text-red-800 dark:text-red-200 mb-2">
              غير مصرح
            </h2>
            <p className="text-red-600 dark:text-red-400 mb-4">
              هذه الصفحة مخصصة لمديري النظام فقط
            </p>
            <Button onClick={() => window.location.hash = '#/dashboard'}>
              العودة للوحة التحكم
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <Card>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              onClick={() => window.location.hash = '#/dashboard'}
              variant="secondary"
              className="flex items-center gap-2"
            >
              <FiArrowRight />
              العودة
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                محرر سياسة الخصوصية وحماية البيانات
              </h1>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                تحرير وإدارة سياسة الخصوصية للموقع الإلكتروني
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {lastSaved && (
              <span className="text-xs text-gray-500">
                آخر حفظ: {formatDate(lastSaved)}
              </span>
            )}
            <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => setPreviewMode('edit')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  previewMode === 'edit'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                <FiEdit className="inline mr-1" />
                تحرير
              </button>
              <button
                onClick={() => setPreviewMode('preview')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  previewMode === 'preview'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                <FiEye className="inline mr-1" />
                معاينة
              </button>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* محرر المحتوى */}
        <div className="lg:col-span-2">
          <Card>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  محتوى سياسة الخصوصية
                </h3>
                <div className="flex items-center gap-2">
                  {hasChanges && (
                    <span className="text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200 px-2 py-1 rounded">
                      غير محفوظ
                    </span>
                  )}
                  <span className="text-xs text-gray-500">
                    {content.length} حرف
                  </span>
                </div>
              </div>

              {previewMode === 'edit' ? (
                <TextArea
                  label=""
                  id="privacy-content"
                  value={content}
                  onChange={(e) => handleContentChange(e.target.value)}
                  rows={20}
                  className="font-mono text-sm"
                  placeholder="أدخل محتوى سياسة الخصوصية بتنسيق HTML..."
                />
              ) : (
                <div 
                  className="min-h-[400px] p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800"
                  dangerouslySetInnerHTML={{ __html: content }}
                />
              )}

              <div className="flex items-center gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button
                  onClick={saveContent}
                  disabled={!hasChanges || isLoading}
                  className="flex items-center gap-2"
                >
                  <FiSave />
                  {isLoading ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                </Button>
                
                <Button
                  onClick={resetContent}
                  variant="secondary"
                  disabled={!hasChanges}
                  className="flex items-center gap-2"
                >
                  <FiRefreshCw />
                  إلغاء التغييرات
                </Button>
                
                <Button
                  onClick={previewPage}
                  variant="secondary"
                  className="flex items-center gap-2"
                >
                  <FiEye />
                  معاينة الصفحة
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* الشريط الجانبي - أدوات ونصائح */}
        <div className="space-y-6">
          {/* نصائح التحرير */}
          <Card>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
              نصائح التحرير
            </h4>
            <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
              <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded">
                <strong className="text-blue-700 dark:text-blue-300">HTML:</strong>
                <p>يمكنك استخدام HTML لتنسيق المحتوى</p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/30 p-3 rounded">
                <strong className="text-green-700 dark:text-green-300">CSS Classes:</strong>
                <p>استخدم فئات Tailwind للتصميم</p>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/30 p-3 rounded">
                <strong className="text-purple-700 dark:text-purple-300">RTL:</strong>
                <p>تأكد من دعم النص العربي من اليمين لليسار</p>
              </div>
            </div>
          </Card>

          {/* العلامات المفيدة */}
          <Card>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
              علامات HTML مفيدة
            </h4>
            <div className="space-y-2 text-xs text-gray-600 dark:text-gray-400">
              <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded font-mono">
                &lt;h2&gt;عنوان رئيسي&lt;/h2&gt;
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded font-mono">
                &lt;p&gt;فقرة نص&lt;/p&gt;
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded font-mono">
                &lt;ul&gt;&lt;li&gt;عنصر قائمة&lt;/li&gt;&lt;/ul&gt;
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded font-mono">
                &lt;strong&gt;نص عريض&lt;/strong&gt;
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded font-mono">
                &lt;div class="bg-blue-50 p-4"&gt;صندوق ملون&lt;/div&gt;
              </div>
            </div>
          </Card>

          {/* الإجراءات السريعة */}
          <Card>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
              إجراءات سريعة
            </h4>
            <div className="space-y-2">
              <Button
                onClick={() => setContent(getDefaultPrivacyContent())}
                variant="secondary"
                className="w-full text-sm"
              >
                إعادة تعيين للمحتوى الافتراضي
              </Button>
              <Button
                onClick={() => {
                  const template = `
                    <section class="mb-8">
                      <h2 class="text-2xl font-bold mb-4">عنوان القسم</h2>
                      <p class="text-gray-700 dark:text-gray-300">محتوى القسم...</p>
                    </section>
                  `;
                  setContent(content + template);
                  setHasChanges(true);
                }}
                variant="secondary"
                className="w-full text-sm"
              >
                إضافة قسم جديد
              </Button>
            </div>
          </Card>

          {/* معلومات النسخة */}
          <Card>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
              معلومات النسخة
            </h4>
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <p><strong>المحرر:</strong> {appContext?.currentEmployee?.username}</p>
              <p><strong>آخر تحديث:</strong> {lastSaved ? formatDate(lastSaved) : 'غير محدد'}</p>
              <p><strong>حالة المحتوى:</strong> {hasChanges ? '🔄 معدل' : '✅ محفوظ'}</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PrivacyEditorPage;