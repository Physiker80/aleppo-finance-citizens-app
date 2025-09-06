import React from 'react';
import Card from '../components/ui/Card';

const HomePage: React.FC = () => {
  const ActionCard: React.FC<{
    title: string;
    description: string;
    href: string;
  icon: React.ReactNode;
  }> = ({ title, description, href, icon }) => (
    <a href={href} className="block group">
        <Card className="text-center hover:shadow-xl hover:-translate-y-1 transition-all duration-300 h-full">
            <div className="mx-auto h-16 w-16 text-blue-600 bg-blue-100 dark:bg-blue-900/50 dark:text-blue-300 rounded-full flex items-center justify-center mb-4 transition-colors duration-300 group-hover:bg-blue-600 group-hover:text-white dark:group-hover:bg-blue-500">
                {icon}
            </div>
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">{title}</h3>
            <p className="text-gray-600 dark:text-gray-400">{description}</p>
        </Card>
    </a>
  );
    
  return (
    <div className="space-y-12">
      <div className="text-center py-12 bg-white dark:bg-gray-800/50 rounded-lg shadow-md">
        <h1 className="text-4xl md:text-5xl font-bold text-blue-800 dark:text-blue-300 mb-4">
          أهلاً بكم في البوابة الإلكترونية لمديرية مالية حلب
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
          نوفر لكم قناة رسمية وموثوقة لتقديم الاستعلامات والشكاوى ومتابعتها بكل سهولة وشفافية.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <ActionCard
          title="تقديم طلب جديد"
          description="يمكنك تقديم شكوى أو استعلام جديد بسهولة عبر ملء النموذج الإلكتروني وإرفاق المستندات اللازمة."
          href="#/submit"
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>}
        />
        <ActionCard
          title="متابعة حالة طلب"
          description="استخدم رقم التتبع الذي حصلت عليه عند تقديم الطلب لمعرفة حالته الحالية والإجراءات التي تمت عليه."
          href="#/track"
          icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>}
        />
      </div>
    </div>
  );
};

export default HomePage;