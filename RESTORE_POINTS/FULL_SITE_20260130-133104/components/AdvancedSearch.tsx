/**
 * مكون البحث المتقدم مع الفلاتر
 * Advanced Search with Filters
 */

import React, { useState, useEffect, useMemo } from 'react';
import { RequestStatus, ContactMessageStatus } from '../types';

// ==================== أنواع الفلاتر ====================
export interface SearchFilters {
    query: string;
    status: string[];
    department: string[];
    dateFrom: string;
    dateTo: string;
    source: string[];
    priority: string[];
    hasAttachments: boolean | null;
    hasResponse: boolean | null;
}

const DEFAULT_FILTERS: SearchFilters = {
    query: '',
    status: [],
    department: [],
    dateFrom: '',
    dateTo: '',
    source: [],
    priority: [],
    hasAttachments: null,
    hasResponse: null
};

// ==================== مكون البحث المتقدم ====================
interface AdvancedSearchProps {
    filters: SearchFilters;
    onFiltersChange: (filters: SearchFilters) => void;
    departments: string[];
    showStatusFilter?: boolean;
    showSourceFilter?: boolean;
    showDateFilter?: boolean;
    showAttachmentFilter?: boolean;
    showResponseFilter?: boolean;
    placeholder?: string;
    className?: string;
}

export const AdvancedSearch: React.FC<AdvancedSearchProps> = ({
    filters,
    onFiltersChange,
    departments,
    showStatusFilter = true,
    showSourceFilter = true,
    showDateFilter = true,
    showAttachmentFilter = true,
    showResponseFilter = true,
    placeholder = 'ابحث...',
    className = ''
}) => {
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [localQuery, setLocalQuery] = useState(filters.query);

    // تأخير البحث لتحسين الأداء
    useEffect(() => {
        const timer = setTimeout(() => {
            if (localQuery !== filters.query) {
                onFiltersChange({ ...filters, query: localQuery });
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [localQuery]);

    const statusOptions = [
        { value: 'New', label: 'جديد', color: 'bg-blue-500' },
        { value: 'InProgress', label: 'قيد المعالجة', color: 'bg-yellow-500' },
        { value: 'Answered', label: 'تم الرد', color: 'bg-green-500' },
        { value: 'Closed', label: 'مغلق', color: 'bg-gray-500' }
    ];

    const sourceOptions = [
        { value: 'مواطن', label: 'مواطن' },
        { value: 'موظف', label: 'موظف' }
    ];

    const activeFiltersCount = useMemo(() => {
        let count = 0;
        if (filters.status.length > 0) count++;
        if (filters.department.length > 0) count++;
        if (filters.dateFrom || filters.dateTo) count++;
        if (filters.source.length > 0) count++;
        if (filters.hasAttachments !== null) count++;
        if (filters.hasResponse !== null) count++;
        return count;
    }, [filters]);

    const clearFilters = () => {
        onFiltersChange(DEFAULT_FILTERS);
        setLocalQuery('');
    };

    const toggleArrayFilter = (key: keyof SearchFilters, value: string) => {
        const arr = filters[key] as string[];
        const newArr = arr.includes(value)
            ? arr.filter(v => v !== value)
            : [...arr, value];
        onFiltersChange({ ...filters, [key]: newArr });
    };

    return (
        <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 ${className}`}>
            {/* شريط البحث الرئيسي */}
            <div className="p-4 flex items-center gap-3">
                <div className="relative flex-1">
                    <input
                        type="text"
                        value={localQuery}
                        onChange={(e) => setLocalQuery(e.target.value)}
                        placeholder={placeholder}
                        className="w-full pl-10 pr-4 py-3 bg-gray-100 dark:bg-gray-700 rounded-xl border-0 focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100"
                    />
                    <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    {localQuery && (
                        <button
                            onClick={() => { setLocalQuery(''); onFiltersChange({ ...filters, query: '' }); }}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                            ✕
                        </button>
                    )}
                </div>

                <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className={`px-4 py-3 rounded-xl flex items-center gap-2 transition-colors ${showAdvanced || activeFiltersCount > 0
                            ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                    <span>فلاتر</span>
                    {activeFiltersCount > 0 && (
                        <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">{activeFiltersCount}</span>
                    )}
                </button>

                {activeFiltersCount > 0 && (
                    <button
                        onClick={clearFilters}
                        className="px-4 py-3 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-xl hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
                    >
                        مسح الكل
                    </button>
                )}
            </div>

            {/* الفلاتر المتقدمة */}
            {showAdvanced && (
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
                    {/* فلتر الحالة */}
                    {showStatusFilter && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">الحالة</label>
                            <div className="flex flex-wrap gap-2">
                                {statusOptions.map(option => (
                                    <button
                                        key={option.value}
                                        onClick={() => toggleArrayFilter('status', option.value)}
                                        className={`px-3 py-1.5 rounded-full text-sm flex items-center gap-2 transition-colors ${filters.status.includes(option.value)
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                            }`}
                                    >
                                        <span className={`w-2 h-2 rounded-full ${option.color}`}></span>
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* فلتر القسم */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">القسم</label>
                        <div className="flex flex-wrap gap-2">
                            {departments.map(dept => (
                                <button
                                    key={dept}
                                    onClick={() => toggleArrayFilter('department', dept)}
                                    className={`px-3 py-1.5 rounded-full text-sm transition-colors ${filters.department.includes(dept)
                                            ? 'bg-green-600 text-white'
                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                        }`}
                                >
                                    {dept}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* فلتر المصدر */}
                    {showSourceFilter && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">المصدر</label>
                            <div className="flex flex-wrap gap-2">
                                {sourceOptions.map(option => (
                                    <button
                                        key={option.value}
                                        onClick={() => toggleArrayFilter('source', option.value)}
                                        className={`px-3 py-1.5 rounded-full text-sm transition-colors ${filters.source.includes(option.value)
                                                ? 'bg-purple-600 text-white'
                                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                                            }`}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* فلتر التاريخ */}
                    {showDateFilter && (
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">من تاريخ</label>
                                <input
                                    type="date"
                                    value={filters.dateFrom}
                                    onChange={(e) => onFiltersChange({ ...filters, dateFrom: e.target.value })}
                                    className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg border-0 focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">إلى تاريخ</label>
                                <input
                                    type="date"
                                    value={filters.dateTo}
                                    onChange={(e) => onFiltersChange({ ...filters, dateTo: e.target.value })}
                                    className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg border-0 focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                    )}

                    {/* فلاتر إضافية */}
                    <div className="flex flex-wrap gap-4">
                        {showAttachmentFilter && (
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={filters.hasAttachments === true}
                                    onChange={(e) => onFiltersChange({ ...filters, hasAttachments: e.target.checked ? true : null })}
                                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700 dark:text-gray-300">يحتوي مرفقات</span>
                            </label>
                        )}

                        {showResponseFilter && (
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={filters.hasResponse === true}
                                    onChange={(e) => onFiltersChange({ ...filters, hasResponse: e.target.checked ? true : null })}
                                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700 dark:text-gray-300">تم الرد عليه</span>
                            </label>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// ==================== دالة تطبيق الفلاتر ====================
export const applyFilters = <T extends Record<string, any>>(
    items: T[],
    filters: SearchFilters,
    searchableFields: (keyof T)[]
): T[] => {
    return items.filter(item => {
        // فلتر البحث النصي
        if (filters.query) {
            const query = filters.query.toLowerCase();
            const matchesQuery = searchableFields.some(field => {
                const value = item[field];
                return value && String(value).toLowerCase().includes(query);
            });
            if (!matchesQuery) return false;
        }

        // فلتر الحالة
        if (filters.status.length > 0) {
            if (!filters.status.includes(item.status)) return false;
        }

        // فلتر القسم
        if (filters.department.length > 0) {
            if (!filters.department.includes(item.department)) return false;
        }

        // فلتر المصدر
        if (filters.source.length > 0) {
            if (!filters.source.includes(item.source)) return false;
        }

        // فلتر التاريخ
        if (filters.dateFrom) {
            const itemDate = new Date(item.submissionDate || item.createdAt);
            const fromDate = new Date(filters.dateFrom);
            if (itemDate < fromDate) return false;
        }

        if (filters.dateTo) {
            const itemDate = new Date(item.submissionDate || item.createdAt);
            const toDate = new Date(filters.dateTo);
            toDate.setHours(23, 59, 59, 999);
            if (itemDate > toDate) return false;
        }

        // فلتر المرفقات
        if (filters.hasAttachments !== null) {
            const hasAttachments = item.attachments && item.attachments.length > 0;
            if (filters.hasAttachments !== hasAttachments) return false;
        }

        // فلتر الرد
        if (filters.hasResponse !== null) {
            const hasResponse = !!item.response;
            if (filters.hasResponse !== hasResponse) return false;
        }

        return true;
    });
};

// ==================== Hook للبحث المتقدم ====================
export const useAdvancedSearch = <T extends Record<string, any>>(
    items: T[],
    searchableFields: (keyof T)[]
) => {
    const [filters, setFilters] = useState<SearchFilters>(DEFAULT_FILTERS);

    const filteredItems = useMemo(() => {
        return applyFilters(items, filters, searchableFields);
    }, [items, filters, searchableFields]);

    const resetFilters = () => setFilters(DEFAULT_FILTERS);

    return {
        filters,
        setFilters,
        filteredItems,
        resetFilters,
        activeFiltersCount: Object.entries(filters).filter(([key, value]) => {
            if (Array.isArray(value)) return value.length > 0;
            if (typeof value === 'boolean') return value !== null;
            return !!value;
        }).length
    };
};

export { DEFAULT_FILTERS };
