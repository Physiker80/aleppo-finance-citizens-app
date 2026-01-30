import React, { useState, Suspense, useEffect } from 'react';
import Card from '../components/ui/Card';
import { 
  CheckCircle, 
  Users, 
  Clock, 
  TrendingUp,
  Phone,
  Mail,
  Globe,
  Building,
  Target,
  BarChart3,
  MessageSquare,
  Shield,
  Zap
} from 'lucide-react';

const AboutSystemPage: React.FC = () => {
  const [showFlow, setShowFlow] = useState(false);
  const [flowMode, setFlowMode] = useState<'lifecycle' | 'inquiryComplaint'>(() => {
    try {
      const saved = localStorage.getItem('about_flow_mode');
      if (saved === 'lifecycle' || saved === 'inquiryComplaint') return saved;
    } catch {}
    return 'lifecycle';
  });

  useEffect(() => {
    try { localStorage.setItem('about_flow_mode', flowMode); } catch {}
  }, [flowMode]);

  // Lazy component reference (loaded only when needed)
  const [FlowComp, setFlowComp] = useState<React.ComponentType | null>(null);
  const [InquiryComplaintComp, setInquiryComplaintComp] = useState<React.ComponentType | null>(null);
  const ensureFlowLoaded = async (mode: 'lifecycle' | 'inquiryComplaint') => {
    if (mode === 'lifecycle' && !FlowComp) {
      const mod = await import('../components/InteractiveFlowchart');
      setFlowComp(() => mod.default);
    }
    if (mode === 'inquiryComplaint' && !InquiryComplaintComp) {
      const mod = await import('../components/InquiryComplaintFlowchart');
      setInquiryComplaintComp(() => mod.default);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 min-h-screen bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* العنوان الرئيسي */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-black dark:text-white mb-4">
          عن نظام الاستعلامات والشكاوي
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
          نظام متكامل لإدارة استعلامات وشكاوى المواطنين في وزارة المالية
        </p>
      </div>

      {/* نظرة عامة */}
      <Card className="mb-8">
        <div className="p-6">
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
              نظرة عامة
            </h2>
          </div>
          
          <div className="prose prose-lg text-gray-600 dark:text-gray-300 max-w-none">
            <p className="mb-4">
              يهدف نظام الاستعلامات والشكاوى إلى تقديم خدمة مميزة للمواطنين من خلال توفير منصة موحدة وسهلة الاستخدام لتلقي وإدارة جميع الاستعلامات والشكاوى المتعلقة بخدمات وزارة المالية.
            </p>
            
            <p className="mb-4">
              يتميز النظام بالشفافية والسرعة في الاستجابة، حيث يمكن للمواطنين متابعة حالة طلباتهم في الوقت الفعلي والحصول على ردود مفصلة ومدروسة من الجهات المختصة.
            </p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* الأهداف الأساسية */}
        <Card>
          <div className="p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                الأهداف الأساسية
              </h2>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="text-green-500 mt-1" size={20} />
                <span className="text-gray-700 dark:text-gray-300">تحسين جودة الخدمة المقدمة للمواطنين</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="text-green-500 mt-1" size={20} />
                <span className="text-gray-700 dark:text-gray-300">ضمان الاستجابة السريعة للطلبات</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="text-green-500 mt-1" size={20} />
                <span className="text-gray-700 dark:text-gray-300">تعزيز الشفافية في التعامل</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="text-green-500 mt-1" size={20} />
                <span className="text-gray-700 dark:text-gray-300">توحيد إجراءات التعامل مع الطلبات</span>
              </div>
            </div>
          </div>
        </Card>

        {/* التحسين المستمر */}
        <Card>
          <div className="p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                التحسين المستمر
              </h2>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <span className="text-blue-500 font-bold text-lg">→</span>
                <span className="text-gray-700 dark:text-gray-300">تحليل البيانات واستخراج الأنماط</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-blue-500 font-bold text-lg">→</span>
                <span className="text-gray-700 dark:text-gray-300">تطوير الإجراءات بناء على التغذية الراجعة</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-blue-500 font-bold text-lg">→</span>
                <span className="text-gray-700 dark:text-gray-300">رفع مستوى رضا المواطنين</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-blue-500 font-bold text-lg">→</span>
                <span className="text-gray-700 dark:text-gray-300">تقليل زمن الاستجابة والمعالجة</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* مؤشرات الأداء الرئيسية */}
      <Card className="mb-8">
        <div className="p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
              مؤشرات الأداء الرئيسية
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {/* مؤشر NPS */}
            <div className="group relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-400/20 via-orange-500/30 to-orange-600/20 dark:from-orange-400/10 dark:via-orange-500/20 dark:to-orange-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl"></div>
              <div className="relative bg-white dark:bg-gray-800 border-2 border-orange-200 dark:border-orange-700/50 hover:border-orange-400 dark:hover:border-orange-500 p-6 rounded-xl transition-all duration-300 transform group-hover:scale-105 group-hover:shadow-2xl group-hover:shadow-orange-500/20 dark:group-hover:shadow-orange-400/20">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg shadow-lg">
                    <BarChart3 className="text-white" size={24} />
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-orange-600 dark:text-orange-400 mb-1 group-hover:text-orange-700 dark:group-hover:text-orange-300 transition-colors">55</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">Net Promoter Score</div>
                  </div>
                </div>
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">مؤشر NPS</div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-3">
                  <div className="bg-gradient-to-r from-orange-400 to-orange-600 h-2 rounded-full transition-all duration-1000 group-hover:w-full" style={{width: '55%'}}></div>
                </div>
              </div>
            </div>

            {/* الحل من المرة الأولى */}
            <div className="group relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-400/20 via-purple-500/30 to-purple-600/20 dark:from-purple-400/10 dark:via-purple-500/20 dark:to-purple-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl"></div>
              <div className="relative bg-white dark:bg-gray-800 border-2 border-purple-200 dark:border-purple-700/50 hover:border-purple-400 dark:hover:border-purple-500 p-6 rounded-xl transition-all duration-300 transform group-hover:scale-105 group-hover:shadow-2xl group-hover:shadow-purple-500/20 dark:group-hover:shadow-purple-400/20">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-purple-400 to-purple-600 rounded-lg shadow-lg">
                    <Target className="text-white" size={24} />
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-1 group-hover:text-purple-700 dark:group-hover:text-purple-300 transition-colors">72%</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">First Call Resolution</div>
                  </div>
                </div>
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">الحل من المرة الأولى</div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-3">
                  <div className="bg-gradient-to-r from-purple-400 to-purple-600 h-2 rounded-full transition-all duration-1000 group-hover:w-full" style={{width: '72%'}}></div>
                </div>
              </div>
            </div>

            {/* رضا العملاء */}
            <div className="group relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 via-blue-500/30 to-blue-600/20 dark:from-blue-400/10 dark:via-blue-500/20 dark:to-blue-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl"></div>
              <div className="relative bg-white dark:bg-gray-800 border-2 border-blue-200 dark:border-blue-700/50 hover:border-blue-400 dark:hover:border-blue-500 p-6 rounded-xl transition-all duration-300 transform group-hover:scale-105 group-hover:shadow-2xl group-hover:shadow-blue-500/20 dark:group-hover:shadow-blue-400/20">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg shadow-lg">
                    <Users className="text-white" size={24} />
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">82%</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">Customer Satisfaction</div>
                  </div>
                </div>
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">رضا العملاء</div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-3">
                  <div className="bg-gradient-to-r from-blue-400 to-blue-600 h-2 rounded-full transition-all duration-1000 group-hover:w-full" style={{width: '82%'}}></div>
                </div>
              </div>
            </div>

            {/* الالتزام بـ SLA */}
            <div className="group relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-green-400/20 via-green-500/30 to-green-600/20 dark:from-green-400/10 dark:via-green-500/20 dark:to-green-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-xl"></div>
              <div className="relative bg-white dark:bg-gray-800 border-2 border-green-200 dark:border-green-700/50 hover:border-green-400 dark:hover:border-green-500 p-6 rounded-xl transition-all duration-300 transform group-hover:scale-105 group-hover:shadow-2xl group-hover:shadow-green-500/20 dark:group-hover:shadow-green-400/20">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-gradient-to-br from-green-400 to-green-600 rounded-lg shadow-lg">
                    <Clock className="text-white" size={24} />
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-1 group-hover:text-green-700 dark:group-hover:text-green-300 transition-colors">93%</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">SLA Compliance</div>
                  </div>
                </div>
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">الالتزام بـ SLA</div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-3">
                  <div className="bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full transition-all duration-1000 group-hover:w-full" style={{width: '93%'}}></div>
                </div>
              </div>
            </div>
          </div>

          {/* إحصائيات إضافية */}
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <div className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-1">1,247</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">طلبات هذا الشهر</div>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <div className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-1">2.3</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">متوسط أيام الاستجابة</div>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <div className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-1">96%</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">معدل الإنجاز</div>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <div className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-1">4.2/5</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">تقييم الخدمة</div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* مراحل معالجة الطلبات */}
      <Card className="mb-8">
        <div className="p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
              مراحل معالجة الطلبات
            </h2>
          </div>
          
          <div className="space-y-6">
            <div className="flex items-start gap-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">1</div>
              <div>
                <h3 className="font-bold text-gray-800 dark:text-gray-200 mb-1">الاستقبال والتسجيل</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">تلقي الطلب وتسجيل البيانات الأساسية</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="bg-green-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">2</div>
              <div>
                <h3 className="font-bold text-gray-800 dark:text-gray-200 mb-1">التصنيف والتوجيه</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">تحديد نوع الطلب وتوجيهه للجهة المختصة</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <div className="bg-purple-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">3</div>
              <div>
                <h3 className="font-bold text-gray-800 dark:text-gray-200 mb-1">المعالجة والتحقيق</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">دراسة الطلب وجمع المعلومات اللازمة</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
              <div className="bg-orange-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">4</div>
              <div>
                <h3 className="font-bold text-gray-800 dark:text-gray-200 mb-1">الرد والإشعار</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">إرسال الرد للمواطن وإشعاره بالنتيجة</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <div className="bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">5</div>
              <div>
                <h3 className="font-bold text-gray-800 dark:text-gray-200 mb-1">المتابعة والتقييم</h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">قياس رضا العميل وإغلاق الحالة</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* المخطط التفاعلي لمسار الطلبات */}
      <Card className="mb-8">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex flex-col gap-2 w-full">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">المخططات التفاعلية</h2>
                <button
                  onClick={async () => { if (!showFlow) { await ensureFlowLoaded(flowMode); } setShowFlow(p => !p); }}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-[#002623] hover:bg-[#003833] text-white transition"
                >
                  {showFlow ? 'إخفاء المخطط' : 'عرض المخطط'}
                </button>
              </div>
              <div className="flex flex-wrap gap-2 text-sm">
                <button
                  onClick={async () => { setFlowMode('lifecycle'); if (showFlow) await ensureFlowLoaded('lifecycle'); }}
                  className={`px-3 py-1.5 rounded-md border text-xs font-medium transition ${flowMode==='lifecycle' ? 'bg-[#002623] text-white border-[#002623]' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                >مسار دورة حياة الطلب</button>
                <button
                  onClick={async () => { setFlowMode('inquiryComplaint'); if (showFlow) await ensureFlowLoaded('inquiryComplaint'); }}
                  className={`px-3 py-1.5 rounded-md border text-xs font-medium transition ${flowMode==='inquiryComplaint' ? 'bg-[#002623] text-white border-[#002623]' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                >مسار الاستعلام مقابل الشكوى</button>
              </div>
            </div>
          </div>
          {flowMode === 'lifecycle' && (
            <p className="text-gray-600 dark:text-gray-300 mb-4 text-sm leading-relaxed">يوضح هذا المخطط الرحلة الكاملة لطلب المواطن منذ لحظة دخوله للنظام وحتى مرحلة التحسين المستمر.</p>
          )}
          {flowMode === 'inquiryComplaint' && (
            <p className="text-gray-600 dark:text-gray-300 mb-4 text-sm leading-relaxed">يوضح هذا المخطط الفروقات التشغيلية بين مسار الاستعلام ومسار الشكوى من الاستقبال وحتى الإغلاق.</p>
          )}
          {showFlow && (
            <div className="mt-4">
              {flowMode === 'lifecycle' && !FlowComp && <div className="p-8 text-center text-gray-500">جاري تحميل المخطط ...</div>}
              {flowMode === 'inquiryComplaint' && !InquiryComplaintComp && <div className="p-8 text-center text-gray-500">جاري تحميل المخطط ...</div>}
              {flowMode === 'lifecycle' && FlowComp && (
                <Suspense fallback={<div className="p-8 text-center text-gray-500">جاري تحميل المخطط ...</div>}>
                  <FlowComp />
                </Suspense>
              )}
              {flowMode === 'inquiryComplaint' && InquiryComplaintComp && (
                <Suspense fallback={<div className="p-8 text-center text-gray-500">جاري تحميل المخطط ...</div>}>
                  <InquiryComplaintComp />
                </Suspense>
              )}
            </div>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* قنوات التواصل المتاحة */}
        <Card>
          <div className="p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                قنوات التواصل المتاحة
              </h2>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <Phone className="text-blue-500" size={24} />
                <div>
                  <div className="font-medium text-gray-800 dark:text-gray-200">الهاتف المجاني للاستعلامات</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">144 (مجاني)</div>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <Mail className="text-gray-600" size={24} />
                <div>
                  <div className="font-medium text-gray-800 dark:text-gray-200">البريد الإلكتروني الرسمي</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">complaints@finance.gov.sy</div>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <Globe className="text-green-600" size={24} />
                <div>
                  <div className="font-medium text-gray-800 dark:text-gray-200">الموقع الإلكتروني والتطبيق</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">www.finance.gov.sy</div>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <Building className="text-purple-600" size={24} />
                <div>
                  <div className="font-medium text-gray-800 dark:text-gray-200">الخدمة الحضورية في المركز</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">في مقر المديرية</div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* إدارة متقدمة للطلبات */}
        <Card>
          <div className="p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
                إدارة متقدمة للطلبات
              </h2>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Target className="text-blue-500 mt-1" size={20} />
                <span className="text-gray-700 dark:text-gray-300">تصنيف تلقائي للاستعلامات والشكاوى</span>
              </div>
              <div className="flex items-start gap-3">
                <Shield className="text-red-500 mt-1" size={20} />
                <span className="text-gray-700 dark:text-gray-300">التزام بأوقات الاستجابة المحددة</span>
              </div>
              <div className="flex items-start gap-3">
                <BarChart3 className="text-green-500 mt-1" size={20} />
                <span className="text-gray-700 dark:text-gray-300">متابعة لحظية لحالة الطلبات</span>
              </div>
              <div className="flex items-start gap-3">
                <Zap className="text-red-500 mt-1" size={20} />
                <span className="text-gray-700 dark:text-gray-300">نظام تنبيهات للحالات الطارئة</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* العودة للصفحة الرئيسية */}
      <div className="text-center mt-12">
        <a href="#/" className="inline-block bg-gradient-to-r from-primary to-blue-600 text-white px-8 py-3 rounded-lg hover:from-blue-600 hover:to-primary transition-all duration-300 transform hover:scale-105">
          🏠 العودة للصفحة الرئيسية
        </a>
      </div>
    </div>
  );
};

export default AboutSystemPage;