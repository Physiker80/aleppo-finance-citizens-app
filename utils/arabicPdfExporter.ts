// =====================================================
// 📄 Arabic PDF Exporter
// مُصدّر PDF مع دعم كامل للغة العربية
// =====================================================

/**
 * تحميل الخطوط العربية مسبقاً
 */
export async function preloadArabicFonts(): Promise<boolean> {
    const arabicFonts = [
        { family: 'Amiri', url: 'https://fonts.gstatic.com/s/amiri/v27/J7aRnpd8CGxBHqUpvrIw74NL.woff2' },
        { family: 'Cairo', url: 'https://fonts.gstatic.com/s/cairo/v28/SLXgc1nY6HkvangtZmpQdkhzfH5lkSs2SgRjCAGMQ1z0hOA-W1ToLQ-HmkA.woff2' },
        { family: 'Noto Kufi Arabic', url: 'https://fonts.gstatic.com/s/notokufiarabic/v21/CSRp4ydQnPyaDxEXLFF6LZVLKrodhu8t57o1kDc5Wh5v3obPnLSmf5yD.woff2' }
    ];

    try {
        // تحميل الخطوط بالتوازي
        await Promise.all(
            arabicFonts.map(async (font) => {
                try {
                    const fontFace = new FontFace(font.family, `url(${font.url})`);
                    const loadedFont = await fontFace.load();
                    document.fonts.add(loadedFont);
                } catch (err) {
                    console.warn(`Failed to load font ${font.family}:`, err);
                }
            })
        );

        // انتظار جاهزية جميع الخطوط
        await document.fonts.ready;
        console.log('Arabic fonts loaded successfully');
        return true;
    } catch (error) {
        console.error('Error preloading Arabic fonts:', error);
        return false;
    }
}

/**
 * تحويل النص العربي لـ Canvas (معالجة الاتجاه RTL)
 */
export function prepareArabicText(text: string): string {
    if (!text) return '';

    // إزالة أي أحرف تحكم غير مرغوب فيها
    let cleaned = text.replace(/[\u200B-\u200D\uFEFF]/g, '');

    // إضافة علامة RTL في البداية
    cleaned = '\u200F' + cleaned;

    return cleaned;
}

/**
 * رسم نص عربي على Canvas مع دعم RTL
 */
export function drawArabicText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    options: {
        font?: string;
        color?: string;
        align?: CanvasTextAlign;
        maxWidth?: number;
    } = {}
): void {
    const {
        font = '16px "Amiri", "Cairo", sans-serif',
        color = '#000000',
        align = 'right',
        maxWidth
    } = options;

    ctx.save();
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.direction = 'rtl';

    const preparedText = prepareArabicText(text);

    if (maxWidth) {
        ctx.fillText(preparedText, x, y, maxWidth);
    } else {
        ctx.fillText(preparedText, x, y);
    }

    ctx.restore();
}

/**
 * تقسيم النص العربي إلى أسطر
 */
export function wrapArabicText(
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number,
    font: string = '16px "Amiri", "Cairo", sans-serif'
): string[] {
    if (!text) return [];

    ctx.save();
    ctx.font = font;

    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const metrics = ctx.measureText(testLine);

        if (metrics.width > maxWidth && currentLine) {
            lines.push(currentLine);
            currentLine = word;
        } else {
            currentLine = testLine;
        }
    }

    if (currentLine) {
        lines.push(currentLine);
    }

    ctx.restore();
    return lines;
}

/**
 * إنشاء PDF من Canvas مع دعم العربية
 */
export interface PDFExportOptions {
    filename: string;
    title?: string;
    orientation?: 'portrait' | 'landscape';
    pageSize?: 'a4' | 'letter';
    margin?: number;
    headerHeight?: number;
    footerHeight?: number;
    logoUrl?: string;
    watermark?: string;
}

/**
 * بيانات الإيصال
 */
export interface ReceiptData {
    id: string;
    fullName: string;
    nationalId?: string;
    department?: string;
    submissionDate: Date | string;
    details?: string;
    email?: string;
    phone?: string;
    status?: string;
}

/**
 * إنشاء إيصال PDF احترافي
 */
export async function generateArabicPDF(
    data: ReceiptData,
    options: PDFExportOptions = { filename: 'receipt.pdf' }
): Promise<Blob | null> {
    // Get directorate name
    let directorateName = 'المديرية المالية';
    try {
        const savedConfig = localStorage.getItem('site_config');
        if (savedConfig) {
            const config = JSON.parse(savedConfig);
            if (config.directorateName) directorateName = config.directorateName;
        }
    } catch (e) {}

    try {
        // تحميل الخطوط أولاً
        await preloadArabicFonts();

        // إنشاء Canvas
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            throw new Error('Could not get canvas context');
        }

        // أبعاد A4 بدقة عالية
        const DPI = 2;
        const A4_WIDTH = 794;
        const A4_HEIGHT = 1123;

        canvas.width = A4_WIDTH * DPI;
        canvas.height = A4_HEIGHT * DPI;
        ctx.scale(DPI, DPI);

        // الألوان
        const colors = {
            primary: '#0f3c35',
            accent: '#d4af37',
            darkText: '#1f2937',
            mediumGray: '#6b7280',
            lightBg: '#f8fafc',
            white: '#ffffff',
            border: '#e5e7eb'
        };

        // الخطوط
        const fonts = {
            title: 'bold 28px "Amiri", "Cairo", serif',
            header: 'bold 22px "Amiri", "Cairo", serif',
            subheader: 'bold 18px "Amiri", "Cairo", serif',
            body: '16px "Amiri", "Cairo", serif',
            bodyBold: 'bold 16px "Amiri", "Cairo", serif',
            small: '14px "Amiri", "Cairo", serif',
            mono: '18px "Courier New", monospace'
        };

        // خلفية بيضاء
        ctx.fillStyle = colors.white;
        ctx.fillRect(0, 0, A4_WIDTH, A4_HEIGHT);

        // ===== رأس الصفحة =====
        ctx.fillStyle = colors.lightBg;
        ctx.fillRect(0, 0, A4_WIDTH, 110);

        // خط الرأس
        ctx.fillStyle = colors.primary;
        ctx.fillRect(0, 110, A4_WIDTH, 4);
        ctx.fillStyle = colors.accent;
        ctx.fillRect(0, 114, A4_WIDTH, 2);

        // تحميل ورسم الشعار
        try {
            const logoImg = await loadImage('/ministry-logo.svg');
            if (logoImg) {
                ctx.drawImage(logoImg, A4_WIDTH - 95, 15, 75, 75);
            }
        } catch {
            // تجاهل خطأ تحميل الشعار
        }

        // نص الرأس
        drawArabicText(ctx, 'الجمهورية العربية السورية', A4_WIDTH - 120, 45, {
            font: fonts.header,
            color: colors.primary
        });

        drawArabicText(ctx, `وزارة المالية - ${directorateName}`, A4_WIDTH - 120, 80, {
            font: fonts.body,
            color: colors.darkText
        });

        // ===== العنوان الرئيسي =====
        let currentY = 160;

        ctx.textAlign = 'center';
        drawArabicText(ctx, 'إيصال استلام طلب', A4_WIDTH / 2, currentY, {
            font: fonts.title,
            color: colors.primary,
            align: 'center'
        });

        // خط تحت العنوان
        currentY += 15;
        ctx.fillStyle = colors.accent;
        ctx.fillRect(A4_WIDTH / 2 - 100, currentY, 200, 3);

        // ===== رقم التتبع =====
        currentY += 45;

        // مربع رقم التتبع
        ctx.fillStyle = colors.lightBg;
        ctx.strokeStyle = colors.primary;
        ctx.lineWidth = 1;

        const trackingBoxX = 120;
        const trackingBoxWidth = A4_WIDTH - 240;
        const trackingBoxHeight = 70;

        ctx.fillRect(trackingBoxX, currentY, trackingBoxWidth, trackingBoxHeight);
        ctx.strokeRect(trackingBoxX, currentY, trackingBoxWidth, trackingBoxHeight);

        drawArabicText(ctx, 'رقم التتبع الخاص بطلبك', A4_WIDTH / 2, currentY + 28, {
            font: fonts.body,
            color: colors.darkText,
            align: 'center'
        });

        ctx.font = 'bold 26px "Courier New", monospace';
        ctx.fillStyle = colors.primary;
        ctx.textAlign = 'center';
        ctx.fillText(data.id, A4_WIDTH / 2, currentY + 58);

        // ===== معلومات الطلب =====
        currentY += 100;

        const drawInfoRow = (label: string, value: string | undefined, y: number): number => {
            if (!value) return y;

            // التسمية
            drawArabicText(ctx, label, A4_WIDTH - 80, y, {
                font: fonts.bodyBold,
                color: colors.primary
            });

            // القيمة
            drawArabicText(ctx, value, A4_WIDTH - 220, y, {
                font: fonts.body,
                color: colors.darkText
            });

            return y + 40;
        };

        currentY = drawInfoRow('الاسم الكامل:', data.fullName, currentY);
        currentY = drawInfoRow('الرقم الوطني:', data.nationalId, currentY);
        currentY = drawInfoRow('القسم المختص:', data.department, currentY);

        const submissionDate = data.submissionDate instanceof Date
            ? data.submissionDate
            : new Date(data.submissionDate);
        currentY = drawInfoRow('تاريخ التقديم:', submissionDate.toLocaleString('ar-SY-u-nu-latn'), currentY);

        if (data.email) {
            currentY = drawInfoRow('البريد الإلكتروني:', data.email, currentY);
        }
        if (data.phone) {
            currentY = drawInfoRow('رقم الهاتف:', data.phone, currentY);
        }

        // ===== التفاصيل =====
        if (data.details) {
            currentY += 15;

            // خط فاصل
            ctx.fillStyle = colors.border;
            ctx.fillRect(80, currentY, A4_WIDTH - 160, 1);
            currentY += 25;

            drawArabicText(ctx, 'تفاصيل الطلب:', A4_WIDTH - 80, currentY, {
                font: fonts.bodyBold,
                color: colors.primary
            });
            currentY += 30;

            // تقسيم التفاصيل إلى أسطر
            const detailLines = wrapArabicText(ctx, data.details, A4_WIDTH - 160, fonts.body);
            for (const line of detailLines) {
                drawArabicText(ctx, line, A4_WIDTH - 80, currentY, {
                    font: fonts.body,
                    color: colors.darkText
                });
                currentY += 28;
            }
        }

        // ===== رمز QR =====
        currentY = Math.max(currentY + 40, A4_HEIGHT - 280);

        // إنشاء رمز QR
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
            `${window.location.origin}/#/track?id=${data.id}`
        )}`;

        try {
            const qrImg = await loadImage(qrUrl);
            if (qrImg) {
                ctx.drawImage(qrImg, 80, currentY, 130, 130);

                drawArabicText(ctx, 'امسح للمتابعة السريعة', 145, currentY + 150, {
                    font: fonts.small,
                    color: colors.mediumGray,
                    align: 'center'
                });
            }
        } catch {
            // تجاهل خطأ QR
        }

        // ===== Barcode =====
        // إنشاء Barcode Canvas
        const barcodeCanvas = document.createElement('canvas');
        if (typeof (window as any).JsBarcode === 'function') {
            (window as any).JsBarcode(barcodeCanvas, data.id, {
                format: 'CODE128',
                lineColor: colors.darkText,
                width: 2.5,
                height: 60,
                displayValue: false,
                margin: 0
            });
            ctx.drawImage(barcodeCanvas, A4_WIDTH - 280, currentY + 20, 200, 50);

            ctx.font = fonts.mono;
            ctx.fillStyle = colors.darkText;
            ctx.textAlign = 'center';
            ctx.fillText(data.id, A4_WIDTH - 180, currentY + 90);
        }

        // ===== التذييل =====
        const footerY = A4_HEIGHT - 70;
        ctx.fillStyle = colors.lightBg;
        ctx.fillRect(0, footerY, A4_WIDTH, 70);

        drawArabicText(
            ctx,
            `هذا الإيصال وثيقة رسمية لتأكيد استلام طلبك | تاريخ الطباعة: ${new Date().toLocaleString('ar-SY-u-nu-latn')}`,
            A4_WIDTH / 2,
            footerY + 30,
            { font: fonts.small, color: colors.mediumGray, align: 'center' }
        );

        drawArabicText(
            ctx,
            `الموقع الرسمي: ${window.location.origin}`,
            A4_WIDTH / 2,
            footerY + 50,
            { font: fonts.small, color: colors.mediumGray, align: 'center' }
        );

        // ===== إنشاء PDF =====
        const { jsPDF } = (window as any).jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');

        const imgData = canvas.toDataURL('image/png', 1.0);
        pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);

        // حفظ الملف
        pdf.save(options.filename);

        return pdf.output('blob');
    } catch (error) {
        console.error('Error generating Arabic PDF:', error);
        return null;
    }
}

/**
 * تحميل صورة
 */
async function loadImage(src: string): Promise<HTMLImageElement | null> {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = src;
    });
}

/**
 * تصدير جدول بيانات إلى PDF
 */
export async function exportTableToPDF(
    headers: string[],
    rows: (string | number)[][],
    options: PDFExportOptions
): Promise<Blob | null> {
    try {
        await preloadArabicFonts();

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) return null;

        const DPI = 2;
        const A4_WIDTH = 794;
        const A4_HEIGHT = 1123;
        const MARGIN = 50;
        const ROW_HEIGHT = 35;
        const HEADER_HEIGHT = 45;

        canvas.width = A4_WIDTH * DPI;
        canvas.height = A4_HEIGHT * DPI;
        ctx.scale(DPI, DPI);

        // خلفية بيضاء
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, A4_WIDTH, A4_HEIGHT);

        // العنوان
        if (options.title) {
            drawArabicText(ctx, options.title, A4_WIDTH / 2, 50, {
                font: 'bold 24px "Amiri", "Cairo", serif',
                color: '#0f3c35',
                align: 'center'
            });
        }

        // حساب عرض الأعمدة
        const tableWidth = A4_WIDTH - MARGIN * 2;
        const colWidth = tableWidth / headers.length;

        let currentY = options.title ? 100 : 50;

        // رأس الجدول
        ctx.fillStyle = '#0f3c35';
        ctx.fillRect(MARGIN, currentY, tableWidth, HEADER_HEIGHT);

        headers.forEach((header, index) => {
            const x = A4_WIDTH - MARGIN - (index * colWidth) - colWidth / 2;
            drawArabicText(ctx, header, x, currentY + 28, {
                font: 'bold 14px "Amiri", "Cairo", serif',
                color: '#ffffff',
                align: 'center'
            });
        });

        currentY += HEADER_HEIGHT;

        // صفوف البيانات
        rows.forEach((row, rowIndex) => {
            // خلفية متناوبة
            ctx.fillStyle = rowIndex % 2 === 0 ? '#ffffff' : '#f8fafc';
            ctx.fillRect(MARGIN, currentY, tableWidth, ROW_HEIGHT);

            // حدود
            ctx.strokeStyle = '#e5e7eb';
            ctx.strokeRect(MARGIN, currentY, tableWidth, ROW_HEIGHT);

            row.forEach((cell, cellIndex) => {
                const x = A4_WIDTH - MARGIN - (cellIndex * colWidth) - colWidth / 2;
                drawArabicText(ctx, String(cell), x, currentY + 22, {
                    font: '13px "Amiri", "Cairo", serif',
                    color: '#1f2937',
                    align: 'center'
                });
            });

            currentY += ROW_HEIGHT;
        });

        // إنشاء PDF
        const { jsPDF } = (window as any).jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');

        const imgData = canvas.toDataURL('image/png', 1.0);
        pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
        pdf.save(options.filename);

        return pdf.output('blob');
    } catch (error) {
        console.error('Error exporting table to PDF:', error);
        return null;
    }
}

/**
 * تصدير HTML إلى PDF مع دعم العربية
 */
export async function exportHTMLToPDF(
    element: HTMLElement,
    options: PDFExportOptions
): Promise<Blob | null> {
    try {
        await preloadArabicFonts();

        const html2canvas = (window as any).html2canvas;
        if (!html2canvas) {
            throw new Error('html2canvas not loaded');
        }

        const canvas = await html2canvas(element, {
            scale: 3,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            onclone: (clonedDoc: Document) => {
                // فرض الوضع الفاتح والخطوط العربية
                clonedDoc.documentElement.classList.remove('dark');

                const style = clonedDoc.createElement('style');
                style.innerHTML = `
          * {
            font-family: 'Amiri', 'Cairo', 'Noto Kufi Arabic', sans-serif !important;
          }
          body, html {
            background: #ffffff !important;
            direction: rtl !important;
          }
        `;
                clonedDoc.head.appendChild(style);
            }
        });

        const { jsPDF } = (window as any).jspdf;
        const pdf = new jsPDF(options.orientation || 'portrait', 'mm', options.pageSize || 'a4');

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        const imgData = canvas.toDataURL('image/png');
        const imgWidth = pdfWidth - 20;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        let heightLeft = imgHeight;
        let position = 10;

        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;

        // صفحات متعددة إذا لزم الأمر
        while (heightLeft > 0) {
            position = heightLeft - imgHeight + 10;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
            heightLeft -= pdfHeight;
        }

        pdf.save(options.filename);
        return pdf.output('blob');
    } catch (error) {
        console.error('Error exporting HTML to PDF:', error);
        return null;
    }
}

export default {
    preloadArabicFonts,
    prepareArabicText,
    drawArabicText,
    wrapArabicText,
    generateArabicPDF,
    exportTableToPDF,
    exportHTMLToPDF
};
