import React, { useEffect, useState, useRef } from 'react';
import {
  Mail,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Package,
  FileText,
  RotateCw,
  X,
  ArrowRight,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { triggerGmailSync, getGmailSyncStatus } from '../services/api.js';

export const GmailSyncModal = ({ isOpen, onClose, onSyncFinished, forceRescan = false }) => {
  const [progress, setProgress] = useState(null);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState(null);
  const pollIntervalRef = useRef(null);

  const startSync = async (force = false) => {
    setError(null);
    setIsPolling(true);
    setProgress({
      inProgress: true,
      statusMessage: 'Initiating Gmail mailbox scan...',
      totalFound: 0,
      currentIndex: 0,
      processed: 0,
      skipped: 0,
      errors: 0,
      itemsImported: 0,
      invoices: [],
      logs: [{ type: 'info', text: 'Connecting to Gmail API...' }],
    });

    try {
      // Trigger background sync
      triggerGmailSync({ forceRescan: force, async: true }).catch((err) => {
        console.warn('[GmailSyncModal] Trigger error:', err.message);
      });

      // Start polling status immediately
      pollStatus();
    } catch (err) {
      setError(err.message || 'Failed to start Gmail sync');
      setIsPolling(false);
    }
  };

  const pollStatus = async () => {
    try {
      const res = await getGmailSyncStatus();
      if (res.success && res.progress) {
        setProgress(res.progress);

        if (!res.progress.inProgress) {
          // Sync has completed
          setIsPolling(false);
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          if (onSyncFinished) {
            onSyncFinished(res.progress);
          }
        }
      }
    } catch (err) {
      console.warn('[GmailSyncModal] Poll error:', err.message);
    }
  };

  useEffect(() => {
    if (isOpen) {
      startSync(forceRescan);
      pollIntervalRef.current = setInterval(pollStatus, 1500);
    } else {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const total = progress?.totalFound || 0;
  const current = progress?.currentIndex || 0;
  const percentage = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : progress?.inProgress ? 25 : 100;
  const isFinished = progress && !progress.inProgress;

  return (
    <div className="modal-backdrop" style={{ zIndex: 9999 }}>
      <div
        className="modal-content"
        style={{
          maxWidth: '560px',
          width: '100%',
          padding: '24px',
          borderRadius: '16px',
          background: '#ffffff',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        }}
      >
        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                backgroundColor: isFinished ? '#ecfdf5' : '#eff6ff',
                color: isFinished ? '#059669' : '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isFinished ? <CheckCircle2 size={24} /> : <Mail size={24} className="animate-pulse" />}
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: 0 }}>
                {isFinished ? 'Gmail Ingestion Complete' : 'Syncing Gmail Invoices'}
              </h2>
              <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>
                {isFinished ? 'All mailbox invoices processed & catalog updated' : 'Gemini AI automated stock extraction'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#94a3b8',
              padding: '6px',
              borderRadius: '8px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Status Bar */}
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '10px',
            backgroundColor: isFinished ? '#f0fdf4' : '#f8fafc',
            border: `1px solid ${isFinished ? '#bbf7d0' : '#e2e8f0'}`,
            marginBottom: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: isFinished ? '#166534' : '#1e293b' }}>
              {progress?.statusMessage || 'Scanning emails...'}
            </span>
            <span style={{ fontSize: '12px', fontWeight: '700', color: isFinished ? '#166534' : '#2563eb' }}>
              {total > 0 ? `${current}/${total} (${percentage}%)` : isFinished ? '100%' : 'Connecting...'}
            </span>
          </div>

          {/* Progress bar */}
          <div style={{ width: '100%', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${percentage}%`,
                height: '100%',
                backgroundColor: isFinished ? '#10b981' : '#2563eb',
                borderRadius: '999px',
                transition: 'width 0.4s ease',
              }}
            />
          </div>
        </div>

        {/* Counter Metric Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '18px' }}>
          <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#059669' }}>
              {progress?.processed || 0}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', marginTop: '2px' }}>
              Invoices Ingested
            </div>
          </div>

          <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#2563eb' }}>
              {progress?.itemsImported || 0}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', marginTop: '2px' }}>
              Items Added
            </div>
          </div>

          <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#64748b' }}>
              {progress?.skipped || 0}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', marginTop: '2px' }}>
              Skipped / Up-to-Date
            </div>
          </div>
        </div>

        {/* Live Activity Log */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>
            Live Ingestion Feed
          </div>
          <div
            style={{
              maxHeight: '180px',
              overflowY: 'auto',
              backgroundColor: '#0f172a',
              borderRadius: '10px',
              padding: '12px',
              fontFamily: 'monospace',
              fontSize: '12px',
              color: '#94a3b8',
              lineHeight: '1.6',
            }}
          >
            {progress?.logs && progress.logs.length > 0 ? (
              progress.logs.map((log, idx) => (
                <div
                  key={idx}
                  style={{
                    color: log.type === 'success' ? '#4ade80' : log.type === 'error' ? '#f87171' : '#94a3b8',
                    marginBottom: '4px',
                  }}
                >
                  {log.text}
                </div>
              ))
            ) : (
              <div style={{ color: '#64748b' }}>Waiting for mail items...</div>
            )}
          </div>
        </div>

        {/* Actions Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
          {isFinished ? (
            <>
              <button
                className="btn btn-secondary"
                onClick={() => startSync(true)}
                style={{ fontSize: '13px', padding: '8px 14px' }}
              >
                <RotateCw size={14} />
                <span>Deep Re-scan</span>
              </button>
              <button
                className="btn btn-primary"
                onClick={onClose}
                style={{ fontSize: '13px', padding: '8px 18px' }}
              >
                <span>View Updated Catalog</span>
                <ArrowRight size={14} />
              </button>
            </>
          ) : (
            <button
              className="btn btn-secondary"
              onClick={onClose}
              style={{ fontSize: '13px', padding: '8px 16px' }}
            >
              <span>Minimize (Runs in Background)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default GmailSyncModal;
