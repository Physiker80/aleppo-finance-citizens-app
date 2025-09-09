import React, { useEffect, useState } from 'react';

const PrivacyPage: React.FC = () => {
  const [customHtml, setCustomHtml] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('privacyHtml');
      setCustomHtml(saved && saved.trim() ? saved : null);
    } catch { setCustomHtml(null); }
  }, []);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="rounded-2xl p-8 transition-all duration-300 border border-white/20 dark:border-white/10 bg-white/80 dark:bg-gray-900/70 backdrop-blur shadow">
        <header className="mb-6 text-center">
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-1">سياسة الخصوصية</h1>
          <p className="text-sm text-gray-600 dark:text-gray-300">سياسة الخصوصية لموقع مديرية المالية في محافظة حلب — الجمهورية العربية السورية</p>
        </header>

        {customHtml ? (
          <div dir="rtl" className="prose prose-lg max-w-none text-right leading-8 dark:prose-invert" dangerouslySetInnerHTML={{ __html: customHtml }} />
        ) : (
        <div dir="rtl" className="prose prose-lg max-w-none text-right leading-8 dark:prose-invert">
          <p>
            يرجى قراءة هذه السياسة بعناية لفهم كيفية جمع المعلومات واستخدامها وحمايتها عند تصفحك واستخدامك للموقع الإلكتروني لمديرية المالية في محافظة حلب (يُشار إليه فيما يلي بـ «الموقع»).
          </p>

          <h2 className="text-xl font-bold">1. المعلومات التي نجمعها</h2>
          <ol className="list-decimal pr-6 space-y-1">
            <li>
              <strong>المعلومات الشخصية:</strong> تشمل الاسم، البريد الإلكتروني، رقم الهاتف، والعنوان، عند ملء نماذج التواصل أو التسجيل في الخدمات الإلكترونية.
            </li>
            <li>
              <strong>المعلومات غير الشخصية:</strong> مثل نوع المتصفح، نظام التشغيل، عنوان بروتوكول الإنترنت (IP)، وبيانات التصفح (صفحات الدخول/الخروج وتوقيت الزيارة).
            </li>
          </ol>

          <h2 className="text-xl font-bold mt-6">2. طرق جمع المعلومات</h2>
          <ol className="list-decimal pr-6 space-y-1">
            <li>الإدخال المباشر: عند تعبئة نماذج التواصل أو طلب الخدمات.</li>
            <li>ملفات تعريف الارتباط (Cookies): لجمع بيانات تسهيل التصفح وتحليل استخدام الموقع.</li>
            <li>تقنيات التتبع المماثلة: مثل البِقع الواضحة (Web Beacons) لتقييم فعالية الحملات وتحسين الأداء.</li>
          </ol>

          <h2 className="text-xl font-bold mt-6">3. أهداف استخدام المعلومات</h2>
          <ol className="list-decimal pr-6 space-y-1">
            <li>تقديم الخدمات والرد على الاستفسارات: التواصل مع المستخدمين وتلبية طلباتهم.</li>
            <li>تحسين تجربة المستخدم: تحليل أنماط التصفح وتخصيص المحتوى.</li>
            <li>ضمان أمن الموقع: رصد الأنشطة غير المصرح بها ومنع الهجمات السيبرانية.</li>
            <li>الالتزام القانوني: الاحتفاظ بسجلات للتدقيق والمطالبات القانونية.</li>
          </ol>

          <h2 className="text-xl font-bold mt-6">4. سياسة ملفات تعريف الارتباط</h2>
          <ol className="list-decimal pr-6 space-y-1">
            <li>يستخدم الموقع ملفات Cookies أساسية لتشغيل وظائفه.</li>
            <li>يمكن للمستخدم تعطيل أو حذف الكوكيز من إعدادات المتصفح، مع ملاحظة أن ذلك قد يؤثر على بعض الخدمات.</li>
          </ol>

          <h2 className="text-xl font-bold mt-6">5. مشاركة المعلومات مع جهات خارجية</h2>
          <ol className="list-decimal pr-6 space-y-1">
            <li>لا يتم بيع أو تأجير أي معلومات شخصية لطرف ثالث.</li>
            <li>مقدمو الخدمات: قد نشارك بيانات محدودة مع مزوّدي خدمات تقنية أو استشارية تحت اتفاقيات تحفظ السرية.</li>
            <li>الامتثال القانوني: نكشف المعلومات إذا تطلّب الأمر بأمر قضائي أو لامتثال القوانين واللوائح.</li>
          </ol>

          <h2 className="text-xl font-bold mt-6">6. حماية البيانات</h2>
          <ol className="list-decimal pr-6 space-y-1">
            <li>نتبع ممارسات أمنية معيارية (مثل التشفير وبروتوكولات HTTPS) لحماية البيانات.</li>
            <li>نقيّد الوصول إلى المعلومات الشخصية لموظفين مخوّلين فقط وتخضع جميع عمليات المعالجة لسياسات داخلية صارمة.</li>
          </ol>

          <h2 className="text-xl font-bold mt-6">7. مدة الاحتفاظ بالبيانات</h2>
          <ol className="list-decimal pr-6 space-y-1">
            <li>نحتفظ بالبيانات الشخصية طالما كان ذلك ضرورياً لتحقيق الأغراض المبينة في هذه السياسة أو للامتثال للالتزامات القانونية.</li>
            <li>بعد انتهاء الحاجة، يتم حذف أو إلغاء تنشيط البيانات بأمان وفق إجراءاتنا.</li>
          </ol>

          <h2 className="text-xl font-bold mt-6">8. حقوق المستخدمين</h2>
          <ol className="list-decimal pr-6 space-y-1">
            <li>حق الوصول: يمكنك طلب نسخة من بياناتك الشخصية المحتفظ بها.</li>
            <li>حق التصحيح: إمكانية تصحيح أي بيانات غير دقيقة.</li>
            <li>حق المسح: طلب حذف بياناتك إذا لم تعد هناك حاجة قانونية للاحتفاظ بها.</li>
            <li>حق الاعتراض: الاعتراض على معالجة بياناتك لأغراض تسويقية أو تحليلية.</li>
            <li>يمكن ممارسة هذه الحقوق عبر التواصل مع فريق الخصوصية على البريد الإلكتروني أدناه.</li>
          </ol>

          <h2 className="text-xl font-bold mt-6">9. تعديلات على السياسة</h2>
          <ol className="list-decimal pr-6 space-y-1">
            <li>تحتفظ الجهة بحق تعديل هذه السياسة متى شاءت.</li>
            <li>تصبح التعديلات سارية بمجرد نشرها على الموقع مع الإشارة إلى تاريخ آخر تحديث.</li>
          </ol>

          <h2 className="text-xl font-bold mt-6">10. التواصل والاستفسارات</h2>
          <p>
            لأي استفسار أو طلب يتعلق ببياناتك الشخصية أو هذه السياسة، يُرجى التواصل مع مسؤول الخصوصية عبر البريد الإلكتروني:
            {' '}
            <a href="mailto:privacy@mofa.gov.sy" className="text-blue-600 dark:text-blue-400 hover:underline">privacy@mofa.gov.sy</a>
          </p>

          <p className="text-sm text-gray-600 dark:text-gray-400 mt-6">آخر تحديث: {new Date().toLocaleDateString('ar-SY-u-nu-latn')}</p>
        </div>
        )}
      </div>
    </div>
  );
};

export default PrivacyPage;
