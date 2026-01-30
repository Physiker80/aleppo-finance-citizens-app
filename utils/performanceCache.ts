// =====================================================
// ⚡ Performance & Cache Manager
// نظام التخزين المؤقت وتحسين الأداء
// =====================================================

export interface CacheEntry<T> {
    data: T;
    timestamp: number;
    expiresAt: number;
    tags?: string[];
}

export interface CacheConfig {
    /** مدة الصلاحية الافتراضية (بالثواني) */
    defaultTTL: number;
    /** الحد الأقصى لعدد العناصر */
    maxEntries: number;
    /** تفعيل التسجيل */
    enableLogging: boolean;
}

const DEFAULT_CONFIG: CacheConfig = {
    defaultTTL: 300, // 5 دقائق
    maxEntries: 100,
    enableLogging: false
};

class PerformanceCacheManager {
    private cache: Map<string, CacheEntry<unknown>> = new Map();
    private config: CacheConfig;
    private hitCount: number = 0;
    private missCount: number = 0;

    constructor(config: Partial<CacheConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    /**
     * تخزين في الذاكرة المؤقتة
     */
    set<T>(key: string, data: T, ttl?: number, tags?: string[]): void {
        const now = Date.now();
        const expiresAt = now + (ttl || this.config.defaultTTL) * 1000;

        // التحقق من الحد الأقصى
        if (this.cache.size >= this.config.maxEntries) {
            this.evictOldest();
        }

        this.cache.set(key, {
            data,
            timestamp: now,
            expiresAt,
            tags
        });

        this.log(`[Cache] Set: ${key}`);
    }

    /**
     * الحصول من الذاكرة المؤقتة
     */
    get<T>(key: string): T | null {
        const entry = this.cache.get(key) as CacheEntry<T> | undefined;

        if (!entry) {
            this.missCount++;
            this.log(`[Cache] Miss: ${key}`);
            return null;
        }

        // التحقق من انتهاء الصلاحية
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            this.missCount++;
            this.log(`[Cache] Expired: ${key}`);
            return null;
        }

        this.hitCount++;
        this.log(`[Cache] Hit: ${key}`);
        return entry.data;
    }

    /**
     * الحصول أو التخزين (Memoization)
     */
    async getOrSet<T>(
        key: string,
        fetcher: () => Promise<T>,
        ttl?: number,
        tags?: string[]
    ): Promise<T> {
        const cached = this.get<T>(key);
        if (cached !== null) return cached;

        const data = await fetcher();
        this.set(key, data, ttl, tags);
        return data;
    }

    /**
     * حذف من الذاكرة المؤقتة
     */
    delete(key: string): boolean {
        const result = this.cache.delete(key);
        this.log(`[Cache] Delete: ${key}`);
        return result;
    }

    /**
     * حذف حسب العلامات
     */
    deleteByTags(tags: string[]): number {
        let deleted = 0;
        this.cache.forEach((entry, key) => {
            if (entry.tags?.some(t => tags.includes(t))) {
                this.cache.delete(key);
                deleted++;
            }
        });
        this.log(`[Cache] Deleted ${deleted} entries by tags: ${tags.join(', ')}`);
        return deleted;
    }

    /**
     * مسح جميع العناصر
     */
    clear(): void {
        this.cache.clear();
        this.hitCount = 0;
        this.missCount = 0;
        this.log('[Cache] Cleared');
    }

    /**
     * حذف الأقدم
     */
    private evictOldest(): void {
        let oldestKey: string | null = null;
        let oldestTime = Infinity;

        this.cache.forEach((entry, key) => {
            if (entry.timestamp < oldestTime) {
                oldestTime = entry.timestamp;
                oldestKey = key;
            }
        });

        if (oldestKey) {
            this.cache.delete(oldestKey);
            this.log(`[Cache] Evicted: ${oldestKey}`);
        }
    }

    /**
     * تنظيف المنتهية
     */
    cleanup(): number {
        const now = Date.now();
        let cleaned = 0;

        this.cache.forEach((entry, key) => {
            if (now > entry.expiresAt) {
                this.cache.delete(key);
                cleaned++;
            }
        });

        this.log(`[Cache] Cleaned ${cleaned} expired entries`);
        return cleaned;
    }

    /**
     * إحصائيات الذاكرة المؤقتة
     */
    getStats(): {
        size: number;
        hitRate: number;
        missRate: number;
        hits: number;
        misses: number;
    } {
        const total = this.hitCount + this.missCount;
        return {
            size: this.cache.size,
            hitRate: total > 0 ? (this.hitCount / total) * 100 : 0,
            missRate: total > 0 ? (this.missCount / total) * 100 : 0,
            hits: this.hitCount,
            misses: this.missCount
        };
    }

    /**
     * التسجيل
     */
    private log(message: string): void {
        if (this.config.enableLogging) {
            console.log(message);
        }
    }
}

// =====================================================
// 🚀 Performance Utilities
// أدوات تحسين الأداء
// =====================================================

/**
 * Debounce - تأخير التنفيذ
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: ReturnType<typeof setTimeout> | null = null;

    return function (this: unknown, ...args: Parameters<T>): void {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => {
            func.apply(this, args);
        }, wait);
    };
}

/**
 * Throttle - تحديد معدل التنفيذ
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
    func: T,
    limit: number
): (...args: Parameters<T>) => void {
    let inThrottle = false;

    return function (this: unknown, ...args: Parameters<T>): void {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => {
                inThrottle = false;
            }, limit);
        }
    };
}

/**
 * Memoize - حفظ نتائج الدوال
 */
export function memoize<T extends (...args: unknown[]) => unknown>(
    func: T,
    resolver?: (...args: Parameters<T>) => string
): T {
    const cache = new Map<string, ReturnType<T>>();

    return function (this: unknown, ...args: Parameters<T>): ReturnType<T> {
        const key = resolver ? resolver(...args) : JSON.stringify(args);

        if (cache.has(key)) {
            return cache.get(key)!;
        }

        const result = func.apply(this, args) as ReturnType<T>;
        cache.set(key, result);
        return result;
    } as T;
}

/**
 * Lazy Load - تحميل كسول
 */
export function lazyLoad<T>(
    factory: () => Promise<T>
): () => Promise<T> {
    let instance: T | null = null;
    let loading: Promise<T> | null = null;

    return async (): Promise<T> => {
        if (instance !== null) return instance;

        if (!loading) {
            loading = factory().then(result => {
                instance = result;
                return result;
            });
        }

        return loading;
    };
}

/**
 * قياس وقت التنفيذ
 */
export function measureTime<T>(
    name: string,
    func: () => T
): T {
    const start = performance.now();
    const result = func();
    const end = performance.now();
    console.log(`[Performance] ${name}: ${(end - start).toFixed(2)}ms`);
    return result;
}

/**
 * قياس وقت التنفيذ (غير متزامن)
 */
export async function measureTimeAsync<T>(
    name: string,
    func: () => Promise<T>
): Promise<T> {
    const start = performance.now();
    const result = await func();
    const end = performance.now();
    console.log(`[Performance] ${name}: ${(end - start).toFixed(2)}ms`);
    return result;
}

/**
 * Virtual List Helper - لقوائم طويلة
 */
export function getVisibleRange(
    containerHeight: number,
    itemHeight: number,
    scrollTop: number,
    totalItems: number,
    overscan: number = 3
): { start: number; end: number; offsetY: number } {
    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const end = Math.min(totalItems, start + visibleCount + overscan * 2);
    const offsetY = start * itemHeight;

    return { start, end, offsetY };
}

/**
 * تحميل الصور بشكل كسول
 */
export function setupLazyImages(): void {
    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target as HTMLImageElement;
                    const src = img.dataset.src;
                    if (src) {
                        img.src = src;
                        img.removeAttribute('data-src');
                    }
                    observer.unobserve(img);
                }
            });
        }, {
            rootMargin: '50px 0px'
        });

        document.querySelectorAll('img[data-src]').forEach(img => {
            observer.observe(img);
        });
    } else {
        // Fallback للمتصفحات القديمة
        document.querySelectorAll<HTMLImageElement>('img[data-src]').forEach(img => {
            const src = img.dataset.src;
            if (src) img.src = src;
        });
    }
}

/**
 * تحسين requestAnimationFrame
 */
export function optimizedRAF(callback: FrameRequestCallback): number {
    return window.requestAnimationFrame(callback);
}

/**
 * تجميع التحديثات
 */
export function batchUpdates<T>(
    items: T[],
    processor: (item: T) => void,
    batchSize: number = 50
): Promise<void> {
    return new Promise((resolve) => {
        let index = 0;

        function processBatch() {
            const endIndex = Math.min(index + batchSize, items.length);

            for (let i = index; i < endIndex; i++) {
                processor(items[i]);
            }

            index = endIndex;

            if (index < items.length) {
                requestAnimationFrame(processBatch);
            } else {
                resolve();
            }
        }

        processBatch();
    });
}

// Export singleton
export const performanceCache = new PerformanceCacheManager();

export default performanceCache;
