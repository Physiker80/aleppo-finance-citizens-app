import React, { useState, useRef, useEffect } from 'react';

interface KPIItem {
  id: string;
  title: string;
  value: string;
  subtitle: string;
  icon: string;
  gradient: string;
  color: string;
}

interface StatItem {
  value: number;
  label: string;
  suffix?: string;
  color: string;
}

interface FeatureItem {
  icon: string;
  title: string;
  description: string;
  gradient: string;
}

interface MobileStatsSectionProps {
  surveyStats?: { count: number; avg: number; recommendPct: number };
  onKPIClick?: (id: string) => void;
}

const MobileStatsSection: React.FC<MobileStatsSectionProps> = ({ surveyStats, onKPIClick }) => {
  const [activeKPIIndex, setActiveKPIIndex] = useState(0);
  const [expandedFeature, setExpandedFeature] = useState<number | null>(null);
  const [animatedStats, setAnimatedStats] = useState<boolean>(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);

  // KPI Data
  const kpiItems: KPIItem[] = [
    {
      id: 'sla',
      title: 'الالتزام بـ SLA',
      value: '93%',
      subtitle: 'مستوى الخدمة الممتاز',
      icon: '✓',
      gradient: 'from-emerald-400 via-emerald-500 to-green-600',
      color: 'emerald'
    },
    {
      id: 'satisfaction',
      title: 'رضا العملاء',
      value: '82%',
      subtitle: 'تقييم المواطنين',
      icon: '😊',
      gradient: 'from-blue-400 via-blue-500 to-indigo-600',
      color: 'blue'
    },
    {
      id: 'firstTime',
      title: 'الحل من المرة الأولى',
      value: '72%',
      subtitle: 'كفاءة الحل',
      icon: '⚡',
      gradient: 'from-violet-400 via-purple-500 to-purple-600',
      color: 'purple'
    },
    {
      id: 'nps',
      title: 'مؤشر NPS',
      value: '55',
      subtitle: 'صافي الترويج',
      icon: '📊',
      gradient: 'from-amber-400 via-orange-500 to-orange-600',
      color: 'orange'
    }
  ];

  // Stats Data
  const statsItems: StatItem[] = [
    { value: 2847, label: 'إجمالي الطلبات', color: 'blue' },
    { value: 2156, label: 'طلبات مكتملة', color: 'green' },
    { value: 691, label: 'قيد المعالجة', color: 'orange' },
    { value: 89, label: 'طلبات اليوم', color: 'teal' }
  ];

  // Features Data
  const features: FeatureItem[] = [
    {
      icon: '⚡',
      title: 'سرعة في الاستجابة',
      description: 'نضمن الرد على استفساراتكم في أسرع وقت ممكن مع الحفاظ على جودة الخدمة',
      gradient: 'from-amber-400 to-orange-500'
    },
    {
      icon: '🔒',
      title: 'أمان البيانات',
      description: 'حماية معلوماتك الشخصية بأعلى معايير الأمان والتشفير المتقدم',
      gradient: 'from-blue-400 to-indigo-500'
    },
    {
      icon: '👥',
      title: 'سهولة الاستخدام',
      description: 'واجهة بسيطة ومفهومة للجميع مع تجربة مستخدم سلسة ومريحة',
      gradient: 'from-emerald-400 to-green-500'
    },
    {
      icon: '🌐',
      title: 'خدمة 24/7',
      description: 'متاح طوال الوقت لخدمتك مع دعم فني مستمر ومساعدة فورية',
      gradient: 'from-purple-400 to-violet-500'
    }
  ];

  // Handle KPI scroll
  const handleKPIScroll = () => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const scrollLeft = container.scrollLeft;
      const cardWidth = container.offsetWidth * 0.85;
      const index = Math.round(scrollLeft / cardWidth);
      setActiveKPIIndex(Math.min(index, kpiItems.length - 1));
    }
  };

  // Scroll to specific KPI
  const scrollToKPI = (index: number) => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const cardWidth = container.offsetWidth * 0.85;
      container.scrollTo({ left: cardWidth * index, behavior: 'smooth' });
    }
  };

  // Animate stats on scroll into view
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !animatedStats) {
            setAnimatedStats(true);
          }
        });
      },
      { threshold: 0.3 }
    );

    if (statsRef.current) {
      observer.observe(statsRef.current);
    }

    return () => observer.disconnect();
  }, [animatedStats]);

  // Animated counter component
  const AnimatedCounter: React.FC<{ target: number; duration?: number; suffix?: string }> = ({ 
    target, 
    duration = 1500,
    suffix = ''
  }) => {
    const [count, setCount] = useState(0);

    useEffect(() => {
      if (!animatedStats) return;

      let startTime: number;
      const animate = (currentTime: number) => {
        if (!startTime) startTime = currentTime;
        const progress = Math.min((currentTime - startTime) / duration, 1);
        
        // Easing function for smooth animation
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        setCount(Math.floor(easeOutQuart * target));
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };
      
      requestAnimationFrame(animate);
    }, [target, duration, animatedStats]);

    return <span>{count.toLocaleString('ar-SY-u-nu-latn')}{suffix}</span>;
  };

  return (
    <div className="space-y-6 px-4 py-6">
      {/* KPI Section - Horizontal Swipeable Cards */}
      <section className="relative">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-white text-sm">📈</span>
            مؤشرات الأداء
          </h2>
          <span className="text-xs text-gray-500 dark:text-gray-400">اسحب للمزيد</span>
        </div>

        {/* Swipeable Cards Container */}
        <div 
          ref={scrollContainerRef}
          onScroll={handleKPIScroll}
          className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-4 -mx-4 px-4"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {kpiItems.map((kpi, index) => (
            <div
              key={kpi.id}
              onClick={() => onKPIClick?.(kpi.id)}
              className={`
                flex-shrink-0 w-[85%] snap-center
                bg-gradient-to-br ${kpi.gradient}
                rounded-3xl p-6 shadow-xl
                transform transition-all duration-300
                active:scale-95 cursor-pointer
                relative overflow-hidden
              `}
            >
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/30 -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-black/10 translate-y-1/2 -translate-x-1/2" />
              </div>
              
              <div className="relative z-10">
                {/* Icon */}
                <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4 shadow-lg">
                  <span className="text-2xl">{kpi.icon}</span>
                </div>
                
                {/* Content */}
                <h3 className="text-white/90 font-semibold text-sm mb-2">{kpi.title}</h3>
                <div className="text-5xl font-black text-white mb-2 drop-shadow-md">
                  {kpi.value}
                </div>
                <p className="text-white/80 text-sm">{kpi.subtitle}</p>

                {/* Tap indicator */}
                <div className="absolute bottom-4 left-4 text-white/50 text-xs flex items-center gap-1">
                  <span className="animate-pulse">👆</span>
                  <span>انقر للتفاصيل</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination Dots */}
        <div className="flex justify-center gap-2 mt-2">
          {kpiItems.map((_, index) => (
            <button
              key={index}
              onClick={() => scrollToKPI(index)}
              className={`
                h-2 rounded-full transition-all duration-300
                ${index === activeKPIIndex 
                  ? 'w-6 bg-emerald-500' 
                  : 'w-2 bg-gray-300 dark:bg-gray-600'
                }
              `}
            />
          ))}
        </div>
      </section>

      {/* Stats Section - Animated Grid */}
      <section ref={statsRef} className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-3xl p-5 shadow-xl border border-gray-200/50 dark:border-gray-700/50">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm">📊</span>
          الإحصائيات في لمحة
        </h2>

        <div className="grid grid-cols-2 gap-4">
          {statsItems.map((stat, index) => (
            <div
              key={index}
              className={`
                relative overflow-hidden rounded-2xl p-4 text-center
                transform transition-all duration-300 active:scale-95
                ${stat.color === 'blue' ? 'bg-gradient-to-br from-blue-500 to-blue-600' : ''}
                ${stat.color === 'green' ? 'bg-gradient-to-br from-green-500 to-green-600' : ''}
                ${stat.color === 'orange' ? 'bg-gradient-to-br from-orange-500 to-orange-600' : ''}
                ${stat.color === 'teal' ? 'bg-gradient-to-br from-teal-500 to-teal-600' : ''}
                shadow-lg
              `}
              style={{
                animationDelay: `${index * 100}ms`,
              }}
            >
              {/* Background decoration */}
              <div className="absolute top-0 right-0 w-16 h-16 rounded-full bg-white/10 -translate-y-1/2 translate-x-1/2" />
              
              <div className="relative z-10">
                <div className="text-3xl font-black text-white mb-1">
                  <AnimatedCounter target={stat.value} />
                </div>
                <p className="text-white/80 text-sm font-medium">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Survey Stats */}
        {surveyStats && surveyStats.count > 0 && (
          <div className="mt-4 p-4 rounded-2xl bg-gradient-to-br from-pink-500/10 to-purple-500/10 border border-pink-200/50 dark:border-pink-700/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">استبيان الرضا</p>
                <div className="text-2xl font-bold text-pink-600 dark:text-pink-400">
                  {surveyStats.avg.toFixed(1)} ⭐
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">{surveyStats.count} مشاركة</p>
                <p className="text-sm font-medium text-green-600">{Math.round(surveyStats.recommendPct)}% توصية</p>
              </div>
            </div>
          </div>
        )}

        {/* Survey Link */}
        <a 
          href="#/survey" 
          className="block mt-4 text-center text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
        >
          المشاركة في استبيان الرضا →
        </a>
      </section>

      {/* Features Section - Expandable Cards */}
      <section className="space-y-3">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-500 to-gray-600 flex items-center justify-center text-white text-sm">✨</span>
          لماذا تختار خدماتنا؟
        </h2>

        {features.map((feature, index) => (
          <div
            key={index}
            className={`
              overflow-hidden rounded-2xl border transition-all duration-300
              ${expandedFeature === index 
                ? 'border-emerald-400/50 dark:border-emerald-500/30 shadow-lg' 
                : 'border-gray-200/50 dark:border-gray-700/30'
              }
              bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm
            `}
          >
            <button
              onClick={() => setExpandedFeature(expandedFeature === index ? null : index)}
              className="w-full p-4 flex items-center gap-4 transition-colors"
            >
              {/* Icon Circle */}
              <div className={`
                w-12 h-12 rounded-xl flex items-center justify-center text-xl
                bg-gradient-to-br ${feature.gradient} shadow-md
                transform transition-transform duration-300
                ${expandedFeature === index ? 'scale-110 rotate-3' : ''}
              `}>
                {feature.icon}
              </div>

              {/* Title */}
              <span className="flex-1 text-right font-semibold text-gray-900 dark:text-white">
                {feature.title}
              </span>

              {/* Expand Arrow */}
              <svg 
                className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${expandedFeature === index ? 'rotate-180' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Expandable Content */}
            <div 
              className={`
                grid transition-all duration-300 ease-in-out
                ${expandedFeature === index ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}
              `}
            >
              <div className="overflow-hidden">
                <div className="px-4 pb-4 pr-20">
                  <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* CSS for hiding scrollbar */}
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
};

export default MobileStatsSection;
