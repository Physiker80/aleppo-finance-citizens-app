// =====================================================
// 🗄️ Database Indexing
// فهرسة قاعدة البيانات
// =====================================================

export interface IndexConfig {
    name: string;
    fields: string[];
    unique: boolean;
    sparse: boolean;
}

export interface QueryOptimization {
    originalTime: number;
    optimizedTime: number;
    improvement: number;
    usedIndex?: string;
}

export interface IndexStats {
    name: string;
    size: number;
    entries: number;
    hits: number;
    misses: number;
    lastUsed: number;
}

// هيكل الفهرس
interface IndexEntry {
    key: string;
    ids: string[];
}

interface Index {
    config: IndexConfig;
    entries: Map<string, string[]>;
    stats: IndexStats;
}

const INDEXES_KEY = 'db-indexes';
const STATS_KEY = 'db-index-stats';

// الفهارس المُنشأة
const indexes = new Map<string, Index>();

/**
 * إنشاء فهرس جديد
 */
export function createIndex<T extends Record<string, unknown>>(
    collection: string,
    config: IndexConfig,
    items: T[]
): void {
    const indexKey = `${collection}:${config.name}`;

    const entries = new Map<string, string[]>();

    items.forEach((item: T) => {
        const key = generateKey(item, config.fields);
        if (key !== null) {
            const existing = entries.get(key) || [];
            const id = item.id as string;

            if (!config.unique || existing.length === 0) {
                existing.push(id);
                entries.set(key, existing);
            }
        }
    });

    const index: Index = {
        config,
        entries,
        stats: {
            name: config.name,
            size: entries.size,
            entries: items.length,
            hits: 0,
            misses: 0,
            lastUsed: Date.now()
        }
    };

    indexes.set(indexKey, index);
    saveIndexes();
}

/**
 * توليد مفتاح الفهرس
 */
function generateKey<T extends Record<string, unknown>>(
    item: T,
    fields: string[]
): string | null {
    const values = fields.map(field => {
        const value = getNestedValue(item, field);
        return value !== undefined ? String(value) : null;
    });

    if (values.includes(null)) return null;

    return values.join('::');
}

/**
 * الحصول على قيمة متداخلة
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce((current: unknown, key) => {
        return current && typeof current === 'object' ? (current as Record<string, unknown>)[key] : undefined;
    }, obj);
}

/**
 * البحث باستخدام الفهرس
 */
export function searchWithIndex<T extends Record<string, unknown>>(
    collection: string,
    indexName: string,
    query: Record<string, unknown>,
    items: T[]
): { results: T[]; usedIndex: boolean; time: number } {
    const startTime = performance.now();
    const indexKey = `${collection}:${indexName}`;
    const index = indexes.get(indexKey);

    if (!index) {
        // البحث التقليدي
        const results = items.filter(item =>
            Object.entries(query).every(([key, value]) =>
                getNestedValue(item, key) === value
            )
        );

        return {
            results,
            usedIndex: false,
            time: performance.now() - startTime
        };
    }

    // البحث باستخدام الفهرس
    const key = Object.values(query).join('::');
    const ids = index.entries.get(key);

    index.stats.lastUsed = Date.now();

    if (ids) {
        index.stats.hits++;
        const idSet = new Set(ids);
        const results = items.filter(item => idSet.has(item.id as string));

        return {
            results,
            usedIndex: true,
            time: performance.now() - startTime
        };
    }

    index.stats.misses++;

    return {
        results: [],
        usedIndex: true,
        time: performance.now() - startTime
    };
}

/**
 * إضافة عنصر للفهرس
 */
export function addToIndex<T extends Record<string, unknown>>(
    collection: string,
    indexName: string,
    item: T
): void {
    const indexKey = `${collection}:${indexName}`;
    const index = indexes.get(indexKey);

    if (!index) return;

    const key = generateKey(item, index.config.fields);
    if (key === null) return;

    const existing = index.entries.get(key) || [];
    const id = item.id as string;

    if (!index.config.unique || existing.length === 0) {
        existing.push(id);
        index.entries.set(key, existing);
        index.stats.entries++;
        index.stats.size = index.entries.size;
    }

    saveIndexes();
}

/**
 * حذف عنصر من الفهرس
 */
export function removeFromIndex<T extends Record<string, unknown>>(
    collection: string,
    indexName: string,
    item: T
): void {
    const indexKey = `${collection}:${indexName}`;
    const index = indexes.get(indexKey);

    if (!index) return;

    const key = generateKey(item, index.config.fields);
    if (key === null) return;

    const existing = index.entries.get(key);
    if (!existing) return;

    const id = item.id as string;
    const filtered = existing.filter(i => i !== id);

    if (filtered.length === 0) {
        index.entries.delete(key);
    } else {
        index.entries.set(key, filtered);
    }

    index.stats.entries--;
    index.stats.size = index.entries.size;

    saveIndexes();
}

/**
 * تحديث عنصر في الفهرس
 */
export function updateInIndex<T extends Record<string, unknown>>(
    collection: string,
    indexName: string,
    oldItem: T,
    newItem: T
): void {
    removeFromIndex(collection, indexName, oldItem);
    addToIndex(collection, indexName, newItem);
}

/**
 * إعادة بناء الفهرس
 */
export function rebuildIndex<T extends Record<string, unknown>>(
    collection: string,
    indexName: string,
    items: T[]
): void {
    const indexKey = `${collection}:${indexName}`;
    const index = indexes.get(indexKey);

    if (!index) return;

    index.entries.clear();

    items.forEach(item => {
        const key = generateKey(item, index.config.fields);
        if (key !== null) {
            const existing = index.entries.get(key) || [];
            const id = item.id as string;

            if (!index.config.unique || existing.length === 0) {
                existing.push(id);
                index.entries.set(key, existing);
            }
        }
    });

    index.stats.size = index.entries.size;
    index.stats.entries = items.length;

    saveIndexes();
}

/**
 * حذف فهرس
 */
export function dropIndex(collection: string, indexName: string): boolean {
    const indexKey = `${collection}:${indexName}`;
    const deleted = indexes.delete(indexKey);

    if (deleted) {
        saveIndexes();
    }

    return deleted;
}

/**
 * الحصول على إحصائيات الفهرس
 */
export function getIndexStats(collection: string, indexName: string): IndexStats | null {
    const indexKey = `${collection}:${indexName}`;
    const index = indexes.get(indexKey);

    return index ? { ...index.stats } : null;
}

/**
 * الحصول على جميع الفهارس
 */
export function getAllIndexes(): Array<{
    collection: string;
    name: string;
    config: IndexConfig;
    stats: IndexStats;
}> {
    return [...indexes.entries()].map(([key, index]) => {
        const [collection, name] = key.split(':');
        return {
            collection,
            name,
            config: index.config,
            stats: index.stats
        };
    });
}

/**
 * حفظ الفهارس
 */
function saveIndexes(): void {
    const serializable: Record<string, { config: IndexConfig; entries: [string, string[]][]; stats: IndexStats }> = {};

    indexes.forEach((index, key) => {
        serializable[key] = {
            config: index.config,
            entries: [...index.entries.entries()],
            stats: index.stats
        };
    });

    localStorage.setItem(INDEXES_KEY, JSON.stringify(serializable));
}

/**
 * تحميل الفهارس
 */
export function loadIndexes(): void {
    try {
        const saved = localStorage.getItem(INDEXES_KEY);
        if (!saved) return;

        const parsed = JSON.parse(saved);

        Object.entries(parsed).forEach(([key, data]) => {
            const typedData = data as { config: IndexConfig; entries: [string, string[]][]; stats: IndexStats };
            indexes.set(key, {
                config: typedData.config,
                entries: new Map(typedData.entries),
                stats: typedData.stats
            });
        });
    } catch (error) {
        console.error('فشل في تحميل الفهارس:', error);
    }
}

/**
 * تحليل الاستعلام واقتراح فهرس
 */
export function suggestIndex<T extends Record<string, unknown>>(
    collection: string,
    queries: Array<Record<string, unknown>>
): IndexConfig | null {
    // تحليل الحقول الأكثر استخداماً
    const fieldCounts = new Map<string, number>();

    queries.forEach(query => {
        Object.keys(query).forEach(field => {
            fieldCounts.set(field, (fieldCounts.get(field) || 0) + 1);
        });
    });

    // ترتيب الحقول حسب الاستخدام
    const sortedFields = [...fieldCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([field]) => field);

    if (sortedFields.length === 0) return null;

    return {
        name: `auto_${sortedFields.slice(0, 3).join('_')}`,
        fields: sortedFields.slice(0, 3),
        unique: false,
        sparse: false
    };
}

/**
 * قياس أداء الاستعلام
 */
export function benchmarkQuery<T extends Record<string, unknown>>(
    collection: string,
    query: Record<string, unknown>,
    items: T[],
    iterations: number = 100
): {
    withoutIndex: { avgTime: number; minTime: number; maxTime: number };
    withIndex?: { avgTime: number; minTime: number; maxTime: number; indexName: string };
    improvement?: number;
} {
    // قياس بدون فهرس
    const withoutIndexTimes: number[] = [];

    for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        items.filter(item =>
            Object.entries(query).every(([key, value]) =>
                getNestedValue(item, key) === value
            )
        );
        withoutIndexTimes.push(performance.now() - start);
    }

    const withoutIndex = {
        avgTime: withoutIndexTimes.reduce((a, b) => a + b, 0) / iterations,
        minTime: Math.min(...withoutIndexTimes),
        maxTime: Math.max(...withoutIndexTimes)
    };

    // البحث عن فهرس مناسب
    const queryFields = Object.keys(query);
    let bestIndex: string | null = null;

    indexes.forEach((index, key) => {
        if (key.startsWith(collection + ':')) {
            const indexFields = index.config.fields;
            if (queryFields.every(f => indexFields.includes(f))) {
                bestIndex = key.split(':')[1];
            }
        }
    });

    if (!bestIndex) {
        return { withoutIndex };
    }

    // قياس مع الفهرس
    const withIndexTimes: number[] = [];

    for (let i = 0; i < iterations; i++) {
        const { time } = searchWithIndex(collection, bestIndex, query, items);
        withIndexTimes.push(time);
    }

    const withIndex = {
        avgTime: withIndexTimes.reduce((a, b) => a + b, 0) / iterations,
        minTime: Math.min(...withIndexTimes),
        maxTime: Math.max(...withIndexTimes),
        indexName: bestIndex
    };

    const improvement = ((withoutIndex.avgTime - withIndex.avgTime) / withoutIndex.avgTime) * 100;

    return { withoutIndex, withIndex, improvement };
}

/**
 * إنشاء فهارس تلقائية للشكاوى
 */
export function createTicketIndexes<T extends Record<string, unknown>>(tickets: T[]): void {
    // فهرس القسم
    createIndex('tickets', {
        name: 'department',
        fields: ['department'],
        unique: false,
        sparse: false
    }, tickets);

    // فهرس الحالة
    createIndex('tickets', {
        name: 'status',
        fields: ['status'],
        unique: false,
        sparse: false
    }, tickets);

    // فهرس مركب (القسم + الحالة)
    createIndex('tickets', {
        name: 'department_status',
        fields: ['department', 'status'],
        unique: false,
        sparse: false
    }, tickets);

    // فهرس المواطن
    createIndex('tickets', {
        name: 'citizen',
        fields: ['citizenName'],
        unique: false,
        sparse: false
    }, tickets);

    // فهرس الرقم الوطني
    createIndex('tickets', {
        name: 'nationalId',
        fields: ['nationalId'],
        unique: false,
        sparse: true
    }, tickets);
}

// تحميل الفهارس عند بدء التشغيل
loadIndexes();

export default {
    createIndex,
    searchWithIndex,
    addToIndex,
    removeFromIndex,
    updateInIndex,
    rebuildIndex,
    dropIndex,
    getIndexStats,
    getAllIndexes,
    loadIndexes,
    suggestIndex,
    benchmarkQuery,
    createTicketIndexes
};
