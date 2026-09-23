import React, { useEffect, useRef, useState } from 'react';
import { Package, AlertCircle, Loader2, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export const LoginView = () => {
  const { authConfig, loginWithGoogle } = useAuth();
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const googleBtnRef = useRef(null);

  const handleCredentialResponse = async (response) => {
    if (!response.credential) {
      setError('No Google credential token received.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await loginWithGoogle(response.credential);
    } catch (err) {
      console.error('[LoginView] Google sign-in failed:', err);
      setError(err.message || 'Google sign-in failed. Please verify your account.');
    } finally {
      setSubmitting(false);
    }
  };

  // 1. Check for OAuth Redirect return (hash containing id_token)
  useEffect(() => {
    const handleHashAuth = async () => {
      const hash = window.location.hash || '';
      if (hash.includes('id_token=')) {
        const params = new URLSearchParams(hash.replace(/^#/, ''));
        const idToken = params.get('id_token');
        if (idToken) {
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
          await handleCredentialResponse({ credential: idToken });
        }
      }
    };

    handleHashAuth();
  }, []);

  // 2. Setup Google Identity Services Button
  useEffect(() => {
    let timer;

    const setupGoogleButton = () => {
      if (
        window.google?.accounts?.id &&
        authConfig?.googleClientId &&
        googleBtnRef.current
      ) {
        try {
          window.google.accounts.id.initialize({
            client_id: authConfig.googleClientId,
            callback: handleCredentialResponse,
            auto_select: false,
            itp_support: true,
            use_fedcm_for_prompt: false,
            cancel_on_tap_outside: false,
          });

          // Render clean, wide Google button
          window.google.accounts.id.renderButton(googleBtnRef.current, {
            theme: 'outline',
            size: 'large',
            type: 'standard',
            shape: 'rectangular',
            text: 'signin_with',
            logo_alignment: 'left',
            width: 320,
          });
        } catch (err) {
          console.warn('[LoginView] Error rendering Google button:', err);
        }
      } else if (!window.google) {
        timer = setTimeout(setupGoogleButton, 250);
      }
    };

    setupGoogleButton();

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [authConfig?.googleClientId]);



  return (
    <div className="login-page">
      <div className="login-card login-card-clean">
        {/* Brand Header */}
        <div className="login-header">
          <div className="login-logo">
            <Package size={34} />
          </div>
          <h1 className="login-title">Stoqra</h1>
          <p className="login-tagline">Automated Inventory Intelligence for Indian Businesses</p>
        </div>

        {/* Error notification */}
        {error && (
          <div className="login-error">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* Google Authentication Box */}
        <div className="login-actions-clean">
          <div className="google-btn-wrapper">
            <div ref={googleBtnRef} className="google-btn-container" />
            {submitting && (
              <div className="login-loading-overlay">
                <Loader2 size={18} className="animate-spin" />
                <span>Verifying credentials...</span>
              </div>
            )}
          </div>

          {!authConfig?.googleClientId && (
            <div className="google-setup-notice">
              <Shield size={16} />
              <span>Configure <code>GOOGLE_CLIENT_ID</code> in Render to enable Google Sign-In.</span>
            </div>
          )}
        </div>

        {/* Minimal Footer */}
        <div className="login-footer-clean">
          <span className="badge-badge-in">🇮🇳 GST-Ready & INR Supported</span>
          <p>Sign in with your authorized Google account to access your inventory and sales ledger.</p>
        </div>
      </div>
    </div>
  );
};

export default LoginView;
