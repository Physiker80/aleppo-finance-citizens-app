/**
 * مكونات الرسوم البيانية التفاعلية
 * Charts Components for Statistics
 */

import React, { useMemo } from 'react';

// ==================== مخطط دائري (Pie Chart) ====================
interface PieChartProps {
    data: { label: string; value: number; color: string }[];
    size?: number;
    showLabels?: boolean;
    showLegend?: boolean;
    title?: string;
}

export const PieChart: React.FC<PieChartProps> = ({
    data,
    size = 200,
    showLabels = true,
    showLegend = true,
    title
}) => {
    const total = useMemo(() => data.reduce((sum, item) => sum + item.value, 0), [data]);

    const segments = useMemo(() => {
        let currentAngle = 0;
        return data.map(item => {
            const percentage = total > 0 ? (item.value / total) * 100 : 0;
            const angle = (percentage / 100) * 360;
            const startAngle = currentAngle;
            currentAngle += angle;
            return {
                ...item,
                percentage,
                startAngle,
                endAngle: currentAngle
            };
        });
    }, [data, total]);

    const getCoordinatesForAngle = (angle: number, radius: number) => {
        const radians = (angle - 90) * (Math.PI / 180);
        return {
            x: radius * Math.cos(radians),
            y: radius * Math.sin(radians)
        };
    };

    const createArcPath = (startAngle: number, endAngle: number, radius: number) => {
        const start = getCoordinatesForAngle(startAngle, radius);
        const end = getCoordinatesForAngle(endAngle, radius);
        const largeArc = endAngle - startAngle > 180 ? 1 : 0;
        return `M 0 0 L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y} Z`;
    };

    const radius = size / 2 - 10;
    const center = size / 2;

    return (
        <div className="flex flex-col items-center gap-4">
            {title && <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">{title}</h3>}

            <div className="flex items-center gap-6 flex-wrap justify-center">
                <svg width={size} height={size} className="transform -rotate-90">
                    <g transform={`translate(${center}, ${center})`}>
                        {segments.map((segment, index) => (
                            <g key={index}>
                                <path
                                    d={createArcPath(segment.startAngle, segment.endAngle, radius)}
                                    fill={segment.color}
                                    className="transition-all duration-300 hover:opacity-80 cursor-pointer"
                                    stroke="white"
                                    strokeWidth="2"
                                >
                                    <title>{segment.label}: {segment.value} ({segment.percentage.toFixed(1)}%)</title>
                                </path>
                                {showLabels && segment.percentage > 5 && (
                                    <text
                                        x={getCoordinatesForAngle((segment.startAngle + segment.endAngle) / 2, radius * 0.65).x}
                                        y={getCoordinatesForAngle((segment.startAngle + segment.endAngle) / 2, radius * 0.65).y}
                                        textAnchor="middle"
                                        dominantBaseline="middle"
                                        fill="white"
                                        fontSize="12"
                                        fontWeight="bold"
                                        className="rotate-90"
                                        style={{ transform: 'rotate(90deg)', transformOrigin: 'center' }}
                                    >
                                        {segment.percentage.toFixed(0)}%
                                    </text>
                                )}
                            </g>
                        ))}
                    </g>
                </svg>

                {showLegend && (
                    <div className="flex flex-col gap-2">
                        {segments.map((segment, index) => (
                            <div key={index} className="flex items-center gap-2 text-sm">
                                <span className="w-4 h-4 rounded" style={{ backgroundColor: segment.color }}></span>
                                <span className="text-gray-700 dark:text-gray-300">{segment.label}</span>
                                <span className="font-semibold text-gray-900 dark:text-gray-100">({segment.value})</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

// ==================== مخطط شريطي (Bar Chart) ====================
interface BarChartProps {
    data: { label: string; value: number; color?: string }[];
    height?: number;
    showValues?: boolean;
    title?: string;
    horizontal?: boolean;
    maxValue?: number;
}

export const BarChart: React.FC<BarChartProps> = ({
    data,
    height = 200,
    showValues = true,
    title,
    horizontal = false,
    maxValue
}) => {
    const max = maxValue || Math.max(...data.map(d => d.value), 1);
    const defaultColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

    if (horizontal) {
        return (
            <div className="w-full">
                {title && <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">{title}</h3>}
                <div className="space-y-3">
                    {data.map((item, index) => (
                        <div key={index} className="flex items-center gap-3">
                            <span className="w-24 text-sm text-gray-600 dark:text-gray-400 text-left truncate">{item.label}</span>
                            <div className="flex-1 h-8 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div
                                    className="h-full rounded-full transition-all duration-500 flex items-center justify-end px-2"
                                    style={{
                                        width: `${(item.value / max) * 100}%`,
                                        backgroundColor: item.color || defaultColors[index % defaultColors.length]
                                    }}
                                >
                                    {showValues && (
                                        <span className="text-white text-xs font-bold">{item.value}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="w-full">
            {title && <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 text-center">{title}</h3>}
            <div className="flex items-end justify-center gap-2" style={{ height }}>
                {data.map((item, index) => (
                    <div key={index} className="flex flex-col items-center gap-1">
                        {showValues && (
                            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{item.value}</span>
                        )}
                        <div
                            className="w-12 rounded-t-lg transition-all duration-500 hover:opacity-80"
                            style={{
                                height: `${(item.value / max) * (height - 40)}px`,
                                backgroundColor: item.color || defaultColors[index % defaultColors.length],
                                minHeight: '4px'
                            }}
                            title={`${item.label}: ${item.value}`}
                        />
                        <span className="text-xs text-gray-600 dark:text-gray-400 text-center w-16 truncate">{item.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ==================== مخطط خطي (Line Chart) ====================
interface LineChartProps {
    data: { label: string; value: number }[];
    width?: number;
    height?: number;
    color?: string;
    title?: string;
    showDots?: boolean;
    showArea?: boolean;
}

export const LineChart: React.FC<LineChartProps> = ({
    data,
    width = 400,
    height = 200,
    color = '#3b82f6',
    title,
    showDots = true,
    showArea = true
}) => {
    const padding = 40;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    const max = Math.max(...data.map(d => d.value), 1);
    const min = Math.min(...data.map(d => d.value), 0);
    const range = max - min || 1;

    const points = useMemo(() => {
        return data.map((item, index) => ({
            x: padding + (index / (data.length - 1 || 1)) * chartWidth,
            y: height - padding - ((item.value - min) / range) * chartHeight,
            ...item
        }));
    }, [data, chartWidth, chartHeight, min, range, height, padding]);

    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const areaPath = `${linePath} L ${points[points.length - 1]?.x || 0} ${height - padding} L ${padding} ${height - padding} Z`;

    return (
        <div>
            {title && <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 text-center">{title}</h3>}
            <svg width={width} height={height} className="overflow-visible">
                {/* Grid lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
                    <g key={i}>
                        <line
                            x1={padding}
                            y1={height - padding - ratio * chartHeight}
                            x2={width - padding}
                            y2={height - padding - ratio * chartHeight}
                            stroke="#e5e7eb"
                            strokeDasharray="4"
                        />
                        <text
                            x={padding - 5}
                            y={height - padding - ratio * chartHeight}
                            textAnchor="end"
                            dominantBaseline="middle"
                            fill="#9ca3af"
                            fontSize="10"
                        >
                            {Math.round(min + ratio * range)}
                        </text>
                    </g>
                ))}

                {/* Area */}
                {showArea && (
                    <path d={areaPath} fill={color} fillOpacity="0.1" />
                )}

                {/* Line */}
                <path d={linePath} fill="none" stroke={color} strokeWidth="2" />

                {/* Dots */}
                {showDots && points.map((point, index) => (
                    <g key={index}>
                        <circle
                            cx={point.x}
                            cy={point.y}
                            r="4"
                            fill={color}
                            className="cursor-pointer hover:r-6 transition-all"
                        >
                            <title>{point.label}: {point.value}</title>
                        </circle>
                    </g>
                ))}

                {/* X-axis labels */}
                {points.map((point, index) => (
                    <text
                        key={index}
                        x={point.x}
                        y={height - padding + 15}
                        textAnchor="middle"
                        fill="#6b7280"
                        fontSize="10"
                    >
                        {point.label}
                    </text>
                ))}
            </svg>
        </div>
    );
};

// ==================== بطاقة إحصائية (Stat Card) ====================
interface StatCardProps {
    title: string;
    value: number | string;
    icon?: React.ReactNode;
    trend?: { value: number; isPositive: boolean };
    color?: string;
    onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
    title,
    value,
    icon,
    trend,
    color = '#3b82f6',
    onClick
}) => {
    return (
        <div
            onClick={onClick}
            className={`p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 ${onClick ? 'cursor-pointer hover:shadow-xl transition-shadow' : ''}`}
        >
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{title}</p>
                    <p className="text-3xl font-bold" style={{ color }}>{value}</p>
                    {trend && (
                        <p className={`text-sm mt-2 flex items-center gap-1 ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                            <span>{trend.isPositive ? '↑' : '↓'}</span>
                            <span>{Math.abs(trend.value)}%</span>
                            <span className="text-gray-500 dark:text-gray-400">من الشهر الماضي</span>
                        </p>
                    )}
                </div>
                {icon && (
                    <div className="p-3 rounded-xl" style={{ backgroundColor: `${color}20` }}>
                        {icon}
                    </div>
                )}
            </div>
        </div>
    );
};

// ==================== مخطط دونات (Donut Chart) ====================
interface DonutChartProps {
    data: { label: string; value: number; color: string }[];
    size?: number;
    thickness?: number;
    centerLabel?: string;
    centerValue?: string | number;
}

export const DonutChart: React.FC<DonutChartProps> = ({
    data,
    size = 180,
    thickness = 30,
    centerLabel,
    centerValue
}) => {
    const total = useMemo(() => data.reduce((sum, item) => sum + item.value, 0), [data]);
    const radius = (size - thickness) / 2;
    const circumference = 2 * Math.PI * radius;

    let currentOffset = 0;

    return (
        <div className="relative" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="transform -rotate-90">
                {data.map((item, index) => {
                    const percentage = total > 0 ? (item.value / total) : 0;
                    const strokeDasharray = `${percentage * circumference} ${circumference}`;
                    const strokeDashoffset = -currentOffset;
                    currentOffset += percentage * circumference;

                    return (
                        <circle
                            key={index}
                            cx={size / 2}
                            cy={size / 2}
                            r={radius}
                            fill="none"
                            stroke={item.color}
                            strokeWidth={thickness}
                            strokeDasharray={strokeDasharray}
                            strokeDashoffset={strokeDashoffset}
                            className="transition-all duration-500"
                        >
                            <title>{item.label}: {item.value} ({(percentage * 100).toFixed(1)}%)</title>
                        </circle>
                    );
                })}
            </svg>

            {(centerLabel || centerValue) && (
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    {centerValue && <span className="text-2xl font-bold text-gray-800 dark:text-gray-100">{centerValue}</span>}
                    {centerLabel && <span className="text-sm text-gray-500 dark:text-gray-400">{centerLabel}</span>}
                </div>
            )}
        </div>
    );
};
