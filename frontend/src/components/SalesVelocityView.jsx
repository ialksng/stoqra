import React from 'react';
import { Activity, Flame, IndianRupee } from 'lucide-react';
import { formatINR, formatIndianNumber, formatIndianDate } from '../utils/formatters.js';

export const SalesVelocityView = ({ velocityData, days, setDays, loading }) => {
  const summary = velocityData?.summary || {
    totalUnitsSold: 0,
    totalRevenue: 0,
    averageDailyBurnRate: 0,
    activeSkusWithSales: 0,
  };

  const items = velocityData?.items || [];

  return (
    <div>
      {/* Velocity Summary Grid */}
      <div className="cards-grid" style={{ marginBottom: '20px' }}>
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Period Revenue (INR)</span>
            <IndianRupee size={20} color="#10b981" />
          </div>
          <div className="metric-value">{formatINR(summary.totalRevenue)}</div>
          <div style={{ fontSize: '13px', color: '#64748b', marginTop: '6px' }}>
            Generated across {formatIndianNumber(summary.activeSkusWithSales)} active product SKUs
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Total Units Sold</span>
            <Activity size={20} color="#2563eb" />
          </div>
          <div className="metric-value">{formatIndianNumber(summary.totalUnitsSold)}</div>
          <div style={{ fontSize: '13px', color: '#64748b', marginTop: '6px' }}>
            Units depleted over {days} days
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Daily Burn Rate</span>
            <Flame size={20} color="#f59e0b" />
          </div>
          <div className="metric-value">{summary.averageDailyBurnRate} <span style={{ fontSize: '16px', fontWeight: 500 }}>units/day</span></div>
          <div style={{ fontSize: '13px', color: '#64748b', marginTop: '6px' }}>
            Aggregate catalog consumption velocity
          </div>
        </div>
      </div>

      {/* Velocity Table */}
      <div className="table-card">
        <div className="table-header-bar">
          <div style={{ fontWeight: 700, fontSize: '16px' }}>
            Product Sales Velocity & Run-out Estimates
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '13px', color: '#64748b' }}>Timeframe:</span>
            <select
              className="form-control"
              style={{ width: 'auto', padding: '6px 12px' }}
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
            >
              <option value={7}>Last 7 Days</option>
              <option value={14}>Last 14 Days</option>
              <option value={30}>Last 30 Days</option>
              <option value={60}>Last 60 Days</option>
            </select>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>SKU</th>
                <th>Product Name</th>
                <th>Current Stock</th>
                <th>Units Sold</th>
                <th>Period Revenue (₹)</th>
                <th>Daily Burn Rate</th>
                <th>Days Remaining</th>
                <th>Estimated Run-out</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                    Computing sales velocity metrics...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                    No sales recorded during this {days}-day timeframe.
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const daysRemaining = item.daysOfInventoryRemaining;
                  const isImminentRunOut = typeof daysRemaining === 'number' && daysRemaining <= 7;

                  return (
                    <tr key={item.sku}>
                      <td>
                        <strong>{item.sku}</strong>
                      </td>
                      <td>{item.name}</td>
                      <td>{formatIndianNumber(item.currentStock)} units</td>
                      <td>
                        <strong>{formatIndianNumber(item.totalUnitsSold)}</strong>
                      </td>
                      <td>{formatINR(item.totalRevenue)}</td>
                      <td>
                        <span style={{ color: '#d97706', fontWeight: 600 }}>
                          {item.dailyBurnRate} /day
                        </span>
                      </td>
                      <td>
                        {typeof daysRemaining === 'number' ? (
                          <span
                            className={`badge ${
                              isImminentRunOut
                                ? 'badge-danger'
                                : daysRemaining <= 15
                                ? 'badge-warning'
                                : 'badge-neutral'
                            }`}
                          >
                            {daysRemaining} days
                          </span>
                        ) : (
                          <span className="badge badge-neutral">No burn</span>
                        )}
                      </td>
                      <td>
                        <span style={{ fontSize: '13px', color: isImminentRunOut ? '#dc2626' : '#64748b' }}>
                          {item.estimatedRunOutDate ? formatIndianDate(item.estimatedRunOutDate) : 'Sufficient stock'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SalesVelocityView;
