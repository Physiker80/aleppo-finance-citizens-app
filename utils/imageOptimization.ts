// =====================================================
// 🖼️ Image Optimization
// تحسين الصور
// =====================================================

export interface ImageOptimizationConfig {
    maxWidth: number;
    maxHeight: number;
    quality: number;
    format: 'webp' | 'jpeg' | 'png';
    enableLazyLoading: boolean;
    enableProgressive: boolean;
    thumbnailSize: number;
}

export interface OptimizedImage {
    original: {
        url: string;
        width: number;
        height: number;
        size: number;
        type: string;
    };
    optimized: {
        url: string;
        width: number;
        height: number;
        size: number;
        type: string;
        quality: number;
    };
    thumbnail?: {
        url: string;
        width: number;
        height: number;
    };
    savings: {
        bytes: number;
        percentage: number;
    };
}

export interface ImageDimensions {
    width: number;
    height: number;
}

const CONFIG_KEY = 'image-optimization-config';

const DEFAULT_CONFIG: ImageOptimizationConfig = {
    maxWidth: 1920,
    maxHeight: 1080,
    quality: 0.8,
    format: 'webp',
    enableLazyLoading: true,
    enableProgressive: true,
    thumbnailSize: 150
};

/**
 * تحميل الإعدادات
 */
export function loadConfig(): ImageOptimizationConfig {
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
export function saveConfig(config: Partial<ImageOptimizationConfig>): void {
    const current = loadConfig();
    localStorage.setItem(CONFIG_KEY, JSON.stringify({ ...current, ...config }));
}

/**
 * قراءة أبعاد الصورة
 */
export function getImageDimensions(file: File): Promise<ImageDimensions> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve({ width: img.width, height: img.height });
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('فشل في قراءة الصورة'));
        };

        img.src = url;
    });
}

/**
 * حساب الأبعاد الجديدة مع الحفاظ على النسبة
 */
function calculateNewDimensions(
    width: number,
    height: number,
    maxWidth: number,
    maxHeight: number
): ImageDimensions {
    let newWidth = width;
    let newHeight = height;

    if (width > maxWidth) {
        newWidth = maxWidth;
        newHeight = Math.round(height * (maxWidth / width));
    }

    if (newHeight > maxHeight) {
        newHeight = maxHeight;
        newWidth = Math.round(newWidth * (maxHeight / newHeight));
    }

    return { width: newWidth, height: newHeight };
}

/**
 * ضغط الصورة
 */
export async function compressImage(
    file: File,
    options?: Partial<ImageOptimizationConfig>
): Promise<OptimizedImage> {
    const config = { ...loadConfig(), ...options };

    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = async () => {
            URL.revokeObjectURL(url);

            try {
                const { width: newWidth, height: newHeight } = calculateNewDimensions(
                    img.width,
                    img.height,
                    config.maxWidth,
                    config.maxHeight
                );

                // إنشاء canvas للصورة الرئيسية
                const canvas = document.createElement('canvas');
                canvas.width = newWidth;
                canvas.height = newHeight;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    throw new Error('فشل في إنشاء السياق');
                }

                // رسم الصورة
                ctx.drawImage(img, 0, 0, newWidth, newHeight);

                // تحويل إلى التنسيق المطلوب
                const mimeType = getMimeType(config.format);
                const optimizedBlob = await new Promise<Blob>((res, rej) => {
                    canvas.toBlob(
                        blob => blob ? res(blob) : rej(new Error('فشل في التحويل')),
                        mimeType,
                        config.quality
                    );
                });

                const optimizedUrl = URL.createObjectURL(optimizedBlob);

                // إنشاء الصورة المصغرة
                let thumbnail: OptimizedImage['thumbnail'] | undefined;

                if (config.thumbnailSize > 0) {
                    const thumbDimensions = calculateNewDimensions(
                        img.width,
                        img.height,
                        config.thumbnailSize,
                        config.thumbnailSize
                    );

                    const thumbCanvas = document.createElement('canvas');
                    thumbCanvas.width = thumbDimensions.width;
                    thumbCanvas.height = thumbDimensions.height;

                    const thumbCtx = thumbCanvas.getContext('2d');
                    if (thumbCtx) {
                        thumbCtx.drawImage(img, 0, 0, thumbDimensions.width, thumbDimensions.height);

                        const thumbBlob = await new Promise<Blob>((res, rej) => {
                            thumbCanvas.toBlob(
                                blob => blob ? res(blob) : rej(new Error('فشل في إنشاء المصغرة')),
                                mimeType,
                                0.6
                            );
                        });

                        thumbnail = {
                            url: URL.createObjectURL(thumbBlob),
                            width: thumbDimensions.width,
                            height: thumbDimensions.height
                        };
                    }
                }

                const savings = file.size - optimizedBlob.size;

                resolve({
                    original: {
                        url,
                        width: img.width,
                        height: img.height,
                        size: file.size,
                        type: file.type
                    },
                    optimized: {
                        url: optimizedUrl,
                        width: newWidth,
                        height: newHeight,
                        size: optimizedBlob.size,
                        type: mimeType,
                        quality: config.quality
                    },
                    thumbnail,
                    savings: {
                        bytes: savings,
                        percentage: Math.round((savings / file.size) * 100)
                    }
                });
            } catch (error) {
                reject(error);
            }
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('فشل في تحميل الصورة'));
        };

        img.src = url;
    });
}

/**
 * الحصول على MIME Type
 */
function getMimeType(format: string): string {
    const types: Record<string, string> = {
        webp: 'image/webp',
        jpeg: 'image/jpeg',
        jpg: 'image/jpeg',
        png: 'image/png'
    };
    return types[format] || 'image/jpeg';
}

/**
 * ضغط صور متعددة
 */
export async function compressImages(
    files: File[],
    options?: Partial<ImageOptimizationConfig>,
    onProgress?: (current: number, total: number) => void
): Promise<OptimizedImage[]> {
    const results: OptimizedImage[] = [];

    for (let i = 0; i < files.length; i++) {
        onProgress?.(i + 1, files.length);

        try {
            const result = await compressImage(files[i], options);
            results.push(result);
        } catch (error) {
            console.error(`فشل في ضغط الصورة ${files[i].name}:`, error);
        }
    }

    return results;
}

/**
 * تحويل URL إلى Blob
 */
export async function urlToBlob(url: string): Promise<Blob> {
    const response = await fetch(url);
    return response.blob();
}

/**
 * تحويل Blob إلى Base64
 */
export function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

/**
 * تحويل Base64 إلى Blob
 */
export function base64ToBlob(base64: string): Blob {
    const parts = base64.split(';base64,');
    const contentType = parts[0].split(':')[1];
    const raw = window.atob(parts[1]);
    const rawLength = raw.length;
    const uInt8Array = new Uint8Array(rawLength);

    for (let i = 0; i < rawLength; i++) {
        uInt8Array[i] = raw.charCodeAt(i);
    }

    return new Blob([uInt8Array], { type: contentType });
}

/**
 * إنشاء Placeholder للصورة
 */
export async function createPlaceholder(
    file: File,
    width: number = 20,
    height: number = 20
): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(url);

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('فشل في إنشاء السياق'));
                return;
            }

            ctx.drawImage(img, 0, 0, width, height);

            // تطبيق تأثير الضبابية
            ctx.filter = 'blur(2px)';
            ctx.drawImage(canvas, 0, 0, width, height);

            resolve(canvas.toDataURL('image/jpeg', 0.1));
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('فشل في تحميل الصورة'));
        };

        img.src = url;
    });
}

/**
 * التحقق من نوع الصورة
 */
export function isValidImageType(file: File): boolean {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    return validTypes.includes(file.type);
}

/**
 * التحقق من حجم الصورة
 */
export function isValidImageSize(file: File, maxSizeMB: number = 10): boolean {
    return file.size <= maxSizeMB * 1024 * 1024;
}

/**
 * تحسين الصور للعرض السريع
 */
export function getOptimalImageSize(
    containerWidth: number,
    devicePixelRatio: number = window.devicePixelRatio || 1
): number {
    return Math.ceil(containerWidth * devicePixelRatio);
}

/**
 * إنشاء srcset
 */
export function generateSrcSet(
    baseUrl: string,
    widths: number[] = [320, 640, 1024, 1920]
): string {
    return widths
        .map(w => `${baseUrl}?w=${w} ${w}w`)
        .join(', ');
}

/**
 * Lazy Loading Observer
 */
export function createLazyLoader(
    options: {
        rootMargin?: string;
        threshold?: number;
        onLoad?: (element: Element) => void;
    } = {}
): {
    observe: (element: Element) => void;
    unobserve: (element: Element) => void;
    disconnect: () => void;
} {
    const { rootMargin = '50px', threshold = 0.1, onLoad } = options;

    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const element = entry.target as HTMLImageElement;
                    const src = element.dataset.src;

                    if (src) {
                        element.src = src;
                        element.removeAttribute('data-src');
                        observer.unobserve(element);
                        onLoad?.(element);
                    }
                }
            });
        },
        { rootMargin, threshold }
    );

    return {
        observe: (element) => observer.observe(element),
        unobserve: (element) => observer.unobserve(element),
        disconnect: () => observer.disconnect()
    };
}

/**
 * تحميل الصور بالتتابع
 */
export async function loadImagesSequentially(
    urls: string[],
    onProgress?: (loaded: number, total: number) => void
): Promise<HTMLImageElement[]> {
    const images: HTMLImageElement[] = [];

    for (let i = 0; i < urls.length; i++) {
        const img = await loadImage(urls[i]);
        images.push(img);
        onProgress?.(i + 1, urls.length);
    }

    return images;
}

/**
 * تحميل صورة واحدة
 */
export function loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = url;
    });
}

/**
 * حساب التوفير الإجمالي
 */
export function calculateTotalSavings(
    optimizedImages: OptimizedImage[]
): {
    originalSize: number;
    optimizedSize: number;
    savedBytes: number;
    savedPercentage: number;
} {
    const originalSize = optimizedImages.reduce((sum, img) => sum + img.original.size, 0);
    const optimizedSize = optimizedImages.reduce((sum, img) => sum + img.optimized.size, 0);
    const savedBytes = originalSize - optimizedSize;

    return {
        originalSize,
        optimizedSize,
        savedBytes,
        savedPercentage: Math.round((savedBytes / originalSize) * 100)
    };
}

/**
 * تنسيق حجم الملف
 */
export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default {
    loadConfig,
    saveConfig,
    getImageDimensions,
    compressImage,
    compressImages,
    urlToBlob,
    blobToBase64,
    base64ToBlob,
    createPlaceholder,
    isValidImageType,
    isValidImageSize,
    getOptimalImageSize,
    generateSrcSet,
    createLazyLoader,
    loadImagesSequentially,
    loadImage,
    calculateTotalSavings,
    formatFileSize
};
