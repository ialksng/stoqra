import React, { useEffect, useRef, useState } from 'react';
import { Package, ShieldCheck, Sparkles, AlertCircle, ArrowRight, Loader2, Check } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export const LoginView = () => {
  const { authConfig, loginWithGoogle, demoLogin } = useAuth();
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const googleBtnRef = useRef(null);

  const handleCredentialResponse = async (response) => {
    if (!response.credential) {
      setError('No credential received from Google.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await loginWithGoogle(response.credential);
    } catch (err) {
      console.error('[LoginView] Google login failed:', err);
      setError(err.message || 'Google sign-in failed. Please verify credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    let timer;

    const setupGoogleButton = () => {
      if (
        window.google &&
        window.google.accounts &&
        window.google.accounts.id &&
        authConfig?.googleClientId &&
        googleBtnRef.current
      ) {
        try {
          window.google.accounts.id.initialize({
            client_id: authConfig.googleClientId,
            callback: handleCredentialResponse,
            auto_select: false,
          });

          window.google.accounts.id.renderButton(googleBtnRef.current, {
            theme: 'outline',
            size: 'large',
            type: 'standard',
            shape: 'rectangular',
            text: 'signin_with',
            logo_alignment: 'left',
            width: 300,
          });
        } catch (err) {
          console.warn('[LoginView] Failed rendering Google button:', err);
        }
      } else if (!window.google) {
        // Retry shortly if script is still loading asynchronously
        timer = setTimeout(setupGoogleButton, 300);
      }
    };

    setupGoogleButton();

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [authConfig?.googleClientId]);

  const handleDemoSignIn = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await demoLogin();
    } catch (err) {
      console.error('[LoginView] Demo login failed:', err);
      setError(err.message || 'Demo sign-in failed. Please check backend server.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        {/* Header / Branding */}
        <div className="login-header">
          <div className="login-logo">
            <Package size={36} />
          </div>
          <h1 className="login-title">Stoqra</h1>
          <p className="login-tagline">Automated Inventory Intelligence</p>
        </div>

        {/* Feature Highlights */}
        <div className="login-features">
          <div className="feature-item">
            <div className="feature-icon"><Check size={14} /></div>
            <span><strong>Gemini 2.5 Flash</strong> document intelligence for invoice PDF extraction</span>
          </div>
          <div className="feature-item">
            <div className="feature-icon"><Check size={14} /></div>
            <span><strong>Automated Gmail Ingestion</strong> with duplicate detection and restock upserts</span>
          </div>
          <div className="feature-item">
            <div className="feature-icon"><Check size={14} /></div>
            <span><strong>Atomic Transactions</strong> with $gte stock guard and 30-day velocity analytics</span>
          </div>
        </div>

        {/* Error notification */}
        {error && (
          <div className="login-error">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Auth Action Section */}
        <div className="login-actions">
          {authConfig?.googleClientId ? (
            <div className="google-btn-wrapper">
              <div ref={googleBtnRef} className="google-btn-container" />
              {submitting && (
                <div className="login-loading-overlay">
                  <Loader2 size={20} className="animate-spin" />
                  <span>Verifying identity...</span>
                </div>
              )}
            </div>
          ) : (
            <div className="google-setup-notice">
              <Sparkles size={16} />
              <span>Google OAuth will activate when <code>GOOGLE_CLIENT_ID</code> is set in Render.</span>
            </div>
          )}

          {authConfig?.demoEnabled && (
            <>
              <div className="login-divider">
                <span>OR</span>
              </div>

              <button
                type="button"
                className="btn btn-demo-login"
                onClick={handleDemoSignIn}
                disabled={submitting}
              >
                {submitting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <ShieldCheck size={16} />
                )}
                <span>Continue as Demo Admin</span>
                <ArrowRight size={14} className="ml-auto" />
              </button>
            </>
          )}
        </div>

        {/* Footer info */}
        <div className="login-footer">
          <span>Protected by Stoqra RBAC & JWT Session Security</span>
        </div>
      </div>
    </div>
  );
};

export default LoginView;
