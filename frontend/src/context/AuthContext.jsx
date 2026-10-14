import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/auth';
import { setAccessToken, setUnauthenticatedHandler } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('netriq_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [role, setRole] = useState(() => {
    try {
      const saved = localStorage.getItem('netriq_user');
      return saved ? (JSON.parse(saved).role || 'viewer').toLowerCase() : null;
    } catch {
      return null;
    }
  });
  const [capabilities, setCapabilities] = useState(() => {
    try {
      const saved = localStorage.getItem('netriq_user');
      return saved ? (JSON.parse(saved).capabilities || []) : [];
    } catch {
      return [];
    }
  });
  const [accessToken, setAccessTokenState] = useState(() => {
    return (typeof window !== 'undefined' ? localStorage.getItem('netriq_access_token') : null);
  });
  const [isLoading, setIsLoading] = useState(() => {
    const hasToken = typeof window !== 'undefined' && (localStorage.getItem('netriq_access_token') || localStorage.getItem('netriq_refresh_token'));
    const hasUser = typeof window !== 'undefined' && localStorage.getItem('netriq_user');
    return !(hasToken && hasUser);
  });

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      setUser(null);
      setRole(null);
      setCapabilities([]);
      setAccessTokenState(null);
      setAccessToken(null);
      localStorage.removeItem('netriq_user');
      localStorage.removeItem('netriq_access_token');
      localStorage.removeItem('netriq_refresh_token');
    }
  }, []);

  useEffect(() => {
    setUnauthenticatedHandler(() => {
      logout();
    });
  }, [logout]);

  // Session Restore on Mount
  useEffect(() => {
    let isCancelled = false;

    const initAuth = async () => {
      const existingToken = localStorage.getItem('netriq_access_token');
      const refreshToken = localStorage.getItem('netriq_refresh_token');

      if (!existingToken && !refreshToken) {
        setIsLoading(false);
        return;
      }

      try {
        if (existingToken) {
          setAccessToken(existingToken);
        }
        // Validate / refresh user info
        const userData = await authService.getCurrentUser();
        if (!isCancelled) {
          setUser(userData);
          setRole(userData.role?.toLowerCase() || 'viewer');
          setCapabilities(userData.capabilities || []);
          localStorage.setItem('netriq_user', JSON.stringify(userData));
        }
      } catch (err) {
        // If current token failed and refresh token is available, try refreshing
        if (refreshToken) {
          try {
            const newToken = await authService.refresh();
            if (!isCancelled) {
              setAccessToken(newToken);
              setAccessTokenState(newToken);
              const userData = await authService.getCurrentUser();
              setUser(userData);
              setRole(userData.role?.toLowerCase() || 'viewer');
              setCapabilities(userData.capabilities || []);
              localStorage.setItem('netriq_user', JSON.stringify(userData));
            }
          } catch (refreshErr) {
            console.warn('Session refresh failed:', refreshErr);
            if (!isCancelled) await logout();
          }
        } else {
          if (!isCancelled) await logout();
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    initAuth();
    return () => {
      isCancelled = true;
    };
  }, [logout]);

  const login = async (username, password) => {
    const { access_token } = await authService.login(username, password);
    setAccessToken(access_token);
    setAccessTokenState(access_token);
    
    // Fetch authenticated profile from GET /auth/me
    const userData = await authService.getCurrentUser();
    setUser(userData);
    const userRole = (userData.role || 'viewer').toLowerCase();
    setRole(userRole);
    setCapabilities(userData.capabilities || []);
    localStorage.setItem('netriq_user', JSON.stringify(userData));
    return userData;
  };

  const hasCapability = useCallback(
    (requiredCapability) => {
      if (!requiredCapability) return true;
      if (role === 'admin') return true; // Admin has superuser access
      return capabilities.includes(requiredCapability);
    },
    [role, capabilities]
  );

  const value = {
    user,
    role,
    capabilities,
    accessToken,
    isAuthenticated: !!user && !!accessToken,
    isLoading,
    login,
    logout,
    hasCapability,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
