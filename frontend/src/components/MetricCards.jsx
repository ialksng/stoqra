import React from 'react';
import { IndianRupee, Package, AlertTriangle, AlertCircle, TrendingDown } from 'lucide-react';
import { formatINR, formatIndianNumber } from '../utils/formatters.js';

export const MetricCards = ({ healthData, onFilterLowStock }) => {
  const metrics = healthData?.metrics || {
    totalSkus: 0,
    totalStockUnits: 0,
    totalValuation: 0,
    outOfStockCount: 0,
    lowStockCount: 0,
    healthyStockCount: 0,
  };

  const criticalItems = healthData?.criticalItems || [];

  return (
    <div>
      <div className="cards-grid">
        {/* Valuation Card */}
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Total Valuation (INR)</span>
            <IndianRupee size={20} color="#2563eb" />
          </div>
          <div className="metric-value">{formatINR(metrics.totalValuation)}</div>
          <div style={{ fontSize: '13px', color: '#64748b', marginTop: '6px' }}>
            Across {formatIndianNumber(metrics.totalStockUnits)} total inventory units
          </div>
        </div>

        {/* Total SKUs Card */}
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Active SKUs</span>
            <Package size={20} color="#2563eb" />
          </div>
          <div className="metric-value">{formatIndianNumber(metrics.totalSkus)}</div>
          <div style={{ fontSize: '13px', color: '#64748b', marginTop: '6px' }}>
            Catalog products tracked
          </div>
        </div>

        {/* Low Stock Card */}
        <div
          className="metric-card warning"
          style={{ cursor: metrics.lowStockCount > 0 ? 'pointer' : 'default' }}
          onClick={() => metrics.lowStockCount > 0 && onFilterLowStock && onFilterLowStock()}
          title="Click to filter low stock items"
        >
          <div className="metric-header">
            <span className="metric-title">Low Stock SKUs</span>
            <AlertTriangle size={20} color="#f59e0b" />
          </div>
          <div className="metric-value" style={{ color: '#d97706' }}>
            {formatIndianNumber(metrics.lowStockCount)}
          </div>
          <div style={{ fontSize: '13px', color: '#b45309', marginTop: '6px' }}>
            At or below reorder threshold
          </div>
        </div>

        {/* Out of Stock Card */}
        <div className="metric-card danger">
          <div className="metric-header">
            <span className="metric-title">Out of Stock</span>
            <AlertCircle size={20} color="#ef4444" />
          </div>
          <div className="metric-value" style={{ color: '#dc2626' }}>
            {formatIndianNumber(metrics.outOfStockCount)}
          </div>
          <div style={{ fontSize: '13px', color: '#b91c1c', marginTop: '6px' }}>
            Immediate stock replenishment needed
          </div>
        </div>
      </div>

      {/* Reorder Alerts Banner */}
      {criticalItems.length > 0 && (
        <div className="alert-banner">
          <TrendingDown size={22} color="#b45309" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: '#92400e', marginBottom: '4px' }}>
              Action Required: {criticalItems.length} item(s) below reorder threshold
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
              {criticalItems.slice(0, 6).map((item) => (
                <span
                  key={item._id}
                  className={`badge ${item.currentStock === 0 ? 'badge-danger' : 'badge-warning'}`}
                >
                  <strong>{item.sku}</strong> ({item.name}): {item.currentStock}/{item.reorderLevel} units
                  (Deficit: -{item.deficitUnits})
                </span>
              ))}
              {criticalItems.length > 6 && (
                <span className="badge badge-neutral">+{criticalItems.length - 6} more</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MetricCards;
