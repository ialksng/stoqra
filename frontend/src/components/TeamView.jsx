import React, { useState, useEffect, useCallback } from 'react';
import { Users, Shield, ShieldCheck, UserCheck, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { fetchUsers, updateUserRole } from '../services/api.js';
import { formatIndianDate } from '../utils/formatters.js';
import { useAuth } from '../context/AuthContext.jsx';

export const TeamView = ({ onToast }) => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

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

  return (
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

      <div style={{ padding: '16px 20px', background: '#f8fafc', borderBottom: '1px solid var(--border)', fontSize: '13px', color: '#475569', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          💡 <strong>Multi-Admin Support:</strong> You can promote any registered Google user to <strong>Admin</strong> below, or declare comma-separated emails in Render via <code>ADMIN_EMAILS=email1@gmail.com, email2@gmail.com</code>.
        </div>
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
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                  Loading team members...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                  No other members registered yet.
                </td>
              </tr>
            ) : (
              users.map((u) => {
                const isSelf = u.id === currentUser?.id || u.email === currentUser?.email;
                const isAdmin = u.role === 'admin';
                const isUpdating = updatingId === u.id;

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
                      <span className={`badge ${isAdmin ? 'badge-primary' : 'badge-neutral'}`}>
                        {isAdmin ? <ShieldCheck size={13} style={{ marginRight: '4px' }} /> : <UserCheck size={13} style={{ marginRight: '4px' }} />}
                        {isAdmin ? 'Administrator' : 'Staff Member'}
                      </span>
                    </td>
                    <td style={{ fontSize: '13px', color: '#64748b' }}>
                      {formatIndianDate(u.lastLogin)}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {isSelf ? (
                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>Current Session</span>
                      ) : (
                        <button
                          className={`btn btn-sm ${isAdmin ? 'btn-secondary' : 'btn-primary'}`}
                          onClick={() => handleToggleRole(u)}
                          disabled={isUpdating}
                          title={isAdmin ? 'Change role to Staff' : 'Promote user to Administrator'}
                        >
                          {isUpdating ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <Shield size={13} />
                          )}
                          {isAdmin ? 'Revoke Admin' : 'Make Admin'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TeamView;
