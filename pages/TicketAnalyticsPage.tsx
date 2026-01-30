import React, { useContext, useState, useMemo } from 'react';
import { AppContext } from '../App';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Ticket, RequestStatus, RequestType } from '../types';

interface AIInsight {
  type: 'warning' | 'info' | 'success' | 'trend';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  recommendation?: string;
}

// بيانات تجريبية للاختبار
const generateSampleTickets = (count: number = 100): Ticket[] => {
  const departments = ['المحاسبة', 'الخزينة', 'الموارد البشرية', 'الشؤون القانونية', 'التدقيق'];
  const requestTypes = [RequestType.Inquiry, RequestType.Complaint];
  const statuses = [RequestStatus.New, RequestStatus.InProgress, RequestStatus.Answered, RequestStatus.Closed];
  
  const sampleTickets: Ticket[] = [];
  
  for (let i = 1; i <= count; i++) {
    const submissionDate = new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000); // خلال آخر 90 يوم
    const department = departments[Math.floor(Math.random() * departments.length)];
    const requestType = requestTypes[Math.floor(Math.random() * requestTypes.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    
    // محاكاة وقت الاستجابة
    let answeredAt: Date | undefined;
    let startedAt: Date | undefined;
    let closedAt: Date | undefined;
    
    if (status !== RequestStatus.New) {
      startedAt = new Date(submissionDate.getTime() + Math.random() * 3 * 24 * 60 * 60 * 1000); // 0-3 أيام لبدء المعالجة
    }
    
    if (status === RequestStatus.Answered || status === RequestStatus.Closed) {
      answeredAt = new Date((startedAt || submissionDate).getTime() + Math.random() * 14 * 24 * 60 * 60 * 1000); // 0-14 يوم للرد
    }
    
    if (status === RequestStatus.Closed) {
      closedAt = new Date((answeredAt || submissionDate).getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000); // 0-7 أيام للإغلاق
    }

    const ticket: Ticket = {
      id: `SAMPLE-${String(i).padStart(4, '0')}`,
      requestType,
      department,
      fullName: `المواطن رقم ${i}`,
      phone: `0${Math.floor(Math.random() * 900000000) + 100000000}`,
      email: `citizen${i}@example.com`,
      nationalId: `${Math.floor(Math.random() * 90000000000) + 10000000000}`,
      details: `هذا ${requestType} تجريبي للاختبار في قسم ${department}. يحتوي على تفاصيل وهمية لأغراض التطوير والاختبار. يمكن أن يحتوي على معلومات مفصلة حول الطلب أو الاستعلام.`,
      status,
      submissionDate,
      startedAt,
      answeredAt,
      closedAt,
      response: status === RequestStatus.Answered || status === RequestStatus.Closed ? `تم الرد على ${requestType} بنجاح. هذا رد تجريبي للاختبار.` : undefined,
      opinion: Math.random() > 0.5 ? `ملاحظات داخلية حول ${requestType} رقم ${i}` : undefined,
      forwardedTo: Math.random() > 0.8 ? [departments[Math.floor(Math.random() * departments.length)]] : undefined
    };
    
    sampleTickets.push(ticket);
  }
  
  return sampleTickets;
};

const TicketAnalyticsPage: React.FC = () => {
  const appContext = useContext(AppContext);
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [useSampleData, setUseSampleData] = useState<boolean>(false);
  const [sampleTickets, setSampleTickets] = useState<Ticket[]>([]);
  
  // توليد البيانات التجريبية عند الحاجة
  const handleGenerateSampleData = () => {
    const newSampleTickets = generateSampleTickets(150);
    setSampleTickets(newSampleTickets);
    setUseSampleData(true);
  };

  // وظيفة تصدير التقرير
  const exportReport = async (format: 'pdf' | 'excel') => {
    const reportData = {
      title: 'تقرير الإحصائيات الزمنية للطلبات والاستعلامات والشكاوي',
      dateRange: getRangeLabel(),
      department: selectedDepartment === 'all' ? 'جميع الأقسام' : selectedDepartment,
      generatedAt: new Date().toLocaleString('ar-SY-u-nu-latn'),
      stats,
      insights: aiInsights,
      ticketsData: currentTickets.map(ticket => ({
        id: ticket.id,
        type: ticket.requestType,
        department: ticket.department,
        status: ticket.status,
        submissionDate: ticket.submissionDate.toLocaleDateString('ar-SY-u-nu-latn'),
        responseTime: ticket.answeredAt 
          ? Math.ceil((ticket.answeredAt.getTime() - ticket.submissionDate.getTime()) / (1000 * 60 * 60 * 24))
          : null
      }))
    };

    if (format === 'pdf') {
      // تصدير PDF
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF();
      
      // إعداد الخط العربي (محاكاة - يحتاج خط عربي حقيقي)
      pdf.setFont('Arial');
      pdf.setFontSize(16);
      
      let yPosition = 20;
      
      // العنوان
      pdf.text(reportData.title, 20, yPosition);
      yPosition += 20;
      
      // معلومات التقرير
      pdf.setFontSize(12);
      pdf.text(`تاريخ الإنتاج: ${reportData.generatedAt}`, 20, yPosition);
      yPosition += 10;
      pdf.text(`الفترة الزمنية: ${reportData.dateRange}`, 20, yPosition);
      yPosition += 10;
      pdf.text(`القسم: ${reportData.department}`, 20, yPosition);
      yPosition += 20;
      
      // الإحصائيات الأساسية
      pdf.setFontSize(14);
      pdf.text('الإحصائيات الأساسية:', 20, yPosition);
      yPosition += 15;
      
      pdf.setFontSize(10);
      pdf.text(`إجمالي الطلبات: ${stats.total}`, 20, yPosition);
      yPosition += 8;
      pdf.text(`تم الرد عليها: ${stats.byStatus[RequestStatus.Answered]}`, 20, yPosition);
      yPosition += 8;
      pdf.text(`قيد المعالجة: ${stats.byStatus[RequestStatus.InProgress]}`, 20, yPosition);
      yPosition += 8;
      pdf.text(`متوسط وقت الاستجابة: ${stats.avgResponseTime} يوم`, 20, yPosition);
      yPosition += 20;
      
      // التحليلات الذكية
      if (aiInsights.length > 0) {
        pdf.setFontSize(14);
        pdf.text('التحليلات الذكية:', 20, yPosition);
        yPosition += 15;
        
        pdf.setFontSize(10);
        aiInsights.forEach((insight, index) => {
          if (yPosition > 250) {
            pdf.addPage();
            yPosition = 20;
          }
          
          pdf.text(`${index + 1}. ${insight.title}`, 20, yPosition);
          yPosition += 8;
          pdf.text(`   ${insight.description}`, 20, yPosition);
          yPosition += 8;
          
          if (insight.recommendation) {
            pdf.text(`   التوصية: ${insight.recommendation}`, 20, yPosition);
            yPosition += 8;
          }
          yPosition += 5;
        });
      }
      
      pdf.save(`تقرير-الإحصائيات-${new Date().getTime()}.pdf`);
    } else if (format === 'excel') {
      // تصدير Excel (CSV)
      const csvData = [
        ['تقرير الإحصائيات الزمنية للطلبات'],
        [`تاريخ الإنتاج: ${reportData.generatedAt}`],
        [`الفترة: ${reportData.dateRange}`],
        [`القسم: ${reportData.department}`],
        [''],
        ['الإحصائيات الأساسية'],
        ['المؤشر', 'القيمة'],
        ['إجمالي الطلبات', stats.total],
        ['جديد', stats.byStatus[RequestStatus.New]],
        ['قيد المعالجة', stats.byStatus[RequestStatus.InProgress]],
        ['تم الرد', stats.byStatus[RequestStatus.Answered]],
        ['مغلق', stats.byStatus[RequestStatus.Closed]],
        ['متوسط وقت الاستجابة (يوم)', stats.avgResponseTime],
        [''],
        ['تفاصيل الطلبات'],
        ['الرقم', 'النوع', 'القسم', 'الحالة', 'تاريخ التقديم', 'وقت الاستجابة (يوم)'],
        ...reportData.ticketsData.map(ticket => [
          ticket.id,
          ticket.type,
          ticket.department,
          ticket.status,
          ticket.submissionDate,
          ticket.responseTime || 'غير محدد'
        ])
      ];
      
      const csvContent = csvData.map(row => row.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `تقرير-الإحصائيات-${new Date().getTime()}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };
  
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
              يجب تسجيل الدخول كموظف للوصول إلى الإحصائيات الزمنية للطلبات
            </p>
          </div>
        </div>
      </div>
    );
  }

  const currentEmployee = appContext.currentEmployee;
  const tickets = appContext?.tickets || [];
  const isAdmin = currentEmployee?.role === 'مدير';

  // البيانات المستخدمة (حقيقية أو تجريبية)
  const currentTickets = useMemo(() => {
    return useSampleData ? sampleTickets : tickets;
  }, [useSampleData, sampleTickets, tickets]);

  // حساب النطاق الزمني
  const getDateRange = () => {
    const now = new Date();
    const ranges = {
      week: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      month: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      quarter: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
      year: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
    };
    return ranges[dateRange];
  };

  // فلترة التذاكر حسب النطاق الزمني والقسم
  const filteredTickets = useMemo(() => {
    const startDate = getDateRange();
    return currentTickets.filter(ticket => {
      // فلترة حسب التاريخ
      const ticketDate = new Date(ticket.submissionDate);
      if (ticketDate < startDate) return false;
      
      // فلترة حسب القسم
      if (selectedDepartment !== 'all') {
        if (!isAdmin && currentEmployee?.department && ticket.department !== currentEmployee.department) {
          return false;
        }
        if (selectedDepartment !== ticket.department) return false;
      } else {
        // إذا لم يكن المستخدم مديراً، أظهر فقط طلبات قسمه
        if (!isAdmin && currentEmployee?.department && ticket.department !== currentEmployee.department) {
          return false;
        }
      }
      
      return true;
    });
  }, [currentTickets, dateRange, selectedDepartment, isAdmin, currentEmployee]);

  // حساب الإحصائيات
  const stats = useMemo(() => {
    const total = filteredTickets.length;
    const byStatus = {
      [RequestStatus.New]: filteredTickets.filter(t => t.status === RequestStatus.New).length,
      [RequestStatus.InProgress]: filteredTickets.filter(t => t.status === RequestStatus.InProgress).length,
      [RequestStatus.Answered]: filteredTickets.filter(t => t.status === RequestStatus.Answered).length,
      [RequestStatus.Closed]: filteredTickets.filter(t => t.status === RequestStatus.Closed).length
    };
    
    const byType = {
      [RequestType.Inquiry]: filteredTickets.filter(t => t.requestType === RequestType.Inquiry).length,
      [RequestType.Complaint]: filteredTickets.filter(t => t.requestType === RequestType.Complaint).length
    };

    const byDepartment = filteredTickets.reduce((acc, ticket) => {
      acc[ticket.department] = (acc[ticket.department] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // حساب متوسط وقت الاستجابة
    const respondedTickets = filteredTickets.filter(t => t.answeredAt);
    const avgResponseTime = respondedTickets.length > 0 
      ? respondedTickets.reduce((sum, ticket) => {
          const created = new Date(ticket.submissionDate).getTime();
          const answered = new Date(ticket.answeredAt!).getTime();
          return sum + (answered - created);
        }, 0) / respondedTickets.length / (1000 * 60 * 60 * 24) // تحويل إلى أيام
      : 0;

    return {
      total,
      byStatus,
      byType,
      byDepartment,
      avgResponseTime: Math.round(avgResponseTime * 10) / 10 // تقريب لمنزلة عشرية واحدة
    };
  }, [filteredTickets]);

  // تحليل ذكي للبيانات
  const aiInsights = useMemo((): AIInsight[] => {
    const insights: AIInsight[] = [];

    // تحليل وقت الاستجابة
    if (stats.avgResponseTime > 7) {
      insights.push({
        type: 'warning',
        title: 'وقت الاستجابة مرتفع',
        description: `متوسط وقت الاستجابة ${stats.avgResponseTime} يوم، وهو أعلى من المعدل المطلوب.`,
        priority: 'high',
        recommendation: 'يُنصح بزيادة عدد الموظفين أو تحسين إجراءات المعالجة.'
      });
    } else if (stats.avgResponseTime < 2) {
      insights.push({
        type: 'success',
        title: 'أداء ممتاز في الاستجابة',
        description: `متوسط وقت الاستجابة ${stats.avgResponseTime} يوم، وهو أداء ممتاز.`,
        priority: 'low'
      });
    }

    // تحليل معدل الإنجاز
    const completionRate = stats.total > 0 ? ((stats.byStatus[RequestStatus.Answered] + stats.byStatus[RequestStatus.Closed]) / stats.total) * 100 : 0;
    if (completionRate < 60) {
      insights.push({
        type: 'warning',
        title: 'معدل إنجاز منخفض',
        description: `معدل الإنجاز ${Math.round(completionRate)}% أقل من المطلوب.`,
        priority: 'high',
        recommendation: 'يُنصح بمراجعة سير العمل وتحديد أسباب التأخير.'
      });
    } else if (completionRate > 85) {
      insights.push({
        type: 'success',
        title: 'معدل إنجاز ممتاز',
        description: `معدل الإنجاز ${Math.round(completionRate)}% يدل على كفاءة عالية.`,
        priority: 'low'
      });
    }

    // تحليل الاتجاهات حسب النوع
    const maxType = Object.entries(stats.byType).sort(([,a], [,b]) => Number(b) - Number(a))[0];
    if (maxType && Number(maxType[1]) > stats.total * 0.5) {
      insights.push({
        type: 'info',
        title: 'هيمنة نوع واحد من الطلبات',
        description: `${maxType[0]} يشكل ${Math.round((Number(maxType[1]) / stats.total) * 100)}% من إجمالي الطلبات.`,
        priority: 'medium',
        recommendation: 'قد يكون من المفيد تخصيص فريق متخصص لهذا النوع من الطلبات.'
      });
    }

    // تحليل توزيع الأقسام (للمدير)
    if (isAdmin && Object.keys(stats.byDepartment).length > 1) {
      const deptEntries = Object.entries(stats.byDepartment).sort(([,a], [,b]) => Number(b) - Number(a));
      const topDept = deptEntries[0];
      const bottomDept = deptEntries[deptEntries.length - 1];
      
      if (Number(topDept[1]) > Number(bottomDept[1]) * 3) {
        insights.push({
          type: 'warning',
          title: 'عدم توازن في توزيع الأعباء',
          description: `قسم ${topDept[0]} يتعامل مع ${topDept[1]} طلب بينما قسم ${bottomDept[0]} يتعامل مع ${bottomDept[1]} طلب فقط.`,
          priority: 'medium',
          recommendation: 'يُنصح بإعادة توزيع الأعباء أو تعزيز الأقسام ذات الضغط العالي.'
        });
      }
    }

    // تحليل الطلبات المعلقة
    const pendingRate = stats.total > 0 ? (stats.byStatus[RequestStatus.New] + stats.byStatus[RequestStatus.InProgress]) / stats.total * 100 : 0;
    if (pendingRate > 40) {
      insights.push({
        type: 'warning',
        title: 'نسبة عالية من الطلبات المعلقة',
        description: `${Math.round(pendingRate)}% من الطلبات لا تزال قيد المعالجة.`,
        priority: 'high',
        recommendation: 'يُنصح بمراجعة الطلبات المعلقة وتسريع عملية المعالجة.'
      });
    }

    // تحليل الاتجاه الزمني (محاكاة - يمكن تطويرها مع بيانات تاريخية فعلية)
    if (dateRange === 'week' && stats.total > 50) {
      insights.push({
        type: 'trend',
        title: 'نشاط مكثف',
        description: `${stats.total} طلب في أسبوع واحد يشير إلى نشاط مكثف.`,
        priority: 'medium',
        recommendation: 'تأكد من جاهزية الفريق للتعامل مع هذا المستوى من النشاط.'
      });
    }

    // إذا لم توجد مشاكل، أضف رسالة إيجابية
    if (insights.filter(i => i.type === 'warning').length === 0) {
      insights.push({
        type: 'success',
        title: 'الأداء ضمن المعايير المقبولة',
        description: 'النظام يعمل بكفاءة جيدة ولا توجد مشاكل كبيرة تتطلب تدخلاً فورياً.',
        priority: 'low'
      });
    }

    return insights.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }, [stats, isAdmin, dateRange]);

  // الحصول على قائمة الأقسام المتاحة
  const departments = useMemo(() => {
    const depts = [...new Set(currentTickets.map(t => t.department))].filter(Boolean);
    return depts.sort();
  }, [currentTickets]);

  const getRangeLabel = () => {
    const labels = {
      week: 'آخر أسبوع',
      month: 'آخر شهر',
      quarter: 'آخر 3 أشهر',
      year: 'آخر سنة'
    };
    return labels[dateRange];
  };

  const getStatusLabel = (status: RequestStatus) => {
    const labels = {
      [RequestStatus.New]: 'جديد',
      [RequestStatus.InProgress]: 'قيد المعالجة',
      [RequestStatus.Answered]: 'تم الرد',
      [RequestStatus.Closed]: 'مغلق'
    };
    return labels[status];
  };

  const getStatusColor = (status: RequestStatus) => {
    const colors = {
      [RequestStatus.New]: 'text-blue-600 bg-blue-50 dark:bg-blue-900 dark:text-blue-300',
      [RequestStatus.InProgress]: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900 dark:text-yellow-300',
      [RequestStatus.Answered]: 'text-green-600 bg-green-50 dark:bg-green-900 dark:text-green-300',
      [RequestStatus.Closed]: 'text-gray-600 bg-gray-50 dark:bg-gray-900 dark:text-gray-300'
    };
    return colors[status];
  };

  const getTypeColor = (type: string) => {
    const colors = {
      [RequestType.Inquiry]: 'text-purple-600 bg-purple-50 dark:bg-purple-900 dark:text-purple-300',
      [RequestType.Complaint]: 'text-red-600 bg-red-50 dark:bg-red-900 dark:text-red-300'
    };
    return colors[type as RequestType] || 'text-gray-600 bg-gray-50 dark:bg-gray-900 dark:text-gray-300';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* العنوان */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-black dark:text-white mb-4">
            الإحصائيات الزمنية للطلبات والاستعلامات والشكاوي
          </h1>
          <p className="text-lg text-black dark:text-white">
            تحليل شامل لأداء النظام وإحصائيات معالجة الطلبات
          </p>
        </div>

        {/* أدوات التحكم */}
        <Card className="mb-8">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex flex-col">
                <label className="text-sm font-medium text-black dark:text-white mb-1">النطاق الزمني</label>
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-black dark:text-white"
                >
                  <option value="week">آخر أسبوع</option>
                  <option value="month">آخر شهر</option>
                  <option value="quarter">آخر 3 أشهر</option>
                  <option value="year">آخر سنة</option>
                </select>
              </div>

              {isAdmin && (
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-black dark:text-white mb-1">القسم</label>
                  <select
                    value={selectedDepartment}
                    onChange={(e) => setSelectedDepartment(e.target.value)}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-black dark:text-white"
                  >
                    <option value="all">جميع الأقسام</option>
                    {departments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex flex-col">
                <label className="text-sm font-medium text-black dark:text-white mb-1">مصدر البيانات</label>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => {
                      setUseSampleData(false);
                      setSampleTickets([]);
                    }}
                    className={`text-xs px-3 py-2 ${!useSampleData ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
                  >
                    البيانات الحقيقية
                  </Button>
                  <Button
                    onClick={handleGenerateSampleData}
                    className={`text-xs px-3 py-2 ${useSampleData ? 'bg-green-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}`}
                  >
                    بيانات تجريبية
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-end">
              <div className="text-sm text-black dark:text-white mb-2">
                <strong>الفترة:</strong> {getRangeLabel()}
                {!isAdmin && currentEmployee?.department && (
                  <span className="ml-4"><strong>القسم:</strong> {currentEmployee.department}</span>
                )}
                {useSampleData && (
                  <span className="ml-4 text-green-600 dark:text-green-400"><strong>وضع التجريب</strong></span>
                )}
              </div>
              
              <div className="flex gap-2">
                <Button
                  onClick={() => exportReport('pdf')}
                  className="text-xs px-3 py-2 bg-red-600 hover:bg-red-700 text-white"
                >
                  تصدير PDF
                </Button>
                <Button
                  onClick={() => exportReport('excel')}
                  className="text-xs px-3 py-2 bg-green-600 hover:bg-green-700 text-white"
                >
                  تصدير Excel
                </Button>
              </div>
            </div>
          </div>

          {useSampleData && (
            <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-green-800 dark:text-green-200">
                  <strong>وضع التجريب:</strong> تم إنتاج {sampleTickets.length} طلب تجريبي لأغراض الاختبار والعرض. البيانات وهمية وغير حقيقية.
                </p>
              </div>
            </div>
          )}
        </Card>

        {/* الإحصائيات الأساسية */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">{stats.total}</div>
              <div className="text-sm text-black dark:text-white">إجمالي الطلبات</div>
            </div>
          </Card>

          <Card>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">{stats.byStatus[RequestStatus.Answered]}</div>
              <div className="text-sm text-black dark:text-white">تم الرد عليها</div>
            </div>
          </Card>

          <Card>
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400 mb-2">{stats.byStatus[RequestStatus.InProgress]}</div>
              <div className="text-sm text-black dark:text-white">قيد المعالجة</div>
            </div>
          </Card>

          <Card>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-2">{stats.avgResponseTime}</div>
              <div className="text-sm text-black dark:text-white">متوسط وقت الاستجابة (يوم)</div>
            </div>
          </Card>
        </div>

        {/* إحصائيات حسب الحالة */}
        <Card className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-black dark:text-white">توزيع الطلبات حسب الحالة</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Object.entries(stats.byStatus).map(([status, count]) => {
              const percentage = stats.total > 0 ? Math.round((Number(count) / stats.total) * 100) : 0;
              const statusInfo = {
                [RequestStatus.New]: {
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
                [RequestStatus.InProgress]: {
                  icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  ),
                  gradient: 'from-yellow-400 to-orange-500',
                  bgGradient: 'from-yellow-50 to-orange-100 dark:from-yellow-900/30 dark:to-orange-800/30',
                  borderColor: 'border-yellow-200 dark:border-yellow-700',
                  textColor: 'text-yellow-700 dark:text-yellow-300'
                },
                [RequestStatus.Answered]: {
                  icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ),
                  gradient: 'from-green-400 to-emerald-600',
                  bgGradient: 'from-green-50 to-emerald-100 dark:from-green-900/30 dark:to-emerald-800/30',
                  borderColor: 'border-green-200 dark:border-green-700',
                  textColor: 'text-green-700 dark:text-green-300'
                },
                [RequestStatus.Closed]: {
                  icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ),
                  gradient: 'from-gray-400 to-gray-600',
                  bgGradient: 'from-gray-50 to-gray-100 dark:from-gray-800/30 dark:to-gray-700/30',
                  borderColor: 'border-gray-200 dark:border-gray-600',
                  textColor: 'text-gray-700 dark:text-gray-300'
                }
              };

              const info = statusInfo[status as RequestStatus];
              
              // التأكد من أن info موجود
              if (!info) {
                console.warn(`Status info not found for status: ${status}`);
                return null;
              }
              
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
                      <div className="font-bold text-lg">{getStatusLabel(status as RequestStatus)}</div>
                    </div>
                    
                    {/* شريط التقدم */}
                    <div className="w-full bg-white/50 dark:bg-gray-700/50 rounded-full h-3 mb-2">
                      <div 
                        className={`h-3 rounded-full bg-gradient-to-r ${info.gradient} transition-all duration-1000 ease-out`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    
                    <div className={`text-xs ${info.textColor} opacity-75`}>
                      من إجمالي {stats.total} طلب
                    </div>
                  </div>
                  
                  {/* تأثير التحويم */}
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* إحصائيات حسب النوع */}
        <Card className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-black dark:text-white">توزيع الطلبات حسب النوع</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {Object.entries(stats.byType).map(([type, count]) => {
              const percentage = stats.total > 0 ? Math.round((Number(count) / stats.total) * 100) : 0;
              const typeInfo = {
                [RequestType.Inquiry]: {
                  icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ),
                  gradient: 'from-purple-500 to-indigo-600',
                  bgPattern: 'from-purple-50 via-indigo-50 to-purple-50 dark:from-purple-900/20 dark:via-indigo-900/20 dark:to-purple-900/20',
                  borderGradient: 'from-purple-300 to-indigo-300 dark:from-purple-600 dark:to-indigo-600',
                  textColor: 'text-purple-700 dark:text-purple-300',
                  label: 'الاستعلامات'
                },
                [RequestType.Complaint]: {
                  icon: (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ),
                  gradient: 'from-red-500 to-pink-600',
                  bgPattern: 'from-red-50 via-pink-50 to-red-50 dark:from-red-900/20 dark:via-pink-900/20 dark:to-red-900/20',
                  borderGradient: 'from-red-300 to-pink-300 dark:from-red-600 dark:to-pink-600',
                  textColor: 'text-red-700 dark:text-red-300',
                  label: 'الشكاوي'
                }
              };

              const info = typeInfo[type as RequestType];
              
              // التأكد من أن info موجود
              if (!info) {
                console.warn(`Type info not found for type: ${type}`);
                return null;
              }
              
              return (
                <div key={type} className="relative group">
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
                        <div className="font-bold text-2xl mb-2">{info.label}</div>
                        <div className="text-sm opacity-75">
                          {count} من أصل {stats.total} طلب
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
                            stroke="url(#gradient-progress-${type})"
                            strokeWidth="8"
                            fill="none"
                            strokeLinecap="round"
                            strokeDasharray={`${(percentage / 100) * 351.86} 351.86`}
                            className="transition-all duration-1000 ease-out"
                          />
                          <defs>
                            <linearGradient id={`gradient-progress-${type}`} x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor={type === RequestType.Inquiry ? '#8b5cf6' : '#ef4444'} />
                              <stop offset="100%" stopColor={type === RequestType.Inquiry ? '#3730a3' : '#be185d'} />
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
                      
                      {/* إحصائيات إضافية */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className={`text-center p-3 rounded-xl bg-white/50 dark:bg-gray-800/50 ${info.textColor}`}>
                          <div className="font-bold">متوسط يومي</div>
                          <div className="text-lg">{Math.round(Number(count) / 30)}</div>
                        </div>
                        <div className={`text-center p-3 rounded-xl bg-white/50 dark:bg-gray-800/50 ${info.textColor}`}>
                          <div className="font-bold">الترتيب</div>
                          <div className="text-lg">
                            {Object.entries(stats.byType)
                              .sort(([,a], [,b]) => Number(b) - Number(a))
                              .findIndex(([t]) => t === type) + 1}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* تأثيرات الخلفية */}
                  <div className="absolute -inset-4 bg-gradient-to-r from-transparent via-white/5 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* إحصائيات حسب القسم */}
        {isAdmin && Object.keys(stats.byDepartment).length > 0 && (
          <Card className="mb-8">
            <h3 className="text-xl font-bold text-black dark:text-white mb-6">توزيع الطلبات حسب القسم</h3>
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
                  case 'warning':
                    return (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L4.316 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    );
                  case 'success':
                    return (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    );
                  case 'info':
                    return (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    );
                  case 'trend':
                    return (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    );
                  default:
                    return null;
                }
              };

              const getBorderColor = () => {
                switch (insight.type) {
                  case 'warning': return 'border-red-200 dark:border-red-800';
                  case 'success': return 'border-green-200 dark:border-green-800';
                  case 'info': return 'border-blue-200 dark:border-blue-800';
                  case 'trend': return 'border-purple-200 dark:border-purple-800';
                  default: return 'border-gray-200 dark:border-gray-800';
                }
              };

              const getBackgroundColor = () => {
                switch (insight.type) {
                  case 'warning': return 'bg-red-50 dark:bg-red-900/20';
                  case 'success': return 'bg-green-50 dark:bg-green-900/20';
                  case 'info': return 'bg-blue-50 dark:bg-blue-900/20';
                  case 'trend': return 'bg-purple-50 dark:bg-purple-900/20';
                  default: return 'bg-gray-50 dark:bg-gray-900/20';
                }
              };

              const getPriorityBadge = () => {
                const colors = {
                  high: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
                  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
                  low: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                };
                const labels = {
                  high: 'عاجل',
                  medium: 'متوسط',
                  low: 'منخفض'
                };
                return (
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${colors[insight.priority]}`}>
                    {labels[insight.priority]}
                  </span>
                );
              };

              return (
                <div key={index} className={`p-4 rounded-lg border-2 ${getBorderColor()} ${getBackgroundColor()}`}>
                  <div className="flex items-start gap-3">
                    {getInsightIcon()}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-black dark:text-white">{insight.title}</h4>
                        {getPriorityBadge()}
                      </div>
                      <p className="text-sm text-black dark:text-white mb-2">{insight.description}</p>
                      {insight.recommendation && (
                        <div className="mt-3 p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                          <div className="flex items-start gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                            <div>
                              <p className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">توصية:</p>
                              <p className="text-xs text-black dark:text-white">{insight.recommendation}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* إضافة معلومات حول التحليل الذكي */}
          <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
            <div className="flex items-start gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-600 dark:text-purple-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm text-purple-800 dark:text-purple-200">
                  <strong>حول التحليل الذكي:</strong> يتم تحليل البيانات تلقائياً باستخدام خوارزميات ذكية لتحديد الاتجاهات والمشاكل المحتملة وتقديم التوصيات المناسبة لتحسين الأداء.
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* إجراءات */}
        <div className="text-center">
          <div className="flex flex-wrap justify-center gap-4">
            <Button
              onClick={() => window.location.reload()}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              تحديث البيانات
            </Button>
            <Button
              onClick={() => {
                // إعادة حساب التحليلات الذكية
                const event = new CustomEvent('refreshAI');
                window.dispatchEvent(event);
              }}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
            >
              تحديث التحليل الذكي
            </Button>
            {!useSampleData && (
              <Button
                onClick={handleGenerateSampleData}
                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
              >
                تجربة البيانات التجريبية
              </Button>
            )}
            {useSampleData && (
              <Button
                onClick={() => {
                  setUseSampleData(false);
                  setSampleTickets([]);
                }}
                className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white"
              >
                العودة للبيانات الحقيقية
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TicketAnalyticsPage;