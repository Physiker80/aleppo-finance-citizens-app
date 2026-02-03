/**
 * MobileStatsBar - شريط الإحصائيات السفلي للموبايل
 * 
 * يعرض 3 أقسام رئيسية: مؤشرات الأداء | الإحصائيات | لماذا تختار خدماتنا
 * مع bottom sheet لكل قسم
 */

import React, { useState, useEffect, useMemo, useContext } from 'react';
import { AppContext } from '../../App';

type SheetType = 'kpis' | 'stats' | 'features' | null;

const MobileStatsBar: React.FC = () => {
  const [activeSheet, setActiveSheet] = useState<SheetType>(null);
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

  // بيانات الأزرار الثلاثة
  const tabs = [
    {
      id: 'kpis' as const,
      label: 'مؤشرات الأداء',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      color: 'emerald'
    },
    {
      id: 'stats' as const,
      label: 'الإحصائيات',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
        </svg>
      ),
      color: 'blue'
    },
    {
      id: 'features' as const,
      label: 'لماذا نحن؟',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
      ),
      color: 'amber'
    }
  ];

  // بيانات مؤشرات الأداء
  const kpis = [
    { title: 'الالتزام بـ SLA', value: '93%', icon: '✓', color: 'green', desc: 'مستوى الخدمة الممتاز' },
    { title: 'رضا العملاء', value: surveyStats.count > 0 ? `${surveyStats.avg.toFixed(1)}⭐` : '82%', icon: '😊', color: 'blue', desc: 'تقييم المواطنين' },
    { title: 'الحل من المرة الأولى', value: '72%', icon: '⚡', color: 'purple', desc: 'كفاءة الحل' },
    { title: 'مؤشر NPS', value: '55', icon: '📊', color: 'orange', desc: 'صافي الترويج' }
  ];

  // بيانات الإحصائيات
  const stats = [
    { label: 'إجمالي الطلبات', value: '2,847', color: 'blue' },
    { label: 'طلبات مكتملة', value: '2,156', color: 'green' },
    { label: 'قيد المعالجة', value: '691', color: 'orange' },
    { label: 'زوار الشهر', value: '15,342', color: 'purple' },
    { label: 'زوار اليوم', value: '1,243', color: 'indigo' },
    { label: 'طلبات اليوم', value: '89', color: 'teal' }
  ];

  // بيانات المميزات
  const features = [
    { title: 'سرعة في الاستجابة', icon: '⚡', desc: 'نضمن الرد على استفساراتكم في أسرع وقت ممكن', color: 'amber' },
    { title: 'أمان البيانات', icon: '🔒', desc: 'حماية معلوماتك الشخصية بأعلى معايير الأمان', color: 'blue' },
    { title: 'سهولة الاستخدام', icon: '👥', desc: 'واجهة بسيطة ومفهومة للجميع', color: 'green' },
    { title: 'خدمة 24/7', icon: '🌐', desc: 'متاح طوال الوقت لخدمتك', color: 'purple' }
  ];

  const openSheet = (id: SheetType) => {
    setActiveSheet(id);
    document.body.style.overflow = 'hidden';
  };

  const closeSheet = () => {
    setActiveSheet(null);
    document.body.style.overflow = '';
  };

  // الحصول على ألوان الزر
  const getTabColors = (color: string, isActive: boolean) => {
    const colors: Record<string, { bg: string; text: string; activeBg: string }> = {
      emerald: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-400', activeBg: 'bg-emerald-500' },
      blue: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400', activeBg: 'bg-blue-500' },
      amber: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400', activeBg: 'bg-amber-500' }
    };
    return colors[color] || colors.emerald;
  };

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
        <div className="h-6 bg-gradient-to-t from-white dark:from-gray-900 to-transparent pointer-events-none" />
        
        {/* Bar Content */}
        <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border-t border-gray-200/50 dark:border-gray-700/50 shadow-2xl">
          <div className="px-4 py-3 pb-safe">
            <div className="flex items-center justify-around gap-2">
              {tabs.map((tab) => {
                const colors = getTabColors(tab.color, activeSheet === tab.id);
                return (
                  <button
                    key={tab.id}
                    onClick={() => openSheet(tab.id)}
                    className={`
                      flex-1 flex flex-col items-center gap-1.5 py-2 px-3 rounded-2xl
                      transition-all duration-200 active:scale-95
                      ${activeSheet === tab.id 
                        ? `${colors.activeBg} text-white shadow-lg` 
                        : `${colors.bg} ${colors.text}`
                      }
                    `}
                  >
                    {tab.icon}
                    <span className="text-[11px] font-bold whitespace-nowrap">
                      {tab.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Sheet - KPIs */}
      {activeSheet === 'kpis' && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={closeSheet}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fadeIn" />
          <div 
            className="relative w-full bg-white dark:bg-gray-800 rounded-t-3xl shadow-2xl animate-slideUp max-h-[85vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="sticky top-0 bg-white dark:bg-gray-800 flex justify-center pt-3 pb-2 z-10">
              <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full" />
            </div>
            
            {/* Header */}
            <div className="px-5 pb-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-white">📈</span>
                مؤشرات الأداء
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">قياس أداء النظام وجودة الخدمة</p>
            </div>
            
            {/* KPI Grid */}
            <div className="px-4 pb-4 grid grid-cols-2 gap-3">
              {kpis.map((kpi, idx) => (
                <div 
                  key={idx}
                  className={`
                    p-4 rounded-2xl border
                    ${kpi.color === 'green' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : ''}
                    ${kpi.color === 'blue' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' : ''}
                    ${kpi.color === 'purple' ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800' : ''}
                    ${kpi.color === 'orange' ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800' : ''}
                  `}
                >
                  <div className="text-2xl mb-2">{kpi.icon}</div>
                  <div className={`text-2xl font-black mb-1 ${
                    kpi.color === 'green' ? 'text-green-600 dark:text-green-400' :
                    kpi.color === 'blue' ? 'text-blue-600 dark:text-blue-400' :
                    kpi.color === 'purple' ? 'text-purple-600 dark:text-purple-400' :
                    'text-orange-600 dark:text-orange-400'
                  }`}>
                    {kpi.value}
                  </div>
                  <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">{kpi.title}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{kpi.desc}</div>
                </div>
              ))}
            </div>
            
            {/* Close Button */}
            <div className="px-4 pb-6 pb-safe">
              <button
                onClick={closeSheet}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold shadow-lg active:scale-[0.98] transition-transform"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Sheet - Stats */}
      {activeSheet === 'stats' && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={closeSheet}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fadeIn" />
          <div 
            className="relative w-full bg-white dark:bg-gray-800 rounded-t-3xl shadow-2xl animate-slideUp max-h-[85vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="sticky top-0 bg-white dark:bg-gray-800 flex justify-center pt-3 pb-2 z-10">
              <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full" />
            </div>
            
            {/* Header */}
            <div className="px-5 pb-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white">📊</span>
                الإحصائيات في لمحة
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">أرقام تعكس نجاح وفعالية النظام</p>
            </div>
            
            {/* Stats Grid */}
            <div className="px-4 pb-4 grid grid-cols-2 gap-3">
              {stats.map((stat, idx) => (
                <div 
                  key={idx}
                  className={`
                    p-4 rounded-2xl text-white
                    ${stat.color === 'blue' ? 'bg-gradient-to-br from-blue-500 to-blue-600' : ''}
                    ${stat.color === 'green' ? 'bg-gradient-to-br from-green-500 to-green-600' : ''}
                    ${stat.color === 'orange' ? 'bg-gradient-to-br from-orange-500 to-orange-600' : ''}
                    ${stat.color === 'purple' ? 'bg-gradient-to-br from-purple-500 to-purple-600' : ''}
                    ${stat.color === 'indigo' ? 'bg-gradient-to-br from-indigo-500 to-indigo-600' : ''}
                    ${stat.color === 'teal' ? 'bg-gradient-to-br from-teal-500 to-teal-600' : ''}
                  `}
                >
                  <div className="text-3xl font-black mb-1">{stat.value}</div>
                  <div className="text-sm font-medium opacity-90">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Survey Stats */}
            {surveyStats.count > 0 && (
              <div className="px-4 pb-4">
                <div className="p-4 rounded-2xl bg-gradient-to-br from-pink-100 to-purple-100 dark:from-pink-900/30 dark:to-purple-900/30 border border-pink-200 dark:border-pink-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">استبيان الرضا</div>
                      <div className="text-2xl font-bold text-pink-600 dark:text-pink-400">{surveyStats.avg.toFixed(1)} ⭐</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500">{surveyStats.count} مشاركة</div>
                      <div className="text-sm font-medium text-green-600">{Math.round(surveyStats.recommendPct)}% توصية</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Close Button */}
            <div className="px-4 pb-6 pb-safe">
              <button
                onClick={closeSheet}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold shadow-lg active:scale-[0.98] transition-transform"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Sheet - Features */}
      {activeSheet === 'features' && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={closeSheet}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fadeIn" />
          <div 
            className="relative w-full bg-white dark:bg-gray-800 rounded-t-3xl shadow-2xl animate-slideUp max-h-[85vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="sticky top-0 bg-white dark:bg-gray-800 flex justify-center pt-3 pb-2 z-10">
              <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-full" />
            </div>
            
            {/* Header */}
            <div className="px-5 pb-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white">✨</span>
                لماذا تختار خدماتنا؟
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">مميزات تجعل تجربتك معنا استثنائية</p>
            </div>
            
            {/* Features List */}
            <div className="px-4 pb-4 space-y-3">
              {features.map((feature, idx) => (
                <div 
                  key={idx}
                  className="flex items-start gap-4 p-4 rounded-2xl bg-gray-50 dark:bg-gray-700/50"
                >
                  <div className={`
                    w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0
                    ${feature.color === 'amber' ? 'bg-gradient-to-br from-amber-400 to-orange-500' : ''}
                    ${feature.color === 'blue' ? 'bg-gradient-to-br from-blue-400 to-indigo-500' : ''}
                    ${feature.color === 'green' ? 'bg-gradient-to-br from-green-400 to-emerald-500' : ''}
                    ${feature.color === 'purple' ? 'bg-gradient-to-br from-purple-400 to-violet-500' : ''}
                  `}>
                    {feature.icon}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-gray-900 dark:text-white mb-1">{feature.title}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Close Button */}
            <div className="px-4 pb-6 pb-safe">
              <button
                onClick={closeSheet}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold shadow-lg active:scale-[0.98] transition-transform"
              >
                إغلاق
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
