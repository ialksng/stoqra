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
  Trash2,
  LifeBuoy,
  MessageSquare,
  Edit3,
  Send,
} from 'lucide-react';
import {
  fetchSuperAdminOverview,
  fetchSuperAdminUsers,
  fetchSuperAdminStores,
  fetchSuperAdminStoreCatalog,
  deleteSuperAdminUser,
  deleteSuperAdminStore,
  fetchSuperAdminIssues,
  updateSuperAdminIssue,
  deleteSuperAdminIssue,
} from '../services/api.js';

export const SuperAdminView = ({ onToast }) => {
  const [activeSubTab, setActiveSubTab] = useState('users'); // 'users' | 'stores' | 'issues'
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);

  // Issues State
  const [issues, setIssues] = useState([]);
  const [issueCounts, setIssueCounts] = useState({ TOTAL: 0, OPEN: 0, IN_PROGRESS: 0, RESOLVED: 0 });
  const [issueStatusFilter, setIssueStatusFilter] = useState('ALL');
  const [issuePriorityFilter, setIssuePriorityFilter] = useState('ALL');
  const [issueSearch, setIssueSearch] = useState('');
  const [loadingIssues, setLoadingIssues] = useState(false);
  const [noteModalIssue, setNoteModalIssue] = useState(null); // { id, title, adminNotes }
  const [noteInput, setNoteInput] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  // Search filters
  const [userSearch, setUserSearch] = useState('');
  const [storeSearch, setStoreSearch] = useState('');

  // Store Inspection Modal state
  const [inspectModalOpen, setInspectModalOpen] = useState(false);
  const [inspectingOrg, setInspectingOrg] = useState(null);
  const [inspectData, setInspectData] = useState(null);
  const [inspectLoading, setInspectLoading] = useState(false);

  // Deletion Confirmation Modal state
  const [deleteTarget, setDeleteTarget] = useState(null); // { type: 'user' | 'store', id: string, name: string, ... }
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      if (deleteTarget.type === 'user') {
        const res = await deleteSuperAdminUser(deleteTarget.id);
        if (onToast) onToast(res.message || 'User and all associated data permanently removed.', 'success');
      } else if (deleteTarget.type === 'store') {
        const res = await deleteSuperAdminStore(deleteTarget.id);
        if (onToast) onToast(res.message || 'Store and all associated data permanently removed.', 'success');
      }
      setDeleteTarget(null);
      await loadData();
    } catch (err) {
      console.error('[SuperAdminView] Deletion failed:', err);
      if (onToast) onToast(err.message || 'Failed to complete deletion', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  const loadIssues = async () => {
    setLoadingIssues(true);
    try {
      const res = await fetchSuperAdminIssues({
        status: issueStatusFilter,
        priority: issuePriorityFilter,
        search: issueSearch,
      });
      if (res.success) {
        setIssues(res.issues || []);
        if (res.counts) setIssueCounts(res.counts);
      }
    } catch (err) {
      console.error('[SuperAdminView] Failed to load issues:', err);
    } finally {
      setLoadingIssues(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [overviewRes, usersRes, storesRes] = await Promise.all([
        fetchSuperAdminOverview(),
        fetchSuperAdminUsers(userSearch),
        fetchSuperAdminStores(storeSearch),
      ]);

      if (overviewRes.success) setOverview(overviewRes.data);
      if (usersRes.success) {
        const nonAdmin = (usersRes.users || []).filter(
          (u) => u.email?.toLowerCase() !== 'ialksng@gmail.com' && !u.isSuperAdmin
        );
        setUsers(nonAdmin);
      }
      if (storesRes.success) setStores(storesRes.stores || []);
      await loadIssues();
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

  useEffect(() => {
    loadIssues();
  }, [issueStatusFilter, issuePriorityFilter]);

  const handleUpdateIssueStatus = async (issueId, newStatus) => {
    try {
      const res = await updateSuperAdminIssue(issueId, { status: newStatus });
      if (res.success) {
        if (onToast) onToast(`Issue status updated to ${newStatus}`, 'success');
        loadIssues();
      }
    } catch (err) {
      if (onToast) onToast(err.message || 'Failed to update issue status', 'error');
    }
  };

  const handleSaveNote = async () => {
    if (!noteModalIssue) return;
    setSavingNote(true);
    try {
      const res = await updateSuperAdminIssue(noteModalIssue._id, { adminNotes: noteInput });
      if (res.success) {
        if (onToast) onToast('Admin resolution note saved and visible to merchant', 'success');
        setNoteModalIssue(null);
        setNoteInput('');
        loadIssues();
      }
    } catch (err) {
      if (onToast) onToast(err.message || 'Failed to save admin note', 'error');
    } finally {
      setSavingNote(false);
    }
  };

  const handleDeleteIssue = async (issueId) => {
    if (!window.confirm('Delete this issue ticket permanently?')) return;
    try {
      const res = await deleteSuperAdminIssue(issueId);
      if (res.success) {
        if (onToast) onToast('Issue ticket deleted', 'success');
        loadIssues();
      }
    } catch (err) {
      if (onToast) onToast(err.message || 'Failed to delete issue ticket', 'error');
    }
  };

  const handleSearchUsers = async (e) => {
    e.preventDefault();
    try {
      const res = await fetchSuperAdminUsers(userSearch);
      if (res.success) {
        const nonAdmin = (res.users || []).filter(
          (u) => u.email?.toLowerCase() !== 'ialksng@gmail.com' && !u.isSuperAdmin
        );
        setUsers(nonAdmin);
      }
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

      {/* High-level Platform KPIs: Users, Stores & Issue Insights Only */}
      <div className="cards-grid" style={{ marginBottom: '24px', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Total Users</span>
            <Users size={18} color="#2563eb" />
          </div>
          <div className="metric-value">{overview?.totalUsers || users.length || 0}</div>
          <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
            Registered merchants & shop staff
          </span>
        </div>

        <div className="metric-card">
          <div className="metric-header">
            <span className="metric-title">Total Stores</span>
            <Store size={18} color="#059669" />
          </div>
          <div className="metric-value">{overview?.totalStores || stores.length || 0}</div>
          <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
            Active business organizations
          </span>
        </div>

        <div className="metric-card" style={{ cursor: 'pointer' }} onClick={() => setActiveSubTab('issues')}>
          <div className="metric-header">
            <span className="metric-title">Technical Issues</span>
            <LifeBuoy size={18} color="#ea580c" />
          </div>
          <div className="metric-value" style={{ color: issueCounts.OPEN > 0 ? '#ea580c' : '#0f172a' }}>
            {issueCounts.OPEN} <span style={{ fontSize: '14px', fontWeight: 500, color: '#64748b' }}>Pending ({issueCounts.TOTAL} total)</span>
          </div>
          <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
            Reported store problems requiring support
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
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
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
            whiteSpace: 'nowrap',
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
            whiteSpace: 'nowrap',
          }}
        >
          <Store size={16} />
          Stores & Organizations ({stores.length})
        </button>

        <button
          onClick={() => setActiveSubTab('issues')}
          style={{
            padding: '10px 16px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            border: 'none',
            background: 'none',
            color: activeSubTab === 'issues' ? '#ea580c' : '#64748b',
            borderBottom: activeSubTab === 'issues' ? '2px solid #ea580c' : '2px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            whiteSpace: 'nowrap',
          }}
        >
          <LifeBuoy size={16} />
          Technical Issues & Reports ({issueCounts.OPEN > 0 ? `${issueCounts.OPEN} Pending` : issueCounts.TOTAL})
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
                  <th style={{ padding: '12px 16px', fontWeight: '600', color: '#475569', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
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

                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        {u.isSuperAdmin || u.email?.toLowerCase() === 'ialksng@gmail.com' ? (
                          <span
                            style={{
                              fontSize: '11px',
                              color: '#94a3b8',
                              fontWeight: '600',
                              backgroundColor: '#f1f5f9',
                              padding: '3px 8px',
                              borderRadius: '4px',
                            }}
                          >
                            Protected
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              setDeleteTarget({
                                type: 'user',
                                id: u.id,
                                name: u.name || u.email,
                                email: u.email,
                                storeCount: u.storeCount || 0,
                              })
                            }
                            className="btn btn-sm"
                            style={{
                              backgroundColor: '#fee2e2',
                              color: '#dc2626',
                              border: '1px solid #fca5a5',
                              fontSize: '12px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              cursor: 'pointer',
                              padding: '4px 8px',
                              borderRadius: '6px',
                              fontWeight: '600',
                            }}
                            title="Permanently remove user"
                          >
                            <Trash2 size={13} />
                            Remove
                          </button>
                        )}
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
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                          <button
                            type="button"
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
                          <button
                            type="button"
                            onClick={() =>
                              setDeleteTarget({
                                type: 'store',
                                id: s.id,
                                name: s.name,
                                typeName: s.type,
                                ownerName: s.owner?.name,
                                skuCount: s.metrics?.skuCount || 0,
                              })
                            }
                            className="btn btn-sm"
                            style={{
                              backgroundColor: '#fee2e2',
                              color: '#dc2626',
                              border: '1px solid #fca5a5',
                              fontSize: '12px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              cursor: 'pointer',
                              padding: '4px 8px',
                              borderRadius: '6px',
                              fontWeight: '600',
                            }}
                            title="Permanently remove store & inventory"
                          >
                            <Trash2 size={13} />
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Technical Issues & Reports Portal */}
      {activeSubTab === 'issues' && (
        <div className="superadmin-section">
          {/* Top Filter and Search Bar */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
              marginBottom: '16px',
            }}
          >
            {/* Status Pills */}
            <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: '4px' }}>
              {[
                { id: 'ALL', label: `All Tickets (${issueCounts.TOTAL})` },
                { id: 'OPEN', label: `Pending (${issueCounts.OPEN})` },
                { id: 'IN_PROGRESS', label: `In Progress (${issueCounts.IN_PROGRESS})` },
                { id: 'RESOLVED', label: `Resolved (${issueCounts.RESOLVED})` },
              ].map((pill) => (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => setIssueStatusFilter(pill.id)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    border: '1px solid',
                    whiteSpace: 'nowrap',
                    backgroundColor: issueStatusFilter === pill.id ? '#ea580c' : '#ffffff',
                    color: issueStatusFilter === pill.id ? '#ffffff' : '#475569',
                    borderColor: issueStatusFilter === pill.id ? '#ea580c' : '#cbd5e1',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {pill.label}
                </button>
              ))}
            </div>

            {/* Priority filter and Search */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <select
                className="form-control"
                value={issuePriorityFilter}
                onChange={(e) => setIssuePriorityFilter(e.target.value)}
                style={{ width: 'auto', padding: '6px 10px', fontSize: '12px', borderRadius: '8px' }}
              >
                <option value="ALL">All Severities</option>
                <option value="CRITICAL">Critical Priority</option>
                <option value="HIGH">High Priority</option>
                <option value="MEDIUM">Medium Priority</option>
                <option value="LOW">Low Priority</option>
              </select>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  loadIssues();
                }}
                style={{ display: 'flex', gap: '6px' }}
              >
                <input
                  type="text"
                  placeholder="Search issue or shop..."
                  value={issueSearch}
                  onChange={(e) => setIssueSearch(e.target.value)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12px',
                  }}
                />
                <button type="submit" className="btn btn-secondary btn-sm" style={{ padding: '6px 10px' }}>
                  Search
                </button>
              </form>

              <button
                type="button"
                onClick={loadIssues}
                className="btn btn-secondary btn-sm"
                title="Refresh tickets"
              >
                <RotateCw size={13} className={loadingIssues ? 'spin' : ''} />
              </button>
            </div>
          </div>

          {/* Issues Table */}
          <div className="table-responsive" style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px', fontWeight: '600', color: '#475569' }}>Status</th>
                  <th style={{ padding: '12px 16px', fontWeight: '600', color: '#475569' }}>Severity</th>
                  <th style={{ padding: '12px 16px', fontWeight: '600', color: '#475569' }}>Shop & Merchant</th>
                  <th style={{ padding: '12px 16px', fontWeight: '600', color: '#475569' }}>Issue Subject & Details</th>
                  <th style={{ padding: '12px 16px', fontWeight: '600', color: '#475569' }}>Category</th>
                  <th style={{ padding: '12px 16px', fontWeight: '600', color: '#475569' }}>Reported On</th>
                  <th style={{ padding: '12px 16px', fontWeight: '600', color: '#475569', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loadingIssues ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                      <RotateCw size={20} className="spin" style={{ margin: '0 auto 8px auto' }} />
                      Loading issue reports...
                    </td>
                  </tr>
                ) : issues.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '40px 16px', color: '#64748b' }}>
                      <CheckCircle2 size={36} color="#10b981" style={{ margin: '0 auto 8px auto', opacity: 0.8 }} />
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>No tickets matching this filter</div>
                      <div style={{ fontSize: '12px', marginTop: '4px' }}>
                        All merchant issues have been reviewed or resolved.
                      </div>
                    </td>
                  </tr>
                ) : (
                  issues.map((iss) => (
                    <tr key={iss._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 16px' }}>
                        {iss.status === 'OPEN' && (
                          <span style={{ fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '6px', backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={12} /> Pending
                          </span>
                        )}
                        {iss.status === 'IN_PROGRESS' && (
                          <span style={{ fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '6px', backgroundColor: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <RotateCw size={12} className="spin" /> In Progress
                          </span>
                        )}
                        {iss.status === 'RESOLVED' && (
                          <span style={{ fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '6px', backgroundColor: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <CheckCircle2 size={12} /> Resolved
                          </span>
                        )}
                        {iss.status === 'CLOSED' && (
                          <span style={{ fontSize: '11px', fontWeight: '700', padding: '3px 8px', borderRadius: '6px', backgroundColor: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0' }}>
                            Closed
                          </span>
                        )}
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        {iss.priority === 'CRITICAL' && (
                          <span style={{ fontSize: '10px', fontWeight: '800', color: '#dc2626', backgroundColor: '#fee2e2', padding: '2px 6px', borderRadius: '4px' }}>
                            CRITICAL
                          </span>
                        )}
                        {iss.priority === 'HIGH' && (
                          <span style={{ fontSize: '10px', fontWeight: '800', color: '#ea580c', backgroundColor: '#ffedd5', padding: '2px 6px', borderRadius: '4px' }}>
                            HIGH
                          </span>
                        )}
                        {iss.priority === 'MEDIUM' && (
                          <span style={{ fontSize: '10px', fontWeight: '700', color: '#2563eb', backgroundColor: '#eff6ff', padding: '2px 6px', borderRadius: '4px' }}>
                            MEDIUM
                          </span>
                        )}
                        {iss.priority === 'LOW' && (
                          <span style={{ fontSize: '10px', fontWeight: '600', color: '#64748b', backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                            LOW
                          </span>
                        )}
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: '700', color: '#0f172a' }}>
                          {iss.organizationId?.name || 'Unassigned Store'}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                          {iss.userId?.name || 'User'} ({iss.userId?.email || 'N/A'})
                        </div>
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: '600', color: '#0f172a' }}>{iss.title}</div>
                        <div style={{ fontSize: '12px', color: '#475569', marginTop: '4px', maxWidth: '340px', lineHeight: 1.4, wordBreak: 'break-word' }}>
                          {iss.description}
                        </div>
                        {iss.adminNotes && (
                          <div style={{ fontSize: '11px', color: '#059669', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', padding: '4px 8px', marginTop: '6px' }}>
                            <strong>Resolution Note:</strong> {iss.adminNotes}
                          </div>
                        )}
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontSize: '11px', color: '#334155', backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                          {iss.category}
                        </span>
                      </td>

                      <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '12px', whiteSpace: 'nowrap' }}>
                        {formatDate(iss.createdAt)}
                      </td>

                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          {iss.status === 'OPEN' && (
                            <button
                              type="button"
                              onClick={() => handleUpdateIssueStatus(iss._id, 'IN_PROGRESS')}
                              className="btn btn-secondary btn-sm"
                              style={{ fontSize: '11px', padding: '4px 8px' }}
                              title="Mark ticket Under Investigation"
                            >
                              Investigate
                            </button>
                          )}
                          {iss.status !== 'RESOLVED' ? (
                            <button
                              type="button"
                              onClick={() => handleUpdateIssueStatus(iss._id, 'RESOLVED')}
                              className="btn btn-sm"
                              style={{ backgroundColor: '#dcfce7', color: '#15803d', border: '1px solid #86efac', fontSize: '11px', padding: '4px 8px', fontWeight: '600' }}
                              title="Mark issue Resolved"
                            >
                              Resolve
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleUpdateIssueStatus(iss._id, 'OPEN')}
                              className="btn btn-secondary btn-sm"
                              style={{ fontSize: '11px', padding: '4px 8px' }}
                              title="Reopen issue"
                            >
                              Re-open
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              setNoteModalIssue(iss);
                              setNoteInput(iss.adminNotes || '');
                            }}
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: '11px', padding: '4px 6px' }}
                            title="Add resolution note for merchant"
                          >
                            <Edit3 size={13} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteIssue(iss._id)}
                            className="btn btn-sm"
                            style={{ backgroundColor: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', padding: '4px 6px' }}
                            title="Delete issue record"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Admin Resolution Note Modal */}
      {noteModalIssue && (
        <div className="modal-backdrop" style={{ zIndex: 10002 }}>
          <div
            className="modal-content modal-card"
            style={{
              maxWidth: '500px',
              width: '95%',
              padding: '24px',
              borderRadius: '16px',
              backgroundColor: '#ffffff',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '800', margin: 0, color: '#0f172a' }}>
                Admin Resolution Note
              </h3>
              <button
                type="button"
                onClick={() => setNoteModalIssue(null)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 12px 0' }}>
              Ticket: <strong>{noteModalIssue.title}</strong>
              <br />
              This resolution note will be displayed directly to the shop merchant in their Issue Portal.
            </p>

            <textarea
              className="form-control"
              rows={4}
              placeholder="e.g. Fixed the OAuth token refresh issue. Please click 'Sync Gmail' again..."
              value={noteInput}
              onChange={(e) => setNoteInput(e.target.value)}
              style={{ width: '100%', marginBottom: '16px', fontSize: '13px' }}
              autoFocus
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setNoteModalIssue(null)}
                disabled={savingNote}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveNote}
                disabled={savingNote}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                {savingNote ? (
                  <>
                    <RotateCw size={14} className="spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Send size={14} /> Save & Notify Merchant
                  </>
                )}
              </button>
            </div>
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

      {/* Super Admin Removal Confirmation Modal */}
      {deleteTarget && (
        <div
          className="modal-backdrop"
          style={{
            zIndex: 10001,
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            className="modal-content modal-card"
            style={{
              maxWidth: '480px',
              width: '100%',
              padding: '24px',
              borderRadius: '16px',
              backgroundColor: '#ffffff',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '16px' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '10px',
                  backgroundColor: '#fee2e2',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Trash2 size={24} />
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#0f172a', margin: '0 0 6px 0' }}>
                  {deleteTarget.type === 'user' ? 'Permanently Remove User?' : 'Permanently Remove Store?'}
                </h3>
                <p style={{ fontSize: '13px', color: '#64748b', margin: 0, lineHeight: 1.5 }}>
                  {deleteTarget.type === 'user' ? (
                    <>
                      You are about to remove <strong>{deleteTarget.name}</strong> ({deleteTarget.email}).
                      This action will permanently delete all <strong>{deleteTarget.storeCount}</strong> store(s) owned by this user,
                      including all items, sales records, invoices, and transaction logs.
                    </>
                  ) : (
                    <>
                      You are about to remove store <strong>{deleteTarget.name}</strong> ({deleteTarget.typeName})
                      owned by <strong>{deleteTarget.ownerName || 'Unknown'}</strong>.
                      This will permanently delete all <strong>{deleteTarget.skuCount}</strong> catalog items, sales records, invoices, and transactions.
                    </>
                  )}
                </p>
              </div>
            </div>

            <div
              style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                padding: '12px 14px',
                marginBottom: '20px',
                fontSize: '12px',
                color: '#991b1b',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertTriangle size={16} style={{ flexShrink: 0 }} />
              <span><strong>Warning:</strong> This deletion cannot be undone. All data will be permanently wiped.</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setDeleteTarget(null)}
                disabled={deleteLoading}
                style={{ padding: '8px 16px', fontSize: '13px' }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn"
                onClick={handleDeleteConfirm}
                disabled={deleteLoading}
                style={{
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  padding: '8px 18px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: '700',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: deleteLoading ? 'not-allowed' : 'pointer',
                  opacity: deleteLoading ? 0.7 : 1,
                }}
              >
                {deleteLoading ? (
                  <>
                    <RotateCw size={14} className="spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    Confirm Permanent Removal
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminView;

