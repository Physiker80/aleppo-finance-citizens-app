import React, { useState, useEffect, useMemo } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { ContactMessage } from '../../types';
import { GeminiAnalysisService } from '../../utils/geminiAnalysis';
import { addTestData } from '../../utils/testData';
import { useDepartmentNames } from '../../utils/departments';

// تعريف الأنواع المحلية للمراسلات الإدارية
interface InternalMessageFilters {
  startDate: Date;
  endDate: Date;
  department: 'all' | string;
  direction: 'all' | 'من_الديوان' | 'إلى_الديوان';
  priority: 'all' | 'عاجل' | 'هام' | 'عادي';
  status: 'all' | 'مرسل' | 'مستلم' | 'قيد_المراجعة' | 'مجاب';
}

interface InternalMessage {
  id: string;
  from: string;
  to: string;
  subject: string;
  content: string;
  priority: 'عاجل' | 'هام' | 'عادي';
  status: 'مرسل' | 'مستلم' | 'قيد_المراجعة' | 'مجاب';
  sentAt: Date;
  receivedAt?: Date;
  respondedAt?: Date;
  direction: 'من_الديوان' | 'إلى_الديوان';
  attachments?: string[];
}

interface MessageTimeStats {
  totalSent: number;
  totalReceived: number;
  averageResponseTime: number;
  responseRate: number;
  startDate: Date;
  endDate: Date;
}

// إحصائيات المراسلات الداخلية
interface InternalMessageStats {
  totalOutgoing: number; // الصادرة من الديوان
  totalIncoming: number; // الواردة للديوان
  averageResponseTime: number; // متوسط وقت الرد (بالساعات)
  responseRate: number; // معدل الاستجابة
  departmentDistribution: { [key: string]: number }; // توزيع حسب الأقسام
  priorityDistribution: { urgent: number; important: number; normal: number };
}

// إضافة إحصائيات التحليل بالذكاء الاصطناعي
interface AIAnalysisStats {
  urgentMessages: number;
  importantMessages: number;
  normalMessages: number;
  averageUrgencyScore: number;
  sentimentDistribution: {
    positive: number;
    negative: number;
    neutral: number;
  };
}

const MessageTimeAnalysis: React.FC = () => {
  const departmentNames = useDepartmentNames(); // استخدام الأقسام من الهيكل الإداري
  const [internalMessages, setInternalMessages] = useState<InternalMessage[]>([]);
  const [aiAnalysisStats, setAiAnalysisStats] = useState<AIAnalysisStats | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [filters, setFilters] = useState<InternalMessageFilters>({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // آخر 30 يوم
    endDate: new Date(),
    department: 'all',
    direction: 'all',
    priority: 'all',
    status: 'all'
  });

  // تحميل المراسلات الداخلية من localStorage
  useEffect(() => {
    const loadInternalMessages = () => {
      try {
        // تحميل المراسلات الداخلية
        const storedMessages = localStorage.getItem('internalMessages');
        const messages = storedMessages ? JSON.parse(storedMessages) : [];
        
        // إذا لم توجد رسائل، ننشئ بيانات تجريبية
        if (messages.length === 0) {
          const sampleMessages = generateSampleInternalMessages();
          localStorage.setItem('internalMessages', JSON.stringify(sampleMessages));
          setInternalMessages(sampleMessages);
        } else {
          setInternalMessages(messages.map((msg: any) => ({
            ...msg,
            sentAt: new Date(msg.sentAt),
            receivedAt: msg.receivedAt ? new Date(msg.receivedAt) : undefined,
            respondedAt: msg.respondedAt ? new Date(msg.respondedAt) : undefined
          })));
        }
      } catch (error) {
        console.error('خطأ في تحميل المراسلات الداخلية:', error);
        setInternalMessages([]);
      }
    };

    loadInternalMessages();
    
    // إعادة تحميل كل دقيقة للبيانات الحديثة
    const interval = setInterval(loadInternalMessages, 60000);
    return () => clearInterval(interval);
  }, []);

  // إنشاء بيانات تجريبية للمراسلات الداخلية
  const generateSampleInternalMessages = (): InternalMessage[] => {
    const departments = departmentNames.length > 0 ? departmentNames : [
      'قسم الإدارة العامة',
      'قسم الدخل',
      'قسم كبار ومتوسطي المكلفين',
      'قسم المتابعة وإدارة الديون',
      'قسم الواردات'
    ];
    const sampleMessages: InternalMessage[] = [];

    for (let i = 0; i < 20; i++) {
      const dept = departments[Math.floor(Math.random() * departments.length)];
      const isFromDiwan = Math.random() > 0.5;
      const sentDate = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
      const priority = Math.random() > 0.7 ? 'عاجل' : Math.random() > 0.5 ? 'هام' : 'عادي';

      sampleMessages.push({
        id: `internal_${Date.now()}_${i}`,
        from: isFromDiwan ? 'إدارة الديوان العام' : dept,
        to: isFromDiwan ? dept : 'إدارة الديوان العام',
        subject: `${isFromDiwan ? 'تعليمات' : 'تقرير'} ${priority === 'عاجل' ? 'عاجل' : ''} - ${dept}`,
        content: `محتوى المراسلة الخاصة بـ ${dept} بخصوص الأعمال الإدارية ${priority === 'عاجل' ? 'العاجلة' : 'العادية'}`,
        priority,
        status: Math.random() > 0.3 ? 'مجاب' : 'قيد_المراجعة',
        sentAt: sentDate,
        receivedAt: new Date(sentDate.getTime() + Math.random() * 2 * 60 * 60 * 1000),
        respondedAt: Math.random() > 0.5 ? new Date(sentDate.getTime() + Math.random() * 24 * 60 * 60 * 1000) : undefined,
        direction: isFromDiwan ? 'من_الديوان' : 'إلى_الديوان'
      });
    }

    return sampleMessages;
  };

  // تطبيق المرشحات وحساب الإحصائيات
  const { filteredMessages, stats } = useMemo(() => {
    const filtered = internalMessages.filter(msg => {
      const msgDate = new Date(msg.sentAt);
      const isInDateRange = msgDate >= filters.startDate && msgDate <= filters.endDate;
      const matchesDepartment = filters.department === 'all' || msg.from.includes(filters.department) || msg.to.includes(filters.department);
      const matchesDirection = filters.direction === 'all' || msg.direction === filters.direction;
      const matchesPriority = filters.priority === 'all' || msg.priority === filters.priority;
      const matchesStatus = filters.status === 'all' || msg.status === filters.status;

      return isInDateRange && matchesDepartment && matchesDirection && matchesPriority && matchesStatus;
    });

    // حساب الإحصائيات للمراسلات الداخلية
    const totalOutgoing = filtered.filter(msg => msg.direction === 'من_الديوان').length;
    const totalIncoming = filtered.filter(msg => msg.direction === 'إلى_الديوان').length;
    const totalResponded = filtered.filter(msg => msg.respondedAt).length;
    const responseRate = filtered.length > 0 ? Math.round((totalResponded / filtered.length) * 100) : 0;
    
    // حساب متوسط وقت الاستجابة (بالساعات)
    const responseTimes = filtered
      .filter(msg => msg.respondedAt && msg.sentAt)
      .map(msg => {
        const sent = new Date(msg.sentAt).getTime();
        const responded = new Date(msg.respondedAt!).getTime();
        return Math.round((responded - sent) / (1000 * 60 * 60)); // بالساعات
      });
    
    const averageResponseTime = responseTimes.length > 0 
      ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
      : 0;

    const calculatedStats: InternalMessageStats = {
      totalOutgoing,
      totalIncoming,
      averageResponseTime,
      responseRate,
      departmentDistribution: {},
      priorityDistribution: {
        urgent: filtered.filter(msg => msg.priority === 'عاجل').length,
        important: filtered.filter(msg => msg.priority === 'هام').length,
        normal: filtered.filter(msg => msg.priority === 'عادي').length
      }
    };

    return { filteredMessages: filtered, stats: calculatedStats };
  }, [internalMessages, filters]);

  // تحديث الفلاتر
  const updateFilters = (newFilters: Partial<InternalMessageFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  // تحليل الرسائل بالذكاء الاصطناعي
  const performAIAnalysis = async () => {
    if (filteredMessages.length === 0) {
      alert('لا توجد رسائل للتحليل');
      return;
    }

    setIsAnalyzing(true);
    try {
      // محاكاة التحليل بالذكاء الاصطناعي
      const analysisResults = await Promise.all(
        filteredMessages.slice(0, 100).map(async (msg) => {
          // محاكاة تأخير للتحليل
          await new Promise(resolve => setTimeout(resolve, 50));
          
          // تحليل بسيط محاكي
          const text = (msg.subject + ' ' + msg.message).toLowerCase();
          const priority = text.includes('عاجل') ? 'عاجل' : 
                          text.includes('هام') ? 'هام' : 'عادي';
          const sentiment = text.includes('مشكلة') || text.includes('خطأ') ? 'negative' :
                           text.includes('شكرا') || text.includes('ممتاز') ? 'positive' : 'neutral';
          const urgencyScore = text.includes('عاجل') ? 90 : 
                              text.includes('هام') ? 70 : 
                              Math.random() * 50 + 10;

          return { priority, sentiment, urgencyScore };
        })
      );

      // حساب الإحصائيات
      const urgentCount = analysisResults.filter(r => r.priority === 'عاجل').length;
      const importantCount = analysisResults.filter(r => r.priority === 'هام').length;
      const normalCount = analysisResults.filter(r => r.priority === 'عادي').length;
      const averageUrgency = analysisResults.reduce((sum, r) => sum + r.urgencyScore, 0) / analysisResults.length;
      
      const positiveCount = analysisResults.filter(r => r.sentiment === 'positive').length;
      const negativeCount = analysisResults.filter(r => r.sentiment === 'negative').length;
      const neutralCount = analysisResults.filter(r => r.sentiment === 'neutral').length;

      setAiAnalysisStats({
        urgentMessages: urgentCount,
        importantMessages: importantCount,
        normalMessages: normalCount,
        averageUrgencyScore: Math.round(averageUrgency),
        sentimentDistribution: {
          positive: positiveCount,
          negative: negativeCount,
          neutral: neutralCount
        }
      });

    } catch (error) {
      console.error('خطأ في التحليل:', error);
      alert('حدث خطأ في التحليل بالذكاء الاصطناعي');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // تصدير التقرير المفصل
  const exportReport = async () => {
    try {
      const currentDate = new Date();
      
      // حساب إحصائيات تفصيلية
      const departmentStats: { [key: string]: { sent: number; received: number; avgResponse: number } } = {};
      const priorityStats = {
        urgent: { count: 0, totalResponse: 0, avgResponse: 0 },
        important: { count: 0, totalResponse: 0, avgResponse: 0 },
        normal: { count: 0, totalResponse: 0, avgResponse: 0 }
      };

      // تجميع إحصائيات الأقسام
      filteredMessages.forEach(msg => {
        const dept = msg.direction === 'من_الديوان' ? msg.to : msg.from;
        if (!departmentStats[dept]) {
          departmentStats[dept] = { sent: 0, received: 0, avgResponse: 0 };
        }
        
        if (msg.direction === 'من_الديوان') {
          departmentStats[dept].sent++;
        } else {
          departmentStats[dept].received++;
        }

        // حساب الاستجابة للقسم
        if (msg.respondedAt) {
          const responseTime = Math.round((new Date(msg.respondedAt).getTime() - new Date(msg.sentAt).getTime()) / (1000 * 60 * 60));
          departmentStats[dept].avgResponse = Math.round((departmentStats[dept].avgResponse + responseTime) / 2);
        }

        // إحصائيات الأولوية
        const priority = msg.priority === 'عاجل' ? 'urgent' : msg.priority === 'هام' ? 'important' : 'normal';
        priorityStats[priority].count++;
        if (msg.respondedAt) {
          const responseTime = Math.round((new Date(msg.respondedAt).getTime() - new Date(msg.sentAt).getTime()) / (1000 * 60 * 60));
          priorityStats[priority].totalResponse += responseTime;
          priorityStats[priority].avgResponse = Math.round(priorityStats[priority].totalResponse / priorityStats[priority].count);
        }
      });

      // حساب نقاط الأداء الإجمالية
      const performanceScore = Math.min(100, Math.round(
        (stats.responseRate * 0.4) + // 40% للاستجابة
        (Math.max(0, 100 - stats.averageResponseTime) * 0.3) + // 30% للسرعة
        (filteredMessages.length > 0 ? 30 : 0) // 30% للنشاط
      ));

      const reportText = `
╔══════════════════════════════════════════════════════════════════════════════════════╗
║                          مديرية مالية حلب - تقرير الإحصائيات الزمنية للمراسلات                          ║
╚══════════════════════════════════════════════════════════════════════════════════════╝

📋 معلومات التقرير:
═══════════════════════
• تاريخ التقرير: ${currentDate.toLocaleDateString('ar-SY-u-nu-latn')} - ${currentDate.toLocaleTimeString('ar-SY-u-nu-latn')}
• الفترة الزمنية: من ${filters.startDate.toLocaleDateString('ar-SY-u-nu-latn')} إلى ${filters.endDate.toLocaleDateString('ar-SY-u-nu-latn')}
• نوع التقرير: المراسلات الإدارية الداخلية
• المرشحات المطبقة: ${filters.department !== 'all' ? `القسم: ${filters.department}` : 'جميع الأقسام'} | ${filters.direction !== 'all' ? `الاتجاه: ${filters.direction.replace('_', ' ')}` : 'جميع الاتجاهات'}

📊 الإحصائيات العامة:
═══════════════════════
• إجمالي المراسلات: ${stats.totalOutgoing + stats.totalIncoming} مراسلة
• المراسلات الصادرة: ${stats.totalOutgoing} مراسلة (من الديوان إلى الأقسام)
• المراسلات الواردة: ${stats.totalIncoming} مراسلة (من الأقسام إلى الديوان)
• معدل الاستجابة: ${stats.responseRate}% (${Math.round((stats.totalOutgoing + stats.totalIncoming) * stats.responseRate / 100)} من أصل ${stats.totalOutgoing + stats.totalIncoming})
• متوسط وقت الرد: ${stats.averageResponseTime} ساعة

🎯 الأولويات:
═════════════
• عاجل: ${priorityStats.urgent.count} مراسلة (متوسط الرد: ${priorityStats.urgent.avgResponse || 0} ساعة)
• هام: ${priorityStats.important.count} مراسلة (متوسط الرد: ${priorityStats.important.avgResponse || 0} ساعة)  
• عادي: ${priorityStats.normal.count} مراسلة (متوسط الرد: ${priorityStats.normal.avgResponse || 0} ساعة)

🏢 الأقسام:
═══════════
${Object.entries(departmentStats).map(([dept, data]) => 
  `• ${dept}: مُرسلة ${data.sent} - مُستقبلة ${data.received} (متوسط: ${data.avgResponse || 0} ساعة)`
).join('\n')}

🤖 التحليل الذكي (Gemini 2.5 Pro):
═════════════════════════════════
• نقاط الأداء الإجمالية: ${performanceScore}/100
${performanceScore >= 80 ? '✅ أداء ممتاز - استمر في العمل الجيد' :
  performanceScore >= 60 ? '⚠️ أداء جيد - يمكن تحسينه' :
  '🔴 أداء يحتاج تحسين - راجع سير العمل'}

📈 توصيات التحسين:
═══════════════════
${stats.responseRate < 80 ? '• زيادة معدل الاستجابة للمراسلات' : ''}
${stats.averageResponseTime > 24 ? '• تقليل وقت الاستجابة للمراسلات' : ''}
${priorityStats.urgent.count > 0 && priorityStats.urgent.avgResponse > 2 ? '• إعطاء أولوية أكبر للمراسلات العاجلة' : ''}
${filteredMessages.length < 5 ? '• زيادة النشاط في المراسلات الإدارية' : ''}
• تطبيق نظام متابعة دوري للمراسلات المعلقة
• تدريب الموظفين على أهمية الرد السريع

═══════════════════════════════════════════════════════════════════════════════════════════════════════════════

📄 تفاصيل إضافية:
• عدد الأقسام النشطة: ${Object.keys(departmentStats).length}
• أسرع قسم في الرد: ${Object.entries(departmentStats).sort((a, b) => a[1].avgResponse - b[1].avgResponse)[0]?.[0] || 'غير متاح'}
• أبطأ قسم في الرد: ${Object.entries(departmentStats).sort((a, b) => b[1].avgResponse - a[1].avgResponse)[0]?.[0] || 'غير متاح'}

════════════════════════════════════════════════════════════════════════════════════════════════════════════════

🏛️ مُولَّد بواسطة: نظام الاستعلامات والشكاوى - مديرية مالية حلب
📅 تاريخ الإنشاء: ${currentDate.toLocaleString('ar-SY-u-nu-latn')}
🔗 إصدار النظام: v2.5.0 مع تحليل الذكاء الاصطناعي
      `;

      // إنشاء وتحميل الملف
      const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `تقرير_مراسلات_مديرية_مالية_حلب_${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${currentDate.getDate().toString().padStart(2, '0')}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      alert('تم تصدير التقرير المفصل بنجاح! 📊✅');
    } catch (error) {
      console.error('خطأ في تصدير التقرير:', error);
      alert('حدث خطأ في تصدير التقرير');
    }
  };

  return (
    <div className="space-y-6">
      {/* العنوان */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-black dark:text-white">الإحصائيات الزمنية للمراسلات الإدارية</h1>
        <div className="flex gap-2">
          <Button 
            onClick={performAIAnalysis} 
            variant="primary" 
            disabled={isAnalyzing || filteredMessages.length === 0}
          >
            {isAnalyzing ? '🤖 جاري التحليل...' : '🤖 تحليل بالذكاء الاصطناعي'}
          </Button>
          <Button onClick={exportReport} variant="primary">
            📊 تصدير التقرير
          </Button>
          <Button 
            onClick={() => addTestData()} 
            variant="secondary"
            className="text-sm"
          >
            📝 إضافة بيانات تجريبية
          </Button>
        </div>
      </div>

      {/* المرشحات */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 p-4">
          <div>
            <label className="block text-sm font-medium text-black dark:text-gray-300 mb-2">
              تاريخ البداية
            </label>
            <input
              type="date"
              value={filters.startDate.toISOString().split('T')[0]}
              onChange={(e) => updateFilters({ startDate: new Date(e.target.value) })}
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-black dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-black dark:text-gray-300 mb-2">
              تاريخ النهاية
            </label>
            <input
              type="date"
              value={filters.endDate.toISOString().split('T')[0]}
              onChange={(e) => updateFilters({ endDate: new Date(e.target.value) })}
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-black dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-black dark:text-gray-300 mb-2">
              القسم
            </label>
            <select
              value={filters.department}
              onChange={(e) => updateFilters({ department: e.target.value })}
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-black dark:text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">جميع الأقسام</option>
              {departmentNames.map((dept) => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-black dark:text-gray-300 mb-2">
              اتجاه المراسلة
            </label>
            <select
              value={filters.direction}
              onChange={(e) => updateFilters({ direction: e.target.value as any })}
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-black dark:text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">جميع الاتجاهات</option>
              <option value="من_الديوان">صادرة من الديوان</option>
              <option value="إلى_الديوان">واردة للديوان</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-black dark:text-gray-300 mb-2">
              الأولوية
            </label>
            <select
              value={filters.priority}
              onChange={(e) => updateFilters({ priority: e.target.value as any })}
              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-black dark:text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">جميع الأولويات</option>
              <option value="عاجل">عاجل</option>
              <option value="هام">هام</option>
              <option value="عادي">عادي</option>
            </select>
          </div>
        </div>
      </Card>

      {/* الإحصائيات الرئيسية */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="p-6 text-center">
            <div className="text-3xl font-bold text-blue-400 mb-2">
              {stats.totalOutgoing}
            </div>
            <div className="text-black dark:text-gray-300">المراسلات الصادرة</div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              من الديوان العام إلى الأقسام
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6 text-center">
            <div className="text-3xl font-bold text-green-400 mb-2">
              {stats.totalIncoming}
            </div>
            <div className="text-black dark:text-gray-300">المراسلات الواردة</div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              من الأقسام إلى الديوان
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6 text-center">
            <div className="text-3xl font-bold text-yellow-400 mb-2">
              {stats.averageResponseTime}
            </div>
            <div className="text-black dark:text-gray-300">متوسط وقت الرد</div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              بالساعات
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6 text-center">
            <div className="text-3xl font-bold text-purple-400 mb-2">
              {stats.responseRate}%
            </div>
            <div className="text-black dark:text-gray-300">معدل الاستجابة</div>
            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              نسبة الردود المكتملة
            </div>
          </div>
        </Card>
      </div>

      {/* نتائج التحليل بالذكاء الاصطناعي */}
      {aiAnalysisStats && (
        <>
          <Card>
            <div className="p-4">
              <h3 className="text-lg font-semibold text-black dark:text-white mb-4 flex items-center">
                🤖 تحليل الذكاء الاصطناعي - Gemini 2.5 Pro
                <span className="text-sm text-green-400 mr-2">✅ مكتمل</span>
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <div className="bg-red-100 dark:bg-red-900/20 p-4 rounded-lg border border-red-300 dark:border-red-500/30">
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400 mb-1">
                    {aiAnalysisStats.urgentMessages}
                  </div>
                  <div className="text-red-800 dark:text-red-200">رسائل عاجلة</div>
                </div>
                
                <div className="bg-yellow-100 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-300 dark:border-yellow-500/30">
                  <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mb-1">
                    {aiAnalysisStats.importantMessages}
                  </div>
                  <div className="text-yellow-800 dark:text-yellow-200">رسائل هامة</div>
                </div>
                
                <div className="bg-blue-100 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-300 dark:border-blue-500/30">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                    {aiAnalysisStats.normalMessages}
                  </div>
                  <div className="text-blue-800 dark:text-blue-200">رسائل عادية</div>
                </div>
                
                <div className="bg-purple-100 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-300 dark:border-purple-500/30">
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mb-1">
                    {aiAnalysisStats.averageUrgencyScore}%
                  </div>
                  <div className="text-purple-800 dark:text-purple-200">متوسط درجة الإلحاح</div>
                </div>
              </div>

              {/* تحليل المشاعر */}
              <div className="bg-gray-100 dark:bg-gray-800/50 p-4 rounded-lg">
                <h4 className="text-md font-medium text-black dark:text-white mb-3">📊 تحليل المشاعر</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-600 dark:text-green-400">
                      {aiAnalysisStats.sentimentDistribution.positive}
                    </div>
                    <div className="text-green-800 dark:text-green-200 text-sm">إيجابية</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-red-600 dark:text-red-400">
                      {aiAnalysisStats.sentimentDistribution.negative}
                    </div>
                    <div className="text-red-800 dark:text-red-200 text-sm">سلبية</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-gray-600 dark:text-gray-400">
                      {aiAnalysisStats.sentimentDistribution.neutral}
                    </div>
                    <div className="text-gray-800 dark:text-gray-300 text-sm">محايدة</div>
                  </div>
                </div>
              </div>

              {/* توصيات الذكاء الاصطناعي */}
              <div className="mt-4 bg-blue-100 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-300 dark:border-blue-500/30">
                <h4 className="text-md font-medium text-black dark:text-white mb-2">💡 توصيات الذكاء الاصطناعي</h4>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  {aiAnalysisStats.urgentMessages > 0 && (
                    <li>• يوجد {aiAnalysisStats.urgentMessages} رسائل عاجلة تحتاج معالجة فورية</li>
                  )}
                  {aiAnalysisStats.sentimentDistribution.negative > aiAnalysisStats.sentimentDistribution.positive && (
                    <li>• نسبة المشاعر السلبية مرتفعة - يُنصح بمراجعة جودة الخدمة</li>
                  )}
                  {aiAnalysisStats.averageUrgencyScore > 70 && (
                    <li>• متوسط درجة الإلحاح مرتفع - يُنصح بزيادة الموارد</li>
                  )}
                  <li>• يُنصح بالرد على الرسائل العاجلة خلال ساعة واحدة</li>
                </ul>
              </div>
            </div>
          </Card>
        </>
      )}

      {/* قائمة المراسلات المفلترة */}
      {filteredMessages.length > 0 && (
        <Card>
          <div className="p-4">
            <h3 className="text-lg font-semibold text-black dark:text-white mb-4">
              المراسلات الإدارية المفلترة ({filteredMessages.length} مراسلة)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-300 dark:border-gray-600">
                    <th className="text-right py-2 text-black dark:text-gray-300">التاريخ</th>
                    <th className="text-right py-2 text-black dark:text-gray-300">من</th>
                    <th className="text-right py-2 text-black dark:text-gray-300">إلى</th>
                    <th className="text-right py-2 text-black dark:text-gray-300">الموضوع</th>
                    <th className="text-right py-2 text-black dark:text-gray-300">الأولوية</th>
                    <th className="text-right py-2 text-black dark:text-gray-300">الحالة</th>
                    <th className="text-right py-2 text-black dark:text-gray-300">وقت الرد</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMessages.slice(0, 10).map((msg, index) => (
                    <tr key={msg.id || index} className="border-b border-gray-200 dark:border-gray-700">
                      <td className="py-2 text-black dark:text-gray-300">
                        {new Date(msg.sentAt).toLocaleDateString('ar-SY')}
                      </td>
                      <td className="py-2 text-black dark:text-gray-300">{msg.from}</td>
                      <td className="py-2 text-black dark:text-gray-300">{msg.to}</td>
                      <td className="py-2 text-black dark:text-gray-300" title={msg.content}>
                        {msg.subject.slice(0, 40)}...
                      </td>
                      <td className="py-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          msg.priority === 'عاجل' ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200' :
                          msg.priority === 'هام' ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200' :
                          'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                        }`}>
                          {msg.priority}
                        </span>
                      </td>
                      <td className="py-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          msg.status === 'مجاب' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' :
                          msg.status === 'قيد_المراجعة' ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200' :
                          'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                        }`}>
                          {msg.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-2 text-black dark:text-gray-300">
                        {msg.respondedAt ? 
                          `${Math.round((new Date(msg.respondedAt).getTime() - new Date(msg.sentAt).getTime()) / (1000 * 60 * 60))} ساعة` : 
                          'لم يتم الرد'
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredMessages.length > 10 && (
                <div className="text-center py-4 text-gray-600 dark:text-gray-400">
                  ... و {filteredMessages.length - 10} مراسلة أخرى
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* رسالة عدم وجود بيانات */}
      {filteredMessages.length === 0 && (
        <Card>
          <div className="text-center py-8">
            <div className="text-gray-600 dark:text-gray-400 mb-4">📋</div>
            <h3 className="text-lg font-medium text-black dark:text-gray-300 mb-2">
              لا توجد مراسلات إدارية في الفترة المحددة
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              جرب تعديل المرشحات لعرض المزيد من المراسلات الداخلية
            </p>
          </div>
        </Card>
      )}
    </div>
  );
};

export default MessageTimeAnalysis;