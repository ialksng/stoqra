import React, { useState } from 'react';
import { formatINR, formatIndianDate } from '../../utils/formatters.js';

export const CashFlowChart = ({ data = [], height = 260 }) => {
  const [hoverIndex, setHoverIndex] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div style={{ height: `${height}px`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '13px' }}>
        No cash flow data recorded in this period yet.
      </div>
    );
  }

  const width = 640;
  const padding = { top: 20, right: 20, bottom: 40, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxVal = Math.max(
    ...data.map((d) => Math.max(d.inflow || 0, d.outflow || 0)),
    100
  );

  const getX = (index) => {
    if (data.length <= 1) return padding.left + chartWidth / 2;
    return padding.left + (index / (data.length - 1)) * chartWidth;
  };

  const getY = (val) => {
    return padding.top + chartHeight - (val / maxVal) * chartHeight;
  };

  // Build SVG path for Inflow
  const inflowPoints = data.map((d, i) => `${getX(i)},${getY(d.inflow || 0)}`);
  const inflowLinePath = `M ${inflowPoints.join(' L ')}`;
  const inflowAreaPath = `${inflowLinePath} L ${getX(data.length - 1)},${padding.top + chartHeight} L ${getX(0)},${padding.top + chartHeight} Z`;

  // Build SVG path for Outflow
  const outflowPoints = data.map((d, i) => `${getX(i)},${getY(d.outflow || 0)}`);
  const outflowLinePath = `M ${outflowPoints.join(' L ')}`;
  const outflowAreaPath = `${outflowLinePath} L ${getX(data.length - 1)},${padding.top + chartHeight} L ${getX(0)},${padding.top + chartHeight} Z`;

  const hoveredData = hoverIndex !== null ? data[hoverIndex] : null;

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* Chart Legend */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', marginBottom: '8px', fontSize: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '10px', height: '10px', backgroundColor: '#10b981', borderRadius: '2px' }} />
          <span style={{ fontWeight: 600, color: '#047857' }}>Sales Inflow</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '10px', height: '10px', backgroundColor: '#f59e0b', borderRadius: '2px' }} />
          <span style={{ fontWeight: 600, color: '#b45309' }}>Procurement Outflow</span>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: '100%', height: 'auto', overflow: 'visible' }}
        onMouseLeave={() => setHoverIndex(null)}
      >
        <defs>
          <linearGradient id="inflowGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
          </linearGradient>
          <linearGradient id="outflowGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Horizontal Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = padding.top + chartHeight * (1 - ratio);
          const val = maxVal * ratio;
          return (
            <g key={ratio}>
              <line
                x1={padding.left}
                y1={y}
                x2={padding.left + chartWidth}
                y2={y}
                stroke="#e2e8f0"
                strokeDasharray="4 4"
              />
              <text
                x={padding.left - 8}
                y={y + 4}
                textAnchor="end"
                fontSize="10"
                fill="#94a3b8"
              >
                ₹{val >= 1000 ? `${Math.round(val / 1000)}k` : Math.round(val)}
              </text>
            </g>
          );
        })}

        {/* Outflow Area & Line */}
        <path d={outflowAreaPath} fill="url(#outflowGrad)" />
        <path d={outflowLinePath} fill="none" stroke="#f59e0b" strokeWidth="2.5" />

        {/* Inflow Area & Line */}
        <path d={inflowAreaPath} fill="url(#inflowGrad)" />
        <path d={inflowLinePath} fill="none" stroke="#10b981" strokeWidth="2.5" />

        {/* Interactive Hover Columns */}
        {data.map((d, i) => {
          const x = getX(i);
          const colWidth = Math.max(16, chartWidth / data.length);
          return (
            <rect
              key={d.date}
              x={x - colWidth / 2}
              y={padding.top}
              width={colWidth}
              height={chartHeight}
              fill="transparent"
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setHoverIndex(i)}
            />
          );
        })}

        {/* Hover Highlight Marker */}
        {hoverIndex !== null && (
          <g>
            <line
              x1={getX(hoverIndex)}
              y1={padding.top}
              x2={getX(hoverIndex)}
              y2={padding.top + chartHeight}
              stroke="#64748b"
              strokeDasharray="2 2"
              strokeWidth="1.5"
            />
            {/* Inflow Dot */}
            <circle
              cx={getX(hoverIndex)}
              cy={getY(data[hoverIndex].inflow || 0)}
              r="5"
              fill="#10b981"
              stroke="#ffffff"
              strokeWidth="2"
            />
            {/* Outflow Dot */}
            <circle
              cx={getX(hoverIndex)}
              cy={getY(data[hoverIndex].outflow || 0)}
              r="5"
              fill="#f59e0b"
              stroke="#ffffff"
              strokeWidth="2"
            />
          </g>
        )}

        {/* Date labels on bottom */}
        {data.map((d, i) => {
          if (data.length > 10 && i % Math.ceil(data.length / 6) !== 0 && i !== data.length - 1) {
            return null;
          }
          return (
            <text
              key={d.date}
              x={getX(i)}
              y={padding.top + chartHeight + 18}
              textAnchor="middle"
              fontSize="10"
              fill="#64748b"
            >
              {d.date.slice(5)}
            </text>
          );
        })}
      </svg>

      {/* Floating Tooltip */}
      {hoveredData && (
        <div
          style={{
            position: 'absolute',
            top: '10px',
            left: `${Math.min(75, Math.max(15, (getX(hoverIndex) / width) * 100))}%`,
            transform: 'translateX(-50%)',
            backgroundColor: '#0f172a',
            color: '#ffffff',
            padding: '8px 12px',
            borderRadius: '6px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2)',
            fontSize: '12px',
            pointerEvents: 'none',
            zIndex: 10,
            whiteSpace: 'nowrap',
          }}
        >
          <div style={{ fontWeight: 700, color: '#cbd5e1', marginBottom: '4px' }}>
            {formatIndianDate(hoveredData.date)}
          </div>
          <div style={{ color: '#34d399' }}>
            Inflow: <strong>{formatINR(hoveredData.inflow)}</strong>
          </div>
          <div style={{ color: '#fbbf24' }}>
            Outflow: <strong>{formatINR(hoveredData.outflow)}</strong>
          </div>
          <div style={{ color: hoveredData.netFlow >= 0 ? '#6ee7b7' : '#f87171', borderTop: '1px solid #334155', marginTop: '4px', paddingTop: '4px' }}>
            Net Flow: <strong>{formatINR(hoveredData.netFlow)}</strong>
          </div>
        </div>
      )}
    </div>
  );
};

export default CashFlowChart;
