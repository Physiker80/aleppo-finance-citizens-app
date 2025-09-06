import React from 'react';

const Footer: React.FC = () => {
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  return (
    <footer 
      className="relative bg-[#0f3c35] text-white overflow-hidden"
    >
      {/* Background Pattern Overlay */}
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: "url('https://syrian.zone/syid/materials/pattern.svg')",
          backgroundPosition: 'center',
        }}
      ></div>

      {/* Footer Content */}
      <div className="relative z-10 container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center text-center md:text-right space-y-6 md:space-y-0">
          
          {/* Left Section (on desktop): Go to Top */}
          <div className="w-full md:w-1/3 flex justify-center md:justify-start">
            <button 
              onClick={scrollToTop} 
              className="flex items-center space-x-2 rtl:space-x-reverse text-gray-300 hover:text-white transition-colors"
              aria-label="Go to top"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m-7 7l7-7 7 7" />
              </svg>
              <span>اذهب للأعلى</span>
            </button>
          </div>
          
          {/* Center Section: Logo and Copyright */}
          <div className="w-full md:w-1/3 flex flex-col items-center order-first md:order-none">
            <img 
              src="https://syrian.zone/syid/materials/logo.ai.svg" 
              alt="شعار الجمهورية العربية السورية" 
              className="h-12 mb-2" 
            />
            <div className="text-sm text-gray-400 text-center">
              <p>&copy; {new Date().getFullYear()} الجمهورية العربية السورية</p>
              <p>مديرية مالية حلب</p>
              <p>تم تطوير هذا الموقع لتسهيل التواصل وزيادة الشفافية.</p>
            </div>
          </div>

          {/* Right Section (on desktop): Follow Us */}
          <div className="w-full md:w-1/3 flex justify-center md:justify-end">
            <button className="flex items-center space-x-2 rtl:space-x-reverse text-gray-300 hover:text-white transition-colors">
              <span>تابعنا</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12s-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.368a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
              </svg>
            </button>
          </div>

        </div>
      </div>
    </footer>
  );
};

export default Footer;