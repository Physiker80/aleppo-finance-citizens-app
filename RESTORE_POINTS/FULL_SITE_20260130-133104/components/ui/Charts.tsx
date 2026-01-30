import React from 'react';

export type ChartDatum = {
  label: string;
  value: number;
  color?: string;
};

type DonutChartProps = {
  data: ChartDatum[];
  size?: number; // total SVG size
  strokeWidth?: number;
  centerLabel?: string;
  className?: string;
  showLegend?: boolean;
};

export const DonutChart: React.FC<DonutChartProps> = ({
  data,
  size = 160,
  strokeWidth = 18,
  centerLabel,
  className,
  showLegend = true,
}) => {
  const total = data.reduce((s, d) => s + (Number.isFinite(d.value) ? d.value : 0), 0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const segments = total > 0
    ? data.map((d) => ({ ...d, pct: d.value / total }))
    : [];

  let cumulative = 0;

  return (
    <div className={className}>
      <div className="flex items-center justify-center">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={centerLabel || 'مخطط دائري'}>
          <g transform={`translate(${size / 2} ${size / 2}) rotate(-90)`}>
            {/* الخلفية */}
            <circle r={radius} cx={0} cy={0} fill="transparent" stroke="currentColor" opacity={0.12} strokeWidth={strokeWidth} />
            {segments.map((seg, idx) => {
              const dash = Math.max(0, seg.pct) * circumference;
              const gap = circumference - dash;
              const dashArray = `${dash} ${gap}`;
              const rotation = (cumulative / total) * 360;
              cumulative += seg.value;
              return (
                <circle
                  key={idx}
                  r={radius}
                  cx={0}
                  cy={0}
                  fill="transparent"
                  stroke={seg.color || '#6b7280'}
                  strokeWidth={strokeWidth}
                  strokeDasharray={dashArray}
                  strokeLinecap="butt"
                  transform={`rotate(${rotation})`}
                />
              );
            })}
          </g>
          {/* تسميات النِسَب على القطع */}
          {(() => {
            if (segments.length === 0) return null;
            const labelThreshold = 0.05; // 5%
            let acc = 0;
            const labels = segments.map((seg, idx) => {
              const pct = seg.pct;
              const show = pct >= labelThreshold;
              const startAngle = acc * 360 - 90; // ابدأ من الأعلى
              const midAngle = startAngle + (pct * 360) / 2;
              acc += seg.pct;
              if (!show) return null;
              const rad = (midAngle * Math.PI) / 180;
              const labelRadius = radius; // على مسار الدائرة تقريباً
              const x = size / 2 + (labelRadius - strokeWidth / 2) * Math.cos(rad);
              const y = size / 2 + (labelRadius - strokeWidth / 2) * Math.sin(rad);
              const percentText = `${Math.round(pct * 100)}%`;
              return (
                <text
                  key={`lbl-${idx}`}
                  x={x}
                  y={y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="fill-gray-800 dark:fill-gray-100"
                  style={{ fontSize: 10, fontWeight: 700 }}
                >
                  {percentText}
                </text>
              );
            });
            return <g>{labels}</g>;
          })()}
          {/* الوسم الأوسط */}
          <g transform={`translate(${size / 2} ${size / 2})`}>
            <text textAnchor="middle" dominantBaseline="central" className="fill-gray-900 dark:fill-gray-100" style={{ fontSize: 14, fontWeight: 700 }}>
              {total > 0 ? total : 'لا توجد بيانات'}
            </text>
            {centerLabel && total > 0 && (
              <text y={18} textAnchor="middle" className="fill-gray-500 dark:fill-gray-400" style={{ fontSize: 10 }}>
                {centerLabel}
              </text>
            )}
          </g>
        </svg>
      </div>
      {showLegend && (
        <div className="mt-3 space-y-1">
          {data.map((d, i) => {
            const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
            return (
              <div key={i} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="inline-block w-3 h-3 rounded-full" style={{ background: d.color || '#6b7280' }} />
                  <span className="text-gray-800 dark:text-gray-200">{d.label}</span>
                </div>
                <div className="text-gray-600 dark:text-gray-400">
                  {d.value} <span className="mx-1">•</span> {pct}%
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

type BarChartProps = {
  data: ChartDatum[];
  max?: number;
  className?: string;
  barHeight?: number;
};

export const BarChart: React.FC<BarChartProps> = ({ data, max, className, barHeight = 16 }) => {
  const safeData = data.filter(d => Number.isFinite(d.value));
  const m = max ?? (safeData.length > 0 ? Math.max(...safeData.map(d => d.value)) : 0);
  if (safeData.length === 0 || m <= 0) {
    return <div className={`text-center text-sm text-gray-600 dark:text-gray-400 ${className || ''}`}>لا توجد بيانات متاحة</div>;
  }
  return (
    <div className={className}>
      <div className="space-y-2">
        {safeData.map((d, i) => {
          const pct = Math.max(0, Math.min(100, (d.value / m) * 100));
          return (
            <div key={i} className="grid grid-cols-[1fr_auto] items-center gap-3">
              <div>
                <div className="text-xs mb-1 text-gray-700 dark:text-gray-300">{d.label}</div>
                <div className="w-full bg-gray-200/50 dark:bg-gray-700/50 rounded-full overflow-hidden">
                  <div
                    className="rounded-full transition-all"
                    style={{ width: `${pct}%`, height: barHeight, background: d.color || 'var(--bar-color, #06b6d4)' }}
                  />
                </div>
              </div>
              <div className="text-sm text-gray-700 dark:text-gray-300 tabular-nums">{d.value}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Simple responsive LineChart using SVG
type LineChartProps = {
  data: ChartDatum[]; // x labels in label, y in value
  className?: string;
  height?: number;
  stroke?: string;
  // Optional overlay series (e.g., moving average) rendered as a dashed line
  overlay?: ChartDatum[];
  overlayStroke?: string;
};

export const LineChart: React.FC<LineChartProps> = ({ data, className, height = 160, stroke = '#0ea5e9', overlay, overlayStroke = '#22c55e' }) => {
  const safe = data.filter(d => Number.isFinite(d.value));
  const overlaySafe = (overlay || []).filter(d => Number.isFinite(d.value));
  const max = Math.max(
    safe.length > 0 ? Math.max(...safe.map(d => d.value)) : 0,
    overlaySafe.length > 0 ? Math.max(...overlaySafe.map(d => d.value)) : 0
  );
  const width = 560; // fixed width for simplicity (container can scroll horizontally if needed)
  if (safe.length === 0 || max <= 0) {
    return <div className={`text-center text-sm text-gray-600 dark:text-gray-400 ${className || ''}`}>لا توجد بيانات متاحة</div>;
  }
  const pad = 24;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  const stepX = innerW / Math.max(1, safe.length - 1);
  const points = safe.map((d, i) => {
    const x = pad + i * stepX;
    const y = pad + (1 - (d.value / max)) * innerH;
    return `${x},${y}`;
  }).join(' ');
  // overlay points (assume aligned order; if not, we still render proportionally)
  const overlayPoints = overlaySafe.length > 0 ? overlaySafe.map((d, i) => {
    const x = pad + i * stepX; // align with base if lengths match
    const y = pad + (1 - (d.value / max)) * innerH;
    return `${x},${y}`;
  }).join(' ') : '';

  return (
    <div className={className}>
      <div className="overflow-x-auto">
        <svg width={width} height={height} role="img" aria-label="مخطط خطي">
          <rect x={0} y={0} width={width} height={height} fill="none" />
          {/* Axes */}
          <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} stroke="#9ca3af" strokeWidth={1} />
          <line x1={pad} y1={pad} x2={pad} y2={height - pad} stroke="#9ca3af" strokeWidth={1} />
          {/* Line path */}
          <polyline fill="none" stroke={stroke} strokeWidth={2} points={points} />
          {/* Dots */}
          {safe.map((d, i) => {
            const x = pad + i * stepX;
            const y = pad + (1 - (d.value / max)) * innerH;
            return <circle key={i} cx={x} cy={y} r={3} fill={stroke} />
          })}
          {/* Overlay (e.g., Moving Average) */}
          {overlaySafe.length > 0 && (
            <>
              <polyline fill="none" stroke={overlayStroke} strokeWidth={2} strokeDasharray="6 4" points={overlayPoints} />
              {overlaySafe.map((d, i) => {
                const x = pad + i * stepX;
                const y = pad + (1 - (d.value / max)) * innerH;
                return <circle key={`ov-${i}`} cx={x} cy={y} r={2.5} fill={overlayStroke} />
              })}
            </>
          )}
        </svg>
      </div>
    </div>
  );
};

// Stacked bar chart: categories on X, multiple series stacked per category
type StackedBarSeries = { name: string; color: string; values: number[] };
type StackedBarChartProps = {
  categories: string[]; // X labels
  series: StackedBarSeries[]; // Each values.length === categories.length
  className?: string;
  height?: number;
};

export const StackedBarChart: React.FC<StackedBarChartProps> = ({ categories, series, className, height = 200 }) => {
  if (!categories?.length || !series?.length) {
    return <div className={`text-center text-sm text-gray-600 dark:text-gray-400 ${className || ''}`}>لا توجد بيانات متاحة</div>;
  }
  const width = Math.max(560, categories.length * 40 + 80);
  const pad = 28; const innerW = width - pad * 2; const innerH = height - pad * 2;
  // Determine max stacked sum per category
  const sums = categories.map((_, idx) => series.reduce((s, ser) => s + (Number(ser.values[idx]) || 0), 0));
  const max = Math.max(...sums, 0);
  if (max <= 0) {
    return <div className={`text-center text-sm text-gray-600 dark:text-gray-400 ${className || ''}`}>لا توجد بيانات متاحة</div>;
  }
  const barW = innerW / categories.length * 0.6; // 60% of slot
  const slotW = innerW / categories.length;

  return (
    <div className={className}>
      <div className="overflow-x-auto">
        <svg width={width} height={height} role="img" aria-label="مخطط أعمدة متراكمة">
          {/* Axis */}
          <line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} stroke="#9ca3af" strokeWidth={1} />
          <line x1={pad} y1={pad} x2={pad} y2={height - pad} stroke="#9ca3af" strokeWidth={1} />
          {/* Bars */}
          {categories.map((cat, i) => {
            const x = pad + i * slotW + (slotW - barW) / 2;
            let accHeight = 0;
            const stackRects = series.map((ser, si) => {
              const val = Math.max(0, Number(ser.values[i]) || 0);
              const h = (val / max) * innerH;
              const y = height - pad - accHeight - h;
              accHeight += h;
              return <rect key={si} x={x} y={y} width={barW} height={h} fill={ser.color} rx={2} />
            });
            return (
              <g key={i}>
                {stackRects}
                {/* x labels */}
                <text x={x + barW / 2} y={height - pad + 14} textAnchor="middle" className="fill-gray-700 dark:fill-gray-300" style={{ fontSize: 10 }}>{cat}</text>
              </g>
            );
          })}
          {/* Legend */}
          {series.map((s, i) => (
            <g key={i} transform={`translate(${pad + i * 120}, ${pad - 10})`}>
              <rect x={0} y={-8} width={10} height={10} fill={s.color} rx={2} />
              <text x={16} y={0} className="fill-gray-700 dark:fill-gray-300" style={{ fontSize: 10 }}>{s.name}</text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
};
