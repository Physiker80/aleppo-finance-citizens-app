/**
 * نظام QR Code لحجز المواعيد
 * QR Code System for Appointment Booking
 */

import { Appointment, SERVICE_LABELS, STATUS_LABELS, PRIORITY_LABELS } from '../types/appointment';

// ==================== توليد QR Code ====================

/**
 * توليد بيانات QR Code للموعد
 */
export const generateAppointmentQRData = (appointment: Appointment): string => {
    const data = {
        id: appointment.id,
        c: appointment.citizenId.slice(-4), // آخر 4 أرقام للخصوصية
        d: appointment.date,
        t: appointment.timeSlot.startTime,
        s: appointment.serviceCategory,
        v: appointment.isVerified ? 1 : 0
    };

    return JSON.stringify(data);
};

/**
 * توليد QR Code كـ Data URL
 * باستخدام مكتبة qr-code-styling أو بديل بسيط
 */
export const generateQRCodeDataURL = async (
    data: string,
    options: {
        size?: number;
        darkColor?: string;
        lightColor?: string;
        logo?: string;
    } = {}
): Promise<string> => {
    const {
        size = 200,
        darkColor = '#0f3c35',
        lightColor = '#ffffff'
    } = options;

    // استخدام Canvas API لرسم QR Code بسيط
    // في الإنتاج يفضل استخدام مكتبة متخصصة مثل qrcode أو qr-code-styling

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    // خلفية
    ctx.fillStyle = lightColor;
    ctx.fillRect(0, 0, size, size);

    // توليد نمط QR
    const qrMatrix = generateQRMatrix(data);
    const moduleSize = size / qrMatrix.length;

    ctx.fillStyle = darkColor;
    qrMatrix.forEach((row, y) => {
        row.forEach((cell, x) => {
            if (cell) {
                ctx.fillRect(
                    x * moduleSize,
                    y * moduleSize,
                    moduleSize,
                    moduleSize
                );
            }
        });
    });

    return canvas.toDataURL('image/png');
};

/**
 * توليد مصفوفة QR بسيطة
 * هذه نسخة مبسطة - في الإنتاج استخدم مكتبة QR
 */
const generateQRMatrix = (data: string): boolean[][] => {
    // حجم المصفوفة بناءً على طول البيانات
    const size = Math.max(21, Math.ceil(Math.sqrt(data.length * 8)) + 8);
    const matrix: boolean[][] = Array(size).fill(null).map(() => Array(size).fill(false));

    // نمط التموضع (Position Patterns)
    const addPositionPattern = (x: number, y: number) => {
        for (let i = 0; i < 7; i++) {
            for (let j = 0; j < 7; j++) {
                const isOuterBorder = i === 0 || i === 6 || j === 0 || j === 6;
                const isInnerSquare = i >= 2 && i <= 4 && j >= 2 && j <= 4;
                matrix[y + i][x + j] = isOuterBorder || isInnerSquare;
            }
        }
    };

    addPositionPattern(0, 0);
    addPositionPattern(size - 7, 0);
    addPositionPattern(0, size - 7);

    // تشفير البيانات
    let bitIndex = 0;
    const dataBits = data.split('').map(c => c.charCodeAt(0).toString(2).padStart(8, '0')).join('');

    for (let y = 8; y < size - 8; y++) {
        for (let x = 8; x < size - 8; x++) {
            if (bitIndex < dataBits.length) {
                matrix[y][x] = dataBits[bitIndex] === '1';
                bitIndex++;
            } else {
                // نمط عشوائي للباقي
                matrix[y][x] = ((x + y) % 3 === 0);
            }
        }
    }

    return matrix;
};

// ==================== قراءة QR Code ====================

/**
 * قراءة QR Code من صورة
 */
export const readQRCodeFromImage = async (
    imageSource: string | File | Blob
): Promise<{ success: boolean; data?: string; error?: string }> => {
    try {
        // تحويل المصدر إلى canvas
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        const img = new Image();

        const imageUrl = imageSource instanceof File || imageSource instanceof Blob
            ? URL.createObjectURL(imageSource)
            : imageSource;

        await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = reject;
            img.src = imageUrl;
        });

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // محاولة قراءة QR باستخدام jsQR إذا كان متوفراً
        if (typeof (window as any).jsQR !== 'undefined') {
            const code = (window as any).jsQR(imageData.data, imageData.width, imageData.height);
            if (code) {
                return { success: true, data: code.data };
            }
        }

        // بديل: محاولة استخدام BarcodeDetector API
        if ('BarcodeDetector' in window) {
            const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
            const barcodes = await detector.detect(img);
            if (barcodes.length > 0) {
                return { success: true, data: barcodes[0].rawValue };
            }
        }

        return { success: false, error: 'لم يتم العثور على رمز QR' };
    } catch (error) {
        return { success: false, error: 'فشل في قراءة الرمز' };
    }
};

/**
 * قراءة QR Code من الكاميرا
 */
export const startQRScanner = (
    videoElement: HTMLVideoElement,
    onScan: (data: string) => void,
    onError?: (error: string) => void
): { stop: () => void } => {
    let animationId: number;
    let stream: MediaStream | null = null;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    const scan = () => {
        if (videoElement.readyState === videoElement.HAVE_ENOUGH_DATA) {
            canvas.width = videoElement.videoWidth;
            canvas.height = videoElement.videoHeight;
            ctx.drawImage(videoElement, 0, 0);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

            // محاولة القراءة
            if (typeof (window as any).jsQR !== 'undefined') {
                const code = (window as any).jsQR(imageData.data, imageData.width, imageData.height);
                if (code) {
                    onScan(code.data);
                    return; // إيقاف المسح بعد النجاح
                }
            }
        }

        animationId = requestAnimationFrame(scan);
    };

    // بدء الكاميرا
    navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
    }).then(mediaStream => {
        stream = mediaStream;
        videoElement.srcObject = stream;
        videoElement.play();
        scan();
    }).catch(error => {
        onError?.(error.message);
    });

    return {
        stop: () => {
            cancelAnimationFrame(animationId);
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        }
    };
};

// ==================== مكونات React ====================

import React, { useState, useEffect, useRef, useContext } from 'react';
import { AppContext } from '../App';

interface QRCodeDisplayProps {
    data: string;
    size?: number;
    title?: string;
    showDownload?: boolean;
}

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
    data,
    size = 200,
    title,
    showDownload = true
}) => {
    const [qrDataUrl, setQrDataUrl] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const generate = async () => {
            setIsLoading(true);
            try {
                const url = await generateQRCodeDataURL(data, { size });
                setQrDataUrl(url);
            } catch (error) {
                console.error('Error generating QR code:', error);
            } finally {
                setIsLoading(false);
            }
        };

        generate();
    }, [data, size]);

    const handleDownload = () => {
        const link = document.createElement('a');
        link.download = `qr-code-${Date.now()}.png`;
        link.href = qrDataUrl;
        link.click();
    };

    if (isLoading) {
        return (
            <div
                className="flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-xl"
                style={{ width: size, height: size }}
            >
                <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
            </div>
        );
    }

    return (
        <div className="inline-flex flex-col items-center gap-3">
            {title && (
                <h3 className="font-bold text-gray-800 dark:text-white">{title}</h3>
            )}

            <div className="p-4 bg-white rounded-xl shadow-lg">
                <img
                    src={qrDataUrl}
                    alt="QR Code"
                    width={size}
                    height={size}
                    className="block"
                />
            </div>

            {showDownload && (
                <button
                    onClick={handleDownload}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 
                             text-white rounded-lg transition-colors text-sm"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    تحميل الرمز
                </button>
            )}
        </div>
    );
};

interface QRScannerProps {
    onScan: (data: string) => void;
    onClose?: () => void;
}

export const QRScanner: React.FC<QRScannerProps> = ({ onScan, onClose }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [error, setError] = useState<string>('');
    const [isScanning, setIsScanning] = useState(true);
    const scannerRef = useRef<{ stop: () => void } | null>(null);

    useEffect(() => {
        if (videoRef.current && isScanning) {
            scannerRef.current = startQRScanner(
                videoRef.current,
                (data) => {
                    setIsScanning(false);
                    onScan(data);
                },
                setError
            );
        }

        return () => {
            scannerRef.current?.stop();
        };
    }, [isScanning, onScan]);

    return (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden max-w-md w-full">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <h3 className="font-bold text-gray-800 dark:text-white">مسح رمز QR</h3>
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                        >
                            ✕
                        </button>
                    )}
                </div>

                <div className="relative aspect-square bg-black">
                    <video
                        ref={videoRef}
                        className="w-full h-full object-cover"
                        playsInline
                        muted
                    />

                    {/* إطار المسح */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-48 h-48 border-4 border-white/50 rounded-2xl relative">
                            <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-blue-500 rounded-tl-lg" />
                            <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-blue-500 rounded-tr-lg" />
                            <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-blue-500 rounded-bl-lg" />
                            <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-blue-500 rounded-br-lg" />
                        </div>
                    </div>

                    {/* خط المسح المتحرك */}
                    {isScanning && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-48 h-48 relative overflow-hidden">
                                <div className="absolute left-0 right-0 h-0.5 bg-blue-500 animate-scan" />
                            </div>
                        </div>
                    )}
                </div>

                {error && (
                    <div className="p-4 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 text-center">
                        {error}
                    </div>
                )}

                <div className="p-4 text-center text-gray-600 dark:text-gray-400">
                    وجّه الكاميرا نحو رمز QR الموجود على تذكرة الموعد
                </div>
            </div>

            <style>{`
                @keyframes scan {
                    0%, 100% { top: 0; }
                    50% { top: calc(100% - 2px); }
                }
                .animate-scan {
                    animation: scan 2s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
};

interface AppointmentTicketProps {
    appointment: Appointment;
    showQR?: boolean;
}

export const AppointmentTicket: React.FC<AppointmentTicketProps> = ({
    appointment,
    showQR = true
}) => {
    const context = useContext(AppContext);
    const config = context?.siteConfig;

    const qrData = generateAppointmentQRData(appointment);

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('ar-SY', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const formatDateParts = (dateStr: string) => {
        const date = new Date(dateStr);
        return {
            dayName: date.toLocaleDateString('ar-SY', { weekday: 'long' }),
            dayNum: date.getDate(),
            monthName: date.toLocaleDateString('ar-SY', { month: 'long' }),
            year: date.getFullYear()
        };
    };

    const dateParts = formatDateParts(appointment.date);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden max-w-md mx-auto border border-gray-200 dark:border-gray-700">
            {/* Header with Logo */}
            <div className="bg-gradient-to-br from-[#0f3c35] via-[#145c4a] to-[#1a6b55] text-white p-6 relative overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-0 left-0 w-32 h-32 bg-white/20 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
                    <div className="absolute bottom-0 right-0 w-24 h-24 bg-white/20 rounded-full translate-x-1/2 translate-y-1/2"></div>
                </div>

                <div className="relative z-10 text-center">
                    {/* شعار الجمهورية العربية السورية */}
                    <div className="flex justify-center mb-4">
                        <img
                            src="https://syrian.zone/syid/materials/logo.ai.svg"
                            alt="شعار الجمهورية العربية السورية"
                            className="w-20 h-20 drop-shadow-lg"
                        />
                    </div>
                    <h2 className="text-xl font-bold mb-1">الجمهورية العربية السورية</h2>
                    <p className="text-sm opacity-90 mb-1">{config?.directorateName ? `مديرية ${config.directorateName}` : 'المديرية المالية'}</p>
                    <div className="inline-block bg-white/20 backdrop-blur-sm px-4 py-1.5 rounded-full mt-2">
                        <p className="text-sm font-semibold">🎫 تذكرة حجز موعد</p>
                    </div>
                </div>
            </div>

            {/* Ticket Number - Enhanced */}
            <div className="relative bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 p-5 text-center">
                {/* Decorative Dots */}
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-8 bg-white dark:bg-gray-800 rounded-r-full"></div>
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-8 bg-white dark:bg-gray-800 rounded-l-full"></div>

                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">رقم الموعد</p>
                <p className="text-3xl font-black text-[#0f3c35] dark:text-emerald-400 font-mono tracking-wider">
                    {appointment.id}
                </p>
            </div>

            {/* Date Display - Enhanced Calendar Style */}
            <div className="p-6 border-b border-dashed border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-4">
                    {/* Calendar Icon */}
                    <div className="flex-shrink-0 w-20 h-24 bg-gradient-to-br from-[#0f3c35] to-[#1a5c4f] rounded-2xl flex flex-col items-center justify-center text-white shadow-lg">
                        <span className="text-xs opacity-80">{dateParts.dayName}</span>
                        <span className="text-3xl font-black">{dateParts.dayNum}</span>
                        <span className="text-xs opacity-80">{dateParts.monthName}</span>
                    </div>

                    {/* Time & Year */}
                    <div className="flex-1">
                        <div className="mb-3 text-center">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">الوقت</p>
                            <p className="text-2xl font-bold text-gray-800 dark:text-white" dir="ltr">
                                {appointment.timeSlot.startTime}
                            </p>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                            السنة: <span className="font-semibold text-gray-700 dark:text-gray-300">{dateParts.year}</span>
                        </p>
                    </div>
                </div>
            </div>

            {/* Details - Enhanced */}
            <div className="p-6 space-y-4">
                {/* Service Type */}
                <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                        <span className="text-xl">📋</span>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">نوع المعاملة</p>
                        <p className="font-bold text-gray-800 dark:text-white">
                            {SERVICE_LABELS[appointment.serviceCategory]}
                        </p>
                    </div>
                </div>

                {/* Name */}
                <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                        <span className="text-xl">👤</span>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">صاحب الموعد</p>
                        <p className="font-bold text-gray-800 dark:text-white">
                            {appointment.fullName}
                        </p>
                    </div>
                </div>

                {/* Counter Assignment */}
                {appointment.assignedCounter && (
                    <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-xl border border-blue-200 dark:border-blue-700">
                        <div className="flex items-center justify-center gap-3">
                            <span className="text-2xl">🏢</span>
                            <div className="text-center">
                                <p className="text-xs text-blue-600 dark:text-blue-300">توجه إلى</p>
                                <p className="text-xl font-black text-blue-700 dark:text-blue-300">
                                    النافذة {appointment.assignedCounter}
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* QR Code - Enhanced */}
            {showQR && (
                <div className="p-6 bg-gray-50 dark:bg-gray-700/50 border-t border-dashed border-gray-300 dark:border-gray-600">
                    <p className="text-center text-xs text-gray-500 dark:text-gray-400 mb-3">
                        امسح رمز QR للتحقق
                    </p>
                    <div className="flex justify-center">
                        <div className="bg-white dark:bg-gray-800 p-3 rounded-2xl shadow-inner">
                            <QRCodeDisplay
                                data={qrData}
                                size={150}
                                showDownload={false}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Footer - Enhanced */}
            <div className="bg-gradient-to-r from-[#0f3c35] to-[#1a5c4f] p-4 text-center text-white">
                <div className="flex items-center justify-center gap-2 mb-2">
                    <span className="text-lg">⏰</span>
                    <p className="text-sm font-semibold">يرجى الحضور قبل 15 دقيقة من موعدك</p>
                </div>
                <p className="text-xs opacity-80">قم بمسح رمز QR عند مدخل المديرية</p>
            </div>
        </div>
    );
};
