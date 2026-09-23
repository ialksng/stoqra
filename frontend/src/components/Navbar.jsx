import React from 'react';
import { Package, Mail, UploadCloud, ShoppingCart, LogOut, User as UserIcon, FileSpreadsheet, RotateCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export const Navbar = ({ onOpenUpload, onOpenSale, onOpenSyncModal, onExportReport }) => {
  const { user, logout } = useAuth();

  return (
    <header className="navbar">
      <div className="brand">
        <Package size={26} />
        <span>{user?.organization?.name || 'Stoqra'}</span>
        <span className="brand-badge">{user?.organization?.type || 'GST Auto Inventory'}</span>
      </div>

      <div className="nav-actions">
        <div className="sync-btn-group" style={{ display: 'inline-flex', gap: '3px' }}>
          <button
            className="btn btn-secondary"
            onClick={() => onOpenSyncModal && onOpenSyncModal(false)}
            title="Scan Gmail for invoice attachments with live progress"
          >
            <Mail size={16} />
            <span>Sync Gmail</span>
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => onOpenSyncModal && onOpenSyncModal(true)}
            style={{ padding: '0 8px' }}
            title="Deep Re-scan: Re-evaluate all emails in inbox with live progress"
          >
            <RotateCw size={14} />
          </button>
        </div>

        <button className="btn btn-secondary" onClick={() => onOpenSale(null)}>
          <ShoppingCart size={16} />
          Record Sale
        </button>

        <button className="btn btn-primary" onClick={onOpenUpload}>
          <UploadCloud size={16} />
          Upload Invoice PDF
        </button>

        {onExportReport && (
          <button
            className="btn btn-secondary"
            onClick={onExportReport}
            title="Export complete business report to Excel (.xlsx)"
          >
            <FileSpreadsheet size={16} />
            Export Excel
          </button>
        )}

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
              <div className="user-meta">
                <span className="user-name">{user.name || user.email}</span>
                <span className="user-role-badge">{user.role || 'STAFF'}</span>
              </div>
            </div>

            <button
              onClick={logout}
              className="btn-icon-logout"
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
