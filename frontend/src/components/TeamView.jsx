import React, { useState, useEffect, useCallback } from 'react';
import { Users, Shield, ShieldCheck, UserCheck, Loader2, AlertCircle, CheckCircle2, Trash2, AlertTriangle, DatabaseZap } from 'lucide-react';
import { fetchUsers, updateUserRole, deleteUser, resetDatabase } from '../services/api.js';
import { formatIndianDate } from '../utils/formatters.js';
import { useAuth } from '../context/AuthContext.jsx';

export const TeamView = ({ onToast }) => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { id, name }
  const [showDeleteAll, setShowDeleteAll] = useState(false);
  const [deleteAllConfirmText, setDeleteAllConfirmText] = useState('');
  const [deletingAll, setDeletingAll] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchUsers();
      setUsers(res.users || []);
    } catch (err) {
      console.error('[TeamView] Failed to load users:', err);
      if (onToast) onToast(err.message || 'Failed to load team members', 'error');
    } finally {
      setLoading(false);
    }
  }, [onToast]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleToggleRole = async (targetUser) => {
    const newRole = targetUser.role === 'admin' ? 'staff' : 'admin';
    setUpdatingId(targetUser.id);
    try {
      const res = await updateUserRole(targetUser.id, newRole);
      if (onToast) onToast(res.message || `Role updated to ${newRole}`, 'success');
      loadUsers();
    } catch (err) {
      if (onToast) onToast(err.message || 'Failed to update role', 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteUser = async (userId) => {
    setDeletingId(userId);
    setDeleteConfirm(null);
    try {
      const res = await deleteUser(userId);
      if (onToast) onToast(res.message || 'User removed from organization', 'success');
      loadUsers();
    } catch (err) {
      if (onToast) onToast(err.message || 'Failed to remove user', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteAllData = async () => {
    setDeletingAll(true);
    try {
      const res = await resetDatabase();
      if (onToast) onToast(res.message || 'All store data deleted successfully.', 'success');
      setShowDeleteAll(false);
      setDeleteAllConfirmText('');
    } catch (err) {
      if (onToast) onToast(err.message || 'Failed to delete data. Please try again.', 'error');
    } finally {
      setDeletingAll(false);
    }
  };

  const CONFIRM_PHRASE = 'DELETE ALL';

  const isAdmin = currentUser?.role === 'admin';

  return (
    <div>
      <div className="table-card">
        <div className="table-header-bar">
          <div style={{ fontWeight: 700, fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={18} color="#2563eb" />
            Team & Administrator Management
          </div>

          <div style={{ fontSize: '13px', color: '#64748b' }}>
            {users.filter((u) => u.role === 'admin').length} Admin(s) active
          </div>
        </div>

        <div style={{ padding: '16px 20px', background: '#f8fafc', borderBottom: '1px solid var(--border)', fontSize: '13px', color: '#475569' }}>
          💡 <strong>Multi-Store Support:</strong> All users shown here belong to your store. Admins can promote/demote roles or remove members from this store.
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Email Address</th>
                <th>Role</th>
                <th>Last Active (IST)</th>
                <th style={{ textAlign: 'right' }}>Admin Privileges</th>
                {isAdmin && <th style={{ textAlign: 'right' }}>Remove</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={isAdmin ? 6 : 5} style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                    Loading team members...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 6 : 5} style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                    No other members registered yet.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isSelf = u.id === currentUser?.id || u.email === currentUser?.email;
                  const isUserAdmin = u.role === 'admin';
                  const isUpdating = updatingId === u.id;
                  const isDeleting = deletingId === u.id;

                  return (
                    <tr key={u.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {u.avatar ? (
                            <img
                              src={u.avatar}
                              alt={u.name}
                              style={{ width: '32px', height: '32px', borderRadius: '50%' }}
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                backgroundColor: 'var(--primary-light)',
                                color: 'var(--primary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 700,
                                fontSize: '13px',
                              }}
                            >
                              {(u.name || u.email)[0].toUpperCase()}
                            </div>
                          )}
                          <div>
                            <strong>{u.name || 'Anonymous User'}</strong>
                            {isSelf && (
                              <span style={{ marginLeft: '8px', fontSize: '11px', color: 'var(--primary)', fontWeight: 600 }}>
                                (You)
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td>{u.email}</td>
                      <td>
                        <span className={`badge ${isUserAdmin ? 'badge-primary' : 'badge-neutral'}`}>
                          {isUserAdmin ? <ShieldCheck size={13} style={{ marginRight: '4px' }} /> : <UserCheck size={13} style={{ marginRight: '4px' }} />}
                          {isUserAdmin ? 'Administrator' : 'Staff Member'}
                        </span>
                      </td>
                      <td style={{ fontSize: '13px', color: '#64748b' }}>
                        {formatIndianDate(u.lastLogin)}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {isSelf ? (
                          <span style={{ fontSize: '12px', color: '#94a3b8' }}>Current Session</span>
                        ) : isAdmin ? (
                          <button
                            className={`btn btn-sm ${isUserAdmin ? 'btn-secondary' : 'btn-primary'}`}
                            onClick={() => handleToggleRole(u)}
                            disabled={isUpdating || isDeleting}
                            title={isUserAdmin ? 'Change role to Staff' : 'Promote user to Administrator'}
                          >
                            {isUpdating ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : (
                              <Shield size={13} />
                            )}
                            {isUserAdmin ? 'Revoke Admin' : 'Make Admin'}
                          </button>
                        ) : null}
                      </td>
                      {isAdmin && (
                        <td style={{ textAlign: 'right' }}>
                          {!isSelf && (
                            deleteConfirm?.id === u.id ? (
                              <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                                <button
                                  className="btn btn-sm"
                                  style={{ background: '#dc2626', color: '#fff', border: 'none', fontSize: '12px' }}
                                  onClick={() => handleDeleteUser(u.id)}
                                  disabled={isDeleting}
                                >
                                  {isDeleting ? <Loader2 size={12} className="animate-spin" /> : 'Confirm'}
                                </button>
                                <button
                                  className="btn btn-sm btn-secondary"
                                  onClick={() => setDeleteConfirm(null)}
                                  style={{ fontSize: '12px' }}
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                className="btn btn-sm btn-secondary"
                                onClick={() => setDeleteConfirm({ id: u.id, name: u.name || u.email })}
                                disabled={isDeleting || isUpdating}
                                title={`Remove ${u.name || u.email} from this store`}
                                style={{ color: '#dc2626', borderColor: '#fca5a5' }}
                              >
                                <Trash2 size={13} />
                                Remove
                              </button>
                            )
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Danger Zone: Delete All Store Data ────────────────────────── */}
      {isAdmin && (
        <div
          style={{
            marginTop: '24px',
            border: '1.5px solid #fca5a5',
            borderRadius: '12px',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              background: '#fff5f5',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
            }}
            onClick={() => setShowDeleteAll((v) => !v)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#dc2626' }}>
              <AlertTriangle size={18} />
              <div>
                <div style={{ fontWeight: 700, fontSize: '15px' }}>Danger Zone</div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                  Permanently delete all your store's inventory, invoices, and transaction records.
                </div>
              </div>
            </div>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>{showDeleteAll ? '▲ Hide' : '▼ Show'}</span>
          </div>

          {showDeleteAll && (
            <div style={{ padding: '20px', background: '#fff' }}>
              <div
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  marginBottom: '16px',
                  fontSize: '13px',
                  color: '#7f1d1d',
                }}
              >
                ⚠️ <strong>This will permanently delete:</strong> all inventory items, all purchase invoices, all sales transactions, and Gmail sync history for <strong>your store only</strong>. <br />
                <strong>This action cannot be undone.</strong> Your account and team members will remain.
              </div>

              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
                Type <code style={{ background: '#f1f5f9', padding: '1px 6px', borderRadius: '4px' }}>DELETE ALL</code> to confirm:
              </label>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input
                  type="text"
                  value={deleteAllConfirmText}
                  onChange={(e) => setDeleteAllConfirmText(e.target.value)}
                  placeholder="Type DELETE ALL"
                  style={{
                    padding: '9px 14px',
                    borderRadius: '8px',
                    border: '1.5px solid #fca5a5',
                    fontSize: '14px',
                    outline: 'none',
                    width: '200px',
                    fontFamily: 'monospace',
                  }}
                />
                <button
                  className="btn"
                  onClick={handleDeleteAllData}
                  disabled={deleteAllConfirmText !== CONFIRM_PHRASE || deletingAll}
                  style={{
                    background: deleteAllConfirmText === CONFIRM_PHRASE ? '#dc2626' : '#94a3b8',
                    color: '#fff',
                    border: 'none',
                    padding: '9px 18px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: deleteAllConfirmText === CONFIRM_PHRASE ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  {deletingAll ? <Loader2 size={15} className="animate-spin" /> : <DatabaseZap size={15} />}
                  {deletingAll ? 'Deleting...' : 'Delete All Store Data'}
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => { setShowDeleteAll(false); setDeleteAllConfirmText(''); }}
                  style={{ fontSize: '13px' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TeamView;
