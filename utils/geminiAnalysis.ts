import { InternalMessage, MessagesTimeStats } from '../types/internalMessageTypes';

// إعدادات Gemini API (يجب تكوينها من قبل المطور)
interface GeminiConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

// محاكي للتحليل الذكي (سيتم استبداله بـ API حقيقي)
export class GeminiAnalysisService {
  private static config: GeminiConfig = {
    apiKey: 'demo-key', // في الإنتاج، يجب استخدام متغير البيئة أو إعداد آمن
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    model: 'gemini-2.5-pro'
  };

  // تحليل الأولويات باستخدام الذكاء الصناعي
  static async analyzePriorityTrends(messages: InternalMessage[]): Promise<{
    insights: string;
    recommendations: string[];
    riskAssessment: string;
    efficiencyScore: number;
    predictedWorkload: string;
    urgentMessagePatterns: string;
    confidence: number;
  }> {
    
    // محاكي التحليل - في الإنتاج سيتم استدعاء Gemini API
    const priorityData = this.analyzePriorityDistribution(messages);
    const timePatterns = this.analyzeTimePatterns(messages);
    const departmentPatterns = this.analyzeDepartmentPatterns(messages);
    
    // تحليل محاكي للذكاء الصناعي
    const analysis = this.generateMockAnalysis(priorityData, timePatterns, departmentPatterns);
    
    return {
      insights: analysis.insights,
      recommendations: analysis.recommendations,
      riskAssessment: analysis.riskAssessment,
      efficiencyScore: analysis.efficiencyScore,
      predictedWorkload: analysis.predictedWorkload,
      urgentMessagePatterns: analysis.urgentMessagePatterns,
      confidence: 0.85 // مستوى ثقة محاكي
    };
  }

  // تحليل أولوية محددة
  static async analyzeSinglePriority(
    priority: string,
    messages: InternalMessage[]
  ): Promise<{
    priorityInsight: string;
    recommendedActions: string[];
    riskLevel: 'منخفض' | 'متوسط' | 'عالي';
    efficiencyTips: string[];
    analysisConfidence: number;
  }> {
    
    const priorityMessages = messages.filter(msg => msg.priority === priority);
    const analysis = this.generateSinglePriorityAnalysis(priority, priorityMessages);
    
    return analysis;
  }

  // تحليل عام للنظام
  static async generateOverallAnalysis(stats: MessagesTimeStats): Promise<{
    generalInsights: {
      workloadTrends: string;
      departmentEfficiency: string;
      communicationPatterns: string;
      priorityOptimization: string;
      predictiveInsights: string;
    };
    recommendations: {
      immediate: string[];
      shortTerm: string[];
      longTerm: string[];
    };
    riskAssessment: {
      level: 'منخفض' | 'متوسط' | 'عالي' | 'حرج';
      factors: string[];
      mitigation: string[];
    };
    performanceScore: {
      overall: number;
      responsiveness: number;
      organization: number;
      priority_handling: number;
    };
    analysisConfidence: number;
  }> {
    
    return this.generateMockOverallAnalysis(stats);
  }

  // دوال تحليل البيانات المساعدة
  private static analyzePriorityDistribution(messages: InternalMessage[]) {
    const priorityCount = { 'عادي': 0, 'هام': 0, 'عاجل': 0, 'سري': 0 };
    const responseTimes: { [key: string]: number[] } = { 'عادي': [], 'هام': [], 'عاجل': [], 'سري': [] };
    
    messages.forEach(msg => {
      if (priorityCount.hasOwnProperty(msg.priority)) {
        priorityCount[msg.priority]++;
        
        // حساب وقت الاستجابة
        if (msg.repliedBy) {
          const firstReply = Object.values(msg.repliedBy)[0];
          if (firstReply) {
            const responseTime = (new Date(firstReply).getTime() - new Date(msg.timestamp).getTime()) / (1000 * 60 * 60);
            responseTimes[msg.priority].push(responseTime);
          }
        }
      }
    });

    return { priorityCount, responseTimes };
  }

  private static analyzeTimePatterns(messages: InternalMessage[]) {
    const hourlyDistribution = new Array(24).fill(0);
    const dailyDistribution = new Array(7).fill(0);
    
    messages.forEach(msg => {
      const date = new Date(msg.timestamp);
      hourlyDistribution[date.getHours()]++;
      dailyDistribution[date.getDay()]++;
    });

    return { hourlyDistribution, dailyDistribution };
  }

  private static analyzeDepartmentPatterns(messages: InternalMessage[]) {
    const departmentActivity: { [key: string]: { sent: number, received: number, avgPriority: number } } = {};
    
    messages.forEach(msg => {
      // المُرسِل
      if (!departmentActivity[msg.fromDepartment]) {
        departmentActivity[msg.fromDepartment] = { sent: 0, received: 0, avgPriority: 0 };
      }
      departmentActivity[msg.fromDepartment].sent++;
      
      // المُستقبلين
      msg.toDepartments.forEach(dept => {
        if (!departmentActivity[dept]) {
          departmentActivity[dept] = { sent: 0, received: 0, avgPriority: 0 };
        }
        departmentActivity[dept].received++;
      });
    });

    return departmentActivity;
  }

  // محاكي للتحليل الذكي - سيتم استبداله بـ Gemini API
  private static generateMockAnalysis(priorityData: any, timePatterns: any, departmentPatterns: any) {
    const totalMessages = (Object.values(priorityData.priorityCount) as number[]).reduce((a: number, b: number) => a + b, 0);
    const urgentRatio = totalMessages > 0 ? (priorityData.priorityCount['عاجل'] + priorityData.priorityCount['سري']) / totalMessages : 0;
    
    let insights = '';
    let recommendations: string[] = [];
    let riskAssessment = '';
    let efficiencyScore = 75;
    
    // تحليل نسبة الرسائل العاجلة
    if (urgentRatio > 0.4) {
      insights += 'نسبة عالية من الرسائل العاجلة مما يشير إلى ضغط عمل كبير. ';
      recommendations.push('إعادة تقييم معايير تصنيف الأولويات');
      recommendations.push('تطوير خطة لتوزيع العبء');
      riskAssessment = 'مستوى خطر عالي: كثرة الرسائل العاجلة قد تؤثر على جودة المعالجة';
      efficiencyScore -= 15;
    } else if (urgentRatio < 0.1) {
      insights += 'نسبة منخفضة من الرسائل العاجلة مما يشير إلى تنظيم جيد. ';
      riskAssessment = 'مستوى خطر منخفض: توزيع صحي للأولويات';
      efficiencyScore += 10;
    } else {
      insights += 'توزيع متوازن للأولويات يشير إلى إدارة فعالة. ';
      riskAssessment = 'مستوى خطر متوسط: توزيع طبيعي للأولويات';
    }

    // تحليل أوقات الذروة
    const peakHour = timePatterns.hourlyDistribution.indexOf(Math.max(...timePatterns.hourlyDistribution));
    if (peakHour >= 9 && peakHour <= 11) {
      insights += 'ذروة النشاط في ساعات الصباح المبكرة تدل على تنظيم جيد. ';
      recommendations.push('الاستفادة من ساعات الذروة للمهام المعقدة');
    }

    return {
      insights,
      recommendations,
      riskAssessment,
      efficiencyScore: Math.min(100, Math.max(0, efficiencyScore)),
      predictedWorkload: this.generateWorkloadPrediction(totalMessages, urgentRatio),
      urgentMessagePatterns: this.analyzeUrgentPatterns(priorityData)
    };
  }

  private static generateSinglePriorityAnalysis(priority: string, messages: InternalMessage[]) {
    const count = messages.length;
    let insight = '';
    let recommendations: string[] = [];
    let riskLevel: 'منخفض' | 'متوسط' | 'عالي' = 'متوسط';
    let tips: string[] = [];

    switch (priority) {
      case 'عاجل':
        if (count > 20) {
          insight = 'عدد كبير من الرسائل العاجلة يتطلب مراجعة معايير التصنيف';
          recommendations.push('تطوير نظام أولويات فرعية');
          recommendations.push('تخصيص فريق للرسائل العاجلة');
          riskLevel = 'عالي';
          tips.push('معالجة فورية خلال ساعة');
          tips.push('تفويض المهام البسيطة');
        } else {
          insight = 'عدد معقول من الرسائل العاجلة يشير إلى تحكم جيد';
          riskLevel = 'منخفض';
        }
        break;
      
      case 'هام':
        insight = 'الرسائل الهامة تحتاج متابعة منتظمة لضمان عدم تحولها لعاجلة';
        recommendations.push('مراجعة دورية كل 4 ساعات');
        tips.push('معالجة خلال 24 ساعة');
        break;

      case 'عادي':
        insight = 'الرسائل العادية توفر مرونة في التعامل';
        recommendations.push('معالجة خلال 48 ساعة');
        tips.push('يمكن تجميعها للمعالجة المجمعة');
        break;

      case 'سري':
        insight = 'الرسائل السرية تتطلب معالجة خاصة ومتابعة أمنية';
        recommendations.push('تطبيق بروتوكولات الأمان');
        recommendations.push('تسجيل دقيق للوصول');
        riskLevel = 'عالي';
        tips.push('معالجة فورية مع سرية تامة');
        break;
    }

    return {
      priorityInsight: insight,
      recommendedActions: recommendations,
      riskLevel,
      efficiencyTips: tips,
      analysisConfidence: 0.8
    };
  }

  private static generateMockOverallAnalysis(stats: MessagesTimeStats) {
    const responseRate = stats.totalReplied / stats.totalReceived;
    const avgResponseHours = stats.averageResponseTime;
    
    return {
      generalInsights: {
        workloadTrends: 'اتجاه تصاعدي في حجم الرسائل خلال الفترة الأخيرة مع تحسن في أوقات الاستجابة',
        departmentEfficiency: 'الأقسام التقنية تظهر كفاءة أعلى في الاستجابة، بينما تحتاج الأقسام الإدارية لتحسين',
        communicationPatterns: 'ذروة النشاط في ساعات الصباح الأولى مع انخفاض بعد الظهر',
        priorityOptimization: 'توزيع متوازن للأولويات مع إمكانية تحسين تصنيف الرسائل العاجلة',
        predictiveInsights: 'متوقع زيادة 15% في حجم الرسائل خلال الشهر القادم'
      },
      recommendations: {
        immediate: [
          'تحديث بروتوكولات الاستجابة السريعة',
          'إعادة توزيع أعباء العمل على الأقسام'
        ],
        shortTerm: [
          'تدريب الموظفين على إدارة الأولويات',
          'تطوير نظام إنذار مبكر للرسائل المتأخرة'
        ],
        longTerm: [
          'تطوير نظام ذكي للتصنيف التلقائي',
          'إنشاء لوحة تحكم تنبؤية'
        ]
      },
      riskAssessment: {
        level: (responseRate > 0.8 ? 'منخفض' : responseRate > 0.6 ? 'متوسط' : 'عالي') as 'منخفض' | 'متوسط' | 'عالي' | 'حرج',
        factors: [
          'تراكم الرسائل غير المجابة',
          'طول فترات الاستجابة في بعض الأقسام',
          'عدم وضوح معايير الأولويات'
        ],
        mitigation: [
          'تطوير خطة طوارئ للذروات',
          'تحسين التواصل بين الأقسام',
          'إضافة موارد إضافية للأقسام المزدحمة'
        ]
      },
      performanceScore: {
        overall: Math.round(responseRate * 100),
        responsiveness: Math.round((24 / Math.max(avgResponseHours, 1)) * 100),
        organization: 75,
        priority_handling: 80
      },
      analysisConfidence: 0.87
    };
  }

  private static generateWorkloadPrediction(totalMessages: number, urgentRatio: number): string {
    if (urgentRatio > 0.3) {
      return 'متوقع زيادة كبيرة في العبء خلال الأسبوع القادم - يُنصح بالاستعداد';
    } else if (totalMessages > 100) {
      return 'عبء عمل طبيعي مع زيادة تدريجية متوقعة';
    } else {
      return 'عبء عمل منخفض - فرصة مثالية للمهام الإضافية';
    }
  }

  private static analyzeUrgentPatterns(priorityData: any): string {
    const urgentCount = priorityData.priorityCount['عاجل'];
    const secretCount = priorityData.priorityCount['سري'];
    
    if (urgentCount + secretCount > 20) {
      return 'نمط مقلق: كثرة الرسائل العاجلة تشير إلى مشاكل في التخطيط المسبق';
    } else if (urgentCount + secretCount < 5) {
      return 'نمط إيجابي: قلة الرسائل العاجلة تشير إلى تخطيط جيد';
    } else {
      return 'نمط طبيعي: توازن صحي بين الرسائل العاجلة والعادية';
    }
  }

  // دالة مساعدة لتفعيل أو إلغاء تفعيل التحليل
  static setAnalysisEnabled(enabled: boolean): void {
    localStorage.setItem('ai_analysis_enabled', JSON.stringify(enabled));
  }

  static isAnalysisEnabled(): boolean {
    return JSON.parse(localStorage.getItem('ai_analysis_enabled') || 'true');
  }

  // دالة لحفظ آخر تحليل
  static saveLastAnalysis(analysis: any): void {
    localStorage.setItem('last_ai_analysis', JSON.stringify({
      ...analysis,
      timestamp: new Date().toISOString()
    }));
  }

  // دالة لاسترداد آخر تحليل
  static getLastAnalysis(): any | null {
    const saved = localStorage.getItem('last_ai_analysis');
    return saved ? JSON.parse(saved) : null;
  }

  // دالة لتكوين API key بشكل آمن
  static setApiKey(apiKey: string): void {
    this.config.apiKey = apiKey;
    // يمكن حفظها في localStorage مع تشفير إضافي للأمان
    localStorage.setItem('gemini_api_configured', 'true');
  }

  // التحقق من تكوين API
  static isApiConfigured(): boolean {
    return this.config.apiKey !== 'demo-key' || localStorage.getItem('gemini_api_configured') === 'true';
  }
}

// دالة مساعدة للتحقق من إعدادات API
export const validateGeminiConfig = (): boolean => {
  // في الإنتاج، سيتم التحقق من وجود API key صحيح
  return true; // مؤقت للتطوير
};

// دالة لاختبار الاتصال بـ Gemini (محاكي)
export const testGeminiConnection = async (): Promise<boolean> => {
  // في الإنتاج، سيتم اختبار الاتصال الفعلي
  return new Promise((resolve) => {
    setTimeout(() => resolve(true), 1000);
  });
};