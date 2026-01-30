/**
 * نظام ضغط الصور تلقائياً
 * ضغط الصور قبل الرفع مع الحفاظ على الجودة
 */

export interface CompressionOptions {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    mimeType?: 'image/jpeg' | 'image/png' | 'image/webp';
    maxSizeKB?: number;
}

export interface CompressionResult {
    file: File;
    originalSize: number;
    compressedSize: number;
    compressionRatio: number;
    width: number;
    height: number;
}

const DEFAULT_OPTIONS: CompressionOptions = {
    maxWidth: 1920,
    maxHeight: 1080,
    quality: 0.8,
    mimeType: 'image/jpeg',
    maxSizeKB: 500
};

/**
 * ضغط صورة واحدة
 */
export const compressImage = async (
    file: File,
    options: CompressionOptions = {}
): Promise<CompressionResult> => {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const originalSize = file.size;

    // التحقق من نوع الملف
    if (!file.type.startsWith('image/')) {
        throw new Error('الملف ليس صورة');
    }

    // إذا كانت الصورة صغيرة بالفعل، لا حاجة للضغط
    if (originalSize <= (opts.maxSizeKB! * 1024)) {
        return {
            file,
            originalSize,
            compressedSize: originalSize,
            compressionRatio: 1,
            width: 0,
            height: 0
        };
    }

    return new Promise((resolve, reject) => {
        const img = new Image();
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        img.onload = () => {
            try {
                // حساب الأبعاد الجديدة
                let { width, height } = img;

                if (width > opts.maxWidth!) {
                    height = (height * opts.maxWidth!) / width;
                    width = opts.maxWidth!;
                }

                if (height > opts.maxHeight!) {
                    width = (width * opts.maxHeight!) / height;
                    height = opts.maxHeight!;
                }

                canvas.width = width;
                canvas.height = height;

                // رسم الصورة على الـ canvas
                ctx!.fillStyle = '#FFFFFF';
                ctx!.fillRect(0, 0, width, height);
                ctx!.drawImage(img, 0, 0, width, height);

                // ضغط متدرج للوصول للحجم المطلوب
                let quality = opts.quality!;
                let compressedBlob: Blob | null = null;

                const tryCompress = () => {
                    canvas.toBlob(
                        (blob) => {
                            if (!blob) {
                                reject(new Error('فشل في ضغط الصورة'));
                                return;
                            }

                            // إذا كان الحجم مقبولاً أو الجودة منخفضة جداً
                            if (blob.size <= (opts.maxSizeKB! * 1024) || quality <= 0.1) {
                                const compressedFile = new File(
                                    [blob],
                                    file.name.replace(/\.[^.]+$/, '.jpg'),
                                    { type: opts.mimeType }
                                );

                                resolve({
                                    file: compressedFile,
                                    originalSize,
                                    compressedSize: blob.size,
                                    compressionRatio: originalSize / blob.size,
                                    width,
                                    height
                                });
                            } else {
                                // تقليل الجودة والمحاولة مرة أخرى
                                quality -= 0.1;
                                tryCompress();
                            }
                        },
                        opts.mimeType,
                        quality
                    );
                };

                tryCompress();
            } catch (error) {
                reject(error);
            }
        };

        img.onerror = () => reject(new Error('فشل في تحميل الصورة'));
        img.src = URL.createObjectURL(file);
    });
};

/**
 * ضغط مجموعة من الصور
 */
export const compressImages = async (
    files: File[],
    options: CompressionOptions = {},
    onProgress?: (progress: number, current: number, total: number) => void
): Promise<CompressionResult[]> => {
    const results: CompressionResult[] = [];
    const total = files.length;

    for (let i = 0; i < files.length; i++) {
        const file = files[i];

        if (file.type.startsWith('image/')) {
            const result = await compressImage(file, options);
            results.push(result);
        } else {
            // إرجاع الملف كما هو إذا لم يكن صورة
            results.push({
                file,
                originalSize: file.size,
                compressedSize: file.size,
                compressionRatio: 1,
                width: 0,
                height: 0
            });
        }

        onProgress?.(((i + 1) / total) * 100, i + 1, total);
    }

    return results;
};

/**
 * تحويل الصورة إلى WebP
 */
export const convertToWebP = async (
    file: File,
    quality: number = 0.8
): Promise<File> => {
    const result = await compressImage(file, {
        mimeType: 'image/webp',
        quality
    });
    return result.file;
};

/**
 * تغيير حجم الصورة
 */
export const resizeImage = async (
    file: File,
    maxWidth: number,
    maxHeight: number
): Promise<File> => {
    const result = await compressImage(file, {
        maxWidth,
        maxHeight,
        quality: 0.95
    });
    return result.file;
};

/**
 * إنشاء صورة مصغرة
 */
export const createThumbnail = async (
    file: File,
    size: number = 150
): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        img.onload = () => {
            const { width, height } = img;
            const aspectRatio = width / height;

            let newWidth = size;
            let newHeight = size;

            if (aspectRatio > 1) {
                newHeight = size / aspectRatio;
            } else {
                newWidth = size * aspectRatio;
            }

            canvas.width = size;
            canvas.height = size;

            // خلفية رمادية
            ctx!.fillStyle = '#f0f0f0';
            ctx!.fillRect(0, 0, size, size);

            // رسم الصورة في المنتصف
            const x = (size - newWidth) / 2;
            const y = (size - newHeight) / 2;
            ctx!.drawImage(img, x, y, newWidth, newHeight);

            resolve(canvas.toDataURL('image/jpeg', 0.8));
        };

        img.onerror = () => reject(new Error('فشل في تحميل الصورة'));
        img.src = URL.createObjectURL(file);
    });
};

/**
 * فورمات حجم الملف
 */
export const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 بايت';

    const k = 1024;
    const sizes = ['بايت', 'كيلوبايت', 'ميجابايت', 'جيجابايت'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

// ==================== React Components ====================
import React, { useState, useRef, useCallback } from 'react';

interface ImageCompressorProps {
    onCompress: (files: File[]) => void;
    maxFiles?: number;
    options?: CompressionOptions;
}

export const ImageCompressor: React.FC<ImageCompressorProps> = ({
    onCompress,
    maxFiles = 10,
    options = {}
}) => {
    const [files, setFiles] = useState<File[]>([]);
    const [results, setResults] = useState<CompressionResult[]>([]);
    const [isCompressing, setIsCompressing] = useState(false);
    const [progress, setProgress] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = Array.from(e.target.files || []).slice(0, maxFiles);
        setFiles(selectedFiles);
        setIsCompressing(true);
        setProgress(0);

        try {
            const compressed = await compressImages(
                selectedFiles,
                options,
                (prog, current, total) => setProgress(prog)
            );

            setResults(compressed);
            onCompress(compressed.map(r => r.file));
        } catch (error) {
            console.error('Error compressing images:', error);
        } finally {
            setIsCompressing(false);
        }
    }, [maxFiles, options, onCompress]);

    const totalOriginal = results.reduce((sum, r) => sum + r.originalSize, 0);
    const totalCompressed = results.reduce((sum, r) => sum + r.compressedSize, 0);
    const totalSaved = totalOriginal - totalCompressed;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            {/* منطقة الإفلات */}
            <div
                onClick={() => inputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
            >
                <input
                    ref={inputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                />
                <div className="text-4xl mb-3">📷</div>
                <p className="text-gray-600 dark:text-gray-400">
                    اسحب الصور هنا أو اضغط للاختيار
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                    الحد الأقصى: {maxFiles} صور
                </p>
            </div>

            {/* شريط التقدم */}
            {isCompressing && (
                <div className="mt-4">
                    <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                        <span>جاري الضغط...</span>
                        <span>{Math.round(progress)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            )}

            {/* نتائج الضغط */}
            {results.length > 0 && !isCompressing && (
                <div className="mt-4">
                    <div className="bg-green-50 dark:bg-green-900/30 rounded-lg p-4 mb-4">
                        <div className="flex items-center justify-between">
                            <span className="text-green-700 dark:text-green-300 font-medium">
                                تم توفير {formatFileSize(totalSaved)}
                            </span>
                            <span className="text-green-600 dark:text-green-400 text-sm">
                                {totalOriginal > 0 ? Math.round((totalSaved / totalOriginal) * 100) : 0}% تقليل
                            </span>
                        </div>
                    </div>

                    <div className="space-y-2 max-h-60 overflow-y-auto">
                        {results.map((result, index) => (
                            <div
                                key={index}
                                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm"
                            >
                                <span className="text-gray-700 dark:text-gray-300 truncate max-w-[200px]">
                                    {result.file.name}
                                </span>
                                <div className="flex items-center gap-4">
                                    <span className="text-gray-500 dark:text-gray-400">
                                        {formatFileSize(result.originalSize)} → {formatFileSize(result.compressedSize)}
                                    </span>
                                    {result.compressionRatio > 1 && (
                                        <span className="text-green-600 dark:text-green-400">
                                            -{Math.round((1 - 1 / result.compressionRatio) * 100)}%
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// Hook للضغط التلقائي
export const useImageCompression = (options: CompressionOptions = {}) => {
    const [isCompressing, setIsCompressing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const compress = useCallback(async (files: File[]): Promise<File[]> => {
        setIsCompressing(true);
        setError(null);

        try {
            const results = await compressImages(files, options);
            return results.map(r => r.file);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'خطأ في الضغط');
            return files;
        } finally {
            setIsCompressing(false);
        }
    }, [options]);

    return { compress, isCompressing, error };
};
