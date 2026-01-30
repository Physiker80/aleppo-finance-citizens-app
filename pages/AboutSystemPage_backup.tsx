import React, { useState, useMemo } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { 
  ReactFlow, 
  Controls, 
  Background, 
  BackgroundVariant,
  Node, 
  Edge,
  Position
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { 
  FileText, 
  ArrowDownCircle, 
  CheckCircle, 
  Users, 
  Clock, 
  AlertCircle,
  Filter,
  Eye,
  Phone,
  Mail,
  Globe,
  Building,
  MessageSquare,
  BarChart3,
  TrendingUp
} from 'lucide-react';

// تعريف أنواع العقد المخصصة بأشكال الفلوشارت التقليدية
const nodeTypes = {
  // دائرة للبداية والنهاية (Terminal nodes)
  start: ({ data, selected }: any) => (
    <div className={`
      bg-green-500 text-white shadow-lg border-3 border-green-400 
      rounded-full w-32 h-32 flex items-center justify-center text-center
      transition-all duration-200 transform hover:scale-105
      ${selected ? 'ring-4 ring-green-300/50 shadow-xl scale-110' : ''}
    `}>
      <div>
        <div className="font-bold text-sm leading-tight">{data.label}</div>
      </div>
    </div>
  ),
  
  // مستطيل للعمليات (Process nodes)
  process: ({ data, selected }: any) => (
    <div className={`
      bg-blue-500 text-white shadow-lg border-3 border-blue-400 
      w-44 h-20 flex items-center justify-center text-center
      transition-all duration-200 transform hover:scale-105
      ${selected ? 'ring-4 ring-blue-300/50 shadow-xl scale-105' : ''}
    `}>
      <div>
        <div className="font-bold text-sm leading-tight">{data.label}</div>
        {data.time && <div className="text-xs mt-1 opacity-80">{data.time}</div>}
      </div>
    </div>
  ),
  
  // معين للقرارات (Decision nodes) - شكل الماس
  decision: ({ data, selected }: any) => (
    <div className={`
      bg-yellow-500 text-black shadow-lg border-3 border-yellow-400 
      w-40 h-32 flex items-center justify-center text-center
      transform rotate-45 transition-all duration-200 hover:scale-105
      ${selected ? 'ring-4 ring-yellow-300/50 shadow-xl scale-110' : ''}
    `}>
      <div className="transform -rotate-45">
        <div className="font-bold text-xs leading-tight">{data.label}</div>
      </div>
    </div>
  ),
  
  // مستطيل مستدير للأقسام (Department nodes)
  department: ({ data, selected }: any) => (
    <div className={`
      bg-purple-500 text-white shadow-lg border-3 border-purple-400 
      rounded-xl w-48 h-24 flex items-center justify-center text-center
      transition-all duration-200 transform hover:scale-105
      ${selected ? 'ring-4 ring-purple-300/50 shadow-xl scale-105' : ''}
    `}>
      <div>
        <div className="font-bold text-sm leading-tight">{data.label}</div>
        {data.sla && <div className="text-xs mt-1 opacity-80">SLA: {data.sla}</div>}
      </div>
    </div>
  ),
  
  // مسدس للمدخلات والمخرجات (Input/Output nodes)
  input: ({ data, selected }: any) => (
    <div className={`
      bg-orange-500 text-white shadow-lg border-3 border-orange-400 
      w-44 h-20 flex items-center justify-center text-center
      transform skew-x-12 transition-all duration-200 hover:scale-105
      ${selected ? 'ring-4 ring-orange-300/50 shadow-xl scale-105' : ''}
    `}>
      <div className="transform -skew-x-12">
        <div className="font-bold text-sm leading-tight">{data.label}</div>
      </div>
    </div>
  ),
  
  // مستطيل بخطوط مزدوجة للعمليات المهمة
  important: ({ data, selected }: any) => (
    <div className={`
      bg-red-500 text-white shadow-lg border-4 border-red-300 border-double 
      w-48 h-24 flex items-center justify-center text-center
      transition-all duration-200 transform hover:scale-105
      ${selected ? 'ring-4 ring-red-300/50 shadow-xl scale-105' : ''}
    `}>
      <div>
        <div className="font-bold text-sm leading-tight">{data.label}</div>
      </div>
    </div>
  ),
  
  // دائرة للنهاية
  end: ({ data, selected }: any) => (
    <div className={`
      bg-green-600 text-white shadow-lg border-3 border-green-400 
      rounded-full w-32 h-32 flex items-center justify-center text-center
      transition-all duration-200 transform hover:scale-105
      ${selected ? 'ring-4 ring-green-300/50 shadow-xl scale-110' : ''}
    `}>
      <div>
        <div className="font-bold text-sm leading-tight">{data.label}</div>
      </div>
    </div>
  )
};

const AboutSystemPage: React.FC = () => {
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [filterType, setFilterType] = useState<string>('all');

  // العقد (Nodes) في المخطط - مبسطة كفلوشارت تقليدي
  const nodes: Node[] = useMemo(() => [
    // 1. البداية
    {
      id: '1',
      type: 'start',
      position: { x: 400, y: 50 },
      data: { 
        label: 'بداية الطلب',
        category: 'start'
      }
    },
    
    // 2. استقبال الطلب
    {
      id: '2',
      type: 'input',
      position: { x: 370, y: 150 },
      data: { 
        label: 'استقبال الطلب',
        category: 'reception'
      }
    },
    
    // 3. تسجيل الطلب
    {
      id: '3',
      type: 'process',
      position: { x: 360, y: 240 },
      data: { 
        label: 'تسجيل الطلب',
        category: 'process'
      }
    },
    
    // 4. قرار: نوع الطلب؟
    {
      id: '4',
      type: 'decision',
      position: { x: 380, y: 340 },
      data: { 
        label: 'نوع الطلب؟',
        category: 'decision'
      }
    },
    
    // 5. معالجة الاستعلام
    {
      id: '5',
      type: 'process',
      position: { x: 200, y: 450 },
      data: { 
        label: 'معالجة الاستعلام',
        time: '24 ساعة',
        category: 'inquiry'
      }
    },
    
    // 6. معالجة الشكوى
    {
      id: '6',
      type: 'important',
      position: { x: 560, y: 450 },
      data: { 
        label: 'معالجة الشكوى',
        time: '72 ساعة',
        category: 'complaint'
      }
    },
    
    // 7. إعداد الرد
    {
      id: '7',
      type: 'process',
      position: { x: 200, y: 550 },
      data: { 
        label: 'إعداد الرد',
        category: 'process'
      }
    },
    
    // 8. تحقيق وبحث
    {
      id: '8',
      type: 'process',
      position: { x: 560, y: 550 },
      data: { 
        label: 'تحقيق وبحث',
        category: 'process'
      }
    },
    
    // 9. إرسال الرد
    {
      id: '9',
      type: 'input',
      position: { x: 370, y: 650 },
      data: { 
        label: 'إرسال الرد',
        category: 'process'
      }
    },
    
    // 10. قرار: العميل راضٍ؟
    {
      id: '10',
      type: 'decision',
      position: { x: 380, y: 750 },
      data: { 
        label: 'العميل راضٍ؟',
        category: 'decision'
      }
    },
    
    // 11. إغلاق الطلب
    {
      id: '11',
      type: 'end',
      position: { x: 400, y: 850 },
      data: { 
        label: 'إغلاق الطلب',
        category: 'end'
      }
    },
    
    // 12. مراجعة إضافية
    {
      id: '12',
      type: 'process',
      position: { x: 100, y: 750 },
      data: { 
        label: 'مراجعة إضافية',
        category: 'process'
      }
    }
    },
    // تلقي طلبات الاستعلام
    {
      id: 'receive-inquiry',
      type: 'process',
      position: { x: 400, y: 150 },
      data: { 
        label: 'تلقي طلبات الاستعلام',
        description: 'استلام الطلب من المواطن',
        time: '2-5 دقائق',
        category: 'reception'
      },
    },
    // طرق التلقي المختلفة
    {
      id: 'website',
      type: 'process',
      position: { x: 100, y: 250 },
      data: { 
        label: 'موقع إلكتروني',
        description: 'عبر الموقع الرسمي',
        category: 'channel'
      },
    },
    {
      id: 'phone',
      type: 'process',
      position: { x: 250, y: 250 },
      data: { 
        label: 'هاتف',
        description: 'الخط الساخن 144',
        category: 'channel'
      },
    },
    {
      id: 'email',
      type: 'process',
      position: { x: 400, y: 250 },
      data: { 
        label: 'بريد إلكتروني',
        description: 'البريد الرسمي',
        category: 'channel'
      },
    },
    {
      id: 'fax',
      type: 'process',
      position: { x: 550, y: 250 },
      data: { 
        label: 'فاكس/بريد/تسليم',
        description: 'الطرق التقليدية',
        category: 'channel'
      },
    },
    {
      id: 'visit',
      type: 'process',
      position: { x: 700, y: 250 },
      data: { 
        label: 'خدمة حضورية',
        description: 'زيارة المراكز',
        category: 'channel'
      },
    },
    // التسجيل والتحقق الأولي
    {
      id: 'register-verify',
      type: 'process',
      position: { x: 400, y: 350 },
      data: { 
        label: 'التسجيل والتحقق الأولي',
        description: 'تسجيل الطلب والتحقق من البيانات',
        time: '10-15 دقيقة',
        category: 'validation'
      },
    },
    // تصنيف
    {
      id: 'classify',
      type: 'decision',
      position: { x: 400, y: 450 },
      data: { 
        label: 'تصنيف',
        description: 'تحديد نوع الطلب',
        category: 'classification'
      },
    },
    // استعلام
    {
      id: 'inquiry-branch',
      type: 'process',
      position: { x: 200, y: 550 },
      data: { 
        label: 'استعلام',
        description: 'معالجة طلبات الاستعلام',
        category: 'inquiry'
      },
    },
    // شكوى
    {
      id: 'complaint-branch',
      type: 'process',
      position: { x: 600, y: 550 },
      data: { 
        label: 'شكوى',
        description: 'معالجة الشكاوى',
        category: 'complaint'
      },
    },
    // توجيه للجهة المختصة (استعلام)
    {
      id: 'direct-inquiry',
      type: 'process',
      position: { x: 200, y: 650 },
      data: { 
        label: 'توجيه للجهة المختصة',
        description: 'إحالة الاستعلام للقسم المناسب',
        time: '1-2 ساعة',
        category: 'inquiry'
      },
    },
    // إعداد وإرسال الجواب (استعلام)
    {
      id: 'prepare-answer-inquiry',
      type: 'process',
      position: { x: 200, y: 750 },
      data: { 
        label: 'إعداد وإرسال الجواب',
        description: 'تحضير الرد وإرساله',
        time: '4-24 ساعة',
        category: 'inquiry'
      },
    },
    // معالجة الاستعلام
    {
      id: 'process-inquiry',
      type: 'process',
      position: { x: 200, y: 850 },
      data: { 
        label: 'معالجة الاستعلام',
        description: 'معالجة نهائية للاستعلام',
        category: 'inquiry'
      },
    },
    // إعداد وإرسال الجواب (شكوى)
    {
      id: 'prepare-answer-complaint',
      type: 'process',
      position: { x: 600, y: 650 },
      data: { 
        label: 'إعداد وإرسال الجواب',
        description: 'تحضير الرد على الشكوى',
        time: '24-72 ساعة',
        category: 'complaint'
      },
    },
    // هل يوافق المواطن
    {
      id: 'citizen-approval',
      type: 'decision',
      position: { x: 600, y: 750 },
      data: { 
        label: 'هل يوافق المواطن',
        description: 'تقييم رضا المواطن عن الحل',
        category: 'feedback'
      },
    },
    // التحقق والمتابعة
    {
      id: 'investigate-follow',
      type: 'process',
      position: { x: 600, y: 850 },
      data: { 
        label: 'التحقق والمتابعة',
        description: 'تحقيق إضافي ومتابعة',
        time: '3-14 يوم',
        category: 'investigation'
      },
    },
    // طلب معلومات إضافية
    {
      id: 'request-additional-info',
      type: 'process',
      position: { x: 800, y: 850 },
      data: { 
        label: 'طلب معلومات إضافية',
        description: 'طلب مستندات أو معلومات',
        category: 'investigation'
      },
    },
    // تواصل مع المشتكي
    {
      id: 'contact-complainant',
      type: 'process',
      position: { x: 800, y: 950 },
      data: { 
        label: 'تواصل مع المشتكي',
        description: 'التواصل المباشر',
        category: 'communication'
      },
    },
    // إصلاح الخطأ
    {
      id: 'fix-error',
      type: 'process',
      position: { x: 400, y: 950 },
      data: { 
        label: 'إصلاح الخطأ',
        description: 'تصحيح المشكلة',
        category: 'resolution'
      },
    },
    // إشعار المشتكي بالنتيجة
    {
      id: 'notify-result',
      type: 'process',
      position: { x: 400, y: 1050 },
      data: { 
        label: 'إشعار المشتكي بالنتيجة',
        description: 'إعلام المواطن بالحل',
        category: 'notification'
      },
    },
    // قياس رضا العميل
    {
      id: 'measure-satisfaction',
      type: 'process',
      position: { x: 400, y: 1150 },
      data: { 
        label: 'قياس رضا العميل',
        description: 'تقييم مستوى الرضا',
        time: '1-3 أيام',
        category: 'feedback'
      },
    },
    // تحليل القياس الجديدة
    {
      id: 'analyze-metrics',
      type: 'process',
      position: { x: 100, y: 1250 },
      data: { 
        label: 'تحليل القياس الجديدة',
        description: 'تحليل البيانات والمؤشرات',
        category: 'analytics'
      },
    },
    // جمع البيانات
    {
      id: 'collect-data',
      type: 'process',
      position: { x: 100, y: 1350 },
      data: { 
        label: 'جمع البيانات',
        description: 'تجميع المعلومات والإحصائيات',
        category: 'analytics'
      },
    },
    // تصنيف بالمصادر
    {
      id: 'classify-sources',
      type: 'process',
      position: { x: 100, y: 1450 },
      data: { 
        label: 'تصنيف بالمصادر',
        description: 'تصنيف حسب مصادر البيانات',
        category: 'analytics'
      },
    },
    // لمحة عن
    {
      id: 'overview',
      type: 'process',
      position: { x: 100, y: 1550 },
      data: { 
        label: 'لمحة عن',
        description: 'نظرة عامة على النتائج',
        category: 'analytics'
      },
    },
    // عمليات تحسينية
    {
      id: 'improvement-operations',
      type: 'process',
      position: { x: 100, y: 1650 },
      data: { 
        label: 'عمليات تحسينية',
        description: 'تطوير وتحسين العمليات',
        category: 'improvement'
      },
    },
    // تحسين خدمة العملاء
    {
      id: 'improve-service',
      type: 'end',
      position: { x: 100, y: 1750 },
      data: { 
        label: 'تحسين خدمة العملاء',
        description: 'تطوير جودة الخدمة المقدمة',
        category: 'improvement'
      },
    },
    // إغلاق الطلب (فرع الاستعلام)
    {
      id: 'close-inquiry',
      type: 'end',
      position: { x: 200, y: 950 },
      data: { 
        label: 'إغلاق الطلب',
        description: 'إنهاء معالجة الاستعلام',
        category: 'closure'
      },
    },
    // فرع آخر للشكاوى
    {
      id: 'complaint-alt-branch',
      type: 'process',
      position: { x: 700, y: 550 },
      data: { 
        label: 'فرع آخر للشكاوى',
        description: 'معالجة بديلة للشكاوى',
        category: 'complaint'
      },
    },
    // توجيهات رئيسية
    {
      id: 'main-directions',
      type: 'process',
      position: { x: 700, y: 650 },
      data: { 
        label: 'توجيهات رئيسية',
        description: 'إرشادات أساسية',
        category: 'guidance'
      },
    },
    // توجيهات فرعية
    {
      id: 'sub-directions',
      type: 'process',
      position: { x: 700, y: 750 },
      data: { 
        label: 'توجيهات فرعية',
        description: 'إرشادات تفصيلية',
        category: 'guidance'
      },
    },
    // SLA إدارات وخدمات
    {
      id: 'sla-services',
      type: 'process',
      position: { x: 700, y: 850 },
      data: { 
        label: 'SLA إدارات وخدمات',
        description: 'اتفاقية مستوى الخدمة',
        category: 'sla'
      },
    },
    // مراجعات جذرية
    {
      id: 'root-reviews',
      type: 'process',
      position: { x: 700, y: 950 },
      data: { 
        label: 'مراجعات جذرية',
        description: 'مراجعة شاملة للعمليات',
        category: 'review'
      },
    },
    // خارطة تحسين
    {
      id: 'improvement-map',
      type: 'end',
      position: { x: 700, y: 1050 },
      data: { 
        label: 'خارطة تحسين',
        description: 'خطة التطوير والتحسين',
        category: 'improvement'
      },
    }
  ], []);

  // الروابط (Edges) بين العقد
  const edges: Edge[] = useMemo(() => [
    // التدفق الأساسي
    { id: 'e1-2', source: '1', target: '2' },      // بداية → استقبال
    { id: 'e2-3', source: '2', target: '3' },      // استقبال → تسجيل
    { id: 'e3-4', source: '3', target: '4' },      // تسجيل → قرار النوع
    
    // تفرع حسب نوع الطلب
    { id: 'e4-5', source: '4', target: '5', label: 'استعلام' },     // قرار → معالجة استعلام
    { id: 'e4-6', source: '4', target: '6', label: 'شكوى' },       // قرار → معالجة شكوى
    
    // مسار الاستعلام
    { id: 'e5-7', source: '5', target: '7' },      // معالجة استعلام → إعداد رد
    { id: 'e7-9', source: '7', target: '9' },      // إعداد رد → إرسال رد
    
    // مسار الشكوى
    { id: 'e6-8', source: '6', target: '8' },      // معالجة شكوى → تحقيق
    { id: 'e8-9', source: '8', target: '9' },      // تحقيق → إرسال رد
    
    // نقطة التجميع
    { id: 'e9-10', source: '9', target: '10' },    // إرسال رد → قرار الرضا
    
    // تفرع نهائي
    { id: 'e10-11', source: '10', target: '11', label: 'نعم' },     // راضي → إغلاق
    { id: 'e10-12', source: '10', target: '12', label: 'لا' },      // غير راضي → مراجعة
    
    // عودة للمراجعة
    { id: 'e12-8', source: '12', target: '8' },    // مراجعة إضافية → تحقيق مرة أخرى
  ], []);

  // تطبيق التصفية على العقد والروابط
    { id: 'e20', source: 'prepare-answer-complaint', target: 'citizen-approval', animated: true },
    { id: 'e21', source: 'citizen-approval', target: 'investigate-follow', label: 'لا', animated: true },
    { id: 'e22', source: 'investigate-follow', target: 'request-additional-info', animated: true },
    { id: 'e23', source: 'request-additional-info', target: 'contact-complainant', animated: true },
    
    // العودة للإصلاح
    { id: 'e24', source: 'investigate-follow', target: 'fix-error', animated: true },
    { id: 'e25', source: 'contact-complainant', target: 'fix-error', animated: true },
    { id: 'e26', source: 'citizen-approval', target: 'fix-error', label: 'نعم', animated: true },
    
    // الإشعار والقياس
    { id: 'e27', source: 'fix-error', target: 'notify-result', animated: true },
    { id: 'e28', source: 'notify-result', target: 'measure-satisfaction', animated: true },
    { id: 'e29', source: 'close-inquiry', target: 'measure-satisfaction', animated: true },
    
    // التحليل والتحسين
    { id: 'e30', source: 'measure-satisfaction', target: 'analyze-metrics', animated: true },
    { id: 'e31', source: 'analyze-metrics', target: 'collect-data', animated: true },
    { id: 'e32', source: 'collect-data', target: 'classify-sources', animated: true },
    { id: 'e33', source: 'classify-sources', target: 'overview', animated: true },
    { id: 'e34', source: 'overview', target: 'improvement-operations', animated: true },
    { id: 'e35', source: 'improvement-operations', target: 'improve-service', animated: true },
    
    // الفرع البديل للشكاوى
    { id: 'e36', source: 'classify', target: 'complaint-alt-branch', label: 'شكوى معقدة', animated: true },
    { id: 'e37', source: 'complaint-alt-branch', target: 'main-directions', animated: true },
    { id: 'e38', source: 'main-directions', target: 'sub-directions', animated: true },
    { id: 'e39', source: 'sub-directions', target: 'sla-services', animated: true },
    { id: 'e40', source: 'sla-services', target: 'root-reviews', animated: true },
    { id: 'e41', source: 'root-reviews', target: 'improvement-map', animated: true },
    
    // ربط فرعي إضافي
    { id: 'e42', source: 'measure-satisfaction', target: 'root-reviews', animated: true, type: 'smoothstep' },
    { id: 'e43', source: 'improvement-map', target: 'improve-service', animated: true, type: 'smoothstep' }
  ], []);

  // فلترة العقد حسب النوع
  const filteredNodes = useMemo(() => {
    if (filterType === 'all') return nodes;
    return nodes.filter(node => node.data.category === filterType);
  }, [nodes, filterType]);

  const filteredEdges = useMemo(() => {
    if (filterType === 'all') return edges;
    const nodeIds = filteredNodes.map(n => n.id);
    return edges.filter(edge => nodeIds.includes(edge.source) && nodeIds.includes(edge.target));
  }, [edges, filteredNodes, filterType]);

  const handleNodeClick = (event: any, node: Node) => {
    setSelectedNode(node);
  };

  return (
    <div className="container mx-auto px-4 py-8" dir="rtl">
      <div className="max-w-6xl mx-auto">
        {/* رأس الصفحة */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent mb-4">
            عن نظام الاستعلامات والشكاوى
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-2">
            نظام متكامل لإدارة استعلامات وشكاوى المواطنين في وزارة المالية
          </p>
          <div className="flex justify-center items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 bg-green-100 dark:bg-green-900/30 px-3 py-1 rounded-full">
              <CheckCircle size={16} className="text-green-600" />
              <span className="text-sm text-green-700 dark:text-green-300">نظام تفاعلي</span>
            </div>
            <div className="flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 px-3 py-1 rounded-full">
              <Clock size={16} className="text-blue-600" />
              <span className="text-sm text-blue-700 dark:text-blue-300">معالجة سريعة</span>
            </div>
            <div className="flex items-center gap-2 bg-purple-100 dark:bg-purple-900/30 px-3 py-1 rounded-full">
              <Users size={16} className="text-purple-600" />
              <span className="text-sm text-purple-700 dark:text-purple-300">متعدد الأقسام</span>
            </div>
          </div>
        </div>

        {/* مخطط تدفق العمليات التفاعلي */}
        <Card className="mb-8">
          <div className="p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                  مخطط تدفق معالجة الطلبات التفاعلي
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  انقر على أي عقدة لعرض التفاصيل أو استخدم الفلاتر لتخصيص العرض
                </p>
              </div>
              
              {/* أدوات التحكم والفلترة */}
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setFilterType('all')}
                  className={`px-3 py-1 rounded-full text-sm transition-all ${
                    filterType === 'all' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-gray-600'
                  }`}
                >
                  <Filter size={14} className="inline mr-1" />
                  الكل
                </button>
                <button
                  onClick={() => setFilterType('reception')}
                  className={`px-3 py-1 rounded-full text-sm transition-all ${
                    filterType === 'reception' 
                      ? 'bg-green-600 text-white' 
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-green-100 dark:hover:bg-gray-600'
                  }`}
                >
                  الاستقبال
                </button>
                <button
                  onClick={() => setFilterType('channel')}
                  className={`px-3 py-1 rounded-full text-sm transition-all ${
                    filterType === 'channel' 
                      ? 'bg-purple-600 text-white' 
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-purple-100 dark:hover:bg-gray-600'
                  }`}
                >
                  القنوات
                </button>
                <button
                  onClick={() => setFilterType('inquiry')}
                  className={`px-3 py-1 rounded-full text-sm transition-all ${
                    filterType === 'inquiry' 
                      ? 'bg-orange-600 text-white' 
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-orange-100 dark:hover:bg-gray-600'
                  }`}
                >
                  الاستعلامات
                </button>
                <button
                  onClick={() => setFilterType('complaint')}
                  className={`px-3 py-1 rounded-full text-sm transition-all ${
                    filterType === 'complaint' 
                      ? 'bg-red-600 text-white' 
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-red-100 dark:hover:bg-gray-600'
                  }`}
                >
                  الشكاوى
                </button>
                <button
                  onClick={() => setFilterType('analytics')}
                  className={`px-3 py-1 rounded-full text-sm transition-all ${
                    filterType === 'analytics' 
                      ? 'bg-teal-600 text-white' 
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-teal-100 dark:hover:bg-gray-600'
                  }`}
                >
                  التحليل
                </button>
                <button
                  onClick={() => setFilterType('improvement')}
                  className={`px-3 py-1 rounded-full text-sm transition-all ${
                    filterType === 'improvement' 
                      ? 'bg-indigo-600 text-white' 
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-indigo-100 dark:hover:bg-gray-600'
                  }`}
                >
                  التحسين
                </button>
              </div>
            </div>

            {/* المخطط التفاعلي */}
            <div className="h-[600px] border-2 border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-800">
              <ReactFlow
                nodes={filteredNodes}
                edges={filteredEdges}
                nodeTypes={nodeTypes}
                onNodeClick={handleNodeClick}
                fitView
                fitViewOptions={{ padding: 0.2 }}
                defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
                minZoom={0.5}
                maxZoom={2}
                nodesDraggable={false}
                nodesConnectable={false}
                elementsSelectable={true}
              >
                <Controls 
                  position="bottom-left" 
                  showZoom={true}
                  showFitView={true}
                  showInteractive={false}
                />
                <Background 
                  variant={BackgroundVariant.Dots}
                  gap={20}
                  size={1}
                  color="#e5e7eb"
                />
              </ReactFlow>
            </div>

            {/* تفاصيل العقدة المحددة */}
            {selectedNode && (
              <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-lg font-bold text-blue-800 dark:text-blue-300">
                      <Eye size={20} className="inline mr-2" />
                      تفاصيل العملية: {selectedNode.data.label}
                    </h3>
                    <p className="text-blue-600 dark:text-blue-400 mt-1">
                      {selectedNode.data.description}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedNode(null)}
                    className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    ✕
                  </button>
                </div>
                
                {selectedNode.data.time && (
                  <div className="mb-2">
                    <span className="inline-flex items-center gap-1 bg-blue-100 dark:bg-blue-800/30 text-blue-800 dark:text-blue-300 px-2 py-1 rounded text-sm">
                      <Clock size={14} />
                      الزمن المتوقع: {selectedNode.data.time}
                    </span>
                  </div>
                )}
                
                {selectedNode.data.sla && (
                  <div className="mb-2">
                    <span className="inline-flex items-center gap-1 bg-green-100 dark:bg-green-800/30 text-green-800 dark:text-green-300 px-2 py-1 rounded text-sm">
                      <AlertCircle size={14} />
                      اتفاقية مستوى الخدمة: {selectedNode.data.sla}
                    </span>
                  </div>
                )}

                {/* معلومات إضافية حسب نوع العقدة */}
                {selectedNode.data.category === 'channel' && (
                  <div className="mt-3 p-3 bg-white/50 dark:bg-gray-800/50 rounded">
                    <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">قنوات الاتصال المتاحة:</h4>
                    <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                      <li>• الموقع الإلكتروني الرسمي</li>
                      <li>• الخط الساخن المجاني 144</li>
                      <li>• البريد الإلكتروني الرسمي</li>
                      <li>• الفاكس والبريد التقليدي</li>
                      <li>• الخدمة الحضورية في المراكز</li>
                    </ul>
                  </div>
                )}

                {selectedNode.data.category === 'inquiry' && (
                  <div className="mt-3 p-3 bg-white/50 dark:bg-gray-800/50 rounded">
                    <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">خدمات الاستعلامات:</h4>
                    <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                      <li>• استعلامات الضرائب والرسوم</li>
                      <li>• حالة المعاملات المالية</li>
                      <li>• معلومات الإجراءات المطلوبة</li>
                      <li>• مواعيد التحصيل والدفع</li>
                      <li>• معلومات عامة عن الخدمات</li>
                    </ul>
                  </div>
                )}

                {selectedNode.data.category === 'complaint' && (
                  <div className="mt-3 p-3 bg-white/50 dark:bg-gray-800/50 rounded">
                    <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">أنواع الشكاوى:</h4>
                    <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                      <li>• شكاوى الخدمة والتعامل</li>
                      <li>• أخطاء في المعاملات</li>
                      <li>• تأخير في الإجراءات</li>
                      <li>• اعتراضات على القرارات</li>
                      <li>• شكاوى إدارية وتنظيمية</li>
                    </ul>
                  </div>
                )}

                {selectedNode.data.category === 'analytics' && (
                  <div className="mt-3 p-3 bg-white/50 dark:bg-gray-800/50 rounded">
                    <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">مؤشرات التحليل:</h4>
                    <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                      <li>• معدل الاستجابة والحل</li>
                      <li>• مستوى رضا العملاء</li>
                      <li>• أوقات المعالجة</li>
                      <li>• تصنيف أنواع الطلبات</li>
                      <li>• إحصائيات الأداء</li>
                    </ul>
                  </div>
                )}

                {selectedNode.data.category === 'improvement' && (
                  <div className="mt-3 p-3 bg-white/50 dark:bg-gray-800/50 rounded">
                    <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">مجالات التحسين:</h4>
                    <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                      <li>• تطوير العمليات والإجراءات</li>
                      <li>• تحسين جودة الخدمة</li>
                      <li>• تقليل أوقات الانتظار</li>
                      <li>• رفع مستوى الرضا</li>
                      <li>• تطوير التقنيات المستخدمة</li>
                    </ul>
                  </div>
                )}

                {selectedNode.data.category === 'feedback' && (
                  <div className="mt-3 p-3 bg-white/50 dark:bg-gray-800/50 rounded">
                    <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">معايير التقييم:</h4>
                    <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                      <li>• جودة الحل المقدم</li>
                      <li>• سرعة الاستجابة</li>
                      <li>• وضوح التواصل</li>
                      <li>• اكتمال المعلومات</li>
                      <li>• الرضا العام عن الخدمة</li>
                    </ul>
                  </div>
                )}

                {selectedNode.data.category === 'sla' && (
                  <div className="mt-3 p-3 bg-white/50 dark:bg-gray-800/50 rounded">
                    <h4 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">اتفاقية مستوى الخدمة:</h4>
                    <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                      <li>• الاستعلامات البسيطة: 24 ساعة</li>
                      <li>• الشكاوى العادية: 72 ساعة</li>
                      <li>• الحالات المعقدة: 14 يوم</li>
                      <li>• الطوارئ: 4 ساعات</li>
                      <li>• المراجعات الجذرية: 30 يوم</li>
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* إحصائيات النظام في الوقت الفعلي */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100">الطلبات المكتملة</p>
                  <p className="text-3xl font-bold">2,847</p>
                  <p className="text-sm text-green-100">+12% هذا الشهر</p>
                </div>
                <CheckCircle size={48} className="text-green-200" />
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100">متوسط وقت الاستجابة</p>
                  <p className="text-3xl font-bold">18ساعة</p>
                  <p className="text-sm text-blue-100">تحسن 25%</p>
                </div>
                <Clock size={48} className="text-blue-200" />
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100">معدل رضا العملاء</p>
                  <p className="text-3xl font-bold">4.7/5</p>
                  <p className="text-sm text-purple-100">من 1,234 تقييم</p>
                </div>
                <Users size={48} className="text-purple-200" />
              </div>
            </div>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100">الطلبات النشطة</p>
                  <p className="text-3xl font-bold">156</p>
                  <p className="text-sm text-orange-100">قيد المعالجة</p>
                </div>
                <AlertCircle size={48} className="text-orange-200" />
              </div>
            </div>
          </Card>
        </div>

        {/* الميزات والتقنيات المستخدمة */}
        <Card className="mb-8">
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">
              الميزات والتقنيات المتقدمة
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
                <div className="text-3xl mb-3">🤖</div>
                <h3 className="font-bold text-blue-800 dark:text-blue-300 mb-2">ذكاء اصطناعي</h3>
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  تصنيف تلقائي للطلبات وتوجيهها للأقسام المناسبة باستخدام خوارزميات التعلم الآلي
                </p>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-4 rounded-lg border border-green-200 dark:border-green-700">
                <div className="text-3xl mb-3">📱</div>
                <h3 className="font-bold text-green-800 dark:text-green-300 mb-2">تطبيق محمول</h3>
                <p className="text-sm text-green-600 dark:text-green-400">
                  تطبيق Android متوافق مع جميع الأجهزة الذكية لسهولة الوصول والاستخدام
                </p>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-700">
                <div className="text-3xl mb-3">🔒</div>
                <h3 className="font-bold text-purple-800 dark:text-purple-300 mb-2">أمان متقدم</h3>
                <p className="text-sm text-purple-600 dark:text-purple-400">
                  تشفير البيانات وحماية الخصوصية بأعلى معايير الأمان الرقمي
                </p>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 p-4 rounded-lg border border-orange-200 dark:border-orange-700">
                <div className="text-3xl mb-3">📊</div>
                <h3 className="font-bold text-orange-800 dark:text-orange-300 mb-2">تحليلات ذكية</h3>
                <p className="text-sm text-orange-600 dark:text-orange-400">
                  تقارير مفصلة ومؤشرات أداء لقياس جودة الخدمة وتطويرها باستمرار
                </p>
              </div>

              <div className="bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 p-4 rounded-lg border border-red-200 dark:border-red-700">
                <div className="text-3xl mb-3">⚡</div>
                <h3 className="font-bold text-red-800 dark:text-red-300 mb-2">استجابة فورية</h3>
                <p className="text-sm text-red-600 dark:text-red-400">
                  إشعارات فورية وتحديثات لحظية عن حالة الطلبات عبر قنوات متعددة
                </p>
              </div>

              <div className="bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 p-4 rounded-lg border border-teal-200 dark:border-teal-700">
                <div className="text-3xl mb-3">🌐</div>
                <h3 className="font-bold text-teal-800 dark:text-teal-300 mb-2">دعم متعدد اللغات</h3>
                <p className="text-sm text-teal-600 dark:text-teal-400">
                  واجهة عربية بالكامل مع دعم للغات أخرى حسب احتياجات المستخدمين
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* قنوات التواصل */}
        <Card className="mb-8">
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">
              قنوات التواصل المتاحة
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                <div className="text-center">
                  <Phone size={48} className="mx-auto mb-4 text-green-100" />
                  <h3 className="text-xl font-bold mb-2">الخط الساخن</h3>
                  <div className="text-3xl font-bold mb-2">144</div>
                  <p className="text-green-100 text-sm">متوفر 24/7 - مجاني</p>
                  <div className="mt-4 space-y-1 text-xs text-green-100">
                    <div>استعلامات فورية</div>
                    <div>دعم فني متخصص</div>
                    <div>متابعة الطلبات</div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                <div className="text-center">
                  <Mail size={48} className="mx-auto mb-4 text-blue-100" />
                  <h3 className="text-xl font-bold mb-2">البريد الإلكتروني</h3>
                  <div className="text-sm font-semibold mb-2 break-all">complaints@mof.gov.sy</div>
                  <p className="text-blue-100 text-sm">استجابة خلال 24 ساعة</p>
                  <div className="mt-4 space-y-1 text-xs text-blue-100">
                    <div>تقديم الوثائق</div>
                    <div>شكاوى مفصلة</div>
                    <div>متابعة رسمية</div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                <div className="text-center">
                  <Globe size={48} className="mx-auto mb-4 text-purple-100" />
                  <h3 className="text-xl font-bold mb-2">البوابة الإلكترونية</h3>
                  <div className="text-sm font-semibold mb-2">www.mof.gov.sy</div>
                  <p className="text-purple-100 text-sm">خدمات تفاعلية شاملة</p>
                  <div className="mt-4 space-y-1 text-xs text-purple-100">
                    <div>تتبع الطلبات</div>
                    <div>خدمات رقمية</div>
                    <div>قاعدة معرفية</div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                <div className="text-center">
                  <Building size={48} className="mx-auto mb-4 text-orange-100" />
                  <h3 className="text-xl font-bold mb-2">المراكز الخدمية</h3>
                  <div className="text-lg font-bold mb-2">15 مركز</div>
                  <p className="text-orange-100 text-sm">في جميع المحافظات</p>
                  <div className="mt-4 space-y-1 text-xs text-orange-100">
                    <div>خدمة حضورية</div>
                    <div>استشارة مباشرة</div>
                    <div>معاملات رسمية</div>
                  </div>
                </div>
              </div>
            </div>

            {/* معلومات إضافية عن ساعات العمل */}
            <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <h3 className="font-bold text-gray-800 dark:text-white mb-3">ساعات العمل:</h3>
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-semibold text-green-600 dark:text-green-400">الخط الساخن:</span>
                  <br />24 ساعة / 7 أيام
                </div>
                <div>
                  <span className="font-semibold text-blue-600 dark:text-blue-400">البريد الإلكتروني:</span>
                  <br />24 ساعة / 7 أيام
                </div>
                <div>
                  <span className="font-semibold text-purple-600 dark:text-purple-400">المراكز الخدمية:</span>
                  <br />8:00 ص - 3:00 م (الأحد - الخميس)
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* معلومات تقنية متقدمة */}
        <Card className="mb-8">
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">
              المعلومات التقنية والمطابقة للمعايير
            </h2>
            <div className="grid md:grid-cols-2 gap-8">
              {/* المعايير والامتثال */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
                  المعايير والامتثال
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700">
                    <CheckCircle size={20} className="text-green-600 flex-shrink-0" />
                    <div>
                      <span className="font-medium text-green-800 dark:text-green-300">ISO 27001</span>
                      <p className="text-sm text-green-600 dark:text-green-400">إدارة أمن المعلومات</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                    <CheckCircle size={20} className="text-blue-600 flex-shrink-0" />
                    <div>
                      <span className="font-medium text-blue-800 dark:text-blue-300">WCAG 2.1</span>
                      <p className="text-sm text-blue-600 dark:text-blue-400">إمكانية الوصول الرقمي</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-700">
                    <CheckCircle size={20} className="text-purple-600 flex-shrink-0" />
                    <div>
                      <span className="font-medium text-purple-800 dark:text-purple-300">GDPR</span>
                      <p className="text-sm text-purple-600 dark:text-purple-400">حماية البيانات الشخصية</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* المواصفات التقنية */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
                  المواصفات التقنية
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <span className="text-gray-700 dark:text-gray-300">الإطار التقني</span>
                    <span className="font-semibold text-blue-600 dark:text-blue-400">React 19 + Vite</span>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <span className="text-gray-700 dark:text-gray-300">قاعدة البيانات</span>
                    <span className="font-semibold text-green-600 dark:text-green-400">PostgreSQL</span>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <span className="text-gray-700 dark:text-gray-300">النسخ الاحتياطي</span>
                    <span className="font-semibold text-orange-600 dark:text-orange-400">تلقائي كل 4 ساعات</span>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <span className="text-gray-700 dark:text-gray-300">مدة التخزين</span>
                    <span className="font-semibold text-purple-600 dark:text-purple-400">7 سنوات</span>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <span className="text-gray-700 dark:text-gray-300">زمن التشغيل</span>
                    <span className="font-semibold text-red-600 dark:text-red-400">99.9%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* التطوير المستقبلي */}
        <Card className="mb-8">
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">
              رؤية المستقبل والتطوير المخطط
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 p-6 rounded-xl border border-blue-200 dark:border-blue-700">
                <div className="text-4xl mb-4">🤖</div>
                <h3 className="text-xl font-bold text-blue-800 dark:text-blue-300 mb-3">الذكاء الاصطناعي المتقدم</h3>
                <ul className="space-y-2 text-sm text-blue-600 dark:text-blue-400">
                  <li>• معالجة اللغة الطبيعية للردود التلقائية</li>
                  <li>• تحليل مشاعر المواطنين</li>
                  <li>• توقع أنماط الطلبات</li>
                  <li>• اقتراح حلول ذكية</li>
                </ul>
              </div>

              <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 p-6 rounded-xl border border-green-200 dark:border-green-700">
                <div className="text-4xl mb-4">🌐</div>
                <h3 className="text-xl font-bold text-green-800 dark:text-green-300 mb-3">التكامل مع الخدمات</h3>
                <ul className="space-y-2 text-sm text-green-600 dark:text-green-400">
                  <li>• ربط مع الهوية الرقمية</li>
                  <li>• تكامل مع الخدمات الحكومية</li>
                  <li>• API للجهات الخارجية</li>
                  <li>• نظام دفع إلكتروني</li>
                </ul>
              </div>

              <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 p-6 rounded-xl border border-purple-200 dark:border-purple-700">
                <div className="text-4xl mb-4">📱</div>
                <h3 className="text-xl font-bold text-purple-800 dark:text-purple-300 mb-3">تطبيق محمول شامل</h3>
                <ul className="space-y-2 text-sm text-purple-600 dark:text-purple-400">
                  <li>• إشعارات ذكية</li>
                  <li>• خدمات الموقع الجغرافي</li>
                  <li>• واقع معزز للإرشادات</li>
                  <li>• دعم المحادثة الصوتية</li>
                </ul>
              </div>
            </div>
          </div>
        </Card>

        {/* الأسئلة الشائعة */}
        <Card className="mb-8">
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">
              الأسئلة الشائعة
            </h2>
            <div className="space-y-4">
              <details className="group bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <summary className="flex justify-between items-center cursor-pointer p-4 font-semibold text-gray-800 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                  <span>كيف يمكنني تتبع حالة طلبي؟</span>
                  <span className="group-open:rotate-180 transition-transform">⌄</span>
                </summary>
                <div className="p-4 pt-0 text-gray-600 dark:text-gray-400">
                  <p>يمكنك تتبع طلبك من خلال:</p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>رقم الطلب المرسل عبر الرسائل النصية</li>
                    <li>صفحة تتبع الطلبات على الموقع</li>
                    <li>الاتصال بالخط الساخن 144</li>
                    <li>التطبيق المحمول</li>
                  </ul>
                </div>
              </details>

              <details className="group bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <summary className="flex justify-between items-center cursor-pointer p-4 font-semibold text-gray-800 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                  <span>ما هي المدة المتوقعة للحصول على رد؟</span>
                  <span className="group-open:rotate-180 transition-transform">⌄</span>
                </summary>
                <div className="p-4 pt-0 text-gray-600 dark:text-gray-400">
                  <p>أوقات الاستجابة المضمونة:</p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>الاستعلامات البسيطة: خلال 24 ساعة</li>
                    <li>الشكاوى العادية: خلال 72 ساعة</li>
                    <li>الحالات المعقدة: خلال 14 يوم عمل</li>
                    <li>الطوارئ: خلال 4 ساعات</li>
                  </ul>
                </div>
              </details>

              <details className="group bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <summary className="flex justify-between items-center cursor-pointer p-4 font-semibold text-gray-800 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                  <span>هل يمكنني تعديل طلبي بعد إرساله؟</span>
                  <span className="group-open:rotate-180 transition-transform">⌄</span>
                </summary>
                <div className="p-4 pt-0 text-gray-600 dark:text-gray-400">
                  <p>نعم، يمكنك تعديل طلبك خلال فترة محددة:</p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>خلال 30 دقيقة من الإرسال تلقائياً</li>
                    <li>بعد ذلك عبر الاتصال بخدمة العملاء</li>
                    <li>قبل بدء معالجة الطلب من القسم المختص</li>
                  </ul>
                </div>
              </details>
            </div>
          </div>
        </Card>

        {/* زر العودة والإجراءات */}
        <div className="text-center space-y-4">
          <div className="flex justify-center gap-4 flex-wrap">
            <Button
              onClick={() => window.location.hash = '/'}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-8 py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            >
              العودة للصفحة الرئيسية
            </Button>
            
            <Button
              onClick={() => window.location.hash = '/submit'}
              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-8 py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            >
              تقديم طلب جديد
            </Button>
            
            <Button
              onClick={() => window.location.hash = '/track'}
              className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-8 py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            >
              تتبع طلب موجود
            </Button>
          </div>
          
          <p className="text-gray-600 dark:text-gray-400 text-sm max-w-2xl mx-auto">
            نحن ملتزمون بتقديم أفضل خدمة للمواطنين وتطوير النظام باستمرار لتحقيق أعلى معايير الجودة والشفافية في الخدمات الحكومية.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AboutSystemPage;