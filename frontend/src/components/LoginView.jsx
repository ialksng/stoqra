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

  const handleGoogleLogin = () => {
    if (!authConfig?.googleClientId) {
      setError('Google Client ID is not configured.');
      return;
    }

    const redirectUri = window.location.origin + window.location.pathname;
    const nonce = Math.random().toString(36).substring(2) + Date.now().toString(36);
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
      authConfig.googleClientId
    )}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=id_token&scope=openid%20profile%20email&nonce=${nonce}&prompt=select_account`;

    window.location.href = authUrl;
  };

  return (
    <div className="login-page">
      <div className="login-card login-card-clean">
        {/* Brand Header */}
        <div className="login-header" style={{ textAlign: 'center', marginBottom: '24px' }}>
          <img
            src="/projects/stoqra/stoqra-logo.png"
            alt="Stoqra"
            style={{ height: '58px', objectFit: 'contain', margin: '0 auto 12px auto', display: 'block' }}
          />
          <p className="login-tagline" style={{ margin: 0, color: 'var(--text-secondary)' }}>Automated Inventory Intelligence for Indian Businesses</p>
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
          {authConfig?.googleClientId ? (
            <button
              onClick={handleGoogleLogin}
              disabled={submitting}
              style={{
                width: '100%',
                maxWidth: '320px',
                padding: '12px 20px',
                borderRadius: '10px',
                border: '1px solid #dadce0',
                background: '#ffffff',
                color: '#3c4043',
                fontSize: '14px',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                transition: 'all 0.15s ease',
              }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
            >
              {submitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                  </svg>
                  <span>Sign in with Google</span>
                </>
              )}
            </button>
          ) : (
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
