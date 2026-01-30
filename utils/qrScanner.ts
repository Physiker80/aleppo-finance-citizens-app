// =====================================================
// 📷 Advanced QR Scanner
// ماسح QR المتقدم
// =====================================================

export interface ScanResult {
    text: string;
    format: 'QR_CODE' | 'CODE_128' | 'CODE_39' | 'EAN_13' | 'EAN_8' | 'UPC_A' | 'UPC_E' | 'PDF_417' | 'AZTEC' | 'DATA_MATRIX' | 'UNKNOWN';
    timestamp: number;
    rawBytes?: Uint8Array;
    points?: Array<{ x: number; y: number }>;
}

export interface ScannerConfig {
    facingMode: 'user' | 'environment';
    formats: string[];
    scanInterval: number;
    highlightCodeOutline: boolean;
    beepOnScan: boolean;
    vibrateOnScan: boolean;
    autoStopOnScan: boolean;
}

export type ScanCallback = (result: ScanResult) => void;
export type ErrorCallback = (error: Error) => void;

const DEFAULT_CONFIG: ScannerConfig = {
    facingMode: 'environment',
    formats: ['QR_CODE', 'CODE_128', 'EAN_13'],
    scanInterval: 100,
    highlightCodeOutline: true,
    beepOnScan: true,
    vibrateOnScan: true,
    autoStopOnScan: true
};

/**
 * ماسح QR متقدم
 */
export class QRScanner {
    private config: ScannerConfig;
    private video: HTMLVideoElement | null = null;
    private canvas: HTMLCanvasElement | null = null;
    private context: CanvasRenderingContext2D | null = null;
    private stream: MediaStream | null = null;
    private scanInterval: ReturnType<typeof setInterval> | null = null;
    private audioContext: AudioContext | null = null;
    private onScan: ScanCallback | null = null;
    private onError: ErrorCallback | null = null;
    private isScanning = false;
    private lastScanResult = '';
    private lastScanTime = 0;

    constructor(config: Partial<ScannerConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    /**
     * التحقق من دعم الكاميرا
     */
    static isSupported(): boolean {
        return !!(
            navigator.mediaDevices &&
            navigator.mediaDevices.getUserMedia &&
            typeof window !== 'undefined'
        );
    }

    /**
     * الحصول على الكاميرات المتاحة
     */
    static async getAvailableCameras(): Promise<MediaDeviceInfo[]> {
        if (!this.isSupported()) {
            return [];
        }

        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            return devices.filter(device => device.kind === 'videoinput');
        } catch {
            return [];
        }
    }

    /**
     * بدء المسح
     */
    async start(
        container: HTMLElement,
        onScan: ScanCallback,
        onError?: ErrorCallback
    ): Promise<void> {
        if (this.isScanning) {
            return;
        }

        this.onScan = onScan;
        this.onError = onError || (() => { });

        try {
            // إنشاء عناصر الفيديو والـ Canvas
            this.createElements(container);

            // الحصول على بث الكاميرا
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: this.config.facingMode,
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            });

            if (this.video) {
                this.video.srcObject = this.stream;
                await this.video.play();
            }

            this.isScanning = true;
            this.startScanLoop();
        } catch (error) {
            this.onError?.(error as Error);
        }
    }

    /**
     * إيقاف المسح
     */
    stop(): void {
        this.isScanning = false;

        if (this.scanInterval) {
            clearInterval(this.scanInterval);
            this.scanInterval = null;
        }

        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }

        if (this.video) {
            this.video.srcObject = null;
        }

        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
    }

    /**
     * تبديل الكاميرا
     */
    async toggleCamera(): Promise<void> {
        this.config.facingMode =
            this.config.facingMode === 'environment' ? 'user' : 'environment';

        if (this.isScanning && this.video?.parentElement) {
            const container = this.video.parentElement;
            const callback = this.onScan;
            const errorCallback = this.onError;

            this.stop();

            if (callback) {
                await this.start(container, callback, errorCallback || undefined);
            }
        }
    }

    /**
     * تفعيل/تعطيل الفلاش
     */
    async toggleFlash(): Promise<boolean> {
        if (!this.stream) return false;

        const track = this.stream.getVideoTracks()[0];
        const capabilities = track.getCapabilities?.() as MediaTrackCapabilities & { torch?: boolean };

        if (!capabilities?.torch) {
            return false;
        }

        const constraints = track.getConstraints() as MediaTrackConstraints & { advanced?: Array<{ torch?: boolean }> };
        const currentTorch = constraints.advanced?.[0]?.torch || false;

        await track.applyConstraints({
            advanced: [{ torch: !currentTorch } as MediaTrackConstraintSet]
        });

        return !currentTorch;
    }

    /**
     * مسح صورة
     */
    async scanImage(imageSource: string | File | Blob): Promise<ScanResult | null> {
        return new Promise((resolve) => {
            const img = new Image();

            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    resolve(null);
                    return;
                }

                ctx.drawImage(img, 0, 0);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

                const result = this.decodeImageData(imageData);
                resolve(result);
            };

            img.onerror = () => resolve(null);

            if (typeof imageSource === 'string') {
                img.src = imageSource;
            } else {
                img.src = URL.createObjectURL(imageSource);
            }
        });
    }

    /**
     * إنشاء عناصر DOM
     */
    private createElements(container: HTMLElement): void {
        // تنظيف العناصر السابقة
        container.innerHTML = '';

        // إنشاء wrapper
        const wrapper = document.createElement('div');
        wrapper.style.cssText = `
      position: relative;
      width: 100%;
      height: 100%;
      overflow: hidden;
      border-radius: 12px;
      background: #000;
    `;

        // إنشاء الفيديو
        this.video = document.createElement('video');
        this.video.setAttribute('playsinline', '');
        this.video.setAttribute('autoplay', '');
        this.video.style.cssText = `
      width: 100%;
      height: 100%;
      object-fit: cover;
    `;

        // إنشاء الـ Canvas للتراكب
        this.canvas = document.createElement('canvas');
        this.canvas.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
    `;

        this.context = this.canvas.getContext('2d');

        // إضافة إطار المسح
        const scanFrame = document.createElement('div');
        scanFrame.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 250px;
      height: 250px;
      border: 3px solid rgba(255,255,255,0.8);
      border-radius: 12px;
      box-shadow: 0 0 0 9999px rgba(0,0,0,0.5);
    `;

        // خطوط الزوايا
        const corners = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
        corners.forEach(corner => {
            const line = document.createElement('div');
            const [v, h] = corner.split('-');
            line.style.cssText = `
        position: absolute;
        ${v}: -3px;
        ${h}: -3px;
        width: 30px;
        height: 30px;
        border-${v}: 4px solid #00ff00;
        border-${h}: 4px solid #00ff00;
        border-radius: 4px;
      `;
            scanFrame.appendChild(line);
        });

        // خط المسح المتحرك
        const scanLine = document.createElement('div');
        scanLine.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 2px;
      background: linear-gradient(to right, transparent, #00ff00, transparent);
      animation: scanLine 2s linear infinite;
    `;
        scanFrame.appendChild(scanLine);

        // إضافة أنماط الحركة
        const style = document.createElement('style');
        style.textContent = `
      @keyframes scanLine {
        0% { top: 0; }
        50% { top: 100%; }
        100% { top: 0; }
      }
    `;
        document.head.appendChild(style);

        wrapper.appendChild(this.video);
        wrapper.appendChild(this.canvas);
        wrapper.appendChild(scanFrame);
        container.appendChild(wrapper);
    }

    /**
     * بدء حلقة المسح
     */
    private startScanLoop(): void {
        this.scanInterval = setInterval(() => {
            if (!this.isScanning || !this.video || !this.canvas || !this.context) {
                return;
            }

            // تحديث حجم الـ Canvas
            this.canvas.width = this.video.videoWidth;
            this.canvas.height = this.video.videoHeight;

            // رسم الإطار الحالي
            this.context.drawImage(this.video, 0, 0);

            // الحصول على بيانات الصورة
            const imageData = this.context.getImageData(
                0, 0, this.canvas.width, this.canvas.height
            );

            // محاولة فك الشفرة
            const result = this.decodeImageData(imageData);

            if (result) {
                // تجنب المسح المتكرر لنفس الكود
                const now = Date.now();
                if (result.text !== this.lastScanResult || now - this.lastScanTime > 3000) {
                    this.lastScanResult = result.text;
                    this.lastScanTime = now;

                    this.handleSuccessfulScan(result);
                }
            }
        }, this.config.scanInterval);
    }

    /**
     * فك شفرة بيانات الصورة
     */
    private decodeImageData(imageData: ImageData): ScanResult | null {
        // استخدام jsQR للـ QR Codes
        try {
            // محاكاة - في الإنتاج استخدم مكتبة حقيقية مثل jsQR
            // import jsQR from 'jsqr';
            // const code = jsQR(imageData.data, imageData.width, imageData.height);

            // محاكاة نتيجة (للاختبار فقط)
            return null;
        } catch {
            return null;
        }
    }

    /**
     * معالجة المسح الناجح
     */
    private handleSuccessfulScan(result: ScanResult): void {
        // الاهتزاز
        if (this.config.vibrateOnScan && navigator.vibrate) {
            navigator.vibrate(200);
        }

        // الصوت
        if (this.config.beepOnScan) {
            this.playBeep();
        }

        // تمييز الكود
        if (this.config.highlightCodeOutline && result.points) {
            this.highlightCode(result.points);
        }

        // استدعاء callback
        this.onScan?.(result);

        // إيقاف تلقائي
        if (this.config.autoStopOnScan) {
            setTimeout(() => this.stop(), 500);
        }
    }

    /**
     * تشغيل صوت البيب
     */
    private playBeep(): void {
        try {
            if (!this.audioContext) {
                this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
            }

            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            oscillator.frequency.value = 1800;
            oscillator.type = 'sine';

            gainNode.gain.setValueAtTime(0.5, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);

            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.1);
        } catch {
            // تجاهل أخطاء الصوت
        }
    }

    /**
     * تمييز الكود
     */
    private highlightCode(points: Array<{ x: number; y: number }>): void {
        if (!this.context || points.length < 4) return;

        this.context.beginPath();
        this.context.moveTo(points[0].x, points[0].y);

        for (let i = 1; i < points.length; i++) {
            this.context.lineTo(points[i].x, points[i].y);
        }

        this.context.closePath();
        this.context.strokeStyle = '#00ff00';
        this.context.lineWidth = 4;
        this.context.stroke();

        this.context.fillStyle = 'rgba(0, 255, 0, 0.2)';
        this.context.fill();
    }

    /**
     * تحديث الإعدادات
     */
    updateConfig(config: Partial<ScannerConfig>): void {
        this.config = { ...this.config, ...config };
    }

    /**
     * الحصول على الإعدادات الحالية
     */
    getConfig(): ScannerConfig {
        return { ...this.config };
    }
}

/**
 * إنشاء ماسح سريع
 */
export function createQuickScanner(
    container: HTMLElement | string,
    onScan: ScanCallback,
    config?: Partial<ScannerConfig>
): { scanner: QRScanner; stop: () => void } {
    const el = typeof container === 'string'
        ? document.querySelector<HTMLElement>(container)
        : container;

    if (!el) {
        throw new Error('Container not found');
    }

    const scanner = new QRScanner(config);

    scanner.start(el, onScan).catch(console.error);

    return {
        scanner,
        stop: () => scanner.stop()
    };
}

/**
 * مسح صورة من الملف
 */
export async function scanFromFile(file: File): Promise<ScanResult | null> {
    const scanner = new QRScanner();
    return scanner.scanImage(file);
}

/**
 * مسح من الحافظة
 */
export async function scanFromClipboard(): Promise<ScanResult | null> {
    try {
        const clipboardItems = await navigator.clipboard.read();

        for (const item of clipboardItems) {
            const imageTypes = item.types.filter(type => type.startsWith('image/'));

            for (const type of imageTypes) {
                const blob = await item.getType(type);
                const scanner = new QRScanner();
                const result = await scanner.scanImage(blob);

                if (result) {
                    return result;
                }
            }
        }

        return null;
    } catch {
        return null;
    }
}

/**
 * توليد QR Code
 * ملاحظة: يتطلب مكتبة QR Code generator
 */
export function generateQRCode(
    text: string,
    options: {
        size?: number;
        errorCorrection?: 'L' | 'M' | 'Q' | 'H';
        margin?: number;
        darkColor?: string;
        lightColor?: string;
    } = {}
): string {
    const { size = 200, margin = 4, darkColor = '#000000', lightColor = '#ffffff' } = options;

    // محاكاة - في الإنتاج استخدم مكتبة مثل qrcode
    // import QRCode from 'qrcode';
    // return QRCode.toDataURL(text, { width: size, margin, color: { dark: darkColor, light: lightColor } });

    // إرجاع placeholder
    return `data:image/svg+xml,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <rect width="100%" height="100%" fill="${lightColor}"/>
      <text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="${darkColor}" font-size="12">
        QR: ${text.substring(0, 20)}...
      </text>
    </svg>
  `)}`;
}

export default {
    QRScanner,
    createQuickScanner,
    scanFromFile,
    scanFromClipboard,
    generateQRCode
};
