import React from 'react';
import { FaFacebookF, FaTelegramPlane, FaInstagram } from 'react-icons/fa';
import { MdOutlineEmail } from 'react-icons/md';

const Footer: React.FC = () => {
  // Using the official Syrian government identity logo
  const ministryLogo = 'https://syrian.zone/syid/materials/logo.ai.svg'; 

  return (
    <footer className="bg-transparent text-gray-500 dark:text-gray-300 font-heading mt-auto border-t border-gray-200 dark:border-gray-500/30">
      <div className="container mx-auto px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          
          {/* Ministry Logo Column */}
          <div className="flex flex-col items-center md:items-start text-center md:text-right">
            <img src={ministryLogo} alt="شعار وزارة المالية" className="h-24 w-24 object-contain mb-4" />
            <h3 className="text-2xl font-bold font-heading" style={{ color: '#988561' }}>وزارة المالية</h3>
            <p className="text-sm uppercase tracking-wider" style={{ color: '#988561' }}>Ministry of Finance</p>
          </div>

          {/* Important Links Column */}
          <div>
            <h4 className="text-lg font-bold mb-4 border-b-2 border-green-500 pb-2 inline-block">روابط مهمة</h4>
            <ul className="space-y-3">
              <li><a href="#/news" className="hover:text-black dark:hover:text-white transition-colors">الأخبار</a></li>
              <li><a href="#/faq" className="hover:text-black dark:hover:text-white transition-colors">الأسئلة الشائعة</a></li>
              <li><a href="#/privacy" className="hover:text-black dark:hover:text-white transition-colors">سياسة الخصوصية</a></li>
              <li><a href="#/terms" className="hover:text-black dark:hover:text-white transition-colors">الشروط والأحكام</a></li>
            </ul>
          </div>

          {/* Citizen Services Column */}
          <div>
            <h4 className="text-lg font-bold mb-4 border-b-2 border-green-500 pb-2 inline-block">خدمات المواطنين</h4>
            <ul className="space-y-3">
              <li><a href="#/services" className="hover:text-black dark:hover:text-white transition-colors">الخدمات</a></li>
              <li><a href="#/contact" className="hover:text-black dark:hover:text-white transition-colors">تواصل معنا</a></li>
            </ul>
          </div>

          {/* Follow Us Column */}
          <div>
            <h4 className="text-lg font-bold mb-4 border-b-2 border-green-500 pb-2 inline-block">تابعنا على</h4>
            <div className="flex space-x-4 rtl:space-x-reverse mt-4">
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