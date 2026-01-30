// أنواع البيانات للرسائل الداخلية وتصنيفها الزمني
export interface InternalMessage {
  id: string;
  documentId?: string;
  documentType?: string;
  documentTitle?: string;
  subject: string;
  body: string;
  priority: 'عادي' | 'هام' | 'عاجل' | 'سري';
  toDepartments: string[];
  fromDepartment: string;
  sender: string;
  timestamp: string; // ISO datetime
  status: 'مسودة' | 'مرسل' | 'مقروء' | 'مجاب' | 'مؤرشف';
  attachedDocument?: {
    id: string;
    type: string;
    title: string;
    content: string;
  };
  readBy?: { [department: string]: Date }; // تتبع القراءة
  repliedBy?: { [department: string]: Date }; // تتبع الردود
  archivedBy?: { [department: string]: Date }; // تتبع الأرشفة
  tags?: string[]; // علامات للتصنيف
}

// إحصائيات زمنية للرسائل
export interface MessagesTimeStats {
  period: 'يومي' | 'أسبوعي' | 'شهري' | 'ربع سنوي' | 'سنوي';
  startDate: string; // ISO date
  endDate: string; // ISO date
  totalSent: number;
  totalReceived: number;
  totalReplied: number;
  totalArchived: number;
  averageResponseTime: number; // بالساعات
  departmentBreakdown: {
    [department: string]: {
      sent: number;
      received: number;
      replied: number;
      archived: number;
      averageResponseTime: number;
    };
  };
  priorityBreakdown: {
    [priority: string]: {
      count: number;
      averageResponseTime: number;
      // تحليل الذكاء الصناعي للأولوية
      aiAnalysis?: {
        geminiVersion: '2.5-pro';
        priorityInsight: string; // تحليل هذه الأولوية
        recommendedActions: string[]; // إجراءات مقترحة
        riskLevel: 'منخفض' | 'متوسط' | 'عالي'; // مستوى المخاطر
        efficiencyTips: string[]; // نصائح لتحسين الكفاءة
        analysisConfidence: number; // 0-1
        lastAnalyzed: string; // ISO timestamp
      };
    };
  };
  dailyActivity: {
    [date: string]: { // YYYY-MM-DD format
      sent: number;
      received: number;
      replied: number;
    };
  };
  
  // تحليل شامل بالذكاء الصناعي
  overallAIAnalysis?: {
    geminiVersion: '2.5-pro';
    analysisTimestamp: string;
    generalInsights: {
      workloadTrends: string; // اتجاهات أعباء العمل
      departmentEfficiency: string; // كفاءة الأقسام
      communicationPatterns: string; // أنماط التواصل
      priorityOptimization: string; // تحسين الأولويات
      predictiveInsights: string; // رؤى تنبؤية
    };
    recommendations: {
      immediate: string[]; // توصيات فورية
      shortTerm: string[]; // توصيات قصيرة المدى
      longTerm: string[]; // توصيات طويلة المدى
    };
    riskAssessment: {
      level: 'منخفض' | 'متوسط' | 'عالي' | 'حرج';
      factors: string[]; // عوامل الخطر
      mitigation: string[]; // طرق التخفيف
    };
    performanceScore: {
      overall: number; // النقاط الإجمالية 0-100
      responsiveness: number; // سرعة الاستجابة
      organization: number; // التنظيم
      priority_handling: number; // التعامل مع الأولويات
    };
    analysisConfidence: number; // 0-1
    isEnabled: boolean;
  };
}

// فلاتر التصنيف الزمني
export interface MessageTimeFilters {
  startDate?: string;
  endDate?: string;
  period?: 'اليوم' | 'هذا الأسبوع' | 'هذا الشهر' | 'آخر 7 أيام' | 'آخر 30 يوماً' | 'آخر 90 يوماً' | 'هذا العام' | 'مخصص';
  departments?: string[];
  priorities?: ('عادي' | 'هام' | 'عاجل' | 'سري')[];
  status?: ('مسودة' | 'مرسل' | 'مقروء' | 'مجاب' | 'مؤرشف')[];
  tags?: string[];
  sender?: string;
  hasAttachments?: boolean;
}

// نموذج بيانات للتقارير الزمنية
export interface TimeReport {
  id: string;
  title: string;
  generatedAt: Date;
  generatedBy: string;
  department?: string; // إذا كان التقرير خاص بقسم معين
  filters: MessageTimeFilters;
  stats: MessagesTimeStats;
  chartData: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      backgroundColor?: string;
      borderColor?: string;
    }[];
  };
}

// نموذج للتنبيهات الذكية الزمنية
export interface TimeBasedAlert {
  id: string;
  type: 'response_overdue' | 'high_volume' | 'low_activity' | 'priority_spike';
  department: string;
  threshold: number;
  currentValue: number;
  message: string;
  createdAt: Date;
  dismissed?: boolean;
}

// خيارات عرض الجدول الزمني
export interface TimelineViewOptions {
  groupBy: 'يوم' | 'أسبوع' | 'شهر';
  showTrends: boolean;
  showComparisons: boolean; // مقارنة مع الفترة السابقة
  includeWeekends: boolean;
  timeFormat: '12' | '24';
  showOnlyBusinessHours: boolean;
}