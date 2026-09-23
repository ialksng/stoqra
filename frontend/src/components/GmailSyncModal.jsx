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
  KeyRound,
  ShieldCheck,
} from 'lucide-react';
import { triggerGmailSync, getGmailSyncStatus } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';

export const GmailSyncModal = ({ isOpen, onClose, onOpenUpload, onSyncFinished, forceRescan = false }) => {
  const { user, authConfig } = useAuth();
  const [progress, setProgress] = useState(null);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [authorizing, setAuthorizing] = useState(false);
  const pollIntervalRef = useRef(null);

  // Helper to retrieve user's session Gmail access token
  const getCachedUserToken = () => {
    if (!user?.email) return null;
    return sessionStorage.getItem(`stoqra_gmail_token_${user.email.toLowerCase()}`);
  };

  const setCachedUserToken = (token) => {
    if (!user?.email) return;
    if (token) {
      sessionStorage.setItem(`stoqra_gmail_token_${user.email.toLowerCase()}`, token);
    } else {
      sessionStorage.removeItem(`stoqra_gmail_token_${user.email.toLowerCase()}`);
    }
  };

  // Trigger Google Identity Services OAuth popup to request read-only Gmail access
  const requestGoogleGmailPermission = () => {
    return new Promise((resolve, reject) => {
      if (!window.google?.accounts?.oauth2) {
        return reject(new Error('Google OAuth service is still initializing. Please wait a moment and try again.'));
      }

      const clientId = authConfig?.googleClientId;
      if (!clientId) {
        return reject(new Error('Google Client ID is missing. Please contact platform support.'));
      }

      try {
        const tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: 'https://www.googleapis.com/auth/gmail.readonly',
          hint: user?.email || '',
          prompt: '',
          callback: (tokenResponse) => {
            if (tokenResponse && tokenResponse.access_token) {
              setCachedUserToken(tokenResponse.access_token);
              resolve(tokenResponse.access_token);
            } else if (tokenResponse?.error) {
              const desc = tokenResponse.error_description || tokenResponse.error || '';
              reject(new Error(desc));
            } else {
              reject(new Error('No access token received from Google.'));
            }
          },
          error_callback: (err) => {
            const msg = err?.message || err?.error || 'Google authorization dialog error.';
            reject(new Error(msg));
          },
        });

        tokenClient.requestAccessToken({ prompt: '' });
      } catch (err) {
        reject(err);
      }
    });
  };

  const handleAuthorizeAndSync = async () => {
    setAuthorizing(true);
    setError(null);
    try {
      const accessToken = await requestGoogleGmailPermission();
      setNeedsAuth(false);
      await startSync(forceRescan, accessToken);
    } catch (err) {
      console.warn('[GmailSyncModal] Auth error:', err.message);
      const isBlocked =
        err.message?.includes('access_denied') ||
        err.message?.includes('403') ||
        err.message?.includes('verification') ||
        err.message?.includes('not completed') ||
        err.message?.includes('test');

      if (isBlocked) {
        setError(
          `Google OAuth Access Blocked: Account "${user?.email}" has not been added to Google Cloud "Test Users". Google requires unverified apps in testing mode to authorize each tester email in Google Cloud Console.`
        );
      } else {
        setError(err.message || 'Failed to authorize Gmail access. Please try again.');
      }
    } finally {
      setAuthorizing(false);
    }
  };

  const startSync = async (force = false, explicitToken = null) => {
    setError(null);
    setNeedsAuth(false);

    const tokenToUse = explicitToken || getCachedUserToken();

    // If user is not ialksng@gmail.com and has no access token, prompt them to authorize first
    const isMainAdmin = user?.email?.toLowerCase() === 'ialksng@gmail.com';
    if (!tokenToUse && !isMainAdmin) {
      setNeedsAuth(true);
      return;
    }

    setIsPolling(true);
    setProgress({
      inProgress: true,
      statusMessage: `Connecting to ${user?.email || 'your'} mailbox...`,
      totalFound: 0,
      currentIndex: 0,
      processed: 0,
      skipped: 0,
      errors: 0,
      itemsImported: 0,
      invoices: [],
      logs: [{ type: 'info', text: `Initiating invoice scan for ${user?.email || 'logged-in user'}...` }],
    });

    try {
      const syncRes = await triggerGmailSync({
        forceRescan: force,
        userAccessToken: tokenToUse,
        async: true,
      });

      if (syncRes.needsAuth) {
        setCachedUserToken(null);
        setNeedsAuth(true);
        setIsPolling(false);
        return;
      }

      // Start polling status
      pollStatus();
    } catch (err) {
      if (err.message && (err.message.includes('authorization required') || err.message.includes('401'))) {
        setCachedUserToken(null);
        setNeedsAuth(true);
      } else {
        setError(err.message || 'Failed to start Gmail sync');
      }
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
      const token = getCachedUserToken();
      const isMainAdmin = user?.email?.toLowerCase() === 'ialksng@gmail.com';

      if (!token && !isMainAdmin) {
        setNeedsAuth(true);
      } else {
        startSync(forceRescan, token);
      }

      pollIntervalRef.current = setInterval(pollStatus, 1500);
    } else {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      setNeedsAuth(false);
      setError(null);
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
  const isFinished = progress && !progress.inProgress && !needsAuth;

  return (
    <div className="modal-backdrop" style={{ zIndex: 9999 }}>
      <div
        className="modal-content modal-card"
        style={{
          maxWidth: '560px',
          width: '95%',
          maxHeight: '90vh',
          overflowY: 'auto',
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
                {needsAuth ? 'Connect Your Gmail' : isFinished ? 'Gmail Sync Complete' : 'Syncing Gmail Invoices'}
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: '600',
                    color: '#2563eb',
                    backgroundColor: '#eff6ff',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    maxWidth: '220px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={user?.email}
                >
                  {user?.email || 'Logged-in user'}
                </span>
                <span style={{ fontSize: '12px', color: '#64748b' }}>• Isolated to this store</span>
              </div>
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

        {/* Error notification & Google Test User Guidance */}
        {error && (
          <div
            style={{
              padding: '14px 16px',
              backgroundColor: '#fff7ed',
              border: '1px solid #fed7aa',
              borderRadius: '12px',
              color: '#9a3412',
              fontSize: '13px',
              marginBottom: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '8px' }}>
              <AlertCircle size={18} color="#ea580c" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <div style={{ fontWeight: '700', color: '#c2410c', marginBottom: '4px' }}>
                  Google Permission Requirement
                </div>
                <div>{error}</div>
              </div>
            </div>

            <div
              style={{
                backgroundColor: '#ffffff',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #ffedd5',
                marginTop: '8px',
                fontSize: '12px',
                color: '#7c2d12',
                lineHeight: 1.5,
              }}
            >
              <strong>Developer Action Required:</strong> To enable Gmail sync for <code>{user?.email}</code>, add this email address under <strong>Google Cloud Console &rarr; APIs & Services &rarr; OAuth consent screen &rarr; Test users</strong>.
            </div>

            {onOpenUpload && (
              <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={onOpenUpload}
                  className="btn btn-primary btn-sm"
                  style={{ backgroundColor: '#ea580c', borderColor: '#c2410c' }}
                >
                  Upload Bill PDF Directly (No Google Setup Required)
                </button>
              </div>
            )}
          </div>
        )}

        {/* User-specific Permission Prompt */}
        {needsAuth ? (
          <div style={{ padding: '8px 0 16px 0' }}>
            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '20px',
                textAlign: 'center',
                marginBottom: '20px',
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  backgroundColor: '#eff6ff',
                  color: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px auto',
                }}
              >
                <KeyRound size={24} />
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', marginBottom: '8px' }}>
                Authorize Gmail Ingestion for {user?.email}
              </h3>
              <p style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.5', margin: '0 0 16px 0' }}>
                To automatically extract invoices and purchase bills into your store, Google requires you to grant Stoqra <strong>read-only access</strong> to your Gmail inbox.
              </p>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  justifyContent: 'center',
                  fontSize: '12px',
                  color: '#059669',
                  backgroundColor: '#ecfdf5',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  marginBottom: '18px',
                }}
              >
                <ShieldCheck size={16} />
                <span>Private & Secure: Scans only PDF attachments from {user?.email}.</span>
              </div>

              <button
                onClick={handleAuthorizeAndSync}
                disabled={authorizing}
                style={{
                  width: '100%',
                  padding: '12px 20px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: '600',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  cursor: authorizing ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.3)',
                  transition: 'background-color 0.15s ease',
                }}
              >
                {authorizing ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Connecting to Google...</span>
                  </>
                ) : (
                  <>
                    <Mail size={18} />
                    <span>Authorize & Sync My Mailbox</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <>
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
                  {total > 0 ? `${current}/${total} (${percentage}%)` : isFinished ? '100%' : 'Scanning...'}
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
                  Invoices Found
                </div>
              </div>

              <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                <div style={{ fontSize: '20px', fontWeight: '700', color: '#2563eb' }}>
                  {progress?.itemsImported || 0}
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', marginTop: '2px' }}>
                  Items Staged
                </div>
              </div>

              <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                <div style={{ fontSize: '20px', fontWeight: '700', color: '#64748b' }}>
                  {progress?.skipped || 0}
                </div>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', marginTop: '2px' }}>
                  Skipped / Clean
                </div>
              </div>
            </div>

            {/* Live Activity Log */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.5px' }}>
                Live Ingestion Feed ({user?.email})
              </div>
              <div
                style={{
                  maxHeight: '160px',
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
                  <div style={{ color: '#64748b' }}>Scanning messages in {user?.email}...</div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              {isFinished ? (
                <button
                  onClick={onClose}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  Done & View Staged Bills
                </button>
              ) : (
                <button
                  onClick={onClose}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#475569',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  Run in Background
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default GmailSyncModal;
