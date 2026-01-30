import React, { useMemo } from 'react';
import { FiTrendingUp, FiClock, FiMail, FiArchive, FiCheckCircle, FiAlertTriangle } from 'react-icons/fi';
import Card from '../ui/Card';
import { MessagesTimeStats, TimeBasedAlert } from '../../types/internalMessageTypes';
import { DateHelpers } from '../../utils/messageTimeUtils';

interface TimeStatsDisplayProps {
  stats: MessagesTimeStats;
  alerts?: TimeBasedAlert[];
  loading?: boolean;
}

const TimeStatsDisplay: React.FC<TimeStatsDisplayProps> = ({
  stats,
  alerts = [],
  loading = false
}) => {
  // حساب النسب المئوية
  const percentages = useMemo(() => {
    const replyRate = stats.totalSent > 0 ? (stats.totalReplied / stats.totalSent) * 100 : 0;
    const archiveRate = stats.totalReceived > 0 ? (stats.totalArchived / stats.totalReceived) * 100 : 0;
    
    return {
      replyRate: Math.round(replyRate),
      archiveRate: Math.round(archiveRate)
    };
  }, [stats]);

  // تنسيق وقت الاستجابة
  const formatResponseTime = (hours: number): string => {
    if (hours < 1) {
      return `${Math.round(hours * 60)} دقيقة`;
    } else if (hours < 24) {
      return `${Math.round(hours)} ساعة`;
    } else {
      const days = Math.floor(hours / 24);
      const remainingHours = Math.round(hours % 24);
      return `${days} يوم${remainingHours > 0 ? ` و ${remainingHours} ساعة` : ''}`;
    }
  };

  // الحصول على أكثر الأقسام نشاطاً
  const topDepartments = useMemo(() => {
    return Object.entries(stats.departmentBreakdown)
      .sort(([,a], [,b]) => {
        const aData = a as any;
        const bData = b as any;
        return (bData.sent + bData.received) - (aData.sent + aData.received);
      })
      .slice(0, 5);
  }, [stats.departmentBreakdown]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map(i => (
          <Card key={i} className="animate-pulse">
            <div className="p-4">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* التنبيهات */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map(alert => (
            <div
              key={alert.id}
              className={`p-4 rounded-lg border-l-4 ${
                alert.type === 'response_overdue' 
                  ? 'bg-red-50 dark:bg-red-900/20 border-red-500'
                  : alert.type === 'high_volume'
                  ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500'
                  : 'bg-blue-50 dark:bg-blue-900/20 border-blue-500'
              }`}
            >
              <div className="flex items-center gap-2">
                <FiAlertTriangle />
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {alert.message}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* الإحصائيات الرئيسية */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* إجمالي المرسلة */}
        <Card>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  الرسائل المرسلة
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {stats.totalSent.toLocaleString('ar-SY-u-nu-latn')}
                </p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                <FiMail />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                من {DateHelpers.formatArabicDate(stats.startDate)} إلى {DateHelpers.formatArabicDate(stats.endDate)}
              </span>
            </div>
          </div>
        </Card>

        {/* إجمالي المستلمة */}
        <Card>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  الرسائل المستلمة
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {stats.totalReceived.toLocaleString('ar-SY-u-nu-latn')}
                </p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                <FiTrendingUp />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                معدل الاستقبال
              </span>
            </div>
          </div>
        </Card>

        {/* المجاب عليها */}
        <Card>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  تم الرد عليها
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {stats.totalReplied.toLocaleString('ar-SY-u-nu-latn')}
                </p>
              </div>
              <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-full">
                <FiCheckCircle />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                {percentages.replyRate}% معدل الرد
              </span>
            </div>
          </div>
        </Card>

        {/* متوسط وقت الاستجابة */}
        <Card>
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  متوسط وقت الرد
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {formatResponseTime(stats.averageResponseTime)}
                </p>
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                <FiClock />
              </div>
            </div>
            <div className="mt-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                متوسط الاستجابة
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* تحليل الأولويات */}
      <Card>
        <div className="p-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            تحليل حسب الأولوية
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(stats.priorityBreakdown).map(([priority, data]) => {
              const priorityData = data as any;
              return (
              <div key={priority} className="text-center">
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full mb-2 ${
                  priority === 'سري' ? 'bg-red-100 dark:bg-red-900/30' :
                  priority === 'عاجل' ? 'bg-orange-100 dark:bg-orange-900/30' :
                  priority === 'هام' ? 'bg-yellow-100 dark:bg-yellow-900/30' :
                  'bg-gray-100 dark:bg-gray-900/30'
                }`}>
                  <span className={`text-sm font-bold ${
                    priority === 'سري' ? 'text-red-600 dark:text-red-400' :
                    priority === 'عاجل' ? 'text-orange-600 dark:text-orange-400' :
                    priority === 'هام' ? 'text-yellow-600 dark:text-yellow-400' :
                    'text-gray-600 dark:text-gray-400'
                  }`}>
                    {priorityData.count}
                  </span>
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {priority}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formatResponseTime(priorityData.averageResponseTime)}
                </p>
              </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* أكثر الأقسام نشاطاً */}
      {topDepartments.length > 0 && (
        <Card>
          <div className="p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              أكثر الأقسام نشاطاً
            </h3>
            <div className="space-y-3">
              {topDepartments.map(([dept, data], index) => (
                <div key={dept} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full text-white text-sm font-bold ${
                      index === 0 ? 'bg-yellow-500' :
                      index === 1 ? 'bg-gray-400' :
                      index === 2 ? 'bg-orange-400' :
                      'bg-blue-500'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {dept}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        متوسط الرد: {formatResponseTime(data.averageResponseTime)}
                      </p>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      مرسل: {data.sent.toLocaleString('ar-SY-u-nu-latn')}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      مستقبل: {data.received.toLocaleString('ar-SY-u-nu-latn')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default TimeStatsDisplay;