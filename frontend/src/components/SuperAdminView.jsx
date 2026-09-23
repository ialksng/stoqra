import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Users,
  Store,
  Package,
  IndianRupee,
  Search,
  RotateCw,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Mail,
  Calendar,
  X,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Clock,
} from 'lucide-react';
import {
  fetchSuperAdminOverview,
  fetchSuperAdminUsers,
  fetchSuperAdminStores,
  fetchSuperAdminStoreCatalog,
} from '../services/api.js';

export const SuperAdminView = ({ onToast }) => {
  const [activeSubTab, setActiveSubTab] = useState('users'); // 'users' | 'stores'
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search filters
  const [userSearch, setUserSearch] = useState('');
  const [storeSearch, setStoreSearch] = useState('');

  // Store Inspection Modal state
  const [inspectModalOpen, setInspectModalOpen] = useState(false);
  const [inspectingOrg, setInspectingOrg] = useState(null);
  const [inspectData, setInspectData] = useState(null);
  const [inspectLoading, setInspectLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [overviewRes, usersRes, storesRes] = await Promise.all([
        fetchSuperAdminOverview(),
        fetchSuperAdminUsers(userSearch),
        fetchSuperAdminStores(storeSearch),
      ]);

      if (overviewRes.success) setOverview(overviewRes.data);
      if (usersRes.success) setUsers(usersRes.users || []);
      if (storesRes.success) setStores(storesRes.stores || []);
    } catch (err) {
      console.error('[SuperAdminView] Failed to load data:', err);
      if (onToast) onToast(err.message || 'Failed to fetch platform metrics', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSearchUsers = async (e) => {
    e.preventDefault();
    try {
      const res = await fetchSuperAdminUsers(userSearch);
      if (res.success) setUsers(res.users || []);
    } catch (err) {
      if (onToast) onToast(err.message, 'error');
    }
  };

  const handleSearchStores = async (e) => {
    e.preventDefault();
    try {
      const res = await fetchSuperAdminStores(storeSearch);
      if (res.success) setStores(res.stores || []);
    } catch (err) {
      if (onToast) onToast(err.message, 'error');
    }
  };

  const handleInspectStore = async (store) => {
    setInspectingOrg(store);
    setInspectModalOpen(true);
    setInspectLoading(true);
    try {
      const res = await fetchSuperAdminStoreCatalog(store.id);
      if (res.success) {
        setInspectData(res);
      }
    } catch (err) {
      if (onToast) onToast(err.message || 'Failed to inspect store', 'error');
    } finally {
      setInspectLoading(false);
    }
  };

  const formatCurrency = (val) => {
    const num = Math.round(val || 0);
    return '₹' + num.toLocaleString('en-IN');
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Never';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="superadmin-container" style={{ paddingBottom: '40px' }}>
      {/* Header Banner */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          padding: '16px 20px',
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #fed7aa',
          borderLeft: '4px solid #ea580c',
          marginBottom: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              backgroundColor: '#fff7ed',
              color: '#ea580c',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ShieldAlert size={22} />
          </div>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
              Stoqra Platform Command Center
            </h1>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '2px 0 0 0' }}>
              Super Administrator oversight for <strong>ialksng@gmail.com</strong>
            </p>
          </div>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="btn btn-secondary"
          style={{ fontSize: '13px', padding: '6px 12px' }}
        >
          <RotateCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh Stats
        </button>
      </div>

      {/* High-level Platform KPIs */}
      <div className="cards-grid" style={{ marginBottom: '24px' }}>
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Total Users</span>
            <Users size={18} color="#2563eb" />
          </div>
          <div className="metric-value">{overview?.totalUsers || 0}</div>
          <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
            Registered merchants & staff
          </span>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Total Stores</span>
            <Store size={18} color="#059669" />
          </div>
          <div className="metric-value">{overview?.totalStores || 0}</div>
          <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
            Active business organizations
          </span>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Catalog SKUs</span>
            <Package size={18} color="#7c3aed" />
          </div>
          <div className="metric-value">{overview?.totalItems || 0}</div>
          <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
            {overview?.totalStockUnits?.toLocaleString('en-IN') || 0} units on shelves
          </span>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Stock Valuation</span>
            <IndianRupee size={18} color="#ea580c" />
          </div>
          <div className="metric-value" style={{ color: '#ea580c' }}>
            {formatCurrency(overview?.totalStockValue)}
          </div>
          <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
            Retail: {formatCurrency(overview?.totalRetailValue)}
          </span>
        </div>

        <div className="metric-card success">
          <div className="metric-header">
            <span className="metric-title">Platform Sales</span>
            <TrendingUp size={18} color="#10b981" />
          </div>
          <div className="metric-value" style={{ color: '#059669' }}>
            {formatCurrency(overview?.totalRevenue)}
          </div>
          <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
            {overview?.totalSalesCount || 0} completed orders
          </span>
        </div>
      </div>

      {/* Sub-tab Navigation */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '1px solid #e2e8f0',
          marginBottom: '20px',
        }}
      >
        <button
          onClick={() => setActiveSubTab('users')}
          style={{
            padding: '10px 16px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            border: 'none',
            background: 'none',
            color: activeSubTab === 'users' ? '#ea580c' : '#64748b',
            borderBottom: activeSubTab === 'users' ? '2px solid #ea580c' : '2px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Users size={16} />
          Merchants & Users ({users.length})
        </button>

        <button
          onClick={() => setActiveSubTab('stores')}
          style={{
            padding: '10px 16px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            border: 'none',
            background: 'none',
            color: activeSubTab === 'stores' ? '#ea580c' : '#64748b',
            borderBottom: activeSubTab === 'stores' ? '2px solid #ea580c' : '2px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Store size={16} />
          Stores & Organizations ({stores.length})
        </button>
      </div>

      {/* Tab 1: Merchants & Users */}
      {activeSubTab === 'users' && (
        <div className="superadmin-section">
          {/* Search bar */}
          <form
            onSubmit={handleSearchUsers}
            style={{ display: 'flex', gap: '8px', marginBottom: '16px', maxWidth: '400px' }}
          >
            <div style={{ position: 'relative', flex: 1 }}>
              <Search
                size={16}
                color="#94a3b8"
                style={{ position: 'absolute', left: '10px', top: '10px' }}
              />
              <input
                type="text"
                placeholder="Search user by name or email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 34px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                }}
              />
            </div>
            <button type="submit" className="btn btn-secondary" style={{ padding: '8px 14px' }}>
              Search
            </button>
          </form>

          {/* Users Table */}
          <div className="table-responsive" style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px', fontWeight: '600', color: '#475569' }}>User</th>
                  <th style={{ padding: '12px 16px', fontWeight: '600', color: '#475569' }}>Role</th>
                  <th style={{ padding: '12px 16px', fontWeight: '600', color: '#475569' }}>Stores Owned</th>
                  <th style={{ padding: '12px 16px', fontWeight: '600', color: '#475569' }}>Active Store</th>
                  <th style={{ padding: '12px 16px', fontWeight: '600', color: '#475569' }}>Gmail Sync</th>
                  <th style={{ padding: '12px 16px', fontWeight: '600', color: '#475569' }}>Joined</th>
                  <th style={{ padding: '12px 16px', fontWeight: '600', color: '#475569' }}>Last Login</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                      No users match your criteria.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {u.avatar ? (
                            <img
                              src={u.avatar}
                              alt={u.name}
                              referrerPolicy="no-referrer"
                              style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                            />
                          ) : (
                            <div
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                backgroundColor: '#eff6ff',
                                color: '#2563eb',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: '700',
                              }}
                            >
                              {(u.name || u.email || 'U')[0].toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div style={{ fontWeight: '600', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span>{u.name}</span>
                              {u.isSuperAdmin && (
                                <span
                                  style={{
                                    fontSize: '9px',
                                    fontWeight: '800',
                                    backgroundColor: '#fff7ed',
                                    color: '#ea580c',
                                    border: '1px solid #fed7aa',
                                    padding: '1px 5px',
                                    borderRadius: '4px',
                                  }}
                                >
                                  SUPER ADMIN
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748b' }}>{u.email}</div>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: '700',
                            textTransform: 'uppercase',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            backgroundColor: u.role === 'admin' ? '#eff6ff' : '#f1f5f9',
                            color: u.role === 'admin' ? '#2563eb' : '#64748b',
                          }}
                        >
                          {u.role}
                        </span>
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        {u.stores && u.stores.length > 0 ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {u.stores.map((s) => (
                              <span
                                key={s.id}
                                style={{
                                  fontSize: '11px',
                                  padding: '2px 6px',
                                  backgroundColor: '#f8fafc',
                                  border: '1px solid #e2e8f0',
                                  borderRadius: '4px',
                                  color: '#334155',
                                }}
                              >
                                {s.name} <small style={{ color: '#94a3b8' }}>({s.type})</small>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span style={{ fontSize: '11px', color: '#94a3b8' }}>None</span>
                        )}
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        {u.activeStore ? (
                          <span style={{ fontWeight: '600', color: '#0f172a' }}>
                            {u.activeStore.name}
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8' }}>None</span>
                        )}
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        {u.gmailConnectedEmail ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#059669', fontSize: '11px' }}>
                            <CheckCircle2 size={13} />
                            <span>{u.gmailConnectedEmail}</span>
                          </div>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '11px' }}>Not connected</span>
                        )}
                      </td>

                      <td style={{ padding: '12px 16px', color: '#64748b' }}>
                        {formatDate(u.createdAt)}
                      </td>

                      <td style={{ padding: '12px 16px', color: '#64748b' }}>
                        {formatDate(u.lastLogin)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Stores & Organizations */}
      {activeSubTab === 'stores' && (
        <div className="superadmin-section">
          {/* Search bar */}
          <form
            onSubmit={handleSearchStores}
            style={{ display: 'flex', gap: '8px', marginBottom: '16px', maxWidth: '400px' }}
          >
            <div style={{ position: 'relative', flex: 1 }}>
              <Search
                size={16}
                color="#94a3b8"
                style={{ position: 'absolute', left: '10px', top: '10px' }}
              />
              <input
                type="text"
                placeholder="Search store name or category..."
                value={storeSearch}
                onChange={(e) => setStoreSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 34px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                }}
              />
            </div>
            <button type="submit" className="btn btn-secondary" style={{ padding: '8px 14px' }}>
              Search
            </button>
          </form>

          {/* Stores Table */}
          <div className="table-responsive" style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px', fontWeight: '600', color: '#475569' }}>Store Name</th>
                  <th style={{ padding: '12px 16px', fontWeight: '600', color: '#475569' }}>Business Category</th>
                  <th style={{ padding: '12px 16px', fontWeight: '600', color: '#475569' }}>Store Owner</th>
                  <th style={{ padding: '12px 16px', fontWeight: '600', color: '#475569' }}>Catalog SKUs</th>
                  <th style={{ padding: '12px 16px', fontWeight: '600', color: '#475569' }}>Stock Valuation</th>
                  <th style={{ padding: '12px 16px', fontWeight: '600', color: '#475569' }}>Sales / Revenue</th>
                  <th style={{ padding: '12px 16px', fontWeight: '600', color: '#475569', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {stores.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                      No stores found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  stores.map((s) => (
                    <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: '700', color: '#0f172a' }}>{s.name}</div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>Created: {formatDate(s.createdAt)}</div>
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: '600',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            backgroundColor: '#eff6ff',
                            color: '#2563eb',
                          }}
                        >
                          {s.type}
                        </span>
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: '600', color: '#0f172a' }}>{s.owner?.name || 'Unknown'}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>{s.owner?.email || 'N/A'}</div>
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: '600', color: '#0f172a' }}>
                          {s.metrics?.skuCount || 0} products
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                          {s.metrics?.totalUnits || 0} units
                        </div>
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: '700', color: '#ea580c' }}>
                          {formatCurrency(s.metrics?.totalCostValue)}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                          Retail: {formatCurrency(s.metrics?.totalRetailValue)}
                        </div>
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: '700', color: '#059669' }}>
                          {formatCurrency(s.metrics?.totalRevenue)}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>
                          {s.metrics?.salesCount || 0} sales
                        </div>
                      </td>

                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <button
                          onClick={() => handleInspectStore(s)}
                          className="btn btn-secondary btn-sm"
                          style={{
                            fontSize: '12px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Eye size={13} />
                          Inspect Shelf
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Store Catalog Inspection Modal */}
      {inspectModalOpen && (
        <div className="modal-backdrop" style={{ zIndex: 10000 }}>
          <div
            className="modal-content modal-card"
            style={{
              maxWidth: '850px',
              width: '95%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '24px',
              borderRadius: '16px',
              background: '#ffffff',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Store size={20} color="#2563eb" />
                  <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                    {inspectingOrg?.name}
                  </h2>
                  <span
                    style={{
                      fontSize: '11px',
                      padding: '2px 8px',
                      backgroundColor: '#eff6ff',
                      color: '#2563eb',
                      borderRadius: '4px',
                      fontWeight: '600',
                    }}
                  >
                    {inspectingOrg?.type}
                  </span>
                </div>
                <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0 0' }}>
                  Owner: {inspectingOrg?.owner?.name} ({inspectingOrg?.owner?.email})
                </p>
              </div>

              <button
                onClick={() => setInspectModalOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px' }}
              >
                <X size={20} color="#94a3b8" />
              </button>
            </div>

            {inspectLoading ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <RotateCw size={24} className="animate-spin" color="#2563eb" style={{ margin: '0 auto 8px auto' }} />
                <p style={{ color: '#64748b', fontSize: '13px' }}>Loading catalog snapshot...</p>
              </div>
            ) : (
              <div>
                {/* Catalog Table */}
                <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', marginBottom: '10px' }}>
                  Live Shelf Inventory ({inspectData?.itemCount || 0} Products)
                </h3>

                <div className="table-responsive" style={{ maxHeight: '320px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '20px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <tr style={{ textAlign: 'left' }}>
                        <th style={{ padding: '8px 12px', fontWeight: '600', color: '#475569' }}>SKU</th>
                        <th style={{ padding: '8px 12px', fontWeight: '600', color: '#475569' }}>Product Name</th>
                        <th style={{ padding: '8px 12px', fontWeight: '600', color: '#475569' }}>Category</th>
                        <th style={{ padding: '8px 12px', fontWeight: '600', color: '#475569' }}>Stock</th>
                        <th style={{ padding: '8px 12px', fontWeight: '600', color: '#475569' }}>Cost</th>
                        <th style={{ padding: '8px 12px', fontWeight: '600', color: '#475569' }}>Selling</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inspectData?.items?.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>
                            No products on this shelf yet.
                          </td>
                        </tr>
                      ) : (
                        inspectData?.items?.map((item) => (
                          <tr key={item._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontWeight: '600', color: '#334155' }}>
                              {item.sku}
                            </td>
                            <td style={{ padding: '8px 12px', fontWeight: '600', color: '#0f172a' }}>
                              {item.name}
                            </td>
                            <td style={{ padding: '8px 12px', color: '#64748b' }}>
                              {item.category || 'General'}
                            </td>
                            <td style={{ padding: '8px 12px' }}>
                              <span
                                style={{
                                  fontWeight: '700',
                                  color: item.currentStock <= item.reorderLevel ? '#dc2626' : '#059669',
                                }}
                              >
                                {item.currentStock}
                              </span>
                            </td>
                            <td style={{ padding: '8px 12px', color: '#475569' }}>
                              ₹{item.unitCost}
                            </td>
                            <td style={{ padding: '8px 12px', fontWeight: '600', color: '#0f172a' }}>
                              ₹{item.sellingPrice}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Recent Invoices & Sales Snapshot */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                  <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <h4 style={{ fontSize: '12px', fontWeight: '700', color: '#334155', textTransform: 'uppercase', marginBottom: '8px' }}>
                      Recent Invoices ({inspectData?.recentInvoices?.length || 0})
                    </h4>
                    {inspectData?.recentInvoices?.length === 0 ? (
                      <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0 }}>No invoices recorded</p>
                    ) : (
                      inspectData?.recentInvoices?.slice(0, 4).map((inv) => (
                        <div key={inv._id} style={{ fontSize: '11px', padding: '4px 0', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontWeight: '600', color: '#0f172a' }}>#{inv.invoiceNumber} ({inv.vendor})</span>
                          <span style={{ color: '#2563eb', fontWeight: '600' }}>₹{inv.totalAmount}</span>
                        </div>
                      ))
                    )}
                  </div>

                  <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <h4 style={{ fontSize: '12px', fontWeight: '700', color: '#334155', textTransform: 'uppercase', marginBottom: '8px' }}>
                      Recent Sales ({inspectData?.recentSales?.length || 0})
                    </h4>
                    {inspectData?.recentSales?.length === 0 ? (
                      <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0 }}>No sales recorded</p>
                    ) : (
                      inspectData?.recentSales?.slice(0, 4).map((sale) => (
                        <div key={sale._id} style={{ fontSize: '11px', padding: '4px 0', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#334155' }}>{sale.paymentMethod} ({sale.items?.length || 0} items)</span>
                          <span style={{ color: '#059669', fontWeight: '700' }}>₹{sale.totalAmount}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminView;
