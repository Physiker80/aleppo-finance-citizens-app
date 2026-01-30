import React, { useState } from 'react';
import Card from '../components/ui/Card';

const HomePage: React.FC = () => {
  const [activeModal, setActiveModal] = useState<string | null>(null);

  const openModal = (modalType: string) => {
    setActiveModal(modalType);
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
      description: "مؤشر النت بروموتر سكور يقيس مدى استعداد المواطنين لتوصية الخدمة للآخرين",
      calculation: "النسبة المئوية للمروجين مطروحاً منها النسبة المئوية للمنتقدين",
      details: [
        "المروجون (9-10): يوصون بالخدمة بقوة",
        "المحايدون (7-8): راضون لكن غير متحمسين",
        "المنتقدون (0-6): غير راضين وقد ينتقدون",
        "المقياس من -100 إلى +100"
      ]
    }
  };

  const ActionCard: React.FC<{ 
    title: string; 
    description: string; 
    onClick: () => void;
    icon: string;
  }> = ({ title, description, onClick, icon }) => (
    <div
      className="group relative overflow-hidden bg-white/30 dark:bg-gray-800/30 backdrop-blur-sm p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 cursor-pointer transform hover:scale-[1.05] border border-gray-200/50 dark:border-gray-700/50 hover:border-gray-300/70 dark:hover:border-gray-600/70"
      onClick={onClick}
    >
      {/* Background gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-50/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Icon */}
      <div className="relative z-10 flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-blue-600/20 dark:bg-blue-500/20 rounded-full backdrop-blur-sm border border-blue-300/30 dark:border-blue-400/30">
        <span className="text-2xl text-blue-600 dark:text-blue-400">{icon}</span>
      </div>
      
      {/* Content */}
      <div className="relative z-10 text-center">
        <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-3 group-hover:scale-105 transition-transform duration-300">
          {title}
        </h3>
        <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed mb-4">
          {description}
        </p>
        
        {/* Call to action */}
        <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <span className="text-gray-700 dark:text-gray-300 text-sm font-medium">ابدأ الآن</span>
          <span className="text-gray-700 dark:text-gray-300 text-lg">←</span>
        </div>
      </div>
      
      {/* Decorative elements */}
      <div className="absolute -top-4 -right-4 w-24 h-24 bg-gray-100/10 dark:bg-gray-700/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-gray-100/10 dark:bg-gray-700/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    </div>
  );

  const navigateTo = (hash: string) => {
    window.location.hash = hash;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50/80 via-white/60 to-blue-50/40 dark:from-gray-900/80 dark:via-gray-800/60 dark:to-gray-900/40 backdrop-blur-sm">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5 dark:opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(0,0,0,0.15) 1px, transparent 0)`,
          backgroundSize: '20px 20px'
        }} />
      </div>
      
      <div className="relative z-10 p-6 md:p-8">
        <div className="container mx-auto max-w-7xl">
          {/* Main Card Container */}
          <div className="bg-white/40 dark:bg-gray-800/30 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 rounded-3xl shadow-2xl shadow-blue-500/5 dark:shadow-gray-900/20 overflow-hidden">
            {/* Header Section */}
            <div className="relative px-8 md:px-12 pt-12 pb-8">
              {/* Decorative Elements */}
              <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-full -translate-x-16 -translate-y-16 blur-2xl" />
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-green-400/10 to-blue-400/10 rounded-full translate-x-12 -translate-y-12 blur-2xl" />
              
              <div className="relative text-center">
                <div className="mb-6">
                  <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-blue-700 dark:text-blue-400 leading-tight">
                    أهلا بكم في البوابة الالكترونية
                  </h1>
                  <h2 className="text-2xl md:text-3xl lg:text-4xl font-semibold text-blue-700 dark:text-blue-400 mt-2">
                    لمديرية مالية محافظة حلب
                  </h2>
                </div>
                <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-4xl mx-auto leading-relaxed opacity-90">
                  منصة إلكترونية شاملة لتسهيل التواصل مع المواطنين وتقديم خدمات مالية متميزة
                </p>
              </div>
            </div>

            {/* Action Cards */}
            <div className="px-8 md:px-12 py-8">
              <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                <ActionCard
                  title="تقديم طلب جديد"
                  description="يمكنك تقديم شكوى أو استعلام جديد بسهولة عبر ملء النموذج الإلكتروني وإرفاق المستندات اللازمة"
                  icon="✎"
                  onClick={() => navigateTo('#/submit')}
                />
                <ActionCard
                  title="متابعة حالة طلب"
                  description="استخدم رقم التتبع الذي حصلت عليه عند تقديم الطلب لمعرفة حالته الحالية والإجراءات التي تمت عليه"
                  icon="🔍"
                  onClick={() => navigateTo('#/track')}
                />
              </div>
            </div>

            {/* مؤشرات الأداء الرئيسية */}
            <div className="px-8 md:px-12 py-8 bg-gradient-to-r from-gray-50/30 to-blue-50/20 dark:from-gray-800/20 dark:to-gray-700/20">
              <div className="text-center mb-12">
                <h3 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white mb-4">
                  مؤشرات الأداء الرئيسية
                </h3>
                <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto rounded-full" />
              </div>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
                <div 
                  className="group relative bg-white/60 dark:bg-gray-800/40 backdrop-blur-lg border border-green-200/50 dark:border-green-700/30 p-8 rounded-2xl shadow-lg hover:shadow-2xl cursor-pointer transform hover:scale-105 transition-all duration-300"
                  onClick={() => openModal('sla')}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-emerald-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="relative z-10">
                    <h4 className="text-lg font-bold text-green-700 dark:text-green-400 mb-3">الالتزام بـ SLA</h4>
                    <p className="text-4xl font-bold text-green-600 dark:text-green-400">93%</p>
                  </div>
                </div>
                
                <div 
                  className="group relative bg-white/60 dark:bg-gray-800/40 backdrop-blur-lg border border-blue-200/50 dark:border-blue-700/30 p-8 rounded-2xl shadow-lg hover:shadow-2xl cursor-pointer transform hover:scale-105 transition-all duration-300"
                  onClick={() => openModal('satisfaction')}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-cyan-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="relative z-10">
                    <h4 className="text-lg font-bold text-blue-700 dark:text-blue-400 mb-3">رضا العملاء</h4>
                    <p className="text-4xl font-bold text-blue-600 dark:text-blue-400">82%</p>
                  </div>
                </div>
                
                <div 
                  className="group relative bg-white/60 dark:bg-gray-800/40 backdrop-blur-lg border border-purple-200/50 dark:border-purple-700/30 p-8 rounded-2xl shadow-lg hover:shadow-2xl cursor-pointer transform hover:scale-105 transition-all duration-300"
                  onClick={() => openModal('firstTime')}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-violet-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="relative z-10">
                    <h4 className="text-lg font-bold text-purple-700 dark:text-purple-400 mb-3">الحل من المرة الأولى</h4>
                    <p className="text-4xl font-bold text-purple-600 dark:text-purple-400">72%</p>
                  </div>
                </div>
                
                <div 
                  className="group relative bg-white/60 dark:bg-gray-800/40 backdrop-blur-lg border border-orange-200/50 dark:border-orange-700/30 p-8 rounded-2xl shadow-lg hover:shadow-2xl cursor-pointer transform hover:scale-105 transition-all duration-300"
                  onClick={() => openModal('nps')}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-red-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="relative z-10">
                    <h4 className="text-lg font-bold text-orange-700 dark:text-orange-400 mb-3">مؤشر NPS</h4>
                    <p className="text-4xl font-bold text-orange-600 dark:text-orange-400">55</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="px-8 md:px-12 py-8">
              <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
                <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 dark:from-blue-400/20 dark:to-blue-500/10 backdrop-blur-sm p-8 rounded-2xl border border-blue-200/30 dark:border-blue-700/30 shadow-lg hover:shadow-xl transition-all duration-300">
                  <h3 className="text-3xl md:text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">2,847</h3>
                  <p className="text-blue-800 dark:text-blue-300 font-medium">إجمالي الطلبات</p>
                </div>
                <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 dark:from-green-400/20 dark:to-green-500/10 backdrop-blur-sm p-8 rounded-2xl border border-green-200/30 dark:border-green-700/30 shadow-lg hover:shadow-xl transition-all duration-300">
                  <h3 className="text-3xl md:text-4xl font-bold text-green-600 dark:text-green-400 mb-2">2,156</h3>
                  <p className="text-green-800 dark:text-green-300 font-medium">طلبات مكتملة</p>
                </div>
                <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 dark:from-orange-400/20 dark:to-orange-500/10 backdrop-blur-sm p-8 rounded-2xl border border-orange-200/30 dark:border-orange-700/30 shadow-lg hover:shadow-xl transition-all duration-300">
                  <h3 className="text-3xl md:text-4xl font-bold text-orange-600 dark:text-orange-400 mb-2">691</h3>
                  <p className="text-orange-800 dark:text-orange-300 font-medium">طلبات قيد المعالجة</p>
                </div>
              </div>
            </div>

            {/* Features */}
            <div className="px-8 md:px-12 py-8 bg-gradient-to-r from-gray-50/20 to-white/10 dark:from-gray-800/10 dark:to-gray-900/20">
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
                <div className="text-center p-6 bg-white/30 dark:bg-gray-800/20 backdrop-blur-sm rounded-2xl border border-white/20 dark:border-gray-700/20 shadow-lg hover:shadow-xl transition-all duration-300">
                  <h4 className="font-bold text-gray-800 dark:text-white mb-3 text-lg">سرعة في الاستجابة</h4>
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed">استجابة سريعة لجميع الاستعلامات</p>
                </div>
                <div className="text-center p-6 bg-white/30 dark:bg-gray-800/20 backdrop-blur-sm rounded-2xl border border-white/20 dark:border-gray-700/20 shadow-lg hover:shadow-xl transition-all duration-300">
                  <h4 className="font-bold text-gray-800 dark:text-white mb-3 text-lg">أمان البيانات</h4>
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed">حماية كاملة لبياناتك الشخصية</p>
                </div>
                <div className="text-center p-6 bg-white/30 dark:bg-gray-800/20 backdrop-blur-sm rounded-2xl border border-white/20 dark:border-gray-700/20 shadow-lg hover:shadow-xl transition-all duration-300">
                  <h4 className="font-bold text-gray-800 dark:text-white mb-3 text-lg">سهولة الاستخدام</h4>
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed">واجهة مستخدم بسيطة وودية</p>
                </div>
                <div className="text-center p-6 bg-white/30 dark:bg-gray-800/20 backdrop-blur-sm rounded-2xl border border-white/20 dark:border-gray-700/20 shadow-lg hover:shadow-xl transition-all duration-300">
                  <h4 className="font-bold text-gray-800 dark:text-white mb-3 text-lg">خدمة 24/7</h4>
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed">متاح طوال الوقت لخدمتك</p>
                </div>
              </div>
            </div>
          </div>
        </div>
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
                  className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors"
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