import React, { useState } from 'react';
import { Package, Mail, UploadCloud, ShoppingCart, Loader2 } from 'lucide-react';
import { triggerGmailSync } from '../services/api.js';

export const Navbar = ({ onOpenUpload, onOpenSale, onSyncComplete }) => {
  const [syncing, setSyncing] = useState(false);

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
        <span className="brand-badge">Auto Inventory</span>
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
      </div>
    </header>
  );
};

export default Navbar;
