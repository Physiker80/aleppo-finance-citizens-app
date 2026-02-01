import React, { useEffect, useState, useContext } from 'react';
import { AppContext } from '../App';

const TermsPage: React.FC = () => {
  const appContext = useContext(AppContext);
  const config = appContext?.siteConfig;
  const directorateName = config?.directorateName || "المحافظة";
  const fullDirectorateName = config?.directorateName ? `مديرية ${config.directorateName}` : "المديرية المالية";
  const [customHtml, setCustomHtml] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('termsHtml');
      setCustomHtml(saved && saved.trim() ? saved : null);
    } catch { setCustomHtml(null); }
  }, []);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="rounded-2xl p-8 transition-all duration-300 border border-white/20 dark:border-white/10 bg-white/80 dark:bg-gray-900/70 backdrop-blur shadow">
        <header className="mb-6 text-center">
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-1">الشروط والأحكام</h1>
          <p className="text-sm text-gray-600 dark:text-gray-300">الشروط والأحكام الخاصة بموقع {fullDirectorateName}</p>
        </header>
        {customHtml ? (
          <div dir="rtl" className="prose prose-lg max-w-none text-right leading-8 dark:prose-invert" dangerouslySetInnerHTML={{ __html: customHtml }} />
        ) : (
        <div dir="rtl" className="prose prose-lg max-w-none text-right leading-8 dark:prose-invert">
          <p>
            باستخدامك لهذا الموقع، فإنك توافق على الالتزام بالشروط والأحكام التالية. يُرجى قراءة هذه الشروط بعناية قبل استخدام الموقع أو أي من خدماته.
          </p>

          <h2 className="text-xl font-bold">1. التعاريف</h2>
          <p>
            يُقصد بـ «الموقع» بوابة {fullDirectorateName}. ويُقصد بـ «المستخدم» كل من يتصفح الموقع أو يستعمل خدماته.
          </p>

          <h2 className="text-xl font-bold mt-6">2. قبول الشروط</h2>
          <p>
            يشكّل دخولك إلى الموقع واستخدامك له قبولاً كاملاً لهذه الشروط. إن لم توافق على أي جزء منها، يُرجى التوقف عن استخدام الموقع.
          </p>

          <h2 className="text-xl font-bold mt-6">3. تعديلات الشروط</h2>
          <p>
            نحتفظ بحق تعديل هذه الشروط في أي وقت. تصبح التعديلات نافذة من تاريخ نشرها على هذه الصفحة. استمرارك في استخدام الموقع يعني موافقتك على التعديلات.
          </p>

          <h2 className="text-xl font-bold mt-6">4. استخدام الموقع</h2>
          <ul className="list-disc pr-6 space-y-1">
            <li>يجب استخدام الموقع لأغراض قانونية ومشروعة فقط.</li>
            <li>يلتزم المستخدم بعدم إساءة استخدام الخدمات أو محاولة الوصول غير المصرّح به إلى أي جزء من المنظومة.</li>
            <li>قد تتطلب بعض الخدمات إدخال معلومات صحيحة ودقيقة لاستكمال طلباتك.</li>
          </ul>

          <h2 className="text-xl font-bold mt-6">5. الحسابات والوصول</h2>
          <p>
            في حال تزويدك ببيانات دخول، تتحمّل مسؤولية سرية بيانات حسابك وكافة الأنشطة التي تتم من خلاله، وتوافق على إخطارنا فوراً بأي استخدام غير مصرح به.
          </p>

          <h2 className="text-xl font-bold mt-6">6. المحتوى والملكية الفكرية</h2>
          <ul className="list-disc pr-6 space-y-1">
            <li>المحتوى المعروض على الموقع محمي بموجب قوانين الملكية الفكرية.</li>
            <li>لا يجوز نسخ أو إعادة نشر أي جزء من المحتوى إلا وفق الأنظمة والقوانين المرعية وبعد الحصول على الموافقات اللازمة.</li>
          </ul>

          <h2 className="text-xl font-bold mt-6">7. الخصوصية وحماية البيانات</h2>
          <p>
            يخضع استخدام بياناتك لسياسة الخصوصية الخاصة بالموقع. يُرجى مراجعة صفحة «سياسة الخصوصية» لمعرفة المزيد حول كيفية جمع البيانات واستخدامها وحمايتها.
          </p>

          <h2 className="text-xl font-bold mt-6">8. حدود المسؤولية</h2>
          <p>
            نسعى لتقديم معلومات دقيقة ومحدثة، لكن لا نضمن خلو الموقع من الأخطاء أو الانقطاعات. لا نتحمل أي مسؤولية عن أية أضرار مباشرة أو غير مباشرة ناتجة عن استخدامك للموقع.
          </p>

          <h2 className="text-xl font-bold mt-6">9. الروابط الخارجية</h2>
          <p>
            قد يتضمن الموقع روابط لمواقع خارجية لا نتحكم في محتواها أو سياساتها، ولا نتحمل مسؤولية محتواها أو ممارساتها.
          </p>

          <h2 className="text-xl font-bold mt-6">10. القانون الواجب التطبيق والاختصاص</h2>
          <p>
            تخضع هذه الشروط لأحكام القوانين النافذة في الجمهورية العربية السورية، ويُختص القضاء السوري بالنظر في أي نزاع ينشأ عنها.
          </p>

          <h2 className="text-xl font-bold mt-6">11. الاتصال</h2>
          <p>
            لأي استفسارات تتعلق بهذه الشروط، يُرجى التواصل عبر البريد الإلكتروني:
            {' '}
            <a href="mailto:info@mof.gov.sy" className="text-blue-600 dark:text-blue-400 hover:underline">info@mof.gov.sy</a>
          </p>

          <p className="text-sm text-gray-600 dark:text-gray-400 mt-6">آخر تحديث: {new Date().toLocaleDateString('ar-SY-u-nu-latn')}</p>
        </div>
        )}
      </div>
    </div>
  );
};

export default TermsPage;
