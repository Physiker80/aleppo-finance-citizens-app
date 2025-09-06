import React from 'react';
import { NEWS_DATA } from '../constants';
import Card from '../components/ui/Card';

const NewsPage: React.FC = () => {
  return (
    <div>
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-2">الأخبار والإعلانات الرسمية</h2>
        <p className="text-gray-600 dark:text-gray-400">
          تابع آخر المستجدات والقرارات الصادرة عن مديرية مالية حلب.
        </p>
      </div>
      <div className="space-y-6">
        {NEWS_DATA.map((item, index) => (
          <Card key={index} className="transition-shadow duration-300 hover:shadow-lg">
            <h3 className="text-xl font-bold text-blue-700 dark:text-blue-400 mb-2">{item.title}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">{item.date}</p>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{item.content}</p>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default NewsPage;