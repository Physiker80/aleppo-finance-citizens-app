import React, { useState, useContext, useMemo } from 'react';
import Card from '../components/ui/Card';
import { AppContext } from '../App';
import { isMobile } from '../utils/platform';

const HomePage: React.FC = () => {
  const app = useContext(AppContext);
  const config = app?.siteConfig;
  const surveys = app?.surveys || [];
  const surveyStats = useMemo(() => {
    if (!surveys.length) return { count: 0, avg: 0, recommendPct: 0 };
    let sum = 0, yes = 0, totalRec = 0;
    surveys.forEach(s => { sum += s.rating; if (typeof s.wouldRecommend === 'boolean') { totalRec++; if (s.wouldRecommend) yes++; } });
    return { count: surveys.length, avg: sum / surveys.length, recommendPct: totalRec ? (yes / totalRec) * 100 : 0 };
  }, [surveys]);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [showKPIs, setShowKPIs] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showFeatures, setShowFeatures] = useState(false);
  const [hoveredStatsCard, setHoveredStatsCard] = useState<string | null>(null);
  const [hoveredFeatureCard, setHoveredFeatureCard] = useState<string | null>(null);

  // Function to handle section toggle - only one section can be open at a time
  const handleSectionToggle = (section: 'kpis' | 'stats' | 'features') => {
    let willOpen = false;

    if (section === 'kpis') {
      willOpen = !showKPIs;
      setShowKPIs(!showKPIs);
      setShowStats(false);
      setShowFeatures(false);
    } else if (section === 'stats') {
      willOpen = !showStats;
      setShowStats(!showStats);
      setShowKPIs(false);
      setShowFeatures(false);
    } else if (section === 'features') {
      willOpen = !showFeatures;
      setShowFeatures(!showFeatures);
      setShowKPIs(false);
      setShowStats(false);
    }

    // تمرير إلى موقع مناسب لقراءة المحتوى المفتوح
    if (willOpen) {
      setTimeout(() => {
        const sectionElement = document.querySelector(`[data-section="${section}"]`);
        if (sectionElement) {
          const rect = sectionElement.getBoundingClientRect();
          const offsetTop = window.pageYOffset + rect.top - 100; // هامش 100px من الأعلى
          window.scrollTo({ top: offsetTop, behavior: 'instant' });
        }
      }, 200);
    }
  };

  const openModal = (modalType: string) => {
    setActiveModal(modalType);
    // تمرير إلى منتصف الصفحة لقراءة النافذة المنبثقة بشكل مريح
    setTimeout(() => {
      const viewportHeight = window.innerHeight;
      const scrollY = Math.max(0, (document.documentElement.scrollHeight - viewportHeight) * 0.3);
      window.scrollTo({ top: scrollY, behavior: 'instant' });
    }, 100);
  };

  const closeModal = () => {
    setActiveModal(null);
  };

  // معلومات مؤشرات الأداء
  const kpiInfo = {
    sla: {
      title: "الالتزام بـ SLA",
      value: "93%",
      description: "يقيس مدى التزام النظام بمستويات الخدمة المحددة والمتفق عليها",
      calculation: "النسبة المئوية للطلبات التي تم الرد عليها ضمن الإطار الزمني المحدد",
      details: [
        "الرد على الاستعلامات خلال 24 ساعة",
        "معالجة الشكاوى خلال 72 ساعة",
        "التحديثات الدورية للمواطنين",
        "المتابعة المستمرة لحالة الطلبات"
      ]
    },
    satisfaction: {
      title: "رضا العملاء",
      value: "82%",
      description: "يقيس مستوى رضا المواطنين عن الخدمة المقدمة وجودتها",
      calculation: "متوسط التقييمات الإيجابية من المواطنين بعد إنهاء معاملاتهم",
      details: [
        "سهولة استخدام النظام",
        "وضوح المعلومات المطلوبة",
        "سرعة الاستجابة",
        "جودة الردود المقدمة"
      ]
    },
    firstTime: {
      title: "الحل من المرة الأولى",
      value: "72%",
      description: "يقيس قدرة النظام على حل المشاكل والاستعلامات من المرة الأولى دون الحاجة لمتابعات إضافية",
      calculation: "نسبة الطلبات التي تم حلها بشكل كامل دون الحاجة لطلبات متابعة",
      details: [
        "دقة المعلومات المقدمة",
        "شمولية الرد على الاستفسار",
        "حل الشكوى بشكل نهائي",
        "عدم الحاجة لاتصالات إضافية"
      ]
    },
    nps: {
      title: "مؤشر NPS",
      value: "55",
      description: "مقياس استطلاع صافي نقاط الترويج - يقيس استعداد العملاء لتوصية الخدمة للآخرين",
      calculation: "النسبة المئوية للمؤيدين مطروح منها النسبة المئوية للمنتقدين",
      details: [
        "المؤيدون (9-10): سعداء ومخلصون للخدمة",
        "المحايدون (7-8): راضون لكن غير متحمسين",
        "المنتقدون (0-6): غير راضين وقد ينتقدون",
        "المقياس من -100 إلى +100"
      ]
    }
  };

  const navigateTo = app?.navigateTo || ((hash: string) => {
    window.location.hash = hash;
    window.scrollTo({ top: 0, behavior: 'instant' });
  });

  return (
    <div className="min-h-screen py-8 bg-gradient-to-b from-white via-white/70 to-white/50 dark:from-[#0b1210] dark:via-[#0b1210]/95 dark:to-[#0b1210]/90" style={{
      backgroundImage: 'url("https://syrian.zone/syid/materials/bg.svg")',
      backgroundPosition: 'center',
      backgroundSize: 'cover',
      backdropFilter: 'blur(0.5px)'
    }}>
      <div className="container mx-auto px-4">
        <Card className="max-w-5xl mx-auto shadow-2xl bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border border-white/30 dark:border-gray-700/30 rounded-3xl overflow-hidden">
          {/* Header Section */}
          <div className="bg-transparent px-8 py-8 border-b border-gray-100 dark:border-gray-700/40">
            <div className="text-center">
              <img
                src="https://syrian.zone/syid/materials/logo.ai.svg"
                alt="Syrian Zone Logo"
                className="mb-6 w-32 h-32 mx-auto filter drop-shadow-lg opacity-90 hover:opacity-100 transition-opacity duration-300"
              />
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-3 drop-shadow-sm">
                أهلا بكم في البوابة الالكترونية
              </h1>
              <h2 className="text-2xl md:text-3xl font-bold text-blue-700 dark:text-blue-400 mb-4">
                {config?.directorateName ? `ل${config.directorateName}` : 'لمديرية مالية محافظة حلب'}
              </h2>
              <p className="text-gray-600 dark:text-gray-300 text-lg max-w-3xl mx-auto leading-relaxed">
                منصة إلكترونية شاملة لتسهيل التواصل مع المواطنين وتقديم خدمات مالية متميزة
              </p>
            </div>
          </div>

          {/* Content Section */}
          <div className="px-8 py-8">
            {/* Action Cards - Enhanced Design */}
            <div className="grid md:grid-cols-2 gap-8 mb-12">
              {/* Submit Request Card */}
              <div
                className="group relative overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/10 backdrop-blur-sm p-8 rounded-3xl border border-blue-200/50 dark:border-blue-700/30 shadow-lg hover:shadow-2xl transition-all duration-500 cursor-pointer transform hover:scale-[1.03] hover:rotate-1 ring-1 ring-blue-200/40 dark:ring-blue-700/20"
                onClick={() => navigateTo('#/submit')}
              >
                <h3 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-6 text-center group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
                  تقديم طلب جديد
                </h3>
                <p className="text-gray-700 dark:text-gray-300 text-lg leading-relaxed text-center mb-6">
                  يمكنك تقديم شكوى أو استعلام جديد بسهولة عبر ملء النموذج الإلكتروني وإرفاق المستندات اللازمة
                </p>
                <div className="text-center">
                  <div className="inline-flex items-center text-blue-600 dark:text-blue-400 font-semibold group-hover:translate-x-2 transition-transform duration-300">
                    ابدأ الآن ←
                  </div>
                </div>
              </div>

              {/* Track Request Card */}
              <div
                className="group relative overflow-hidden bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-900/20 dark:to-green-800/10 backdrop-blur-sm p-8 rounded-3xl border border-green-200/50 dark:border-green-700/30 shadow-lg hover:shadow-2xl transition-all duration-500 cursor-pointer transform hover:scale-[1.03] hover:-rotate-1 ring-1 ring-green-200/40 dark:ring-green-700/20"
                onClick={() => navigateTo('#/track')}
              >
                <h3 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-6 text-center group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors duration-300">
                  متابعة حالة طلب
                </h3>
                <p className="text-gray-700 dark:text-gray-300 text-lg leading-relaxed text-center mb-6">
                  استخدم رقم التتبع الذي حصلت عليه عند تقديم الطلب لمعرفة حالته الحالية والإجراءات التي تمت عليه
                </p>
                <div className="text-center">
                  <div className="inline-flex items-center text-green-600 dark:text-green-400 font-semibold group-hover:translate-x-2 transition-transform duration-300">
                    تتبع الآن ←
                  </div>
                </div>
              </div>
            </div>

            {/* Appointment Booking Card */}
            <div
              className="group relative overflow-hidden bg-gradient-to-br from-teal-50 to-cyan-100/50 dark:from-teal-900/20 dark:to-cyan-800/10 backdrop-blur-sm p-8 rounded-3xl border border-teal-200/50 dark:border-teal-700/30 shadow-lg hover:shadow-2xl transition-all duration-500 cursor-pointer transform hover:scale-[1.02] ring-1 ring-teal-200/40 dark:ring-teal-700/20 mb-12"
              onClick={() => navigateTo('#/appointment-booking')}
            >
              <div className="flex flex-col items-center gap-6">
                {/* Content */}
                <div className="text-center">
                  <h3 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-3 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors duration-300">
                    حجز موعد
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300 text-lg leading-relaxed mb-4">
                    احجز موعدك لزيارة مديرية المالية مسبقاً لتجنب الانتظار والحصول على خدمة أسرع. اختر القسم المناسب والوقت الذي يناسبك.
                  </p>
                  <div className="flex flex-wrap justify-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                    <span className="inline-flex items-center gap-1 bg-white/60 dark:bg-gray-800/60 px-3 py-1.5 rounded-full">
                      <svg className="w-4 h-4 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      توفير الوقت
                    </span>
                    <span className="inline-flex items-center gap-1 bg-white/60 dark:bg-gray-800/60 px-3 py-1.5 rounded-full">
                      <svg className="w-4 h-4 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      تأكيد فوري
                    </span>
                    <span className="inline-flex items-center gap-1 bg-white/60 dark:bg-gray-800/60 px-3 py-1.5 rounded-full">
                      <svg className="w-4 h-4 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                      </svg>
                      رمز QR للدخول
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Collapsible Sections - Desktop Only */}
            {!isMobile() && (
            <>
            <div className={`grid ${showKPIs || showStats || showFeatures ? 'grid-cols-1' : 'lg:grid-cols-3'} gap-8 mb-12 transition-all duration-500 ease-in-out`}>
              {/* مؤشرات الأداء الرئيسية - Collapsible */}
              {(!showStats && !showFeatures) && (
                <div data-section="kpis" className="relative overflow-hidden bg-gradient-to-br from-emerald-50/70 via-white/60 to-emerald-100/50 dark:from-emerald-900/10 dark:via-gray-900/20 dark:to-emerald-800/10 rounded-3xl border border-gray-200/30 dark:border-gray-700/20 shadow-xl backdrop-blur-lg">

                  <div className="relative z-10">
                    {/* Header - Always Visible */}
                    <div
                      className="p-8 cursor-pointer hover:bg-white/5 dark:hover:bg-white/5 transition-all duration-300"
                      onClick={() => handleSectionToggle('kpis')}
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-center flex-1">
                          <h2 className="text-lg font-extrabold text-gray-900 dark:text-white mb-2 tracking-tight">
                            مؤشرات الأداء الرئيسية
                          </h2>
                          <div className={`transition-all duration-500 ease-in-out ${showKPIs ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'} overflow-hidden`}>
                            <p className="text-gray-600 dark:text-gray-300">قياس أداء النظام وجودة الخدمة المقدمة</p>
                          </div>
                        </div>
                        <div className={`transform transition-transform duration-300 ${showKPIs ? 'rotate-180' : 'rotate-0'}`}>
                          <svg className="w-8 h-8 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* Content - Collapsible */}
                    <div className={`transition-all duration-500 ease-in-out ${showKPIs ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0 hidden'} overflow-visible`}>
                      <div className="px-8 pb-16 pt-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative z-10">
                          {/* ... KPI items ... */}
                          <div
                            className="group cursor-pointer bg-white dark:bg-gray-800/80 p-6 rounded-2xl border border-green-200/60 dark:border-green-700/30 ring-1 ring-green-500/10 dark:ring-green-700/20 shadow-lg hover:shadow-2xl hover:shadow-green-500/25 dark:hover:shadow-green-400/20 transition-all duration-700 transform hover:scale-110 hover:-translate-y-3 hover:rotate-1 backdrop-blur-sm text-center relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-br before:from-green-400/10 before:via-transparent before:to-green-600/10 before:opacity-0 before:transition-opacity before:duration-500 hover:before:opacity-100 hover:z-50"
                            onClick={() => openModal('sla')}
                            style={{ zIndex: 10 }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.zIndex = '50'; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.zIndex = '10'; }}
                          >
                            <div className="relative z-10">
                              <div className="w-16 h-16 bg-gradient-to-br from-green-400 via-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-5 group-hover:rotate-[20deg] group-hover:scale-125 transition-all duration-500 shadow-md group-hover:shadow-xl group-hover:shadow-green-500/50 relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/20 before:to-transparent before:opacity-0 before:transition-opacity before:duration-300 group-hover:before:opacity-100">
                                <span className="text-white text-2xl font-bold transform group-hover:scale-110 transition-transform duration-300">✓</span>
                              </div>
                              <h3 className="text-base font-extrabold text-gray-800 dark:text-gray-200 mb-2 tracking-tight group-hover:text-green-700 dark:group-hover:text-green-400 transition-colors duration-300">الالتزام بـ SLA</h3>
                              <div className="text-4xl font-black tabular-nums text-green-700 dark:text-green-400 mb-1 drop-shadow-sm group-hover:text-5xl group-hover:text-green-600 dark:group-hover:text-green-300 transition-all duration-500 transform group-hover:scale-105">93%</div>
                              <p className="text-xs text-gray-600 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors duration-300">مستوى الخدمة الممتاز</p>
                            </div>
                          </div>

                          <div
                            className="group cursor-pointer bg-white dark:bg-gray-800/80 p-6 rounded-2xl border border-blue-200/60 dark:border-blue-700/30 ring-1 ring-blue-500/10 dark:ring-blue-700/20 shadow-lg hover:shadow-2xl hover:shadow-blue-500/25 dark:hover:shadow-blue-400/20 transition-all duration-700 transform hover:scale-110 hover:-translate-y-3 hover:rotate-[-1deg] backdrop-blur-sm text-center relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-br before:from-blue-400/10 before:via-transparent before:to-blue-600/10 before:opacity-0 before:transition-opacity before:duration-500 hover:before:opacity-100 hover:z-50"
                            onClick={() => openModal('satisfaction')}
                            style={{ zIndex: 10 }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.zIndex = '50'; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.zIndex = '10'; }}
                          >
                            <div className="relative z-10">
                              <div className="w-16 h-16 bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-5 group-hover:rotate-[20deg] group-hover:scale-125 transition-all duration-500 shadow-md group-hover:shadow-xl group-hover:shadow-blue-500/50 relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/20 before:to-transparent before:opacity-0 before:transition-opacity before:duration-300 group-hover:before:opacity-100">
                                <span className="text-white text-2xl transform group-hover:scale-110 transition-transform duration-300">😊</span>
                              </div>
                              <h3 className="text-base font-extrabold text-gray-800 dark:text-gray-200 mb-2 tracking-tight group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors duration-300">رضا العملاء</h3>
                              <div className="text-4xl font-black tabular-nums text-blue-700 dark:text-blue-400 mb-1 drop-shadow-sm group-hover:text-5xl group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-all duration-500 transform group-hover:scale-105">82%</div>
                              <p className="text-xs text-gray-600 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors duration-300">تقييم المواطنين</p>
                            </div>
                          </div>

                          <div
                            className="group cursor-pointer bg-white dark:bg-gray-800/80 p-6 rounded-2xl border border-purple-200/60 dark:border-purple-700/30 ring-1 ring-purple-500/10 dark:ring-purple-700/20 shadow-lg hover:shadow-2xl hover:shadow-purple-500/25 dark:hover:shadow-purple-400/20 transition-all duration-700 transform hover:scale-110 hover:-translate-y-3 hover:rotate-1 backdrop-blur-sm text-center relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-br before:from-purple-400/10 before:via-transparent before:to-purple-600/10 before:opacity-0 before:transition-opacity before:duration-500 hover:before:opacity-100 hover:z-50"
                            onClick={() => openModal('firstTime')}
                            style={{ zIndex: 10 }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.zIndex = '50'; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.zIndex = '10'; }}
                          >
                            <div className="relative z-10">
                              <div className="w-16 h-16 bg-gradient-to-br from-purple-400 via-purple-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-5 group-hover:rotate-[20deg] group-hover:scale-125 transition-all duration-500 shadow-md group-hover:shadow-xl group-hover:shadow-purple-500/50 relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/20 before:to-transparent before:opacity-0 before:transition-opacity before:duration-300 group-hover:before:opacity-100">
                                <span className="text-white text-2xl transform group-hover:scale-110 transition-transform duration-300">⚡</span>
                              </div>
                              <h3 className="text-base font-extrabold text-gray-800 dark:text-gray-200 mb-2 tracking-tight group-hover:text-purple-700 dark:group-hover:text-purple-400 transition-colors duration-300">الحل من المرة الأولى</h3>
                              <div className="text-4xl font-black tabular-nums text-purple-700 dark:text-purple-400 mb-1 drop-shadow-sm group-hover:text-5xl group-hover:text-purple-600 dark:group-hover:text-purple-300 transition-all duration-500 transform group-hover:scale-105">72%</div>
                              <p className="text-xs text-gray-600 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors duration-300">كفاءة الحل</p>
                            </div>
                          </div>

                          <div
                            className="group cursor-pointer bg-white dark:bg-gray-800/80 p-6 rounded-2xl border border-orange-200/60 dark:border-orange-700/30 ring-1 ring-orange-500/10 dark:ring-orange-700/20 shadow-lg hover:shadow-2xl hover:shadow-orange-500/25 dark:hover:shadow-orange-400/20 transition-all duration-700 transform hover:scale-110 hover:-translate-y-3 hover:rotate-[-1deg] backdrop-blur-sm text-center relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-br before:from-orange-400/10 before:via-transparent before:to-orange-600/10 before:opacity-0 before:transition-opacity before:duration-500 hover:before:opacity-100 hover:z-50"
                            onClick={() => openModal('nps')}
                            style={{ zIndex: 10 }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.zIndex = '50'; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.zIndex = '10'; }}
                          >
                            <div className="relative z-10">
                              <div className="w-16 h-16 bg-gradient-to-br from-orange-400 via-orange-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-5 group-hover:rotate-[20deg] group-hover:scale-125 transition-all duration-500 shadow-md group-hover:shadow-xl group-hover:shadow-orange-500/50 relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/20 before:to-transparent before:opacity-0 before:transition-opacity before:duration-300 group-hover:before:opacity-100">
                                <span className="text-white text-2xl transform group-hover:scale-110 transition-transform duration-300">📊</span>
                              </div>
                              <h3 className="text-base font-extrabold text-gray-800 dark:text-gray-200 mb-2 tracking-tight group-hover:text-orange-700 dark:group-hover:text-orange-400 transition-colors duration-300">مؤشر NPS</h3>
                              <div className="text-4xl font-black tabular-nums text-orange-700 dark:text-orange-400 mb-1 drop-shadow-sm group-hover:text-5xl group-hover:text-orange-600 dark:group-hover:text-orange-300 transition-all duration-500 transform group-hover:scale-105">55</div>
                              <p className="text-xs text-gray-600 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300 transition-colors duration-300">صافي الترويج</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* إحصائيات عامة - Collapsible */}
              {(!showKPIs && !showFeatures) && (
                <div data-section="stats" className="relative overflow-hidden bg-gradient-to-br from-indigo-50/70 via-white/60 to-indigo-100/50 dark:from-indigo-900/10 dark:via-gray-900/20 dark:to-indigo-800/10 rounded-3xl border border-indigo-200/30 dark:border-indigo-700/20 shadow-xl backdrop-blur-lg">

                  <div className="relative z-10">
                    {/* Header - Always Visible */}
                    <div
                      className="p-8 cursor-pointer hover:bg-white/5 dark:hover:bg-white/5 transition-all duration-300"
                      onClick={() => handleSectionToggle('stats')}
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-center flex-1">
                          <h2 className="text-xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-2">
                            الإحصائيات في لمحة
                          </h2>
                          <div className={`transition-all duration-500 ease-in-out ${showStats ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'} overflow-hidden`}>
                            <p className="text-gray-600 dark:text-gray-300">أرقام تعكس نجاح وفعالية النظام</p>
                          </div>
                        </div>
                        <div className={`transform transition-transform duration-300 ${showStats ? 'rotate-180' : 'rotate-0'}`}>
                          <svg className="w-8 h-8 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* Content - Collapsible */}
                    <div className={`transition-all duration-500 ease-in-out ${showStats ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0 hidden'} overflow-visible`}>
                      <div className="px-8 pb-8">
                        {/* ... Stats content ... */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8 relative">
                          <div
                            className="group cursor-pointer bg-blue-600 bg-gradient-to-br from-blue-500 to-blue-600 p-8 rounded-2xl shadow-lg hover:shadow-2xl hover:shadow-blue-500/30 transform transition-all duration-700 text-center text-white relative overflow-hidden ring-1 ring-white/10 before:absolute before:inset-0 before:bg-white/10 before:backdrop-blur-sm before:opacity-0 before:transition-opacity before:duration-300 hover:before:opacity-100"
                            style={{
                              zIndex: hoveredStatsCard === 'main-1' ? '50' : '10',
                              transform: hoveredStatsCard === 'main-1' ? 'scale(1.08) translateZ(20px) rotateX(3deg) rotateY(-2deg) translateY(-8px)' : 'none'
                            }}
                            onMouseEnter={() => setHoveredStatsCard('main-1')}
                            onMouseLeave={() => setHoveredStatsCard(null)}
                          >
                            <div className="relative z-10">
                              <div className="text-5xl font-black tabular-nums mb-2 drop-shadow-sm text-white transform group-hover:scale-110 transition-transform duration-500">2,847</div>
                              <p className="font-semibold text-lg group-hover:text-blue-100 transition-colors duration-300">إجمالي الطلبات</p>
                              <p className="text-sm opacity-80 mt-1 group-hover:opacity-100 transition-opacity duration-300">منذ بداية العام</p>
                            </div>
                          </div>
                          <div
                            className="group cursor-pointer bg-green-600 bg-gradient-to-br from-green-500 to-green-600 p-8 rounded-2xl shadow-lg hover:shadow-2xl hover:shadow-green-500/30 transform transition-all duration-700 text-center text-white relative overflow-hidden ring-1 ring-white/10 before:absolute before:inset-0 before:bg-white/10 before:backdrop-blur-sm before:opacity-0 before:transition-opacity before:duration-300 hover:before:opacity-100"
                            style={{
                              zIndex: hoveredStatsCard === 'main-2' ? '50' : '10',
                              transform: hoveredStatsCard === 'main-2' ? 'scale(1.08) translateZ(20px) rotateX(3deg) rotateY(2deg) translateY(-8px)' : 'none'
                            }}
                            onMouseEnter={() => setHoveredStatsCard('main-2')}
                            onMouseLeave={() => setHoveredStatsCard(null)}
                          >
                            <div className="relative z-10">
                              <div className="text-5xl font-black tabular-nums mb-2 drop-shadow-sm text-white transform group-hover:scale-110 transition-transform duration-500">2,156</div>
                              <p className="font-semibold text-lg group-hover:text-green-100 transition-colors duration-300">طلبات مكتملة</p>
                              <p className="text-sm opacity-80 mt-1 group-hover:opacity-100 transition-opacity duration-300">معدل الإنجاز 76%</p>
                            </div>
                          </div>
                          <div
                            className="group cursor-pointer bg-orange-600 bg-gradient-to-br from-orange-500 to-orange-600 p-8 rounded-2xl shadow-lg hover:shadow-2xl hover:shadow-orange-500/30 transform transition-all duration-700 text-center text-white relative overflow-hidden ring-1 ring-white/10 before:absolute before:inset-0 before:bg-white/10 before:backdrop-blur-sm before:opacity-0 before:transition-opacity before:duration-300 hover:before:opacity-100"
                            style={{
                              zIndex: hoveredStatsCard === 'main-3' ? '50' : '10',
                              transform: hoveredStatsCard === 'main-3' ? 'scale(1.08) translateZ(20px) rotateX(3deg) rotateY(-1deg) translateY(-8px)' : 'none'
                            }}
                            onMouseEnter={() => setHoveredStatsCard('main-3')}
                            onMouseLeave={() => setHoveredStatsCard(null)}
                          >
                            <div className="relative z-10">
                              <div className="text-5xl font-black tabular-nums mb-2 drop-shadow-sm text-white transform group-hover:scale-110 transition-transform duration-500">691</div>
                              <p className="font-semibold text-lg group-hover:text-orange-100 transition-colors duration-300">طلبات قيد المعالجة</p>
                              <p className="text-sm opacity-80 mt-1 group-hover:opacity-100 transition-opacity duration-300">متوسط المعالجة 48 ساعة</p>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 relative">
                          <div
                            className="group cursor-pointer bg-white/90 dark:bg-gray-800/60 p-6 rounded-xl border border-purple-200/50 dark:border-purple-700/30 backdrop-blur-sm text-center transition-all duration-700 relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-br before:from-purple-400/10 before:via-transparent before:to-purple-600/10 before:opacity-0 before:transition-opacity before:duration-500 hover:before:opacity-100 shadow-md hover:shadow-xl hover:shadow-purple-500/25"
                            style={{
                              zIndex: hoveredStatsCard === 'small-1' ? '50' : '10',
                              transform: hoveredStatsCard === 'small-1' ? 'scale(1.1) translateZ(15px) rotateX(5deg) rotateY(-3deg) translateY(-6px)' : 'none'
                            }}
                            onMouseEnter={() => setHoveredStatsCard('small-1')}
                            onMouseLeave={() => setHoveredStatsCard(null)}
                          >
                            <div className="relative z-10">
                              <div className="text-3xl font-bold tabular-nums text-purple-700 dark:text-purple-400 mb-1 transform group-hover:scale-110 transition-transform duration-500 group-hover:text-purple-600 dark:group-hover:text-purple-300">15,342</div>
                              <p className="text-gray-700 dark:text-gray-300 text-sm font-medium group-hover:text-gray-800 dark:group-hover:text-gray-200 transition-colors duration-300">زوار الشهر</p>
                            </div>
                          </div>
                          <div
                            className="group cursor-pointer bg-white/90 dark:bg-gray-800/60 p-6 rounded-xl border border-indigo-200/50 dark:border-indigo-700/30 backdrop-blur-sm text-center transition-all duration-700 relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-br before:from-indigo-400/10 before:via-transparent before:to-indigo-600/10 before:opacity-0 before:transition-opacity before:duration-500 hover:before:opacity-100 shadow-md hover:shadow-xl hover:shadow-indigo-500/25"
                            style={{
                              zIndex: hoveredStatsCard === 'small-2' ? '50' : '10',
                              transform: hoveredStatsCard === 'small-2' ? 'scale(1.1) translateZ(15px) rotateX(5deg) rotateY(3deg) translateY(-6px)' : 'none'
                            }}
                            onMouseEnter={() => setHoveredStatsCard('small-2')}
                            onMouseLeave={() => setHoveredStatsCard(null)}
                          >
                            <div className="relative z-10">
                              <div className="text-3xl font-bold tabular-nums text-indigo-700 dark:text-indigo-400 mb-1 transform group-hover:scale-110 transition-transform duration-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-300">1,243</div>
                              <p className="text-gray-700 dark:text-gray-300 text-sm font-medium group-hover:text-gray-800 dark:group-hover:text-gray-200 transition-colors duration-300">زوار اليوم</p>
                            </div>
                          </div>
                          <div
                            className="group cursor-pointer bg-white/90 dark:bg-gray-800/60 p-6 rounded-xl border border-teal-200/50 dark:border-teal-700/30 backdrop-blur-sm text-center transition-all duration-700 relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-br before:from-teal-400/10 before:via-transparent before:to-teal-600/10 before:opacity-0 before:transition-opacity before:duration-500 hover:before:opacity-100 shadow-md hover:shadow-xl hover:shadow-teal-500/25"
                            style={{
                              zIndex: hoveredStatsCard === 'small-3' ? '50' : '10',
                              transform: hoveredStatsCard === 'small-3' ? 'scale(1.1) translateZ(15px) rotateX(5deg) rotateY(-2deg) translateY(-6px)' : 'none'
                            }}
                            onMouseEnter={() => setHoveredStatsCard('small-3')}
                            onMouseLeave={() => setHoveredStatsCard(null)}
                          >
                            <div className="relative z-10">
                              <div className="text-3xl font-bold tabular-nums text-teal-700 dark:text-teal-400 mb-1 transform group-hover:scale-110 transition-transform duration-500 group-hover:text-teal-600 dark:group-hover:text-teal-300">89</div>
                              <p className="text-gray-700 dark:text-gray-300 text-sm font-medium group-hover:text-gray-800 dark:group-hover:text-gray-200 transition-colors duration-300">طلبات اليوم</p>
                            </div>
                          </div>
                          <div
                            className="group cursor-pointer bg-white/90 dark:bg-gray-800/60 p-6 rounded-xl border border-pink-200/50 dark:border-pink-700/30 backdrop-blur-sm text-center transition-all duration-700 relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-br before:from-pink-400/10 before:via-transparent before:to-pink-600/10 before:opacity-0 before:transition-opacity before:duration-500 hover:before:opacity-100 shadow-md hover:shadow-xl hover:shadow-pink-500/25"
                            style={{
                              zIndex: hoveredStatsCard === 'small-4' ? '50' : '10',
                              transform: hoveredStatsCard === 'small-4' ? 'scale(1.1) translateZ(15px) rotateX(5deg) rotateY(1deg) translateY(-6px)' : 'none'
                            }}
                            onMouseEnter={() => setHoveredStatsCard('small-4')}
                            onMouseLeave={() => setHoveredStatsCard(null)}
                          >
                            <div className="relative z-10">
                              {surveyStats.count === 0 ? (
                                <>
                                  <div className="text-lg font-semibold text-pink-600 dark:text-pink-400 mb-1 transform group-hover:scale-110 transition-transform duration-500 group-hover:text-pink-500 dark:group-hover:text-pink-300">لا بيانات بعد</div>
                                  <p className="text-gray-700 dark:text-gray-300 text-xs font-medium group-hover:text-gray-800 dark:group-hover:text-gray-200 transition-colors duration-300">استبيان الرضا</p>
                                </>
                              ) : (
                                <>
                                  <div className="text-xl font-extrabold tabular-nums text-pink-700 dark:text-pink-400 mb-1 transform group-hover:scale-110 transition-transform duration-500 group-hover:text-pink-600 dark:group-hover:text-pink-300">
                                    {surveyStats.avg.toFixed(1)} ⭐
                                  </div>
                                  <p className="text-gray-700 dark:text-gray-300 text-xs font-medium mb-1 group-hover:text-gray-800 dark:group-hover:text-gray-200 transition-colors duration-300">متوسط التقييم</p>
                                  <div className="text-[11px] tabular-nums text-gray-500 dark:text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors duration-300">
                                    {surveyStats.count} مشاركة • {Math.round(surveyStats.recommendPct)}% توصية
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        {/* Link to survey page */}
                        <div className="mt-6 text-center">
                          <a href="#/survey" className="inline-block text-xs font-medium text-[#0f3c35] dark:text-emerald-400 hover:underline">
                            المشاركة في استبيان الرضا →
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* معلومات إضافية - Collapsible */}
              {(!showKPIs && !showStats) && (
                <div data-section="features" className="relative overflow-hidden bg-gradient-to-br from-slate-50/70 via-white/60 to-slate-100/50 dark:from-slate-900/10 dark:via-gray-900/20 dark:to-slate-800/10 rounded-3xl border border-slate-200/30 dark:border-slate-700/20 shadow-xl backdrop-blur-lg">

                  <div className="relative z-10">
                    {/* Header - Always Visible */}
                    <div
                      className="p-8 cursor-pointer hover:bg-white/5 dark:hover:bg-white/5 transition-all duration-300"
                      onClick={() => handleSectionToggle('features')}
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-center flex-1">
                          <h2 className="text-xl font-extrabold tracking-tight text-gray-900 dark:text-white mb-2">
                            لماذا تختار خدماتنا؟
                          </h2>
                          <div className={`transition-all duration-500 ease-in-out ${showFeatures ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'} overflow-hidden`}>
                            <p className="text-gray-600 dark:text-gray-300">مميزات تجعل تجربتك معنا استثنائية</p>
                          </div>
                        </div>
                        <div className={`transform transition-transform duration-300 ${showFeatures ? 'rotate-180' : 'rotate-0'}`}>
                          <svg className="w-8 h-8 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* Content - Collapsible */}
                    <div className={`transition-all duration-500 ease-in-out ${showFeatures ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0 hidden'} overflow-visible`}>
                      <div className="px-8 pb-8">
                        {/* ... Features content ... */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
                          <div
                            className="p-[1px] rounded-2xl bg-gradient-to-br from-yellow-300/60 to-orange-500/60 transition-all duration-700 relative"
                            style={{
                              zIndex: hoveredFeatureCard === 'feature-1' ? '50' : '10',
                              transform: hoveredFeatureCard === 'feature-1' ? 'scale(1.08) translateZ(20px) rotateX(8deg) rotateY(-5deg) translateY(-12px)' : 'none'
                            }}
                            onMouseEnter={() => setHoveredFeatureCard('feature-1')}
                            onMouseLeave={() => setHoveredFeatureCard(null)}
                          >
                            <div className="group bg-white/70 dark:bg-gray-800/70 p-8 rounded-2xl border border-gray-200/50 dark:border-gray-700/30 shadow-lg backdrop-blur-sm text-center hover:shadow-2xl hover:shadow-yellow-500/20 hover:bg-white/90 dark:hover:bg-gray-800/90 transition-all duration-700 transform relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-br before:from-yellow-400/10 before:via-transparent before:to-orange-600/10 before:opacity-0 before:transition-opacity before:duration-500 hover:before:opacity-100">
                              <div className="relative z-10">
                                <div className="w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:rotate-[360deg] group-hover:scale-125 transition-all duration-700 shadow-lg group-hover:shadow-xl group-hover:shadow-orange-500/50">
                                  <div className="text-3xl text-white transform group-hover:scale-110 transition-transform duration-500">⚡</div>
                                </div>
                                <h4 className="font-bold text-xl text-gray-900 dark:text-white mb-4 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors duration-500 transform group-hover:scale-105">
                                  سرعة في الاستجابة
                                </h4>
                                <p className="text-gray-600 dark:text-gray-300 leading-relaxed group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors duration-300">
                                  نضمن الرد على استفساراتكم في أسرع وقت ممكن مع الحفاظ على جودة الخدمة
                                </p>
                              </div>
                            </div>
                          </div>

                          <div
                            className="p-[1px] rounded-2xl bg-gradient-to-br from-blue-300/60 to-blue-600/60 transition-all duration-700 relative"
                            style={{
                              zIndex: hoveredFeatureCard === 'feature-2' ? '50' : '10',
                              transform: hoveredFeatureCard === 'feature-2' ? 'scale(1.08) translateZ(20px) rotateX(8deg) rotateY(5deg) translateY(-12px)' : 'none'
                            }}
                            onMouseEnter={() => setHoveredFeatureCard('feature-2')}
                            onMouseLeave={() => setHoveredFeatureCard(null)}
                          >
                            <div className="group bg-white/70 dark:bg-gray-800/70 p-8 rounded-2xl border border-gray-200/50 dark:border-gray-700/30 shadow-lg backdrop-blur-sm text-center hover:shadow-2xl hover:shadow-blue-500/20 hover:bg-white/90 dark:hover:bg-gray-800/90 transition-all duration-700 transform relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-br before:from-blue-400/10 before:via-transparent before:to-blue-600/10 before:opacity-0 before:transition-opacity before:duration-500 hover:before:opacity-100">
                              <div className="relative z-10">
                                <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:rotate-[360deg] group-hover:scale-125 transition-all duration-700 shadow-lg group-hover:shadow-xl group-hover:shadow-blue-500/50">
                                  <div className="text-3xl text-white transform group-hover:scale-110 transition-transform duration-500">🔒</div>
                                </div>
                                <h4 className="font-bold text-xl text-gray-900 dark:text-white mb-4 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-500 transform group-hover:scale-105">
                                  أمان البيانات
                                </h4>
                                <p className="text-gray-600 dark:text-gray-300 leading-relaxed group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors duration-300">
                                  حماية معلوماتك الشخصية بأعلى معايير الأمان والتشفير المتقدم
                                </p>
                              </div>
                            </div>
                          </div>

                          <div
                            className="p-[1px] rounded-2xl bg-gradient-to-br from-green-300/60 to-green-600/60 transition-all duration-700 relative"
                            style={{
                              zIndex: hoveredFeatureCard === 'feature-3' ? '50' : '10',
                              transform: hoveredFeatureCard === 'feature-3' ? 'scale(1.08) translateZ(20px) rotateX(8deg) rotateY(-3deg) translateY(-12px)' : 'none'
                            }}
                            onMouseEnter={() => setHoveredFeatureCard('feature-3')}
                            onMouseLeave={() => setHoveredFeatureCard(null)}
                          >
                            <div className="group bg-white/70 dark:bg-gray-800/70 p-8 rounded-2xl border border-gray-200/50 dark:border-gray-700/30 shadow-lg backdrop-blur-sm text-center hover:shadow-2xl hover:shadow-green-500/20 hover:bg-white/90 dark:hover:bg-gray-800/90 transition-all duration-700 transform relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-br before:from-green-400/10 before:via-transparent before:to-green-600/10 before:opacity-0 before:transition-opacity before:duration-500 hover:before:opacity-100">
                              <div className="relative z-10">
                                <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:rotate-[360deg] group-hover:scale-125 transition-all duration-700 shadow-lg group-hover:shadow-xl group-hover:shadow-green-500/50">
                                  <div className="text-3xl text-white transform group-hover:scale-110 transition-transform duration-500">👥</div>
                                </div>
                                <h4 className="font-bold text-xl text-gray-900 dark:text-white mb-4 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors duration-500 transform group-hover:scale-105">
                                  سهولة الاستخدام
                                </h4>
                                <p className="text-gray-600 dark:text-gray-300 leading-relaxed group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors duration-300">
                                  واجهة بسيطة ومفهومة للجميع مع تجربة مستخدم سلسة ومريحة
                                </p>
                              </div>
                            </div>
                          </div>

                          <div
                            className="p-[1px] rounded-2xl bg-gradient-to-br from-purple-300/60 to-purple-600/60 transition-all duration-700 relative"
                            style={{
                              zIndex: hoveredFeatureCard === 'feature-4' ? '50' : '10',
                              transform: hoveredFeatureCard === 'feature-4' ? 'scale(1.08) translateZ(20px) rotateX(8deg) rotateY(2deg) translateY(-12px)' : 'none'
                            }}
                            onMouseEnter={() => setHoveredFeatureCard('feature-4')}
                            onMouseLeave={() => setHoveredFeatureCard(null)}
                          >
                            <div className="group bg-white/70 dark:bg-gray-800/70 p-8 rounded-2xl border border-gray-200/50 dark:border-gray-700/30 shadow-lg backdrop-blur-sm text-center hover:shadow-2xl hover:shadow-purple-500/20 hover:bg-white/90 dark:hover:bg-gray-800/90 transition-all duration-700 transform relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-br before:from-purple-400/10 before:via-transparent before:to-purple-600/10 before:opacity-0 before:transition-opacity before:duration-500 hover:before:opacity-100">
                              <div className="relative z-10">
                                <div className="w-20 h-20 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:rotate-[360deg] group-hover:scale-125 transition-all duration-700 shadow-lg group-hover:shadow-xl group-hover:shadow-purple-500/50">
                                  <div className="text-3xl text-white transform group-hover:scale-110 transition-transform duration-500">🌐</div>
                                </div>
                                <h4 className="font-bold text-xl text-gray-900 dark:text-white mb-4 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors duration-500 transform group-hover:scale-105">
                                  خدمة 24/7
                                </h4>
                                <p className="text-gray-600 dark:text-gray-300 leading-relaxed group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors duration-300">
                                  متاح طوال الوقت لخدمتك مع دعم فني مستمر ومساعدة فورية
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            </>
            )}
          </div>
        </Card>
      </div>

      {/* النوافذ المنبثقة لمؤشرات الأداء */}
      {activeModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={closeModal}>
          <div
            className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                  {kpiInfo[activeModal as keyof typeof kpiInfo].title}
                </h2>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl font-bold"
                >
                  ×
                </button>
              </div>

              <div className="mb-6">
                <div className="text-4xl font-bold text-center py-4">
                  {kpiInfo[activeModal as keyof typeof kpiInfo].value}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    الوصف
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {kpiInfo[activeModal as keyof typeof kpiInfo].description}
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    طريقة الحساب
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    {kpiInfo[activeModal as keyof typeof kpiInfo].calculation}
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    التفاصيل
                  </h3>
                  <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">
                    {kpiInfo[activeModal as keyof typeof kpiInfo].details.map((detail, index) => (
                      <li key={index}>{detail}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-6 text-center">
                <button
                  onClick={closeModal}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;