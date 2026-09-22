import React, { useState } from 'react';
import { formatINR } from '../../utils/formatters.js';

export const ParetoChart = ({ items = [], height = 240 }) => {
  const [hoverIndex, setHoverIndex] = useState(null);

  const displayItems = items.slice(0, 15);
  if (displayItems.length === 0) {
    return (
      <div style={{ height: `${height}px`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '13px' }}>
        No items available for Pareto ABC analysis.
      </div>
    );
  }

  const width = 640;
  const padding = { top: 20, right: 40, bottom: 40, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxVal = Math.max(...displayItems.map((i) => i.valuation || 0), 100);

  const barWidth = Math.max(10, (chartWidth / displayItems.length) * 0.6);

  const getBarX = (i) => {
    const slot = chartWidth / displayItems.length;
    return padding.left + i * slot + (slot - barWidth) / 2;
  };

  const getPointX = (i) => {
    const slot = chartWidth / displayItems.length;
    return padding.left + i * slot + slot / 2;
  };

  const getYValue = (val) => {
    return padding.top + chartHeight - (val / maxVal) * chartHeight;
  };

  const getYPercent = (pct) => {
    return padding.top + chartHeight - (pct / 100) * chartHeight;
  };

  // Build cumulative line path
  const linePoints = displayItems.map((item, i) => `${getPointX(i)},${getYPercent(item.cumulativePercent || 0)}`);
  const curvePath = `M ${linePoints.join(' L ')}`;

  const hoveredItem = hoverIndex !== null ? displayItems[hoverIndex] : null;

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* Legend & Threshold notes */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px', marginBottom: '8px', fontSize: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '10px', height: '10px', backgroundColor: '#2563eb', borderRadius: '2px' }} />
          <span style={{ fontWeight: 600, color: '#1e40af' }}>SKU Valuation (₹)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '10px', height: '3px', backgroundColor: '#f97316' }} />
          <span style={{ fontWeight: 600, color: '#c2410c' }}>Cumulative %</span>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: '100%', height: 'auto', overflow: 'visible' }}
        onMouseLeave={() => setHoverIndex(null)}
      >
        {/* 80% Class A Guide line */}
        <line
          x1={padding.left}
          y1={getYPercent(80)}
          x2={padding.left + chartWidth}
          y2={getYPercent(80)}
          stroke="#f97316"
          strokeDasharray="4 4"
          strokeWidth="1.2"
        />
        <text
          x={padding.left + chartWidth + 5}
          y={getYPercent(80) + 4}
          fontSize="10"
          fontWeight="700"
          fill="#ea580c"
        >
          80% (A)
        </text>

        {/* 95% Class B Guide line */}
        <line
          x1={padding.left}
          y1={getYPercent(95)}
          x2={padding.left + chartWidth}
          y2={getYPercent(95)}
          stroke="#ca8a04"
          strokeDasharray="4 4"
          strokeWidth="1"
        />
        <text
          x={padding.left + chartWidth + 5}
          y={getYPercent(95) + 4}
          fontSize="10"
          fontWeight="600"
          fill="#ca8a04"
        >
          95% (B)
        </text>

        {/* Bars */}
        {displayItems.map((item, i) => {
          const barHeight = (item.valuation / maxVal) * chartHeight;
          const isA = item.abcClass === 'A';
          const isB = item.abcClass === 'B';
          const barColor = isA ? '#2563eb' : isB ? '#3b82f6' : '#93c5fd';

          return (
            <rect
              key={item.sku}
              x={getBarX(i)}
              y={padding.top + chartHeight - barHeight}
              width={barWidth}
              height={barHeight}
              fill={barColor}
              rx="2"
              style={{ cursor: 'pointer', opacity: hoverIndex === null || hoverIndex === i ? 1 : 0.6 }}
              onMouseEnter={() => setHoverIndex(i)}
            />
          );
        })}

        {/* Cumulative % Curve Line */}
        <path d={curvePath} fill="none" stroke="#f97316" strokeWidth="2.5" />

        {/* Points on Curve */}
        {displayItems.map((item, i) => (
          <circle
            key={`pt-${item.sku}`}
            cx={getPointX(i)}
            cy={getYPercent(item.cumulativePercent || 0)}
            r={hoverIndex === i ? '6' : '3.5'}
            fill="#f97316"
            stroke="#ffffff"
            strokeWidth="1.5"
            style={{ cursor: 'pointer' }}
            onMouseEnter={() => setHoverIndex(i)}
          />
        ))}

        {/* X-axis labels (SKU or name abbreviation) */}
        {displayItems.map((item, i) => (
          <text
            key={`lbl-${item.sku}`}
            x={getPointX(i)}
            y={padding.top + chartHeight + 16}
            textAnchor="middle"
            fontSize="9"
            fill="#64748b"
            fontWeight={item.abcClass === 'A' ? '700' : '400'}
          >
            {item.sku.length > 7 ? `${item.sku.slice(0, 6)}..` : item.sku}
          </text>
        ))}
      </svg>

      {/* Hover Tooltip */}
      {hoveredItem && (
        <div
          style={{
            position: 'absolute',
            top: '10px',
            left: `${Math.min(80, Math.max(20, (getPointX(hoverIndex) / width) * 100))}%`,
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
          <div style={{ fontWeight: 700, color: '#f8fafc' }}>
            [{hoveredItem.sku}] {hoveredItem.name}
          </div>
          <div style={{ color: '#93c5fd', marginTop: '2px' }}>
            Valuation: <strong>{formatINR(hoveredItem.valuation)}</strong>
          </div>
          <div style={{ color: '#fed7aa' }}>
            Cumulative Value: <strong>{hoveredItem.cumulativePercent}%</strong>
          </div>
          <div style={{ marginTop: '2px' }}>
            Class:{' '}
            <span
              style={{
                fontWeight: 700,
                color: hoveredItem.abcClass === 'A' ? '#4ade80' : hoveredItem.abcClass === 'B' ? '#fde047' : '#94a3b8',
              }}
            >
              Category {hoveredItem.abcClass}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParetoChart;
