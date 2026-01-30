import { InternalMessage, MessagesTimeStats, MessageTimeFilters, TimeBasedAlert } from '../types/internalMessageTypes';
import { GeminiAnalysisService } from './geminiAnalysis';
import { formatDate, formatDateTime } from './arabicNumerals';

// دوال مساعدة للتعامل مع التواريخ
export const DateHelpers = {
  // تحويل التاريخ إلى تنسيق YYYY-MM-DD
  toDateString: (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toISOString().split('T')[0];
  },

  // إضافة أيام لتاريخ معين
  addDays: (date: Date, days: number): Date => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  },

  // الحصول على بداية ونهاية فترة زمنية
  getPeriodRange: (period: MessageTimeFilters['period']): { start: Date; end: Date } => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (period) {
      case 'اليوم':
        return { start: today, end: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1) };
      
      case 'هذا الأسبوع': {
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        return { start: startOfWeek, end: DateHelpers.addDays(startOfWeek, 6) };
      }
      
      case 'هذا الشهر': {
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        return { start: startOfMonth, end: endOfMonth };
      }
      
      case 'آخر 7 أيام':
        return { start: DateHelpers.addDays(today, -7), end: today };
      
      case 'آخر 30 يوماً':
        return { start: DateHelpers.addDays(today, -30), end: today };
      
      case 'آخر 90 يوماً':
        return { start: DateHelpers.addDays(today, -90), end: today };
      
      case 'هذا العام': {
        const startOfYear = new Date(today.getFullYear(), 0, 1);
        const endOfYear = new Date(today.getFullYear(), 11, 31);
        return { start: startOfYear, end: endOfYear };
      }
      
      default:
        return { start: DateHelpers.addDays(today, -30), end: today };
    }
  },

  // تنسيق التاريخ للعرض باللغة العربية
  formatArabicDate: (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return formatDate(d, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  },

  // تنسيق التاريخ والوقت للعرض باللغة العربية
  formatArabicDateTime: (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return formatDateTime(d, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  // حساب الفرق بالساعات بين تاريخين
  getHoursDifference: (startDate: Date | string, endDate: Date | string): number => {
    const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
    const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
    return Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60);
  }
};

// دوال تصفية الرسائل حسب المعايير الزمنية
export const MessageFilters = {
  // تصفية الرسائل حسب المعايير المحددة
  filterMessages: (messages: InternalMessage[], filters: MessageTimeFilters): InternalMessage[] => {
    if (!Array.isArray(messages)) return [];
    let filtered = [...messages];

    // تصفية حسب التاريخ
    if (filters.period && filters.period !== 'مخصص') {
      const { start, end } = DateHelpers.getPeriodRange(filters.period);
      filtered = filtered.filter(msg => {
        const msgDate = new Date(msg.timestamp);
        return msgDate >= start && msgDate <= end;
      });
    } else if (filters.startDate || filters.endDate) {
      filtered = filtered.filter(msg => {
        const msgDate = new Date(msg.timestamp);
        if (filters.startDate && msgDate < new Date(filters.startDate)) return false;
        if (filters.endDate && msgDate > new Date(filters.endDate)) return false;
        return true;
      });
    }

    // تصفية حسب الأقسام
    if (filters.departments?.length) {
      filtered = filtered.filter(msg => 
        filters.departments!.includes(msg.fromDepartment) || 
        msg.toDepartments.some(dept => filters.departments!.includes(dept))
      );
    }

    // تصفية حسب الأولوية
    if (filters.priorities?.length) {
      filtered = filtered.filter(msg => filters.priorities!.includes(msg.priority));
    }

    // تصفية حسب الحالة
    if (filters.status?.length) {
      filtered = filtered.filter(msg => filters.status!.includes(msg.status));
    }

    // تصفية حسب العلامات
    if (filters.tags?.length) {
      filtered = filtered.filter(msg => 
        msg.tags?.some(tag => filters.tags!.includes(tag))
      );
    }

    // تصفية حسب المرسل
    if (filters.sender) {
      filtered = filtered.filter(msg => 
        msg.sender.toLowerCase().includes(filters.sender!.toLowerCase()) ||
        msg.fromDepartment.toLowerCase().includes(filters.sender!.toLowerCase())
      );
    }

    // تصفية حسب وجود مرفقات
    if (filters.hasAttachments !== undefined) {
      filtered = filtered.filter(msg => 
        filters.hasAttachments ? !!msg.attachedDocument : !msg.attachedDocument
      );
    }

    return filtered;
  },

  // ترتيب الرسائل حسب معايير مختلفة
  sortMessages: (messages: InternalMessage[], sortBy: 'timestamp' | 'priority' | 'department', direction: 'asc' | 'desc' = 'desc'): InternalMessage[] => {
    const sorted = [...messages];
    
    sorted.sort((a, b) => {
      let compareValue = 0;
      
      switch (sortBy) {
        case 'timestamp':
          compareValue = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
          break;
        case 'priority':
          const priorityOrder = { 'سري': 4, 'عاجل': 3, 'هام': 2, 'عادي': 1 };
          compareValue = priorityOrder[a.priority] - priorityOrder[b.priority];
          break;
        case 'department':
          compareValue = a.fromDepartment.localeCompare(b.fromDepartment, 'ar');
          break;
      }
      
      return direction === 'desc' ? -compareValue : compareValue;
    });
    
    return sorted;
  }
};

// دوال حساب الإحصائيات الزمنية
export const TimeStatsCalculator = {
  // حساب الإحصائيات الأساسية
  calculateBasicStats: (messages: InternalMessage[], filters: MessageTimeFilters): MessagesTimeStats => {
    if (!Array.isArray(messages)) messages = [];
    const filteredMessages = MessageFilters.filterMessages(messages, filters);
    const { start, end } = filters.period && filters.period !== 'مخصص' 
      ? DateHelpers.getPeriodRange(filters.period)
      : { 
          start: filters.startDate ? new Date(filters.startDate) : DateHelpers.addDays(new Date(), -30),
          end: filters.endDate ? new Date(filters.endDate) : new Date()
        };

    const stats: MessagesTimeStats = {
      period: filters.period === 'مخصص' ? 'يومي' : 'يومي',
      startDate: DateHelpers.toDateString(start),
      endDate: DateHelpers.toDateString(end),
      totalSent: filteredMessages.filter(m => m.status !== 'مسودة').length,
      totalReceived: filteredMessages.length,
      totalReplied: filteredMessages.filter(m => m.status === 'مجاب').length,
      totalArchived: filteredMessages.filter(m => m.status === 'مؤرشف').length,
      averageResponseTime: 0,
      departmentBreakdown: {},
      priorityBreakdown: {},
      dailyActivity: {}
    };

    // حساب متوسط وقت الرد
    const repliedMessages = filteredMessages.filter(m => m.repliedBy && Object.keys(m.repliedBy).length > 0);
    if (repliedMessages.length > 0) {
      const totalResponseTime = repliedMessages.reduce((sum, msg) => {
        const responseDate = Object.values(msg.repliedBy!)[0];
        return sum + DateHelpers.getHoursDifference(msg.timestamp, responseDate);
      }, 0);
      stats.averageResponseTime = totalResponseTime / repliedMessages.length;
    }

    // تحليل الأقسام
    const departments = new Set<string>();
    filteredMessages.forEach(msg => {
      departments.add(msg.fromDepartment);
      msg.toDepartments.forEach(dept => departments.add(dept));
    });

    departments.forEach(dept => {
      const deptMessages = filteredMessages.filter(m => 
        m.fromDepartment === dept || m.toDepartments.includes(dept)
      );
      
      stats.departmentBreakdown[dept] = {
        sent: filteredMessages.filter(m => m.fromDepartment === dept).length,
        received: filteredMessages.filter(m => m.toDepartments.includes(dept)).length,
        replied: deptMessages.filter(m => m.repliedBy && m.repliedBy[dept]).length,
        archived: deptMessages.filter(m => m.archivedBy && m.archivedBy[dept]).length,
        averageResponseTime: 0
      };
    });

    // تحليل الأولويات
    ['عادي', 'هام', 'عاجل', 'سري'].forEach(priority => {
      const priorityMessages = filteredMessages.filter(m => m.priority === priority);
      if (priorityMessages.length > 0) {
        stats.priorityBreakdown[priority] = {
          count: priorityMessages.length,
          averageResponseTime: 0
        };
        
        const repliedPriorityMessages = priorityMessages.filter(m => m.repliedBy && Object.keys(m.repliedBy).length > 0);
        if (repliedPriorityMessages.length > 0) {
          const avgTime = repliedPriorityMessages.reduce((sum, msg) => {
            const responseDate = Object.values(msg.repliedBy!)[0];
            return sum + DateHelpers.getHoursDifference(msg.timestamp, responseDate);
          }, 0) / repliedPriorityMessages.length;
          stats.priorityBreakdown[priority].averageResponseTime = avgTime;
        }
      }
    });

    // النشاط اليومي
    filteredMessages.forEach(msg => {
      const dateKey = DateHelpers.toDateString(new Date(msg.timestamp));
      if (!stats.dailyActivity[dateKey]) {
        stats.dailyActivity[dateKey] = { sent: 0, received: 0, replied: 0 };
      }
      
      stats.dailyActivity[dateKey].sent++;
      if (msg.status === 'مجاب') {
        stats.dailyActivity[dateKey].replied++;
      }
    });

    return stats;
  },

  // إنشاء بيانات الرسم البياني
  generateChartData: (stats: MessagesTimeStats) => {
    const dates = Object.keys(stats.dailyActivity).sort();
    
    return {
      labels: dates.map(date => DateHelpers.formatArabicDate(new Date(date))),
      datasets: [
        {
          label: 'المرسلة',
          data: dates.map(date => stats.dailyActivity[date]?.sent || 0),
          backgroundColor: 'rgba(59, 130, 246, 0.6)',
          borderColor: 'rgba(59, 130, 246, 1)'
        },
        {
          label: 'المجاب عليها',
          data: dates.map(date => stats.dailyActivity[date]?.replied || 0),
          backgroundColor: 'rgba(16, 185, 129, 0.6)',
          borderColor: 'rgba(16, 185, 129, 1)'
        }
      ]
    };
  },

  // اكتشاف التنبيهات الزمنية
  detectTimeBasedAlerts: (messages: InternalMessage[], department: string): TimeBasedAlert[] => {
    const alerts: TimeBasedAlert[] = [];
    const now = new Date();
    const oneDayAgo = DateHelpers.addDays(now, -1);
    
    // تحديد الرسائل المتأخرة في الرد
    const overdueMessages = messages.filter(msg => {
      const messageDate = new Date(msg.timestamp);
      const isOverdue = messageDate < oneDayAgo && 
                       msg.toDepartments.includes(department) && 
                       msg.status === 'مرسل' && 
                       msg.priority !== 'عادي';
      return isOverdue;
    });

    if (overdueMessages.length > 0) {
      alerts.push({
        id: `overdue-${department}-${Date.now()}`,
        type: 'response_overdue',
        department,
        threshold: 24,
        currentValue: overdueMessages.length,
        message: `لديك ${overdueMessages.length} رسائل متأخرة في الرد`,
        createdAt: now
      });
    }

    // تحديد الحجم العالي من الرسائل
    const todayMessages = messages.filter(msg => {
      const messageDate = new Date(msg.timestamp);
      return DateHelpers.toDateString(messageDate) === DateHelpers.toDateString(now) &&
             msg.toDepartments.includes(department);
    });

    if (todayMessages.length > 20) {
      alerts.push({
        id: `high-volume-${department}-${Date.now()}`,
        type: 'high_volume',
        department,
        threshold: 20,
        currentValue: todayMessages.length,
        message: `عدد كبير من الرسائل اليوم: ${todayMessages.length}`,
        createdAt: now
      });
    }

    return alerts;
  },

  // حساب الإحصائيات مع التحليل الذكي
  calculateStatsWithAI: async (messages: InternalMessage[], filters: MessageTimeFilters): Promise<MessagesTimeStats> => {
    // حساب الإحصائيات الأساسية أولاً
    const basicStats = TimeStatsCalculator.calculateBasicStats(messages, filters);
    
    // إضافة التحليل الذكي إذا كان مفعلاً
    if (GeminiAnalysisService.isAnalysisEnabled()) {
      try {
        // تحليل شامل للنظام
        const overallAnalysis = await GeminiAnalysisService.generateOverallAnalysis(basicStats);
        basicStats.overallAIAnalysis = {
          geminiVersion: '2.5-pro',
          analysisTimestamp: new Date().toISOString(),
          ...overallAnalysis,
          isEnabled: true
        };

        // تحليل كل أولوية على حدة
        for (const [priority, data] of Object.entries(basicStats.priorityBreakdown)) {
          const priorityMessages = messages.filter(msg => msg.priority === priority);
          const priorityAnalysis = await GeminiAnalysisService.analyzeSinglePriority(priority, priorityMessages);
          
          data.aiAnalysis = {
            geminiVersion: '2.5-pro',
            lastAnalyzed: new Date().toISOString(),
            ...priorityAnalysis
          };
        }

        // حفظ آخر تحليل
        GeminiAnalysisService.saveLastAnalysis({
          timestamp: new Date().toISOString(),
          overallAnalysis: basicStats.overallAIAnalysis,
          priorityAnalyses: Object.entries(basicStats.priorityBreakdown).reduce((acc, [priority, data]) => {
            acc[priority] = data.aiAnalysis;
            return acc;
          }, {} as any)
        });

      } catch (error) {
        console.warn('فشل في تحليل الذكاء الصناعي:', error);
        // في حالة الفشل، نكمل بدون التحليل الذكي
      }
    }
    
    return basicStats;
  }
};

// دوال مساعدة لإدارة localStorage
export const StorageHelpers = {
  // حفظ الرسائل الداخلية
  saveInternalMessages: (messages: InternalMessage[]): void => {
    try {
      localStorage.setItem('internalMessages', JSON.stringify(messages));
    } catch (error) {
      console.error('Error saving internal messages:', error);
    }
  },

  // جلب الرسائل الداخلية
  getInternalMessages: (): InternalMessage[] => {
    try {
      const data = localStorage.getItem('internalMessages');
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error loading internal messages:', error);
      return [];
    }
  },

  // حفظ الفلاتر المفضلة للمستخدم
  saveUserFilters: (department: string, filters: MessageTimeFilters): void => {
    try {
      const key = `message_filters_${department.replace(/\s/g, '_')}`;
      localStorage.setItem(key, JSON.stringify(filters));
    } catch (error) {
      console.error('Error saving filters:', error);
    }
  },

  // جلب الفلاتر المفضلة للمستخدم
  getUserFilters: (department: string): MessageTimeFilters | null => {
    try {
      const key = `message_filters_${department.replace(/\s/g, '_')}`;
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error loading filters:', error);
      return null;
    }
  }
};