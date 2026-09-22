import React, { useState } from 'react';
import { formatIndianNumber } from '../../utils/formatters.js';

const DEFAULT_COLORS = ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'];

export const DonutChart = ({
  data = [],
  title = '',
  totalLabel = 'Total',
  valueFormatter = (v) => formatIndianNumber(v),
  size = 200,
  innerRadius = 60,
  strokeWidth = 24,
}) => {
  const [hoverIndex, setHoverIndex] = useState(null);

  const cleanData = data.filter((d) => (Number(d.value) || 0) > 0);
  const total = cleanData.reduce((acc, d) => acc + (Number(d.value) || 0), 0);

  if (cleanData.length === 0 || total === 0) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
        No distribution data available.
      </div>
    );
  }

  const radius = innerRadius + strokeWidth / 2;
  const circumference = 2 * Math.PI * radius;
  let accumulatedPercent = 0;

  const segments = cleanData.map((item, idx) => {
    const val = Number(item.value) || 0;
    const percent = val / total;
    const strokeDasharray = `${percent * circumference} ${circumference}`;
    const strokeDashoffset = -accumulatedPercent * circumference;
    accumulatedPercent += percent;

    return {
      ...item,
      percent: Math.round(percent * 1000) / 10,
      color: item.color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length],
      strokeDasharray,
      strokeDashoffset,
    };
  });

  const activeSegment = hoverIndex !== null ? segments[hoverIndex] : null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}
        >
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="#f1f5f9"
            strokeWidth={strokeWidth}
          />

          {/* Slices */}
          {segments.map((seg, idx) => {
            const isHovered = hoverIndex === idx;
            return (
              <circle
                key={seg.label}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="transparent"
                stroke={seg.color}
                strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                strokeDasharray={seg.strokeDasharray}
                strokeDashoffset={seg.strokeDashoffset}
                strokeLinecap="butt"
                style={{
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  opacity: hoverIndex === null || isHovered ? 1 : 0.6,
                }}
                onMouseEnter={() => setHoverIndex(idx)}
                onMouseLeave={() => setHoverIndex(null)}
              />
            );
          })}
        </svg>

        {/* Center Text Info */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            textAlign: 'center',
            padding: '10px',
          }}
        >
          {activeSegment ? (
            <>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {activeSegment.label}
              </span>
              <span style={{ fontSize: '16px', fontWeight: 700, color: activeSegment.color }}>
                {activeSegment.percent}%
              </span>
              <span style={{ fontSize: '11px', color: '#0f172a', fontWeight: 600 }}>
                {valueFormatter(activeSegment.value)}
              </span>
            </>
          ) : (
            <>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>{totalLabel}</span>
              <span style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                {valueFormatter(total)}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '160px' }}>
        {segments.map((seg, idx) => (
          <div
            key={seg.label}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              fontSize: '12px',
              cursor: 'pointer',
              padding: '4px 6px',
              borderRadius: '4px',
              backgroundColor: hoverIndex === idx ? '#f1f5f9' : 'transparent',
              transition: 'background-color 0.15s',
            }}
            onMouseEnter={() => setHoverIndex(idx)}
            onMouseLeave={() => setHoverIndex(null)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
              <span
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '2px',
                  backgroundColor: seg.color,
                  flexShrink: 0,
                }}
              />
              <span style={{ color: '#334155', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {seg.label}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
              <span style={{ color: '#64748b', fontSize: '11px' }}>{seg.percent}%</span>
              <span style={{ fontWeight: 600, color: '#0f172a' }}>{valueFormatter(seg.value)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DonutChart;
