import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  getStoredToken,
  setStoredToken,
  getAuthConfig,
  loginWithGoogle as apiLoginWithGoogle,
  demoLogin as apiDemoLogin,
  fetchCurrentUser,
} from '../services/api.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(getStoredToken());
  const [authConfig, setAuthConfig] = useState({
    googleClientId: '',
    hasGoogleAuth: false,
    demoEnabled: true,
  });
  const [loading, setLoading] = useState(true);

  // Initialize Auth state on application boot
  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        // Fetch server configuration for Google Client ID
        const config = await getAuthConfig().catch((err) => {
          console.warn('[Auth] Could not fetch auth config:', err.message);
          return { googleClientId: '', hasGoogleAuth: false, demoEnabled: true };
        });

        if (isMounted) {
          setAuthConfig(config);
        }

        // If an existing token is stored, verify session with backend
        const savedToken = getStoredToken();
        if (savedToken) {
          try {
            const meRes = await fetchCurrentUser();
            if (isMounted && meRes.success && meRes.user) {
              setUser(meRes.user);
              setToken(savedToken);
            }
          } catch (sessionErr) {
            console.warn('[Auth] Stored session invalid or expired:', sessionErr.message);
            setStoredToken(null);
            if (isMounted) {
              setUser(null);
              setToken(null);
            }
          }
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const loginWithGoogle = useCallback(async (credential) => {
    const res = await apiLoginWithGoogle(credential);
    if (res.success && res.token) {
      setStoredToken(res.token);
      setToken(res.token);
      setUser(res.user);
    }
    return res;
  }, []);

  const demoLogin = useCallback(async () => {
    const res = await apiDemoLogin();
    if (res.success && res.token) {
      setStoredToken(res.token);
      setToken(res.token);
      setUser(res.user);
    }
    return res;
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const meRes = await fetchCurrentUser();
      if (meRes.success && meRes.user) {
        setUser(meRes.user);
      }
    } catch (err) {
      console.warn('[Auth] refreshUser failed:', err.message);
    }
  }, []);

  /**
   * Called after store setup or switch is complete — updates the user state and JWT with org info
   */
  const completeOrgSetup = useCallback((setupRes) => {
    if (setupRes.token) {
      setStoredToken(setupRes.token);
      setToken(setupRes.token);
    }
    if (setupRes.user) {
      setUser(setupRes.user);
    } else {
      // Refresh from backend
      fetchCurrentUser()
        .then((meRes) => {
          if (meRes.success && meRes.user) setUser(meRes.user);
        })
        .catch(() => {});
    }
  }, []);

  const switchActiveOrg = useCallback((switchRes) => {
    if (switchRes.token) {
      setStoredToken(switchRes.token);
      setToken(switchRes.token);
    }
    if (switchRes.user) {
      setUser(switchRes.user);
    } else {
      refreshUser();
    }
  }, [refreshUser]);

  const logout = useCallback(() => {
    setStoredToken(null);
    setToken(null);
    setUser(null);

    // Disable Google auto-selection if initialized
    if (window.google?.accounts?.id?.disableAutoSelect) {
      window.google.accounts.id.disableAutoSelect();
    }
  }, []);

  const isOnboarded = Boolean(user?.isOnboarded && user?.organizationId);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(user),
        isOnboarded,
        authConfig,
        loading,
        loginWithGoogle,
        demoLogin,
        logout,
        completeOrgSetup,
        switchActiveOrg,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
