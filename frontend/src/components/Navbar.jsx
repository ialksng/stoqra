import React, { useState } from 'react';
import { Package, Mail, UploadCloud, ShoppingCart, Loader2, LogOut, User as UserIcon } from 'lucide-react';
import { triggerGmailSync } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';

export const Navbar = ({ onOpenUpload, onOpenSale, onSyncComplete }) => {
  const [syncing, setSyncing] = useState(false);
  const { user, logout } = useAuth();

  const handleSyncGmail = async () => {
    setSyncing(true);
    try {
      const res = await triggerGmailSync();
      const processed = res.result?.processed ?? 0;
      const skipped = res.result?.skipped ?? 0;
      const reason = res.result?.reason;

      let msg = `Gmail sync complete: ${processed} processed, ${skipped} skipped.`;
      if (reason) msg = `Gmail sync: ${reason}`;

      if (onSyncComplete) onSyncComplete(msg, 'success');
    } catch (err) {
      if (onSyncComplete) onSyncComplete(`Gmail sync error: ${err.message}`, 'error');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <header className="navbar">
      <div className="brand">
        <Package size={26} />
        <span>Stoqra</span>
        <span className="brand-badge">GST Auto Inventory</span>
      </div>

      <div className="nav-actions">
        <button
          className="btn btn-secondary"
          onClick={handleSyncGmail}
          disabled={syncing}
          title="Query Gmail for unread invoice PDFs and restock automatically"
        >
          {syncing ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
          {syncing ? 'Checking Gmail...' : 'Sync Gmail'}
        </button>

        <button className="btn btn-secondary" onClick={() => onOpenSale(null)}>
          <ShoppingCart size={16} />
          Record Sale
        </button>

        <button className="btn btn-primary" onClick={onOpenUpload}>
          <UploadCloud size={16} />
          Upload Invoice PDF
        </button>

        {/* User Profile & Logout */}
        {user && (
          <div className="user-profile-menu">
            <div className="user-chip" title={user.email}>
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name || 'User'}
                  className="user-avatar"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="user-avatar-placeholder">
                  <UserIcon size={14} />
                </div>
              )}
              <div className="user-info">
                <span className="user-name">{user.name || user.email}</span>
                <span className={`user-role-badge ${user.role || 'staff'}`}>{user.role || 'staff'}</span>
              </div>
            </div>

            <button
              className="btn btn-icon btn-logout"
              onClick={logout}
              title="Sign out of Stoqra"
            >
              <LogOut size={16} />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;
