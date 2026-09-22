import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  Activity,
  Layers,
  Truck,
  ShoppingCart,
  PieChart,
  DollarSign,
  AlertTriangle,
  RefreshCw,
  FileSpreadsheet,
  IndianRupee,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Flame,
  Image as ImageIcon,
  X,
} from 'lucide-react';
import { fetchAnalyticsDashboard } from '../services/api.js';
import { formatINR, formatIndianNumber, formatIndianDate } from '../utils/formatters.js';
import { exportComprehensiveAnalyticsToExcel } from '../utils/excelExport.js';
import CashFlowChart from './Analytics/CashFlowChart.jsx';
import DonutChart from './Analytics/DonutChart.jsx';
import BarRankingChart from './Analytics/BarRankingChart.jsx';
import ParetoChart from './Analytics/ParetoChart.jsx';

export const AnalyticsDashboardView = () => {
  const [days, setDays] = useState(30);
  const [subTab, setSubTab] = useState('overview'); // 'overview' | 'categories' | 'suppliers' | 'orders' | 'abc' | 'margins' | 'urgency'
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [abcFilter, setAbcFilter] = useState('ALL'); // 'ALL' | 'A' | 'B' | 'C'
  const [activeProofModal, setActiveProofModal] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchAnalyticsDashboard(days);
      setAnalytics(res.data);
    } catch (err) {
      console.error('Failed to load comprehensive analytics:', err);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const kpi = analytics?.kpi || {
    totalValuation: 0,
    totalStockUnits: 0,
    totalSkus: 0,
    outOfStockCount: 0,
    lowStockCount: 0,
    healthyStockCount: 0,
    periodRevenue: 0,
    periodUnitsSold: 0,
    periodProcurementSpend: 0,
    netCashFlow: 0,
    realizedGrossMargin: 0,
    grossMarginPercent: 0,
    salesCount: 0,
    invoiceCount: 0,
  };

  const handleExportExcel = () => {
    if (!analytics) return;
    exportComprehensiveAnalyticsToExcel({ analytics, days });
  };

  // Filtered ABC items
  const filteredAbcItems = (analytics?.abc?.items || []).filter((item) => {
    const matchesSearch =
      searchTerm === '' ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.category && item.category.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesClass = abcFilter === 'ALL' || item.abcClass === abcFilter;
    return matchesSearch && matchesClass;
  });

  // Filtered Margins
  const filteredMargins = (analytics?.margins || []).filter((item) => {
    return (
      searchTerm === '' ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.category && item.category.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });

  // Filtered Orders
  const filteredOrders = (analytics?.recentOrders || []).filter((order) => {
    return (
      searchTerm === '' ||
      order.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.customerName && order.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (order.paymentMode && order.paymentMode.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });

  // Stock Health Donut Data
  const stockHealthDonutData = [
    { label: 'Healthy Stock', value: kpi.healthyStockCount, color: '#10b981' },
    { label: 'Low Stock', value: kpi.lowStockCount, color: '#f59e0b' },
    { label: 'Out of Stock', value: kpi.outOfStockCount, color: '#ef4444' },
  ];

  // Category Donut Data
  const categoryDonutData = (analytics?.categories || []).map((cat, idx) => ({
    label: cat.category,
    value: cat.totalValuation,
    color: ['#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'][idx % 7],
  }));

  // Payment Mode Donut Data
  const paymentModeDonutData = (analytics?.paymentModes || [])
    .filter((p) => p.total > 0)
    .map((p, idx) => ({
      label: p.mode,
      value: p.total,
      color: ['#10b981', '#f59e0b', '#2563eb', '#8b5cf6', '#ef4444', '#64748b'][idx % 6],
    }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Controls & Timeframe Selector Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          backgroundColor: '#ffffff',
          padding: '14px 20px',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ fontWeight: 800, fontSize: '18px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={22} color="#2563eb" />
            Executive Analytics Hub
          </div>
          <span className="badge badge-neutral" style={{ fontSize: '11px' }}>
            Multi-Dimensional BI
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Timeframe Buttons */}
          <div style={{ display: 'flex', backgroundColor: '#f1f5f9', padding: '3px', borderRadius: '8px', gap: '2px' }}>
            {[
              { val: 7, label: '7 Days' },
              { val: 14, label: '14 Days' },
              { val: 30, label: '30 Days' },
              { val: 90, label: '90 Days' },
              { val: 365, label: 'All Time' },
            ].map((t) => (
              <button
                key={t.val}
                type="button"
                onClick={() => setDays(t.val)}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: 'none',
                  backgroundColor: days === t.val ? '#ffffff' : 'transparent',
                  color: days === t.val ? 'var(--primary)' : '#64748b',
                  boxShadow: days === t.val ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          <button
            className="btn btn-secondary btn-sm"
            onClick={handleExportExcel}
            disabled={loading || !analytics}
            title="Export complete analytics suite to Excel (.xlsx)"
          >
            <FileSpreadsheet size={14} />
            Export Analytics
          </button>

          <button className="btn btn-secondary btn-sm" onClick={loadData} title="Refresh Analytics">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* High-Level Executive KPI Strip */}
      <div className="cards-grid">
        {/* Total Catalog Valuation */}
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Catalog Valuation</span>
            <IndianRupee size={18} color="#2563eb" />
          </div>
          <div className="metric-value">{formatINR(kpi.totalValuation)}</div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
            {formatIndianNumber(kpi.totalStockUnits)} units across {formatIndianNumber(kpi.totalSkus)} SKUs
          </div>
        </div>

        {/* Period Sales Revenue */}
        <div className="metric-card success">
          <div className="metric-header">
            <span className="metric-title">Period Sales (Inflow)</span>
            <ArrowUpRight size={18} color="#10b981" />
          </div>
          <div className="metric-value" style={{ color: '#059669' }}>
            {formatINR(kpi.periodRevenue)}
          </div>
          <div style={{ fontSize: '12px', color: '#047857', marginTop: '4px' }}>
            {formatIndianNumber(kpi.periodUnitsSold)} units sold in {kpi.salesCount} orders
          </div>
        </div>

        {/* Realized Gross Profit & Margin */}
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Realized Gross Margin</span>
            <DollarSign size={18} color="#8b5cf6" />
          </div>
          <div className="metric-value" style={{ color: '#7c3aed' }}>
            {formatINR(kpi.realizedGrossMargin)}
          </div>
          <div style={{ fontSize: '12px', color: '#6d28d9', marginTop: '4px' }}>
            {kpi.grossMarginPercent}% gross margin on sales
          </div>
        </div>

        {/* Procurement Spend */}
        <div className="metric-card warning">
          <div className="metric-header">
            <span className="metric-title">Procurement (Outflow)</span>
            <ArrowDownRight size={18} color="#f59e0b" />
          </div>
          <div className="metric-value" style={{ color: '#d97706' }}>
            {formatINR(kpi.periodProcurementSpend)}
          </div>
          <div style={{ fontSize: '12px', color: '#b45309', marginTop: '4px' }}>
            Across {kpi.invoiceCount} supplier invoices
          </div>
        </div>

        {/* Net Cash Flow */}
        <div className={`metric-card ${kpi.netCashFlow >= 0 ? 'success' : 'danger'}`}>
          <div className="metric-header">
            <span className="metric-title">Net Operational Flow</span>
            <Activity size={18} color={kpi.netCashFlow >= 0 ? '#10b981' : '#ef4444'} />
          </div>
          <div className="metric-value" style={{ color: kpi.netCashFlow >= 0 ? '#059669' : '#dc2626' }}>
            {formatINR(kpi.netCashFlow)}
          </div>
          <div style={{ fontSize: '12px', color: kpi.netCashFlow >= 0 ? '#047857' : '#991b1b', marginTop: '4px' }}>
            Inflow minus Procurement Outflow
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs for Analytical Lenses */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border)', overflowX: 'auto', paddingBottom: '2px' }}>
        {[
          { id: 'overview', label: 'Executive Overview', icon: <TrendingUp size={15} /> },
          { id: 'categories', label: 'Product Categories', icon: <Layers size={15} /> },
          { id: 'suppliers', label: 'Suppliers & Vendors', icon: <Truck size={15} /> },
          { id: 'orders', label: 'Selling Orders & Payments', icon: <ShoppingCart size={15} /> },
          { id: 'abc', label: 'ABC Pareto Analysis', icon: <PieChart size={15} /> },
          { id: 'margins', label: 'SKU Profit Margins', icon: <DollarSign size={15} /> },
          { id: 'urgency', label: 'Stockout Urgency', icon: <AlertTriangle size={15} /> },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`tab ${subTab === tab.id ? 'active' : ''}`}
            onClick={() => setSubTab(tab.id)}
            style={{ fontSize: '13px', padding: '8px 14px', whiteSpace: 'nowrap' }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ---------------- SUB-TAB 1: EXECUTIVE OVERVIEW ---------------- */}
      {subTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Cash Flow Timeline & Stock Health Donut */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
            <div className="table-card">
              <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity size={18} color="#2563eb" />
                Inflow vs Outflow Cash Dynamic ({days} Days)
              </div>
              <CashFlowChart data={analytics?.cashFlowTimeline || []} />
            </div>

            <div className="table-card">
              <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <PieChart size={18} color="#10b981" />
                Catalog Health Distribution
              </div>
              <DonutChart
                data={stockHealthDonutData}
                totalLabel="Total SKUs"
                valueFormatter={(v) => `${formatIndianNumber(v)} SKUs`}
              />
            </div>
          </div>

          {/* Top Valued SKUs & Top Suppliers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
            <div className="table-card">
              <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <IndianRupee size={18} color="#2563eb" />
                Top 8 Highest Capital Tied-Up SKUs
              </div>
              <BarRankingChart
                items={analytics?.abc?.items || []}
                titleKey="name"
                valueKey="valuation"
                secondaryKey="sku"
                valueFormatter={(v) => formatINR(v)}
                color="#2563eb"
                maxItems={8}
              />
            </div>

            <div className="table-card">
              <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Truck size={18} color="#f59e0b" />
                Top Suppliers by Procurement Spend
              </div>
              <BarRankingChart
                items={analytics?.suppliers || []}
                titleKey="supplier"
                valueKey="totalSpend"
                secondaryKey="skuCount"
                valueFormatter={(v) => formatINR(v)}
                color="#f59e0b"
                maxItems={8}
              />
            </div>
          </div>
        </div>
      )}

      {/* ---------------- SUB-TAB 2: PRODUCT CATEGORIES ---------------- */}
      {subTab === 'categories' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
            <div className="table-card">
              <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '14px' }}>
                Inventory Valuation by Category
              </div>
              <DonutChart
                data={categoryDonutData}
                totalLabel="Total Valuation"
                valueFormatter={(v) => formatINR(v)}
              />
            </div>

            <div className="table-card">
              <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '14px' }}>
                Category Revenue Ranking ({days} Days)
              </div>
              <BarRankingChart
                items={analytics?.categories || []}
                titleKey="category"
                valueKey="periodRevenue"
                secondaryKey="skuCount"
                valueFormatter={(v) => formatINR(v)}
                color="#10b981"
              />
            </div>
          </div>

          <div className="table-card">
            <div style={{ fontWeight: 700, fontSize: '16px', marginBottom: '14px' }}>
              Category Breakdown Table
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Category Name</th>
                    <th>Active SKUs</th>
                    <th>Stock Units</th>
                    <th>Inventory Valuation (₹)</th>
                    <th>Valuation Share (%)</th>
                    <th>Period Revenue (₹)</th>
                    <th>Units Sold</th>
                  </tr>
                </thead>
                <tbody>
                  {(analytics?.categories || []).map((cat) => (
                    <tr key={cat.category}>
                      <td>
                        <strong style={{ color: '#0f172a' }}>{cat.category}</strong>
                      </td>
                      <td>{formatIndianNumber(cat.skuCount)}</td>
                      <td>{formatIndianNumber(cat.totalUnits)} units</td>
                      <td>
                        <strong>{formatINR(cat.totalValuation)}</strong>
                      </td>
                      <td>
                        <span className="badge badge-neutral">{cat.percentValuation}%</span>
                      </td>
                      <td style={{ color: '#059669', fontWeight: 600 }}>
                        {formatINR(cat.periodRevenue)}
                      </td>
                      <td>{formatIndianNumber(cat.periodUnitsSold)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- SUB-TAB 3: SUPPLIERS & VENDORS ---------------- */}
      {subTab === 'suppliers' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="table-card">
            <div style={{ fontWeight: 700, fontSize: '16px', marginBottom: '14px' }}>
              Supplier Procurement & Inventory Portfolio
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Supplier / Vendor Name</th>
                    <th>Total Spend (₹)</th>
                    <th>Invoices Processed</th>
                    <th>SKUs Supplied</th>
                    <th>Last Invoice Date</th>
                  </tr>
                </thead>
                <tbody>
                  {(analytics?.suppliers || []).map((supp) => (
                    <tr key={supp.supplier}>
                      <td>
                        <strong style={{ color: '#0f172a' }}>{supp.supplier}</strong>
                      </td>
                      <td>
                        <strong style={{ color: '#b45309' }}>{formatINR(supp.totalSpend)}</strong>
                      </td>
                      <td>{supp.invoiceCount} invoice(s)</td>
                      <td>{supp.skuCount} product(s)</td>
                      <td style={{ fontSize: '13px', color: '#64748b' }}>
                        {supp.lastInvoiceDate ? formatIndianDate(supp.lastInvoiceDate) : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- SUB-TAB 4: SELLING ORDERS & PAYMENTS ---------------- */}
      {subTab === 'orders' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Payment Modes Overview */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
            <div className="table-card">
              <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '14px' }}>
                Payment Method Share
              </div>
              <DonutChart
                data={paymentModeDonutData}
                totalLabel="Total Collected"
                valueFormatter={(v) => formatINR(v)}
              />
            </div>

            <div className="table-card">
              <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '14px' }}>
                Payment Methods Breakdown
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {(analytics?.paymentModes || []).map((pm) => (
                  <div
                    key={pm.mode}
                    style={{
                      padding: '12px',
                      backgroundColor: '#f8fafc',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>{pm.mode}</div>
                    <div style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', margin: '4px 0' }}>
                      {formatINR(pm.total)}
                    </div>
                    <div style={{ fontSize: '11px', color: '#10b981' }}>
                      {pm.count} order(s) • {pm.percentage}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Orders Table */}
          <div className="table-card">
            <div className="table-header-bar">
              <div style={{ fontWeight: 700, fontSize: '16px' }}>
                Recent Outbound Selling Orders ({filteredOrders.length})
              </div>
              <div style={{ position: 'relative' }}>
                <Search
                  size={16}
                  color="#94a3b8"
                  style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
                />
                <input
                  type="text"
                  placeholder="Filter orders..."
                  className="search-input"
                  style={{ paddingLeft: '32px' }}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Order Reference</th>
                    <th>Product & SKU</th>
                    <th>Category</th>
                    <th>Qty Sold</th>
                    <th>Unit Price (₹)</th>
                    <th>Payment Mode</th>
                    <th>Money Collected (₹)</th>
                    <th>Customer</th>
                    <th>Payment Proof</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan="10" style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                        No selling orders match your query.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((ord) => (
                      <tr key={ord._id}>
                        <td style={{ fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap' }}>
                          {formatIndianDate(ord.date)}
                        </td>
                        <td style={{ fontFamily: 'monospace', fontWeight: 600, color: '#2563eb' }}>
                          {ord.orderId}
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{ord.productName}</div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>{ord.sku}</div>
                        </td>
                        <td>
                          <span className="badge badge-neutral" style={{ fontSize: '11px' }}>
                            {ord.category}
                          </span>
                        </td>
                        <td>
                          <strong>{ord.quantity}</strong>
                        </td>
                        <td>{formatINR(ord.unitPrice)}</td>
                        <td>
                          <span className={`badge ${ord.paymentMode === 'UPI' ? 'badge-success' : 'badge-warning'}`}>
                            {ord.paymentMode}
                          </span>
                        </td>
                        <td>
                          <strong style={{ color: '#059669', fontSize: '14px' }}>
                            {formatINR(ord.paymentAmount)}
                          </strong>
                        </td>
                        <td style={{ fontSize: '12px' }}>
                          {ord.customerName || <span style={{ color: '#cbd5e1' }}>Walk-in</span>}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {ord.paymentScreenshot ? (
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '3px 8px', fontSize: '11px' }}
                              onClick={() => setActiveProofModal(ord.paymentScreenshot)}
                              title="Click to view attached payment receipt"
                            >
                              <ImageIcon size={13} color="#2563eb" />
                              View
                            </button>
                          ) : (
                            <span style={{ fontSize: '12px', color: '#cbd5e1' }}>—</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- SUB-TAB 5: ABC PARETO ANALYSIS ---------------- */}
      {subTab === 'abc' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* ABC KPI Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            <div className="metric-card" style={{ borderLeft: '4px solid #2563eb' }}>
              <div className="metric-header">
                <span className="metric-title" style={{ color: '#2563eb' }}>Category A (Top 80% Capital)</span>
                <span className="badge badge-success">Tight Control</span>
              </div>
              <div className="metric-value">{formatINR(analytics?.abc?.summary?.classA?.valuation || 0)}</div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                {analytics?.abc?.summary?.classA?.count || 0} high-priority SKUs driving 80% of warehouse value
              </div>
            </div>

            <div className="metric-card" style={{ borderLeft: '4px solid #3b82f6' }}>
              <div className="metric-header">
                <span className="metric-title" style={{ color: '#3b82f6' }}>Category B (Next 15% Capital)</span>
                <span className="badge badge-warning">Normal Control</span>
              </div>
              <div className="metric-value">{formatINR(analytics?.abc?.summary?.classB?.valuation || 0)}</div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                {analytics?.abc?.summary?.classB?.count || 0} intermediate-priority inventory items
              </div>
            </div>

            <div className="metric-card" style={{ borderLeft: '4px solid #93c5fd' }}>
              <div className="metric-header">
                <span className="metric-title" style={{ color: '#64748b' }}>Category C (Tail 5% Capital)</span>
                <span className="badge badge-neutral">Bulk Control</span>
              </div>
              <div className="metric-value">{formatINR(analytics?.abc?.summary?.classC?.valuation || 0)}</div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                {analytics?.abc?.summary?.classC?.count || 0} lower-value tail products
              </div>
            </div>
          </div>

          {/* Pareto Curve Chart */}
          <div className="table-card">
            <div style={{ fontWeight: 700, fontSize: '16px', marginBottom: '14px' }}>
              Pareto 80/20 Cumulative Inventory Curve
            </div>
            <ParetoChart items={analytics?.abc?.items || []} />
          </div>

          {/* Filterable ABC Table */}
          <div className="table-card">
            <div className="table-header-bar">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontWeight: 700, fontSize: '15px' }}>ABC Catalog Classification</span>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {['ALL', 'A', 'B', 'C'].map((cls) => (
                    <button
                      key={cls}
                      type="button"
                      onClick={() => setAbcFilter(cls)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        border: '1px solid',
                        borderColor: abcFilter === cls ? 'var(--primary)' : 'var(--border)',
                        backgroundColor: abcFilter === cls ? 'var(--primary-light)' : '#ffffff',
                        color: abcFilter === cls ? 'var(--primary)' : '#475569',
                      }}
                    >
                      {cls === 'ALL' ? 'All Classes' : `Class ${cls}`}
                    </button>
                  ))}
                </div>
              </div>

              <input
                type="text"
                placeholder="Search SKU or name..."
                className="search-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Class</th>
                    <th>SKU</th>
                    <th>Product Name</th>
                    <th>Category</th>
                    <th>Stock Units</th>
                    <th>Unit Cost (₹)</th>
                    <th>Total Valuation (₹)</th>
                    <th>Cumulative Share (%)</th>
                    <th>Recommended Strategy</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAbcItems.map((item) => (
                    <tr key={item.sku}>
                      <td>
                        <span
                          className={`badge ${
                            item.abcClass === 'A'
                              ? 'badge-success'
                              : item.abcClass === 'B'
                              ? 'badge-warning'
                              : 'badge-neutral'
                          }`}
                          style={{ fontWeight: 700 }}
                        >
                          Class {item.abcClass}
                        </span>
                      </td>
                      <td>
                        <strong>{item.sku}</strong>
                      </td>
                      <td>{item.name}</td>
                      <td>
                        <span className="badge badge-neutral" style={{ fontSize: '11px' }}>
                          {item.category}
                        </span>
                      </td>
                      <td>{formatIndianNumber(item.currentStock)}</td>
                      <td>{formatINR(item.unitCost)}</td>
                      <td>
                        <strong>{formatINR(item.valuation)}</strong>
                      </td>
                      <td>{item.cumulativePercent}%</td>
                      <td style={{ fontSize: '12px', color: '#475569' }}>
                        {item.abcClass === 'A'
                          ? 'Strict count audits & buffer optimization'
                          : item.abcClass === 'B'
                          ? 'Periodic replenishment reorders'
                          : 'Simple bulk reorder minimums'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- SUB-TAB 6: PROFIT MARGINS & SKU ECONOMICS ---------------- */}
      {subTab === 'margins' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="table-card">
            <div className="table-header-bar">
              <div style={{ fontWeight: 700, fontSize: '16px' }}>
                Product SKU Unit Economics & Profitability Ranking
              </div>
              <input
                type="text"
                placeholder="Search SKU, name, category..."
                className="search-input"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Product Name</th>
                    <th>Category</th>
                    <th>Unit Cost (₹)</th>
                    <th>Selling Price (₹)</th>
                    <th>Unit Margin (₹)</th>
                    <th>Margin %</th>
                    <th>Units Sold ({days}d)</th>
                    <th>Period Revenue (₹)</th>
                    <th>Realized Profit (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMargins.map((item) => {
                    const isPositive = item.unitMargin > 0;
                    return (
                      <tr key={item.sku}>
                        <td>
                          <strong>{item.sku}</strong>
                        </td>
                        <td>{item.name}</td>
                        <td>
                          <span className="badge badge-neutral" style={{ fontSize: '11px' }}>
                            {item.category}
                          </span>
                        </td>
                        <td>{formatINR(item.unitCost)}</td>
                        <td>{formatINR(item.sellingPrice)}</td>
                        <td style={{ color: isPositive ? '#059669' : '#dc2626', fontWeight: 600 }}>
                          {formatINR(item.unitMargin)}
                        </td>
                        <td>
                          <span
                            className={`badge ${
                              item.marginPercent >= 30
                                ? 'badge-success'
                                : item.marginPercent >= 10
                                ? 'badge-warning'
                                : 'badge-danger'
                            }`}
                          >
                            {item.marginPercent}%
                          </span>
                        </td>
                        <td>{item.unitsSoldInPeriod}</td>
                        <td>{formatINR(item.periodRevenue)}</td>
                        <td>
                          <strong style={{ color: item.realizedProfit >= 0 ? '#059669' : '#dc2626', fontSize: '14px' }}>
                            {formatINR(item.realizedProfit)}
                          </strong>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- SUB-TAB 7: STOCKOUT URGENCY ---------------- */}
      {subTab === 'urgency' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="table-card">
            <div style={{ fontWeight: 700, fontSize: '16px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Flame size={18} color="#dc2626" />
              Imminent Stockout Risk Matrix (&le; 15 Days Run-out)
            </div>

            {(analytics?.criticalRunOuts || []).length === 0 ? (
              <div style={{ padding: '36px', textAlign: 'center', color: '#059669', fontSize: '14px' }}>
                <CheckCircle2 size={32} color="#10b981" style={{ margin: '0 auto 8px' }} />
                <strong>All inventory stocks are healthy!</strong> No products are at imminent risk of running out within 15 days.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>SKU</th>
                      <th>Product Name</th>
                      <th>Current Stock</th>
                      <th>Units Sold ({days}d)</th>
                      <th>Daily Burn Rate</th>
                      <th>Days Remaining</th>
                      <th>Estimated Stockout Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(analytics?.criticalRunOuts || []).map((item) => (
                      <tr key={item.sku}>
                        <td>
                          <strong>{item.sku}</strong>
                        </td>
                        <td>{item.name}</td>
                        <td>
                          <span style={{ color: '#dc2626', fontWeight: 700 }}>
                            {formatIndianNumber(item.currentStock)} units
                          </span>
                        </td>
                        <td>{item.totalUnitsSold}</td>
                        <td>
                          <span style={{ color: '#d97706', fontWeight: 600 }}>
                            {item.dailyBurnRate} /day
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${item.daysOfInventoryRemaining <= 7 ? 'badge-danger' : 'badge-warning'}`}>
                            {item.daysOfInventoryRemaining} days
                          </span>
                        </td>
                        <td style={{ color: '#dc2626', fontWeight: 600 }}>
                          {formatIndianDate(item.estimatedRunOutDate)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Lightbox Modal for Payment Screenshot Proof */}
      {activeProofModal && (
        <div className="modal-overlay" onClick={() => setActiveProofModal(null)}>
          <div
            className="modal-content"
            style={{ maxWidth: '650px', padding: '16px', textAlign: 'center' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ fontWeight: 700, fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ImageIcon size={18} color="#2563eb" />
                Payment Proof Screenshot
              </div>
              <button className="close-btn" onClick={() => setActiveProofModal(null)}>
                <X size={20} />
              </button>
            </div>
            <div style={{ backgroundColor: '#0f172a', padding: '12px', borderRadius: '8px', overflow: 'hidden' }}>
              <img
                src={activeProofModal}
                alt="Payment Proof"
                style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: '4px' }}
              />
            </div>
            <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setActiveProofModal(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsDashboardView;
