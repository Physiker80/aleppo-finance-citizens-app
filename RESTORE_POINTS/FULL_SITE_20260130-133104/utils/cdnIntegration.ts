// =====================================================
// 🌐 CDN Integration
// تكامل CDN
// =====================================================

export interface CDNConfig {
    provider: CDNProvider;
    baseUrl: string;
    apiKey?: string;
    enabled: boolean;
    cacheControl: string;
    optimizeImages: boolean;
    minifyAssets: boolean;
    prefetchResources: boolean;
}

export type CDNProvider = 'cloudflare' | 'fastly' | 'akamai' | 'azure-cdn' | 'aws-cloudfront' | 'custom';

export interface CDNAsset {
    originalUrl: string;
    cdnUrl: string;
    type: AssetType;
    size: number;
    cached: boolean;
    cacheExpiry?: number;
}

export type AssetType = 'image' | 'script' | 'style' | 'font' | 'document' | 'other';

export interface CDNStats {
    totalRequests: number;
    cacheHits: number;
    cacheMisses: number;
    bandwidthSaved: number;
    averageResponseTime: number;
}

const CONFIG_KEY = 'cdn-config';
const CACHE_KEY = 'cdn-cache';

const DEFAULT_CONFIG: CDNConfig = {
    provider: 'cloudflare',
    baseUrl: '',
    enabled: false,
    cacheControl: 'public, max-age=31536000',
    optimizeImages: true,
    minifyAssets: true,
    prefetchResources: true
};

// ذاكرة التخزين المؤقت
const assetCache = new Map<string, CDNAsset>();

/**
 * تحميل الإعدادات
 */
export function loadConfig(): CDNConfig {
    try {
        const saved = localStorage.getItem(CONFIG_KEY);
        return saved ? { ...DEFAULT_CONFIG, ...JSON.parse(saved) } : DEFAULT_CONFIG;
    } catch {
        return DEFAULT_CONFIG;
    }
}

/**
 * حفظ الإعدادات
 */
export function saveConfig(config: Partial<CDNConfig>): void {
    const current = loadConfig();
    localStorage.setItem(CONFIG_KEY, JSON.stringify({ ...current, ...config }));
}

/**
 * الحصول على نوع المورد
 */
function getAssetType(url: string): AssetType {
    const ext = url.split('.').pop()?.toLowerCase() || '';

    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'ico'].includes(ext)) {
        return 'image';
    }
    if (['js', 'mjs'].includes(ext)) {
        return 'script';
    }
    if (['css'].includes(ext)) {
        return 'style';
    }
    if (['woff', 'woff2', 'ttf', 'otf', 'eot'].includes(ext)) {
        return 'font';
    }
    if (['pdf', 'doc', 'docx', 'xls', 'xlsx'].includes(ext)) {
        return 'document';
    }

    return 'other';
}

/**
 * تحويل URL إلى CDN URL
 */
export function getCDNUrl(originalUrl: string): string {
    const config = loadConfig();

    if (!config.enabled || !config.baseUrl) {
        return originalUrl;
    }

    // التحقق من أن URL ليس بالفعل CDN URL
    if (originalUrl.startsWith(config.baseUrl)) {
        return originalUrl;
    }

    // تحويل URL نسبي إلى مطلق
    let absoluteUrl = originalUrl;
    if (originalUrl.startsWith('/')) {
        absoluteUrl = window.location.origin + originalUrl;
    } else if (!originalUrl.startsWith('http')) {
        absoluteUrl = new URL(originalUrl, window.location.href).href;
    }

    // استخراج المسار من URL
    const url = new URL(absoluteUrl);
    const path = url.pathname;

    // إضافة معلمات التحسين
    const params = new URLSearchParams();

    const type = getAssetType(path);

    if (config.optimizeImages && type === 'image') {
        params.set('auto', 'format,compress');
        params.set('quality', '80');
    }

    if (config.minifyAssets && (type === 'script' || type === 'style')) {
        params.set('minify', 'true');
    }

    const queryString = params.toString();
    const cdnUrl = `${config.baseUrl}${path}${queryString ? '?' + queryString : ''}`;

    // تخزين في الذاكرة المؤقتة
    assetCache.set(originalUrl, {
        originalUrl,
        cdnUrl,
        type,
        size: 0,
        cached: true,
        cacheExpiry: Date.now() + 24 * 60 * 60 * 1000
    });

    return cdnUrl;
}

/**
 * تحميل مسبق للموارد
 */
export function prefetchResources(urls: string[]): void {
    const config = loadConfig();

    if (!config.prefetchResources) return;

    urls.forEach(url => {
        const cdnUrl = getCDNUrl(url);
        const type = getAssetType(url);

        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = cdnUrl;

        if (type === 'style') {
            link.as = 'style';
        } else if (type === 'script') {
            link.as = 'script';
        } else if (type === 'image') {
            link.as = 'image';
        } else if (type === 'font') {
            link.as = 'font';
            link.crossOrigin = 'anonymous';
        }

        document.head.appendChild(link);
    });
}

/**
 * تحميل مسبق للصفحة التالية
 */
export function prefetchPage(url: string): void {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = url;
    document.head.appendChild(link);
}

/**
 * DNS Prefetch
 */
export function dnsPrefetch(domains: string[]): void {
    domains.forEach(domain => {
        const link = document.createElement('link');
        link.rel = 'dns-prefetch';
        link.href = domain.startsWith('//') ? domain : `//${domain}`;
        document.head.appendChild(link);
    });
}

/**
 * Preconnect
 */
export function preconnect(urls: string[]): void {
    urls.forEach(url => {
        const link = document.createElement('link');
        link.rel = 'preconnect';
        link.href = url;
        link.crossOrigin = 'anonymous';
        document.head.appendChild(link);
    });
}

/**
 * تحميل Script من CDN
 */
export function loadScript(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const cdnUrl = getCDNUrl(url);
        const script = document.createElement('script');
        script.src = cdnUrl;
        script.async = true;

        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`فشل في تحميل: ${url}`));

        document.head.appendChild(script);
    });
}

/**
 * تحميل Style من CDN
 */
export function loadStyle(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const cdnUrl = getCDNUrl(url);
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = cdnUrl;

        link.onload = () => resolve();
        link.onerror = () => reject(new Error(`فشل في تحميل: ${url}`));

        document.head.appendChild(link);
    });
}

/**
 * تحميل Image من CDN مع تحسين
 */
export function loadOptimizedImage(
    url: string,
    options: {
        width?: number;
        height?: number;
        quality?: number;
        format?: 'auto' | 'webp' | 'avif' | 'jpeg' | 'png';
    } = {}
): string {
    const config = loadConfig();

    if (!config.enabled || !config.baseUrl) {
        return url;
    }

    const params = new URLSearchParams();

    if (options.width) params.set('w', options.width.toString());
    if (options.height) params.set('h', options.height.toString());
    if (options.quality) params.set('q', options.quality.toString());
    if (options.format) params.set('fm', options.format);

    const baseUrl = getCDNUrl(url);
    const separator = baseUrl.includes('?') ? '&' : '?';

    return `${baseUrl}${separator}${params.toString()}`;
}

/**
 * إنشاء srcset للصور المتجاوبة
 */
export function createResponsiveImageSrcset(
    url: string,
    widths: number[] = [320, 640, 768, 1024, 1280, 1920]
): string {
    return widths
        .map(w => `${loadOptimizedImage(url, { width: w })} ${w}w`)
        .join(', ');
}

/**
 * تنظيف ذاكرة التخزين المؤقت
 */
export function clearCache(): void {
    assetCache.clear();
    localStorage.removeItem(CACHE_KEY);
}

/**
 * الحصول على معلومات التخزين المؤقت
 */
export function getCacheInfo(): {
    entries: number;
    types: Record<AssetType, number>;
} {
    const types: Record<AssetType, number> = {
        image: 0,
        script: 0,
        style: 0,
        font: 0,
        document: 0,
        other: 0
    };

    assetCache.forEach(asset => {
        types[asset.type]++;
    });

    return {
        entries: assetCache.size,
        types
    };
}

/**
 * Service Worker Registration for Caching
 */
export async function registerCacheServiceWorker(): Promise<void> {
    if (!('serviceWorker' in navigator)) {
        console.warn('Service Worker غير مدعوم');
        return;
    }

    try {
        const registration = await navigator.serviceWorker.register('/sw-cache.js');
        console.log('Service Worker مسجل:', registration.scope);
    } catch (error) {
        console.error('فشل في تسجيل Service Worker:', error);
    }
}

/**
 * إنشاء Cache-Control Header
 */
export function generateCacheControl(
    type: AssetType,
    options: {
        immutable?: boolean;
        maxAge?: number;
        staleWhileRevalidate?: number;
    } = {}
): string {
    const directives: string[] = ['public'];

    // حسب نوع المورد
    let maxAge = options.maxAge;

    if (!maxAge) {
        switch (type) {
            case 'image':
            case 'font':
                maxAge = 31536000; // سنة
                break;
            case 'script':
            case 'style':
                maxAge = 604800; // أسبوع
                break;
            default:
                maxAge = 86400; // يوم
        }
    }

    directives.push(`max-age=${maxAge}`);

    if (options.immutable) {
        directives.push('immutable');
    }

    if (options.staleWhileRevalidate) {
        directives.push(`stale-while-revalidate=${options.staleWhileRevalidate}`);
    }

    return directives.join(', ');
}

/**
 * تحليل أداء CDN
 */
export function analyzeCDNPerformance(): {
    totalAssets: number;
    cachedAssets: number;
    hitRate: number;
    byType: Record<AssetType, number>;
} {
    const byType: Record<AssetType, number> = {
        image: 0,
        script: 0,
        style: 0,
        font: 0,
        document: 0,
        other: 0
    };

    let cached = 0;

    assetCache.forEach(asset => {
        byType[asset.type]++;
        if (asset.cached) cached++;
    });

    return {
        totalAssets: assetCache.size,
        cachedAssets: cached,
        hitRate: assetCache.size > 0 ? cached / assetCache.size : 0,
        byType
    };
}

/**
 * مساعد لتحويل الموارد الثابتة
 */
export function transformStaticAssets(): void {
    const config = loadConfig();

    if (!config.enabled) return;

    // تحويل الصور
    document.querySelectorAll('img[data-cdn]').forEach(img => {
        const src = img.getAttribute('src');
        if (src) {
            (img as HTMLImageElement).src = getCDNUrl(src);
        }
    });

    // تحويل CSS backgrounds
    document.querySelectorAll('[data-cdn-bg]').forEach(el => {
        const bg = (el as HTMLElement).style.backgroundImage;
        const match = bg.match(/url\(['"]?(.+?)['"]?\)/);
        if (match) {
            (el as HTMLElement).style.backgroundImage = `url('${getCDNUrl(match[1])}')`;
        }
    });
}

/**
 * تهيئة CDN
 */
export function initializeCDN(): void {
    const config = loadConfig();

    if (!config.enabled || !config.baseUrl) return;

    // DNS Prefetch for CDN
    dnsPrefetch([new URL(config.baseUrl).hostname]);

    // Preconnect
    preconnect([config.baseUrl]);

    // تحويل الموارد الثابتة
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', transformStaticAssets);
    } else {
        transformStaticAssets();
    }
}

export default {
    loadConfig,
    saveConfig,
    getCDNUrl,
    prefetchResources,
    prefetchPage,
    dnsPrefetch,
    preconnect,
    loadScript,
    loadStyle,
    loadOptimizedImage,
    createResponsiveImageSrcset,
    clearCache,
    getCacheInfo,
    registerCacheServiceWorker,
    generateCacheControl,
    analyzeCDNPerformance,
    transformStaticAssets,
    initializeCDN
};
