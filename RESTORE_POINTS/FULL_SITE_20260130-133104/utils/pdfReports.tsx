/**
 * نظام تقارير PDF الاحترافية
 * تقارير مخصصة بتصميم رسمي
 */

// ==================== أنواع التقارير ====================
export interface ReportConfig {
    title: string;
    subtitle?: string;
    logo?: string;
    headerInfo?: Record<string, string>;
    footer?: string;
    watermark?: string;
    orientation?: 'portrait' | 'landscape';
    pageSize?: 'A4' | 'A3' | 'Letter';
}

export interface TableColumn {
    key: string;
    label: string;
    width?: number;
    align?: 'right' | 'center' | 'left';
    format?: (value: any) => string;
}

export interface ChartData {
    type: 'pie' | 'bar' | 'line';
    title: string;
    data: Array<{ label: string; value: number; color?: string }>;
}

// ==================== إنشاء التقارير ====================

/**
 * إنشاء PDF باستخدام jsPDF
 */
export const generateProfessionalPDF = async (
    config: ReportConfig,
    content: {
        summary?: Record<string, string | number>;
        tables?: Array<{
            title: string;
            columns: TableColumn[];
            data: Array<Record<string, any>>;
        }>;
        text?: string;
        charts?: ChartData[];
    }
): Promise<Blob> => {
    // استيراد ديناميكي لـ jsPDF
    const { jsPDF } = await import('jspdf');

    const isLandscape = config.orientation === 'landscape';
    const doc = new jsPDF({
        orientation: config.orientation || 'portrait',
        unit: 'mm',
        format: config.pageSize || 'A4'
    });

    const pageWidth = isLandscape ? 297 : 210;
    const pageHeight = isLandscape ? 210 : 297;
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    let yPos = margin;

    // ==================== إضافة الخطوط العربية ====================
    // ملاحظة: في التطبيق الحقيقي، يجب إضافة خط عربي مثل Cairo أو Amiri
    doc.setFont('helvetica');

    // ==================== الترويسة ====================
    const drawHeader = () => {
        // الإطار
        doc.setDrawColor(15, 60, 53); // لون أخضر داكن
        doc.setLineWidth(0.5);
        doc.rect(margin - 5, margin - 5, contentWidth + 10, 35);

        // العنوان الرئيسي
        doc.setFontSize(18);
        doc.setTextColor(15, 60, 53);
        doc.text(config.title, pageWidth / 2, yPos + 8, { align: 'center' });

        // العنوان الفرعي
        if (config.subtitle) {
            doc.setFontSize(12);
            doc.setTextColor(100, 100, 100);
            doc.text(config.subtitle, pageWidth / 2, yPos + 16, { align: 'center' });
        }

        // معلومات الترويسة
        if (config.headerInfo) {
            doc.setFontSize(9);
            doc.setTextColor(80, 80, 80);
            let headerY = yPos + 22;
            Object.entries(config.headerInfo).forEach(([key, value], index) => {
                const xPos = margin + (index % 2 === 0 ? 0 : contentWidth / 2);
                doc.text(`${key}: ${value}`, xPos, headerY);
                if (index % 2 === 1) headerY += 5;
            });
        }

        yPos += 40;
    };

    // ==================== التذييل ====================
    const drawFooter = (pageNum: number, totalPages: number) => {
        const footerY = pageHeight - 10;

        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.3);
        doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);

        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);

        // رقم الصفحة
        doc.text(`${pageNum} / ${totalPages}`, pageWidth / 2, footerY, { align: 'center' });

        // التاريخ
        const dateStr = new Date().toLocaleDateString('ar-SY', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        doc.text(dateStr, margin, footerY);

        // نص التذييل المخصص
        if (config.footer) {
            doc.text(config.footer, pageWidth - margin, footerY, { align: 'right' });
        }
    };

    // ==================== العلامة المائية ====================
    const drawWatermark = () => {
        if (config.watermark) {
            doc.setFontSize(50);
            doc.setTextColor(230, 230, 230);
            doc.text(config.watermark, pageWidth / 2, pageHeight / 2, {
                align: 'center',
                angle: 45
            });
        }
    };

    // ==================== الملخص ====================
    const drawSummary = (summary: Record<string, string | number>) => {
        const items = Object.entries(summary);
        const cols = Math.min(items.length, 4);
        const colWidth = contentWidth / cols;
        const boxHeight = 25;

        doc.setFillColor(248, 250, 252);
        doc.rect(margin, yPos, contentWidth, boxHeight, 'F');
        doc.setDrawColor(200, 200, 200);
        doc.rect(margin, yPos, contentWidth, boxHeight, 'S');

        items.forEach(([key, value], index) => {
            const xPos = margin + (index % cols) * colWidth + colWidth / 2;
            const boxY = yPos + 8;

            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            doc.text(key, xPos, boxY, { align: 'center' });

            doc.setFontSize(14);
            doc.setTextColor(15, 60, 53);
            doc.text(String(value), xPos, boxY + 10, { align: 'center' });
        });

        yPos += boxHeight + 10;
    };

    // ==================== الجداول ====================
    const drawTable = (
        title: string,
        columns: TableColumn[],
        data: Array<Record<string, any>>
    ) => {
        // عنوان الجدول
        doc.setFontSize(12);
        doc.setTextColor(15, 60, 53);
        doc.text(title, pageWidth / 2, yPos, { align: 'center' });
        yPos += 8;

        // حساب عرض الأعمدة
        const totalWidth = contentWidth;
        const defaultColWidth = totalWidth / columns.length;

        // رأس الجدول
        doc.setFillColor(15, 60, 53);
        doc.rect(margin, yPos, contentWidth, 8, 'F');

        doc.setFontSize(9);
        doc.setTextColor(255, 255, 255);

        let xPos = margin;
        columns.forEach(col => {
            const colWidth = col.width || defaultColWidth;
            const textX = col.align === 'center' ? xPos + colWidth / 2 :
                col.align === 'left' ? xPos + 2 : xPos + colWidth - 2;
            doc.text(col.label, textX, yPos + 5.5, { align: col.align || 'right' });
            xPos += colWidth;
        });

        yPos += 8;

        // صفوف البيانات
        doc.setTextColor(50, 50, 50);
        data.forEach((row, rowIndex) => {
            // التحقق من الحاجة لصفحة جديدة
            if (yPos > pageHeight - 30) {
                doc.addPage();
                yPos = margin;
                drawWatermark();
            }

            // خلفية متناوبة
            if (rowIndex % 2 === 0) {
                doc.setFillColor(248, 250, 252);
                doc.rect(margin, yPos, contentWidth, 7, 'F');
            }

            // إطار الصف
            doc.setDrawColor(220, 220, 220);
            doc.rect(margin, yPos, contentWidth, 7, 'S');

            xPos = margin;
            columns.forEach(col => {
                const colWidth = col.width || defaultColWidth;
                let value = row[col.key];

                if (col.format) {
                    value = col.format(value);
                }

                const textX = col.align === 'center' ? xPos + colWidth / 2 :
                    col.align === 'left' ? xPos + 2 : xPos + colWidth - 2;

                doc.setFontSize(8);
                doc.text(String(value ?? ''), textX, yPos + 5, { align: col.align || 'right' });
                xPos += colWidth;
            });

            yPos += 7;
        });

        yPos += 10;
    };

    // ==================== النص ====================
    const drawText = (text: string) => {
        doc.setFontSize(10);
        doc.setTextColor(50, 50, 50);

        const lines = doc.splitTextToSize(text, contentWidth);
        lines.forEach((line: string) => {
            if (yPos > pageHeight - 20) {
                doc.addPage();
                yPos = margin;
                drawWatermark();
            }
            doc.text(line, margin, yPos);
            yPos += 5;
        });

        yPos += 5;
    };

    // ==================== بناء التقرير ====================
    drawWatermark();
    drawHeader();

    if (content.summary) {
        drawSummary(content.summary);
    }

    if (content.text) {
        drawText(content.text);
    }

    if (content.tables) {
        content.tables.forEach(table => {
            if (yPos > pageHeight - 50) {
                doc.addPage();
                yPos = margin;
                drawWatermark();
            }
            drawTable(table.title, table.columns, table.data);
        });
    }

    // إضافة التذييلات لجميع الصفحات
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        drawFooter(i, totalPages);
    }

    return doc.output('blob');
};

/**
 * تنزيل التقرير
 */
export const downloadPDF = async (
    config: ReportConfig,
    content: Parameters<typeof generateProfessionalPDF>[1],
    filename: string
): Promise<void> => {
    const blob = await generateProfessionalPDF(config, content);
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
};

// ==================== تقارير مُعدة مسبقاً ====================

/**
 * تقرير التذاكر
 */
export const generateTicketsReport = async (
    tickets: Array<{
        id: string;
        fullName: string;
        department: string;
        requestType: string;
        status: string;
        createdAt: Date;
    }>,
    options: {
        title?: string;
        dateRange?: { from: Date; to: Date };
    } = {}
): Promise<Blob> => {
    const statusLabels: Record<string, string> = {
        'New': 'جديد',
        'InProgress': 'قيد المعالجة',
        'Answered': 'تم الرد',
        'Closed': 'مغلق'
    };

    const statusCounts = tickets.reduce((acc, t) => {
        acc[t.status] = (acc[t.status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    return generateProfessionalPDF(
        {
            title: options.title || 'تقرير التذاكر',
            subtitle: 'مديرية مالية حلب - نظام الاستعلامات والشكاوى',
            watermark: 'سري',
            headerInfo: {
                'تاريخ التقرير': new Date().toLocaleDateString('ar-SY'),
                'عدد التذاكر': String(tickets.length),
                'الفترة': options.dateRange
                    ? `${options.dateRange.from.toLocaleDateString('ar-SY')} - ${options.dateRange.to.toLocaleDateString('ar-SY')}`
                    : 'جميع الفترات'
            }
        },
        {
            summary: {
                'الإجمالي': tickets.length,
                'جديد': statusCounts['New'] || 0,
                'قيد المعالجة': statusCounts['InProgress'] || 0,
                'مغلق': statusCounts['Closed'] || 0
            },
            tables: [{
                title: 'قائمة التذاكر',
                columns: [
                    { key: 'id', label: 'رقم التذكرة', width: 30 },
                    { key: 'fullName', label: 'الاسم', width: 40 },
                    { key: 'department', label: 'القسم', width: 35 },
                    { key: 'requestType', label: 'النوع', width: 30 },
                    { key: 'status', label: 'الحالة', width: 25, format: (v) => statusLabels[v] || v },
                    { key: 'createdAt', label: 'التاريخ', width: 30, format: (v) => new Date(v).toLocaleDateString('ar-SY') }
                ],
                data: tickets
            }]
        }
    );
};

/**
 * تقرير الموظفين
 */
export const generateEmployeesReport = async (
    employees: Array<{
        id?: string;
        username: string;
        name?: string;
        department?: string;
        role: string;
    }>
): Promise<Blob> => {
    const roleCounts = employees.reduce((acc, e) => {
        acc[e.role] = (acc[e.role] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    return generateProfessionalPDF(
        {
            title: 'تقرير الموظفين',
            subtitle: 'مديرية مالية حلب',
            headerInfo: {
                'تاريخ التقرير': new Date().toLocaleDateString('ar-SY'),
                'عدد الموظفين': String(employees.length)
            }
        },
        {
            summary: {
                'الإجمالي': employees.length,
                'مدراء': roleCounts['مدير'] || 0,
                'موظفين': roleCounts['موظف'] || 0
            },
            tables: [{
                title: 'قائمة الموظفين',
                columns: [
                    { key: 'username', label: 'اسم المستخدم', width: 40 },
                    { key: 'name', label: 'الاسم', width: 50 },
                    { key: 'department', label: 'القسم', width: 50 },
                    { key: 'role', label: 'الدور', width: 30 }
                ],
                data: employees
            }]
        }
    );
};

/**
 * تقرير الإحصائيات
 */
export const generateStatisticsReport = async (
    stats: {
        totalTickets: number;
        newTickets: number;
        closedTickets: number;
        avgResponseTime: string;
        topDepartments: Array<{ name: string; count: number }>;
        monthlyData: Array<{ month: string; count: number }>;
    }
): Promise<Blob> => {
    return generateProfessionalPDF(
        {
            title: 'تقرير الإحصائيات الشهري',
            subtitle: 'مديرية مالية حلب - نظام الاستعلامات والشكاوى',
            headerInfo: {
                'تاريخ التقرير': new Date().toLocaleDateString('ar-SY'),
                'الفترة': 'آخر 30 يوم'
            }
        },
        {
            summary: {
                'إجمالي التذاكر': stats.totalTickets,
                'تذاكر جديدة': stats.newTickets,
                'تذاكر مغلقة': stats.closedTickets,
                'متوسط الاستجابة': stats.avgResponseTime
            },
            tables: [
                {
                    title: 'الأقسام الأكثر نشاطاً',
                    columns: [
                        { key: 'name', label: 'القسم', width: 120 },
                        { key: 'count', label: 'عدد التذاكر', width: 50, align: 'center' }
                    ],
                    data: stats.topDepartments
                },
                {
                    title: 'البيانات الشهرية',
                    columns: [
                        { key: 'month', label: 'الشهر', width: 120 },
                        { key: 'count', label: 'عدد التذاكر', width: 50, align: 'center' }
                    ],
                    data: stats.monthlyData
                }
            ]
        }
    );
};

// ==================== مكون React ====================
import React, { useState } from 'react';

interface ReportGeneratorProps {
    type: 'tickets' | 'employees' | 'statistics';
    data: any;
    onGenerate?: () => void;
}

export const ReportGenerator: React.FC<ReportGeneratorProps> = ({
    type,
    data,
    onGenerate
}) => {
    const [isGenerating, setIsGenerating] = useState(false);

    const handleGenerate = async () => {
        setIsGenerating(true);
        try {
            let blob: Blob;
            let filename: string;

            switch (type) {
                case 'tickets':
                    blob = await generateTicketsReport(data);
                    filename = `tickets_report_${Date.now()}`;
                    break;
                case 'employees':
                    blob = await generateEmployeesReport(data);
                    filename = `employees_report_${Date.now()}`;
                    break;
                case 'statistics':
                    blob = await generateStatisticsReport(data);
                    filename = `statistics_report_${Date.now()}`;
                    break;
                default:
                    return;
            }

            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${filename}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            onGenerate?.();
        } catch (error) {
            console.error('Error generating report:', error);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium disabled:opacity-50 transition-colors"
        >
            {isGenerating ? (
                <>
                    <span className="animate-spin">⏳</span>
                    <span>جاري الإنشاء...</span>
                </>
            ) : (
                <>
                    <span>📄</span>
                    <span>تصدير PDF</span>
                </>
            )}
        </button>
    );
};
