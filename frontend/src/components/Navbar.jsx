import React from 'react';
import {
  Package,
  Mail,
  UploadCloud,
  ShoppingCart,
  LogOut,
  User as UserIcon,
  FileSpreadsheet,
  RotateCw,
  PlusCircle,
  Download,
  Store,
  ChevronDown,
  Plus,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export const Navbar = ({
  onOpenUpload,
  onOpenSale,
  onOpenAddItem,
  onOpenSyncModal,
  onExportReport,
  onInstall,
  onOpenStoreModal,
}) => {
  const { user, logout } = useAuth();

  return (
    <header className="navbar">
      <div className="brand" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <a
          href="/projects/stoqra/"
          style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', color: 'inherit' }}
          title="Stoqra Home"
        >
          <img
            src="/projects/stoqra/stoqra-icon.png"
            alt="Stoqra Logo"
            style={{ width: '28px', height: '28px', objectFit: 'contain' }}
          />
          <span style={{ fontSize: '18px', fontWeight: '800', letterSpacing: '-0.02em', color: '#0f172a' }}>
            Stoqra
          </span>
        </a>

        {/* Subtle vertical divider */}
        <span style={{ width: '1px', height: '20px', backgroundColor: 'var(--border)' }}></span>

        {/* Store Selector Pill & Add Store Trigger */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <button
            onClick={() => onOpenStoreModal && onOpenStoreModal('manage')}
            className="store-pill-btn"
            title="Switch or manage your stores & organizations"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 10px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              backgroundColor: '#f8fafc',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '600',
              color: 'var(--text-main)',
              transition: 'all 0.15s ease',
            }}
          >
            <Store size={15} color="#2563eb" />
            <span style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.organization?.name || 'My Store'}
            </span>
            <span
              className="brand-badge"
              style={{
                fontSize: '10px',
                padding: '1px 6px',
                backgroundColor: '#eff6ff',
                color: '#2563eb',
                borderRadius: '4px',
                fontWeight: '600',
              }}
            >
              {user?.organization?.type || 'General Retail'}
            </span>
            <ChevronDown size={14} color="#64748b" />
          </button>

          <button
            onClick={() => onOpenStoreModal && onOpenStoreModal('add')}
            title="Add a new store / organization"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
              padding: '5px 8px',
              borderRadius: '6px',
              border: '1px dashed #93c5fd',
              backgroundColor: '#eff6ff',
              color: '#2563eb',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '600',
            }}
          >
            <Plus size={13} />
            <span>Store</span>
          </button>
        </div>
      </div>

      <div className="nav-actions">
        {onInstall && (
          <button
            className="btn btn-primary"
            onClick={onInstall}
            style={{ backgroundColor: '#10b981', borderColor: '#059669' }}
            title="Install Stoqra app on your device"
          >
            <Download size={16} />
            <span>Install App</span>
          </button>
        )}

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

        {onOpenAddItem && (
          <button className="btn btn-primary" onClick={onOpenAddItem} title="Add product to inventory">
            <PlusCircle size={16} />
            <span>Add Product</span>
          </button>
        )}

        <button className="btn btn-secondary" onClick={() => onOpenSale(null)}>
          <ShoppingCart size={16} />
          Record Sale
        </button>

        <button className="btn btn-secondary" onClick={onOpenUpload}>
          <UploadCloud size={16} />
          Upload Bill
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
