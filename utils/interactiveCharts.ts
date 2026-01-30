// =====================================================
// 📈 Interactive Charts System
// نظام رسوم بيانية تفاعلية
// =====================================================

export type ChartType = 'bar' | 'line' | 'pie' | 'doughnut' | 'area' | 'scatter' | 'radar' | 'polar';

export interface ChartDataset {
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
    borderWidth?: number;
    fill?: boolean;
    tension?: number;
}

export interface ChartData {
    labels: string[];
    datasets: ChartDataset[];
}

export interface ChartOptions {
    responsive?: boolean;
    maintainAspectRatio?: boolean;
    rtl?: boolean;
    animation?: boolean;
    title?: string;
    subtitle?: string;
    legend?: {
        display?: boolean;
        position?: 'top' | 'bottom' | 'left' | 'right';
    };
    tooltip?: {
        enabled?: boolean;
        format?: (value: number) => string;
    };
    scales?: {
        x?: { title?: string; grid?: boolean };
        y?: { title?: string; grid?: boolean; beginAtZero?: boolean };
    };
    onClick?: (label: string, value: number, datasetIndex: number) => void;
}

// ألوان المخطط الافتراضية
export const DEFAULT_COLORS = [
    '#0f3c35', // Primary
    '#10b981', // Success
    '#3b82f6', // Info
    '#f59e0b', // Warning
    '#ef4444', // Error
    '#8b5cf6', // Purple
    '#ec4899', // Pink
    '#06b6d4', // Cyan
    '#84cc16', // Lime
    '#f97316', // Orange
];

/**
 * توليد ألوان متدرجة
 */
export function generateColors(count: number, baseColor?: string): string[] {
    if (count <= DEFAULT_COLORS.length) {
        return DEFAULT_COLORS.slice(0, count);
    }

    const colors: string[] = [...DEFAULT_COLORS];
    while (colors.length < count) {
        colors.push(`hsl(${Math.random() * 360}, 70%, 50%)`);
    }
    return colors;
}

/**
 * إنشاء SVG للرسم البياني الشريطي
 */
export function createBarChartSVG(data: ChartData, options: ChartOptions = {}): string {
    const width = 600;
    const height = 400;
    const padding = { top: 60, right: 40, bottom: 80, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const allValues = data.datasets.flatMap(d => d.data);
    const maxValue = Math.max(...allValues, 1);
    const minValue = options.scales?.y?.beginAtZero !== false ? 0 : Math.min(...allValues);
    const range = maxValue - minValue;

    const barGroupWidth = chartWidth / data.labels.length;
    const barWidth = (barGroupWidth * 0.7) / data.datasets.length;
    const colors = generateColors(data.datasets.length);

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" style="font-family: Arial, sans-serif;">`;

    // Background
    svg += `<rect width="${width}" height="${height}" fill="#ffffff"/>`;

    // Title
    if (options.title) {
        svg += `<text x="${width / 2}" y="30" text-anchor="middle" font-size="18" font-weight="bold" fill="#1e293b">${options.title}</text>`;
    }

    // Grid lines
    for (let i = 0; i <= 5; i++) {
        const y = padding.top + (chartHeight * i / 5);
        const value = maxValue - (range * i / 5);
        svg += `<line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="#e2e8f0" stroke-width="1"/>`;
        svg += `<text x="${padding.left - 10}" y="${y + 5}" text-anchor="end" font-size="12" fill="#64748b">${Math.round(value)}</text>`;
    }

    // Bars
    data.labels.forEach((label, labelIndex) => {
        const x = padding.left + (labelIndex * barGroupWidth) + (barGroupWidth * 0.15);

        data.datasets.forEach((dataset, datasetIndex) => {
            const value = dataset.data[labelIndex] || 0;
            const barHeight = ((value - minValue) / range) * chartHeight;
            const barX = x + (datasetIndex * barWidth);
            const barY = padding.top + chartHeight - barHeight;
            const color = Array.isArray(dataset.backgroundColor)
                ? dataset.backgroundColor[labelIndex]
                : dataset.backgroundColor || colors[datasetIndex];

            svg += `<rect x="${barX}" y="${barY}" width="${barWidth - 2}" height="${barHeight}" fill="${color}" rx="4">
        <title>${dataset.label}: ${value}</title>
      </rect>`;
        });

        // X-axis label
        const labelX = padding.left + (labelIndex * barGroupWidth) + (barGroupWidth / 2);
        svg += `<text x="${labelX}" y="${height - padding.bottom + 20}" text-anchor="middle" font-size="12" fill="#64748b" transform="rotate(-45 ${labelX} ${height - padding.bottom + 20})">${label}</text>`;
    });

    // Legend
    if (options.legend?.display !== false && data.datasets.length > 1) {
        const legendY = height - 20;
        const legendSpacing = 120;
        const startX = (width - (data.datasets.length * legendSpacing)) / 2;

        data.datasets.forEach((dataset, i) => {
            const x = startX + (i * legendSpacing);
            svg += `<rect x="${x}" y="${legendY - 10}" width="16" height="16" fill="${colors[i]}" rx="2"/>`;
            svg += `<text x="${x + 22}" y="${legendY + 2}" font-size="12" fill="#1e293b">${dataset.label}</text>`;
        });
    }

    svg += '</svg>';
    return svg;
}

/**
 * إنشاء SVG للرسم البياني الخطي
 */
export function createLineChartSVG(data: ChartData, options: ChartOptions = {}): string {
    const width = 600;
    const height = 400;
    const padding = { top: 60, right: 40, bottom: 80, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const allValues = data.datasets.flatMap(d => d.data);
    const maxValue = Math.max(...allValues, 1);
    const minValue = options.scales?.y?.beginAtZero !== false ? 0 : Math.min(...allValues);
    const range = maxValue - minValue;

    const stepX = chartWidth / (data.labels.length - 1 || 1);
    const colors = generateColors(data.datasets.length);

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" style="font-family: Arial, sans-serif;">`;

    // Background
    svg += `<rect width="${width}" height="${height}" fill="#ffffff"/>`;

    // Title
    if (options.title) {
        svg += `<text x="${width / 2}" y="30" text-anchor="middle" font-size="18" font-weight="bold" fill="#1e293b">${options.title}</text>`;
    }

    // Grid lines
    for (let i = 0; i <= 5; i++) {
        const y = padding.top + (chartHeight * i / 5);
        const value = maxValue - (range * i / 5);
        svg += `<line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="#e2e8f0" stroke-width="1"/>`;
        svg += `<text x="${padding.left - 10}" y="${y + 5}" text-anchor="end" font-size="12" fill="#64748b">${Math.round(value)}</text>`;
    }

    // Lines and areas
    data.datasets.forEach((dataset, datasetIndex) => {
        const color = dataset.borderColor as string || colors[datasetIndex];
        const fillColor = dataset.backgroundColor as string || color;

        // Build path
        const points = dataset.data.map((value, i) => {
            const x = padding.left + (i * stepX);
            const y = padding.top + chartHeight - ((value - minValue) / range) * chartHeight;
            return { x, y };
        });

        const pathD = points.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `L ${p.x} ${p.y}`)).join(' ');

        // Area fill
        if (dataset.fill !== false) {
            const areaD = pathD + ` L ${points[points.length - 1].x} ${padding.top + chartHeight} L ${padding.left} ${padding.top + chartHeight} Z`;
            svg += `<path d="${areaD}" fill="${fillColor}" fill-opacity="0.2"/>`;
        }

        // Line
        svg += `<path d="${pathD}" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;

        // Points
        points.forEach((p, i) => {
            svg += `<circle cx="${p.x}" cy="${p.y}" r="5" fill="${color}" stroke="#ffffff" stroke-width="2">
        <title>${dataset.label}: ${dataset.data[i]}</title>
      </circle>`;
        });
    });

    // X-axis labels
    data.labels.forEach((label, i) => {
        const x = padding.left + (i * stepX);
        svg += `<text x="${x}" y="${height - padding.bottom + 20}" text-anchor="middle" font-size="12" fill="#64748b">${label}</text>`;
    });

    svg += '</svg>';
    return svg;
}

/**
 * إنشاء SVG للرسم البياني الدائري
 */
export function createPieChartSVG(data: ChartData, options: ChartOptions = {}, isDoughnut = false): string {
    const width = 400;
    const height = 400;
    const centerX = width / 2;
    const centerY = height / 2 - 20;
    const radius = 140;
    const innerRadius = isDoughnut ? radius * 0.6 : 0;

    const dataset = data.datasets[0];
    const total = dataset.data.reduce((sum, val) => sum + val, 0);
    const colors = generateColors(data.labels.length);

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" style="font-family: Arial, sans-serif;">`;

    // Background
    svg += `<rect width="${width}" height="${height}" fill="#ffffff"/>`;

    // Title
    if (options.title) {
        svg += `<text x="${centerX}" y="30" text-anchor="middle" font-size="18" font-weight="bold" fill="#1e293b">${options.title}</text>`;
    }

    // Pie slices
    let startAngle = -Math.PI / 2;

    dataset.data.forEach((value, i) => {
        const percentage = value / total;
        const angle = percentage * 2 * Math.PI;
        const endAngle = startAngle + angle;

        const x1 = centerX + radius * Math.cos(startAngle);
        const y1 = centerY + radius * Math.sin(startAngle);
        const x2 = centerX + radius * Math.cos(endAngle);
        const y2 = centerY + radius * Math.sin(endAngle);

        const largeArc = angle > Math.PI ? 1 : 0;
        const color = Array.isArray(dataset.backgroundColor) ? dataset.backgroundColor[i] : colors[i];

        let d: string;
        if (isDoughnut) {
            const ix1 = centerX + innerRadius * Math.cos(startAngle);
            const iy1 = centerY + innerRadius * Math.sin(startAngle);
            const ix2 = centerX + innerRadius * Math.cos(endAngle);
            const iy2 = centerY + innerRadius * Math.sin(endAngle);

            d = `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${ix1} ${iy1} Z`;
        } else {
            d = `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
        }

        svg += `<path d="${d}" fill="${color}" stroke="#ffffff" stroke-width="2">
      <title>${data.labels[i]}: ${value} (${(percentage * 100).toFixed(1)}%)</title>
    </path>`;

        // Label
        const labelAngle = startAngle + angle / 2;
        const labelRadius = isDoughnut ? (radius + innerRadius) / 2 : radius * 0.65;
        const labelX = centerX + labelRadius * Math.cos(labelAngle);
        const labelY = centerY + labelRadius * Math.sin(labelAngle);

        if (percentage > 0.05) {
            svg += `<text x="${labelX}" y="${labelY}" text-anchor="middle" dominant-baseline="middle" font-size="12" fill="#ffffff" font-weight="bold">${(percentage * 100).toFixed(0)}%</text>`;
        }

        startAngle = endAngle;
    });

    // Legend
    const legendY = height - 40;
    const legendItemWidth = 100;
    const startX = (width - Math.min(data.labels.length, 4) * legendItemWidth) / 2;

    data.labels.forEach((label, i) => {
        const row = Math.floor(i / 4);
        const col = i % 4;
        const x = startX + (col * legendItemWidth);
        const y = legendY + (row * 20);

        svg += `<rect x="${x}" y="${y - 8}" width="12" height="12" fill="${colors[i]}" rx="2"/>`;
        svg += `<text x="${x + 18}" y="${y + 2}" font-size="11" fill="#1e293b">${label.substring(0, 12)}</text>`;
    });

    // Center text for doughnut
    if (isDoughnut) {
        svg += `<text x="${centerX}" y="${centerY - 10}" text-anchor="middle" font-size="24" font-weight="bold" fill="#1e293b">${total}</text>`;
        svg += `<text x="${centerX}" y="${centerY + 15}" text-anchor="middle" font-size="12" fill="#64748b">المجموع</text>`;
    }

    svg += '</svg>';
    return svg;
}

/**
 * إنشاء رسم بياني SVG
 */
export function createChart(type: ChartType, data: ChartData, options: ChartOptions = {}): string {
    switch (type) {
        case 'bar':
            return createBarChartSVG(data, options);
        case 'line':
        case 'area':
            return createLineChartSVG(data, { ...options, ...(type === 'area' ? {} : {}) });
        case 'pie':
            return createPieChartSVG(data, options, false);
        case 'doughnut':
            return createPieChartSVG(data, options, true);
        default:
            return createBarChartSVG(data, options);
    }
}

/**
 * تحويل SVG إلى صورة PNG
 */
export async function svgToPng(svgString: string, width = 800, height = 600): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const svg = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svg);

        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Could not get canvas context'));
                return;
            }

            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);

            URL.revokeObjectURL(url);
            resolve(canvas.toDataURL('image/png'));
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Failed to load SVG'));
        };

        img.src = url;
    });
}

/**
 * تحميل الرسم البياني كصورة
 */
export async function downloadChart(svgString: string, filename: string, format: 'svg' | 'png' = 'png'): Promise<void> {
    if (format === 'svg') {
        const blob = new Blob([svgString], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.svg`;
        a.click();
        URL.revokeObjectURL(url);
    } else {
        const pngUrl = await svgToPng(svgString);
        const a = document.createElement('a');
        a.href = pngUrl;
        a.download = `${filename}.png`;
        a.click();
    }
}

/**
 * إنشاء بيانات رسم بياني من مصفوفة
 */
export function createChartDataFromArray<T>(
    items: T[],
    labelFn: (item: T) => string,
    valueFn: (item: T) => number,
    datasetLabel = 'القيمة'
): ChartData {
    return {
        labels: items.map(labelFn),
        datasets: [{
            label: datasetLabel,
            data: items.map(valueFn),
            backgroundColor: generateColors(items.length)
        }]
    };
}

/**
 * تجميع البيانات للرسم البياني
 */
export function aggregateForChart<T>(
    items: T[],
    groupByFn: (item: T) => string,
    aggregateFn: (items: T[]) => number = (arr) => arr.length
): ChartData {
    const groups = new Map<string, T[]>();

    items.forEach(item => {
        const key = groupByFn(item);
        if (!groups.has(key)) {
            groups.set(key, []);
        }
        groups.get(key)!.push(item);
    });

    const labels = Array.from(groups.keys());
    const data = labels.map(label => aggregateFn(groups.get(label)!));

    return {
        labels,
        datasets: [{
            label: 'القيمة',
            data,
            backgroundColor: generateColors(labels.length)
        }]
    };
}

export default {
    createChart,
    createBarChartSVG,
    createLineChartSVG,
    createPieChartSVG,
    downloadChart,
    createChartDataFromArray,
    aggregateForChart,
    DEFAULT_COLORS
};
