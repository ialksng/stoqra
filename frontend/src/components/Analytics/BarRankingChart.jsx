import React from 'react';
import { formatINR } from '../../utils/formatters.js';

export const BarRankingChart = ({
  items = [],
  titleKey = 'name',
  valueKey = 'value',
  secondaryKey = 'subtitle',
  valueFormatter = (v) => formatINR(v),
  color = '#2563eb',
  maxItems = 8,
}) => {
  const displayItems = items.slice(0, maxItems);
  const maxVal = Math.max(...displayItems.map((i) => Number(i[valueKey]) || 0), 1);

  if (displayItems.length === 0) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
        No ranking data available.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {displayItems.map((item, idx) => {
        const val = Number(item[valueKey]) || 0;
        const widthPercent = Math.max(3, Math.min(100, (val / maxVal) * 100));

        return (
          <div key={item._id || item.sku || idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                <span
                  style={{
                    width: '18px',
                    height: '18px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: idx === 0 ? '#fef3c7' : idx === 1 ? '#e2e8f0' : idx === 2 ? '#ffedd5' : '#f1f5f9',
                    color: idx === 0 ? '#b45309' : idx === 1 ? '#475569' : idx === 2 ? '#c2410c' : '#64748b',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {idx + 1}
                </span>
                <span style={{ fontWeight: 600, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item[titleKey]}
                </span>
                {item[secondaryKey] && (
                  <span style={{ fontSize: '11px', color: '#94a3b8', flexShrink: 0 }}>
                    ({item[secondaryKey]})
                  </span>
                )}
              </div>
              <div style={{ fontWeight: 700, color: '#0f172a', flexShrink: 0 }}>
                {valueFormatter(val)}
              </div>
            </div>

            {/* Bar Track */}
            <div
              style={{
                width: '100%',
                height: '8px',
                backgroundColor: '#f1f5f9',
                borderRadius: '4px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${widthPercent}%`,
                  height: '100%',
                  backgroundColor: color,
                  borderRadius: '4px',
                  transition: 'width 0.4s ease-out',
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default BarRankingChart;
