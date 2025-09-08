import React from 'react';
import { FaFacebookF, FaTelegramPlane, FaInstagram } from 'react-icons/fa';
import { MdOutlineEmail } from 'react-icons/md';

const Footer: React.FC = () => {
  // Using the official Syrian government identity logo
  const ministryLogo = 'https://syrian.zone/syid/materials/logo.ai.svg'; 

  return (
    <footer className="bg-transparent text-gray-500 dark:text-gray-300 font-heading mt-auto border-t border-gray-200 dark:border-gray-500/30">
      <div className="container mx-auto px-6 py-10">
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5 lg:gap-4 divide-y divide-gray-200 dark:divide-gray-700/40 md:divide-y-0 lg:divide-x lg:rtl:divide-x-reverse">
          
          {/* Ministry section: brief + merged logo tile */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2 text-right px-1 lg:px-4 md:col-span-2 lg:col-span-2" dir="rtl">
            <div className="flex flex-col items-center text-center w-full md:w-[190px] md:shrink-0 order-2 md:order-1 bg-transparent border-0 p-0">
              <img src={ministryLogo} alt="شعار وزارة المالية" className="h-16 md:h-20 w-auto object-contain mb-2" />
              <div className="text-lg md:text-xl font-bold" style={{ color: '#988561' }}>وزارة المالية</div>
              <div className="text-xs md:text-sm uppercase tracking-wider" style={{ color: '#988561' }}>MINISTRY OF FINANCE</div>
            </div>
            <div className="flex-[4] min-w-0 order-1 md:order-2">
              <h4 className="text-lg font-bold mb-3 border-b-2 border-green-500 pb-2 inline-block">وزارة المالية</h4>
              <p className="text-base leading-8 text-gray-700 dark:text-gray-300 mt-1 text-justify">
                تسعى وزارة المالية في الجمهورية العربية السورية إلى إدارة المال العام بكفاءة وشفافية، وتحديث
                الأنظمة المالية والضريبية، ودعم التحول الرقمي للخدمات الحكومية بما يضمن تبسيط الإجراءات ورفع جودة
                الخدمة المقدّمة للمواطنين، وتحقيق الانضباط المالي والاستدامة في الإنفاق العام.
              </p>
            </div>
          </div>

          {/* Important Links Column */}
          <div className="px-1 lg:px-3">
            <h4 className="text-lg font-bold mb-3 border-b-2 border-green-500 pb-2 inline-block">روابط مهمة</h4>
            <ul className="space-y-2.5">
              <li><a href="#/news" className="hover:text-black dark:hover:text-white transition-colors">الأخبار</a></li>
              <li><a href="#/faq" className="hover:text-black dark:hover:text-white transition-colors">الأسئلة الشائعة</a></li>
              <li><a href="#/departments" className="hover:text-black dark:hover:text-white transition-colors">الهيكل الإداري</a></li>
              <li><a href="#/privacy" className="hover:text-black dark:hover:text-white transition-colors">سياسة الخصوصية</a></li>
              <li><a href="#/terms" className="hover:text-black dark:hover:text-white transition-colors">الشروط والأحكام</a></li>
            </ul>
          </div>

          {/* Citizen Services Column */}
          <div className="px-1 lg:px-3">
            <h4 className="text-lg font-bold mb-3 border-b-2 border-green-500 pb-2 inline-block">خدمات المواطنين</h4>
            <ul className="space-y-2.5">
              <li><a href="#/services" className="hover:text-black dark:hover:text-white transition-colors">الخدمات</a></li>
              <li><a href="#/contact" className="hover:text-black dark:hover:text-white transition-colors">تواصل معنا</a></li>
            </ul>
          </div>

          {/* Follow Us Column */}
          <div className="px-1 lg:px-3">
            <h4 className="text-lg font-bold mb-3 border-b-2 border-green-500 pb-2 inline-block">تابعنا على</h4>
            <div className="flex space-x-3 rtl:space-x-reverse mt-3">
              <a href="mailto:info@syrian-finance.gov.sy" className="text-2xl hover:text-black dark:hover:text-white transition-colors"><MdOutlineEmail /></a>
              <a href="https://www.instagram.com" target="_blank" rel="noopener noreferrer" className="text-2xl hover:text-black dark:hover:text-white transition-colors"><FaInstagram /></a>
              <a href="https://t.me" target="_blank" rel="noopener noreferrer" className="text-2xl hover:text-black dark:hover:text-white transition-colors"><FaTelegramPlane /></a>
              <a href="https://www.facebook.com" target="_blank" rel="noopener noreferrer" className="text-2xl hover:text-black dark:hover:text-white transition-colors"><FaFacebookF /></a>
            </div>
          </div>

        </div>
      </div>
      <div className="bg-transparent py-4">
        <div className="container mx-auto text-center text-sm text-gray-500 dark:text-gray-400">
          <p>وزارة المالية - الجمهورية العربية السورية | جميع الحقوق محفوظة © {new Date().getFullYear()}</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;