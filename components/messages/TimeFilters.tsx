import React, { useState, useEffect, useMemo } from 'react';
import { FiCalendar, FiFilter, FiTrendingUp, FiClock, FiRefreshCw } from 'react-icons/fi';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { MessageTimeFilters } from '../../types/internalMessageTypes';
import { DateHelpers, StorageHelpers } from '../../utils/messageTimeUtils';

interface TimeFiltersProps {
  onFiltersChange: (filters: MessageTimeFilters) => void;
  initialFilters?: MessageTimeFilters;
  availableDepartments?: string[];
  currentDepartment?: string;
}

const TimeFilters: React.FC<TimeFiltersProps> = ({
  onFiltersChange,
  initialFilters = {},
  availableDepartments = [],
  currentDepartment
}) => {
  const [filters, setFilters] = useState<MessageTimeFilters>(initialFilters);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // تحديث الفلاتر عند تغييرها
  useEffect(() => {
    onFiltersChange(filters);
  }, [filters, onFiltersChange]);

  // حفظ الفلاتر المفضلة
  const saveFilters = () => {
    if (currentDepartment) {
      StorageHelpers.saveUserFilters(currentDepartment, filters);
    }
  };

  // تحديث فلتر الفترة الزمنية
  const updatePeriod = (period: MessageTimeFilters['period']) => {
    if (period === 'مخصص') {
      setFilters(prev => ({ ...prev, period, startDate: '', endDate: '' }));
    } else {
      const { start, end } = DateHelpers.getPeriodRange(period);
      setFilters(prev => ({
        ...prev,
        period,
        startDate: DateHelpers.toDateString(start),
        endDate: DateHelpers.toDateString(end)
      }));
    }
  };

  // إعادة تعيين الفلاتر
  const resetFilters = () => {
    setFilters({});
  };

  return (
    <Card className="mb-6">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FiCalendar />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              تصفية زمنية
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-sm"
            >
              <FiFilter />
              {showAdvanced ? 'إخفاء المتقدم' : 'خيارات متقدمة'}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={resetFilters}
              className="text-sm"
            >
              <FiRefreshCw />
              إعادة تعيين
            </Button>
          </div>
        </div>

        {/* الفلاتر الأساسية */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {/* اختيار الفترة الزمنية */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              الفترة الزمنية
            </label>
            <select
              value={filters.period || ''}
              onChange={(e) => updatePeriod(e.target.value as MessageTimeFilters['period'])}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">اختر الفترة</option>
              <option value="اليوم">اليوم</option>
              <option value="هذا الأسبوع">هذا الأسبوع</option>
              <option value="هذا الشهر">هذا الشهر</option>
              <option value="آخر 7 أيام">آخر 7 أيام</option>
              <option value="آخر 30 يوماً">آخر 30 يوماً</option>
              <option value="آخر 90 يوماً">آخر 90 يوماً</option>
              <option value="هذا العام">هذا العام</option>
              <option value="مخصص">فترة مخصصة</option>
            </select>
          </div>

          {/* التاريخ من - في حالة الفترة المخصصة */}
          {filters.period === 'مخصص' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  من تاريخ
                </label>
                <input
                  type="date"
                  value={filters.startDate || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  إلى تاريخ
                </label>
                <input
                  type="date"
                  value={filters.endDate || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </>
          )}

          {/* الأولوية */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              الأولوية
            </label>
            <select
              multiple
              value={filters.priorities || []}
              onChange={(e) => {
                const priorities = Array.from(e.target.selectedOptions, (option: any) => option.value) as MessageTimeFilters['priorities'];
                setFilters(prev => ({ ...prev, priorities }));
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              size={4}
            >
              <option value="عادي">عادي</option>
              <option value="هام">هام</option>
              <option value="عاجل">عاجل</option>
              <option value="سري">سري</option>
            </select>
          </div>
        </div>

        {/* الخيارات المتقدمة */}
        {showAdvanced && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* الحالة */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  الحالة
                </label>
                <select
                  multiple
                  value={filters.status || []}
                  onChange={(e) => {
                    const status = Array.from(e.target.selectedOptions, (option: any) => option.value) as MessageTimeFilters['status'];
                    setFilters(prev => ({ ...prev, status }));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  size={5}
                >
                  <option value="مسودة">مسودة</option>
                  <option value="مرسل">مرسل</option>
                  <option value="مقروء">مقروء</option>
                  <option value="مجاب">مجاب</option>
                  <option value="مؤرشف">مؤرشف</option>
                </select>
              </div>

              {/* الأقسام */}
              {availableDepartments.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    الأقسام
                  </label>
                  <select
                    multiple
                    value={filters.departments || []}
                    onChange={(e) => {
                      const departments = Array.from(e.target.selectedOptions, (option: any) => option.value);
                      setFilters(prev => ({ ...prev, departments }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    size={Math.min(availableDepartments.length, 5)}
                  >
                    {availableDepartments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* المرسل */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  المرسل
                </label>
                <input
                  type="text"
                  placeholder="اسم المرسل أو القسم"
                  value={filters.sender || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, sender: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* العلامات */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  العلامات
                </label>
                <input
                  type="text"
                  placeholder="العلامات مفصولة بفاصلة"
                  value={filters.tags?.join(', ') || ''}
                  onChange={(e) => {
                    const tags = e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag);
                    setFilters(prev => ({ ...prev, tags: tags.length > 0 ? tags : undefined }));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* وجود مرفقات */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  المرفقات
                </label>
                <select
                  value={filters.hasAttachments === undefined ? '' : filters.hasAttachments.toString()}
                  onChange={(e) => {
                    const value = e.target.value === '' ? undefined : e.target.value === 'true';
                    setFilters(prev => ({ ...prev, hasAttachments: value }));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">الكل</option>
                  <option value="true">مع مرفقات</option>
                  <option value="false">بدون مرفقات</option>
                </select>
              </div>
            </div>

            {/* أزرار حفظ واستعادة الفلاتر */}
            {currentDepartment && (
              <div className="flex justify-end gap-2 mt-4">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    const savedFilters = StorageHelpers.getUserFilters(currentDepartment);
                    if (savedFilters) {
                      setFilters(savedFilters);
                    }
                  }}
                  className="text-sm"
                >
                  استعادة المحفوظة
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={saveFilters}
                  className="text-sm"
                >
                  حفظ الفلاتر
                </Button>
              </div>
            )}
          </div>
        )}

        {/* عرض الفلاتر المطبقة */}
        {Object.keys(filters).length > 0 && (
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FiFilter />
                <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  الفلاتر المطبقة:
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {filters.period && (
                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 rounded text-xs">
                  الفترة: {filters.period}
                </span>
              )}
              {filters.priorities?.map(priority => (
                <span key={priority} className="px-2 py-1 bg-orange-100 dark:bg-orange-800 text-orange-800 dark:text-orange-200 rounded text-xs">
                  {priority}
                </span>
              ))}
              {filters.departments?.map(dept => (
                <span key={dept} className="px-2 py-1 bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 rounded text-xs">
                  {dept}
                </span>
              ))}
              {filters.status?.map(status => (
                <span key={status} className="px-2 py-1 bg-purple-100 dark:bg-purple-800 text-purple-800 dark:text-purple-200 rounded text-xs">
                  {status}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default TimeFilters;