// =====================================================
// 🔍 Advanced Search Manager
// نظام البحث المتقدم مع فلاتر متعددة
// =====================================================

import { Ticket, ContactMessage, RequestStatus, RequestType } from '../types';

export interface SearchFilters {
    // نص البحث
    query?: string;

    // فلاتر الحالة
    status?: RequestStatus[];

    // فلاتر النوع
    requestType?: RequestType[];

    // فلاتر القسم
    departments?: string[];

    // فلاتر التاريخ
    dateRange?: {
        start?: Date;
        end?: Date;
    };

    // فلاتر SLA
    slaStatus?: 'all' | 'compliant' | 'at-risk' | 'breached';

    // فلاتر الأولوية
    priority?: ('critical' | 'high' | 'medium' | 'low')[];

    // فلاتر إضافية
    hasAttachments?: boolean;
    hasResponse?: boolean;
    isArchived?: boolean;
    source?: 'مواطن' | 'موظف';
}

export interface SearchOptions {
    // ترتيب النتائج
    sortBy?: 'date' | 'status' | 'priority' | 'relevance';
    sortOrder?: 'asc' | 'desc';

    // تقسيم الصفحات
    page?: number;
    pageSize?: number;

    // خيارات البحث
    fuzzy?: boolean;
    highlightMatches?: boolean;
}

export interface SearchResult<T> {
    items: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    facets?: SearchFacets;
}

export interface SearchFacets {
    status: Record<string, number>;
    departments: Record<string, number>;
    requestType: Record<string, number>;
    dateRanges: Record<string, number>;
}

class AdvancedSearchManager {
    /**
     * البحث في الطلبات
     */
    searchTickets(
        tickets: Ticket[],
        filters: SearchFilters,
        options: SearchOptions = {}
    ): SearchResult<Ticket> {
        let results = [...tickets];

        // تطبيق الفلاتر
        results = this.applyFilters(results, filters);

        // حساب الـ Facets
        const facets = this.calculateFacets(tickets, results);

        // الترتيب
        results = this.sortResults(results, options);

        // تقسيم الصفحات
        const { items, total, page, pageSize, totalPages } = this.paginate(results, options);

        return {
            items,
            total,
            page,
            pageSize,
            totalPages,
            facets
        };
    }

    /**
     * تطبيق الفلاتر
     */
    private applyFilters<T extends Ticket | ContactMessage>(items: T[], filters: SearchFilters): T[] {
        let results = [...items];

        // البحث النصي
        if (filters.query && filters.query.trim()) {
            const query = this.normalizeArabic(filters.query.toLowerCase());
            results = results.filter(item => {
                const searchableText = this.getSearchableText(item);
                return this.matchesQuery(searchableText, query, true);
            });
        }

        // فلتر الحالة
        if (filters.status && filters.status.length > 0) {
            results = results.filter(item =>
                'status' in item && filters.status!.includes(item.status as RequestStatus)
            );
        }

        // فلتر النوع
        if (filters.requestType && filters.requestType.length > 0) {
            results = results.filter(item =>
                'requestType' in item && filters.requestType!.includes((item as Ticket).requestType)
            );
        }

        // فلتر القسم
        if (filters.departments && filters.departments.length > 0) {
            results = results.filter(item =>
                'department' in item && filters.departments!.includes(item.department as string)
            );
        }

        // فلتر التاريخ
        if (filters.dateRange) {
            const { start, end } = filters.dateRange;
            results = results.filter(item => {
                const date = new Date((item as any).submissionDate);
                if (start && date < start) return false;
                if (end && date > end) return false;
                return true;
            });
        }

        // فلتر المرفقات
        if (filters.hasAttachments !== undefined) {
            results = results.filter(item => {
                const hasAttach = 'attachments' in item &&
                    Array.isArray((item as any).attachments) &&
                    (item as any).attachments.length > 0;
                return filters.hasAttachments ? hasAttach : !hasAttach;
            });
        }

        // فلتر الرد
        if (filters.hasResponse !== undefined) {
            results = results.filter(item => {
                const hasResp = 'response' in item && !!(item as any).response;
                return filters.hasResponse ? hasResp : !hasResp;
            });
        }

        // فلتر الأرشيف
        if (filters.isArchived !== undefined) {
            results = results.filter(item => {
                const archived = 'archived' in item && (item as any).archived === true;
                return filters.isArchived ? archived : !archived;
            });
        }

        // فلتر المصدر
        if (filters.source) {
            results = results.filter(item =>
                'source' in item && (item as any).source === filters.source
            );
        }

        return results;
    }

    /**
     * تطبيع النص العربي
     */
    private normalizeArabic(text: string): string {
        return text
            .replace(/[أإآ]/g, 'ا')
            .replace(/ة/g, 'ه')
            .replace(/ى/g, 'ي')
            .replace(/ؤ/g, 'و')
            .replace(/ئ/g, 'ي')
            .trim();
    }

    /**
     * استخراج النص القابل للبحث
     */
    private getSearchableText(item: Ticket | ContactMessage): string {
        const parts: string[] = [];

        if ('id' in item) parts.push(item.id);
        if ('fullName' in item) parts.push((item as Ticket).fullName);
        if ('name' in item) parts.push((item as ContactMessage).name);
        if ('details' in item) parts.push((item as Ticket).details);
        if ('message' in item) parts.push((item as ContactMessage).message);
        if ('department' in item) parts.push(item.department as string);
        if ('email' in item) parts.push(item.email || '');
        if ('phone' in item) parts.push((item as Ticket).phone || '');
        if ('nationalId' in item) parts.push((item as Ticket).nationalId || '');
        if ('response' in item) parts.push((item as Ticket).response || '');
        if ('subject' in item) parts.push((item as ContactMessage).subject || '');

        return this.normalizeArabic(parts.join(' ').toLowerCase());
    }

    /**
     * مطابقة الاستعلام
     */
    private matchesQuery(text: string, query: string, fuzzy: boolean = false): boolean {
        if (text.includes(query)) return true;

        if (fuzzy) {
            // بحث ضبابي بسيط
            const words = query.split(/\s+/);
            return words.every(word => {
                if (text.includes(word)) return true;
                // مطابقة جزئية
                return text.split(/\s+/).some(textWord =>
                    textWord.startsWith(word) || word.startsWith(textWord)
                );
            });
        }

        return false;
    }

    /**
     * ترتيب النتائج
     */
    private sortResults<T extends Ticket | ContactMessage>(
        items: T[],
        options: SearchOptions
    ): T[] {
        const { sortBy = 'date', sortOrder = 'desc' } = options;

        return [...items].sort((a, b) => {
            let comparison = 0;

            switch (sortBy) {
                case 'date':
                    const dateA = new Date((a as any).submissionDate).getTime();
                    const dateB = new Date((b as any).submissionDate).getTime();
                    comparison = dateA - dateB;
                    break;

                case 'status':
                    const statusOrder: Record<string, number> = {
                        [RequestStatus.New]: 0,
                        [RequestStatus.InProgress]: 1,
                        [RequestStatus.Answered]: 2,
                        [RequestStatus.Closed]: 3
                    };
                    comparison = (statusOrder[(a as any).status] || 0) - (statusOrder[(b as any).status] || 0);
                    break;

                case 'priority':
                    // يمكن إضافة منطق الأولوية هنا
                    break;

                case 'relevance':
                    // البحث بالملاءمة يتطلب حساب درجة التطابق
                    break;
            }

            return sortOrder === 'desc' ? -comparison : comparison;
        });
    }

    /**
     * تقسيم الصفحات
     */
    private paginate<T>(items: T[], options: SearchOptions): {
        items: T[];
        total: number;
        page: number;
        pageSize: number;
        totalPages: number;
    } {
        const page = Math.max(1, options.page || 1);
        const pageSize = Math.max(1, Math.min(100, options.pageSize || 20));
        const total = items.length;
        const totalPages = Math.ceil(total / pageSize);

        const start = (page - 1) * pageSize;
        const paginatedItems = items.slice(start, start + pageSize);

        return {
            items: paginatedItems,
            total,
            page,
            pageSize,
            totalPages
        };
    }

    /**
     * حساب الـ Facets
     */
    private calculateFacets(allItems: Ticket[], filteredItems: Ticket[]): SearchFacets {
        const status: Record<string, number> = {};
        const departments: Record<string, number> = {};
        const requestType: Record<string, number> = {};

        for (const item of filteredItems) {
            // حالة الطلب
            const s = item.status || 'unknown';
            status[s] = (status[s] || 0) + 1;

            // القسم
            const d = item.department || 'غير محدد';
            departments[d] = (departments[d] || 0) + 1;

            // نوع الطلب
            const t = item.requestType || 'unknown';
            requestType[t] = (requestType[t] || 0) + 1;
        }

        // نطاقات التاريخ
        const now = new Date();
        const dateRanges: Record<string, number> = {
            'اليوم': 0,
            'آخر 7 أيام': 0,
            'آخر 30 يوم': 0,
            'أقدم': 0
        };

        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

        for (const item of filteredItems) {
            const date = new Date(item.submissionDate);
            if (date >= today) {
                dateRanges['اليوم']++;
            } else if (date >= weekAgo) {
                dateRanges['آخر 7 أيام']++;
            } else if (date >= monthAgo) {
                dateRanges['آخر 30 يوم']++;
            } else {
                dateRanges['أقدم']++;
            }
        }

        return { status, departments, requestType, dateRanges };
    }

    /**
     * اقتراحات البحث
     */
    getSuggestions(
        tickets: Ticket[],
        query: string,
        limit: number = 5
    ): string[] {
        if (!query || query.length < 2) return [];

        const normalizedQuery = this.normalizeArabic(query.toLowerCase());
        const suggestions = new Set<string>();

        for (const ticket of tickets) {
            // اقتراحات من الأسماء
            if (ticket.fullName &&
                this.normalizeArabic(ticket.fullName.toLowerCase()).includes(normalizedQuery)) {
                suggestions.add(ticket.fullName);
            }

            // اقتراحات من الأقسام
            if (ticket.department &&
                this.normalizeArabic(ticket.department.toLowerCase()).includes(normalizedQuery)) {
                suggestions.add(ticket.department);
            }

            // اقتراحات من الأرقام
            if (ticket.id.includes(query)) {
                suggestions.add(ticket.id);
            }

            if (suggestions.size >= limit) break;
        }

        return Array.from(suggestions).slice(0, limit);
    }

    /**
     * البحث السريع
     */
    quickSearch(
        tickets: Ticket[],
        query: string,
        limit: number = 10
    ): Ticket[] {
        if (!query || query.length < 2) return [];

        return this.searchTickets(tickets, { query }, {
            pageSize: limit,
            sortBy: 'relevance'
        }).items;
    }
}

// Export singleton
export const advancedSearch = new AdvancedSearchManager();

export default advancedSearch;
