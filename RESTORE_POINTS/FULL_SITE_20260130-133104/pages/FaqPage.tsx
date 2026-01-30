import React, { useMemo, useState } from 'react';
import { FAQ_DATA } from '../constants';
import Card from '../components/ui/Card';

const FaqItemComponent: React.FC<{ item: { question: string; answer: string } }> = ({ item }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b dark:border-gray-700">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex justify-between items-center w-full py-5 text-right"
      >
        <span className="text-lg font-semibold text-gray-800 dark:text-gray-100">{item.question}</span>
        <svg
          className={`w-6 h-6 text-gray-500 dark:text-gray-400 transform transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
        </svg>
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96' : 'max-h-0'}`}
      >
        <div className="pb-5 pr-4 text-gray-600 dark:text-gray-400 leading-relaxed">
          {item.answer}
        </div>
      </div>
    </div>
  );
};

const FaqPage: React.FC = () => {
  const items = useMemo(() => {
    try {
      const saved = localStorage.getItem('faqItems');
      if (saved) return JSON.parse(saved);
    } catch { /* ignore */ }
    return FAQ_DATA;
  }, []);

  return (
    <Card>
      {/* الشعار الرسمي */}
      <div className="mb-8 flex flex-col items-center">
        <img 
          src="https://syrian.zone/syid/materials/logo.ai.svg" 
          alt="شعار الجمهورية العربية السورية" 
          className="w-32 h-32 mx-auto filter drop-shadow-lg opacity-90 hover:opacity-100 transition-opacity duration-300"
          onError={(e) => {
            const img = e.currentTarget as HTMLImageElement;
            // fallback to local logo if remote fails
            img.src = '/logo.ai.svg';
          }}
        />
      </div>
      
      <h2 className="text-3xl font-bold text-center text-gray-800 dark:text-gray-100 mb-2">قاعدة المعرفة والأسئلة الشائعة</h2>
      <p className="text-center text-gray-600 dark:text-gray-400 mb-8">
        ابحث عن إجابات للأسئلة الأكثر تكراراً لتوفر على نفسك الوقت والجهد.
      </p>
      <div className="space-y-4">
        {items.map((item: any, index: number) => (
          <FaqItemComponent key={index} item={item} />
        ))}
      </div>
    </Card>
  );
};

export default FaqPage;