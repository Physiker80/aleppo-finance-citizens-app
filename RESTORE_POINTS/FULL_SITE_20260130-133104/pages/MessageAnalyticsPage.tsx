import React, { useContext, useState, useMemo } from 'react';
import { AppContext } from '../App';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

interface AIInsight {
  type: 'success' | 'warning' | 'info' | 'trend';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  recommendation?: string;
}

const MessageAnalyticsPage: React.FC = () => {
  const appContext = useContext(AppContext);
  
  // التحقق من تسجيل الدخول كموظف
  if (!appContext?.isEmployeeLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white">
              تسجيل الدخول مطلوب
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              يجب تسجيل الدخول كموظف للوصول إلى الإحصائيات الزمنية للمراسلات
            </p>
          </div>
        </div>
      </div>
    );
  }

  const currentEmployee = appContext.currentEmployee;
  const isAdmin = currentEmployee?.role === 'مدير';
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [useSampleData, setUseSampleData] = useState(false);

  // إحصائيات الرسائل الداخلية
  const stats = useMemo(() => {
    const internalMessages = appContext?.internalMessages || [];
    
    // فلترة حسب القسم إذا لم يكن مديراً
    let filteredMessages = isAdmin ? internalMessages : 
      internalMessages.filter(msg => 
        msg.fromDepartment === currentEmployee?.department || 
        msg.toDepartment === currentEmployee?.department
      );

    // فلترة حسب القسم المحدد
    if (selectedDepartment) {
      filteredMessages = filteredMessages.filter(msg => 
        msg.fromDepartment === selectedDepartment || msg.toDepartment === selectedDepartment
      );
    }

    // فلترة حسب النطاق الزمني
    const now = new Date();
    const rangeStart = new Date();
    switch (dateRange) {
      case 'week':
        rangeStart.setDate(now.getDate() - 7);
        break;
      case 'month':
        rangeStart.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        rangeStart.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        rangeStart.setFullYear(now.getFullYear() - 1);
        break;
    }

    filteredMessages = filteredMessages.filter(msg => {
      const msgDate = new Date(msg.createdAt);
      return msgDate >= rangeStart;
    });

    const total = filteredMessages.length;
    
    // الإحصائيات حسب الأولوية
    const byPriority = {
      'عالية': filteredMessages.filter(m => m.priority === 'عالية').length,
      'متوسطة': filteredMessages.filter(m => m.priority === 'متوسطة').length,
      'منخفضة': filteredMessages.filter(m => m.priority === 'منخفضة').length
    };

    // الإحصائيات حسب الحالة
    const byStatus = {
      'مرسلة': filteredMessages.filter(m => !m.isRead).length,
      'مقروءة': filteredMessages.filter(m => m.isRead && !m.isReplied).length,
      'تم الرد': filteredMessages.filter(m => m.isReplied).length
    };

    // الإحصائيات حسب الأقسام
    const byDepartment = filteredMessages.reduce((acc, msg) => {
      acc[msg.fromDepartment] = (acc[msg.fromDepartment] || 0) + 1;
      if (msg.toDepartment !== msg.fromDepartment) {
        acc[msg.toDepartment] = (acc[msg.toDepartment] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    // متوسط وقت الاستجابة (محاكاة)
    const avgResponseTime = Math.round(Math.random() * 5 + 1); // 1-6 أيام

    return {
      total,
      byPriority,
      byStatus,
      byDepartment,
      avgResponseTime
    };
  }, [appContext?.internalMessages, currentEmployee, isAdmin, selectedDepartment, dateRange]);

  // بيانات تجريبية للمراسلات
  const generateSampleMessages = () => {
    const departments = ['إدارة الموارد البشرية', 'الشؤون الإدارية', 'قسم المحاسبة', 'قسم الخدمات', 'قسم تقنية المعلومات'];
    const priorities = ['عالية', 'متوسطة', 'منخفضة'];
    const subjects = [
      'طلب إجازة سنوية',
      'تحديث البيانات الشخصية', 
      'طلب شهادة راتب',
      'استفسار حول المكافآت',
      'طلب نقل قسم',
      'تقرير شهري',
      'طلب صيانة',
      'تحديث نظام',
      'اجتماع طارئ',
      'مراجعة سياسة'
    ];

    const sampleMessages = [];
    for (let i = 0; i < 200; i++) {
      const createdAt = new Date();
      createdAt.setDate(createdAt.getDate() - Math.floor(Math.random() * 90)); // آخر 3 أشهر

      const isRead = Math.random() > 0.3; // 70% مقروء
      const isReplied = isRead && Math.random() > 0.5; // 50% من المقروء تم الرد عليه

      sampleMessages.push({
        id: `msg-${i + 1}`,
        fromDepartment: departments[Math.floor(Math.random() * departments.length)],
        toDepartment: departments[Math.floor(Math.random() * departments.length)],
        subject: subjects[Math.floor(Math.random() * subjects.length)],
        message: `هذه رسالة تجريبية رقم ${i + 1} للاختبار والعرض`,
        priority: priorities[Math.floor(Math.random() * priorities.length)],
        isRead,
        isReplied,
        createdAt: createdAt.toISOString(),
        fromEmployee: `موظف-${Math.floor(Math.random() * 20) + 1}`,
        toEmployee: `موظف-${Math.floor(Math.random() * 20) + 1}`
      });
    }

    // حفظ البيانات التجريبية
    localStorage.setItem('sampleInternalMessages', JSON.stringify(sampleMessages));
    setUseSampleData(true);
    alert('تم إنشاء 200 رسالة إدارية تجريبية بنجاح!');
  };

  // الحصول على البيانات الحالية (حقيقية أو تجريبية)
  const currentMessages = useMemo(() => {
    if (useSampleData) {
      const sampleData = localStorage.getItem('sampleInternalMessages');
      return sampleData ? JSON.parse(sampleData) : [];
    }
    return appContext?.internalMessages || [];
  }, [useSampleData, appContext?.internalMessages]);

  // التحليل الذكي للمراسلات
  const aiInsights = useMemo((): AIInsight[] => {
    const insights: AIInsight[] = [];

    // تحليل حجم المراسلات
    if (stats.total > 100) {
      insights.push({
        type: 'info',
        title: 'نشاط مكثف في المراسلات',
        description: `تم تسجيل ${stats.total} رسالة إدارية، مما يدل على تفاعل نشط بين الأقسام.`,
        priority: 'medium',
        recommendation: 'فكر في تحسين أنظمة التواصل لزيادة الكفاءة.'
      });
    }

    // تحليل الرسائل غير المقروءة
    const unreadRate = stats.total > 0 ? (stats.byStatus['مرسلة'] / stats.total) * 100 : 0;
    if (unreadRate > 30) {
      insights.push({
        type: 'warning',
        title: 'نسبة عالية من الرسائل غير المقروءة',
        description: `${Math.round(unreadRate)}% من الرسائل لم تُقرأ بعد.`,
        priority: 'high',
        recommendation: 'يُنصح بمتابعة الرسائل المعلقة وضمان قراءتها في الوقت المناسب.'
      });
    }

    // تحليل معدل الاستجابة
    const responseRate = stats.total > 0 ? (stats.byStatus['تم الرد'] / stats.total) * 100 : 0;
    if (responseRate < 40) {
      insights.push({
        type: 'warning',
        title: 'معدل استجابة منخفض',
        description: `فقط ${Math.round(responseRate)}% من الرسائل تم الرد عليها.`,
        priority: 'high',
        recommendation: 'يجب تحسين سرعة الاستجابة وضمان الرد على الرسائل المهمة.'
      });
    } else if (responseRate > 80) {
      insights.push({
        type: 'success',
        title: 'معدل استجابة ممتاز',
        description: `${Math.round(responseRate)}% من الرسائل تم الرد عليها، مما يدل على تفاعل جيد.`,
        priority: 'low'
      });
    }

    // تحليل الأولوية
    const highPriorityRate = stats.total > 0 ? (stats.byPriority['عالية'] / stats.total) * 100 : 0;
    if (highPriorityRate > 40) {
      insights.push({
        type: 'warning',
        title: 'نسبة عالية من الرسائل العالية الأولوية',
        description: `${Math.round(highPriorityRate)}% من الرسائل مصنفة كعالية الأولوية.`,
        priority: 'medium',
        recommendation: 'راجع معايير تصنيف الأولوية لضمان التوازن في الأهمية.'
      });
    }

    // تحليل التوزيع بين الأقسام
    if (isAdmin && Object.keys(stats.byDepartment).length > 1) {
      const deptEntries = Object.entries(stats.byDepartment).sort(([,a], [,b]) => Number(b) - Number(a));
      const topDept = deptEntries[0];
      const bottomDept = deptEntries[deptEntries.length - 1];
      
      if (Number(topDept[1]) > Number(bottomDept[1]) * 3) {
        insights.push({
          type: 'info',
          title: 'عدم توازن في نشاط الأقسام',
          description: `قسم ${topDept[0]} يتفاعل أكثر من الأقسام الأخرى.`,
          priority: 'medium',
          recommendation: 'فكر في تشجيع التفاعل المتوازن بين جميع الأقسام.'
        });
      }
    }

    // رسالة إيجابية إذا لم توجد مشاكل كبيرة
    if (insights.filter(i => i.type === 'warning').length === 0) {
      insights.push({
        type: 'success',
        title: 'أداء جيد في المراسلات الإدارية',
        description: 'النظام يعمل بكفاءة ولا توجد مشاكل كبيرة تتطلب تدخلاً فورياً.',
        priority: 'low'
      });
    }

    return insights.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }, [stats, isAdmin]);

  // تصدير التقرير
  const exportReport = async (format: 'pdf' | 'excel') => {
    if (format === 'pdf') {
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF();
      
      // إضافة المحتوى العربي
      pdf.setFont('Arial', 'normal');
      pdf.setFontSize(16);
      pdf.text('تقرير إحصائيات المراسلات الإدارية', 20, 20);
      
      let yPosition = 40;
      pdf.setFontSize(12);
      pdf.text(`الفترة: ${getRangeLabel()}`, 20, yPosition);
      yPosition += 10;
      pdf.text(`تاريخ التقرير: ${new Date().toLocaleDateString('ar-SY')}`, 20, yPosition);
      yPosition += 20;

      // الإحصائيات العامة
      pdf.setFontSize(14);
      pdf.text('الإحصائيات العامة:', 20, yPosition);
      yPosition += 15;
      
      pdf.setFontSize(10);
      pdf.text(`إجمالي الرسائل: ${stats.total}`, 20, yPosition);
      yPosition += 8;
      pdf.text(`تم الرد عليها: ${stats.byStatus['تم الرد']}`, 20, yPosition);
      yPosition += 8;
      pdf.text(`متوسط وقت الاستجابة: ${stats.avgResponseTime} يوم`, 20, yPosition);
      yPosition += 20;
      
      // التحليلات الذكية
      pdf.setFontSize(14);
      pdf.text('التحليلات الذكية:', 20, yPosition);
      yPosition += 15;
      
      aiInsights.slice(0, 5).forEach(insight => {
        pdf.setFontSize(10);
        pdf.text(`- ${insight.title}`, 20, yPosition);
        yPosition += 8;
        if (yPosition > 250) {
          pdf.addPage();
          yPosition = 20;
        }
      });

      pdf.save('تقرير-المراسلات-الإدارية.pdf');
    } else {
      // تصدير Excel (CSV)
      const csvData = [
        ['البيان', 'القيمة'],
        ['إجمالي الرسائل', stats.total],
        ['رسائل عالية الأولوية', stats.byPriority['عالية']],
        ['رسائل متوسطة الأولوية', stats.byPriority['متوسطة']],
        ['رسائل منخفضة الأولوية', stats.byPriority['منخفضة']],
        ['رسائل مرسلة', stats.byStatus['مرسلة']],
        ['رسائل مقروءة', stats.byStatus['مقروءة']],
        ['رسائل تم الرد عليها', stats.byStatus['تم الرد']],
        ['متوسط وقت الاستجابة (أيام)', stats.avgResponseTime],
      ];

      const csvContent = csvData.map(row => row.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'تقرير-المراسلات-الإدارية.csv';
      link.click();
    }
  };

  const getRangeLabel = () => {
    const labels = {
      week: 'آخر أسبوع',
      month: 'آخر شهر',  
      quarter: 'آخر 3 أشهر',
      year: 'آخر سنة'
    };
    return labels[dateRange];
  };

  const departments = useMemo(() => {
    const depts = [...new Set(currentMessages.flatMap((m: any) => [m.fromDepartment, m.toDepartment]))].filter(Boolean);
    return depts.sort();
  }, [currentMessages]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* العنوان الرئيسي */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-black dark:text-white mb-2">
            إحصائيات المراسلات الإدارية
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            تحليل شامل ومفصل لنشاط المراسلات الداخلية بين الأقسام
          </p>
        </div>

        {/* أدوات التحكم */}
        <Card className="mb-8">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex flex-wrap gap-4 items-center">
              <div>
                <label className="block text-sm font-medium text-black dark:text-white mb-2">
                  النطاق الزمني:
                </label>
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value as any)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-black dark:text-white"
                >
                  <option value="week">آخر أسبوع</option>
                  <option value="month">آخر شهر</option>
                  <option value="quarter">آخر 3 أشهر</option>
                  <option value="year">آخر سنة</option>
                </select>
              </div>

              {isAdmin && (
                <div>
                  <label className="block text-sm font-medium text-black dark:text-white mb-2">
                    القسم:
                  </label>
                  <select
                    value={selectedDepartment}
                    onChange={(e) => setSelectedDepartment(e.target.value)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-black dark:text-white"
                  >
                    <option value="">جميع الأقسام</option>
                    {departments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="useSampleData"
                  checked={useSampleData}
                  onChange={(e) => setUseSampleData(e.target.checked)}
                  className="w-4 h-4"
                />
                <label htmlFor="useSampleData" className="text-sm text-black dark:text-white">
                  استخدام البيانات التجريبية
                </label>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={generateSampleMessages}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                إنشاء بيانات تجريبية
              </Button>
              <Button
                onClick={() => exportReport('pdf')}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                تصدير PDF
              </Button>
              <Button
                onClick={() => exportReport('excel')}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                تصدير Excel
              </Button>
            </div>
          </div>
        </Card>

        {/* البطاقات الإحصائية العامة */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-2">{stats.total}</div>
              <div className="text-sm text-black dark:text-white">إجمالي الرسائل</div>
            </div>
          </Card>

          <Card>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">{stats.byStatus['تم الرد']}</div>
              <div className="text-sm text-black dark:text-white">تم الرد عليها</div>
            </div>
          </Card>

          <Card>
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400 mb-2">{stats.byStatus['مرسلة']}</div>
              <div className="text-sm text-black dark:text-white">غير مقروءة</div>
            </div>
          </Card>

          <Card>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">{stats.avgResponseTime}</div>
              <div className="text-sm text-black dark:text-white">متوسط وقت الاستجابة (يوم)</div>
            </div>
          </Card>
        </div>

        {/* توزيع الرسائل حسب الأولوية */}
        <Card className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-gradient-to-r from-red-500 to-orange-600 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-black dark:text-white">توزيع الرسائل حسب الأولوية</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {Object.entries(stats.byPriority).map(([priority, count]) => {
              const percentage = stats.total > 0 ? Math.round((Number(count) / stats.total) * 100) : 0;
              const priorityInfo = {
                'عالية': {
                  icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  ),
                  gradient: 'from-red-500 to-pink-600',
                  bgPattern: 'from-red-50 via-pink-50 to-red-50 dark:from-red-900/20 dark:via-pink-900/20 dark:to-red-900/20',
                  borderGradient: 'from-red-300 to-pink-300 dark:from-red-600 dark:to-pink-600',
                  textColor: 'text-red-700 dark:text-red-300'
                },
                'متوسطة': {
                  icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ),
                  gradient: 'from-yellow-500 to-orange-600',
                  bgPattern: 'from-yellow-50 via-orange-50 to-yellow-50 dark:from-yellow-900/20 dark:via-orange-900/20 dark:to-yellow-900/20',
                  borderGradient: 'from-yellow-300 to-orange-300 dark:from-yellow-600 dark:to-orange-600',
                  textColor: 'text-yellow-700 dark:text-yellow-300'
                },
                'منخفضة': {
                  icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ),
                  gradient: 'from-green-500 to-emerald-600',
                  bgPattern: 'from-green-50 via-emerald-50 to-green-50 dark:from-green-900/20 dark:via-emerald-900/20 dark:to-green-900/20',
                  borderGradient: 'from-green-300 to-emerald-300 dark:from-green-600 dark:to-emerald-600',
                  textColor: 'text-green-700 dark:text-green-300'
                }
              };

              const info = priorityInfo[priority as keyof typeof priorityInfo];
              
              if (!info) return null;
              
              return (
                <div key={priority} className="relative group">
                  <div className={`relative overflow-hidden rounded-3xl border-2 border-transparent bg-gradient-to-br ${info.borderGradient} p-0.5 transition-all duration-300 hover:scale-105 hover:shadow-2xl`}>
                    <div className={`relative rounded-3xl bg-gradient-to-br ${info.bgPattern} p-8 h-full`}>
                      <div className="flex items-center justify-between mb-6">
                        <div className={`p-4 rounded-2xl bg-gradient-to-r ${info.gradient} text-white shadow-xl transform group-hover:rotate-6 transition-transform duration-300`}>
                          {info.icon}
                        </div>
                        <div className={`text-right ${info.textColor}`}>
                          <div className="text-4xl font-bold mb-2">{count}</div>
                          <div className="text-2xl font-semibold">{percentage}%</div>
                        </div>
                      </div>
                      
                      <div className={`${info.textColor} mb-6`}>
                        <div className="font-bold text-2xl mb-2">الأولوية {priority}</div>
                        <div className="text-sm opacity-75">
                          {count} من أصل {stats.total} رسالة
                        </div>
                      </div>
                      
                      {/* دائرة التقدم */}
                      <div className="relative w-32 h-32 mx-auto mb-4">
                        <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 128 128">
                          <circle
                            cx="64"
                            cy="64"
                            r="56"
                            stroke="currentColor"
                            strokeWidth="8"
                            fill="none"
                            className="text-gray-200 dark:text-gray-600"
                          />
                          <circle
                            cx="64"
                            cy="64"
                            r="56"
                            stroke="url(#gradient-progress-priority-${priority})"
                            strokeWidth="8"
                            fill="none"
                            strokeLinecap="round"
                            strokeDasharray={`${(percentage / 100) * 351.86} 351.86`}
                            className="transition-all duration-1000 ease-out"
                          />
                          <defs>
                            <linearGradient id={`gradient-progress-priority-${priority}`} x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor={priority === 'عالية' ? '#ef4444' : priority === 'متوسطة' ? '#f59e0b' : '#10b981'} />
                              <stop offset="100%" stopColor={priority === 'عالية' ? '#be185d' : priority === 'متوسطة' ? '#ea580c' : '#059669'} />
                            </linearGradient>
                          </defs>
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className={`text-center ${info.textColor}`}>
                            <div className="text-2xl font-bold">{percentage}%</div>
                            <div className="text-xs opacity-75">من الإجمالي</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* توزيع الرسائل حسب الحالة */}
        <Card className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-black dark:text-white">توزيع الرسائل حسب الحالة</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Object.entries(stats.byStatus).map(([status, count]) => {
              const percentage = stats.total > 0 ? Math.round((Number(count) / stats.total) * 100) : 0;
              const statusInfo = {
                'مرسلة': {
                  icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ),
                  gradient: 'from-blue-400 to-blue-600',
                  bgGradient: 'from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30',
                  borderColor: 'border-blue-200 dark:border-blue-700',
                  textColor: 'text-blue-700 dark:text-blue-300'
                },
                'مقروءة': {
                  icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  ),
                  gradient: 'from-yellow-400 to-orange-500',
                  bgGradient: 'from-yellow-50 to-orange-100 dark:from-yellow-900/30 dark:to-orange-800/30',
                  borderColor: 'border-yellow-200 dark:border-yellow-700',
                  textColor: 'text-yellow-700 dark:text-yellow-300'
                },
                'تم الرد': {
                  icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ),
                  gradient: 'from-green-400 to-emerald-600',
                  bgGradient: 'from-green-50 to-emerald-100 dark:from-green-900/30 dark:to-emerald-800/30',
                  borderColor: 'border-green-200 dark:border-green-700',
                  textColor: 'text-green-700 dark:text-green-300'
                }
              };

              const info = statusInfo[status as keyof typeof statusInfo];
              
              if (!info) return null;
              
              return (
                <div key={status} className={`relative group overflow-hidden rounded-2xl border-2 ${info.borderColor} transition-all duration-300 hover:scale-105 hover:shadow-xl`}>
                  <div className={`absolute inset-0 bg-gradient-to-br ${info.bgGradient} opacity-90`}></div>
                  <div className="relative p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`p-3 rounded-xl bg-gradient-to-r ${info.gradient} text-white shadow-lg`}>
                        {info.icon}
                      </div>
                      <div className={`text-right ${info.textColor}`}>
                        <div className="text-3xl font-bold mb-1">{count}</div>
                        <div className="text-lg font-semibold">{percentage}%</div>
                      </div>
                    </div>
                    
                    <div className={`${info.textColor} mb-3`}>
                      <div className="font-bold text-lg">{status}</div>
                    </div>
                    
                    {/* شريط التقدم */}
                    <div className="w-full bg-white/50 dark:bg-gray-700/50 rounded-full h-3 mb-2">
                      <div 
                        className={`h-3 rounded-full bg-gradient-to-r ${info.gradient} transition-all duration-1000 ease-out`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    
                    <div className={`text-xs ${info.textColor} opacity-75`}>
                      من إجمالي {stats.total} رسالة
                    </div>
                  </div>
                  
                  {/* تأثير التحويم */}
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* إحصائيات حسب الأقسام */}
        {isAdmin && Object.keys(stats.byDepartment).length > 0 && (
          <Card className="mb-8">
            <h3 className="text-xl font-bold text-black dark:text-white mb-6">توزيع الرسائل حسب الأقسام</h3>
            <div className="space-y-4">
              {Object.entries(stats.byDepartment)
                .sort(([,a], [,b]) => Number(b) - Number(a))
                .map(([department, count]) => (
                  <div key={department} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="font-medium text-black dark:text-white">{department}</div>
                    <div className="flex items-center gap-4">
                      <div className="text-lg font-bold text-black dark:text-white">{count}</div>
                      <div className="text-sm text-black dark:text-white">
                        {stats.total > 0 ? Math.round((Number(count) / stats.total) * 100) : 0}%
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </Card>
        )}

        {/* التحليل الذكي */}
        <Card className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-black dark:text-white">التحليل الذكي والتوصيات</h3>
          </div>
          
          <div className="space-y-4">
            {aiInsights.map((insight, index) => {
              const getInsightIcon = () => {
                switch (insight.type) {
                  case 'success':
                    return (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    );
                  case 'warning':
                    return (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    );
                  case 'info':
                    return (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    );
                  case 'trend':
                    return (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    );
                  default:
                    return null;
                }
              };

              const getBorderColor = () => {
                switch (insight.priority) {
                  case 'high': return 'border-red-200 dark:border-red-700';
                  case 'medium': return 'border-yellow-200 dark:border-yellow-700';
                  case 'low': return 'border-green-200 dark:border-green-700';
                  default: return 'border-gray-200 dark:border-gray-700';
                }
              };

              const getBackgroundColor = () => {
                switch (insight.priority) {
                  case 'high': return 'bg-red-50 dark:bg-red-900/10';
                  case 'medium': return 'bg-yellow-50 dark:bg-yellow-900/10';  
                  case 'low': return 'bg-green-50 dark:bg-green-900/10';
                  default: return 'bg-gray-50 dark:bg-gray-800';
                }
              };

              return (
                <div key={index} className={`p-4 rounded-lg border-2 ${getBorderColor()} ${getBackgroundColor()}`}>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      {getInsightIcon()}
                    </div>
                    <div className="flex-grow">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-black dark:text-white">{insight.title}</h4>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          insight.priority === 'high' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' :
                          insight.priority === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400' :
                          'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                        }`}>
                          {insight.priority === 'high' ? 'عالي' : insight.priority === 'medium' ? 'متوسط' : 'منخفض'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">{insight.description}</p>
                      {insight.recommendation && (
                        <p className="text-sm text-black dark:text-white font-medium">
                          💡 التوصية: {insight.recommendation}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default MessageAnalyticsPage;