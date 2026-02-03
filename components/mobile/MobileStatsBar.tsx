/**
 * MobileStatsBar - شريط الإحصائيات السفلي للموبايل
 * 
 * يعرض الإحصائيات الرئيسية في شريط ثابت أسفل الشاشة
 * مع إمكانية النقر لعرض التفاصيل في bottom sheet
 */

import React, { useState, useEffect, useMemo, useContext } from 'react';
import { AppContext } from '../../App';

interface StatItem {
  id: string;
  icon: React.ReactNode;
  value: string | number;
  label: string;
  color: string;
  bgColor: string;
  details?: {
    title: string;
    description: string;
    items?: string[];
  };
}

const MobileStatsBar: React.FC = () => {
  const [activeSheet, setActiveSheet] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  
  const app = useContext(AppContext);
  const surveys = app?.surveys || [];
  
  const surveyStats = useMemo(() => {
    if (!surveys.length) return { count: 0, avg: 0, recommendPct: 0 };
    let sum = 0, yes = 0, totalRec = 0;
    surveys.forEach((s: any) => { 
      sum += s.rating; 
      if (typeof s.wouldRecommend === 'boolean') { 
        totalRec++; 
        if (s.wouldRecommend) yes++; 
      } 
    });
    return { 
      count: surveys.length, 
      avg: sum / surveys.length, 
      recommendPct: totalRec ? (yes / totalRec) * 100 : 0 
    };
  }, [surveys]);

  // إخفاء الشريط عند التمرير للأسفل
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setIsVisible(currentScrollY <= lastScrollY || currentScrollY < 50);
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  // بيانات الإحصائيات
  const stats: StatItem[] = [
    {
      id: 'total',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      value: '2,847',
      label: 'الطلبات',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
      details: {
        title: 'إجمالي الطلبات',
        description: 'عدد الطلبات المقدمة منذ بداية العام',
        items: ['استعلامات: 1,523', 'شكاوى: 892', 'اقتراحات: 432']
      }
    },
    {
      id: 'completed',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      value: '76%',
      label: 'مكتملة',
      color: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
      details: {
        title: 'معدل الإنجاز',
        description: 'نسبة الطلبات المكتملة من إجمالي الطلبات',
        items: ['مكتملة: 2,156', 'قيد المعالجة: 691', 'متوسط المعالجة: 48 ساعة']
      }
    },
    {
      id: 'satisfaction',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      value: surveyStats.count > 0 ? `${surveyStats.avg.toFixed(1)}⭐` : '82%',
      label: 'الرضا',
      color: 'text-amber-600',
      bgColor: 'bg-amber-100 dark:bg-amber-900/30',
      details: {
        title: 'رضا المواطنين',
        description: 'مستوى رضا المواطنين عن الخدمة المقدمة',
        items: surveyStats.count > 0 
          ? [`${surveyStats.count} مشاركة`, `${Math.round(surveyStats.recommendPct)}% يوصون بالخدمة`]
          : ['تقييم ممتاز: 45%', 'تقييم جيد: 37%', 'تقييم مقبول: 18%']
      }
    },
    {
      id: 'sla',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      value: '93%',
      label: 'SLA',
      color: 'text-purple-600',
      bgColor: 'bg-purple-100 dark:bg-purple-900/30',
      details: {
        title: 'الالتزام بـ SLA',
        description: 'نسبة الالتزام بمستوى الخدمة المحدد',
        items: ['الرد خلال 24 ساعة', 'المعالجة خلال 72 ساعة', 'المتابعة المستمرة']
      }
    }
  ];

  const openSheet = (id: string) => {
    setActiveSheet(id);
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
  };

  const closeSheet = () => {
    setActiveSheet(null);
    document.body.style.overflow = '';
  };

  const activeStat = stats.find(s => s.id === activeSheet);

  return (
    <>
      {/* Stats Bar */}
      <div 
        className={`
          fixed bottom-0 left-0 right-0 z-40
          transform transition-transform duration-300 ease-out
          ${isVisible ? 'translate-y-0' : 'translate-y-full'}
        `}
      >
        {/* Gradient Shadow */}
        <div className="h-4 bg-gradient-to-t from-white/80 dark:from-gray-900/80 to-transparent pointer-events-none" />
        
        {/* Bar Content */}
        <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border-t border-gray-200/50 dark:border-gray-700/50 shadow-2xl shadow-black/10">
          {/* Safe area padding for iOS */}
          <div className="px-2 py-2 pb-safe">
            <div className="flex items-center justify-around">
              {stats.map((stat) => (
                <button
                  key={stat.id}
                  onClick={() => openSheet(stat.id)}
                  className="flex flex-col items-center py-1 px-2 rounded-xl transition-all duration-200 active:scale-95 active:bg-gray-100 dark:active:bg-gray-700/50 min-w-[70px]"
                >
                  {/* Icon with background */}
                  <div className={`w-10 h-10 rounded-xl ${stat.bgColor} flex items-center justify-center mb-1 ${stat.color}`}>
                    {stat.icon}
                  </div>
                  
                  {/* Value */}
                  <span className={`text-sm font-bold ${stat.color}`}>
                    {stat.value}
                  </span>
                  
                  {/* Label */}
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">
                    {stat.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Sheet Modal */}
      {activeSheet && activeStat && (
        <div 
          className="fixed inset-0 z-50 flex items-end justify-center"
          onClick={closeSheet}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fadeIn" />
          
          {/* Sheet Content */}
          <div 
            className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-t-3xl shadow-2xl animate-slideUp"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full" />
            </div>
            
            {/* Header */}
            <div className="px-6 pb-4 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl ${activeStat.bgColor} flex items-center justify-center ${activeStat.color}`}>
                  <div className="scale-125">{activeStat.icon}</div>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    {activeStat.details?.title}
                  </h3>
                  <p className="text-3xl font-black mt-1 ${activeStat.color}">
                    <span className={activeStat.color}>{activeStat.value}</span>
                  </p>
                </div>
              </div>
            </div>
            
            {/* Content */}
            <div className="px-6 py-5">
              <p className="text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
                {activeStat.details?.description}
              </p>
              
              {activeStat.details?.items && (
                <div className="space-y-2">
                  {activeStat.details.items.map((item, index) => (
                    <div 
                      key={index}
                      className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50"
                    >
                      <div className={`w-2 h-2 rounded-full ${activeStat.bgColor.replace('100', '500').replace('/30', '')}`} />
                      <span className="text-gray-700 dark:text-gray-200 text-sm font-medium">
                        {item}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Action Button */}
            <div className="px-6 pb-6 pb-safe">
              <button
                onClick={closeSheet}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-lg shadow-lg shadow-emerald-500/25 active:scale-[0.98] transition-transform"
              >
                حسناً
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSS Animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes slideUp {
          from { 
            opacity: 0;
            transform: translateY(100%); 
          }
          to { 
            opacity: 1;
            transform: translateY(0); 
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out forwards;
        }
        
        .animate-slideUp {
          animation: slideUp 0.3s ease-out forwards;
        }
        
        .pb-safe {
          padding-bottom: max(1rem, env(safe-area-inset-bottom));
        }
      `}</style>
    </>
  );
};

export default MobileStatsBar;
