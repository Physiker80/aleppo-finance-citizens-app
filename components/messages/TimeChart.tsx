import React, { useRef, useEffect } from 'react';
import Card from '../ui/Card';
import { MessagesTimeStats } from '../../types/internalMessageTypes';
import { TimeStatsCalculator, DateHelpers } from '../../utils/messageTimeUtils';

interface TimeChartProps {
  stats: MessagesTimeStats;
  chartType?: 'line' | 'bar' | 'area';
  showTrends?: boolean;
}

// نسخة مبسطة من الرسم البياني باستخدام Canvas
const TimeChart: React.FC<TimeChartProps> = ({
  stats,
  chartType = 'line',
  showTrends = true
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // رسم الرسم البياني
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // تنسيق البيانات
    const chartData = TimeStatsCalculator.generateChartData(stats);
    const dates = Object.keys(stats.dailyActivity).sort();
    const sentData = dates.map(date => stats.dailyActivity[date]?.sent || 0);
    const repliedData = dates.map(date => stats.dailyActivity[date]?.replied || 0);

    // إعداد الرسم
    const width = canvas.width;
    const height = canvas.height;
    const padding = 60;
    const graphWidth = width - (padding * 2);
    const graphHeight = height - (padding * 2);

    // مسح الرسم السابق
    ctx.clearRect(0, 0, width, height);
    
    // تحديد القيم القصوى
    const maxValue = Math.max(...sentData, ...repliedData, 1);
    
    // رسم الخطوط الشبكية
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    
    // الخطوط الأفقية
    for (let i = 0; i <= 5; i++) {
      const y = padding + (graphHeight / 5) * i;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }
    
    // الخطوط الرأسية
    if (dates.length > 1) {
      for (let i = 0; i < dates.length; i++) {
        const x = padding + (graphWidth / (dates.length - 1)) * i;
        ctx.beginPath();
        ctx.moveTo(x, padding);
        ctx.lineTo(x, height - padding);
        ctx.stroke();
      }
    }

    // دالة لحساب إحداثيات النقطة
    const getPointCoords = (index: number, value: number) => {
      const x = dates.length === 1 
        ? width / 2 
        : padding + (graphWidth / (dates.length - 1)) * index;
      const y = height - padding - (value / maxValue) * graphHeight;
      return { x, y };
    };

    // رسم الرسائل المرسلة
    if (sentData.length > 0) {
      ctx.strokeStyle = '#3b82f6';
      ctx.fillStyle = chartType === 'area' ? 'rgba(59, 130, 246, 0.3)' : '#3b82f6';
      ctx.lineWidth = 3;

      if (chartType === 'line' || chartType === 'area') {
        ctx.beginPath();
        sentData.forEach((value, index) => {
          const { x, y } = getPointCoords(index, value);
          if (index === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        });
        ctx.stroke();

        // ملء المنطقة للرسم البياني المساحي
        if (chartType === 'area') {
          ctx.lineTo(getPointCoords(sentData.length - 1, 0).x, height - padding);
          ctx.lineTo(getPointCoords(0, 0).x, height - padding);
          ctx.closePath();
          ctx.fill();
        }

        // رسم النقاط
        sentData.forEach((value, index) => {
          const { x, y } = getPointCoords(index, value);
          ctx.fillStyle = '#3b82f6';
          ctx.beginPath();
          ctx.arc(x, y, 4, 0, Math.PI * 2);
          ctx.fill();
        });
      } else if (chartType === 'bar') {
        const barWidth = graphWidth / dates.length * 0.3;
        sentData.forEach((value, index) => {
          const { x } = getPointCoords(index, value);
          const barHeight = (value / maxValue) * graphHeight;
          ctx.fillRect(x - barWidth / 2, height - padding - barHeight, barWidth, barHeight);
        });
      }
    }

    // رسم الرسائل المجاب عليها
    if (repliedData.length > 0) {
      ctx.strokeStyle = '#10b981';
      ctx.fillStyle = chartType === 'area' ? 'rgba(16, 185, 129, 0.3)' : '#10b981';
      ctx.lineWidth = 3;

      if (chartType === 'line' || chartType === 'area') {
        ctx.beginPath();
        repliedData.forEach((value, index) => {
          const { x, y } = getPointCoords(index, value);
          if (index === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        });
        ctx.stroke();

        // النقاط
        repliedData.forEach((value, index) => {
          const { x, y } = getPointCoords(index, value);
          ctx.fillStyle = '#10b981';
          ctx.beginPath();
          ctx.arc(x, y, 4, 0, Math.PI * 2);
          ctx.fill();
        });
      } else if (chartType === 'bar') {
        const barWidth = graphWidth / dates.length * 0.3;
        repliedData.forEach((value, index) => {
          const { x } = getPointCoords(index, value);
          const barHeight = (value / maxValue) * graphHeight;
          ctx.fillRect(x + barWidth / 2, height - padding - barHeight, barWidth, barHeight);
        });
      }
    }

    // رسم التسميات على المحور الصادي
    ctx.fillStyle = '#6b7280';
    ctx.font = '12px Arial';
    ctx.textAlign = 'right';
    
    for (let i = 0; i <= 5; i++) {
      const value = Math.round((maxValue / 5) * (5 - i));
      const y = padding + (graphHeight / 5) * i;
      ctx.fillText(value.toString(), padding - 10, y + 4);
    }

    // رسم التسميات على المحور السيني
    ctx.textAlign = 'center';
    dates.forEach((date, index) => {
      if (dates.length <= 7 || index % Math.ceil(dates.length / 7) === 0) {
        const { x } = getPointCoords(index, 0);
        const formattedDate = DateHelpers.formatArabicDate(new Date(date));
        const shortDate = formattedDate.split(' ').slice(0, 2).join(' ');
        ctx.fillText(shortDate, x, height - padding + 20);
      }
    });

  }, [stats, chartType]);

  return (
    <Card>
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            الرسم البياني للنشاط الزمني
          </h3>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span className="text-gray-600 dark:text-gray-400">المرسلة</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span className="text-gray-600 dark:text-gray-400">المجاب عليها</span>
            </div>
          </div>
        </div>
        
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={800}
            height={400}
            className="w-full h-64 border border-gray-200 dark:border-gray-700 rounded-lg"
            style={{ maxHeight: '400px' }}
          />
        </div>

        {/* إحصائيات سريعة تحت الرسم */}
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {stats.totalSent}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              إجمالي المرسلة
            </p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {stats.totalReplied}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              إجمالي المجاب عليها
            </p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {stats.totalSent > 0 ? Math.round((stats.totalReplied / stats.totalSent) * 100) : 0}%
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              معدل الرد
            </p>
          </div>
        </div>

        {/* عرض الاتجاهات */}
        {showTrends && Object.keys(stats.dailyActivity).length > 1 && (
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
              تحليل الاتجاهات
            </h4>
            <div className="text-sm text-blue-700 dark:text-blue-300">
              النشاط الزمني يظهر اتجاهاً عاماً في المراسلات
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default TimeChart;