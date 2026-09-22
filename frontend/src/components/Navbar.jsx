import React, { useState } from 'react';
import { Package, Mail, UploadCloud, ShoppingCart, Loader2, LogOut, User as UserIcon, FileSpreadsheet, RotateCw } from 'lucide-react';
import { triggerGmailSync } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';

export const Navbar = ({ onOpenUpload, onOpenSale, onSyncComplete, onExportReport }) => {
  const [syncing, setSyncing] = useState(false);
  const { user, logout } = useAuth();

  const handleSyncGmail = async (forceRescan = false) => {
    setSyncing(true);
    try {
      const res = await triggerGmailSync({ forceRescan });
      const result = res.result || {};
      const processed = result.processed ?? 0;
      const skipped = result.skipped ?? 0;
      const errorMsg = result.error || result.reason;
      const details = result.details || [];
      const totalFound = result.totalEmailsFound ?? (processed + skipped);

      if (result.status === 'in_progress') {
        if (onSyncComplete) {
          onSyncComplete('Gmail sync is currently scanning your inbox in the background. Please wait a moment...', 'info');
        }
        return;
      }

      if (result.status === 'skipped') {
        if (onSyncComplete) {
          onSyncComplete(`Gmail sync: ${result.reason || 'Skipped'}`, 'warning');
        }
        return;
      }

      if (result.status === 'error' || (errorMsg && processed === 0 && skipped === 0)) {
        if (onSyncComplete) onSyncComplete(`Gmail sync error: ${errorMsg}`, 'error');
        return;
      }

      let msg = '';
      if (processed > 0) {
        msg = `Gmail sync complete: ${processed} new invoice(s) imported into catalog.`;
        if (skipped > 0) {
          msg += ` (${skipped} already up-to-date)`;
        }
      } else if (skipped > 0) {
        const skipSummary = details
          .filter((d) => d.status === 'skipped')
          .map((d) => {
            if (d.reason === 'no_inventory_items') return `"${d.filename || 'PDF'}" has no invoice line items`;
            if (d.reason === 'already_exists' || d.reason === 'already_processed') return 'already in database';
            if (d.reason && d.reason.includes('already exists in records')) {
              return `${d.invoiceNumber ? `Invoice #${d.invoiceNumber} ` : ''}already ingested`;
            }
            if (d.reason === 'no_pdf_attachment') return 'no PDF attachment';
            return d.reason;
          })
          .slice(0, 3)
          .join(', ');

        msg = `Checked ${totalFound} email(s) in Gmail — all invoices are already in your system (${skipSummary || `${skipped} skipped`}). If you deleted items, click the Re-scan icon to re-import.`;
      } else {
        msg = 'Gmail sync: No emails with PDF attachments found matching criteria. Make sure your emails have PDF invoices attached.';
      }

      if (onSyncComplete) onSyncComplete(msg, processed > 0 ? 'success' : 'info');
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
        <div className="sync-btn-group" style={{ display: 'inline-flex', gap: '3px' }}>
          <button
            className="btn btn-secondary"
            onClick={() => handleSyncGmail(false)}
            disabled={syncing}
            title="Query Gmail for unread invoice PDFs and restock automatically"
          >
            {syncing ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
            {syncing ? 'Checking Gmail...' : 'Sync Gmail'}
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => handleSyncGmail(true)}
            disabled={syncing}
            style={{ padding: '0 8px' }}
            title="Deep Re-scan: Re-evaluate all emails in inbox and restore any missing invoices"
          >
            <RotateCw size={14} className={syncing ? 'animate-spin' : ''} />
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
